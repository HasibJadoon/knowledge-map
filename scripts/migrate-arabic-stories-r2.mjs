#!/usr/bin/env node
/**
 * migrate-arabic-stories-r2.mjs
 *
 * Pulls every Arabic story from Notion, downloads the audio (if any)
 * from Notion's S3, re-uploads it to Cloudflare R2 k-maps-assets, and
 * upserts container + unit rows in D1 (knowledgemap) with full
 * text_cache + audio_url.
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx node scripts/migrate-arabic-stories-r2.mjs
 *
 * Prerequisites:
 *   wrangler must be authenticated (wrangler login)
 */

import { execSync, spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { tmpdir } from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const R2_BUCKET    = 'k-maps-assets';
const DB_NAME      = 'knowledgemap';
const R2_BASE_URL  = 'https://assets.k-maps.com'; // custom domain on the bucket

// Notion parent pages that hold the story sub-pages
const SERIES = [
  {
    parentPageId:   '44e5f67890b94037ad5f3f4685373e48',
    containerId:    'C:LIT:arabic-short-stories',
    containerKey:   'arabic-short-stories',
    containerType:  'literature',
    title:          'Arabic Short Stories for Language Learners',
    titleAr:        'قصص عربية قصيرة للمتعلمين',
    r2Prefix:       'arabic/stories/short-stories',
  },
  {
    parentPageId:   'a61b1989b5ee4f63b9a25e342f0032cd',
    containerId:    'C:LIT:kan-ya-makan',
    containerKey:   'kan-ya-makan',
    containerType:  'literature',
    title:          'كان يا مكان · Prophets Series',
    titleAr:        'كان يا مكان',
    r2Prefix:       'arabic/stories/kan-ya-makan',
  },
];

// ─── Notion API helpers ───────────────────────────────────────────────────────

async function notionGet(path) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      'Authorization':  `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    },
  });
  if (!res.ok) throw new Error(`Notion ${path} → ${res.status}`);
  return res.json();
}

/** Paginate through all children blocks of a page */
async function allBlocks(pageId) {
  const blocks = [];
  let cursor;
  do {
    const qs  = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const data = await notionGet(`/blocks/${pageId}/children${qs}`);
    blocks.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

/** Paginate through child page IDs */
async function childPageIds(pageId) {
  const ids = [];
  let cursor;
  do {
    const qs   = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const data  = await notionGet(`/blocks/${pageId}/children${qs}`);
    for (const b of data.results ?? []) {
      if (b.type === 'child_page') ids.push(b.id.replace(/-/g, ''));
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return ids;
}

/** Extract plain text from an array of rich_text objects */
function richText(arr = []) {
  return arr.map(r => r.plain_text ?? '').join('');
}

/** Walk blocks → plain Arabic text */
function extractText(blocks) {
  const lines = [];
  for (const b of blocks) {
    const type = b.type;
    const content = b[type];
    if (!content) continue;
    if (content.rich_text) {
      const line = richText(content.rich_text).trim();
      if (line) lines.push(line);
    }
  }
  return lines.join('\n');
}

/** Return { url, ext } for the first audio block, or null */
function extractAudio(blocks) {
  for (const b of blocks) {
    if (b.type !== 'audio') continue;
    const a = b.audio;
    const url = a.type === 'file' ? a.file.url : (a.external?.url ?? null);
    if (!url) continue;
    const rawExt = extname(url.split('?')[0]).replace('.', '') || 'm4a';
    const ext = rawExt === 'mpeg' ? 'mp3' : rawExt;
    return { url, ext };
  }
  return null;
}

// ─── File / Wrangler helpers ──────────────────────────────────────────────────

async function downloadBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function r2Put(r2Key, filePath, contentType) {
  const result = spawnSync(
    'wrangler',
    ['r2', 'object', 'put', `${R2_BUCKET}/${r2Key}`,
     '--file', filePath,
     '--content-type', contentType,
     '--remote'],
    { stdio: 'inherit', encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error(`wrangler r2 put failed for ${r2Key}`);
}

function d1ExecFile(sqlPath) {
  const result = spawnSync(
    'wrangler',
    ['d1', 'execute', DB_NAME, '--file', sqlPath, '--remote'],
    { stdio: 'inherit', encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error(`wrangler d1 execute failed`);
}

function sq(str) {
  // Escape single quotes for SQL
  return (str ?? '').replace(/'/g, "''");
}

// ─── Core migration logic ─────────────────────────────────────────────────────

async function migrateSeries(series) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📚  ${series.title}`);
  console.log(`${'─'.repeat(60)}`);

  const sqlLines = [];

  // Upsert container
  sqlLines.push(
    `INSERT OR REPLACE INTO ar_containers ` +
    `(id, container_type, container_key, title, created_at) VALUES ` +
    `('${series.containerId}', '${series.containerType}', '${series.containerKey}', ` +
    `'${sq(series.title)}', datetime('now'));`
  );

  // Get child page IDs
  const ids = await childPageIds(series.parentPageId);
  console.log(`   Found ${ids.length} story pages\n`);

  let idx = 0;
  for (const pageId of ids) {
    idx++;

    // ── Fetch page title ─────────────────────────────────────────────────────
    let title = `Story ${idx}`;
    try {
      const page  = await notionGet(`/pages/${pageId}`);
      const nameProp = page.properties?.Name ?? page.properties?.title;
      const raw = nameProp?.title ?? nameProp?.rich_text ?? [];
      title = richText(raw).trim() || title;
    } catch (e) {
      console.warn(`   [${idx}] Could not fetch title: ${e.message}`);
    }

    console.log(`[${String(idx).padStart(2, '0')}/${ids.length}] ${title}`);

    // ── Fetch blocks ─────────────────────────────────────────────────────────
    let blocks = [];
    try {
      blocks = await allBlocks(pageId);
    } catch (e) {
      console.warn(`       ⚠ blocks failed: ${e.message}`);
    }

    const text      = extractText(blocks);
    const audioInfo = extractAudio(blocks);

    // ── Upload audio to R2 ───────────────────────────────────────────────────
    let audioR2Url = null;
    if (audioInfo) {
      const slug   = `story-${String(idx).padStart(2, '0')}`;
      const r2Key  = `${series.r2Prefix}/${slug}/audio.${audioInfo.ext}`;
      const tmpPath = join(tmpdir(), `km-audio-${Date.now()}.${audioInfo.ext}`);
      const contentType = audioInfo.ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4';

      try {
        console.log(`       ↓ downloading audio…`);
        const buf = await downloadBuf(audioInfo.url);
        writeFileSync(tmpPath, buf);
        console.log(`       ↑ uploading → ${r2Key}`);
        r2Put(r2Key, tmpPath, contentType);
        unlinkSync(tmpPath);
        audioR2Url = `${R2_BASE_URL}/${r2Key}`;
        console.log(`       🔊 ${audioR2Url}`);
      } catch (e) {
        console.warn(`       ⚠ audio upload failed: ${e.message}`);
        if (existsSync(tmpPath)) unlinkSync(tmpPath);
      }
    } else {
      console.log(`       📖  text only`);
    }

    // ── Build SQL for this unit ──────────────────────────────────────────────
    const unitId      = `${series.containerId}:${String(idx).padStart(2, '0')}`;
    const textTrunc   = text.slice(0, 8000);
    const metaJson    = JSON.stringify({ title, notion_id: pageId });
    const audioSql    = audioR2Url ? `'${sq(audioR2Url)}'` : 'NULL';

    sqlLines.push(
      `INSERT OR REPLACE INTO ar_container_units ` +
      `(id, container_id, unit_type, order_index, text_cache, audio_url, meta_json, created_at) VALUES ` +
      `('${sq(unitId)}', '${series.containerId}', 'chapter', ${idx}, ` +
      `'${sq(textTrunc)}', ${audioSql}, '${sq(metaJson)}', datetime('now'));`
    );
  }

  // ── Write and execute SQL batch ──────────────────────────────────────────
  const sqlPath = join(tmpdir(), `km-migrate-${series.containerKey}-${Date.now()}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n'));
  console.log(`\n   📝 Running ${sqlLines.length} SQL statements…`);
  d1ExecFile(sqlPath);
  unlinkSync(sqlPath);

  console.log(`   ✅ ${series.title} — done\n`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN) {
    console.error('❌  NOTION_TOKEN env var is not set.\n    export NOTION_TOKEN=secret_xxx');
    process.exit(1);
  }

  console.log('🚀  Arabic Stories → R2 + D1 migration');
  console.log(`    R2 bucket : ${R2_BUCKET}`);
  console.log(`    D1 db     : ${DB_NAME}`);

  for (const series of SERIES) {
    await migrateSeries(series);
  }

  console.log('\n🎉  All series migrated successfully!');
  console.log('    R2 paths  : arabic/stories/{series}/{slug}/audio.{ext}');
  console.log('    D1 units  : ar_container_units.audio_url updated');
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err);
  process.exit(1);
});
