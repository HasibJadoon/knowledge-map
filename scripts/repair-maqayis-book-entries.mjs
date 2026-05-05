#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/maqayis-repair/', import.meta.url);
const STAGE_DB = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/saaid/maqayis_al_lugha/stage.sqlite', import.meta.url);
const RAW_TEXT_DIR = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/saaid/maqayis_al_lugha/raw_text/', import.meta.url);
const SOURCE_SLUG = 'saaid_maqayis_al_lugha';
const SOURCE_ID = 'SRC:SAAID:MAQAYIS_AL_LUGHA';
const SOURCE_URL = 'https://saaid.org/book/2/479.zip';
const BOOK_ID = '479';
const REPAIR_TAG = 'maqayis_book_entry_rebuild_v1';
const ROOT_TAG = 'maqayis_root_registry_backfill_v1';
const MAX_ENTRY_CHARS = 24000;
const APPLY = process.argv.includes('--apply');
const FIRST_ENTRY_MARKER_BY_VOLUME = new Map([
  [1, '(أبّ)'],
  [2, '(حد)'],
  [3, '(زط)'],
  [4, '(عف)'],
  [5, '(قل)'],
  [6, '(هو)'],
]);

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
  const norm = normalizeArabic(value);
  if (norm.startsWith('وال') && norm.length > 5) return norm.slice(3);
  if (norm.startsWith('ال') && norm.length > 4) return norm.slice(2);
  return norm;
}

function rootCandidates(headingNorm) {
  const out = [];
  const h = normalizeArabic(headingNorm);
  if (!h) return out;
  out.push(h);
  if (h.length === 2) out.push(`${h}${h.at(-1)}`);
  if (h.endsWith('ا')) out.push(`${h.slice(0, -1)}و`, `${h.slice(0, -1)}ي`);
  if (h.endsWith('ي')) out.push(`${h.slice(0, -1)}ى`);
  if (h.endsWith('ه')) out.push(`${h.slice(0, -1)}ة`);
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

function volumeNoFromId(id) {
  const match = String(id).match(/volume_(\d+)/);
  return match ? Number(match[1]) : null;
}

function cleanBodyText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[\u200e\u200f\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\(([\u0621-\u064A\u064B-\u065F\u0670 ]{2,40})\n\([0-9٠-٩۰-۹]+\)\n\)/g, '($1)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeRawForPageScan(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[\u200e\u200f\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\(([\u0621-\u064A\u064B-\u065F\u0670 ]{2,40})\n\([0-9٠-٩۰-۹]+\)\n\)/g, '($1)');
}

function stripSectionNoise(text) {
  const lines = cleanBodyText(text).split('\n');
  return lines
    .filter((line) => {
      const value = line.trim();
      if (!value) return true;
      if (value === '[BODY]' || value === '') return false;
      if (/^HYPERLINK\b/i.test(value)) return false;
      if (/^https?:\/\//i.test(value)) return false;
      if (/^[-ـ\s]+$/.test(value)) return false;
      if (/^\(?باب\s+.{0,120}\)?$/.test(value)) return false;
      if (/^كتاب\s+.{1,30}$/.test(value)) return false;
      if (/^[\u0621-\u064A]{1,4}\s*[-–]\s*[\u0621-\u064A]{1,4}(?:\s*[-–]\s*[\u0621-\u064A]{1,4})*$/.test(value)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimToFirstLexicalEntry(text, volumeNo) {
  const marker = FIRST_ENTRY_MARKER_BY_VOLUME.get(volumeNo);
  if (!marker) return text;
  const index = text.indexOf(marker);
  if (index === -1) {
    throw new Error(`Could not find first lexical marker ${marker} in volume ${volumeNo}`);
  }
  return text.slice(index);
}

function markerIsEntry(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || /^باب\b/.test(trimmed) || /^كتاب\b/.test(trimmed)) return false;
  if (/[0-9٠-٩۰-۹]/.test(trimmed)) return false;
  const norm = normalizeMarker(trimmed);
  if (norm.length < 2 || norm.length > 8) return false;
  if (!/^[\u0621-\u064A]+$/.test(norm)) return false;
  if (['قال', 'قيل', 'وفي', 'فقال', 'قلت', 'وقد', 'اما'].includes(norm)) return false;
  return true;
}

function findMarkers(text) {
  const markers = [];
  const re = /(^|\n)\(([^\)\n]{1,50})\)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[2].trim();
    if (!markerIsEntry(raw)) continue;
    markers.push({
      index: match.index + match[1].length,
      raw,
      norm: normalizeMarker(raw),
    });
  }
  return markers;
}

function findMarkersWithPages(text) {
  const markers = [];
  const pageBreaks = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\f') pageBreaks.push(i);
  }

  function pageNoFor(index) {
    let pageNo = 1;
    for (const pageBreak of pageBreaks) {
      if (pageBreak >= index) break;
      pageNo += 1;
    }
    return pageNo;
  }

  const re = /\(([^\)\n\f]{1,50})\)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1].trim();
    if (!markerIsEntry(raw)) continue;
    const index = match.index + match[1].length;
    markers.push({
      index,
      page_no: pageNoFor(index),
      raw,
      norm: normalizeMarker(raw),
    });
  }
  return markers;
}

function pageMarkersForVolume(volumeNo) {
  const rawPath = join(RAW_TEXT_DIR.pathname, `volume_${String(volumeNo).padStart(2, '0')}.raw.txt`);
  const raw = normalizeRawForPageScan(readFileSync(rawPath, 'utf8'));
  const text = trimToFirstLexicalEntry(raw, volumeNo);
  return findMarkersWithPages(text);
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

function cleanEntryText(text) {
  return cleanBodyText(text)
    .replace(/\n?(?:ومن ذلك|ومن هذا|ومنه|ومنها)\s*$/u, '')
    .replace(/(?:[،,\.]\s*)?و\s*$/u, '')
    .trim();
}

function entryId(seq, headingNorm, volumeNo, partNo) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${headingNorm}:v${String(volumeNo).padStart(2, '0')}:p${String(partNo).padStart(2, '0')}`;
}

function rawId(stageId) {
  return `CHK:${SOURCE_SLUG}:raw:${String(stageId).replace(/^chunk:/, '')}`;
}

function rootIdFor(headingNorm, rootByNorm) {
  for (const candidate of rootCandidates(headingNorm)) {
    if (rootByNorm.has(candidate)) return rootByNorm.get(candidate);
  }
  return null;
}

function registryRootTextFor(headingNorm, rootByNorm) {
  for (const candidate of rootCandidates(headingNorm)) {
    if (rootByNorm.has(candidate)) return candidate;
  }
  return normalizeArabic(headingNorm);
}

function ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) {
  const existing = rootIdFor(headingNorm, rootByNorm);
  if (existing) return existing;

  const rootText = registryRootTextFor(headingNorm, rootByNorm);
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
  ORDER BY id
`);

const rawRows = sqlite(`
  SELECT id, source_slug, book_id, page_no, part_no, chunk_index,
         heading, text_ar, source_url, locator_json, token_count
  FROM clean_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
  ORDER BY id
`);

const entries = [];
const prefaces = [];
const pageMarkersByVolume = new Map(bodyRows.map((row) => {
  const volumeNo = volumeNoFromId(row.id);
  return [volumeNo, pageMarkersForVolume(volumeNo)];
}));
const pageMarkerMismatches = [];
const pageMarkerSkipped = [];
const pageMarkerCursorByVolume = new Map();

function takePageMarker(volumeNo, headingNorm) {
  const markers = pageMarkersByVolume.get(volumeNo) ?? [];
  const cursor = pageMarkerCursorByVolume.get(volumeNo) ?? 0;
  for (let i = cursor; i < markers.length; i += 1) {
    const candidate = markers[i];
    if (candidate.norm !== headingNorm) continue;
    if (i > cursor) {
      pageMarkerSkipped.push(...markers.slice(cursor, i).map((marker) => ({
        volume_no: volumeNo,
        raw_heading: marker.raw,
        heading_norm: marker.norm,
        page_no: marker.page_no,
      })));
    }
    pageMarkerCursorByVolume.set(volumeNo, i + 1);
    return candidate;
  }

  pageMarkerCursorByVolume.set(volumeNo, cursor);
  return null;
}

let seq = 1;

for (const row of bodyRows) {
  const volumeNo = volumeNoFromId(row.id);
  const text = stripSectionNoise(trimToFirstLexicalEntry(row.text_ar, volumeNo));
  const markers = findMarkers(text);
  if (!markers.length) {
    if (text) prefaces.push({ row, text, volumeNo });
    continue;
  }

  const preface = text.slice(0, markers[0].index).trim();
  if (preface.length > 80) prefaces.push({ row, text: preface, volumeNo });

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const next = markers[i + 1]?.index ?? text.length;
    const fullText = cleanEntryText(text.slice(marker.index, next));
    if (fullText.length < 8) continue;
    const headingNorm = marker.norm;
    const pageMarker = takePageMarker(volumeNo, headingNorm);
    if (!pageMarker || pageMarker.norm !== headingNorm) {
      pageMarkerMismatches.push({
        volume_no: volumeNo,
        marker_index: i + 1,
        heading_norm: headingNorm,
        page_marker_norm: pageMarker?.norm ?? null,
        page_marker_raw: pageMarker?.raw ?? null,
        page_no: pageMarker?.page_no ?? null,
      });
    }
    const rootId = ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts);
    const parts = splitEntryText(fullText);
    parts.forEach((part, partIndex) => {
      entries.push({
        id: entryId(seq, headingNorm, volumeNo, partIndex + 1),
        source_id: SOURCE_ID,
        chunk_kind: 'lexical_entry',
        chunk_seq: seq,
        heading_norm: headingNorm,
        root_id: rootId,
        text_ar: part,
        page_no: pageMarker?.page_no ?? null,
        volume_no: volumeNo,
        tokens_approx: Math.max(1, Math.ceil(part.length / 5)),
        meta_json: JSON.stringify({
          repair: REPAIR_TAG,
          source_slug: SOURCE_SLUG,
          source_url: SOURCE_URL,
          locator: {
            source_slug: SOURCE_SLUG,
            book_id: BOOK_ID,
            volume_no: volumeNo,
            entry_seq: seq,
            entry_part: partIndex + 1,
            entry_parts: parts.length,
            raw_heading: marker.raw,
            source_segment_id: row.id,
          },
        }),
      });
    });
    seq += 1;
  }
}

const rawChunkRows = rawRows.map((row, index) => {
  const locator = parseLocator(row.locator_json);
  const segmentType = locator.segment_type ?? (String(row.heading ?? '').includes('footnote') ? 'footnote' : 'body');
  const volumeNo = volumeNoFromId(row.id);
  const chunkKind = segmentType === 'footnote'
    ? 'maqayis_entry_footnote_raw'
    : 'maqayis_source_body_raw';
  const text = cleanBodyText(row.text_ar);
  return {
    id: rawId(row.id),
    source_id: SOURCE_ID,
    chunk_kind: chunkKind,
    chunk_seq: index + 1,
    heading_norm: null,
    root_id: null,
    text_ar: text,
    page_no: row.page_no ?? null,
    volume_no: volumeNo,
    tokens_approx: row.token_count ?? Math.max(1, Math.ceil(text.length / 5)),
    meta_json: JSON.stringify({
      repair: REPAIR_TAG,
      source_slug: SOURCE_SLUG,
      source_url: row.source_url ?? SOURCE_URL,
      locator: {
        ...locator,
        source_slug: SOURCE_SLUG,
        source_stage_chunk_id: row.id,
        source_heading: row.heading,
        raw_kind: chunkKind,
      },
    }),
  };
}).filter((row) => row.text_ar);

const prefaceRows = prefaces.map((item, index) => ({
  id: `CHK:${SOURCE_SLUG}:preface:${String(index + 1).padStart(3, '0')}:v${String(item.volumeNo).padStart(2, '0')}`,
  source_id: SOURCE_ID,
  chunk_kind: 'maqayis_source_preface_raw',
  chunk_seq: index + 1,
  heading_norm: null,
  root_id: null,
  text_ar: item.text,
  page_no: null,
  volume_no: item.volumeNo,
  tokens_approx: Math.max(1, Math.ceil(item.text.length / 5)),
  meta_json: JSON.stringify({
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    source_url: SOURCE_URL,
    locator: {
      source_slug: SOURCE_SLUG,
      book_id: BOOK_ID,
      volume_no: item.volumeNo,
      source_segment_id: item.row.id,
      raw_kind: 'maqayis_source_preface_raw',
    },
  }),
}));

const lexicalDistinct = new Set(entries.map((entry) => entry.heading_norm));
const shortEntries = entries.filter((entry) => entry.text_ar.length < 80).length;
const badHeadings = entries.filter((entry) => !entry.heading_norm || entry.heading_norm.length < 2 || /[A-Za-z0-9]/.test(entry.heading_norm)).length;
const entriesWithPageNo = entries.filter((entry) => entry.page_no !== null).length;

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  body_volumes: bodyRows.length,
  stage_raw_chunks: rawChunkRows.length,
  preface_rows: prefaceRows.length,
  lexical_entries: entries.length,
  distinct_headings: lexicalDistinct.size,
  root_inserts: rootInserts.length,
  entries_with_page_no: entriesWithPageNo,
  page_marker_mismatches: pageMarkerMismatches.length,
  page_marker_mismatch_preview: pageMarkerMismatches.slice(0, 20),
  page_marker_skipped: pageMarkerSkipped.length,
  page_marker_skipped_preview: pageMarkerSkipped.slice(0, 20),
  short_entries_under_80: shortEntries,
  bad_headings: badHeadings,
  max_entry_chars: Math.max(...entries.map((entry) => entry.text_ar.length)),
  preview: entries.slice(0, 25).map((entry) => ({
    seq: entry.chunk_seq,
    heading_norm: entry.heading_norm,
    root_id: entry.root_id,
    volume: entry.volume_no,
    chars: entry.text_ar.length,
    sample: entry.text_ar.slice(0, 120),
  })),
}, null, 2));

if (pageMarkerMismatches.length) {
  throw new Error(`Refusing to apply: ${pageMarkerMismatches.length} page marker mismatches`);
}

const statements = [];
statements.push(`INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, source_type, author_name, period_label, note_md)
  VALUES (${sql(SOURCE_ID)}, 'معجم مقاييس اللغة', 'Maqayis al-Lugha (Ibn Faris)',
          'lexicon', 'ابن فارس', 'classical',
          'saaid.net ZIP edition. Root-meaning lexicon: each entry traces a root/headword to a core semantic measure.');`);

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

for (const row of prefaceRows) pushChunkInsert(row);
for (const row of rawChunkRows) pushChunkInsert(row);
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

const sqlPath = join(OUT_DIR.pathname, 'repair-maqayis-book-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
