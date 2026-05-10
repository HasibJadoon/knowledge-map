/**
 * Rebuild FTS5 tables after Lane import.
 *
 * Usage:
 *   npm run lane:fts-rebuild              # rebuild in local D1
 *   npm run lane:fts-rebuild -- --remote  # rebuild in remote D1
 */

import { d1ExecuteSql } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

const FTS_TABLES = [
  'ar_ling_source_chunks_fts',
  'ar_ling_lexicon_entries_fts',
  'ar_ling_lemmas_fts',
  'ar_ling_roots_fts',
  'ar_ling_lexicon_evidence_fts',
];

function main(): void {
  const args   = process.argv.slice(2);
  const target: D1Target = args.includes('--remote') ? 'remote' : 'local';

  console.log(`Rebuilding FTS tables on ${target} D1…\n`);

  for (const table of FTS_TABLES) {
    console.log(`  Rebuilding ${table}…`);
    try {
      d1ExecuteSql(
        `INSERT INTO ${table}(${table}) VALUES('rebuild');`,
        target,
      );
      console.log(`    done`);
    } catch (err) {
      console.warn(`    Warning: ${(err as Error).message}`);
    }
  }

  console.log('\nFTS rebuild complete.');
  console.log('Next: npm run lane:verify');
}

main();
