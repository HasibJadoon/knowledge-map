#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dryRun = process.argv.includes('--dry-run');
const remote = !process.argv.includes('--local');

function wranglerJson(args) {
  const stdout = execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  return JSON.parse(stdout);
}

function d1Json(sql) {
  const args = ['d1', 'execute', 'DB'];
  if (remote) {
    args.push('--remote');
  }
  args.push('--json', '--command', sql);
  return wranglerJson(args);
}

function d1ExecFile(filePath) {
  const args = ['d1', 'execute', 'DB'];
  if (remote) {
    args.push('--remote');
  }
  args.push('--file', filePath);
  execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit' });
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseJson(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

function readOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function readStringArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((entry) => readOptionalString(entry))
    .filter((entry) => entry != null);

  return items.length ? items : null;
}

function readObjectArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.filter((entry) => !!entry && typeof entry === 'object' && !Array.isArray(entry));
  return items.length ? items : null;
}

function normalizeUnitJson(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const fixedKeys = new Set([
    'locatorLabel',
    'locator_label',
    'readingMinutes',
    'reading_minutes',
    'readingSchema',
    'reading_schema',
    'readingBody',
    'reading_body',
    'readingBlocks',
    'reading_blocks',
  ]);

  const result = {};
  const locatorLabel = readOptionalString(source.locatorLabel) ?? readOptionalString(source.locator_label);
  const readingMinutes = readInteger(source.readingMinutes) ?? readInteger(source.reading_minutes);
  const readingSchema = readOptionalString(source.readingSchema) ?? readOptionalString(source.reading_schema);
  const readingBody = readStringArray(source.readingBody) ?? readStringArray(source.reading_body);
  const readingBlocks = readObjectArray(source.readingBlocks) ?? readObjectArray(source.reading_blocks);

  if (locatorLabel) {
    result.locatorLabel = locatorLabel;
  }
  if (readingMinutes != null) {
    result.readingMinutes = Math.max(0, readingMinutes);
  }
  if (readingSchema) {
    result.readingSchema = readingSchema;
  }
  if (readingBody) {
    result.readingBody = readingBody;
  }
  if (readingBlocks) {
    result.readingBlocks = readingBlocks;
  }

  for (const [key, entryValue] of Object.entries(source)) {
    if (fixedKeys.has(key)) {
      continue;
    }
    result[key] = entryValue;
  }

  return result;
}

function fetchRows() {
  const payload = d1Json(`
    SELECT id, unit_json
    FROM wv_source_units
    WHERE unit_json IS NOT NULL
      AND TRIM(unit_json) != ''
    ORDER BY id ASC
  `);

  return payload?.[0]?.results ?? [];
}

function findUpdates(rows) {
  return rows
    .map((row) => {
      const id = readOptionalString(row.id);
      if (!id) return null;

      const currentJson = typeof row.unit_json === 'string' ? row.unit_json : '';
      const normalized = normalizeUnitJson(parseJson(currentJson));
      const nextJson = Object.keys(normalized).length ? JSON.stringify(normalized) : null;
      const normalizedCurrentJson = Object.keys(parseJson(currentJson)).length ? JSON.stringify(parseJson(currentJson)) : null;

      if (nextJson === normalizedCurrentJson) {
        return null;
      }

      return { id, nextJson };
    })
    .filter((entry) => entry != null);
}

function writeSqlFile(updates) {
  const dir = mkdtempSync(join(tmpdir(), 'normalize-worldview-unit-json-'));
  const filePath = join(dir, 'updates.sql');
  const statements = [];

  for (const update of updates) {
    const valueSql = update.nextJson == null ? 'NULL' : sqlLiteral(update.nextJson);
    statements.push(
      `UPDATE wv_source_units SET unit_json = ${valueSql} WHERE id = ${sqlLiteral(update.id)};`,
    );
  }
  writeFileSync(filePath, `${statements.join('\n')}\n`, 'utf8');
  return { dir, filePath };
}

function verifyLegacyCount() {
  const payload = d1Json(`
    SELECT
      SUM(
        CASE
          WHEN unit_json LIKE '%"locator_label"%'
            OR unit_json LIKE '%"reading_minutes"%'
            OR unit_json LIKE '%"reading_schema"%'
            OR unit_json LIKE '%"reading_body"%'
            OR unit_json LIKE '%"reading_blocks"%'
          THEN 1
          ELSE 0
        END
      ) AS legacy_rows
    FROM wv_source_units
  `);

  return payload?.[0]?.results?.[0]?.legacy_rows ?? 0;
}

const rows = fetchRows();
const updates = findUpdates(rows);

console.log(`Scanned ${rows.length} worldview unit rows.`);
console.log(`Rows needing normalization: ${updates.length}.`);

if (!updates.length) {
  process.exit(0);
}

if (dryRun) {
  console.log(JSON.stringify(updates.slice(0, 10), null, 2));
  process.exit(0);
}

const { dir, filePath } = writeSqlFile(updates);

try {
  d1ExecFile(filePath);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const legacyRows = verifyLegacyCount();
console.log(`Legacy rows remaining: ${legacyRows}.`);

if (Number(legacyRows) !== 0) {
  process.exitCode = 1;
}
