/**
 * Inspect the downloaded Lane SQLite schema and sample data.
 *
 * Output files written to out/lane/:
 *   lane_tables.txt      — list of tables
 *   lane_schema.sql      — CREATE TABLE statements
 *   lane_sample_rows.json — sample rows (كتب, علم, أكل + first 5 of each table)
 *   lane_entry_shape.md  — human-readable analysis of entry structure
 */

import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buckwalterToArabic, looksLikeBuckwalter } from './utils/arabic.ts';

const SQLITE_PATH = resolve('data/sources/lane/lexicon.sqlite');
const OUT_DIR     = resolve('out/lane');

interface SqliteMaster {
  type: string;
  name: string;
  sql: string | null;
}

interface ColumnInfo {
  name: string;
  type: string;
}

function detectBuckwalterKey(
  db: Database.Database,
  table: string,
  cols: string[],
): string | null {
  // Look for a column whose sample values look like Buckwalter
  for (const col of cols) {
    const row = db.prepare(`SELECT "${col}" AS v FROM "${table}" LIMIT 3`).all() as Array<{ v: unknown }>;
    for (const r of row) {
      if (typeof r.v === 'string' && looksLikeBuckwalter(r.v) && r.v.length < 40) {
        return col;
      }
    }
  }
  return null;
}

function sampleForSearch(
  db: Database.Database,
  table: string,
  cols: string[],
  terms: string[],
): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  for (const term of terms) {
    // Try Arabic term and Buckwalter equivalent
    for (const col of cols) {
      try {
        const rows = db
          .prepare(`SELECT * FROM "${table}" WHERE "${col}" LIKE ? LIMIT 3`)
          .all(`%${term}%`) as Record<string, unknown>[];
        if (rows.length) {
          results.push({ _term: term, _col: col, _rows: rows });
          break;
        }
      } catch { /* column may not be text */ }
    }
  }
  return results;
}

function analyzeEntryShape(
  db: Database.Database,
  tableName: string,
  cols: ColumnInfo[],
  colNames: string[],
): string {
  const lines: string[] = [];
  lines.push(`# Lane SQLite — Entry Shape Analysis`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Main table: \`${tableName}\``);
  lines.push('');
  lines.push('### Columns');
  for (const col of cols) {
    lines.push(`- \`${col.name}\` (${col.type})`);
  }

  // Row count
  const countRow = db.prepare(`SELECT COUNT(*) AS n FROM "${tableName}"`).get() as { n: number };
  lines.push(`\n### Row count: ${countRow.n}`);

  // Sample values per column
  lines.push('\n### Sample values per column');
  for (const col of cols) {
    try {
      const sample = db
        .prepare(`SELECT DISTINCT "${col.name}" AS v FROM "${tableName}" WHERE "${col.name}" IS NOT NULL LIMIT 5`)
        .all() as Array<{ v: unknown }>;
      const vals = sample.map(r => JSON.stringify(r.v)).join(', ');
      lines.push(`- \`${col.name}\`: ${vals}`);
    } catch {
      lines.push(`- \`${col.name}\`: (error reading)`);
    }
  }

  // Buckwalter detection
  const bwCol = detectBuckwalterKey(db, tableName, colNames);
  lines.push(`\n### Buckwalter key column: \`${bwCol ?? 'not detected'}\``);

  if (bwCol) {
    const sample = db
      .prepare(`SELECT "${bwCol}" AS k FROM "${tableName}" LIMIT 5`)
      .all() as Array<{ k: string }>;
    lines.push('\n### Buckwalter → Arabic sample');
    for (const r of sample) {
      if (r.k) {
        const ar = buckwalterToArabic(r.k);
        lines.push(`  \`${r.k}\` → \`${ar || '(no Arabic output)'}\``);
      }
    }
  }

  // Distinct type values if a type-like column exists
  const typeCol = colNames.find(c => c === 'type' || c === 'node_type' || c === 'entry_type');
  if (typeCol) {
    const types = db
      .prepare(`SELECT DISTINCT "${typeCol}" AS t, COUNT(*) AS n FROM "${tableName}" GROUP BY "${typeCol}" ORDER BY n DESC`)
      .all() as Array<{ t: unknown; n: number }>;
    lines.push(`\n### Distinct \`${typeCol}\` values`);
    for (const t of types) {
      lines.push(`  - \`${JSON.stringify(t.t)}\`: ${t.n} rows`);
    }
  }

  // Detect text/XML column
  const textCol = colNames.find(c =>
    c === 'text' || c === 'xml' || c === 'content' || c === 'body' || c === 'entry_text'
  );
  if (textCol) {
    const textSample = db
      .prepare(`SELECT "${textCol}" AS v FROM "${tableName}" WHERE "${textCol}" IS NOT NULL LIMIT 2`)
      .all() as Array<{ v: string }>;
    lines.push(`\n### Text column \`${textCol}\` — first 500 chars of first 2 rows`);
    for (const r of textSample) {
      lines.push('```');
      lines.push((r.v ?? '').slice(0, 500));
      lines.push('```');
    }
  }

  return lines.join('\n');
}

function main(): void {
  if (!existsSync(SQLITE_PATH)) {
    console.error(`Lane SQLite not found: ${SQLITE_PATH}`);
    console.error('Run: npm run lane:download');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const db = new Database(SQLITE_PATH, { readonly: true });

  // 1. All tables
  const masters = db
    .prepare(`SELECT type, name, sql FROM sqlite_master WHERE type IN ('table','view') ORDER BY name`)
    .all() as SqliteMaster[];

  const tableNames = masters.map(m => m.name);
  writeFileSync(`${OUT_DIR}/lane_tables.txt`, tableNames.join('\n') + '\n', 'utf8');
  console.log(`Tables (${tableNames.length}): ${tableNames.join(', ')}`);

  // 2. Schema SQL
  const schemaSql = masters.map(m => m.sql ?? '-- (no sql)').join('\n\n') + '\n';
  writeFileSync(`${OUT_DIR}/lane_schema.sql`, schemaSql, 'utf8');

  // 3. Sample rows
  const samples: Record<string, unknown> = {};
  for (const name of tableNames) {
    try {
      const rows = db.prepare(`SELECT * FROM "${name}" LIMIT 5`).all();
      samples[name] = rows;
    } catch (e) {
      samples[name] = { error: String(e) };
    }
  }

  // Targeted search for كتب, علم, أكل across all text-like columns
  const arabicTerms = ['كتب', 'علم', 'أكل', 'ktb', 'Elm', 'Akl'];
  const searchResults: Record<string, unknown> = {};
  for (const name of tableNames) {
    const cols = db.prepare(`PRAGMA table_info("${name}")`).all() as ColumnInfo[];
    const textCols = cols.filter(c => c.type.toUpperCase().includes('TEXT')).map(c => c.name);
    const hits = sampleForSearch(db, name, textCols, arabicTerms);
    if (hits.length) searchResults[name] = hits;
  }

  samples['_search_كتب_علم_أكل'] = searchResults;
  writeFileSync(`${OUT_DIR}/lane_sample_rows.json`, JSON.stringify(samples, null, 2), 'utf8');

  // 4. Entry shape — analyze the most likely main table
  const priorityTables = ['entries', 'entry', 'lexicon', 'nodes', 'words'];
  const mainTable = priorityTables.find(t => tableNames.includes(t)) ?? tableNames[0];

  if (mainTable) {
    const cols = db.prepare(`PRAGMA table_info("${mainTable}")`).all() as ColumnInfo[];
    const colNames = cols.map(c => c.name);
    const shape = analyzeEntryShape(db, mainTable, cols, colNames);
    writeFileSync(`${OUT_DIR}/lane_entry_shape.md`, shape, 'utf8');
    console.log(`\nEntry shape analysis → ${OUT_DIR}/lane_entry_shape.md`);
  }

  db.close();

  console.log(`\nOutput files:`);
  console.log(`  ${OUT_DIR}/lane_tables.txt`);
  console.log(`  ${OUT_DIR}/lane_schema.sql`);
  console.log(`  ${OUT_DIR}/lane_sample_rows.json`);
  console.log(`  ${OUT_DIR}/lane_entry_shape.md`);
  console.log('\nReview lane_entry_shape.md before running lane:import');
}

main();
