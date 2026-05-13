/**
 * importLaneFromSqlite.ts
 *
 * Reads the Lane LexiconDatabase SQLite and populates the new root-entry model:
 *   - ar_ling_source_chunks           (one per root)
 *   - ar_ling_lexicon_root_entries    (one per root, UNIQUE source_slug+root_norm)
 *   - ar_ling_lexicon_entry_sections  (one per SQLite entry row)
 *   - ar_ling_lexicon_root_entry_sources (lane_sqlite_root link)
 *
 * Lane SQLite schema:
 *   root  : id, word, bword, page, xml, supplement, ...
 *   entry : id, root, broot, word, bword, headword, bareword, itype,
 *           nodeid, nodenum, xml, perseusxml, page, type
 *
 * Deterministic IDs:
 *   source chunk      : SRCCHK:lane_lexicon:{root_norm}
 *   root entry        : LEXROOT:lane_lexicon:{root_norm}
 *   section           : LEXSEC:lane_lexicon:{root_norm}:{section_seq}
 *   root entry source : LERES:lane_lexicon:{root_norm}:sqlite_root
 *
 * Usage:
 *   tsx scripts/lane/importLaneFromSqlite.ts --dry-run
 *   tsx scripts/lane/importLaneFromSqlite.ts --root علم --dry-run
 *   tsx scripts/lane/importLaneFromSqlite.ts --all
 *   tsx scripts/lane/importLaneFromSqlite.ts --all --remote
 *   tsx scripts/lane/importLaneFromSqlite.ts --all --sql-only
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeArabicForSearch, stripHtml, approxTokens } from './utils/arabic.ts';
import { d1ExecuteFile } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

// ── Config ───────────────────────────────────────────────────────────────────

const PARSER_VERSION = 'lane-sqlite-import-v1';
const SOURCE_ID      = 'src_lane_lexicon';
const SOURCE_SLUG    = 'lane_lexicon';
const SQLITE_PATH    = resolve('data/sources/lane/lexicon.sqlite');
const OUT_DIR        = resolve('out/lane-root-import');
const CHUNK_SIZE     = 400; // SQL statements per file

// ── Types ────────────────────────────────────────────────────────────────────

interface LaneRoot {
  id:         number;
  word:       string;
  bword:      string;
  page:       number | null;
  xml:        string | null;
  supplement: number;
}

interface LaneEntry {
  id:         number;
  root:       string;
  broot:      string;
  word:       string;
  bword:      string;
  headword:   string | null;
  bareword:   string | null;
  itype:      string | null;
  nodeid:     string | null;
  nodenum:    number | null;
  xml:        string | null;
  perseusxml: string | null;
  page:       number | null;
  type:       number;
}

interface Stats {
  roots:    number;
  chunks:   number;
  sections: number;
  sources:  number;
  skipped:  number;
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

function escJson(obj: unknown): string {
  return esc(JSON.stringify(obj));
}

/** Extract readable English text from Lane XML, collapsing tags. */
function extractEnglishFromXml(xml: string): string {
  if (!xml) return '';
  return stripHtml(xml)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

/** Extract Arabic headword from XML <orth lang="ar"> tags. */
function extractHeadwordAr(xml: string, fallback: string): string {
  if (!xml) return fallback ?? '';
  const full = xml.match(/<orth[^>]+extent="full"[^>]+lang="ar"[^>]*>([^<]+)<\/orth>/);
  if (full?.[1]?.trim()) return full[1].trim();
  const any = xml.match(/<orth[^>]+lang="ar"[^>]*>([^<]+)<\/orth>/);
  if (any?.[1]?.trim()) return any[1].trim();
  return fallback ?? '';
}

/** Build full raw text for a root from root.xml + all entry.xml in order. */
function buildRawText(rootXml: string | null, entries: LaneEntry[]): string {
  const parts: string[] = [];
  if (rootXml) parts.push(rootXml.trim());
  for (const e of entries) {
    if (e.xml) parts.push(e.xml.trim());
  }
  return parts.join('\n\n');
}

/** Detect obvious parser gaps (empty or stub XML). */
function hasGaps(xml: string | null): boolean {
  if (!xml) return true;
  const stripped = stripHtml(xml).trim();
  return stripped.length < 5;
}

// ── SQL generators ───────────────────────────────────────────────────────────

function sourceChunkSql(
  root: LaneRoot,
  rootNorm: string,
  rawText: string,
  batchId: string,
): string {
  const id       = `SRCCHK:lane_lexicon:${rootNorm}`;
  const headingNorm = rootNorm;
  const textAr   = root.word || rootNorm;
  const textEn   = extractEnglishFromXml(rawText).slice(0, 8000);
  const pageNo   = root.page;
  const meta     = JSON.stringify({
    source:          'lane_sqlite',
    sqlite_root_id:  root.id,
    bword:           root.bword,
    supplement:      root.supplement,
    import_batch_id: batchId,
  });
  const tokens   = approxTokens(textEn + ' ' + textAr);

  return (
    `INSERT OR REPLACE INTO ar_ling_source_chunks ` +
    `(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en, ` +
    ` page_no, tokens_approx, meta_json, created_at) VALUES (` +
    `${esc(id)}, ${esc(SOURCE_ID)}, 'lexicon_root', ${escNum(root.id)}, ` +
    `${esc(headingNorm)}, ${esc(textAr)}, ${esc(textEn)}, ` +
    `${escNum(pageNo)}, ${escNum(tokens)}, ${esc(meta)}, datetime('now'));`
  );
}

function rootEntrySql(
  root: LaneRoot,
  rootNorm: string,
  rawText: string,
  entries: LaneEntry[],
  batchId: string,
): string {
  const id          = `LEXROOT:lane_lexicon:${rootNorm}`;
  const chunkId     = `SRCCHK:lane_lexicon:${rootNorm}`;
  const rawHash     = sha256(rawText);
  const pageStart   = root.page ?? (entries.length > 0 ? Math.min(...entries.map(e => e.page ?? 9999)) : null);
  const pageEnd     = entries.length > 0 ? Math.max(...entries.map(e => e.page ?? 0)) : root.page;
  const entryTextEn = extractEnglishFromXml(rawText).slice(0, 4000);

  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_root_entries ` +
    `(id, source_id, source_slug, root_text, root_norm, ` +
    ` entry_text_ar, entry_text_en, raw_text, ` +
    ` source_chunk_id, page_start, page_end, ` +
    ` source_native_id, source_native_key, ` +
    ` parser_version, raw_hash, import_batch_id, status, ` +
    ` created_at, updated_at) VALUES (` +
    `${esc(id)}, ${esc(SOURCE_ID)}, ${esc(SOURCE_SLUG)}, ` +
    `${esc(root.word)}, ${esc(rootNorm)}, ` +
    `${esc(root.word)}, ${esc(entryTextEn)}, ${esc(rawText.slice(0, 32000))}, ` +
    `${esc(chunkId)}, ${escNum(pageStart)}, ${escNum(pageEnd)}, ` +
    `${esc(String(root.id))}, ${esc(root.bword)}, ` +
    `${esc(PARSER_VERSION)}, ${esc(rawHash)}, ${esc(batchId)}, 'raw_imported', ` +
    `datetime('now'), datetime('now'));`
  );
}

function sectionSql(
  entry: LaneEntry,
  rootNorm: string,
  rootText: string,
  sectionSeq: number,
): string {
  const rootEntryId = `LEXROOT:lane_lexicon:${rootNorm}`;
  const id          = `LEXSEC:lane_lexicon:${rootNorm}:${sectionSeq}`;
  const headingAr   = extractHeadwordAr(entry.xml ?? '', entry.word ?? '');
  const headingNorm = normalizeArabicForSearch(headingAr || entry.word || '');
  const textEn      = extractEnglishFromXml(entry.xml ?? '');
  const gapFlag     = hasGaps(entry.xml) ? 1 : 0;
  const nodeNumInt  = entry.nodenum !== null ? Math.round(entry.nodenum) : null;

  const notes: string[] = [];
  if (!entry.xml) notes.push('missing_xml');
  if (!headingAr) notes.push('no_heading_ar');
  const parserNotes = notes.length > 0 ? JSON.stringify({ warnings: notes }) : null;

  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_entry_sections ` +
    `(id, root_entry_id, source_slug, root_text, root_norm, ` +
    ` section_seq, heading_ar, heading_norm, heading_bare, section_type, ` +
    ` text_ar, text_en, raw_xml, perseus_xml, page_no, ` +
    ` source_native_section_id, lane_node_id, lane_node_num, lane_itype, ` +
    ` has_gaps, parser_notes_json, created_at) VALUES (` +
    `${esc(id)}, ${esc(rootEntryId)}, ${esc(SOURCE_SLUG)}, ` +
    `${esc(rootText)}, ${esc(rootNorm)}, ` +
    `${escNum(sectionSeq)}, ${esc(headingAr)}, ${esc(headingNorm)}, ${esc(entry.bareword)}, ` +
    `${esc(entry.itype ?? 'definition')}, ` +
    `${esc(entry.word)}, ${esc(textEn.slice(0, 4000))}, ` +
    `${esc(entry.xml?.slice(0, 32000) ?? null)}, ${esc(entry.perseusxml?.slice(0, 16000) ?? null)}, ` +
    `${escNum(entry.page)}, ` +
    `${esc(String(entry.id))}, ${esc(entry.nodeid)}, ${escNum(nodeNumInt)}, ` +
    `${esc(entry.itype)}, ${escNum(gapFlag)}, ${esc(parserNotes)}, datetime('now'));`
  );
}

function rootEntrySourceSql(root: LaneRoot, rootNorm: string): string {
  const id          = `LERES:lane_lexicon:${rootNorm}:sqlite_root`;
  const rootEntryId = `LEXROOT:lane_lexicon:${rootNorm}`;
  return (
    `INSERT OR REPLACE INTO ar_ling_lexicon_root_entry_sources ` +
    `(id, root_entry_id, source_kind, source_slug, source_native_id, ` +
    ` note_md, created_at) VALUES (` +
    `${esc(id)}, ${esc(rootEntryId)}, 'lane_sqlite_root', ${esc(SOURCE_SLUG)}, ` +
    `${esc(String(root.id))}, ` +
    `'Imported from local LexiconDatabase SQLite (github.com/laneslexicon/LexiconDatabase)', ` +
    `datetime('now'));`
  );
}

// ── SQL file writing ─────────────────────────────────────────────────────────

// Seed SQL prepended to the first file only.
// Ensures ar_ling_sources has the Lane source row before any FK referencing it.
// PRAGMA foreign_keys = OFF because D1 production does not enforce FKs, and
// local miniflare does — this keeps local execution consistent with production.
const PREAMBLE = [
  `PRAGMA foreign_keys = OFF;`,
  `INSERT OR IGNORE INTO ar_ling_sources (id, title_ar, title_en, source_type, author_name, created_at) VALUES ` +
  `('src_lane_lexicon', 'معجم لين', 'An Arabic-English Lexicon (Lane)', 'classical_lexicon', 'Edward William Lane', datetime('now'));`,
].join('\n');

function writeSqlFiles(statements: string[], chunkSize: number): string[] {
  mkdirSync(OUT_DIR, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i < statements.length; i += chunkSize) {
    const slice    = statements.slice(i, i + chunkSize);
    const fileIdx  = Math.floor(i / chunkSize) + 1;
    const filePath = `${OUT_DIR}/lane_root_import_${String(fileIdx).padStart(4, '0')}.sql`;
    const content  = fileIdx === 1 ? `${PREAMBLE}\n${slice.join('\n')}` : slice.join('\n');
    writeFileSync(filePath, content, 'utf8');
    files.push(filePath);
  }
  return files;
}

// ── FTS backfill SQL ─────────────────────────────────────────────────────────

function ftsSql(): string {
  return [
    `DELETE FROM ar_ling_lexicon_root_entries_fts;`,
    `INSERT INTO ar_ling_lexicon_root_entries_fts(rowid, root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text)`,
    `SELECT rowid, root_text, root_norm, source_slug,`,
    `  COALESCE(entry_text_ar,''), COALESCE(entry_text_en,''), COALESCE(raw_text,'')`,
    `FROM ar_ling_lexicon_root_entries;`,
    `DELETE FROM ar_ling_lexicon_entry_sections_fts;`,
    `INSERT INTO ar_ling_lexicon_entry_sections_fts(rowid, root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en)`,
    `SELECT rowid, root_text, root_norm,`,
    `  COALESCE(heading_ar,''), COALESCE(heading_norm,''), COALESCE(heading_bare,''),`,
    `  COALESCE(section_type,''), COALESCE(text_ar,''), COALESCE(text_en,'')`,
    `FROM ar_ling_lexicon_entry_sections;`,
  ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args      = process.argv.slice(2);
  const rootArg   = args.includes('--root') ? args[args.indexOf('--root') + 1] : null;
  const importAll = args.includes('--all');
  const dryRun    = args.includes('--dry-run');
  const sqlOnly   = args.includes('--sql-only');
  const remote    = args.includes('--remote');
  const target: D1Target = remote ? 'remote' : 'local';

  if (!rootArg && !importAll) {
    console.error('Usage: --root <arabic> --dry-run | --all [--sql-only] [--remote]');
    process.exit(1);
  }

  if (!existsSync(SQLITE_PATH)) {
    console.error(`Lane SQLite not found: ${SQLITE_PATH}`);
    console.error('Run: npm run lane:download');
    process.exit(1);
  }

  const db      = new Database(SQLITE_PATH, { readonly: true });
  const batchId = `lane_root_import_${Date.now()}`;

  // ── Load roots ─────────────────────────────────────────────────────────────

  let roots: LaneRoot[];
  if (rootArg) {
    roots = db.prepare(
      `SELECT id, word, bword, page, xml, supplement FROM root WHERE word = ? OR bword = ?`
    ).all(rootArg, rootArg) as LaneRoot[];
  } else {
    roots = db.prepare(
      `SELECT id, word, bword, page, xml, supplement FROM root ORDER BY id`
    ).all() as LaneRoot[];
  }

  // ── Load all entries for selected roots ────────────────────────────────────

  const rootWords = roots.map(r => r.word);
  let allEntries: LaneEntry[];

  if (rootArg) {
    allEntries = db.prepare(
      `SELECT id, root, broot, word, bword, headword, bareword, itype,
              nodeid, nodenum, xml, perseusxml, page, type
       FROM entry WHERE root = ? ORDER BY nodenum ASC`
    ).all(rootArg) as LaneEntry[];
  } else {
    allEntries = db.prepare(
      `SELECT id, root, broot, word, bword, headword, bareword, itype,
              nodeid, nodenum, xml, perseusxml, page, type
       FROM entry ORDER BY nodenum ASC`
    ).all() as LaneEntry[];
  }

  db.close();

  // Group entries by root word
  const entriesByRoot = new Map<string, LaneEntry[]>();
  for (const e of allEntries) {
    const key = e.root ?? '';
    if (!entriesByRoot.has(key)) entriesByRoot.set(key, []);
    entriesByRoot.get(key)!.push(e);
  }

  console.log(`Roots: ${roots.length}  Entries: ${allEntries.length}`);

  // ── Dry run ────────────────────────────────────────────────────────────────

  if (dryRun) {
    const sample = roots.slice(0, 3);
    for (const root of sample) {
      const rootNorm = normalizeArabicForSearch(root.word);
      const entries  = (entriesByRoot.get(root.word) ?? []).sort((a, b) => (a.nodenum ?? 0) - (b.nodenum ?? 0));
      const rawText  = buildRawText(root.xml, entries);
      console.log(`\nRoot: ${root.word} (${root.bword})  norm=${rootNorm}  entries=${entries.length}  page=${root.page}`);
      console.log(`  raw_text length: ${rawText.length}`);
      console.log(`  sha256: ${sha256(rawText).slice(0, 16)}…`);
      if (entries.length > 0) {
        const e = entries[0];
        const headingAr = extractHeadwordAr(e.xml ?? '', e.word ?? '');
        console.log(`  section[0]: ${headingAr || e.word}  itype=${e.itype}  nodeid=${e.nodeid}  page=${e.page}`);
      }
    }
    console.log(`\nDry run complete. ${roots.length} roots would be processed.`);
    return;
  }

  // ── Generate SQL ───────────────────────────────────────────────────────────

  const stats: Stats = { roots: 0, chunks: 0, sections: 0, sources: 0, skipped: 0 };
  const allSql: string[] = [];

  for (const root of roots) {
    if (!root.word?.trim()) {
      stats.skipped++;
      continue;
    }

    const rootNorm = normalizeArabicForSearch(root.word);
    if (!rootNorm) {
      stats.skipped++;
      continue;
    }

    const entries = (entriesByRoot.get(root.word) ?? []).sort(
      (a, b) => (a.nodenum ?? 0) - (b.nodenum ?? 0)
    );
    const rawText = buildRawText(root.xml, entries);

    allSql.push(sourceChunkSql(root, rootNorm, rawText, batchId));
    stats.chunks++;

    allSql.push(rootEntrySql(root, rootNorm, rawText, entries, batchId));
    stats.roots++;

    entries.forEach((entry, idx) => {
      allSql.push(sectionSql(entry, rootNorm, root.word, idx + 1));
      stats.sections++;
    });

    allSql.push(rootEntrySourceSql(root, rootNorm));
    stats.sources++;
  }

  console.log(`\nSQL summary:`);
  console.log(`  roots:    ${stats.roots}`);
  console.log(`  chunks:   ${stats.chunks}`);
  console.log(`  sections: ${stats.sections}`);
  console.log(`  sources:  ${stats.sources}`);
  console.log(`  skipped:  ${stats.skipped}`);
  console.log(`  total SQL statements: ${allSql.length}`);

  // ── Write SQL files ────────────────────────────────────────────────────────

  const files = writeSqlFiles(allSql, CHUNK_SIZE);
  const ftsFile = `${OUT_DIR}/lane_root_fts_backfill.sql`;
  writeFileSync(ftsFile, ftsSql(), 'utf8');

  console.log(`\nSQL files written to ${OUT_DIR}:`);
  for (const f of files) console.log(`  ${f}`);
  console.log(`  ${ftsFile} (FTS backfill, run after all import files)`);

  if (sqlOnly) {
    console.log('\n--sql-only: skipping execution.');
    return;
  }

  // ── Execute ────────────────────────────────────────────────────────────────

  console.log(`\nApplying to ${target} D1…`);
  for (const f of files) {
    console.log(`  Applying ${f}…`);
    d1ExecuteFile(f, target);
  }

  console.log(`  Applying FTS backfill…`);
  d1ExecuteFile(ftsFile, target);

  console.log('\nImport done.');
  console.log(`Batch ID: ${batchId}`);
}

main().catch(err => { console.error(err); process.exit(1); });
