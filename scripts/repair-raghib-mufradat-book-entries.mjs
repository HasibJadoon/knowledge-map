#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/raghib-repair/', import.meta.url);
const STAGE_DB = new URL('../km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/mufradat_al_raghib/stage.sqlite', import.meta.url);
const SOURCE_SLUG = 'ketabonline_al_raghib_mufradat';
const SOURCE_ID = 'SRC:KETABONLINE:MUFRADAT';
const BOOK_ID = '3069';
const SOURCE_URL = 'https://ketabonline.com/ar/books/3069';
const REPAIR_TAG = 'raghib_book_entry_rebuild_v2';
const ROOT_TAG = 'raghib_root_registry_backfill_v1';
const LEXICON_START_GLOBAL_PAGE = 40;
const LEXICON_END_GLOBAL_PAGE = 878;
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
const DIACRITICS_RE = /[\u064B-\u065F\u0670]/g;
const PURE_FOOTNOTE_RE = /^\(\(\s*[\u0660-\u0669\d]+\s*\)\)$/;
const VERSE_REF_RE = /^\[[^\]]+\/\s*[\u0660-\u0669\d]/;
const FALSE_HEADING_NORMS = new Set([
  'قال', 'وقال', 'قوله', 'وقوله', 'قيل', 'وفي', 'في', 'فيه', 'وفيه',
  'الايه', 'اللسان', 'للراغب', 'تفسير', 'كتاب', 'باب',
  'ويبشرك', 'يوزعون', 'ويروي', 'استعديت', 'تعاظلت', 'تحريت',
  'الهمني', 'والله', 'النار', 'البيادل', 'مفعول', 'وكذلك',
  'ويقال', 'بالقين', 'صبرنا', 'كثير', 'سيصلون', 'فقال', 'كلمه',
]);

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
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${parts.map((part) => String(part)).join(':')}`)
    .digest('hex')
    .slice(0, 26);
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

function parsePrintedPage(heading, fallback) {
  const match = String(heading ?? '').match(/^printed_page:(\d+)$/);
  return match ? Number(match[1]) : fallback;
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
    // Legacy rows use several root_letters encodings.
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

function ensureRoot(headingNorm, rootByNorm, knownIds, rootInserts) {
  const rootText = normalizeArabic(headingNorm);
  if (!rootText) return null;
  if (rootByNorm.has(rootText)) return rootByNorm.get(rootText);

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

function cleanHeadingLine(line) {
  return String(line ?? '')
    .replace(/^[\s:：،؛.]+|[\s:：،؛.]+$/g, '')
    .trim();
}

function isSectionLine(line) {
  const t = cleanHeadingLine(line);
  return /^كتاب\s+/.test(t)
    || /^تمّ?\s+كتاب/.test(t)
    || /^بسم\s+الله/.test(t)
    || /^الفهارس\s+الفني/.test(t);
}

function isHeadingToken(line) {
  const t = cleanHeadingLine(line);
  const norm = normalizeArabic(t);
  if (!norm || FALSE_HEADING_NORMS.has(norm)) return false;
  if (norm === 'اي') return false;
  if (/[:：،؛,.]$/.test(String(line ?? '').trim())) return false;
  if (norm.length > 12) return false;
  if (/\s/.test(t) || /[\d\u0660-\u0669A-Za-z/[\](){}]/.test(t)) return false;
  if (!/^[\u0621-\u064A\u064B-\u065F\u0670\u0640]+$/.test(t)) return false;
  if (norm.startsWith('و') && norm !== 'واي') return false;
  if (/^(هذا|هذه|ذلك|تلك|ومن|اذا|كان|كانت|نحو|غير)$/.test(norm)) return false;
  return true;
}

function nextContentLine(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    const text = lines[i].text.trim();
    if (!text || PURE_FOOTNOTE_RE.test(text)) continue;
    return { index: i, text };
  }
  return null;
}

function previousContentLine(lines, start) {
  for (let i = start; i >= 0; i -= 1) {
    const text = lines[i].text.trim();
    if (!text || PURE_FOOTNOTE_RE.test(text)) continue;
    return text;
  }
  return '';
}

function looksLikeEntryStart(lines, index) {
  const line = lines[index].text.trim();
  if (!isHeadingToken(line)) return false;

  const norm = normalizeArabic(line);
  const next = nextContentLine(lines, index + 1);
  if (!next) return false;
  const n = next.text.trim();
  const prev = previousContentLine(lines, index - 1);

  if (VERSE_REF_RE.test(n)) return false;
  if (/^\(\(/.test(n)) return false;
  if (/^[،؛,.]/.test(n)) return false;
  if (/^(عزّ وجلّ|عليه السلام|رضي الله عنه)$/.test(n)) return false;
  if (/[:：]\s*$/.test(prev) && !/^كتاب\s+/.test(prev)) return false;
  if (norm.length === 1 && !/^[:：]/.test(n) && normalizeArabic(n).length < 3) return false;
  return true;
}

function entryId(seq, headingNorm, pageStart) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${headingNorm}:${pageStart}`;
}

function rawId(row, kind) {
  return `CHK:${SOURCE_SLUG}:${kind}:${row.id}`;
}

function rawMeta(row, kind) {
  return JSON.stringify({
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    source_url: row.source_url || SOURCE_URL,
    locator: {
      source_slug: SOURCE_SLUG,
      book_id: BOOK_ID,
      raw_chunk_id: row.id,
      global_page: row.page_no,
      printed_page: parsePrintedPage(row.heading, row.page_no),
      part_no: row.part_no,
      chunk_index: row.chunk_index,
      raw_heading: row.heading,
      chunk_kind: kind,
    },
  });
}

function lexicalMeta(entry) {
  return JSON.stringify({
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    source_url: entry.source_url || SOURCE_URL,
    locator: {
      source_slug: SOURCE_SLUG,
      book_id: BOOK_ID,
      page_start: entry.page_no,
      page_end: entry.page_end,
      global_page_start: entry.global_page_start,
      global_page_end: entry.global_page_end,
      volume_no: entry.volume_no,
      entry_seq: entry.chunk_seq,
      raw_heading: entry.heading_raw,
      original_ids: [...entry.original_ids],
    },
  });
}

function finishEntry(entries, current, rootByNorm, knownIds, rootInserts) {
  if (!current) return;
  const text = cleanText(current.lines.join('\n'));
  const body = cleanText(text.replace(current.heading_raw, ''));
  if (body.length < 8) return;

  while (text.length > MAX_ENTRY_CHARS) {
    const part = text.slice(0, MAX_ENTRY_CHARS);
    const seq = entries.length + 1;
    entries.push({
      ...current,
      id: entryId(seq, current.heading_norm, current.page_no),
      chunk_seq: seq,
      text_ar: part,
      tokens_approx: Math.max(1, Math.ceil(part.length / 5)),
      root_id: ensureRoot(current.heading_norm, rootByNorm, knownIds, rootInserts),
    });
    current.lines = [current.heading_raw, text.slice(MAX_ENTRY_CHARS)];
    current.heading_raw = `${current.heading_raw} ${entries.length + 1}`;
  }

  const seq = entries.length + 1;
  entries.push({
    ...current,
    id: entryId(seq, current.heading_norm, current.page_no),
    chunk_seq: seq,
    text_ar: text,
    tokens_approx: Math.max(1, Math.ceil(text.length / 5)),
    root_id: ensureRoot(current.heading_norm, rootByNorm, knownIds, rootInserts),
  });
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

const stageRows = sqlite(`
  SELECT id, raw_page_id, source_slug, book_id, page_no, part_no, chunk_index,
         heading, text_ar, source_url, locator_json
  FROM clean_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
  ORDER BY page_no, chunk_index, id
`);

const rawRows = [];
for (const row of stageRows) {
  const printedPage = parsePrintedPage(row.heading, row.page_no);
  const isFootnote = String(row.heading ?? '').startsWith('footnote:');
  const isLexiconBody = !isFootnote && row.page_no >= LEXICON_START_GLOBAL_PAGE && row.page_no <= LEXICON_END_GLOBAL_PAGE;
  const kind = isFootnote
    ? 'entry_footnote_raw'
    : isLexiconBody
      ? 'source_body_raw'
      : 'source_preface_raw';
  rawRows.push({
    id: rawId(row, kind),
    source_id: SOURCE_ID,
    chunk_kind: kind,
    chunk_seq: row.chunk_index,
    heading_norm: null,
    text_ar: cleanText(row.text_ar),
    page_no: printedPage,
    volume_no: row.part_no || 1,
    tokens_approx: Math.max(1, Math.ceil(String(row.text_ar ?? '').length / 5)),
    meta_json: rawMeta(row, kind),
  });
}

const lexicalLines = [];
for (const row of stageRows) {
  if (String(row.heading ?? '').startsWith('footnote:')) continue;
  if (row.page_no < LEXICON_START_GLOBAL_PAGE || row.page_no > LEXICON_END_GLOBAL_PAGE) continue;
  const printedPage = parsePrintedPage(row.heading, row.page_no);
  for (const text of cleanText(row.text_ar).split('\n')) {
    lexicalLines.push({
      text,
      row_id: row.id,
      global_page: row.page_no,
      page_no: printedPage,
      volume_no: row.part_no || 1,
      source_url: row.source_url || SOURCE_URL,
    });
  }
}

const entries = [];
let current = null;
for (let i = 0; i < lexicalLines.length; i += 1) {
  const item = lexicalLines[i];
  const line = item.text.trim();
  if (!line) {
    if (current) current.lines.push('');
    continue;
  }

  if (isSectionLine(line)) {
    finishEntry(entries, current, rootByNorm, knownIds, rootInserts);
    current = null;
    continue;
  }

  if (looksLikeEntryStart(lexicalLines, i)) {
    finishEntry(entries, current, rootByNorm, knownIds, rootInserts);
    const headingRaw = cleanHeadingLine(line);
    current = {
      source_id: SOURCE_ID,
      chunk_kind: 'lexical_entry',
      heading_raw: headingRaw,
      heading_norm: normalizeArabic(headingRaw),
      lines: [headingRaw],
      page_no: item.page_no,
      page_end: item.page_no,
      global_page_start: item.global_page,
      global_page_end: item.global_page,
      volume_no: item.volume_no,
      source_url: item.source_url,
      original_ids: new Set([item.row_id]),
    };
    continue;
  }

  if (!current) continue;
  current.lines.push(line);
  current.page_end = Math.max(current.page_end, item.page_no);
  current.global_page_end = Math.max(current.global_page_end, item.global_page);
  current.original_ids.add(item.row_id);
}
finishEntry(entries, current, rootByNorm, knownIds, rootInserts);

for (const entry of entries) {
  entry.meta_json = lexicalMeta(entry);
}

const status = {
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  raw_rows: rawRows.length,
  lexical_entries: entries.length,
  distinct_headings: new Set(entries.map((entry) => entry.heading_norm)).size,
  root_inserts: rootInserts.length,
  missing_root: entries.filter((entry) => !entry.root_id).length,
  too_short_under_20: entries.filter((entry) => entry.text_ar.trim().length < 20).length,
  bad_heading_shape: entries.filter((entry) => !entry.heading_norm || /[A-Za-z0-9]/.test(entry.heading_norm) || entry.heading_norm.length > 20).length,
  min_page: Math.min(...entries.map((entry) => entry.page_no)),
  max_page: Math.max(...entries.map((entry) => entry.page_no)),
  preview: entries.slice(0, 16).map((entry) => ({
    seq: entry.chunk_seq,
    heading_norm: entry.heading_norm,
    pages: `${entry.page_no}-${entry.page_end}`,
    chars: entry.text_ar.length,
  })),
};
console.log(JSON.stringify(status, null, 2));

const statements = [];
statements.push(`INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, source_type, author_name, period_label, note_md)
  VALUES (${sql(SOURCE_ID)}, 'مفردات ألفاظ القرآن', 'Mufradat Alfaz al-Quran',
          'lexicon', 'الراغب الأصفهاني', 'classical',
          'ketabonline book_id=3069. Rebuilt from staged clean book text.');`);
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

for (const row of rawRows) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(row.id)}, ${sql(row.source_id)}, NULL, ${sql(row.chunk_kind)},
            ${row.chunk_seq}, NULL, ${sql(row.text_ar)}, NULL,
            ${sql(row.page_no)}, ${sql(row.volume_no)}, ${row.tokens_approx}, 0, NULL,
            ${sql(row.meta_json)}, NULL, ${sql(SOURCE_SLUG)});`);
}

for (const row of entries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(row.id)}, ${sql(row.source_id)}, NULL, 'lexical_entry',
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

const sqlPath = join(OUT_DIR.pathname, 'repair-raghib-mufradat-book-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
