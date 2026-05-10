/**
 * verify-lane-rendering.ts
 *
 * Verify that Lane import is clean:
 *   - Source metadata exists
 *   - Counts are non-zero
 *   - display_heading_ar contains no Buckwalter artifacts
 *   - definition_en is not empty
 *   - Raw XML is NOT in normal display blocks
 *   - FTS search finds Lane entries for Arabic/English/transliteration terms
 *
 * Usage:
 *   npm run lane:verify              # check local D1
 *   npm run lane:verify -- --remote  # check remote D1
 */

import { d1Query } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

const BUCKWALTER_PATTERN = /[~_A-Z][a-z]{2,}|kat~|All|Elm|Akl|\$/;
const BAD_CHARS = /[~_><&{}$*]/;

interface CheckResult {
  pass: boolean;
  label: string;
  detail: string;
}

function check(label: string, pass: boolean, detail: string): CheckResult {
  return { pass, label, detail };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const target: D1Target = args.includes('--remote') ? 'remote' : 'local';

  console.log(`Lane rendering verification — ${target}\n`);
  const results: CheckResult[] = [];

  // ── A. Source metadata ─────────────────────────────────────────────────────
  {
    const rows = d1Query(`SELECT id FROM ar_ling_sources WHERE id = 'src_lane_lexicon'`, target);
    results.push(check('A.1 src_lane_lexicon exists', rows.length > 0, rows.length > 0 ? 'ok' : 'MISSING'));
  }
  {
    const rows = d1Query(`SELECT id FROM ar_ling_source_editions WHERE id = 'ed_lane_github_sqlite'`, target);
    results.push(check('A.2 ed_lane_github_sqlite exists', rows.length > 0, rows.length > 0 ? 'ok' : 'MISSING'));
  }

  // ── B. Counts ──────────────────────────────────────────────────────────────
  const countQueries: Array<{ label: string; sql: string; min: number }> = [
    {
      label: 'B.1 source chunks (lane_lexicon)',
      sql:   `SELECT COUNT(*) AS n FROM ar_ling_source_chunks WHERE source_id = 'src_lane_lexicon'`,
      min:   1,
    },
    {
      label: 'B.2 lexicon entries (lane_lexicon)',
      sql:   `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries WHERE source_id = 'src_lane_lexicon'`,
      min:   1,
    },
    {
      label: 'B.3 senses (lane)',
      sql:   `SELECT COUNT(*) AS n FROM ar_ling_senses s JOIN ar_ling_lexicon_entries e ON e.id = s.lexicon_entry_id WHERE e.source_id = 'src_lane_lexicon'`,
      min:   1,
    },
    {
      label: 'B.4 source entry refs (lane)',
      sql:   `SELECT COUNT(*) AS n FROM ar_ling_source_entry_refs WHERE source_id = 'src_lane_lexicon'`,
      min:   1,
    },
    {
      label: 'B.5 display blocks (lane)',
      sql:   `SELECT COUNT(*) AS n FROM ar_ling_source_lexicon_display_blocks WHERE source_id = 'src_lane_lexicon'`,
      min:   1,
    },
  ];

  for (const q of countQueries) {
    const rows = d1Query(q.sql, target);
    const n    = (rows[0]?.n as number) ?? 0;
    results.push(check(q.label, n >= q.min, `count = ${n}`));
  }

  // ── C. Bad rendering detection ────────────────────────────────────────────

  // display_heading_ar must not contain Buckwalter patterns
  {
    const rows = d1Query(
      `SELECT id, display_heading_ar FROM ar_ling_lexicon_entries
       WHERE source_id = 'src_lane_lexicon'
         AND display_heading_ar IS NOT NULL
       LIMIT 200`,
      target,
    ) as Array<{ id: string; display_heading_ar: string }>;

    const bad = rows.filter(r => BAD_CHARS.test(r.display_heading_ar) || BUCKWALTER_PATTERN.test(r.display_heading_ar));
    results.push(check(
      'C.1 display_heading_ar free of Buckwalter',
      bad.length === 0,
      bad.length === 0
        ? 'ok'
        : `${bad.length} bad: ${bad.slice(0, 3).map(r => `${r.id}: "${r.display_heading_ar}"`).join(', ')}`,
    ));
  }

  // display_heading_ar must not be NULL for main/root entries
  {
    const rows = d1Query(
      `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries
       WHERE source_id = 'src_lane_lexicon'
         AND entry_kind IN ('root_entry', 'lexicon_entry')
         AND display_heading_ar IS NULL`,
      target,
    );
    const n = (rows[0]?.n as number) ?? 0;
    results.push(check('C.2 display_heading_ar not NULL for main entries', n === 0, n === 0 ? 'ok' : `${n} entries missing heading`));
  }

  // definition_en must not be empty
  {
    const rows = d1Query(
      `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries
       WHERE source_id = 'src_lane_lexicon'
         AND (definition_en IS NULL OR definition_en = '')`,
      target,
    );
    const n = (rows[0]?.n as number) ?? 0;
    results.push(check('C.3 definition_en not empty', n === 0, n === 0 ? 'ok' : `${n} entries with empty definition`));
  }

  // source_chunk_id must be set
  {
    const rows = d1Query(
      `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries
       WHERE source_id = 'src_lane_lexicon' AND source_chunk_id IS NULL`,
      target,
    );
    const n = (rows[0]?.n as number) ?? 0;
    results.push(check('C.4 source_chunk_id set on all entries', n === 0, n === 0 ? 'ok' : `${n} entries missing chunk`));
  }

  // raw_xml must be in source_entry_refs (not in display blocks)
  {
    const rows = d1Query(
      `SELECT COUNT(*) AS n FROM ar_ling_source_lexicon_display_blocks
       WHERE source_id = 'src_lane_lexicon'
         AND block_type != 'raw_collapsible'
         AND (text_ar LIKE '%<%' OR text_en LIKE '%<%' OR text_ar LIKE '%&%')`,
      target,
    );
    const n = (rows[0]?.n as number) ?? 0;
    results.push(check('C.5 raw XML not in normal display blocks', n === 0, n === 0 ? 'ok' : `${n} blocks contain raw XML`));
  }

  // text_ar in chunks must not be Buckwalter
  {
    const rows = d1Query(
      `SELECT id, text_ar FROM ar_ling_source_chunks
       WHERE source_id = 'src_lane_lexicon' LIMIT 200`,
      target,
    ) as Array<{ id: string; text_ar: string }>;
    const bad = rows.filter(r => BUCKWALTER_PATTERN.test(r.text_ar) && !/[؀-ۿ]/.test(r.text_ar));
    results.push(check(
      'C.6 text_ar in chunks is Arabic not Buckwalter',
      bad.length === 0,
      bad.length === 0 ? 'ok' : `${bad.length} chunks with Buckwalter in text_ar`,
    ));
  }

  // ── D. Sample roots: كتب, علم, أكل ────────────────────────────────────────
  for (const root of ['كتب', 'علم', 'أكل']) {
    const norm = root.replace(/[ً-ٰٟ]/g, '').replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').trim();
    const rows = d1Query(
      `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries
       WHERE source_id = 'src_lane_lexicon'
         AND (heading_norm = ${JSON.stringify(norm)} OR heading_norm LIKE ${JSON.stringify('%' + norm + '%')})`,
      target,
    );
    const n = (rows[0]?.n as number) ?? 0;
    results.push(check(`D. root ${root} has Lane entries`, n > 0, `count = ${n}`));
  }

  // ── E. FTS search ──────────────────────────────────────────────────────────
  const ftsTerms: Array<{ term: string; table: string }> = [
    { term: 'كتب',  table: 'ar_ling_lexicon_entries_fts' },
    { term: 'write', table: 'ar_ling_lexicon_entries_fts' },
  ];
  for (const { term, table } of ftsTerms) {
    try {
      const rows = d1Query(
        `SELECT COUNT(*) AS n FROM ${table} WHERE ${table} MATCH ${JSON.stringify(term)}`,
        target,
      );
      const n = (rows[0]?.n as number) ?? 0;
      results.push(check(`E. FTS "${term}" returns results`, n > 0, `count = ${n}`));
    } catch (e) {
      results.push(check(`E. FTS "${term}"`, false, String(e)));
    }
  }

  // ── Print results ──────────────────────────────────────────────────────────
  console.log('');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`  ${icon} ${r.label.padEnd(48)} ${r.detail}`);
    if (r.pass) passed++; else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed checks above must be fixed before promoting to remote.');
    process.exit(1);
  } else {
    console.log('\nAll checks passed. Ready for remote: npm run lane:import -- --all --remote');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
