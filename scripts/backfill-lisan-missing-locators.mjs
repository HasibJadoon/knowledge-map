#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const SOURCE_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab';
const APPLY = process.argv.includes('--apply');
const OUT_DIR = new URL('../temp/lisan-locator-backfill/', import.meta.url);
const CHUNKS_DIR = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/ibn_manzur_lisan_al_arab/chunks/', import.meta.url);
const BACKFILL_TAG = 'lisan_locator_backfill_from_local_ketabonline_v1';

function d1(command) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  );
  const parsed = JSON.parse(out);
  for (const result of parsed) {
    if (!result.success) throw new Error(`D1 command failed: ${command}`);
  }
  return parsed.at(-1)?.results ?? [];
}

function d1File(filePath) {
  return execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--file', filePath],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  );
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippets(text) {
  const norm = normalizeArabic(text);
  const out = [];
  const lengths = [160, 120, 90, 70, 50, 35, 24, 16];
  for (const len of lengths) {
    if (norm.length >= len) out.push(norm.slice(0, len));
  }
  if (norm.length < 16 && norm.length >= 8) out.push(norm);
  if (norm.length > 240) {
    const mid = Math.floor(norm.length / 2);
    for (const len of [90, 60, 40]) {
      out.push(norm.slice(Math.max(0, mid - Math.floor(len / 2)), mid + Math.ceil(len / 2)));
    }
  }
  return [...new Set(out.filter((s) => s.length >= 8))];
}

function loadLocalChunks() {
  const chunks = [];
  for (const file of readdirSync(CHUNKS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const rows = JSON.parse(readFileSync(new URL(file, CHUNKS_DIR), 'utf8'));
    for (const row of rows) {
      if (!row.text_ar) continue;
      chunks.push({
        page_no: Number(row.page_no),
        volume_no: Number(row.part_no),
        chunk_index: Number(row.chunk_index ?? 0),
        source_url: row.source_url ?? row.locator_json?.source_url ?? null,
        norm: normalizeArabic(row.text_ar),
      });
    }
  }
  chunks.sort((a, b) => a.volume_no - b.volume_no || a.page_no - b.page_no || a.chunk_index - b.chunk_index);
  return chunks;
}

function nearestLocated(seq, located) {
  let lo = 0;
  let hi = located.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (located[mid].chunk_seq < seq) lo = mid + 1;
    else hi = mid - 1;
  }
  const prev = located[hi] ?? null;
  const next = located[lo] ?? null;
  if (!prev) return next;
  if (!next) return prev;
  return (seq - prev.chunk_seq) <= (next.chunk_seq - seq) ? prev : next;
}

mkdirSync(OUT_DIR, { recursive: true });

const missing = d1(`
  SELECT id, chunk_seq, heading_norm, text_ar, meta_json
  FROM ar_ling_source_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
    AND chunk_kind = 'lexical_entry'
    AND (page_no IS NULL OR volume_no IS NULL)
  ORDER BY chunk_seq
`);

const located = d1(`
  SELECT chunk_seq, page_no, volume_no
  FROM ar_ling_source_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
    AND chunk_kind = 'lexical_entry'
    AND page_no IS NOT NULL
    AND volume_no IS NOT NULL
  ORDER BY chunk_seq
`);

const localChunks = loadLocalChunks();
const fixes = [];
const misses = [];

for (const row of missing) {
  let match = null;
  for (const snippet of snippets(row.text_ar)) {
    const hits = localChunks.filter((chunk) => chunk.norm.includes(snippet));
    if (hits.length === 1) {
      match = { ...hits[0], method: `text_snippet_${snippet.length}` };
      break;
    }
    if (hits.length > 1) {
      hits.sort((a, b) => a.volume_no - b.volume_no || a.page_no - b.page_no || a.chunk_index - b.chunk_index);
      match = { ...hits[0], method: `text_snippet_${snippet.length}_first_of_${hits.length}` };
      break;
    }
  }

  if (!match) {
    const neighbor = nearestLocated(Number(row.chunk_seq), located);
    if (neighbor) {
      match = {
        page_no: Number(neighbor.page_no),
        volume_no: Number(neighbor.volume_no),
        chunk_index: null,
        source_url: null,
        method: 'nearest_located_entry_order',
      };
    }
  }

  if (match) {
    fixes.push({
      id: row.id,
      chunk_seq: Number(row.chunk_seq),
      heading_norm: row.heading_norm,
      page_no: Number(match.page_no),
      volume_no: Number(match.volume_no),
      method: match.method,
      source_url: match.source_url,
    });
  } else {
    misses.push({ id: row.id, chunk_seq: Number(row.chunk_seq), heading_norm: row.heading_norm });
  }
}

const report = {
  apply: APPLY,
  missing_before: missing.length,
  fixes: fixes.length,
  unresolved: misses.length,
  by_method: fixes.reduce((acc, fix) => {
    acc[fix.method] = (acc[fix.method] ?? 0) + 1;
    return acc;
  }, {}),
  preview: fixes.slice(0, 30),
  unresolved_preview: misses.slice(0, 30),
};

console.log(JSON.stringify(report, null, 2));

const statements = [];
for (const fix of fixes) {
  statements.push(`UPDATE ar_ling_source_chunks
SET page_no = ${fix.page_no},
    volume_no = ${fix.volume_no},
    meta_json = json_set(
      COALESCE(meta_json, '{}'),
      '$.locator.page_no_source', ${sql(fix.method)},
      '$.locator.locator_backfill', ${sql(BACKFILL_TAG)},
      '$.locator.locator_backfill_source_url', ${sql(fix.source_url)},
      '$.locator.locator_backfill_heading_norm', ${sql(fix.heading_norm)}
    )
WHERE id = ${sql(fix.id)};`);
}

const sqlPath = join(OUT_DIR.pathname, 'backfill-lisan-missing-locators.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY && fixes.length) {
  console.log(d1File(sqlPath));
}
