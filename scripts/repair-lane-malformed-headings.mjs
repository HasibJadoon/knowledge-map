#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/lane-repair/', import.meta.url);
const SOURCE_SLUG = 'lane_quranic_research_perseus';
const APPLY = process.argv.includes('--apply');

function d1(command) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 },
  );
  const parsed = JSON.parse(out);
  if (!parsed[0]?.success) throw new Error(`D1 command failed: ${command}`);
  return parsed[0].results ?? [];
}

function d1File(filePath) {
  return execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--file', filePath],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 },
  );
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
}

function parseMeta(metaJson) {
  try {
    return JSON.parse(metaJson ?? '{}');
  } catch {
    return {};
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const rows = d1(`
  SELECT id, heading_norm, root_id, meta_json
  FROM ar_ling_source_chunks
  WHERE source_slug='${SOURCE_SLUG}'
    AND chunk_kind='lexical_entry'
    AND (LENGTH(heading_norm) > 8 OR heading_norm GLOB '*[0-9A-Za-z_=^~]*')
`);

const updates = rows.map((row) => {
  const meta = parseMeta(row.meta_json);
  const locator = meta.locator ?? {};
  const repairedHeading = normalizeArabic(locator.normalized_headword ?? locator.headword);
  const metaJson = JSON.stringify({
    ...meta,
    repair_notes: [
      ...(Array.isArray(meta.repair_notes) ? meta.repair_notes : []),
      {
        repair: 'lane_malformed_heading_repair_v1',
        old_heading_norm: row.heading_norm,
        strategy: 'fallback_to_normalized_headword',
      },
    ],
    locator: {
      ...locator,
      malformed_root_heading: row.heading_norm,
      repaired_heading_norm: repairedHeading || null,
    },
  });
  return {
    id: row.id,
    oldHeading: row.heading_norm,
    headingNorm: repairedHeading || row.heading_norm,
    metaJson,
  };
});

console.log(JSON.stringify({
  apply: APPLY,
  rows: updates.length,
  preview: updates.slice(0, 20),
}, null, 2));

const statements = updates.map((row) => `UPDATE ar_ling_source_chunks
  SET heading_norm = ${sql(row.headingNorm)},
      root_id = NULL,
      meta_json = ${sql(row.metaJson)}
  WHERE id = ${sql(row.id)};`);

const sqlPath = join(OUT_DIR.pathname, 'repair-lane-malformed-headings.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY && statements.length) {
  console.log(d1File(sqlPath));
}
