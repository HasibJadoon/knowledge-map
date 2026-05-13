/**
 * linkQuranicResearchHtml.ts
 *
 * Scans the Quranic Research per-root JSON files and links them to the
 * existing Lane root entries (created by importLaneFromSqlite.ts).
 *
 * For each data_*.json:
 *   1. Resolves root_norm from root_entries[0].normalized_root
 *   2. Expects LEXROOT:lane_lexicon:{root_norm} to already exist
 *   3. Inserts one ar_ling_source_chunks row (clean text, kind='lexicon_root_html_clean_text')
 *   4. Inserts ar_ling_lexicon_root_entry_sources rows for:
 *        - quranic_research_html
 *        - quranic_research_json
 *        - quranic_research_clean_text
 *        - quranic_research_chunks
 *
 * HTML files are verification and display support only.
 * SQLite defines root/section structure. HTML does not create extra entries.
 *
 * Source directory (default):
 *   km_arabic_linguistic/ingestion/Lexicon/sources/lane/quranic_research/
 *
 * Deterministic IDs:
 *   source chunk   : SRCCHK:lane_qr:{root_norm}
 *   html source    : LERES:lane_qr:{root_norm}:html
 *   json source    : LERES:lane_qr:{root_norm}:json
 *   clean source   : LERES:lane_qr:{root_norm}:clean
 *   chunks source  : LERES:lane_qr:{root_norm}:chunks
 *
 * Usage:
 *   tsx scripts/lane/linkQuranicResearchHtml.ts --dry-run
 *   tsx scripts/lane/linkQuranicResearchHtml.ts --execute
 *   tsx scripts/lane/linkQuranicResearchHtml.ts --execute --remote
 *   tsx scripts/lane/linkQuranicResearchHtml.ts --execute --sql-only
 *   tsx scripts/lane/linkQuranicResearchHtml.ts --execute --source-dir /path/to/quranic_research
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { normalizeArabicForSearch, buckwalterToArabic } from './utils/arabic.ts';
import { d1ExecuteFile } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_QR_DIR = resolve(
  '../km_arabic_linguistic/ingestion/Lexicon/sources/lane/quranic_research'
);
const SOURCE_ID      = 'src_lane_lexicon';
const LANE_SLUG      = 'lane_lexicon';
const QR_SLUG        = 'lane_quranic_research_perseus';
const OUT_DIR        = resolve('out/qr-link');
const CHUNK_SIZE     = 400;

// ── Types ────────────────────────────────────────────────────────────────────

interface QrRootEntry {
  root:            string;
  entry:           string;
  normalized_root: string;
}

interface QrJson {
  source_slug:       string;
  url:               string;
  raw_html_path:     string;
  raw_text_path:     string;
  clean_text_path:   string;
  chunks_path:       string;
  root_entries:      QrRootEntry[];
  clean_text:        string;
  checksum:          string;
  fetched_at:        string;
}

interface Stats {
  total:     number;
  linked:    number;
  skipped:   number;
  noRoot:    number;
  chunks:    number;
  sources:   number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function escNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

/**
 * Derive root_norm from QR JSON root_entries, falling back to filename Buckwalter.
 *
 * Filename format: data_{vol}_{letter}_{seq}_{BuckwalterRoot}.json
 * The last underscore-delimited segment is the Buckwalter-encoded root word,
 * matching root.bword in the Lane SQLite (e.g. "Elm" → علم, "Avkl" → اثكل).
 */
function deriveRootNorm(json: QrJson, filename: string): string | null {
  // Primary: use root_entries normalized_root (most frequent)
  const entries = json.root_entries ?? [];
  if (entries.length > 0) {
    const freq = new Map<string, number>();
    for (const e of entries) {
      const n = normalizeArabicForSearch(e.normalized_root || e.root || '');
      if (n) freq.set(n, (freq.get(n) ?? 0) + 1);
    }
    if (freq.size > 0) {
      return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // Fallback: decode Buckwalter suffix from filename
  // data_01_a_021_Avkl.json → "Avkl"
  const stem    = filename.replace(/\.json$/, '');
  const parts   = stem.split('_');
  const bwPart  = parts[parts.length - 1] ?? '';
  if (bwPart) {
    const arabic = buckwalterToArabic(bwPart);
    const norm   = normalizeArabicForSearch(arabic);
    if (norm) return norm;
  }

  return null;
}

function sourceChunkSql(
  rootNorm: string,
  json: QrJson,
  qrDir: string,
  batchId: string,
): string {
  const id          = `SRCCHK:lane_qr:${rootNorm}`;
  const laneEntryId = `LEXROOT:${LANE_SLUG}:${rootNorm}`;
  const textEn      = (json.clean_text ?? '').slice(0, 8000);
  const textAr      = rootNorm; // Arabic root as minimal text_ar (NOT NULL column)
  const meta        = JSON.stringify({
    source_kind:           'quranic_research_clean_text',
    linked_root_entry_id:  laneEntryId,
    url:                   json.url,
    html_path:             join(qrDir, json.raw_html_path),
    json_path:             join(qrDir, json.raw_html_path.replace('raw_html', 'raw_json').replace('.html', '.json')),
    clean_text_path:       join(qrDir, json.clean_text_path),
    chunks_path:           join(qrDir, json.chunks_path),
    checksum:              json.checksum,
    fetched_at:            json.fetched_at,
    import_batch_id:       batchId,
  });

  return (
    `INSERT OR REPLACE INTO ar_ling_source_chunks ` +
    `(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en, ` +
    ` meta_json, created_at) VALUES (` +
    `${esc(id)}, ${esc(SOURCE_ID)}, 'lexicon_root_html_clean_text', 0, ` +
    `${esc(rootNorm)}, ${esc(textAr)}, ${esc(textEn)}, ` +
    `${esc(meta)}, datetime('now'));`
  );
}

function rootEntrySourceSql(
  id: string,
  rootNorm: string,
  kind: string,
  url: string | null,
  path: string | null,
  checksum: string | null,
  note: string,
): string {
  const rootEntryId = `LEXROOT:${LANE_SLUG}:${rootNorm}`;
  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_root_entry_sources ` +
    `(id, root_entry_id, source_kind, source_slug, ` +
    ` source_url, source_path, checksum, note_md, created_at) VALUES (` +
    `${esc(id)}, ${esc(rootEntryId)}, ${esc(kind)}, ${esc(QR_SLUG)}, ` +
    `${esc(url)}, ${esc(path)}, ${esc(checksum)}, ${esc(note)}, datetime('now'));`
  );
}

// ── SQL file writing ─────────────────────────────────────────────────────────

function writeSqlFiles(statements: string[], chunkSize: number): string[] {
  mkdirSync(OUT_DIR, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i < statements.length; i += chunkSize) {
    const fileIdx  = Math.floor(i / chunkSize) + 1;
    const filePath = `${OUT_DIR}/qr_link_${String(fileIdx).padStart(4, '0')}.sql`;
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

  const sourceDirIdx = args.indexOf('--source-dir');
  const qrDir = sourceDirIdx >= 0
    ? resolve(args[sourceDirIdx + 1])
    : DEFAULT_QR_DIR;

  if (!dryRun && !execute) {
    console.error('Usage: --dry-run | --execute [--sql-only] [--remote] [--source-dir <path>]');
    process.exit(1);
  }

  const jsonDir = join(qrDir, 'raw_json');
  let jsonFiles: string[];
  try {
    jsonFiles = readdirSync(jsonDir).filter(f => f.startsWith('data_') && f.endsWith('.json'));
  } catch {
    console.error(`Cannot read QR JSON directory: ${jsonDir}`);
    process.exit(1);
  }

  console.log(`QR source dir: ${qrDir}`);
  console.log(`JSON files found: ${jsonFiles.length}`);

  const batchId = `qr_link_${Date.now()}`;
  const stats: Stats = { total: jsonFiles.length, linked: 0, skipped: 0, noRoot: 0, chunks: 0, sources: 0 };
  const allSql: string[] = [];

  for (const file of jsonFiles) {
    const jsonPath = join(jsonDir, file);
    let json: QrJson;
    try {
      json = JSON.parse(readFileSync(jsonPath, 'utf8')) as QrJson;
    } catch (e) {
      console.warn(`  SKIP: cannot parse ${file}: ${e}`);
      stats.skipped++;
      continue;
    }

    const rootNorm = deriveRootNorm(json, file);
    if (!rootNorm) {
      stats.noRoot++;
      continue;
    }

    const htmlPath    = join(qrDir, json.raw_html_path);
    const cleanPath   = join(qrDir, json.clean_text_path);
    const chunksPath  = join(qrDir, json.chunks_path);
    const jsonFilePath = jsonPath;

    if (dryRun) {
      if (stats.linked < 5) {
        console.log(`  ${file} → root_norm=${rootNorm}  url=${json.url}`);
      }
      stats.linked++;
      continue;
    }

    // Source chunk (clean text)
    allSql.push(sourceChunkSql(rootNorm, json, qrDir, batchId));
    stats.chunks++;

    // Four root_entry_sources rows
    allSql.push(rootEntrySourceSql(
      `LERES:lane_qr:${rootNorm}:html`,
      rootNorm, 'quranic_research_html',
      json.url, htmlPath, json.checksum,
      'Quranic Research HTML page for this Lane root',
    ));
    allSql.push(rootEntrySourceSql(
      `LERES:lane_qr:${rootNorm}:json`,
      rootNorm, 'quranic_research_json',
      json.url, jsonFilePath, null,
      'Parsed JSON metadata for this Lane root page',
    ));
    allSql.push(rootEntrySourceSql(
      `LERES:lane_qr:${rootNorm}:clean`,
      rootNorm, 'quranic_research_clean_text',
      null, cleanPath, null,
      'Clean readable text for display/search',
    ));
    allSql.push(rootEntrySourceSql(
      `LERES:lane_qr:${rootNorm}:chunks`,
      rootNorm, 'quranic_research_chunks',
      null, chunksPath, null,
      'Text chunks for display and future embedding',
    ));
    stats.sources += 4;
    stats.linked++;
  }

  console.log(`\nSummary:`);
  console.log(`  total files:   ${stats.total}`);
  console.log(`  linked:        ${stats.linked}`);
  console.log(`  no root:       ${stats.noRoot}`);
  console.log(`  skipped:       ${stats.skipped}`);

  if (dryRun) {
    console.log('\nDry run complete.');
    return;
  }

  console.log(`  source chunks: ${stats.chunks}`);
  console.log(`  source rows:   ${stats.sources}`);
  console.log(`  total SQL:     ${allSql.length}`);

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

  console.log('\nQR link done.');
  console.log(`Batch ID: ${batchId}`);
}

main().catch(err => { console.error(err); process.exit(1); });
