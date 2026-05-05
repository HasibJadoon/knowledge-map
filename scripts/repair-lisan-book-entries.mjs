#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/lisan-repair/', import.meta.url);
const SOURCE_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab';
const REPAIR_TAG = 'lisan_book_entry_rebuild_v1';
const LEXICON_START_PAGE = 23;
const MAX_ENTRY_CHARS = 24000;
const APPLY = process.argv.includes('--apply');

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
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 128 },
  );
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
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

function parseMeta(metaJson) {
  try {
    return JSON.parse(metaJson ?? '{}');
  } catch {
    return {};
  }
}

function locator(row) {
  return parseMeta(row.meta_json).locator ?? {};
}

function splitOrdinal(id) {
  const tail = String(id).split(':').at(-1);
  return /^\d+$/.test(tail) ? Number(tail) : 0;
}

function rootIdFor(headingNorm, roots) {
  const h = normalizeArabic(headingNorm);
  if (!h) return null;
  const candidates = [h];
  if (h.length === 2) candidates.push(`${h}${h.at(-1)}`);
  if (h.endsWith('ا')) candidates.push(`${h.slice(0, -1)}و`, `${h.slice(0, -1)}ي`);
  if (h.endsWith('ي')) candidates.push(`${h.slice(0, -1)}ى`);
  if (h.endsWith('ه')) candidates.push(`${h.slice(0, -1)}ة`);
  for (const candidate of candidates) {
    if (roots.has(candidate)) return roots.get(candidate);
  }
  return null;
}

const falseMarkers = new Set([
  'قال', 'وقال', 'قيل', 'وقيل', 'قلت', 'وقلت',
  'في', 'وفي', 'من', 'ومن', 'عن', 'وعن',
  'قوله', 'وقوله', 'تعالي', 'الله', 'النبي',
  'الحديث', 'وفيالحديث', 'وفيالتنزيل', 'التنزيل',
  'علي', 'عمر', 'عثمان', 'ابن', 'ابي',
  'سطيح', 'سهل', 'عايشه', 'انس', 'مالك',
  'طلحه', 'قيله', 'طهفه', 'شريح', 'عمار', 'عروه',
  'عطاء', 'سمره', 'صفيه', 'سيده', 'حسان', 'لقيط',
  'عدي', 'زينب', 'معاذ', 'عمرو', 'صله', 'سوده',
  'اويس', 'مطرف', 'ضمام',
  'ويقال', 'يقال', 'ويروي', 'يروي',
  'تقول', 'يقول', 'اقول', 'نقول',
  'اراد', 'يريد', 'يعني', 'انشد', 'وانشد',
  'قالت', 'وقالت', 'ذكر', 'وذكر',
  'فقال', 'فقلت', 'فقيل', 'وقري', 'وروي', 'قالا',
  'منها', 'عنها', 'فيها', 'فانه', 'لقلت',
]);

function markerIsEntry(rawMarker) {
  const norm = normalizeArabic(rawMarker);
  if (norm.length < 2 || norm.length > 4) return false;
  if (falseMarkers.has(norm)) return false;
  if (/[\u064B\u064C\u064D]/.test(rawMarker)) return false;
  if (/[\u064F\u0650]\s*$/.test(rawMarker)) return false;
  if (/[\u0629]\s*[\u064B-\u065F\u0670]*$/.test(rawMarker)) return false;
  return true;
}

function findEntryMarkers(text) {
  const markers = [];
  const re = /(^|\n)([\u0621-\u064A\u064B-\u065F\u0670\u0640 ]{2,16})\s*:/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[2].trim();
    if (!markerIsEntry(raw)) continue;
    markers.push({
      index: match.index + match[1].length,
      raw,
      norm: normalizeArabic(raw),
    });
  }
  return markers;
}

function classifyRaw(row) {
  const loc = locator(row);
  if (loc.segment_type === 'footnote') return 'lisan_entry_footnote_raw';
  if ((row.page_no ?? 0) < LEXICON_START_PAGE) return 'lisan_source_preface_raw';
  return 'lisan_source_body_raw';
}

function entryId(seq, headingNorm, pageStart) {
  return `CHK:${SOURCE_SLUG}:book_entry:${String(seq).padStart(5, '0')}:${normalizeArabic(headingNorm)}:${pageStart}`;
}

function finishEntry(entries, current, roots) {
  if (!current) return;
  const fullText = current.parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!fullText) return;
  if (isMarkerOnlyEntry(fullText, current.heading_norm)) return;

  const chunks = [];
  let remaining = fullText;
  while (remaining.length > MAX_ENTRY_CHARS) {
    let cut = remaining.lastIndexOf('\n\n', MAX_ENTRY_CHARS);
    if (cut < Math.floor(MAX_ENTRY_CHARS * 0.5)) cut = remaining.lastIndexOf('\n', MAX_ENTRY_CHARS);
    if (cut < Math.floor(MAX_ENTRY_CHARS * 0.5)) cut = MAX_ENTRY_CHARS;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);

  chunks.forEach((text, index) => {
    entries.push({
      ...current,
      text_ar: text,
      root_id: rootIdFor(current.heading_norm, roots),
      tokens_approx: Math.max(1, Math.ceil(text.length / 5)),
      entry_part: index + 1,
      entry_parts: chunks.length,
      parts: undefined,
    });
  });
}

function isMarkerOnlyEntry(text, headingNorm) {
  const body = String(text ?? '')
    .replace(/^[^:\n]{0,30}:/u, '')
    .replace(/\(\(\s*[0-9٠-٩۰-۹]+\s*\)\)/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[.:：،؛,()\[\]\s]/g, '')
    .trim();
  const norm = normalizeArabic(body);
  return !norm || norm === normalizeArabic(headingNorm);
}

function appendPart(current, row, text) {
  if (!current || !text.trim()) return;
  current.parts.push(text.trim());
  current.page_end = Math.max(current.page_end, row.page_no ?? current.page_end);
  if (!current.original_ids.includes(row.id)) current.original_ids.push(row.id);
}

mkdirSync(OUT_DIR, { recursive: true });

const rows = d1(`
  SELECT id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar,
         text_en, page_no, volume_no, tokens_approx, is_embedded, qdrant_id,
         meta_json, root_id, source_slug
  FROM ar_ling_source_chunks
  WHERE source_slug = '${SOURCE_SLUG}'
    AND (
      json_extract(meta_json, '$.repair') IS NULL
      OR json_extract(meta_json, '$.repair') != '${REPAIR_TAG}'
    )
  ORDER BY page_no ASC,
           CAST(json_extract(meta_json, '$.locator.chunk_index') AS INTEGER) ASC,
           CAST(json_extract(meta_json, '$.locator.segment_part') AS INTEGER) ASC,
           id ASC
`);

const rootRows = d1('SELECT id, root_text, root_letters, root_normalized FROM ar_ling_roots');
const roots = new Map();
for (const row of rootRows) {
  for (const value of [row.root_text, row.root_letters, row.root_normalized]) {
    const key = normalizeArabic(value);
    if (key && !roots.has(key)) roots.set(key, row.id);
  }
}

const sortedRows = rows.sort((a, b) => {
  const al = locator(a);
  const bl = locator(b);
  return (a.page_no ?? 0) - (b.page_no ?? 0)
    || (Number(al.chunk_index ?? 0) - Number(bl.chunk_index ?? 0))
    || (Number(al.segment_part ?? 0) - Number(bl.segment_part ?? 0))
    || splitOrdinal(a.id) - splitOrdinal(b.id)
    || String(a.id).localeCompare(String(b.id));
});

const entries = [];
let current = null;

for (const row of sortedRows) {
  const loc = locator(row);
  if (loc.segment_type === 'footnote') {
    if (current && (row.page_no ?? 0) >= LEXICON_START_PAGE) current.footnote_ids.push(row.id);
    continue;
  }

  if (loc.segment_type !== 'body' || (row.page_no ?? 0) < LEXICON_START_PAGE) continue;

  const text = String(row.text_ar ?? '');
  const markers = findEntryMarkers(text);
  if (markers.length === 0) {
    appendPart(current, row, text);
    continue;
  }

  if (markers[0].index > 0) {
    appendPart(current, row, text.slice(0, markers[0].index));
  }

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const next = markers[i + 1]?.index ?? text.length;
    const part = text.slice(marker.index, next).trim();

    finishEntry(entries, current, roots);
    const seq = entries.length + 1;
    current = {
      id: entryId(seq, marker.norm, row.page_no),
      source_id: row.source_id,
      edition_id: row.edition_id,
      chunk_kind: 'lexical_entry',
      entry_seq: seq,
      heading_raw: marker.raw,
      heading_norm: marker.norm,
      root_id: null,
      text_ar: '',
      text_en: null,
      page_start: row.page_no,
      page_end: row.page_no,
      volume_no: row.volume_no,
      source_url: loc.source_url ?? null,
      parts: [],
      original_ids: [row.id],
      footnote_ids: [],
    };
    appendPart(current, row, part);
  }
}

finishEntry(entries, current, roots);

entries.forEach((entry, index) => {
  entry.entry_seq = index + 1;
  entry.id = entryId(entry.entry_seq, entry.heading_norm, entry.page_start)
    + (entry.entry_parts > 1 ? `:part:${String(entry.entry_part).padStart(2, '0')}` : '');
  entry.meta_json = JSON.stringify({
    repair: REPAIR_TAG,
    source_slug: SOURCE_SLUG,
    source_url: entry.source_url,
    locator: {
      source_slug: SOURCE_SLUG,
      book_id: '2140',
      page_start: entry.page_start,
      page_end: entry.page_end,
      volume_start: entry.volume_no,
      entry_seq: entry.entry_seq,
      entry_part: entry.entry_part,
      entry_parts: entry.entry_parts,
      raw_heading: entry.heading_raw,
      original_ids: entry.original_ids,
      footnote_ids: entry.footnote_ids,
    },
  });
});

const rawKindCounts = sortedRows.reduce((acc, row) => {
  const kind = classifyRaw(row);
  acc[kind] = (acc[kind] ?? 0) + 1;
  return acc;
}, {});

const shortEntries = entries.filter((entry) => entry.text_ar.length < 80).length;
const phraseHeadings = entries.filter((entry) => entry.heading_norm.length > 8).length;
const missingRoot = entries.filter((entry) => !entry.root_id).length;
const preview = entries.slice(0, 20).map((entry) => ({
  seq: entry.entry_seq,
  heading_norm: entry.heading_norm,
  root_id: entry.root_id,
  pages: `${entry.page_start}-${entry.page_end}`,
  chars: entry.text_ar.length,
  raw_heading: entry.heading_raw,
  sample: entry.text_ar.slice(0, 100),
}));

console.log(JSON.stringify({
  apply: APPLY,
  source_slug: SOURCE_SLUG,
  raw_rows: rows.length,
  rawKindCounts,
  rebuilt_entries: entries.length,
  rebuilt_missing_root: missingRoot,
  rebuilt_short_entries: shortEntries,
  rebuilt_long_heading_entries: phraseHeadings,
  preview,
}, null, 2));

const statements = [];
statements.push(`DELETE FROM ar_ling_source_chunks WHERE source_slug = ${sql(SOURCE_SLUG)} AND json_extract(meta_json, '$.repair') = ${sql(REPAIR_TAG)};`);
for (const row of sortedRows) {
  statements.push(`UPDATE ar_ling_source_chunks SET chunk_kind = ${sql(classifyRaw(row))}, is_embedded = 0, qdrant_id = NULL WHERE id = ${sql(row.id)};`);
}
for (const entry of entries) {
  statements.push(`INSERT INTO ar_ling_source_chunks
    (id, source_id, edition_id, chunk_kind, chunk_seq, heading_norm, text_ar, text_en,
     page_no, volume_no, tokens_approx, is_embedded, qdrant_id, meta_json, root_id, source_slug)
    VALUES (${sql(entry.id)}, ${sql(entry.source_id)}, ${sql(entry.edition_id)}, 'lexical_entry',
            ${entry.entry_seq}, ${sql(entry.heading_norm)}, ${sql(entry.text_ar)}, NULL,
            ${entry.page_start}, ${sql(entry.volume_no)}, ${entry.tokens_approx}, 0, NULL,
            ${sql(entry.meta_json)}, ${sql(entry.root_id)}, ${sql(SOURCE_SLUG)})
    ON CONFLICT(id) DO UPDATE SET
      chunk_kind = excluded.chunk_kind,
      chunk_seq = excluded.chunk_seq,
      heading_norm = excluded.heading_norm,
      text_ar = excluded.text_ar,
      text_en = excluded.text_en,
      page_no = excluded.page_no,
      volume_no = excluded.volume_no,
      tokens_approx = excluded.tokens_approx,
      is_embedded = 0,
      qdrant_id = NULL,
      meta_json = excluded.meta_json,
      root_id = excluded.root_id,
      source_slug = excluded.source_slug;`);
}

const sqlPath = join(OUT_DIR.pathname, 'repair-lisan-book-entries.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
console.log(`SQL written: ${sqlPath}`);

if (APPLY) {
  console.log(d1File(sqlPath));
}
