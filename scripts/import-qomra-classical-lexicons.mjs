#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/qomra-classical-import/', import.meta.url);
const APPLY = process.argv.includes('--apply');
const ROOT_TAG = 'qomra_classical_root_registry_backfill_v1';
const IMPORT_TAG = 'qomra_m3ajem_classical_import_v1';

const DICTS = [
  {
    id: 4,
    name: 'القاموس المحيط',
    slug: 'qomra_al_qamus_al_muhit',
    sourceId: 'SRC:QOMRA:AL_QAMUS_AL_MUHIT',
    titleEn: 'Al-Qamus al-Muhit',
    author: 'الفيروزآبادي',
    period: 'classical',
    indexing: 'word_with_al',
    entryKind: 'lexical_word_entry',
    rootIndexed: false,
    note: 'Imported from qomra/m3ajem structured parquet. Qomra indexes this source by full word, often with the definite article; heading_norm is normalized as a lexical headword, not forced to a triliteral root.',
  },
  {
    id: 6,
    name: 'العباب الزاخر',
    slug: 'qomra_al_ubab_al_zakhir',
    sourceId: 'SRC:QOMRA:AL_UBAB_AL_ZAKHIR',
    titleEn: 'Al-Ubab al-Zakhir',
    author: 'الصاغاني',
    period: 'classical',
    indexing: 'root_simple',
    entryKind: 'lexical_entry',
    rootIndexed: true,
    note: 'Imported from qomra/m3ajem structured parquet. Root-indexed classical lexicon.',
  },
  {
    id: 7,
    name: 'المصباح المنير',
    slug: 'qomra_al_misbah_al_munir',
    sourceId: 'SRC:QOMRA:AL_MISBAH_AL_MUNIR',
    titleEn: 'Al-Misbah al-Munir',
    author: 'الفيومي',
    period: 'classical',
    indexing: 'root_spaced',
    entryKind: 'lexical_entry',
    rootIndexed: true,
    note: 'Imported from qomra/m3ajem structured parquet. Source roots are space-separated; heading_norm stores normalized compact root.',
  },
  {
    id: 8,
    name: 'جمهرة اللغة',
    slug: 'qomra_jamharat_al_lugha',
    sourceId: 'SRC:QOMRA:JAMHARAT_AL_LUGHA',
    titleEn: 'Jamharat al-Lugha',
    author: 'ابن دريد',
    period: 'classical',
    indexing: 'root_dashed',
    entryKind: 'lexical_entry',
    rootIndexed: true,
    note: 'Imported from qomra/m3ajem structured parquet. Source roots are dash-separated; heading_norm stores normalized compact root.',
  },
];

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
const PARQUET_DIR = new URL('../temp/external/qomra_m3ajem/assets/data/hf_dataset/', import.meta.url);

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
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  );
}

function loadRows(dictIds) {
  const code = `
import json
import pandas as pd
base = ${JSON.stringify(PARQUET_DIR.pathname)}
ids = set(${JSON.stringify(dictIds)})
df = pd.read_parquet(base + '/roots.parquet')
df = df[df['dictionary_id'].isin(ids)]
print(df[['id','dictionary_id','dictionary_name','dictionary_type','root','definition','first_word_position']].to_json(orient='records', force_ascii=False))
`;
  const out = execFileSync('python3', ['-c', code], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  });
  return JSON.parse(out || '[]');
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

function normalizeHeading(raw, dict) {
  let value = String(raw ?? '').trim();
  if (dict.indexing === 'root_dashed') value = value.replace(/\s*-\s*/g, '');
  if (dict.indexing === 'root_spaced') value = value.replace(/\s+/g, '');
  return normalizeArabic(value);
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
    // Existing registry has mixed encodings.
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

function rootCandidates(headingNorm) {
  const h = normalizeArabic(headingNorm);
  const out = [];
  if (!h) return out;
  out.push(h);
  if (h.length === 2) out.push(`${h}${h.at(-1)}`);
  if (h.endsWith('ا')) out.push(`${h.slice(0, -1)}و`, `${h.slice(0, -1)}ي`);
  if (h.endsWith('ي')) out.push(`${h.slice(0, -1)}ى`);
  if (h.endsWith('ه')) out.push(`${h.slice(0, -1)}ة`);
  return [...new Set(out.map(normalizeArabic).filter(Boolean))];
}

function ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) {
  for (const candidate of rootCandidates(headingNorm)) {
    if (rootByNorm.has(candidate)) return rootByNorm.get(candidate);
  }
  const rootText = normalizeArabic(headingNorm);
  if (!rootText) return null;
  const letters = Array.from(rootText);
  let id = stableId('root', rootText);
  let collision = 1;
  while (knownIds.has(id)) {
    id = stableId('root', rootText, collision);
    collision += 1;
  }
  const bw = arabicToBuckwalter(rootText);
  const insert = {
    id,
    root_text: rootText,
    root_letters: JSON.stringify(letters),
    root_type: rootTypeFor(letters),
    weak_pattern: detectWeak(letters),
    buckwalter: bw,
    simple_lat: bwToSimple(bw),
    root_normalized: rootText,
  };
  knownIds.add(id);
  rootByNorm.set(rootText, id);
  rootInserts.push(insert);
  return id;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/\|/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkId(dict, seq, headingNorm, upstreamId) {
  return `CHK:${dict.slug}:entry:${String(seq).padStart(5, '0')}:${headingNorm}:${upstreamId}`;
}

mkdirSync(OUT_DIR, { recursive: true });

const rootRows = d1(`
  SELECT id, root_text, root_letters, root_type, weak_pattern,
         frequency_quran, buckwalter, simple_lat, root_normalized
  FROM ar_ling_roots
`);
const rootByNorm = buildRootMap(rootRows);
const knownIds = new Set(rootRows.map((row) => row.id));
const rootInserts = [];

const rows = loadRows(DICTS.map((dict) => dict.id));
const dictById = new Map(DICTS.map((dict) => [dict.id, dict]));
const entries = [];
const counts = new Map();

for (const row of rows) {
  const dict = dictById.get(Number(row.dictionary_id));
  if (!dict) continue;
  const headingNorm = normalizeHeading(row.root, dict);
  const text = cleanText(row.definition);
  if (!headingNorm || !text) continue;
  const seq = (counts.get(dict.id) ?? 0) + 1;
  counts.set(dict.id, seq);
  entries.push({
    dict,
    id: chunkId(dict, seq, headingNorm, row.id),
    source_id: dict.sourceId,
    chunk_kind: dict.entryKind,
    chunk_seq: seq,
    heading_norm: headingNorm,
    root_id: dict.rootIndexed ? ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) : null,
    text_ar: text,
    tokens_approx: Math.max(1, Math.ceil(text.length / 5)),
    meta_json: JSON.stringify({
      repair: IMPORT_TAG,
      source_slug: dict.slug,
      source_url: 'https://github.com/qomra/m3ajem',
      upstream: {
        repo: 'https://github.com/qomra/m3ajem',
        dataset: 'mysamai/m3ajim',
        parquet: 'roots.parquet',
        root_id: row.id,
        dictionary_id: row.dictionary_id,
        dictionary_name: row.dictionary_name,
      },
      locator: {
        source_slug: dict.slug,
        entry_seq: seq,
        raw_heading: row.root,
        normalized_heading: headingNorm,
        indexing_pattern: dict.indexing,
        first_word_position: row.first_word_position,
      },
    }),
  });
}

const bySlug = {};
for (const entry of entries) {
  bySlug[entry.dict.slug] ??= {
    rows: 0,
    headings: new Set(),
    missing_root: 0,
    short_under20: 0,
    min_len: Infinity,
    max_len: 0,
  };
  const stat = bySlug[entry.dict.slug];
  stat.rows += 1;
  stat.headings.add(entry.heading_norm);
  if (!entry.root_id) stat.missing_root += 1;
  if (entry.text_ar.length < 20) stat.short_under20 += 1;
  stat.min_len = Math.min(stat.min_len, entry.text_ar.length);
  stat.max_len = Math.max(stat.max_len, entry.text_ar.length);
}

const report = Object.fromEntries(Object.entries(bySlug).map(([slug, stat]) => [slug, {
  ...stat,
  headings: stat.headings.size,
}]));

console.log(JSON.stringify({
  apply: APPLY,
  import_tag: IMPORT_TAG,
  dictionaries: DICTS.map((dict) => ({ slug: dict.slug, title_ar: dict.name, indexing: dict.indexing })),
  entries: entries.length,
  root_inserts: rootInserts.length,
  report,
  preview: entries.slice(0, 20).map((entry) => ({
    source_slug: entry.dict.slug,
    seq: entry.chunk_seq,
    heading_norm: entry.heading_norm,
    root_id: entry.root_id,
    chars: entry.text_ar.length,
    sample: entry.text_ar.slice(0, 100),
  })),
}, null, 2));

const statements = [];

for (const dict of DICTS) {
  statements.push(`INSERT INTO ar_ling_sources
    (id, title_ar, title_en, source_type, author_name, period_label, note_md)
    VALUES (${sql(dict.sourceId)}, ${sql(dict.name)}, ${sql(dict.titleEn)}, 'lexicon',
            ${sql(dict.author)}, ${sql(dict.period)}, ${sql(dict.note)})
    ON CONFLICT(id) DO UPDATE SET
      title_ar = excluded.title_ar,
      title_en = excluded.title_en,
      source_type = excluded.source_type,
      author_name = excluded.author_name,
      period_label = excluded.period_label,
      note_md = excluded.note_md;`);
  statements.push(`DELETE FROM ar_ling_source_chunks WHERE source_slug = ${sql(dict.slug)};`);
}

for (const root of rootInserts) {
  statements.push(`INSERT OR IGNORE INTO ar_ling_roots
    (id, root_text, root_letters, root_type, weak_pattern, frequency_quran, frequency_hadith,
     meaning_core_en, meaning_core_ar, note_md, buckwalter, simple_lat, root_normalized)
    VALUES (${sql(root.id)}, ${sql(root.root_text)}, ${sql(root.root_letters)}, ${sql(root.root_type)},
            ${sql(root.weak_pattern)}, 0, 0, NULL, NULL,
            ${sql(`Backfilled from qomra/m3ajem classical lexicon heading by ${ROOT_TAG}.`)},
            ${sql(root.buckwalter)}, ${sql(root.simple_lat)}, ${sql(root.root_normalized)});`);
}

for (const entry of entries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(entry.id)}, ${sql(entry.source_id)}, NULL, ${sql(entry.chunk_kind)},
            ${entry.chunk_seq}, ${sql(entry.heading_norm)}, ${sql(entry.text_ar)}, NULL,
            NULL, NULL, ${entry.tokens_approx}, 0, NULL,
            ${sql(entry.meta_json)}, ${sql(entry.root_id)}, ${sql(entry.dict.slug)});`);
}

statements.push('DELETE FROM ar_ling_roots_fts;');
statements.push(`INSERT INTO ar_ling_roots_fts
  (id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en)
  SELECT id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en
  FROM ar_ling_roots;`);

const sqlPath = join(OUT_DIR.pathname, 'import-qomra-classical-lexicons.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
