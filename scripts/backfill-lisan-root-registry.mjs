#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/lisan-root-backfill/', import.meta.url);
const SOURCE_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab';
const BACKFILL_TAG = 'lisan_root_registry_backfill_v1';
const APPLY = process.argv.includes('--apply');

const AR_TO_BW = {
  'ء': "'", 'آ': '|', 'أ': '>', 'ؤ': '&', 'إ': '<', 'ئ': '}', 'ا': 'A',
  'ب': 'b', 'ة': 'p', 'ت': 't', 'ث': 'v', 'ج': 'j', 'ح': 'H', 'خ': 'x',
  'د': 'd', 'ذ': '*', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': '$', 'ص': 'S',
  'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'E', 'غ': 'g', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ى': 'Y',
  'ي': 'y',
};

const BW_TO_SIMPLE = {
  A: 'a', "'": 'a', '|': 'a', '>': 'a', '<': 'a', '&': 'w', '}': 'y',
  b: 'b', p: 'h', t: 't', v: 'th', j: 'j', H: 'h', x: 'kh',
  d: 'd', '*': 'dh', r: 'r', z: 'z', s: 's', $: 'sh',
  S: 's', D: 'd', T: 't', Z: 'z', E: '', g: 'gh',
  f: 'f', q: 'q', k: 'k', l: 'l', m: 'm', n: 'n',
  h: 'h', w: 'w', Y: 'a', y: 'y',
};

const HAMZAS = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ', 'آ']);

function d1(command) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 },
  );
  const parsed = JSON.parse(out);
  for (const result of parsed) {
    if (!result.success) throw new Error(`D1 command failed: ${command}`);
  }
  return parsed.at(-1)?.results ?? [];
}

function d1File(filePath) {
  return execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--file', filePath],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 },
  );
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
}

function stableId(prefix, ...parts) {
  const content = `${prefix}:${parts.map((part) => String(part)).join(':')}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 26);
}

function rootTextFor(headingNorm) {
  return normalizeArabic(headingNorm);
}

function rootTypeFor(letters) {
  if (letters.length === 2) return 'biliteral';
  if (letters.length === 3) return 'trilateral';
  if (letters.length === 4) return 'quadrilateral';
  if (letters.length === 5) return 'quinqueliteral';
  return 'lexical_headword';
}

function detectWeak(letters) {
  if (letters.length < 3) return null;
  if (letters[1] === letters[2]) return 'mudha_af';
  if (letters.length >= 4 && letters[1] === letters[3]) return 'mudha_af';
  if (HAMZAS.has(letters[0])) return 'mahmuz_fa';
  if (HAMZAS.has(letters[1])) return 'mahmuz_ain';
  if (HAMZAS.has(letters[2])) return 'mahmuz_lam';
  if (letters[0] === 'و') return 'mithal_waw';
  if (letters[0] === 'ي') return 'mithal_ya';
  if (letters[1] === 'و') return 'ajwaf_waw';
  if (letters[1] === 'ي') return 'ajwaf_ya';
  if (letters[2] === 'و') return 'naqis_waw';
  if (letters[2] === 'ي') return 'naqis_ya';
  return 'sound';
}

function arabicToBuckwalter(value) {
  return Array.from(value).map((char) => AR_TO_BW[char] ?? char).join('');
}

function bwToSimple(value) {
  return Array.from(value).map((char) => BW_TO_SIMPLE[char] ?? char.toLowerCase()).join('');
}

function candidateNorms(row) {
  const out = [];
  for (const value of [row.root_normalized, row.root_text, row.root_letters]) {
    const norm = normalizeArabic(value);
    if (norm) out.push(norm);
  }
  try {
    const parsed = JSON.parse(row.root_letters ?? 'null');
    if (Array.isArray(parsed)) {
      const norm = normalizeArabic(parsed.join(''));
      if (norm) out.push(norm);
    }
  } catch {
    // root_letters has had multiple historical encodings; normalize the raw value above.
  }
  return [...new Set(out)];
}

function canonicalScore(row) {
  const rootText = String(row.root_text ?? '');
  return (rootText && !rootText.includes('-') ? 1000 : 0)
    + (row.root_normalized ? 100 : 0)
    + Number(row.frequency_quran ?? 0);
}

function buildRootMap(rootRows) {
  const sorted = [...rootRows].sort((a, b) => canonicalScore(b) - canonicalScore(a));
  const roots = new Map();
  for (const row of sorted) {
    for (const norm of candidateNorms(row)) {
      if (!roots.has(norm)) roots.set(norm, row.id);
    }
  }
  return roots;
}

mkdirSync(OUT_DIR, { recursive: true });

const targetRows = d1(`
  SELECT c.heading_norm,
         COUNT(*) AS chunk_rows,
         MIN(c.page_no) AS first_page,
         MAX(c.page_no) AS last_page
  FROM ar_ling_source_chunks c
  LEFT JOIN ar_ling_roots r ON r.id = c.root_id
  WHERE c.source_slug = ${sql(SOURCE_SLUG)}
    AND c.chunk_kind = 'lexical_entry'
    AND c.heading_norm IS NOT NULL
    AND trim(c.heading_norm) != ''
    AND (
      c.root_id IS NULL
      OR trim(c.root_id) = ''
      OR r.id IS NULL
    )
  GROUP BY c.heading_norm
  ORDER BY length(c.heading_norm), c.heading_norm
`);

const rootRows = d1(`
  SELECT id, root_text, root_letters, root_type, weak_pattern,
         frequency_quran, buckwalter, simple_lat, root_normalized
  FROM ar_ling_roots
`);

const rootByNorm = buildRootMap(rootRows);
const knownIds = new Set(rootRows.map((row) => row.id));
const planned = [];
const skipped = [];

for (const row of targetRows) {
  const rootText = rootTextFor(row.heading_norm);
  const letters = Array.from(rootText);
  if (!rootText || letters.length < 2 || letters.length > 5) {
    skipped.push({ ...row, reason: 'unexpected_heading_shape' });
    continue;
  }

  const existingRootId = rootByNorm.get(rootText);
  let id = existingRootId;
  let insert = false;
  if (!id) {
    id = stableId('root', rootText);
    let collision = 1;
    while (knownIds.has(id)) {
      id = stableId('root', rootText, collision);
      collision += 1;
    }
    knownIds.add(id);
    rootByNorm.set(rootText, id);
    insert = true;
  }

  const bw = arabicToBuckwalter(rootText);
  planned.push({
    ...row,
    id,
    insert,
    root_text: rootText,
    root_letters: JSON.stringify(letters),
    root_type: rootTypeFor(letters),
    weak_pattern: detectWeak(letters),
    buckwalter: bw,
    simple_lat: bwToSimple(bw),
    root_normalized: rootText,
  });
}

const byType = planned.reduce((acc, row) => {
  const key = row.insert ? row.root_type : 'matched_existing';
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  target_headings: targetRows.length,
  planned_updates: planned.length,
  planned_new_roots: planned.filter((row) => row.insert).length,
  skipped: skipped.length,
  byType,
  preview: planned.slice(0, 25).map((row) => ({
    heading_norm: row.heading_norm,
    id: row.id,
    insert: row.insert,
    root_type: row.root_type,
    rows: row.chunk_rows,
    pages: `${row.first_page}-${row.last_page}`,
  })),
}, null, 2));

const statements = [];
for (const row of planned.filter((item) => item.insert)) {
  statements.push(`INSERT OR IGNORE INTO ar_ling_roots
    (id, root_text, root_letters, root_type, weak_pattern, frequency_quran, frequency_hadith,
     meaning_core_en, meaning_core_ar, note_md, buckwalter, simple_lat, root_normalized)
    VALUES (${sql(row.id)}, ${sql(row.root_text)}, ${sql(row.root_letters)}, ${sql(row.root_type)},
            ${sql(row.weak_pattern)}, 0, 0, NULL, NULL,
            ${sql(`Backfilled from ${SOURCE_SLUG} lexical heading by ${BACKFILL_TAG}.`)},
            ${sql(row.buckwalter)}, ${sql(row.simple_lat)}, ${sql(row.root_normalized)});`);
}

for (const row of planned) {
  statements.push(`UPDATE ar_ling_source_chunks
    SET root_id = ${sql(row.id)},
        is_embedded = 0,
        qdrant_id = NULL
    WHERE source_slug = ${sql(SOURCE_SLUG)}
      AND chunk_kind = 'lexical_entry'
      AND heading_norm = ${sql(row.heading_norm)}
      AND (
        root_id IS NULL
        OR trim(root_id) = ''
        OR NOT EXISTS (SELECT 1 FROM ar_ling_roots r WHERE r.id = ar_ling_source_chunks.root_id)
      );`);
}

statements.push('DELETE FROM ar_ling_roots_fts;');
statements.push(`INSERT INTO ar_ling_roots_fts
  (id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en)
  SELECT id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en
  FROM ar_ling_roots;`);

const sqlPath = join(OUT_DIR.pathname, 'backfill-lisan-root-registry.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
