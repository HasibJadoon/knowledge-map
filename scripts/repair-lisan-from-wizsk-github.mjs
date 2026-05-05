#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const SQLITE_DB = new URL('../temp/external/arabic_lexicons_db/db.sqlite', import.meta.url);
const OUT_DIR = new URL('../temp/lisan-github-repair/', import.meta.url);
const SOURCE_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab';
const SOURCE_ID = 'SRC:KETABONLINE:LISAN_AL_ARAB';
const REPAIR_TAG = 'lisan_wizsk_github_entry_rebuild_v1';
const ROOT_TAG = 'lisan_wizsk_root_registry_backfill_v1';
const MAX_ENTRY_CHARS = 20000;
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
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  );
}

function sqlite(query) {
  const out = execFileSync('sqlite3', ['-json', SQLITE_DB.pathname, query], {
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

function splitEntryText(fullText) {
  const chunks = [];
  let remaining = fullText.trim();
  while (remaining.length > MAX_ENTRY_CHARS) {
    let cut = remaining.lastIndexOf('\n\n', MAX_ENTRY_CHARS);
    if (cut < Math.floor(MAX_ENTRY_CHARS * 0.5)) cut = remaining.lastIndexOf('\n', MAX_ENTRY_CHARS);
    if (cut < Math.floor(MAX_ENTRY_CHARS * 0.5)) cut = MAX_ENTRY_CHARS;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function entryId(seq, headingNorm, githubId, partNo, partCount) {
  const suffix = partCount > 1 ? `:part:${String(partNo).padStart(2, '0')}` : '';
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${headingNorm}:wizsk:${githubId}${suffix}`;
}

mkdirSync(OUT_DIR, { recursive: true });

const existingLocators = d1(`
  SELECT heading_norm, MIN(page_no) page_no, MIN(volume_no) volume_no
  FROM ar_ling_source_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
    AND chunk_kind = 'lexical_entry'
    AND heading_norm IS NOT NULL
  GROUP BY heading_norm
`);
const locatorByHeading = new Map(existingLocators.map((row) => [
  normalizeArabic(row.heading_norm),
  { page_no: row.page_no ?? null, volume_no: row.volume_no ?? null },
]));

const rootRows = d1(`
  SELECT id, root_text, root_letters, root_type, weak_pattern,
         frequency_quran, buckwalter, simple_lat, root_normalized
  FROM ar_ling_roots
`);
const rootByNorm = buildRootMap(rootRows);
const knownIds = new Set(rootRows.map((row) => row.id));
const rootInserts = [];

const githubRows = sqlite(`
  SELECT id, word, meanings
  FROM lisanularab
  WHERE word IS NOT NULL AND trim(word) != ''
  ORDER BY id
`);

const entries = [];
const seenIds = new Set();
for (const row of githubRows) {
  const headingNorm = normalizeArabic(row.word);
  const text = cleanText(row.meanings);
  if (!headingNorm || !text) continue;
  const locator = locatorByHeading.get(headingNorm) ?? { page_no: null, volume_no: null };
  const groupSeq = row.id;
  const rootId = ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts);
  const parts = splitEntryText(text);
  parts.forEach((part, partIndex) => {
    const seq = entries.length + 1;
    const id = entryId(seq, headingNorm, row.id, partIndex + 1, parts.length);
    if (seenIds.has(id)) return;
    seenIds.add(id);
    entries.push({
      id,
      source_id: SOURCE_ID,
      chunk_kind: 'lexical_entry',
      chunk_seq: seq,
      heading_norm: headingNorm,
      root_id: rootId,
      text_ar: part,
      page_no: locator.page_no,
      volume_no: locator.volume_no,
      tokens_approx: Math.max(1, Math.ceil(part.length / 5)),
      meta_json: JSON.stringify({
        repair: REPAIR_TAG,
        source_slug: SOURCE_SLUG,
        upstream: {
          repo: 'https://github.com/wizsk/arabic_lexicons',
          sqlite_table: 'lisanularab',
          sqlite_id: row.id,
        },
        locator: {
          source_slug: SOURCE_SLUG,
          entry_group_seq: groupSeq,
          entry_part: partIndex + 1,
          entry_parts: parts.length,
          raw_heading: row.word,
          normalized_heading: headingNorm,
          page_no_source: locator.page_no === null ? 'unmatched_from_existing_d1_heading' : 'existing_d1_min_heading_page',
        },
      }),
    });
  });
}

const missingPage = entries.filter((entry) => entry.page_no === null).length;
const missingVolume = entries.filter((entry) => entry.volume_no === null).length;
const missingRoot = entries.filter((entry) => !entry.root_id).length;
const shortUnder20 = entries.filter((entry) => entry.text_ar.length < 20).length;

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  github_rows: githubRows.length,
  lexical_entries: entries.length,
  split_parts_extra: entries.length - githubRows.length,
  distinct_headings: new Set(entries.map((entry) => entry.heading_norm)).size,
  root_inserts: rootInserts.length,
  missing_root: missingRoot,
  missing_page_no: missingPage,
  missing_volume_no: missingVolume,
  short_under_20: shortUnder20,
  min_chars: Math.min(...entries.map((entry) => entry.text_ar.length)),
  max_chars: Math.max(...entries.map((entry) => entry.text_ar.length)),
  preview: entries.slice(0, 20).map((entry) => ({
    seq: entry.chunk_seq,
    heading_norm: entry.heading_norm,
    root_id: entry.root_id,
    page_no: entry.page_no,
    volume_no: entry.volume_no,
    chars: entry.text_ar.length,
    sample: entry.text_ar.slice(0, 100),
  })),
}, null, 2));

const statements = [];
statements.push(`DELETE FROM ar_ling_source_chunks
  WHERE source_slug = ${sql(SOURCE_SLUG)}
    AND json_extract(meta_json, '$.repair') = ${sql(REPAIR_TAG)};`);

statements.push(`UPDATE ar_ling_source_chunks
  SET chunk_kind = 'lisan_legacy_chunk_raw',
      heading_norm = NULL,
      root_id = NULL,
      is_embedded = 0,
      qdrant_id = NULL
  WHERE source_slug = ${sql(SOURCE_SLUG)}
    AND chunk_kind = 'lexical_entry';`);

for (const root of rootInserts) {
  statements.push(`INSERT OR IGNORE INTO ar_ling_roots
    (id, root_text, root_letters, root_type, weak_pattern, frequency_quran, frequency_hadith,
     meaning_core_en, meaning_core_ar, note_md, buckwalter, simple_lat, root_normalized)
    VALUES (${sql(root.id)}, ${sql(root.root_text)}, ${sql(root.root_letters)}, ${sql(root.root_type)},
            ${sql(root.weak_pattern)}, 0, 0, NULL, NULL,
            ${sql(`Backfilled from ${SOURCE_SLUG} GitHub Lisan heading by ${ROOT_TAG}.`)},
            ${sql(root.buckwalter)}, ${sql(root.simple_lat)}, ${sql(root.root_normalized)});`);
}

for (const entry of entries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(entry.id)}, ${sql(entry.source_id)}, NULL, 'lexical_entry',
            ${entry.chunk_seq}, ${sql(entry.heading_norm)}, ${sql(entry.text_ar)}, NULL,
            ${sql(entry.page_no)}, ${sql(entry.volume_no)}, ${entry.tokens_approx}, 0, NULL,
            ${sql(entry.meta_json)}, ${sql(entry.root_id)}, ${sql(SOURCE_SLUG)});`);
}

statements.push('DELETE FROM ar_ling_roots_fts;');
statements.push(`INSERT INTO ar_ling_roots_fts
  (id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en)
  SELECT id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en
  FROM ar_ling_roots;`);

const sqlPath = join(OUT_DIR.pathname, 'repair-lisan-from-wizsk-github.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
