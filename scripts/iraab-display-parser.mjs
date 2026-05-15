#!/usr/bin/env node
// iraab-display-parser.mjs
//
// Three-phase projection of already-ingested iʿrāb data into the
// qr_iraab_book_display_* tables (migration 011):
//
//   Phase A — qr_irab_book_entries   → one irab_card per entry (most accurate
//                                       source: 124k pre-parsed words with role,
//                                       case, mahal, alternatives).
//   Phase B — qr_irab_source_chunks  → section heading + per-paragraph note
//                                       blocks for non-iʿrāb sections
//                                       (sarf / balagha / fawaid / language).
//   Phase C — qr_irab_source_chunks  → one dependency_graph block per row whose
//                                       content_format='svg_ref'.
//
// Group support: every block carries `ayah_key`, `ayah_group_key`, and a
// hydrated `ayah_keys` array, computed from the TEXT `ayah_keys` column
// upstream (the only field that is reliably populated across all sources).
//
// Bracket support: both `(word)` and `﴿word﴾` (U+FD3F / U+FD3E) are recognized
// for paragraph-leading target detection in Phase B prose.
//
// Idempotency: every output row gets review_status='ai_candidate' and
// extraction_method='regex_parser' (Phase B/C) or 'entry_projection' (Phase A).
// On `--apply`, the parser DELETEs only ai_candidate rows whose source_chunk_id
// or source_entry_id matches the touched inputs, then INSERTs fresh. Rows that
// have been promoted to a non-ai_candidate status are never touched.
//
// Usage:
//   node scripts/iraab-display-parser.mjs --surah 2                      # dry-run JSON
//   node scripts/iraab-display-parser.mjs --surah 2 --slug al_jadwal --apply
//   node scripts/iraab-display-parser.mjs --ayah 2:3                     # single ayah, all sources

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const QR_DB = 'km_quran';
const QR_CWD = new URL('../workers/quran/', import.meta.url);

// ─── Vocab + regex ───────────────────────────────────────────────────────────

const SECTION_HEADINGS = {
  irab:     { ar: 'الإعراب',  en: 'Iʿrāb' },
  sarf:     { ar: 'الصرف',    en: 'Ṣarf' },
  balagha:  { ar: 'البلاغة',  en: 'Balāgha' },
  fawaid:   { ar: 'الفوائد',  en: 'Fawāʾid (Insights)' },
  language: { ar: 'اللغة',     en: 'Language & Etymology' },
};

// Section_kind in source_chunks → display block_type for the per-paragraph
// notes within that section. `irab` is intentionally absent here — Phase A
// handles word-level iʿrāb projection from qr_irab_book_entries.
const SECTION_TO_BLOCK = {
  sarf:     'sarf_note',
  balagha:  'balagha_note',
  fawaid:   'key_insight',
  language: 'language_note',
};

// Matches a leading target word in parens OR ornate Qur'anic brackets.
// `(word)` is U+0028 / U+0029; `﴿word﴾` is U+FD3F (left) / U+FD3E (right).
// Some sources put diacritized text inside; we keep it as-is.
const TARGET_RE = /^\s*[\(\u{FD3F}]([^\)\u{FD3E}]+)[\)\u{FD3E}]\s*/u;

// Inline aside in al-jadwal HTML. Captured into footnote notes.
const INLINE_ASIDE_RE = /\[\[(.+?)\]\]/g;
// Highlighted span (al-jadwal).
const HLT_RE = /<span class="hlt">([\s\S]*?)<\/span>/g;
const TAG_RE = /<[^>]+>/g;

const DIACRITICS_RE = /[ً-ْٰـ]/g;
const norm = (s) => (s ?? '').replace(DIACRITICS_RE, '').trim();
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);

const GRAMMAR_VOCAB = [
  'اسم موصول', 'مبني', 'في محل جر', 'في محل رفع', 'في محل نصب',
  'فعل مضارع', 'فعل ماض', 'فعل أمر', 'مرفوع', 'منصوب', 'مجرور', 'مجزوم',
  'فاعل', 'مفعول به', 'حال', 'نعت', 'بدل', 'مبتدأ', 'خبر', 'ظرف',
  'جار ومجرور', 'حرف جر', 'حرف عطف', 'حرف نصب', 'حرف نفي',
  'ضمير متصل', 'ضمير منفصل', 'الأفعال الخمسة', 'صلة الموصول',
];
const SARF_VOCAB = ['أفعل', 'فعل', 'إعلال', 'حذف الهمزة', 'مدّة', 'تصريف', 'وزن'];
const BALAGHA_VOCAB = [
  'تكرار', 'تبعيض', 'استعارة', 'مجاز', 'تقديم', 'تأخير', 'حذف',
  'كناية', 'تشبيه', 'مقابلة', 'طباق', 'جناس',
];

function harvest(text, vocab) {
  const found = new Set();
  for (const term of vocab) if (text.includes(term)) found.add(term);
  return [...found];
}

// ─── Group key utilities ─────────────────────────────────────────────────────

/** Parse the upstream `ayah_keys` column ("2:1,2:2,…") into a sorted unique
 *  string array. Falls back to a single-key array when only `ayah_key` is set. */
function parseAyahKeys(row) {
  const raw = (row.ayah_keys ?? '').trim();
  if (raw) {
    const list = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  if (row.ayah_key) return [String(row.ayah_key).trim()];
  // Fallback: build from integer surah / ayah_from / ayah_to when present.
  if (row.surah != null && row.ayah_from != null) {
    const to = row.ayah_to ?? row.ayah_from;
    const keys = [];
    for (let a = row.ayah_from; a <= to; a++) keys.push(`${row.surah}:${a}`);
    return keys;
  }
  return [];
}

/** Canonical group key: "2:3" for singletons, "2:1-5" for ranges. */
function groupKey(ayahKeys) {
  if (!ayahKeys.length) return null;
  if (ayahKeys.length === 1) return ayahKeys[0];
  const first = ayahKeys[0];
  const last = ayahKeys[ayahKeys.length - 1];
  const [, lastAyah] = last.split(':');
  return `${first}-${lastAyah}`;
}

// ─── Stable IDs ──────────────────────────────────────────────────────────────

const blockId = (parentId, kind, order) => `IRAAB_BLK_${sha(`${parentId}|${kind}|${order}`)}`;
const tagId   = (blockId, kind, value)  => `IRAAB_TAG_${sha(`${blockId}|${kind}|${value}`)}`;
const refId   = (blockId, kind, key)    => `IRAAB_REF_${sha(`${blockId}|${kind}|${key}`)}`;
const noteId  = (blockId, kind, body)   => `IRAAB_NOTE_${sha(`${blockId}|${kind}|${body}`)}`;

// ─── Bracket-aware target detection (used by Phase B prose) ──────────────────

function detectTarget(text) {
  const m = String(text || '').match(TARGET_RE);
  if (!m) return { wordText: null, body: text };
  return { wordText: m[1].trim(), body: text.slice(m[0].length).trim() };
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function splitParagraphs(html) {
  if (!html) return [];
  // If no <p>, treat the whole thing as one paragraph.
  if (!/<p[\s>]/i.test(html)) return [String(html).trim()].filter(Boolean);
  return String(html)
    .split(/<\/p>\s*<p[^>]*>/i)
    .map((p) => p.replace(/^<p[^>]*>/i, '').replace(/<\/p>\s*$/i, ''))
    .map((p) => p.trim())
    .filter(Boolean);
}

function extractHighlights(htmlFrag) {
  const out = [];
  let m;
  while ((m = HLT_RE.exec(htmlFrag)) !== null) out.push(m[1].trim());
  HLT_RE.lastIndex = 0;
  return out;
}

function plain(htmlOrText) {
  return String(htmlOrText ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(TAG_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Locator builder ─────────────────────────────────────────────────────────

function locatorFromRow(row) {
  const keys = parseAyahKeys(row);
  const ayah_group_key = groupKey(keys);
  const ayah_key = row.ayah_key ?? keys[0] ?? null;
  const [, firstAyah] = (keys[0] || '').split(':');
  const [, lastAyah]  = (keys[keys.length - 1] || '').split(':');
  return {
    surah_no:        row.surah ?? (keys[0] ? Number(keys[0].split(':')[0]) : null),
    ayah_no:         row.ayah_from ?? (firstAyah ? Number(firstAyah) : null),
    ayah_to:         row.ayah_to ?? (lastAyah ? Number(lastAyah) : null),
    ayah_key,
    ayah_group_key,
    ayah_keys_json:  keys.length ? JSON.stringify(keys) : null,
    is_grouped:      keys.length > 1 ? 1 : 0,
  };
}

// ─── PHASE A: entries → irab_card blocks ─────────────────────────────────────

/**
 * One entry → one irab_card. Sources differ in field coverage; the renderer
 * gracefully degrades. alternatives_json (al-jadwal) → footnote notes.
 */
export function buildBlocksFromEntry(entry, source = null) {
  const blocks = [];
  const tags = [];
  const refs = [];
  const notes = [];

  if (!entry?.id) return { blocks, tags, refs, notes };

  const loc = locatorFromRow(entry);
  const common = {
    source_id:        entry.source_id ?? null,
    source_chunk_id:  null,                              // Phase A is entry-only
    source_entry_id:  entry.id,
    source_slug:      entry.source_slug,
    book_title:       source?.source_title_en ?? source?.source_title_ar ?? entry.source_title ?? null,
    author:           source?.author_name_en ?? null,
    ...loc,
  };

  const wordText = entry.target_text_ar ?? entry.target_text_bare ?? null;
  const irabText = entry.irab_text_ar ?? entry.irab_text ?? null;
  const rawText  = entry.raw_annotation_ar ?? entry.source_quote_ar ?? irabText ?? null;

  // Build a controlled grammar tag set from the entry's structured fields.
  const grammarTags = [
    entry.grammar_role_ar,
    entry.grammar_case_ar,
    entry.mahal_ar,
  ].filter(Boolean);

  const id = blockId(entry.id, 'irab_card', 0);
  blocks.push({
    id,
    ...common,
    word_index:       null,
    word_text:        wordText,
    phrase_text:      null,
    scope_type:       common.is_grouped ? 'ayah_group' : (wordText ? 'word' : 'phrase'),
    block_type:       'irab_card',
    block_subtype:    'word_analysis',
    display_order:    Number(entry.entry_order ?? 0),
    title_ar:         wordText ? `(${wordText})` : null,
    title_en:         null,
    text_ar:          irabText,
    text_en:          null,
    raw_text:         rawText,
    tags_json:        JSON.stringify(['irab', 'entry', ...(wordText ? ['word_target'] : [])]),
    grammar_tags_json: grammarTags.length ? JSON.stringify(grammarTags) : null,
    sarf_tags_json:   null,
    balagha_tags_json: null,
    quran_refs_json:  JSON.stringify([{
      surah: common.surah_no,
      ayah: common.ayah_no,
      ayah_key: common.ayah_key,
      ayah_group_key: common.ayah_group_key,
      word_text: wordText,
    }]),
    backlinks_json:   null,
    related_links_json: null,
    external_resource_json: null,
    confidence:       wordText && entry.grammar_role_ar ? 'high' : 'medium',
    review_status:    'ai_candidate',
    extraction_method: 'entry_projection',
    meta_json:        JSON.stringify({
      target_text_bare: entry.target_text_bare ?? null,
      grammar_role_norm: entry.grammar_role_norm ?? null,
      source_quote_hash: entry.source_quote_hash ?? null,
    }),
  });

  // Normalized tag side-table rows.
  for (const t of grammarTags) {
    tags.push({
      id: tagId(id, 'grammar', t),
      block_id: id,
      tag_kind: 'grammar',
      tag_value: t,
      tag_value_norm: norm(t),
      display_order: tags.length,
    });
  }

  // Ref rows: one per ayah in the group, so cross-ayah filtering works.
  const ayahKeys = JSON.parse(common.ayah_keys_json || '[]');
  for (const key of ayahKeys) {
    const [sStr, aStr] = key.split(':');
    refs.push({
      id: refId(id, 'ayah', key),
      block_id: id,
      ref_kind: 'ayah',
      surah_no: Number(sStr) || null,
      ayah_no: Number(aStr) || null,
      ayah_to: null,
      ayah_key: key,
      ayah_group_key: common.ayah_group_key,
      word_index: null,
      typed_ref: `QR:${key}`,
      label: key,
      meta_json: null,
    });
  }

  // alternative_json (al-jadwal): each alt → footnote note, needs_review.
  if (entry.alternative_json) {
    let alts = [];
    try { const parsed = JSON.parse(entry.alternative_json); alts = Array.isArray(parsed) ? parsed : []; }
    catch { /* ignore malformed alts */ }
    for (const alt of alts) {
      const body = alt?.note ?? (typeof alt === 'string' ? alt : null);
      if (!body) continue;
      notes.push({
        id: noteId(id, 'alt', body),
        block_id: id,
        note_kind: 'footnote',
        note_text_ar: body,
        note_text_en: null,
        is_inline: 1,
        surah_no: common.surah_no,
        ayah_no: common.ayah_no,
        ayah_key: common.ayah_key,
        ayah_group_key: common.ayah_group_key,
        source_slug: common.source_slug,
        display_order: notes.length,
        meta_json: null,
        review_status: 'needs_review',
      });
    }
  }

  // Inline note (rare; al-jadwal occasionally).
  if (entry.inline_note_ar) {
    notes.push({
      id: noteId(id, 'inline', entry.inline_note_ar),
      block_id: id,
      note_kind: 'footnote',
      note_text_ar: entry.inline_note_ar,
      note_text_en: null,
      is_inline: 1,
      surah_no: common.surah_no,
      ayah_no: common.ayah_no,
      ayah_key: common.ayah_key,
      ayah_group_key: common.ayah_group_key,
      source_slug: common.source_slug,
      display_order: notes.length,
      meta_json: null,
      review_status: 'needs_review',
    });
  }

  return { blocks, tags, refs, notes };
}

// ─── PHASE B: non-iʿrāb chunks → section + prose blocks ──────────────────────

/**
 * Section chunk → one heading block + N per-paragraph notes (block_type
 * depends on section_kind). iʿrāb chunks are NOT handled here; Phase A owns
 * word-level iʿrāb projection.
 */
export function buildBlocksFromSectionChunk(chunk, source = null) {
  const blocks = [];
  const tags = [];
  const refs = [];
  const notes = [];

  const sectionKind = chunk.section_kind;
  if (!sectionKind || sectionKind === 'irab' || sectionKind === 'dep_graph') {
    return { blocks, tags, refs, notes };
  }
  const heading = SECTION_HEADINGS[sectionKind];
  const baseBlockType = SECTION_TO_BLOCK[sectionKind];
  if (!heading || !baseBlockType) return { blocks, tags, refs, notes };

  const loc = locatorFromRow(chunk);
  const common = {
    source_id:        chunk.source_id ?? null,
    source_chunk_id:  chunk.id,
    source_entry_id:  null,
    source_slug:      chunk.source_slug,
    book_title:       source?.source_title_en ?? source?.source_title_ar ?? null,
    author:           source?.author_name_en ?? null,
    ...loc,
  };

  const body = chunk.raw_html || chunk.raw_text || chunk.clean_text || '';
  const paragraphs = splitParagraphs(body);
  if (!paragraphs.length) return { blocks, tags, refs, notes };

  let order = 0;
  const nextOrder = () => order++;

  // 1) Section heading.
  const headingOrder = nextOrder();
  const headingId = blockId(chunk.id, 'heading', headingOrder);
  blocks.push({
    id:                headingId,
    ...common,
    word_index:        null,
    word_text:         null,
    phrase_text:       null,
    scope_type:        common.is_grouped ? 'ayah_group' : 'ayah',
    block_type:        'heading',
    block_subtype:     sectionKind,
    display_order:     headingOrder,
    title_ar:          heading.ar,
    title_en:          heading.en,
    text_ar:           null,
    text_en:           null,
    raw_text:          null,
    tags_json:         JSON.stringify([sectionKind]),
    grammar_tags_json: null,
    sarf_tags_json:    null,
    balagha_tags_json: null,
    quran_refs_json:   JSON.stringify([{
      surah: common.surah_no,
      ayah: common.ayah_no,
      ayah_key: common.ayah_key,
      ayah_group_key: common.ayah_group_key,
    }]),
    backlinks_json:    null,
    related_links_json: null,
    external_resource_json: null,
    confidence:        'high',
    review_status:     'ai_candidate',
    extraction_method: 'regex_parser',
    meta_json:         null,
  });

  // 2) Per-paragraph blocks.
  for (const pFrag of paragraphs) {
    const highlights = extractHighlights(pFrag);

    // Pull inline asides BEFORE stripping tags so we can attach as notes.
    const asides = [];
    let frag = pFrag;
    let m;
    while ((m = INLINE_ASIDE_RE.exec(frag)) !== null) asides.push(plain(m[1]));
    INLINE_ASIDE_RE.lastIndex = 0;
    frag = frag.replace(INLINE_ASIDE_RE, ' ');

    const rawText = plain(frag);
    if (!rawText) continue;

    const { wordText, body: bodyText } = detectTarget(rawText);

    const sarfTags = sectionKind === 'sarf' ? harvest(bodyText, SARF_VOCAB) : [];
    const balaghaTags = sectionKind === 'balagha' ? harvest(bodyText, BALAGHA_VOCAB) : [];
    const grammarTags = harvest(bodyText, GRAMMAR_VOCAB);

    const blockOrder = nextOrder();
    const id = blockId(chunk.id, baseBlockType, blockOrder);
    blocks.push({
      id,
      ...common,
      word_index:       null,
      word_text:        wordText,
      phrase_text:      highlights[0] ?? null,
      scope_type:       common.is_grouped ? 'ayah_group' : (wordText ? 'word' : 'phrase'),
      block_type:       baseBlockType,
      block_subtype:    sectionKind,
      display_order:    blockOrder,
      title_ar:         wordText ? `(${wordText})` : null,
      title_en:         null,
      text_ar:          bodyText,
      text_en:          null,
      raw_text:         rawText,
      tags_json:        JSON.stringify([sectionKind, ...(wordText ? ['word_target'] : [])]),
      grammar_tags_json: grammarTags.length ? JSON.stringify(grammarTags) : null,
      sarf_tags_json:   sarfTags.length ? JSON.stringify(sarfTags) : null,
      balagha_tags_json: balaghaTags.length ? JSON.stringify(balaghaTags) : null,
      quran_refs_json:  JSON.stringify([{
        surah: common.surah_no,
        ayah: common.ayah_no,
        ayah_key: common.ayah_key,
        ayah_group_key: common.ayah_group_key,
        word_text: wordText,
      }]),
      backlinks_json:   null,
      related_links_json: null,
      external_resource_json: null,
      confidence:       wordText ? 'high' : 'medium',
      review_status:    'ai_candidate',
      extraction_method: 'regex_parser',
      meta_json:        highlights.length ? JSON.stringify({ highlights }) : null,
    });

    const pushTag = (kind, value) => tags.push({
      id: tagId(id, kind, value),
      block_id: id,
      tag_kind: kind,
      tag_value: value,
      tag_value_norm: norm(value),
      display_order: tags.length,
    });
    for (const t of grammarTags) pushTag('grammar', t);
    for (const t of sarfTags) pushTag('sarf', t);
    for (const t of balaghaTags) pushTag('balagha', t);

    if (common.surah_no && common.ayah_no) {
      refs.push({
        id: refId(id, 'ayah', common.ayah_key),
        block_id: id,
        ref_kind: 'ayah',
        surah_no: common.surah_no,
        ayah_no: common.ayah_no,
        ayah_to: common.ayah_to,
        ayah_key: common.ayah_key,
        ayah_group_key: common.ayah_group_key,
        word_index: null,
        typed_ref: `QR:${common.ayah_key}`,
        label: common.ayah_group_key,
        meta_json: null,
      });
    }

    for (const aside of asides) {
      notes.push({
        id: noteId(id, 'aside', aside),
        block_id: id,
        note_kind: 'footnote',
        note_text_ar: aside,
        note_text_en: null,
        is_inline: 1,
        surah_no: common.surah_no,
        ayah_no: common.ayah_no,
        ayah_key: common.ayah_key,
        ayah_group_key: common.ayah_group_key,
        source_slug: common.source_slug,
        display_order: notes.length,
        meta_json: null,
        review_status: 'needs_review',
      });
    }
  }

  return { blocks, tags, refs, notes };
}

// ─── PHASE C: svg_ref chunks → dependency_graph blocks ───────────────────────

/**
 * A dep_graph chunk's clean_text is a JSON blob like:
 *   {"r2_key":"dep-graphs/3/3:131.svg","svg_bytes":13276,"source_db":"…"}
 * Project as one dependency_graph block; the UI fetches the SVG through the
 * worker proxied to R2.
 */
export function buildBlocksFromDepGraphChunk(chunk, source = null) {
  const blocks = [];
  if (!chunk?.id) return { blocks, tags: [], refs: [], notes: [] };

  let resource = null;
  try {
    const parsed = JSON.parse(chunk.clean_text || chunk.raw_text || '{}');
    if (parsed && parsed.r2_key) {
      resource = {
        r2_key: parsed.r2_key,
        kind: 'svg',
        bytes: parsed.svg_bytes ?? null,
        mime: 'image/svg+xml',
        source_db: parsed.source_db ?? null,
      };
    }
  } catch { /* ignore */ }

  if (!resource) return { blocks, tags: [], refs: [], notes: [] };

  const loc = locatorFromRow(chunk);
  const id = blockId(chunk.id, 'dependency_graph', 0);
  blocks.push({
    id,
    source_id: chunk.source_id ?? null,
    source_chunk_id: chunk.id,
    source_entry_id: null,
    source_slug: chunk.source_slug,
    book_title: source?.source_title_en ?? source?.source_title_ar ?? null,
    author: source?.author_name_en ?? null,
    ...loc,
    word_index: null,
    word_text: null,
    phrase_text: null,
    scope_type: loc.is_grouped ? 'ayah_group' : 'ayah',
    block_type: 'dependency_graph',
    block_subtype: 'qul_dep_graph',
    display_order: 0,
    title_ar: 'الشجرة الإعرابية',
    title_en: 'Dependency Tree',
    text_ar: null, text_en: null, raw_text: null,
    tags_json: JSON.stringify(['dep_graph']),
    grammar_tags_json: null, sarf_tags_json: null, balagha_tags_json: null,
    quran_refs_json: JSON.stringify([{
      surah: loc.surah_no, ayah: loc.ayah_no,
      ayah_key: loc.ayah_key, ayah_group_key: loc.ayah_group_key,
    }]),
    backlinks_json: null, related_links_json: null,
    external_resource_json: JSON.stringify(resource),
    confidence: 'verified',
    review_status: 'ai_candidate',
    extraction_method: 'regex_parser',
    meta_json: null,
  });

  return { blocks, tags: [], refs: [], notes: [] };
}

// ─── Unified dispatch ────────────────────────────────────────────────────────

/**
 * Decide which phase a row goes through and emit blocks.
 * `kind` is one of: 'entry' | 'section_chunk' | 'dep_graph_chunk'.
 */
export function buildDisplayBlocks(row, source = null, kind = 'auto') {
  if (kind === 'auto') {
    if (row?.target_text_ar != null || row?.irab_text_ar != null) kind = 'entry';
    else if (row?.content_format === 'svg_ref') kind = 'dep_graph_chunk';
    else kind = 'section_chunk';
  }
  if (kind === 'entry') return buildBlocksFromEntry(row, source);
  if (kind === 'dep_graph_chunk') return buildBlocksFromDepGraphChunk(row, source);
  return buildBlocksFromSectionChunk(row, source);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const a = { surah: null, ayah: null, slug: null, allSurahs: false, fromSurah: 1, toSurah: 114, limitEntries: 200, limitChunks: 100, apply: false };
  for (let i = 2; i < process.argv.length; i++) {
    const v = process.argv[i];
    if (v === '--surah') a.surah = Number(process.argv[++i]);
    else if (v === '--ayah') a.ayah = process.argv[++i];
    else if (v === '--slug') a.slug = process.argv[++i];
    else if (v === '--all-surahs') a.allSurahs = true;
    else if (v === '--from-surah') a.fromSurah = Number(process.argv[++i]);
    else if (v === '--to-surah') a.toSurah = Number(process.argv[++i]);
    else if (v === '--limit-entries') a.limitEntries = Number(process.argv[++i]);
    else if (v === '--limit-chunks') a.limitChunks = Number(process.argv[++i]);
    else if (v === '--apply') a.apply = true;
  }
  return a;
}

function d1Query(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', QR_DB, '--remote', '--json', '--command', sql],
    { cwd: QR_CWD, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out);
  return parsed?.[0]?.results ?? [];
}

function sqlEsc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insertSQL(table, row) {
  const cols = Object.keys(row);
  const vals = cols.map((c) => sqlEsc(row[c]));
  return `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildWhere(args) {
  const clauses = [];
  if (args.slug) clauses.push(`source_slug = ${sqlEsc(args.slug)}`);
  if (args.surah) clauses.push(`surah = ${args.surah}`);
  if (args.ayah) clauses.push(`ayah_key = ${sqlEsc(args.ayah)}`);
  return clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
}

/** Process a single surah end-to-end (read → build → apply → FTS sync). */
async function processSurah(args, sourcesById, surah) {
  const surahArgs = { ...args, surah };
  const where = buildWhere(surahArgs);

  const entries = d1Query(`SELECT * FROM qr_irab_book_entries ${where} ORDER BY surah, ayah_from, entry_order LIMIT ${args.limitEntries};`);
  const sectionChunks = d1Query(`SELECT * FROM qr_irab_source_chunks ${where ? where + ' AND ' : 'WHERE '}section_kind IN ('sarf','balagha','fawaid','language') ORDER BY surah, ayah_from, section_order LIMIT ${args.limitChunks};`);
  const depGraphChunks = d1Query(`SELECT * FROM qr_irab_source_chunks ${where ? where + ' AND ' : 'WHERE '}content_format='svg_ref' ORDER BY surah, ayah_from LIMIT ${args.limitChunks};`);

  const all = { blocks: [], tags: [], refs: [], notes: [] };
  const merge = (built) => { for (const k of Object.keys(all)) all[k].push(...built[k]); };
  for (const e of entries) merge(buildBlocksFromEntry(e, sourcesById[e.source_id]));
  for (const c of sectionChunks) merge(buildBlocksFromSectionChunk(c, sourcesById[c.source_id]));
  for (const c of depGraphChunks) merge(buildBlocksFromDepGraphChunk(c, sourcesById[c.source_id]));

  if (!args.apply) {
    return { surah, entries: entries.length, section: sectionChunks.length, depGraph: depGraphChunks.length, blocks: all.blocks.length, tags: all.tags.length, refs: all.refs.length, notes: all.notes.length, all };
  }

  // Idempotent reset of ai_candidate rows for touched source rows.
  const touchedChunkIds = [...new Set(all.blocks.map((b) => b.source_chunk_id).filter(Boolean))];
  const touchedEntryIds = [...new Set(all.blocks.map((b) => b.source_entry_id).filter(Boolean))];
  if (touchedChunkIds.length) {
    for (let i = 0; i < touchedChunkIds.length; i += 200) {
      const idList = touchedChunkIds.slice(i, i + 200).map(sqlEsc).join(',');
      d1Query(`DELETE FROM qr_iraab_book_display_blocks WHERE source_chunk_id IN (${idList}) AND review_status = 'ai_candidate';`);
    }
  }
  if (touchedEntryIds.length) {
    for (let i = 0; i < touchedEntryIds.length; i += 200) {
      const idList = touchedEntryIds.slice(i, i + 200).map(sqlEsc).join(',');
      d1Query(`DELETE FROM qr_iraab_book_display_blocks WHERE source_entry_id IN (${idList}) AND review_status = 'ai_candidate';`);
    }
  }

  const stmts = [
    ...all.blocks.map((r) => insertSQL('qr_iraab_book_display_blocks', r)),
    ...all.tags.map((r) => insertSQL('qr_iraab_book_display_tags', r)),
    ...all.refs.map((r) => insertSQL('qr_iraab_book_display_refs', r)),
    ...all.notes.map((r) => insertSQL('qr_iraab_book_display_notes', r)),
  ];
  const BATCH = 100;
  for (let i = 0; i < stmts.length; i += BATCH) d1Query(stmts.slice(i, i + BATCH).join('\n'));

  // FTS5 sync (contentless FTS5 — explicit DELETE+INSERT).
  const touchedBlockIds = all.blocks.map((b) => b.id);
  for (let i = 0; i < touchedBlockIds.length; i += 200) {
    const idList = touchedBlockIds.slice(i, i + 200).map(sqlEsc).join(',');
    d1Query(`DELETE FROM qr_iraab_book_display_blocks_fts WHERE block_id IN (${idList});`);
    d1Query(`INSERT INTO qr_iraab_book_display_blocks_fts (block_id, source_slug, surah_no, ayah_no, ayah_key, ayah_group_key, block_type, title_ar, title_en, text_ar, text_en, raw_text) SELECT id, source_slug, surah_no, ayah_no, ayah_key, ayah_group_key, block_type, title_ar, title_en, text_ar, text_en, raw_text FROM qr_iraab_book_display_blocks WHERE id IN (${idList});`);
  }

  return { surah, entries: entries.length, section: sectionChunks.length, depGraph: depGraphChunks.length, blocks: all.blocks.length, tags: all.tags.length, refs: all.refs.length, notes: all.notes.length, stmts: stmts.length };
}

async function main() {
  const args = parseArgs();

  const sourcesById = {};
  for (const s of d1Query('SELECT * FROM qr_irab_sources;')) sourcesById[s.id] = s;

  // ── ALL-SURAHS MODE ───────────────────────────────────────────────────────
  if (args.allSurahs) {
    const totals = { blocks: 0, tags: 0, refs: 0, notes: 0, stmts: 0 };
    const start = Date.now();
    for (let s = args.fromSurah; s <= args.toSurah; s++) {
      const sStart = Date.now();
      try {
        const r = await processSurah(args, sourcesById, s);
        totals.blocks += r.blocks; totals.tags += r.tags; totals.refs += r.refs; totals.notes += r.notes; totals.stmts += (r.stmts || 0);
        const dt = ((Date.now() - sStart) / 1000).toFixed(1);
        const elapsed = ((Date.now() - start) / 60000).toFixed(1);
        console.error(`[surah ${String(s).padStart(3)}] ${dt}s · blocks=${r.blocks} tags=${r.tags} refs=${r.refs} notes=${r.notes} · cumul blocks=${totals.blocks} · elapsed ${elapsed}min`);
      } catch (e) {
        console.error(`[surah ${s}] FAILED: ${e.message}`);
      }
    }
    const total = ((Date.now() - start) / 60000).toFixed(1);
    console.error(`\nDONE in ${total} min · totals: ${JSON.stringify(totals)}`);
    return;
  }

  // ── SINGLE-FILTER MODE (original behavior) ────────────────────────────────
  const surahsToRun = args.surah ? [args.surah] : [null];
  for (const s of surahsToRun) {
    const r = await processSurah(args, sourcesById, s);
    console.error(`Phase A: ${r.entries} entries → blocks`);
    console.error(`Phase B: ${r.section} section chunks → blocks`);
    console.error(`Phase C: ${r.depGraph} dep_graph chunks → blocks`);
    console.error(`TOTAL: ${r.blocks} blocks / ${r.tags} tags / ${r.refs} refs / ${r.notes} notes`);
    if (!args.apply && r.all) console.log(JSON.stringify(r.all, null, 2));
    else if (args.apply) console.error(`applied ${r.stmts} statements (+ FTS5 sync)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
