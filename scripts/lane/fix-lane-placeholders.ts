/**
 * fix-lane-placeholders.ts
 *
 * Targeted fix for Lane entries where cleaner_json.definition_clean still
 * contains [◌] placeholders left by previous cleanup runs (v1/v2).
 *
 * What it does:
 *   1. Reads every Lane entry where definition_clean contains [◌]
 *   2. Replaces [◌] → [form missing] in definition_clean
 *   3. Sets cleaner_json.has_stripped_arabic = true
 *   4. Sets cleaner_json.cleanup_version = '3.0'
 *   5. Writes UPDATE SQL and optionally applies it
 *
 * What it does NOT do:
 *   - Modify raw_xml (no such column exists)
 *   - Modify definition_en (the faithful scholarly layer keeps [◌])
 *   - Delete any rows
 *   - Reload Lane
 *
 * Note on form recovery:
 *   The Arabic forms that were stripped during Lane import lived inside
 *   <foreign lang="ar"> XML tags. Those tokens are not preserved in D1.
 *   Buckwalter broot/bword only cover the root/headword, not the inline
 *   aorist/inf. forms inside definitions. Full recovery requires re-parsing
 *   the Lane source SQLite — out of scope here. This script settles for the
 *   [form missing] fallback, which the UI renders as a labelled amber chip.
 *
 * Usage:
 *   npm run lane:fix-placeholders -- --dry-run
 *   npm run lane:fix-placeholders -- --remote
 *   npm run lane:fix-placeholders -- --remote --dry-run
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { d1Query, d1ExecuteFile, type D1Target } from './utils/wrangler.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function escJson(obj: unknown): string {
  return esc(JSON.stringify(obj));
}

// ── Row shape ─────────────────────────────────────────────────────────────────

interface Row {
  id: string;
  display_heading_ar: string | null;
  page_no: number | null;
  cleaner_json: string | null;
}

// ── Fix one row ───────────────────────────────────────────────────────────────

function buildFixSql(row: Row): string | null {
  let cj: Record<string, unknown> = {};
  try { cj = JSON.parse(row.cleaner_json ?? '{}') as Record<string, unknown>; } catch { return null; }

  const defClean = cj.definition_clean as string | null;
  if (!defClean || !defClean.includes('[◌]')) return null;

  const fixed = defClean.replace(/\[◌\]/g, '[form missing]');
  cj.definition_clean   = fixed;
  cj.has_stripped_arabic = true;
  cj.cleanup_version    = '3.0';

  return (
    `UPDATE ar_ling_lexicon_entries ` +
    `SET cleaner_json = ${escJson(cj)} ` +
    `WHERE id = ${esc(row.id)};`
  );
}

// ── Audit queries ─────────────────────────────────────────────────────────────

function printAudit(target: D1Target, label: string): void {
  const rows = d1Query(
    `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries ` +
    `WHERE source_slug = 'lane_lexicon' ` +
    `AND json_extract(cleaner_json, '$.definition_clean') LIKE '%[◌]%'`,
    target,
  );
  const n = (rows[0]?.n as number) ?? '?';
  console.log(`  ${label}: ${n} entries with [◌] in definition_clean`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const OUT_DIR = resolve('out/lane');

async function main(): Promise<void> {
  const args     = process.argv.slice(2);
  const dryRun   = args.includes('--dry-run');
  const remote   = args.includes('--remote');
  const target: D1Target = remote ? 'remote' : 'local';

  const pageSizeIdx = args.indexOf('--page-size');
  const pageSize    = pageSizeIdx >= 0 ? parseInt(args[pageSizeIdx + 1], 10) : 500;

  console.log(`Lane placeholder fix — ${target}${dryRun ? ' [DRY RUN]' : ''}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  // ── Audit: before ──
  printAudit(target, 'Before');

  // ── Sample ──
  const samples = d1Query(
    `SELECT id, display_heading_ar, page_no, ` +
    `  substr(json_extract(cleaner_json, '$.definition_clean'), 1, 300) AS preview ` +
    `FROM ar_ling_lexicon_entries ` +
    `WHERE source_slug = 'lane_lexicon' ` +
    `  AND json_extract(cleaner_json, '$.definition_clean') LIKE '%[◌]%' ` +
    `LIMIT 5`,
    target,
  ) as Array<{ id: string; display_heading_ar: string | null; page_no: number | null; preview: string }>;

  if (samples.length) {
    console.log('\nSample entries to fix:');
    for (const s of samples) {
      console.log(`  ${s.display_heading_ar ?? '?'} (p.${s.page_no}) — ${s.preview.slice(0, 120)}`);
    }
    console.log('');
  }

  // ── Count total affected ──
  const totalRows = d1Query(
    `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries ` +
    `WHERE source_slug = 'lane_lexicon' ` +
    `AND json_extract(cleaner_json, '$.definition_clean') LIKE '%[◌]%'`,
    target,
  );
  const total = (totalRows[0]?.n as number) ?? 0;
  console.log(`Entries to fix: ${total.toLocaleString()}\n`);

  if (total === 0) {
    console.log('Nothing to fix — no [◌] found in definition_clean.');
    return;
  }

  // ── Process in pages ──
  const allSql: string[] = [];
  let offset = 0;
  let processed = 0;

  while (processed < total) {
    const rows = d1Query(
      `SELECT id, display_heading_ar, page_no, cleaner_json ` +
      `FROM ar_ling_lexicon_entries ` +
      `WHERE source_slug = 'lane_lexicon' ` +
      `  AND json_extract(cleaner_json, '$.definition_clean') LIKE '%[◌]%' ` +
      `ORDER BY page_no ASC, id ASC ` +
      `LIMIT ${pageSize} OFFSET ${offset}`,
      target,
    ) as Row[];

    if (rows.length === 0) break;

    for (const row of rows) {
      const sql = buildFixSql(row);
      if (sql) allSql.push(sql);
      processed++;
    }

    offset += rows.length;
    process.stdout.write(`\r  Built SQL for ${processed.toLocaleString()} / ${total.toLocaleString()} rows…`);

    if (dryRun && processed >= Math.min(20, total)) break;
  }
  console.log('\n');

  if (dryRun) {
    console.log(`[DRY RUN] Would apply ${allSql.length} UPDATE statements.`);
    console.log('\nFirst 3 SQL statements:');
    for (const s of allSql.slice(0, 3)) console.log(`  ${s.slice(0, 200)}…`);
    return;
  }

  // ── Write SQL files ──
  const CHUNK = 2000;
  const files: string[] = [];
  for (let i = 0, fi = 1; i < allSql.length; i += CHUNK, fi++) {
    const file = `${OUT_DIR}/fix_placeholders_${String(fi).padStart(3, '0')}.sql`;
    writeFileSync(file, allSql.slice(i, i + CHUNK).join('\n') + '\n', 'utf8');
    files.push(file);
  }

  // ── Apply ──
  console.log(`Applying ${files.length} SQL file(s) to ${target} D1…`);
  for (const file of files) {
    console.log(`  ${file}…`);
    d1ExecuteFile(file, target);
  }

  // ── Audit: after ──
  console.log('');
  printAudit(target, 'After');

  console.log('\nFix complete.');
  console.log('Next: npm run lane:fts-rebuild -- --remote');
}

main().catch(err => { console.error(err); process.exit(1); });
