#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/taj-repair/', import.meta.url);
const STAGE_DB = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/al_zabidi_taj_al_arus/stage.sqlite', import.meta.url);
const SOURCE_SLUG = 'ketabonline_al_zabidi_taj_al_arus';
const SOURCE_ID = 'SRC:KETABONLINE:TAJ_AL_ARUS';
const BOOK_ID = '5502';
const SOURCE_URL = 'https://ketabonline.com/ar/books/5502';
const REPAIR_TAG = 'taj_book_entry_rebuild_v1';
const ROOT_TAG = 'taj_root_registry_backfill_v1';
const FIRST_LEXICAL_GLOBAL_PAGE = 126;
const MAX_ENTRY_CHARS = 24000;
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
const HAMZA_RE = /[ءأإآؤئ]/;
const DIACRITICS_RE = /[\u064B-\u065F\u0670]/g;
const STOP_HEADING_NORMS = new Set(['تعالي']);

function d1(command) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
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
  const out = execFileSync('sqlite3', ['-json', STAGE_DB.pathname, query], {
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

function rootCandidates(headingNorm) {
  const h = normalizeArabic(headingNorm);
  return h ? [h] : [];
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

function parseLocator(raw) {
  try {
    return JSON.parse(raw ?? '{}');
  } catch {
    return {};
  }
}

function printedPageFor(row) {
  const fromHeading = String(row.heading ?? '').match(/printed_page:(\d+)/);
  if (fromHeading) return Number(fromHeading[1]);
  const locator = parseLocator(row.locator_json);
  return Number(locator.printed_page ?? row.page_no ?? 0) || null;
}

function tokenIsRootAtom(token) {
  const len = normalizeArabic(token).length;
  return len === 1 || (len === 2 && HAMZA_RE.test(token));
}

function tokensAreRootLetters(value) {
  const tokens = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 6) return false;
  return tokens.every(tokenIsRootAtom) && tokens.some((token) => normalizeArabic(token).length === 1);
}

function markerCandidate(lines, i) {
  const raw = lines[i].text.trim();
  if (!raw) return null;

  let nextIndex = i + 1;
  while (nextIndex < lines.length && !lines[nextIndex].text.trim()) nextIndex += 1;
  const next = lines[nextIndex]?.text.trim() ?? '';

  let prevIndex = i - 1;
  while (prevIndex >= 0 && !lines[prevIndex].text.trim()) prevIndex -= 1;
  const prev = lines[prevIndex]?.text.trim() ?? '';

  const startsPunctuation = /^[\(\{\[]/.test(raw);
  const endsPunctuation = /[\)\}\]]$/.test(raw);
  const inner = raw.replace(/^[\(\{\[]+\s*/, '').replace(/\s*[\)\}\]]+$/, '').trim();
  if (!inner) return null;
  if (/[0-9٠-٩۰-۹]/.test(inner)) return null;
  if (/[-ـ,،؛.؟!]/.test(inner)) return null;
  if (!/^[\u0621-\u064A\u064B-\u065F\u0670 ]+$/.test(inner)) return null;

  const headingNorm = normalizeArabic(inner);
  if (headingNorm.length < 2 || headingNorm.length > 8) return null;
  if (STOP_HEADING_NORMS.has(headingNorm)) return null;

  const cleanRaw = raw === inner;
  const colonStyle = cleanRaw && !/\s/.test(inner) && (next === ':' || next.startsWith(':'));
  const spacedStyle = cleanRaw && tokensAreRootLetters(inner);
  const numberedRootStyle = startsPunctuation
    && tokensAreRootLetters(inner)
    && (endsPunctuation || next === ')')
    && (/^([0-9٣]+|[٠-٩]+)\s*-?$/.test(prev) || /^([0-9٣]+|[٠-٩]+)\s*-$/.test(prev) || next === ')');

  if (!colonStyle && !spacedStyle && !numberedRootStyle) return null;
  return {
    index: lines[i].start,
    raw,
    heading_norm: headingNorm,
    mode: colonStyle ? 'colon' : spacedStyle ? 'spaced_root' : 'numbered_root',
  };
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

function hasDefinitionText(fullText, markerRaw) {
  const tail = fullText
    .slice(String(markerRaw ?? '').length)
    .replace(/^[\s:\(\)\{\}\[\]!،؛.؟-]+/u, '');
  return normalizeArabic(tail).length >= 2;
}

function entryId(seq, headingNorm, volumeNo, pageNo, partNo) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${headingNorm}:v${String(volumeNo ?? 0).padStart(2, '0')}:p${String(pageNo ?? 0).padStart(4, '0')}:part${String(partNo).padStart(2, '0')}`;
}

function rootIdFor(headingNorm, rootByNorm) {
  for (const candidate of rootCandidates(headingNorm)) {
    if (rootByNorm.has(candidate)) return rootByNorm.get(candidate);
  }
  return null;
}

function ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) {
  const existing = rootIdFor(headingNorm, rootByNorm);
  if (existing) return existing;

  const rootText = normalizeArabic(headingNorm);
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

const lexicalRows = [];
const prefaceRows = [];
for (const row of bodyRows) {
  const text = cleanText(row.text_ar);
  if (!text) continue;
  if (row.page_no < FIRST_LEXICAL_GLOBAL_PAGE) {
    prefaceRows.push(row);
    continue;
  }
  lexicalRows.push({
    row,
    global_page_no: row.page_no,
    printed_page_no: printedPageFor(row),
    volume_no: row.part_no ?? null,
    text,
  });
}

let corpus = '';
const pageSpans = [];
for (const part of lexicalRows) {
  const prefix = corpus ? '\n\n' : '';
  const start = corpus.length + prefix.length;
  corpus += `${prefix}${part.text}`;
  pageSpans.push({
    start,
    end: start + part.text.length,
    global_page_no: part.global_page_no,
    printed_page_no: part.printed_page_no,
    volume_no: part.volume_no,
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

const lines = [];
let linePos = 0;
for (const part of corpus.split(/(\n)/)) {
  if (part === '\n') {
    linePos += 1;
    continue;
  }
  lines.push({ text: part, start: linePos, end: linePos + part.length });
  linePos += part.length;
}

const rawMarkers = [];
for (let i = 0; i < lines.length; i += 1) {
  const candidate = markerCandidate(lines, i);
  if (!candidate) continue;
  const page = pageForIndex(candidate.index);
  rawMarkers.push({
    ...candidate,
    page_no: page?.printed_page_no ?? null,
    volume_no: page?.volume_no ?? null,
    global_page_no: page?.global_page_no ?? null,
    source_segment_id: page?.row?.id ?? null,
  });
}

const markers = [];
for (let i = 0; i < rawMarkers.length; i += 1) {
  const marker = rawMarkers[i];
  const next = rawMarkers[i + 1];
  if (next && next.heading_norm === marker.heading_norm && next.index - marker.index < 40) {
    continue;
  }
  markers.push(marker);
}

const entries = [];
let seq = 1;
for (let i = 0; i < markers.length; i += 1) {
  const marker = markers[i];
  const next = markers[i + 1]?.index ?? corpus.length;
  const fullText = corpus.slice(marker.index, next).trim();
  if (fullText.length < 5) continue;
  if (!hasDefinitionText(fullText, marker.raw)) continue;
  const rootId = ensureRoot(marker.heading_norm, rootByNorm, knownIds, rootInserts);
  const parts = splitEntryText(fullText);
  parts.forEach((part, partIndex) => {
    entries.push({
      id: entryId(seq, marker.heading_norm, marker.volume_no, marker.page_no, partIndex + 1),
      source_id: SOURCE_ID,
      chunk_kind: 'lexical_entry',
      chunk_seq: seq,
      heading_norm: marker.heading_norm,
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
          global_page_no: marker.global_page_no,
          printed_page_no: marker.page_no,
          volume_no: marker.volume_no,
          entry_seq: seq,
          entry_part: partIndex + 1,
          entry_parts: parts.length,
          raw_heading: marker.raw,
          heading_mode: marker.mode,
          source_segment_id: marker.source_segment_id,
        },
      }),
    });
  });
  seq += 1;
}

const lexicalDistinct = new Set(entries.map((entry) => entry.heading_norm));
const shortEntries = entries.filter((entry) => entry.text_ar.length < 20).length;
const badHeadings = entries.filter((entry) => !entry.heading_norm || /[A-Za-z0-9]/.test(entry.heading_norm) || entry.heading_norm.length > 10).length;
const missingPageNo = entries.filter((entry) => entry.page_no === null || entry.page_no === undefined).length;
const missingVolumeNo = entries.filter((entry) => entry.volume_no === null || entry.volume_no === undefined).length;

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  body_pages: bodyRows.length,
  lexical_pages: lexicalRows.length,
  preface_pages: prefaceRows.length,
  raw_markers: rawMarkers.length,
  lexical_markers: markers.length,
  lexical_rows_after_splitting: entries.length,
  distinct_headings: lexicalDistinct.size,
  root_inserts: rootInserts.length,
  short_entries_under_20: shortEntries,
  bad_headings: badHeadings,
  missing_page_no: missingPageNo,
  missing_volume_no: missingVolumeNo,
  min_page_no: Math.min(...entries.map((entry) => entry.page_no).filter(Number.isFinite)),
  max_page_no: Math.max(...entries.map((entry) => entry.page_no).filter(Number.isFinite)),
  min_volume_no: Math.min(...entries.map((entry) => entry.volume_no).filter(Number.isFinite)),
  max_volume_no: Math.max(...entries.map((entry) => entry.volume_no).filter(Number.isFinite)),
  max_entry_chars: Math.max(...entries.map((entry) => entry.text_ar.length)),
  preview: [
    ...entries.slice(0, 20),
    ...entries.filter((entry) => [1000, 3000, 5000, 7000, 9000].includes(entry.chunk_seq)).slice(0, 10),
    ...entries.slice(-10),
  ].map((entry) => ({
    seq: entry.chunk_seq,
    volume_no: entry.volume_no,
    page_no: entry.page_no,
    heading_norm: entry.heading_norm,
    root_id: entry.root_id,
    chars: entry.text_ar.length,
    sample: entry.text_ar.slice(0, 180),
  })),
}, null, 2));

if (!entries.length || badHeadings || missingPageNo || missingVolumeNo) {
  throw new Error('Refusing to apply: parser produced invalid Taj lexical entries');
}

const statements = [];
statements.push(`INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, source_type, author_name, period_label, note_md)
  VALUES (${sql(SOURCE_ID)}, 'تاج العروس', 'Taj al-Arus (al-Zabidi)',
          'lexicon', 'الزبيدي', 'classical',
          'ketabonline book_id=5502. Commentary and expansion of al-Sihah.');`);

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

for (const row of entries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(row.id)}, ${sql(row.source_id)}, NULL, ${sql(row.chunk_kind)},
            ${row.chunk_seq}, ${sql(row.heading_norm)}, ${sql(row.text_ar)}, NULL,
            ${sql(row.page_no)}, ${sql(row.volume_no)}, ${row.tokens_approx}, 0, NULL,
            ${sql(row.meta_json)}, ${sql(row.root_id)}, ${sql(SOURCE_SLUG)});`);
}

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

const sqlPath = join(OUT_DIR.pathname, 'repair-taj-book-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
