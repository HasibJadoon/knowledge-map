/**
 * Remove existing bad Lane data from km_arabic_linguistic.
 *
 * Default: DRY RUN — prints counts only.
 * Pass --execute to actually delete.
 * Pass --remote to target remote D1 (default: local).
 *
 * Targets:
 *   - source_id = 'src_lane_lexicon' (new import ID — removes any prior failed attempts)
 *   - source_slug LIKE '%lane%' (catches lane_quranic_research_perseus, lane_lexicon, etc.)
 *   - definition_source = 'Lane'
 *   - ar_ling_sources with title LIKE '%Lane%'
 *
 * Safe guards:
 *   - Never deletes Lisān al-ʿArab, Tāj al-ʿArūs, Rāghib, Qāmūs, Ibn Fāris, etc.
 *   - Deletes in correct FK order (display_blocks → entry_refs → evidence → senses → entries → chunks → editions → sources)
 */

import { d1Query, d1ExecuteSql } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

const PROTECTED_SOURCE_IDS = [
  'src_lisan_arab',
  'src_taj_arus',
  'src_mufradat_raghib',
  'src_qamus_muhit',
  'src_maqayis_lugha',
  'src_sihah',
  'src_jamhara',
  'src_ubab',
  'src_misbah',
];

const LANE_SOURCE_CONDITION = `(
    id = 'src_lane_lexicon'
    OR title_en LIKE '%Lane%'
    OR title_ar LIKE '%لين%'
  )
  AND id NOT IN (${PROTECTED_SOURCE_IDS.map(s => `'${s}'`).join(',')})`;

function countTable(target: D1Target, table: string, where: string): number {
  try {
    const rows = d1Query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, target);
    return (rows[0]?.n as number) ?? 0;
  } catch {
    return -1; // table doesn't exist yet
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun  = !args.includes('--execute');
  const target: D1Target = args.includes('--remote') ? 'remote' : 'local';

  console.log(`Lane cleanup — ${dryRun ? 'DRY RUN (pass --execute to delete)' : 'EXECUTING DELETES'}`);
  console.log(`Target: ${target}\n`);

  // Identify Lane source IDs present in the DB
  let laneSources: string[] = [];
  try {
    const srcRows = d1Query(
      `SELECT id FROM ar_ling_sources WHERE ${LANE_SOURCE_CONDITION}`,
      target,
    );
    laneSources = srcRows.map(r => r.id as string);
  } catch {
    console.log('ar_ling_sources not accessible — skipping source detection');
  }

  if (!laneSources.length) {
    // fallback: just use the known IDs
    laneSources = ['src_lane_lexicon'];
  }

  const inSources = laneSources.map(s => `'${s}'`).join(',');
  const ENTRY_LANE_WHERE = `(
    source_id IN (${inSources})
    OR source_slug LIKE '%lane%'
    OR definition_source = 'Lane'
  )`;
  const CHUNK_LANE_WHERE = `source_id IN (${inSources}) OR source_slug LIKE '%lane%'`;

  console.log(`Lane sources identified: ${laneSources.join(', ')}\n`);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const laneEntryIds = (() => {
    try {
      const rows = d1Query(
        `SELECT id FROM ar_ling_lexicon_entries WHERE ${ENTRY_LANE_WHERE}`,
        target,
      );
      return rows.map(r => `'${r.id as string}'`).join(',');
    } catch { return ''; }
  })();
  const entryInClause = laneEntryIds
    ? `lexicon_entry_id IN (${laneEntryIds})`
    : '1=0';

  const counts = {
    display_blocks:  countTable(target, 'ar_ling_source_lexicon_display_blocks', `source_id IN (${inSources}) OR ${entryInClause}`),
    source_refs:     countTable(target, 'ar_ling_source_entry_refs',     `source_id IN (${inSources})`),
    evidence:        countTable(target, 'ar_ling_lexicon_evidence',       entryInClause || '1=0'),
    senses:          countTable(target, 'ar_ling_senses',                 entryInClause || '1=0'),
    entries:         countTable(target, 'ar_ling_lexicon_entries',        ENTRY_LANE_WHERE),
    chunks:          countTable(target, 'ar_ling_source_chunks',          CHUNK_LANE_WHERE),
    editions:        countTable(target, 'ar_ling_source_editions',        `source_id IN (${inSources})`),
    sources:         countTable(target, 'ar_ling_sources',                `id IN (${inSources})`),
    import_runs:     countTable(target, 'ar_ling_import_runs',            `source_id IN (${inSources})`),
  };

  console.log('Rows to delete:');
  for (const [t, n] of Object.entries(counts)) {
    const marker = n < 0 ? '(table not found)' : n.toString();
    console.log(`  ${t.padEnd(20)}: ${marker}`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN complete. Pass --execute to delete.');
    return;
  }

  // ── Execute deletes in FK order ────────────────────────────────────────────
  const steps: Array<{ label: string; sql: string }> = [
    {
      label: 'ar_ling_source_lexicon_display_blocks',
      sql: `DELETE FROM ar_ling_source_lexicon_display_blocks
            WHERE source_id IN (${inSources})
               OR lexicon_entry_id IN (
                 SELECT id FROM ar_ling_lexicon_entries WHERE ${ENTRY_LANE_WHERE}
               )`,
    },
    {
      label: 'ar_ling_source_entry_refs',
      sql: `DELETE FROM ar_ling_source_entry_refs WHERE source_id IN (${inSources})`,
    },
    {
      label: 'ar_ling_lexicon_evidence',
      sql: laneEntryIds
        ? `DELETE FROM ar_ling_lexicon_evidence WHERE ${entryInClause}`
        : '-- (no lane entries found, skip)',
    },
    {
      label: 'ar_ling_senses',
      sql: laneEntryIds
        ? `DELETE FROM ar_ling_senses WHERE ${entryInClause}`
        : '-- (no lane entries found, skip)',
    },
    {
      label: 'ar_ling_lexicon_entries',
      sql: `DELETE FROM ar_ling_lexicon_entries WHERE ${ENTRY_LANE_WHERE}`,
    },
    {
      label: 'ar_ling_source_chunks',
      sql: `DELETE FROM ar_ling_source_chunks WHERE ${CHUNK_LANE_WHERE}`,
    },
    {
      label: 'ar_ling_import_runs',
      sql: `DELETE FROM ar_ling_import_runs WHERE source_id IN (${inSources})`,
    },
    {
      label: 'ar_ling_source_editions',
      sql: `DELETE FROM ar_ling_source_editions WHERE source_id IN (${inSources})`,
    },
    {
      label: 'ar_ling_sources',
      sql: `DELETE FROM ar_ling_sources
            WHERE id IN (${inSources})
              AND id NOT IN (${PROTECTED_SOURCE_IDS.map(s => `'${s}'`).join(',')})`,
    },
  ];

  for (const step of steps) {
    if (step.sql.startsWith('--')) { console.log(`  skip: ${step.label}`); continue; }
    console.log(`  Deleting from ${step.label}…`);
    try {
      d1ExecuteSql(step.sql + ';', target);
    } catch (err) {
      console.warn(`  Warning: ${step.label} — ${(err as Error).message}`);
    }
  }

  console.log('\nCleanup complete.');
  console.log('Next: npm run lane:migrate && npm run lane:import -- --root كتب --limit-root');
}

main().catch(err => { console.error(err); process.exit(1); });
