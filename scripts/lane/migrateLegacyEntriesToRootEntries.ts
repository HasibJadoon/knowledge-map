/**
 * migrateLegacyEntriesToRootEntries.ts
 *
 * Straight 1:1 migration of non-Lane ar_ling_lexicon_entries rows into
 * the new root-entry model.
 *
 * Each legacy row is already one root article, so no grouping is needed:
 *
 *   legacy row → ar_ling_source_chunks          (one per row)
 *   legacy row → ar_ling_lexicon_root_entries   (one per row)
 *   legacy row → ar_ling_lexicon_entry_sections (one row, section_type='full_article')
 *   legacy row → ar_ling_lexicon_root_entry_sources
 *
 * Excludes: lane_lexicon, lane_quranic_research_perseus
 *
 * Deterministic IDs:
 *   source chunk  : SRCCHK:{source_slug}:{root_norm}
 *   root entry    : LEXROOT:{source_slug}:{root_norm}
 *   section       : LEXSEC:{source_slug}:{root_norm}:1
 *   root source   : LERES:{source_slug}:{root_norm}:legacy
 *
 * If two legacy rows share the same source_slug+root_norm the second
 * INSERT OR REPLACE will overwrite the first (last-write wins). Run with
 * --dry-run first to spot any collisions.
 *
 * Usage:
 *   tsx scripts/lane/migrateLegacyEntriesToRootEntries.ts --dry-run
 *   tsx scripts/lane/migrateLegacyEntriesToRootEntries.ts --execute
 *   tsx scripts/lane/migrateLegacyEntriesToRootEntries.ts --execute --remote
 *   tsx scripts/lane/migrateLegacyEntriesToRootEntries.ts --execute --sql-only
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeArabicForSearch } from './utils/arabic.ts';
import { d1Query, d1ExecuteFile } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

// ── Config ───────────────────────────────────────────────────────────────────

const PARSER_VERSION = 'legacy-root-migration-v1';
const OUT_DIR        = resolve('out/legacy-migration');
const CHUNK_SIZE     = 300;
const LANE_SLUGS     = ['lane_lexicon', 'lane_quranic_research_perseus'];

// ── Types ────────────────────────────────────────────────────────────────────

interface LegacyEntry {
  id:                 string;
  source_id:          string | null;
  source_slug:        string | null;
  source_chunk_id:    string | null;
  root_id:            string | null;
  root_text:          string | null;
  heading_norm:       string | null;
  lemma_text:         string | null;
  display_heading_ar: string | null;
  entry_text:         string | null;
  definition_ar:      string | null;
  definition_en:      string | null;
  page_no:            number | null;
  volume_no:          number | null;
  source_entry_seq:   number | null;
  entry_kind:         string | null;
  source_url:         string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function escNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

function deriveRootNorm(row: LegacyEntry): string {
  const candidate =
    row.root_text?.trim()          ||
    row.heading_norm?.trim()       ||
    row.display_heading_ar?.trim() ||
    row.lemma_text?.trim()         ||
    '';
  return normalizeArabicForSearch(candidate) || `LEGACY_${row.id}`;
}

function buildRawText(row: LegacyEntry): string {
  return [
    row.display_heading_ar || row.heading_norm || row.root_text || '',
    row.definition_ar      || '',
    row.definition_en      || row.entry_text   || '',
  ].filter(Boolean).join('\n\n');
}

// ── SQL generators ───────────────────────────────────────────────────────────

function sourceChunkSql(row: LegacyEntry, rootNorm: string, rawText: string, batchId: string): string {
  const slug  = row.source_slug ?? 'unknown';
  const id    = `SRCCHK:${slug}:${rootNorm}`;
  const textAr = (row.definition_ar || row.display_heading_ar || rootNorm).slice(0, 8000);
  const textEn = (row.definition_en || row.entry_text || '').slice(0, 8000);
  const meta   = JSON.stringify({
    migrated_from:   'ar_ling_lexicon_entries',
    legacy_entry_id: row.id,
    import_batch_id: batchId,
  });

  return (
    `INSERT OR REPLACE INTO ar_ling_source_chunks ` +
    `(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en, ` +
    ` page_no, volume_no, meta_json, created_at) VALUES (` +
    `${esc(id)}, ${esc(row.source_id)}, 'lexicon_root', ${escNum(row.source_entry_seq ?? 0)}, ` +
    `${esc(rootNorm)}, ${esc(textAr)}, ${esc(textEn)}, ` +
    `${escNum(row.page_no)}, ${escNum(row.volume_no)}, ${esc(meta)}, datetime('now'));`
  );
}

function rootEntrySql(row: LegacyEntry, rootNorm: string, rawText: string, batchId: string): string {
  const slug    = row.source_slug ?? 'unknown';
  const id      = `LEXROOT:${slug}:${rootNorm}`;
  const chunkId = `SRCCHK:${slug}:${rootNorm}`;
  const textAr  = (row.definition_ar || '').slice(0, 4000);
  const textEn  = (row.definition_en || row.entry_text || '').slice(0, 4000);

  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_root_entries ` +
    `(id, source_id, source_slug, root_id, root_text, root_norm, ` +
    ` entry_text_ar, entry_text_en, raw_text, source_chunk_id, ` +
    ` page_start, page_end, volume_no, source_url, ` +
    ` parser_version, raw_hash, import_batch_id, status, ` +
    ` created_at, updated_at) VALUES (` +
    `${esc(id)}, ${esc(row.source_id)}, ${esc(slug)}, ` +
    `${esc(row.root_id)}, ${esc(row.root_text || rootNorm)}, ${esc(rootNorm)}, ` +
    `${esc(textAr)}, ${esc(textEn)}, ${esc(rawText.slice(0, 32000))}, ${esc(chunkId)}, ` +
    `${escNum(row.page_no)}, ${escNum(row.page_no)}, ${escNum(row.volume_no)}, ` +
    `${esc(row.source_url)}, ` +
    `${esc(PARSER_VERSION)}, ${esc(sha256(rawText))}, ${esc(batchId)}, 'raw_migrated', ` +
    `datetime('now'), datetime('now'));`
  );
}

function sectionSql(row: LegacyEntry, rootNorm: string): string {
  const slug        = row.source_slug ?? 'unknown';
  const rootEntryId = `LEXROOT:${slug}:${rootNorm}`;
  const id          = `LEXSEC:${slug}:${rootNorm}:1`;
  const headingAr   = row.display_heading_ar || row.heading_norm || row.root_text || '';
  const headingNorm = normalizeArabicForSearch(headingAr);
  const textAr      = (row.definition_ar || '').slice(0, 8000);
  const textEn      = (row.definition_en || row.entry_text || '').slice(0, 8000);

  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_entry_sections ` +
    `(id, root_entry_id, source_slug, root_text, root_norm, ` +
    ` section_seq, heading_ar, heading_norm, section_type, ` +
    ` text_ar, text_en, page_no, volume_no, ` +
    ` source_native_section_id, created_at) VALUES (` +
    `${esc(id)}, ${esc(rootEntryId)}, ${esc(slug)}, ` +
    `${esc(row.root_text || rootNorm)}, ${esc(rootNorm)}, ` +
    `1, ${esc(headingAr)}, ${esc(headingNorm)}, 'full_article', ` +
    `${esc(textAr)}, ${esc(textEn)}, ` +
    `${escNum(row.page_no)}, ${escNum(row.volume_no)}, ` +
    `${esc(row.id)}, datetime('now'));`
  );
}

function rootEntrySourceSql(row: LegacyEntry, rootNorm: string): string {
  const slug        = row.source_slug ?? 'unknown';
  const id          = `LERES:${slug}:${rootNorm}:legacy`;
  const rootEntryId = `LEXROOT:${slug}:${rootNorm}`;

  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_root_entry_sources ` +
    `(id, root_entry_id, source_kind, source_slug, source_native_id, note_md, created_at) VALUES (` +
    `${esc(id)}, ${esc(rootEntryId)}, 'legacy_lexicon_entry', ${esc(slug)}, ` +
    `${esc(row.id)}, 'Migrated 1:1 from ar_ling_lexicon_entries', datetime('now'));`
  );
}

// ── SQL file writing ─────────────────────────────────────────────────────────

function writeSqlFiles(statements: string[], chunkSize: number): string[] {
  mkdirSync(OUT_DIR, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i < statements.length; i += chunkSize) {
    const fileIdx  = Math.floor(i / chunkSize) + 1;
    const filePath = `${OUT_DIR}/legacy_migration_${String(fileIdx).padStart(4, '0')}.sql`;
    writeFileSync(filePath, statements.slice(i, i + chunkSize).join('\n'), 'utf8');
    files.push(filePath);
  }
  return files;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const sqlOnly = args.includes('--sql-only');
  const remote  = args.includes('--remote');
  const target: D1Target = remote ? 'remote' : 'local';

  if (!dryRun && !execute) {
    console.error('Usage: --dry-run | --execute [--sql-only] [--remote]');
    process.exit(1);
  }

  const batchId = `legacy_migration_${Date.now()}`;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  console.log('Fetching legacy entries from D1…');
  const slugFilter = LANE_SLUGS.map(s => `'${s}'`).join(', ');
  const rows = d1Query(
    `SELECT id, source_id, source_slug, source_chunk_id, root_id, root_text,
            heading_norm, lemma_text, display_heading_ar,
            entry_text, definition_ar, definition_en,
            page_no, volume_no, source_entry_seq, entry_kind, source_url
     FROM ar_ling_lexicon_entries
     WHERE (source_slug NOT IN (${slugFilter}) OR source_slug IS NULL)
     ORDER BY source_slug, source_entry_seq, page_no`,
    target,
  ) as LegacyEntry[];

  console.log(`Fetched ${rows.length} legacy entries.`);

  if (rows.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  // ── Dry run ───────────────────────────────────────────────────────────────

  if (dryRun) {
    const bySlug = new Map<string, number>();
    for (const row of rows) {
      const slug = row.source_slug ?? 'null';
      bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    }
    console.log('\nEntries by source_slug:');
    for (const [slug, count] of [...bySlug.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${slug}: ${count}`);
    }

    // Check for root_norm collisions within the same slug
    const seen = new Map<string, string>();
    let collisions = 0;
    for (const row of rows) {
      const slug     = row.source_slug ?? 'unknown';
      const rootNorm = deriveRootNorm(row);
      const key      = `${slug}::${rootNorm}`;
      if (seen.has(key)) {
        if (collisions < 5) {
          console.warn(`  COLLISION: ${slug} / ${rootNorm} — id=${row.id} vs ${seen.get(key)}`);
        }
        collisions++;
      } else {
        seen.set(key, row.id);
      }
    }
    if (collisions > 0) {
      console.warn(`\n  ${collisions} root_norm collisions (last-write wins).`);
    } else {
      console.log('\n  No root_norm collisions detected.');
    }

    console.log(`\nDry run complete. ${rows.length} rows would become ${rows.length} root entries.`);
    return;
  }

  // ── Generate SQL ──────────────────────────────────────────────────────────

  const allSql: string[] = [];
  let chunks = 0, roots = 0, sections = 0, sources = 0;

  for (const row of rows) {
    const rootNorm = deriveRootNorm(row);
    const rawText  = buildRawText(row);

    allSql.push(sourceChunkSql(row, rootNorm, rawText, batchId));   chunks++;
    allSql.push(rootEntrySql(row, rootNorm, rawText, batchId));      roots++;
    allSql.push(sectionSql(row, rootNorm));                          sections++;
    allSql.push(rootEntrySourceSql(row, rootNorm));                  sources++;
  }

  console.log(`\nSQL summary:`);
  console.log(`  root entries: ${roots}`);
  console.log(`  sections:     ${sections}`);
  console.log(`  chunks:       ${chunks}`);
  console.log(`  source links: ${sources}`);
  console.log(`  total SQL:    ${allSql.length}`);

  const files = writeSqlFiles(allSql, CHUNK_SIZE);
  console.log(`\nSQL files written to ${OUT_DIR}:`);
  for (const f of files) console.log(`  ${f}`);

  if (sqlOnly) {
    console.log('\n--sql-only: skipping execution.');
    return;
  }

  console.log(`\nApplying to ${target} D1…`);
  for (const f of files) {
    console.log(`  Applying ${f}…`);
    d1ExecuteFile(f, target);
  }

  console.log('\nMigration done.');
  console.log(`Batch ID: ${batchId}`);
}

main().catch(err => { console.error(err); process.exit(1); });
