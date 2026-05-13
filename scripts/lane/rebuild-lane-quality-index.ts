/**
 * rebuild-lane-quality-index.ts
 *
 * Builds ar_ling_lane_quality_index without repeatedly running broad LIKE
 * scans in remote D1. The script pages through Lane entries, computes quality
 * flags locally, and writes compact INSERT OR REPLACE batches.
 *
 * Usage:
 *   npm run lane:quality-index -- --dry-run
 *   npm run lane:quality-index -- --remote
 *   npm run lane:quality-index -- --remote --root نبأ
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { d1Query, d1ExecuteFile, type D1Target } from './utils/wrangler.ts';

const OUT_DIR = resolve('out/lane/quality-index');
const SOURCE_SLUG = 'lane_lexicon';
const SCANNER_VERSION = 'lane_quality_index_v1';

interface LaneScanRow {
  rowid: number;
  id: string;
  root_text: string | null;
  heading_norm: string | null;
  display_heading_ar: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  definition_en: string | null;
  cleaner_json: string | null;
  has_arabic_form_block: number;
}

interface QualityRow {
  lexicon_entry_id: string;
  root_text: string;
  heading_norm: string | null;
  display_heading_ar: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  has_empty_aor: number;
  has_empty_infinitive: number;
  has_empty_synonym: number;
  has_circle_placeholder: number;
  has_form_missing: number;
  has_duplicate_and: number;
  has_bare_cross_ref: number;
  has_orphan_syn: number;
  has_quran_marker: number;
  has_arabic_form_block: number;
  entry_type: string | null;
  broken_patterns_json: string;
  repair_priority: number;
  issue_count: number;
  suggested_patch_types_json: string;
}

function sqlString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function safeJsonParse(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function hasQuranMarker(text: string): boolean {
  return /\b(?:Kur|Qur|Ḳur)\b|Ḳur,|Kur,|Qur,|lxxviii|lxvi|xxviii|xliii|xii|xv\.|xxxviii|xxii/i.test(text);
}

function toQualityRow(row: LaneScanRow): QualityRow {
  const def = row.definition_en ?? '';
  const cleaner = safeJsonParse(row.cleaner_json);
  const defClean = typeof cleaner.definition_clean === 'string' ? cleaner.definition_clean : '';
  const brokenPatterns = asStringArray(cleaner.broken_patterns);

  const hasEmptyAor = /aor\.\s*,/.test(def) || /aor\.\s*\[form missing\]/i.test(defClean);
  const hasEmptyInf = /inf\. n\.\s*,/.test(def) || /inf\. n\.\s*\[form missing\]/i.test(defClean);
  const hasEmptySyn = /syn\.\s*:/.test(def) || /syn\.\s*\[form missing\]/i.test(defClean);
  const hasCircle = def.includes('[◌]');
  const hasFormMissing = defClean.includes('[form missing]');
  const hasDuplicateAnd = /\band\s+and\b/i.test(def) || /\band\s+and\b/i.test(defClean);
  const hasBareCrossRef = brokenPatterns.includes('bare_cross_ref') || /see\s+\[related entry\]/i.test(defClean);
  const hasOrphanSyn = brokenPatterns.includes('orphan_syn') || /syn\.\s*\[form missing\]/i.test(defClean);
  const hasQuran = hasQuranMarker(def) || hasQuranMarker(defClean);

  const suggested = new Set<string>();
  if (hasEmptyAor || hasEmptyInf || hasFormMissing || hasCircle) suggested.add('missing_form');
  if (hasEmptySyn || hasOrphanSyn) suggested.add('cross_reference');
  if (hasBareCrossRef) suggested.add('cross_reference');
  if (hasQuran) suggested.add('quran_ref');
  if (hasDuplicateAnd || hasCircle) suggested.add('parser_noise');

  const flags = [
    hasEmptyAor,
    hasEmptyInf,
    hasEmptySyn,
    hasCircle,
    hasFormMissing,
    hasDuplicateAnd,
    hasBareCrossRef,
    hasOrphanSyn,
    hasQuran,
    row.has_arabic_form_block ? false : true,
  ];
  const issueCount = flags.filter(Boolean).length;

  const repairPriority =
    (hasFormMissing ? 40 : 0) +
    (hasCircle ? 35 : 0) +
    (hasEmptyAor ? 20 : 0) +
    (hasEmptyInf ? 20 : 0) +
    (hasEmptySyn ? 12 : 0) +
    (hasBareCrossRef ? 10 : 0) +
    (hasQuran ? 8 : 0) +
    (hasDuplicateAnd ? 5 : 0) +
    (row.has_arabic_form_block ? 0 : 4);

  return {
    lexicon_entry_id: row.id,
    root_text: row.root_text ?? '',
    heading_norm: row.heading_norm,
    display_heading_ar: row.display_heading_ar,
    page_no: row.page_no,
    source_entry_seq: row.source_entry_seq,
    has_empty_aor: hasEmptyAor ? 1 : 0,
    has_empty_infinitive: hasEmptyInf ? 1 : 0,
    has_empty_synonym: hasEmptySyn ? 1 : 0,
    has_circle_placeholder: hasCircle ? 1 : 0,
    has_form_missing: hasFormMissing ? 1 : 0,
    has_duplicate_and: hasDuplicateAnd ? 1 : 0,
    has_bare_cross_ref: hasBareCrossRef ? 1 : 0,
    has_orphan_syn: hasOrphanSyn ? 1 : 0,
    has_quran_marker: hasQuran ? 1 : 0,
    has_arabic_form_block: row.has_arabic_form_block ? 1 : 0,
    entry_type: typeof cleaner.entry_type === 'string' ? cleaner.entry_type : null,
    broken_patterns_json: JSON.stringify(brokenPatterns),
    repair_priority: repairPriority,
    issue_count: issueCount,
    suggested_patch_types_json: JSON.stringify([...suggested]),
  };
}

function insertSql(rows: QualityRow[]): string {
  const values = rows.map(r => `(
    ${sqlString(r.lexicon_entry_id)},
    ${sqlString(r.root_text)},
    ${sqlString(r.heading_norm)},
    ${sqlString(r.display_heading_ar)},
    ${sqlString(r.page_no)},
    ${sqlString(r.source_entry_seq)},
    ${r.has_empty_aor},
    ${r.has_empty_infinitive},
    ${r.has_empty_synonym},
    ${r.has_circle_placeholder},
    ${r.has_form_missing},
    ${r.has_duplicate_and},
    ${r.has_bare_cross_ref},
    ${r.has_orphan_syn},
    ${r.has_quran_marker},
    ${r.has_arabic_form_block},
    ${sqlString(r.entry_type)},
    json(${sqlString(r.broken_patterns_json)}),
    ${r.repair_priority},
    ${r.issue_count},
    json(${sqlString(r.suggested_patch_types_json)}),
    datetime('now')
  )`).join(',\n');

  return `INSERT OR REPLACE INTO ar_ling_lane_quality_index (
    lexicon_entry_id,
    root_text,
    heading_norm,
    display_heading_ar,
    page_no,
    source_entry_seq,
    has_empty_aor,
    has_empty_infinitive,
    has_empty_synonym,
    has_circle_placeholder,
    has_form_missing,
    has_duplicate_and,
    has_bare_cross_ref,
    has_orphan_syn,
    has_quran_marker,
    has_arabic_form_block,
    entry_type,
    broken_patterns_json,
    repair_priority,
    issue_count,
    suggested_patch_types_json,
    last_scanned_at
  ) VALUES
${values};`;
}

function parseArgs(): {
  target: D1Target;
  dryRun: boolean;
  root: string | null;
  pageSize: number;
  applyChunkSize: number;
} {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const pageSizeIdx = args.indexOf('--page-size');
  const applyChunkIdx = args.indexOf('--apply-chunk-size');
  return {
    target: args.includes('--remote') ? 'remote' : 'local',
    dryRun: args.includes('--dry-run'),
    root: rootIdx >= 0 ? args[rootIdx + 1] : null,
    pageSize: pageSizeIdx >= 0 ? Number(args[pageSizeIdx + 1]) : 500,
    applyChunkSize: applyChunkIdx >= 0 ? Number(args[applyChunkIdx + 1]) : 500,
  };
}

async function main(): Promise<void> {
  const { target, dryRun, root, pageSize, applyChunkSize } = parseArgs();
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Lane quality index rebuild — ${target}${dryRun ? ' [DRY RUN]' : ''}`);
  console.log(`Scanner: ${SCANNER_VERSION}`);
  if (root) console.log(`Root filter: ${root}`);

  if (!dryRun && !root) {
    const deleteFile = `${OUT_DIR}/delete_existing.sql`;
    writeFileSync(deleteFile, `DELETE FROM ar_ling_lane_quality_index;\n`, 'utf8');
    d1ExecuteFile(deleteFile, target);
  }

  let lastRowid = 0;
  let scanned = 0;
  let written = 0;
  let fileNo = 1;

  while (true) {
    const rootCond = root ? `AND root_text = ${sqlString(root)}` : '';
    const rows = d1Query(
      `SELECT rowid AS rowid,
              id,
              root_text,
              heading_norm,
              display_heading_ar,
              page_no,
              source_entry_seq,
              definition_en,
              cleaner_json,
              EXISTS (
                SELECT 1
                FROM ar_ling_source_lexicon_display_blocks b
                WHERE b.lexicon_entry_id = e.id
                  AND b.block_type = 'arabic_form'
              ) AS has_arabic_form_block
       FROM ar_ling_lexicon_entries e
       WHERE source_slug = ${sqlString(SOURCE_SLUG)}
         AND rowid > ${lastRowid}
         ${rootCond}
       ORDER BY rowid
       LIMIT ${pageSize}`,
      target,
    ) as unknown as LaneScanRow[];

    if (!rows.length) break;

    const qualityRows = rows.map(toQualityRow);
    scanned += rows.length;
    lastRowid = rows[rows.length - 1].rowid;

    if (dryRun) {
      const affected = qualityRows.filter(r => r.issue_count > 0).length;
      console.log(`Scanned ${scanned}; current page issues: ${affected}/${qualityRows.length}`);
      if (scanned >= Math.min(pageSize * 2, 1000)) break;
      continue;
    }

    for (let i = 0; i < qualityRows.length; i += applyChunkSize) {
      const chunk = qualityRows.slice(i, i + applyChunkSize);
      const file = `${OUT_DIR}/quality_index_${String(fileNo++).padStart(4, '0')}.sql`;
      writeFileSync(file, insertSql(chunk) + '\n', 'utf8');
      d1ExecuteFile(file, target);
      written += chunk.length;
    }

    process.stdout.write(`\r  indexed ${written.toLocaleString()} rows...`);
  }

  console.log(`\nDone. Scanned ${scanned.toLocaleString()} row(s).`);

  const summary = d1Query(
    `SELECT COUNT(*) AS indexed,
            SUM(CASE WHEN issue_count > 0 THEN 1 ELSE 0 END) AS with_issues,
            SUM(has_empty_aor) AS empty_aor,
            SUM(has_empty_infinitive) AS empty_infinitive,
            SUM(has_empty_synonym) AS empty_synonym,
            SUM(has_circle_placeholder) AS circle_placeholder,
            SUM(has_form_missing) AS form_missing,
            SUM(has_duplicate_and) AS duplicate_and,
            SUM(has_bare_cross_ref) AS bare_cross_ref,
            SUM(has_quran_marker) AS quran_marker
     FROM ar_ling_lane_quality_index
     ${root ? `WHERE root_text = ${sqlString(root)}` : ''}`,
    target,
  );
  console.log(JSON.stringify(summary[0] ?? {}, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
