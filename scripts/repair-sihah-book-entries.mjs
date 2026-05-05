#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/sihah-repair/', import.meta.url);
const STAGE_DB = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/al_jawhari_al_sihah/stage.sqlite', import.meta.url);
const SOURCE_SLUG = 'ketabonline_al_jawhari_al_sihah';
const SOURCE_ID = 'SRC:KETABONLINE:AL_SIHAH';
const BOOK_ID = '3011';
const SOURCE_URL = 'https://ketabonline.com/ar/books/3011';
const REPAIR_TAG = 'sihah_book_entry_rebuild_v1';
const ROOT_TAG = 'sihah_root_registry_backfill_v1';
const MAX_ENTRY_CHARS = 24000;
const FIRST_LEXICAL_PAGE = 51;
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
const DIACRITICS_RE = /[\u064B-\u065F\u0670]/g;
const DIACRITICS_ANY_RE = /[\u064B-\u065F\u0670]/;

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

function sqlite(query) {
  const out = execFileSync('sqlite3', ['-json', STAGE_DB.pathname, query], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });
  return JSON.parse(out || '[]');
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function stableId(prefix, ...parts) {
  const content = `${prefix}:${parts.map((part) => String(part)).join(':')}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 26);
}

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(DIACRITICS_RE, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
}

function normalizeMarker(value) {
  return normalizeArabic(value);
}

function rootCandidates(headingNorm) {
  const out = [];
  const h = normalizeArabic(headingNorm);
  if (!h) return out;
  out.push(h);
  if (h.length === 2) out.push(`${h}${h.at(-1)}`);
  if (h.length >= 3 && h.endsWith('ا')) out.push(`${h.slice(0, -1)}و`, `${h.slice(0, -1)}ي`, `${h.slice(0, -1)}ء`);
  if (h.length >= 3 && h.endsWith('ي')) out.push(`${h.slice(0, -1)}ى`);
  if (h.length >= 3 && h.endsWith('ه')) out.push(`${h.slice(0, -1)}ة`);
  return [...new Set(out.map(normalizeArabic).filter(Boolean))];
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
    // Historical encodings vary; raw normalization above is enough fallback.
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
  const roots = new Map();
  const sorted = [...rootRows].sort((a, b) => canonicalScore(b) - canonicalScore(a));
  for (const row of sorted) {
    for (const norm of candidateNorms(row)) {
      if (!roots.has(norm)) roots.set(norm, row.id);
    }
  }
  return roots;
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

function parseLocator(raw) {
  try {
    return JSON.parse(raw ?? '{}');
  } catch {
    return {};
  }
}

function cleanText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[\u200e\u200f\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markerIsEntry(raw) {
  const value = String(raw ?? '').trim();
  if (!value || /[0-9٠-٩۰-۹]/.test(value)) return false;
  if (DIACRITICS_ANY_RE.test(value)) return false;
  if (value.includes(':') || value.includes('/') || value.includes(' ')) return false;
  const norm = normalizeMarker(value);
  if (!norm || norm.length > 10) return false;
  return /^[\u0621-\u064A]+$/.test(norm);
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

function entryId(seq, headingNorm, pageNo, partNo) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${headingNorm}:p${String(pageNo).padStart(4, '0')}:part${String(partNo).padStart(2, '0')}`;
}

function rawId(stageId) {
  return `CHK:${SOURCE_SLUG}:raw:${String(stageId).replace(/^segment:/, '').replace(/^chunk:/, '')}`;
}

function rootIdFor(headingNorm, rootByNorm) {
  for (const candidate of rootCandidates(headingNorm)) {
    if (rootByNorm.has(candidate)) return rootByNorm.get(candidate);
  }
  return null;
}

function registryRootTextFor(headingNorm) {
  return normalizeArabic(headingNorm);
}

function ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) {
  const existing = rootIdFor(headingNorm, rootByNorm);
  if (existing) return existing;

  const rootText = registryRootTextFor(headingNorm);
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

mkdirSync(OUT_DIR, { recursive: true });

const rootRows = d1(`
  SELECT id, root_text, root_letters, root_type, weak_pattern,
         frequency_quran, buckwalter, simple_lat, root_normalized
  FROM ar_ling_roots
`);
const rootByNorm = buildRootMap(rootRows);
const knownIds = new Set(rootRows.map((row) => row.id));
const rootInserts = [];

const bodyRows = sqlite(`
  SELECT id, source_slug, book_id, page_no, part_no, segment_index,
         segment_type, heading, text_ar, locator_json
  FROM page_segments
  WHERE source_slug = '${SOURCE_SLUG}' AND segment_type = 'body'
  ORDER BY page_no, part_no, segment_index
`);

const footnoteRows = sqlite(`
  SELECT id, source_slug, book_id, page_no, part_no, segment_index,
         segment_type, footnote_no, heading, text_ar, locator_json
  FROM page_segments
  WHERE source_slug = '${SOURCE_SLUG}' AND segment_type = 'footnote'
  ORDER BY page_no, part_no, segment_index
`);

const lexicalTextParts = [];
const prefaceRows = [];

for (const row of bodyRows) {
  const text = cleanText(row.text_ar);
  if (!text) continue;
  if (row.page_no < FIRST_LEXICAL_PAGE) {
    prefaceRows.push(row);
    continue;
  }
  lexicalTextParts.push({
    row,
    page_no: row.page_no,
    start: 0,
    text,
  });
}

let corpus = '';
const pageSpans = [];
for (const part of lexicalTextParts) {
  const prefix = corpus ? '\n\n' : '';
  const start = corpus.length + prefix.length;
  corpus += `${prefix}${part.text}`;
  pageSpans.push({
    start,
    end: start + part.text.length,
    page_no: part.page_no,
    volume_no: part.row.part_no ?? null,
    row: part.row,
  });
}

function pageForIndex(index) {
  let last = pageSpans[0] ?? null;
  for (const span of pageSpans) {
    if (index >= span.start && index <= span.end) return span;
    if (span.start > index) return last;
    last = span;
  }
  return last;
}

const markers = [];
const markerRe = /(^|\n)\[([^\]\n]{1,40})\]/g;
let match;
while ((match = markerRe.exec(corpus)) !== null) {
  const raw = match[2].trim();
  if (!markerIsEntry(raw)) continue;
  const index = match.index + match[1].length;
  const page = pageForIndex(index);
  markers.push({
    index,
    raw,
    norm: normalizeMarker(raw),
    page_no: page?.page_no ?? null,
    volume_no: page?.volume_no ?? null,
    source_segment_id: page?.row?.id ?? null,
  });
}

const entries = [];
let seq = 1;
for (let i = 0; i < markers.length; i += 1) {
  const marker = markers[i];
  const next = markers[i + 1]?.index ?? corpus.length;
  const fullText = corpus.slice(marker.index, next).trim();
  if (fullText.length < 5) continue;
  const rootId = ensureRoot(marker.norm, rootByNorm, knownIds, rootInserts);
  const parts = splitEntryText(fullText);
  parts.forEach((part, partIndex) => {
    entries.push({
      id: entryId(seq, marker.norm, marker.page_no, partIndex + 1),
      source_id: SOURCE_ID,
      chunk_kind: 'lexical_entry',
      chunk_seq: seq,
      heading_norm: marker.norm,
      root_id: rootId,
      text_ar: part,
      page_no: marker.page_no,
      volume_no: marker.volume_no,
      tokens_approx: Math.max(1, Math.ceil(part.length / 5)),
      meta_json: JSON.stringify({
        repair: REPAIR_TAG,
        source_slug: SOURCE_SLUG,
        source_url: SOURCE_URL,
        locator: {
          source_slug: SOURCE_SLUG,
          book_id: BOOK_ID,
          page_no: marker.page_no,
          volume_no: marker.volume_no,
          entry_seq: seq,
          entry_part: partIndex + 1,
          entry_parts: parts.length,
          raw_heading: marker.raw,
          source_segment_id: marker.source_segment_id,
        },
      }),
    });
  });
  seq += 1;
}

function rawRowFromSegment(row, index, kind) {
  const locator = parseLocator(row.locator_json);
  return {
    id: rawId(row.id),
    source_id: SOURCE_ID,
    chunk_kind: kind,
    chunk_seq: index + 1,
    heading_norm: null,
    root_id: null,
    text_ar: cleanText(row.text_ar),
    page_no: row.page_no ?? null,
    volume_no: row.part_no ?? null,
    tokens_approx: Math.max(1, Math.ceil(cleanText(row.text_ar).length / 5)),
    meta_json: JSON.stringify({
      repair: REPAIR_TAG,
      source_slug: SOURCE_SLUG,
      source_url: SOURCE_URL,
      locator: {
        ...locator,
        source_slug: SOURCE_SLUG,
        source_stage_segment_id: row.id,
        source_heading: row.heading,
        raw_kind: kind,
      },
    }),
  };
}

const prefaceRawRows = prefaceRows
  .map((row, index) => rawRowFromSegment(row, index, 'sihah_source_preface_raw'))
  .filter((row) => row.text_ar);
const bodyRawRows = bodyRows
  .filter((row) => row.page_no >= FIRST_LEXICAL_PAGE)
  .map((row, index) => rawRowFromSegment(row, index, 'sihah_source_body_raw'))
  .filter((row) => row.text_ar);
const footnoteRawRows = footnoteRows
  .map((row, index) => rawRowFromSegment(row, index, 'sihah_entry_footnote_raw'))
  .filter((row) => row.text_ar && row.text_ar !== '.');

const lexicalDistinct = new Set(entries.map((entry) => entry.heading_norm));
const shortEntries = entries.filter((entry) => entry.text_ar.length < 30).length;
const badHeadings = entries.filter((entry) => !entry.heading_norm || /[A-Za-z0-9]/.test(entry.heading_norm) || entry.heading_norm.length > 10).length;

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  body_pages: bodyRows.length,
  lexical_markers: markers.length,
  lexical_entries: entries.length,
  distinct_headings: lexicalDistinct.size,
  root_inserts: rootInserts.length,
  preface_raw_rows: prefaceRawRows.length,
  body_raw_rows: bodyRawRows.length,
  footnote_raw_rows: footnoteRawRows.length,
  short_entries_under_30: shortEntries,
  bad_headings: badHeadings,
  missing_page_no: entries.filter((entry) => entry.page_no === null).length,
  max_entry_chars: Math.max(...entries.map((entry) => entry.text_ar.length)),
  preview: entries.slice(0, 30).map((entry) => ({
    seq: entry.chunk_seq,
    page_no: entry.page_no,
    heading_norm: entry.heading_norm,
    root_id: entry.root_id,
    chars: entry.text_ar.length,
    sample: entry.text_ar.slice(0, 160),
  })),
}, null, 2));

if (!entries.length || badHeadings || entries.some((entry) => entry.page_no === null)) {
  throw new Error('Refusing to apply: parser produced invalid lexical entries');
}

const statements = [];
statements.push(`INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, source_type, author_name, period_label, note_md)
  VALUES (${sql(SOURCE_ID)}, 'الصحاح', 'al-Sihah (al-Jawhari)',
          'lexicon', 'الجوهري', 'classical',
          'KetabOnline edition. Rebuilt into book lexical entries from bracketed headword markers.');`);

statements.push(`DELETE FROM ar_ling_source_chunks WHERE source_slug = ${sql(SOURCE_SLUG)};`);

for (const root of rootInserts) {
  statements.push(`INSERT OR IGNORE INTO ar_ling_roots
    (id, root_text, root_letters, root_type, weak_pattern, frequency_quran, frequency_hadith,
     meaning_core_en, meaning_core_ar, note_md, buckwalter, simple_lat, root_normalized)
    VALUES (${sql(root.id)}, ${sql(root.root_text)}, ${sql(root.root_letters)}, ${sql(root.root_type)},
            ${sql(root.weak_pattern)}, 0, 0, NULL, NULL,
            ${sql(`Backfilled from ${SOURCE_SLUG} lexical heading by ${ROOT_TAG}.`)},
            ${sql(root.buckwalter)}, ${sql(root.simple_lat)}, ${sql(root.root_normalized)});`);
}

function pushChunkInsert(row) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(row.id)}, ${sql(row.source_id)}, NULL, ${sql(row.chunk_kind)},
            ${row.chunk_seq}, ${sql(row.heading_norm)}, ${sql(row.text_ar)}, NULL,
            ${sql(row.page_no)}, ${sql(row.volume_no)}, ${row.tokens_approx}, 0, NULL,
            ${sql(row.meta_json)}, ${sql(row.root_id)}, ${sql(SOURCE_SLUG)});`);
}

for (const row of prefaceRawRows) pushChunkInsert(row);
for (const row of bodyRawRows) pushChunkInsert(row);
for (const row of footnoteRawRows) pushChunkInsert(row);
for (const row of entries) pushChunkInsert(row);

statements.push(`DELETE FROM ar_ling_roots
  WHERE note_md LIKE ${sql(`%${ROOT_TAG}%`)}
    AND NOT EXISTS (
      SELECT 1 FROM ar_ling_source_chunks
      WHERE ar_ling_source_chunks.root_id = ar_ling_roots.id
    );`);

statements.push('DELETE FROM ar_ling_roots_fts;');
statements.push(`INSERT INTO ar_ling_roots_fts
  (id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en)
  SELECT id, root_text, root_normalized, buckwalter, simple_lat, meaning_core_en
  FROM ar_ling_roots;`);

const sqlPath = join(OUT_DIR.pathname, 'repair-sihah-book-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
