/**
 * Apply the Lane support table migration to km_arabic_linguistic.
 *
 * Usage:
 *   npm run lane:migrate              # apply to local D1
 *   npm run lane:migrate -- --remote  # apply to remote D1
 */

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { d1ExecuteFile } from './utils/wrangler.ts';
import type { D1Target } from './utils/wrangler.ts';

const MIGRATION = resolve('workers/ar-linguistics/migrations/0011_lane_support_tables.sql');

function main(): void {
  const args = process.argv.slice(2);
  const target: D1Target = args.includes('--remote') ? 'remote' : 'local';

  if (!existsSync(MIGRATION)) {
    console.error(`Migration file not found: ${MIGRATION}`);
    process.exit(1);
  }

  console.log(`Applying Lane support migration to ${target} D1…`);
  console.log(`  File: ${MIGRATION}`);

  try {
    d1ExecuteFile(MIGRATION, target);
    console.log('\nMigration applied successfully.');
    console.log('Tables created (if not existing):');
    console.log('  ar_ling_source_entry_refs');
    console.log('  ar_ling_source_lexicon_display_blocks');
    console.log('  ar_ling_import_runs');
    console.log('\nLane source metadata inserted:');
    console.log('  ar_ling_sources → src_lane_lexicon');
    console.log('  ar_ling_source_editions → ed_lane_github_sqlite');
    console.log('\nNext: npm run lane:inspect  (after lane:download)');
  } catch (err) {
    console.error('\nMigration failed:', (err as Error).message);
    process.exit(1);
  }
}

main();
