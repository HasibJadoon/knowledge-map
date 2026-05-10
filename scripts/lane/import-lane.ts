/**
 * import-lane.ts  — Lane SQLite → K-Maps ar_ling schema
 *
 * Real Lane SQLite schema (from inspect):
 *   Table: entry
 *   - id        INTEGER  - row PK
 *   - root      TEXT     - Arabic root (already Unicode, e.g. "كتب")
 *   - broot     TEXT     - Buckwalter root (e.g. "ktb")
 *   - word      TEXT     - Arabic headword with diacritics (e.g. "كَتَبَ")
 *   - bword     TEXT     - Buckwalter headword
 *   - headword  TEXT     - alternate Arabic headword
 *   - itype     TEXT     - verb form / entry type (e.g. "1", "R. Q. 1")
 *   - nodeid    TEXT     - Lane node ID (e.g. "j1")
 *   - xml       TEXT     - rich XML with Arabic Unicode inside <orth> and <foreign> tags
 *   - page      INTEGER  - Lane page number
 *   - type      INT      - 0 = main, 1 = supplement
 *
 * Usage:
 *   npm run lane:import -- --root كتب --limit-root --dry-run
 *   npm run lane:import -- --root كتب --limit-root
 *   npm run lane:import -- --all --chunk-size 500
 *   npm run lane:import -- --all --remote
 *   npm run lane:import -- --all --sql-only
 */

import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  normalizeArabicForSearch,
  makeHeadingKey,
  approxTokens,
  containsArabic,
} from './utils/arabic.ts';
import { d1ExecuteFile } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

// ── Constants ────────────────────────────────────────────────────────────────

const IMPORTER_VERSION = 'lane_import_v1';
const SOURCE_ID        = 'src_lane_lexicon';
const EDITION_ID       = 'ed_lane_github_sqlite';
const SOURCE_SLUG      = 'lane_lexicon';
const SQLITE_PATH      = resolve('data/sources/lane/lexicon.sqlite');
const OUT_DIR          = resolve('out/lane');

// ── Lane entry row (mapped from real schema) ──────────────────────────────────

interface LaneRow {
  id:       number;
  nodeid:   string;
  root:     string;    // Arabic root Unicode
  broot:    string;    // Buckwalter root
  word:     string;    // Arabic headword Unicode (diacritized)
  bword:    string;    // Buckwalter headword
  headword: string;    // alternate Arabic headword
  itype:    string;    // verb form / entry type
  xml:      string;    // rich XML with Arabic Unicode
  page:     number | null;
  type:     number;    // 0 = main, 1 = supplement
}

// ── XML parsing helpers ───────────────────────────────────────────────────────

/** Extract attribute value from an XML tag. */
function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return m ? m[1] : '';
}

/** Strip all XML/HTML tags, returning plain text. */
function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract the primary Arabic headword from Lane XML.
 * Tries <orth extent="full" lang="ar">...</orth> first.
 */
function extractHeadwordFromXml(xml: string, fallback: string): string {
  // First <orth lang="ar"> with extent="full"
  const full = xml.match(/<orth[^>]+extent="full"[^>]+lang="ar"[^>]*>([^<]+)<\/orth>/);
  if (full && containsArabic(full[1])) return full[1].trim();

  // Any <orth lang="ar">
  const any = xml.match(/<orth[^>]+lang="ar"[^>]*>([^<]+)<\/orth>/);
  if (any && containsArabic(any[1])) return any[1].trim();

  // Fallback to the word column if it contains Arabic
  if (fallback && containsArabic(fallback)) return fallback.trim();

  return '';
}

/**
 * Extract English definition text from Lane XML.
 * Lane XML looks like:
 *   <entryFree ...>
 *     <form>...</form>
 *     plain English text with <hi> and <sense> interspersed
 *     <foreign lang="ar">Arabic</foreign>
 *   </entryFree>
 *
 * Strategy: remove <foreign lang="ar">...</foreign> blocks (Arabic),
 * remove <orth> blocks, strip remaining tags, collapse whitespace.
 */
function extractEnglishFromXml(xml: string): string {
  let en = xml
    // Remove Arabic foreign blocks
    .replace(/<foreign\s+lang="ar"[^>]*>[^<]*<\/foreign>/gi, ' ')
    // Remove orth blocks (Arabic headwords)
    .replace(/<orth[^>]*>[^<]*<\/orth>/gi, ' ')
    // Remove form block (contains itype + orth)
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
    // Remove ref tags
    .replace(/<ref[^>]*\/>/gi, ' ')
    // Remove sense markers like "-A2-" inside sense tags
    .replace(/<sense[^>]*>.*?<\/sense>/gi, ' ')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Drop leading/trailing punctuation artifacts
  en = en.replace(/^[\s.,:;—–-]+/, '').trim();

  return en;
}

/**
 * Extract all Arabic text segments from `<foreign lang="ar">` and `<orth lang="ar">` tags.
 * These are Arabic forms/examples within the entry.
 */
function extractArabicForms(xml: string, headword: string): string[] {
  const forms: string[] = [];
  const seen  = new Set<string>();
  seen.add(headword);

  const patterns = [
    /<foreign[^>]+lang="ar"[^>]*>([^<]+)<\/foreign>/gi,
    /<orth[^>]+lang="ar"[^>]*>([^<]+)<\/orth>/gi,
  ];

  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(xml)) !== null) {
      const text = m[1].trim();
      if (text && containsArabic(text) && !seen.has(text) && text.length >= 2) {
        forms.push(text);
        seen.add(text);
      }
    }
  }

  return forms;
}

/**
 * Parse Lane itype into a simple K-Maps entry_kind.
 * itype examples: "1", "2", "R. Q. 1", "alphabetical letter", ""
 */
function entryKind(itype: string, type: number): string {
  if (itype === 'alphabetical letter') return 'lexicon_entry';
  if (/^R\.?\s*Q\.?/.test(itype)) return 'lexicon_entry';
  if (/^\d+$/.test(itype)) return 'lexicon_entry';
  if (!itype) return 'root_entry';
  return 'lexicon_entry';
}

/**
 * Detect part of speech from itype.
 */
function posFromItype(itype: string): string {
  if (!itype) return 'noun';
  const n = itype.toLowerCase();
  if (/\b\d+\b/.test(n) || n.includes('r.q')) return 'verb';
  if (n.includes('particle') || n.includes('prep')) return 'particle';
  return 'noun';
}

// ── Sense extraction ──────────────────────────────────────────────────────────

function extractSenses(englishText: string): string[] {
  const senses: string[] = [];

  // Try sense markers: -A2-, -b2-, (S, M, K,...), roman numerals
  const parts = englishText.split(/(?=-[Ab]\d+-)|(?=\bSee\b)|(?=\bAlso\b)/);

  for (const part of parts) {
    const clean = part.replace(/^[-–—\s]+/, '').trim();
    if (clean.length > 15) senses.push(clean.slice(0, 600));
    if (senses.length >= 10) break;
  }

  // Fallback: use the full text as one sense
  if (!senses.length && englishText.length > 10) {
    senses.push(englishText.slice(0, 600));
  }

  return senses;
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function escJson(obj: unknown): string {
  return esc(JSON.stringify(obj));
}

// ── Per-row SQL generation ────────────────────────────────────────────────────

interface Stats {
  roots: number; chunks: number; entries: number;
  senses: number; evidence: number; refs: number; blocks: number;
}

function rowToSql(row: LaneRow, seq: number, stats: Stats, insertedRoots: Set<string>): string[] {
  const sql: string[] = [];

  // ── Extract clean data ─────────────────────────────────────────────────────
  const headwordAr   = extractHeadwordFromXml(row.xml, row.word || row.headword || '');
  const displayAr    = headwordAr || row.word || row.headword || '؟';
  const headwordBare = normalizeArabicForSearch(displayAr);
  const headKey      = makeHeadingKey(displayAr);

  // Arabic root: prefer `root` column (already Unicode), strip diacritics for key
  const rootAr       = (row.root || '').trim();
  const rootBare     = normalizeArabicForSearch(rootAr);
  const rootKey      = makeHeadingKey(rootAr);

  const englishText  = extractEnglishFromXml(row.xml);
  const arabicForms  = extractArabicForms(row.xml, displayAr);
  const senses       = extractSenses(englishText);
  const kind         = entryKind(row.itype, row.type);
  const pos          = posFromItype(row.itype);

  const definitionEn = englishText.slice(0, 3000) || `Lane entry: ${row.word}`;

  // ── IDs ────────────────────────────────────────────────────────────────────
  const nodeId  = row.nodeid || String(row.id);
  const rootId  = `root_${rootKey || headKey}`;
  const lemmaId = `lane_lemma_${nodeId}`;
  const chunkId = `lane_chunk_${nodeId}`;
  const entryId = `lane_entry_${nodeId}`;
  const refId   = `lane_ref_${nodeId}`;

  // Subquery to resolve root id — handles existing roots with different IDs
  const rootIdSql = rootAr
    ? `(SELECT id FROM ar_ling_roots WHERE root_text = ${esc(rootAr)})`
    : 'NULL';

  // ── ar_ling_roots ─────────────────────────────────────────────────────────
  if (rootAr && !insertedRoots.has(rootId)) {
    insertedRoots.add(rootId);
    const rootLetters = rootBare.split('').join(' ');
    const rootType    = rootBare.replace(/\s/g, '').length === 4
      ? 'quadriliteral' : rootBare.replace(/\s/g, '').length === 3
        ? 'trilateral' : 'unknown';
    sql.push(
      `INSERT OR IGNORE INTO ar_ling_roots (id, root_text, root_letters, root_type, note_md) ` +
      `VALUES (${esc(rootId)}, ${esc(rootAr)}, ${esc(rootLetters)}, ${esc(rootType)}, 'Imported from Lane Lexicon.');`
    );
    stats.roots++;
  }

  // ── ar_ling_lemmas ────────────────────────────────────────────────────────
  sql.push(
    `INSERT OR IGNORE INTO ar_ling_lemmas (id, root_id, lemma_text, lemma_text_bare, part_of_speech, note_md) ` +
    `VALUES (${esc(lemmaId)}, ${rootIdSql}, ${esc(displayAr)}, ${esc(headwordBare)}, ${esc(pos)}, 'Imported from Lane Lexicon.');`
  );

  // ── ar_ling_source_chunks ─────────────────────────────────────────────────
  const metaJson = JSON.stringify({
    source: 'lane', external_node_id: nodeId, external_key: row.bword,
    broot: row.broot, itype: row.itype, parser: IMPORTER_VERSION,
  });

  // text_ar = Arabic headword ONLY — never Buckwalter
  const textAr = displayAr;

  sql.push(
    `INSERT OR IGNORE INTO ar_ling_source_chunks ` +
    `(id, source_id, edition_id, source_slug, chunk_kind, chunk_seq, heading_norm, text_ar, text_en, page_no, tokens_approx, meta_json) ` +
    `VALUES (${esc(chunkId)}, ${esc(SOURCE_ID)}, ${esc(EDITION_ID)}, ${esc(SOURCE_SLUG)}, ${esc(kind)}, ${seq}, ` +
    `${esc(headwordBare)}, ${esc(textAr)}, ${esc(definitionEn.slice(0, 3000))}, ${row.page ?? 'NULL'}, ${approxTokens(definitionEn)}, ${esc(metaJson)});`
  );
  stats.chunks++;

  // ── ar_ling_lexicon_entries ───────────────────────────────────────────────
  const uiJson = JSON.stringify({
    heading:     { ar: displayAr },
    definition:  { en: definitionEn.slice(0, 800) },
    senses:      senses.slice(0, 5),
    arabic_forms: arabicForms.slice(0, 8),
    source: { id: SOURCE_ID, slug: SOURCE_SLUG, badge: 'Lane', page: row.page },
  });

  const cleanerJson = JSON.stringify({
    parser: IMPORTER_VERSION, node_id: nodeId, itype: row.itype,
    bword: row.bword, broot: row.broot,
    warnings: !headwordAr ? ['Arabic headword not found in XML — used word column'] : [],
  });

  sql.push(
    `INSERT OR IGNORE INTO ar_ling_lexicon_entries ` +
    `(id, lemma_id, root_id, source_id, source_slug, source_chunk_id, entry_kind, entry_text, ` +
    `definition_en, definition_source, usage_register, heading_norm, heading_key, source_entry_seq, ` +
    `page_no, display_heading_ar, lemma_text, root_text, transliteration, pos_tag, gloss_en, ` +
    `summary_en, ui_json, cleaner_json, status, ai_fill_state, sort_key, note_md) ` +
    `VALUES (${esc(entryId)}, ${esc(lemmaId)}, ${rootIdSql}, ` +
    `${esc(SOURCE_ID)}, ${esc(SOURCE_SLUG)}, ${esc(chunkId)}, ${esc(kind)}, ` +
    `${esc(definitionEn.slice(0, 3000))}, ${esc(definitionEn.slice(0, 3000))}, 'Lane', 'classical', ` +
    `${esc(headwordBare)}, ${esc(headKey)}, ${seq}, ${row.page ?? 'NULL'}, ` +
    `${esc(displayAr)}, ${esc(displayAr)}, ${rootAr ? esc(rootAr) : 'NULL'}, ` +
    `${esc(row.bword)}, ${esc(pos)}, ${esc(definitionEn.slice(0, 200))}, ` +
    `${esc(definitionEn.slice(0, 200))}, ${esc(uiJson)}, ${esc(cleanerJson)}, ` +
    `'raw_promoted', 'pending', ${esc(headwordBare)}, 'Imported from Lane Lexicon via lane_import_v1.');`
  );
  stats.entries++;

  // ── ar_ling_senses ────────────────────────────────────────────────────────
  for (let si = 0; si < Math.min(senses.length, 10); si++) {
    sql.push(
      `INSERT OR IGNORE INTO ar_ling_senses (id, lexicon_entry_id, sense_number, gloss_en, note_md) ` +
      `VALUES (${esc(`lane_sense_${nodeId}_${si + 1}`)}, ${esc(entryId)}, ${si + 1}, ` +
      `${esc(senses[si].slice(0, 500))}, 'Lane sense.');`
    );
    stats.senses++;
  }

  // ── ar_ling_lexicon_evidence (Arabic forms) ───────────────────────────────
  for (let fi = 0; fi < Math.min(arabicForms.length, 8); fi++) {
    const sourceRef = `${SOURCE_ID}:page:${row.page ?? 0}:node:${nodeId}`;
    sql.push(
      `INSERT OR IGNORE INTO ar_ling_lexicon_evidence (id, lexicon_entry_id, evidence_type, text_ar, source_ref, note_md) ` +
      `VALUES (${esc(`lane_evidence_${nodeId}_${fi + 1}`)}, ${esc(entryId)}, 'source_form', ` +
      `${esc(arabicForms[fi])}, ${esc(sourceRef)}, 'Lane Arabic form.');`
    );
    stats.evidence++;
  }

  // ── ar_ling_source_entry_refs ─────────────────────────────────────────────
  // Store full raw XML here (truncated to 10 KB to stay within D1 row limits)
  sql.push(
    `INSERT OR IGNORE INTO ar_ling_source_entry_refs ` +
    `(id, source_id, source_chunk_id, external_node_id, external_key, external_type, ` +
    `headword_ar, buck, page_no, raw_xml, meta_json) ` +
    `VALUES (${esc(refId)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ${esc(nodeId)}, ` +
    `${esc(row.bword)}, ${esc(row.itype || 'main')}, ${esc(displayAr)}, ${esc(row.bword)}, ` +
    `${row.page ?? 'NULL'}, ${esc(row.xml.slice(0, 10000))}, ` +
    `${escJson({ source: 'lane', parser: IMPORTER_VERSION, broot: row.broot })});`
  );
  stats.refs++;

  // ── ar_ling_source_lexicon_display_blocks ────────────────────────────────────────
  // heading block — ONLY Arabic, never Buckwalter
  sql.push(
    `INSERT OR IGNORE INTO ar_ling_source_lexicon_display_blocks ` +
    `(id, source_id, source_chunk_id, lexicon_entry_id, block_seq, block_type, text_ar) ` +
    `VALUES (${esc(`lane_block_${nodeId}_0`)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ` +
    `${esc(entryId)}, 0, 'heading', ${esc(displayAr)});`
  );

  // definition block — English text
  sql.push(
    `INSERT OR IGNORE INTO ar_ling_source_lexicon_display_blocks ` +
    `(id, source_id, source_chunk_id, lexicon_entry_id, block_seq, block_type, text_en) ` +
    `VALUES (${esc(`lane_block_${nodeId}_1`)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ` +
    `${esc(entryId)}, 1, 'definition', ${esc(definitionEn.slice(0, 2000))});`
  );

  if (arabicForms.length) {
    sql.push(
      `INSERT OR IGNORE INTO ar_ling_source_lexicon_display_blocks ` +
      `(id, source_id, source_chunk_id, lexicon_entry_id, block_seq, block_type, text_ar) ` +
      `VALUES (${esc(`lane_block_${nodeId}_2`)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ` +
      `${esc(entryId)}, 2, 'arabic_form', ${esc(arabicForms.slice(0, 5).join(' · '))});`
    );
  }

  if (row.page) {
    sql.push(
      `INSERT OR IGNORE INTO ar_ling_source_lexicon_display_blocks ` +
      `(id, source_id, source_chunk_id, lexicon_entry_id, block_seq, block_type, text_en) ` +
      `VALUES (${esc(`lane_block_${nodeId}_3`)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ` +
      `${esc(entryId)}, 3, 'page_ref', ${esc(`Lane p. ${row.page}`)});`
    );
  }

  // raw XML only in raw_collapsible — never in a rendered block
  sql.push(
    `INSERT OR IGNORE INTO ar_ling_source_lexicon_display_blocks ` +
    `(id, source_id, source_chunk_id, lexicon_entry_id, block_seq, block_type, text_en) ` +
    `VALUES (${esc(`lane_block_${nodeId}_9`)}, ${esc(SOURCE_ID)}, ${esc(chunkId)}, ` +
    `${esc(entryId)}, 9, 'raw_collapsible', '[Source XML]');`
  );

  stats.blocks += 5;
  return sql;
}

// ── Read rows from Lane SQLite ────────────────────────────────────────────────

function readRows(db: Database.Database, rootFilter: string | null): LaneRow[] {
  if (rootFilter) {
    const norm = normalizeArabicForSearch(rootFilter);
    const rows = db.prepare(
      `SELECT id, nodeid, root, broot, word, bword, itype, xml, page, type, headword
       FROM entry
       WHERE root = ? OR root = ? OR word LIKE ?
       ORDER BY page, id
       LIMIT 500`
    ).all(rootFilter, norm, `%${rootFilter}%`) as LaneRow[];
    return rows;
  }

  return db.prepare(
    `SELECT id, nodeid, root, broot, word, bword, itype, xml, page, type, headword
     FROM entry ORDER BY page, id`
  ).all() as LaneRow[];
}

// ── Write SQL files in chunks ────────────────────────────────────────────────

function writeSqlFiles(allSql: string[], chunkSize: number): string[] {
  mkdirSync(OUT_DIR, { recursive: true });
  const files: string[] = [];
  for (let i = 0, fi = 1; i < allSql.length; i += chunkSize, fi++) {
    const file = `${OUT_DIR}/lane_import_${String(fi).padStart(3, '0')}.sql`;
    writeFileSync(file, allSql.slice(i, i + chunkSize).join('\n') + '\n', 'utf8');
    files.push(file);
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args      = process.argv.slice(2);
  const rootArg   = args.includes('--root') ? args[args.indexOf('--root') + 1] : null;
  const limitRoot = args.includes('--limit-root');
  const importAll = args.includes('--all');
  const dryRun    = args.includes('--dry-run');
  const sqlOnly   = args.includes('--sql-only');
  const remote    = args.includes('--remote');
  const target: D1Target = remote ? 'remote' : 'local';
  const chunkSizeIdx = args.indexOf('--chunk-size');
  const chunkSize = chunkSizeIdx >= 0 ? parseInt(args[chunkSizeIdx + 1], 10) : 500;

  if (!rootArg && !importAll) {
    console.error('Pass --root <arabic> for a single root, or --all for full import.');
    process.exit(1);
  }

  if (!existsSync(SQLITE_PATH)) {
    console.error(`Lane SQLite not found: ${SQLITE_PATH}`);
    console.error('Run: npm run lane:download');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const db = new Database(SQLITE_PATH, { readonly: true });

  console.log(`Reading Lane entries${rootArg ? ` for root: ${rootArg}` : ' (all)'}…`);
  let rows = readRows(db, rootArg ?? null);
  db.close();

  if (limitRoot) rows = rows.slice(0, 200);
  console.log(`Rows to process: ${rows.length}`);

  if (dryRun) {
    for (const row of rows.slice(0, 5)) {
      const ar  = extractHeadwordFromXml(row.xml, row.word || row.headword || '');
      const en  = extractEnglishFromXml(row.xml);
      const fms = extractArabicForms(row.xml, ar || row.word);
      console.log(`\n  nodeid=${row.nodeid}  root=${row.root}  page=${row.page}`);
      console.log(`    word:          ${row.word}`);
      console.log(`    headword_ar:   ${ar || '(from word column)'}`);
      console.log(`    arabic_forms:  ${fms.slice(0, 4).join(', ')}`);
      console.log(`    english (120): ${en.slice(0, 120)}`);
    }
    console.log(`\nDry run done (${rows.length} rows).`);
    return;
  }

  // ── Generate SQL ───────────────────────────────────────────────────────────
  console.log('Generating SQL…');
  const allSql: string[] = [];
  const stats: Stats = { roots: 0, chunks: 0, entries: 0, senses: 0, evidence: 0, refs: 0, blocks: 0 };
  const insertedRoots = new Set<string>();
  const runId = `lane_run_${Date.now()}`;

  for (let seq = 0; seq < rows.length; seq++) {
    const stmts = rowToSql(rows[seq], seq, stats, insertedRoots);
    allSql.push(...stmts);
  }

  // Import run record
  allSql.push(
    `INSERT OR REPLACE INTO ar_ling_import_runs ` +
    `(id, source_id, importer_name, importer_version, mode, status, finished_at, stats_json) ` +
    `VALUES (${esc(runId)}, ${esc(SOURCE_ID)}, 'import-lane.ts', ${esc(IMPORTER_VERSION)}, ` +
    `'${importAll ? 'full' : 'single_root'}', 'done', datetime('now'), ${escJson(stats)});`
  );

  console.log(`SQL statements: ${allSql.length}`);
  console.log(`  roots:   ${stats.roots}`);
  console.log(`  chunks:  ${stats.chunks}`);
  console.log(`  entries: ${stats.entries}`);
  console.log(`  senses:  ${stats.senses}`);
  console.log(`  evidence:${stats.evidence}`);
  console.log(`  refs:    ${stats.refs}`);
  console.log(`  blocks:  ${stats.blocks}`);

  // ── Write SQL files ────────────────────────────────────────────────────────
  const files = writeSqlFiles(allSql, chunkSize);
  console.log(`\nSQL files:`);
  for (const f of files) console.log(`  ${f}`);

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

  console.log('\nImport done.');
  console.log('Next: npm run lane:fts-rebuild && npm run lane:verify');
}

main().catch(err => { console.error(err); process.exit(1); });
