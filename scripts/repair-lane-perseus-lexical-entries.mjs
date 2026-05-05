#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/lane-repair/', import.meta.url);
const SOURCE_SLUG = 'lane_quranic_research_perseus';
const REPAIR_TAG = 'lane_perseus_entry_rollup_v2';
const ROOT_TAG = 'lane_root_registry_backfill_v1';
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
  if (!parsed[0]?.success) throw new Error(`D1 command failed: ${command}`);
  return parsed[0].results ?? [];
}

function d1File(filePath) {
  return execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--file', filePath],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
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

function sourceEntryNumber(sourceEntryId) {
  const match = String(sourceEntryId ?? '').match(/(?:^n|:)(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function isCrossRefOnly(text) {
  const value = String(text ?? '');
  const lower = value.toLowerCase();
  // Lane has many tiny Perseus entries whose only function is "see X".
  // Keep mixed definition + see-also snippets as lexical entries.
  return value.length < 80 && lower.includes('see ');
}

function stableId(prefix, ...parts) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${parts.map((part) => String(part)).join(':')}`)
    .digest('hex')
    .slice(0, 26);
}

function rootTypeFor(letters) {
  if (letters.length === 1) return 'particle_or_letter';
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
    // Historical rows use mixed encodings.
  }
  return [...new Set(out)];
}

function canonicalScore(row) {
  return (String(row.root_text ?? '').includes('-') ? 0 : 1000)
    + (row.root_normalized ? 100 : 0)
    + Number(row.frequency_quran ?? 0);
}

function buildRootMap(rootRows) {
  const roots = new Map();
  for (const row of [...rootRows].sort((a, b) => canonicalScore(b) - canonicalScore(a))) {
    for (const norm of candidateNorms(row)) {
      if (!roots.has(norm)) roots.set(norm, row.id);
    }
  }
  return roots;
}

function ensureRoot(rootText, rootByNorm, knownIds, rootInserts) {
  const h = normalizeArabic(rootText);
  if (!h) return null;
  if (rootByNorm.has(h)) return rootByNorm.get(h);

  const letters = Array.from(h);
  let id = stableId('root', h);
  let collision = 1;
  while (knownIds.has(id)) {
    id = stableId('root', h, collision);
    collision += 1;
  }

  const bw = arabicToBuckwalter(h);
  const insert = {
    id,
    root_text: h,
    root_letters: JSON.stringify(letters),
    root_type: rootTypeFor(letters),
    weak_pattern: detectWeak(letters),
    buckwalter: bw,
    simple_lat: bwToSimple(bw),
    root_normalized: h,
  };
  knownIds.add(id);
  rootByNorm.set(h, id);
  rootInserts.push(insert);
  return id;
}

function volumeFromUrn(urn, fallback) {
  const match = String(urn ?? '').match(/\.0*(\d+)$/);
  return match ? Number(match[1]) : fallback;
}

mkdirSync(OUT_DIR, { recursive: true });

const rows = d1(`
  SELECT id, source_id, edition_id, text_ar, text_en, page_no, volume_no,
         tokens_approx, meta_json, source_slug
  FROM ar_ling_source_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
    AND id LIKE 'CHK:${SOURCE_SLUG}:chunk:%'
`);

const rootRows = d1(`
  SELECT id, root_text, root_letters, root_type, weak_pattern,
         frequency_quran, buckwalter, simple_lat, root_normalized
  FROM ar_ling_roots
`);
const rootByNorm = buildRootMap(rootRows);
const knownIds = new Set(rootRows.map((row) => row.id));
const rootInserts = [];

function sourcePartNumber(row) {
  const tail = String(row.id).split(':').at(-1);
  return /^\d+$/.test(tail) ? Number(tail) : 1;
}

function entryId(seq, sourceEntryId) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${stableId('lane-entry', sourceEntryId)}`;
}

function cleanEntryText(parts) {
  return parts
    .map((part) => String(part ?? '').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isValidEntryHeading(value) {
  const heading = String(value ?? '');
  return heading.length > 0 && heading.length <= 20 && !/[A-Za-z0-9]/.test(heading);
}

const sourceRows = rows.map((row) => {
  const meta = parseMeta(row.meta_json);
  const locator = meta.locator ?? {};
  const sourceEntryId = locator.source_entry_id ?? null;
  const hasPerseusEntry = Boolean(sourceEntryId);
  const root = normalizeArabic(locator.normalized_arabic_root ?? locator.arabic_root);
  const headword = locator.headword ?? locator.normalized_headword ?? null;
  const rawKind = hasPerseusEntry ? 'lane_perseus_entry_source_raw' : 'lane_legacy_root_chunk_raw';
  const updatedMeta = {
    ...meta,
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    locator: {
      ...locator,
      source_slug: SOURCE_SLUG,
      raw_kind: rawKind,
      normalized_arabic_root: root || (locator.normalized_arabic_root ?? null),
    },
  };
  return {
    ...row,
    sourceEntryId,
    entryNo: sourceEntryNumber(sourceEntryId),
    perseusUrn: locator.perseus_urn ?? '',
    hasPerseusEntry,
    rawKind,
    sourcePartNo: sourcePartNumber(row),
    headingNorm: root || null,
    pageNo: hasPerseusEntry ? sourceEntryNumber(sourceEntryId) : row.page_no,
    volumeNo: hasPerseusEntry ? volumeFromUrn(locator.perseus_urn, row.volume_no) : row.volume_no,
    headword,
    metaJson: JSON.stringify(updatedMeta),
  };
});

const sourceSeqRows = [...sourceRows].sort((a, b) => a.perseusUrn.localeCompare(b.perseusUrn)
  || a.entryNo - b.entryNo
  || a.sourcePartNo - b.sourcePartNo
  || a.id.localeCompare(b.id));
const sourceSeqById = new Map();
sourceSeqRows.forEach((row, index) => sourceSeqById.set(row.id, index + 1));

const grouped = new Map();
for (const row of sourceRows.filter((item) => item.hasPerseusEntry)) {
  if (!grouped.has(row.sourceEntryId)) grouped.set(row.sourceEntryId, []);
  grouped.get(row.sourceEntryId).push(row);
}

const groupedEntries = [...grouped.entries()].map(([sourceEntryId, group]) => {
  const sorted = group.sort((a, b) => a.sourcePartNo - b.sourcePartNo || a.id.localeCompare(b.id));
  const first = sorted[0];
  const text = cleanEntryText(sorted.map((row) => row.text_ar));
  if (!isValidEntryHeading(first.headingNorm)) return null;
  const chunkKind = isCrossRefOnly(text) ? 'lexical_crossref' : 'lexical_entry';
  const rootId = ensureRoot(first.headingNorm, rootByNorm, knownIds, rootInserts);
  return {
    sourceEntryId,
    source_id: first.source_id,
    edition_id: first.edition_id,
    chunk_kind: chunkKind,
    heading_norm: first.headingNorm,
    root_id: rootId,
    text_ar: text,
    text_en: null,
    page_no: first.pageNo === Number.MAX_SAFE_INTEGER ? null : first.pageNo,
    volume_no: first.volumeNo,
    tokens_approx: Math.max(1, Math.ceil(text.length / 5)),
    perseusUrn: first.perseusUrn,
    entryNo: first.entryNo,
    headword: first.headword,
    source_chunk_ids: sorted.map((row) => row.id),
  };
}).filter(Boolean).sort((a, b) => a.perseusUrn.localeCompare(b.perseusUrn)
  || a.entryNo - b.entryNo
  || String(a.sourceEntryId).localeCompare(String(b.sourceEntryId)));

groupedEntries.forEach((entry, index) => {
  entry.chunk_seq = index + 1;
  entry.id = entryId(entry.chunk_seq, entry.sourceEntryId);
  entry.meta_json = JSON.stringify({
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    locator: {
      source_slug: SOURCE_SLUG,
      source_entry_id: entry.sourceEntryId,
      perseus_urn: entry.perseusUrn,
      entry_kind: entry.chunk_kind,
      entry_seq: entry.chunk_seq,
      source_chunk_count: entry.source_chunk_ids.length,
      source_chunk_ids: entry.source_chunk_ids,
      headword: entry.headword,
      normalized_arabic_root: entry.heading_norm,
    },
  });
});

const counts = groupedEntries.reduce((acc, row) => {
  acc[row.chunk_kind] = (acc[row.chunk_kind] ?? 0) + 1;
  return acc;
}, {});

const rawCounts = sourceRows.reduce((acc, row) => {
  acc[row.rawKind] = (acc[row.rawKind] ?? 0) + 1;
  return acc;
}, {});

const lexicalMissingRoot = groupedEntries.filter((row) => row.chunk_kind === 'lexical_entry' && !row.root_id).length;
const preview = groupedEntries
  .filter((row) => row.chunk_kind === 'lexical_entry')
  .slice(0, 12)
  .map((row) => ({
    seq: row.chunk_seq,
    heading_norm: row.heading_norm,
    root_id: row.root_id,
    headword: row.headword,
    chars: row.text_ar.length,
    sample: row.text_ar.slice(0, 80),
  }));

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  raw_rows: rows.length,
  raw_counts: rawCounts,
  counts,
  root_inserts: rootInserts.length,
  lexical_missing_root: lexicalMissingRoot,
  short_lexical_entries_under_20: groupedEntries.filter((row) => row.chunk_kind === 'lexical_entry' && row.text_ar.trim().length < 20).length,
  preview,
}, null, 2));

const statements = [];
for (const root of rootInserts) {
  statements.push(`INSERT OR IGNORE INTO ar_ling_roots
    (id, root_text, root_letters, root_type, weak_pattern, frequency_quran, frequency_hadith,
     meaning_core_en, meaning_core_ar, note_md, buckwalter, simple_lat, root_normalized)
    VALUES (${sql(root.id)}, ${sql(root.root_text)}, ${sql(root.root_letters)}, ${sql(root.root_type)},
            ${sql(root.weak_pattern)}, 0, 0, NULL, NULL,
            ${sql(`Backfilled from ${SOURCE_SLUG} lexical root by ${ROOT_TAG}.`)},
            ${sql(root.buckwalter)}, ${sql(root.simple_lat)}, ${sql(root.root_normalized)});`);
}

statements.push(`DELETE FROM ar_ling_source_chunks
  WHERE source_slug = ${sql(SOURCE_SLUG)}
    AND id LIKE ${sql(`CHK:${SOURCE_SLUG}:book_entry:%`)};`);

for (const row of sourceRows) {
  statements.push(`UPDATE ar_ling_source_chunks
    SET chunk_kind = ${sql(row.rawKind)},
        chunk_seq = ${sourceSeqById.get(row.id) ?? 0},
        heading_norm = NULL,
        root_id = NULL,
        page_no = ${sql(row.pageNo === Number.MAX_SAFE_INTEGER ? null : row.pageNo)},
        volume_no = ${sql(row.volumeNo)},
        is_embedded = 0,
        qdrant_id = NULL,
        meta_json = ${sql(row.metaJson)}
    WHERE id = ${sql(row.id)};`);
}

for (const row of groupedEntries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(row.id)}, ${sql(row.source_id)}, ${sql(row.edition_id)}, ${sql(row.chunk_kind)},
            ${row.chunk_seq}, ${sql(row.heading_norm)}, ${sql(row.text_ar)}, ${sql(row.text_en)},
            ${sql(row.page_no)}, ${sql(row.volume_no)}, ${row.tokens_approx}, 0, NULL,
            ${sql(row.meta_json)}, ${sql(row.root_id)}, ${sql(SOURCE_SLUG)});`);
}

statements.push('DELETE FROM ar_ling_roots_fts;');
statements.push(`INSERT INTO ar_ling_roots_fts
  (id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en)
  SELECT id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en
  FROM ar_ling_roots;`);

const sqlPath = join(OUT_DIR.pathname, 'repair-lane-perseus-lexical-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
