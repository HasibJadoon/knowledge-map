/**
 * rebuild-lane-quality-index-bulk.ts
 *
 * Fast set-based rebuild for ar_ling_lane_quality_index. This is less
 * semantically rich than the JS row scanner for suggested patch arrays, but it
 * is the right tool for the first full remote materialization because it avoids
 * hundreds of small Wrangler imports.
 *
 * Usage:
 *   tsx scripts/lane/rebuild-lane-quality-index-bulk.ts --remote
 */

import { d1ExecuteSql, d1Query, type D1Target } from './utils/wrangler.ts';

function parseArgs(): { target: D1Target; rangeSize: number } {
  const args = process.argv.slice(2);
  const rangeIdx = args.indexOf('--range-size');
  return {
    target: args.includes('--remote') ? 'remote' : 'local',
    rangeSize: rangeIdx >= 0 ? Number(args[rangeIdx + 1]) : 6000,
  };
}

function sqlForRange(start: number, end: number): string {
  return `
WITH base AS (
  SELECT
    e.id AS lexicon_entry_id,
    COALESCE(e.root_text, '') AS root_text,
    e.heading_norm,
    e.display_heading_ar,
    e.page_no,
    e.source_entry_seq,
    e.definition_en,
    json_extract(e.cleaner_json, '$.definition_clean') AS definition_clean,
    json_extract(e.cleaner_json, '$.entry_type') AS entry_type,
    COALESCE(json_extract(e.cleaner_json, '$.broken_patterns'), json('[]')) AS broken_patterns_json,
    1 AS has_arabic_form_block
  FROM ar_ling_lexicon_entries e
  WHERE e.source_slug = 'lane_lexicon'
    AND e.rowid BETWEEN ${start} AND ${end}
),
flags AS (
  SELECT
    *,
    CASE WHEN definition_en LIKE '%aor. ,%' OR definition_clean LIKE '%aor. [form missing]%' THEN 1 ELSE 0 END AS has_empty_aor,
    CASE WHEN definition_en LIKE '%inf. n. ,%' OR definition_clean LIKE '%inf. n. [form missing]%' THEN 1 ELSE 0 END AS has_empty_infinitive,
    CASE WHEN definition_en LIKE '%syn. :%' OR definition_clean LIKE '%syn. [form missing]%' THEN 1 ELSE 0 END AS has_empty_synonym,
    CASE WHEN definition_en LIKE '%[◌]%' THEN 1 ELSE 0 END AS has_circle_placeholder,
    CASE WHEN definition_clean LIKE '%[form missing]%' THEN 1 ELSE 0 END AS has_form_missing,
    CASE WHEN definition_en LIKE '%and and%' OR definition_clean LIKE '%and and%' THEN 1 ELSE 0 END AS has_duplicate_and,
    CASE WHEN broken_patterns_json LIKE '%bare_cross_ref%' OR definition_clean LIKE '%see [related entry]%' THEN 1 ELSE 0 END AS has_bare_cross_ref,
    CASE WHEN broken_patterns_json LIKE '%orphan_syn%' OR definition_clean LIKE '%syn. [form missing]%' THEN 1 ELSE 0 END AS has_orphan_syn,
    CASE
      WHEN definition_en LIKE '%Kur,%' OR definition_en LIKE '%Kur %' OR definition_en LIKE '%Ḳur%' OR definition_en LIKE '%Qur%'
        OR definition_clean LIKE '%Kur,%' OR definition_clean LIKE '%Kur %' OR definition_clean LIKE '%Ḳur%' OR definition_clean LIKE '%Qur%'
      THEN 1 ELSE 0
    END AS has_quran_marker
  FROM base
)
INSERT OR REPLACE INTO ar_ling_lane_quality_index (
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
)
SELECT
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
  (has_form_missing * 40)
    + (has_circle_placeholder * 35)
    + (has_empty_aor * 20)
    + (has_empty_infinitive * 20)
    + (has_empty_synonym * 12)
    + (has_bare_cross_ref * 10)
    + (has_quran_marker * 8)
    + (has_duplicate_and * 5)
    + ((CASE WHEN has_arabic_form_block = 1 THEN 0 ELSE 1 END) * 4) AS repair_priority,
  has_empty_aor
    + has_empty_infinitive
    + has_empty_synonym
    + has_circle_placeholder
    + has_form_missing
    + has_duplicate_and
    + has_bare_cross_ref
    + has_orphan_syn
    + has_quran_marker
    + CASE WHEN has_arabic_form_block = 1 THEN 0 ELSE 1 END AS issue_count,
  CASE
    WHEN has_form_missing = 1 OR has_circle_placeholder = 1 OR has_empty_aor = 1 OR has_empty_infinitive = 1 THEN json_array('missing_form')
    WHEN has_empty_synonym = 1 OR has_orphan_syn = 1 OR has_bare_cross_ref = 1 THEN json_array('cross_reference')
    WHEN has_quran_marker = 1 THEN json_array('quran_ref')
    WHEN has_duplicate_and = 1 THEN json_array('parser_noise')
    ELSE json_array()
  END AS suggested_patch_types_json,
  datetime('now')
FROM flags;
`;
}

async function main(): Promise<void> {
  const { target, rangeSize } = parseArgs();
  console.log(`Lane quality index bulk rebuild — ${target}`);

  const bounds = d1Query(
    `SELECT MIN(rowid) AS min_rowid, MAX(rowid) AS max_rowid, COUNT(*) AS n
     FROM ar_ling_lexicon_entries
     WHERE source_slug = 'lane_lexicon'`,
    target,
  )[0] as { min_rowid?: number; max_rowid?: number; n?: number } | undefined;

  const min = Number(bounds?.min_rowid ?? 0);
  const max = Number(bounds?.max_rowid ?? 0);
  const total = Number(bounds?.n ?? 0);
  if (!min || !max || !total) {
    console.log('No Lane rows found.');
    return;
  }

  d1ExecuteSql('DELETE FROM ar_ling_lane_quality_index;', target);

  let indexedRanges = 0;
  for (let start = min; start <= max; start += rangeSize) {
    const end = Math.min(start + rangeSize - 1, max);
    d1ExecuteSql(sqlForRange(start, end), target);
    indexedRanges++;
    console.log(`  indexed rowid ${start}-${end}`);
  }

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
     FROM ar_ling_lane_quality_index`,
    target,
  )[0] ?? {};

  console.log(`Done. Ranges: ${indexedRanges}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
