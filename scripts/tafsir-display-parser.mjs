#!/usr/bin/env node
// tafsir-display-parser.mjs
//
// Three-phase projection of qr_tafsir_entries into qr_tafsir_book_display_*
// (migration 012). Parallel to scripts/iraab-display-parser.mjs.
//
//   Phase A — entry projection (always)
//     Each qr_tafsir_entries row → one tafsir_card block + denormalized scholar
//     metadata. Long entries (>5000 chars) ALSO split into N paragraph_section
//     blocks (one per ~2000-char paragraph or per <p> if HTML).
//
//   Phase B — inline pattern extraction (7 patterns; can be toggled)
//     1. isnad        — حدثنا/أخبرنا chains (Tabari ⁕ separator)
//     2. voice_marker — قال أبو جعفر: (Tabari self-voice), etc.
//     3. poetry_quote — Abu Hayyan ؎ marker + ∗∗∗ hemistich
//     4. verse_anchor — قَوْلُهُ تَعالى: ﴿…﴾
//     5. quran_ref_chip — <span class="ayah-tag">[…]</span> or bare [Surah:ayah]
//     6. paradigm_chip — Muʿtazilī/Ashʿarī rebuttal markers
//     7. hadith_source_chip — [[المسند (5/133)]] volume refs (Ibn Kathir)
//
//   Phase C — editorial asides
//     [[…]] markers → notes rows, review_status='needs_review'
//
// HARD RULE: parser filters entry_type='explanation' AND excludes
// scholar_id IN ('QR:SCH:DARWISH','QR:SCH:SAFI') as belt-and-suspenders.
// DARWISH/SAFI live in qr_iraab_book_display_*, never here.
//
// Idempotency: every block carries source_tafsir_entry_id; on --apply, only
// review_status='ai_candidate' blocks for touched entries are deleted before
// re-insert. Approved blocks survive re-parse.

import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const QR_DB = 'km_quran';
const QR_CWD = new URL('../workers/quran/', import.meta.url);

// ─── Excluded scholars (must never leak into tafsir display) ─────────────────

const EXCLUDED_SCHOLARS = new Set(['QR:SCH:DARWISH', 'QR:SCH:SAFI']);

// ─── Patterns ────────────────────────────────────────────────────────────────

// Bracket-aware target detector (both () and ﴿﴾).
const TARGET_RE = /^\s*[\(\u{FD3F}]([^\)\u{FD3E}]+)[\)\u{FD3E}]\s*/u;

// Editorial asides [[…]]
const INLINE_ASIDE_RE = /\[\[([^\]]+?)\]\]/g;

// Highlighted span in qpc-hafs markup
const HLT_RE = /<span class="hlt">([\s\S]*?)<\/span>/g;

// <p>…</p> paragraph splitter (HTML tier sources)
const P_BLOCK_RE = /<p[^>]*>([\s\S]*?)<\/p>/g;

// Quran-ref chip patterns
const AYAH_TAG_HTML_RE = /<span class="ayah-tag">\[([^\]]+?)\]<\/span>/g;
const BARE_AYAH_REF_RE = /\[([^\]:]+?)\s*:\s*([\d٠-٩]+)\]/g;

// Isnad: starts with ⁕ (Tabari) or a حدثنا opener; ends at next . or .)
const HADDATHANA_OPENERS = /(حدثنا|حَدَّثَنَا|أخبرنا|أَخْبَرَنَا|حدثني|سمعت)/g;
const ISNAD_BLOCK_RE = /([⁕]\s*|^|\n)([^.]*?(?:حدثنا|حَدَّثَنَا|أخبرنا|أَخْبَرَنَا|حدثني|سمعت)[^.]*\.)/gu;

// Voice markers (speaker tags like "قال أبو جعفر:")
const VOICE_RE = /قال\s+(أبو\s+جعفر|الإمام\s+\S+|الزمخشري|الرازي|ابن\s+\S+|الطبري|الشافعي|أحمد|مالك)\s*:/gu;

// Poetry markers (Abu Hayyan)
const POETRY_LINE_RE = /؎([^؎\n]+)/g;
const HEMISTICH_RE = /(\S[^\n]*?)\s*∗∗∗\s*(\S[^\n]*?)(?=\n|$)/g;

// Verse-anchor opener
const VERSE_ANCHOR_RE = /قَوْلُهُ\s+تَعَالَى\s*:\s*[\u{FD3F}\(]([^\u{FD3E}\)]+)[\u{FD3E}\)]/gu;

// Paradigm rebuttal markers (Zamakhshari (ع), or "المعتزلة", etc.)
const PARADIGM_RE = /(المعتزلة|الأشاعرة|الجهمية|الخوارج|الشيعة|أهل\s+السنة)/g;

// Hadith source / volume citation in [[…]]
const HADITH_VOL_RE = /\[\[\s*(المسند|الصحيحين|صحيح\s+\S+|سنن\s+\S+)\s*\(([\d٠-٩\/\s]+)\)\s*\]\]/g;

// Diacritic stripper
const DIACRITICS_RE = /[ً-ْٰـ]/g;
const norm = (s) => (s ?? '').replace(DIACRITICS_RE, '').trim();
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);

// HTML helpers
const TAG_RE = /<[^>]+>/g;
function plain(s) {
  return String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(TAG_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}
// Maximum bytes per paragraph_section block. Some sources (Abū Ḥayyān,
// Zamakhsharī) have entries without <p> tags or paragraph breaks — the
// entire content is one wall of text. We hard-split those at sentence
// boundaries (. ! ?) near this length so no single row exceeds it.
const MAX_PARAGRAPH_BYTES = 3000;

/** Hard-split a long string at the nearest sentence/clause boundary <= max. */
function hardSplit(text, max) {
  const out = [];
  let rest = text;
  while (rest.length > max) {
    // Look for a sentence-ending punctuation in the last 15% of the window.
    const windowStart = Math.floor(max * 0.85);
    const window = rest.slice(0, max);
    const boundaryRe = /[.!?。!?؟]\s/g;
    let bestIdx = -1;
    let m;
    while ((m = boundaryRe.exec(window)) !== null) {
      if (m.index >= windowStart) bestIdx = m.index + 1;
    }
    if (bestIdx <= 0) {
      // No good boundary — fall back to nearest whitespace
      const wsIdx = rest.lastIndexOf(' ', max);
      bestIdx = wsIdx > windowStart ? wsIdx : max;
    }
    out.push(rest.slice(0, bestIdx).trim());
    rest = rest.slice(bestIdx).trim();
  }
  if (rest) out.push(rest);
  return out;
}

function splitParagraphs(htmlOrText) {
  if (!htmlOrText) return [];
  let chunks;
  if (/<p[\s>]/i.test(htmlOrText)) {
    chunks = [];
    let m;
    P_BLOCK_RE.lastIndex = 0;
    while ((m = P_BLOCK_RE.exec(htmlOrText)) !== null) {
      const p = m[1].trim();
      if (p) chunks.push(p);
    }
  } else {
    chunks = String(htmlOrText).split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
  }
  // Hard-split any oversized chunk so each paragraph_section row stays manageable.
  const out = [];
  for (const c of chunks) {
    if (c.length <= MAX_PARAGRAPH_BYTES) out.push(c);
    else out.push(...hardSplit(c, MAX_PARAGRAPH_BYTES));
  }
  return out;
}

// ─── Group key utilities ─────────────────────────────────────────────────────

function buildAyahKeys(surah, ayahFrom, ayahTo) {
  if (surah == null || ayahFrom == null) return [];
  const to = ayahTo ?? ayahFrom;
  const keys = [];
  for (let a = ayahFrom; a <= to; a++) keys.push(`${surah}:${a}`);
  return keys;
}
function groupKey(keys) {
  if (!keys.length) return null;
  if (keys.length === 1) return keys[0];
  const first = keys[0];
  const last = keys[keys.length - 1];
  const [, lastAyah] = last.split(':');
  return `${first}-${lastAyah}`;
}

// ─── Stable IDs ──────────────────────────────────────────────────────────────

const blockId = (entryId, kind, order, pIdx = '') =>
  `TAFSIR_BLK_${sha(`${entryId}|${kind}|${order}|${pIdx}`)}`;
const tagId = (bId, kind, value) => `TAFSIR_TAG_${sha(`${bId}|${kind}|${value}`)}`;
const refId = (bId, kind, key)   => `TAFSIR_REF_${sha(`${bId}|${kind}|${key}`)}`;
const noteId = (bId, kind, body) => `TAFSIR_NOTE_${sha(`${bId}|${kind}|${body}`)}`;
const linkId = (from, to, kind)  => `TAFSIR_LNK_${sha(`${from}|${to}|${kind}`)}`;

// ─── Locator builder ─────────────────────────────────────────────────────────

function locatorFromEntry(entry) {
  const keys = buildAyahKeys(entry.surah, entry.ayah_from, entry.ayah_to);
  const ayah_group_key = groupKey(keys);
  const ayah_key = keys[0] ?? null;
  return {
    surah_no: entry.surah,
    ayah_no: entry.ayah_from,
    ayah_to: entry.ayah_to,
    ayah_key,
    ayah_group_key,
    ayah_keys_json: keys.length ? JSON.stringify(keys) : null,
    is_grouped: keys.length > 1 ? 1 : 0,
  };
}

// ─── Theology / narration tag harvest ────────────────────────────────────────

const NARRATION_VOCAB = ['صحيح مسلم','صحيح البخاري','المسند','سنن الترمذي','سنن أبي داود','سنن النسائي','سنن ابن ماجه','الموطأ','مستدرك الحاكم'];
const THEOLOGY_VOCAB  = ['التوحيد','الصفات','القدر','الإيمان','الكفر','المعتزلة','الأشاعرة','الجهمية','الخوارج','الكلام','الجبر','الاختيار','الرؤية','الشفاعة','العدل'];

function harvest(text, vocab) {
  const found = new Set();
  for (const t of vocab) if (text.includes(t)) found.add(t);
  return [...found];
}

// ─── PHASE A: entries → tafsir_card + paragraph_section blocks ───────────────

const LONG_THRESHOLD = 5000;
const PARAGRAPH_TARGET_LEN = 2000;

/**
 * Project one qr_tafsir_entries row into:
 *   - 1 tafsir_card (header summary)
 *   - N paragraph_section blocks if len > 5000
 *   - side rows (tags, refs)
 */
export function buildBlocksFromEntry(entry, source = null) {
  const blocks = [];
  const tags = [];
  const refs = [];
  const notes = [];

  if (!entry?.id) return { blocks, tags, refs, notes };
  if (entry.entry_type && entry.entry_type !== 'explanation') return { blocks, tags, refs, notes };
  if (EXCLUDED_SCHOLARS.has(entry.scholar_id)) return { blocks, tags, refs, notes };

  const loc = locatorFromEntry(entry);
  const rawText = entry.content_ar || '';
  const stripped = plain(rawText);
  const isLong = stripped.length > LONG_THRESHOLD;
  const markupTier = source?.markup_tier ?? 'minimal';

  const common = {
    source_id:               source?.id ?? null,
    source_tafsir_entry_id:  entry.id,
    source_slug:             source?.source_slug ?? null,
    book_title:              source?.book_title_en ?? source?.book_title_ar ?? null,
    author:                  source?.author_name_en ?? source?.author_name_ar ?? null,
    scholar_id:              entry.scholar_id,
    work_id:                 entry.work_id,
    scholar_name_ar:         source?.author_name_ar ?? null,
    scholar_name_en:         source?.author_name_en ?? null,
    madhab:                  source?.madhab ?? null,
    era:                     source?.era ?? null,
    kalam_school:            source?.kalam_school ?? null,
    death_year_hijri:        source?.death_year_hijri ?? null,
    ...loc,
  };

  const paragraphs = splitParagraphs(rawText);
  const paragraphCount = isLong ? Math.max(paragraphs.length, 1) : 0;

  // (1) tafsir_card — header summary, contains first ~400 chars as a preview
  const cardOrder = 0;
  const cardId = blockId(entry.id, 'tafsir_card', cardOrder);
  const cardText = isLong ? stripped.slice(0, 600) + '…' : stripped;
  // For long entries the card is just a summary — the full raw is preserved
  // across paragraph_section blocks. Storing the entire ~60KB content_ar on
  // the card row blows ARG_MAX during wrangler --command writes (especially
  // Abū Ḥayyān, max ~60KB raw + ~20KB stripped per single INSERT).
  // Cap card-level raw_text to ~2KB; the UI can fetch full source from
  // qr_tafsir_entries.content_ar via /qr/tafsir/by-ids if needed.
  const cardRaw = isLong ? rawText.slice(0, 2000) : rawText;
  const narrTags = harvest(stripped, NARRATION_VOCAB);
  const theoTags = harvest(stripped, THEOLOGY_VOCAB);

  blocks.push({
    id: cardId,
    ...common,
    word_index: null,
    word_text: null,
    phrase_text: null,
    scope_type: common.is_grouped ? 'ayah_group' : 'ayah',
    block_type: 'tafsir_card',
    block_subtype: 'entry_summary',
    display_order: cardOrder,
    paragraph_index: null,
    paragraph_count: paragraphCount,
    is_long_form: isLong ? 1 : 0,
    title_ar: null,
    title_en: null,
    text_ar: cardText,
    text_en: entry.content_en ?? null,
    raw_text: cardRaw,
    markup_tier: markupTier,
    source_page: entry.source_page ?? null,
    tags_json: JSON.stringify(['explanation', source?.source_slug].filter(Boolean)),
    grammar_tags_json: null,
    theology_tags_json: theoTags.length ? JSON.stringify(theoTags) : null,
    narration_tags_json: narrTags.length ? JSON.stringify(narrTags) : null,
    quran_refs_json: JSON.stringify([{
      surah: common.surah_no, ayah: common.ayah_no,
      ayah_key: common.ayah_key, ayah_group_key: common.ayah_group_key,
    }]),
    scholar_refs_json: null,
    backlinks_json: null,
    related_links_json: null,
    external_resource_json: null,
    confidence: 'high',
    review_status: 'ai_candidate',
    extraction_method: 'entry_projection',
    meta_json: JSON.stringify({
      total_length: stripped.length,
      paragraph_count: paragraphCount,
      source_quote_hash: sha(stripped.slice(0, 256)),
    }),
  });

  // Tag side rows
  const pushTag = (bId, kind, value) => tags.push({
    id: tagId(bId, kind, value), block_id: bId, tag_kind: kind, tag_value: value,
    tag_value_norm: norm(value), display_order: tags.length,
  });
  pushTag(cardId, 'general', 'explanation');
  if (source?.source_slug) pushTag(cardId, 'general', source.source_slug);
  if (source?.madhab) pushTag(cardId, 'madhab', source.madhab);
  if (source?.era) pushTag(cardId, 'general', source.era);
  for (const t of narrTags) pushTag(cardId, 'narration', t);
  for (const t of theoTags) pushTag(cardId, 'theology', t);

  // Ref rows — one per ayah in the group
  const ayahKeys = JSON.parse(common.ayah_keys_json || '[]');
  for (const key of ayahKeys) {
    const [sStr, aStr] = key.split(':');
    refs.push({
      id: refId(cardId, 'ayah', key),
      block_id: cardId,
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

  // (2) paragraph_section blocks if long
  if (isLong) {
    let order = 1;
    for (let i = 0; i < paragraphs.length; i++) {
      const pRaw = paragraphs[i];
      const pStripped = plain(pRaw);
      if (!pStripped) continue;
      // Skip pure markup paragraphs (e.g. just a page-num tag)
      if (pStripped.length < 20) continue;

      const pId = blockId(entry.id, 'paragraph_section', order, i);
      // Only keep raw_text on the paragraph if it actually differs from text_ar
      // (i.e. has HTML markup the renderer might want). Otherwise null it out
      // to halve the row size — saves a LOT for unmarked sources like Zamakhsharī.
      const paragraphRaw = (pRaw.trim() === pStripped.trim()) ? null : pRaw;
      blocks.push({
        id: pId,
        ...common,
        word_index: null,
        word_text: null,
        phrase_text: null,
        scope_type: common.is_grouped ? 'ayah_group' : 'ayah',
        block_type: 'paragraph_section',
        block_subtype: 'long_form_split',
        display_order: order,
        paragraph_index: i,
        paragraph_count: paragraphCount,
        is_long_form: 1,
        title_ar: null,
        title_en: null,
        text_ar: pStripped,
        text_en: null,
        raw_text: paragraphRaw,
        markup_tier: markupTier,
        source_page: entry.source_page ?? null,
        tags_json: JSON.stringify(['paragraph', source?.source_slug].filter(Boolean)),
        grammar_tags_json: null,
        theology_tags_json: null,
        narration_tags_json: null,
        quran_refs_json: JSON.stringify([{
          surah: common.surah_no, ayah: common.ayah_no,
          ayah_key: common.ayah_key, ayah_group_key: common.ayah_group_key,
        }]),
        scholar_refs_json: null,
        backlinks_json: null,
        related_links_json: null,
        external_resource_json: null,
        confidence: 'high',
        review_status: 'ai_candidate',
        extraction_method: 'entry_projection',
        meta_json: null,
      });
      order++;
    }
  }

  return { blocks, tags, refs, notes };
}

// ─── PHASE B: inline pattern extraction ──────────────────────────────────────

/**
 * Scan the entry's content_ar for inline patterns and emit auxiliary blocks.
 * All flagged as ai_candidate; manual review promotes.
 */
export function extractInlineBlocks(entry, source = null, opts = {}) {
  const {
    extractIsnad = true,
    extractVoice = true,
    extractPoetry = true,
    extractVerseAnchor = true,
    extractQuranRefChips = true,
    extractParadigm = true,
    extractHadithSource = true,
  } = opts;

  const blocks = [];
  const refs = [];
  const links = [];
  if (!entry?.id || EXCLUDED_SCHOLARS.has(entry.scholar_id)) return { blocks, refs, links };
  if (entry.entry_type && entry.entry_type !== 'explanation') return { blocks, refs, links };

  const rawText = entry.content_ar || '';
  const stripped = plain(rawText);
  const loc = locatorFromEntry(entry);
  const markupTier = source?.markup_tier ?? 'minimal';

  const baseCommon = {
    source_id:              source?.id ?? null,
    source_tafsir_entry_id: entry.id,
    source_slug:            source?.source_slug ?? null,
    book_title:             source?.book_title_en ?? source?.book_title_ar ?? null,
    author:                 source?.author_name_en ?? source?.author_name_ar ?? null,
    scholar_id:             entry.scholar_id,
    work_id:                entry.work_id,
    scholar_name_ar:        source?.author_name_ar ?? null,
    scholar_name_en:        source?.author_name_en ?? null,
    madhab:                 source?.madhab ?? null,
    era:                    source?.era ?? null,
    kalam_school:           source?.kalam_school ?? null,
    death_year_hijri:       source?.death_year_hijri ?? null,
    ...loc,
    paragraph_index:        null,
    paragraph_count:        null,
    is_long_form:           0,
    markup_tier:            markupTier,
    source_page:            entry.source_page ?? null,
    text_en:                null,
    grammar_tags_json:      null,
    theology_tags_json:     null,
    narration_tags_json:    null,
    quran_refs_json:        JSON.stringify([{
      surah: loc.surah_no, ayah: loc.ayah_no,
      ayah_key: loc.ayah_key, ayah_group_key: loc.ayah_group_key,
    }]),
    scholar_refs_json:      null,
    backlinks_json:         null,
    related_links_json:     null,
    external_resource_json: null,
    confidence:             'medium',
    review_status:          'ai_candidate',
    extraction_method:      'regex_parser',
  };

  let order = 1000;        // start phase-B blocks at a high order to avoid clashing with paragraph_section
  const nextOrder = () => order++;

  const mkBlock = (id, type, subtype, ar, raw, metaExtra = null, tagBase = []) => ({
    id,
    ...baseCommon,
    block_type: type,
    block_subtype: subtype,
    display_order: nextOrder(),
    word_text: null,
    phrase_text: null,
    scope_type: loc.is_grouped ? 'ayah_group' : 'ayah',
    word_index: null,
    title_ar: null,
    title_en: null,
    text_ar: ar,
    raw_text: raw,
    tags_json: JSON.stringify([type, ...tagBase, source?.source_slug].filter(Boolean)),
    meta_json: metaExtra ? JSON.stringify(metaExtra) : null,
  });

  // 1. isnad chains (Tabari / Ibn Kathir mainly)
  if (extractIsnad && /(حدثنا|حَدَّثَنَا|أخبرنا|أَخْبَرَنَا)/.test(stripped)) {
    ISNAD_BLOCK_RE.lastIndex = 0;
    let m;
    while ((m = ISNAD_BLOCK_RE.exec(stripped)) !== null) {
      const chainRaw = (m[1] + m[2]).trim();
      if (chainRaw.length < 20) continue;
      // Parse chain links by splitting on relator verbs / commas
      const linkSegments = chainRaw.split(/\s*(?:،|,|\bعن\b|\bقال\b)\s*/u).map(s => s.trim()).filter(Boolean);
      const id = blockId(entry.id, 'isnad', order, sha(chainRaw).slice(0, 8));
      blocks.push(mkBlock(id, 'isnad', 'narration_chain', chainRaw, chainRaw,
        {
          isnad: {
            raw_ar: chainRaw,
            links: linkSegments.slice(0, 12).map((seg, idx) => ({ narrator_text: seg, position: idx })),
            separator: chainRaw.startsWith('⁕') ? '⁕' : 'inline',
          },
        },
        ['narration', 'isnad']));
    }
  }

  // 2. voice markers (speaker tags)
  if (extractVoice) {
    VOICE_RE.lastIndex = 0;
    let m;
    while ((m = VOICE_RE.exec(stripped)) !== null) {
      const speaker = m[1].trim();
      const phrase = m[0].trim();
      const id = blockId(entry.id, 'voice_marker', order, sha(phrase).slice(0, 8));
      blocks.push(mkBlock(id, 'voice_marker', 'speaker_tag', speaker, phrase,
        { speaker, raw_phrase: phrase },
        ['voice']));
    }
  }

  // 3. poetry quotes (Abu Hayyan ؎)
  if (extractPoetry && stripped.includes('؎')) {
    POETRY_LINE_RE.lastIndex = 0;
    let m;
    while ((m = POETRY_LINE_RE.exec(stripped)) !== null) {
      const line = m[1].trim();
      if (line.length < 10) continue;
      const id = blockId(entry.id, 'poetry_quote', order, sha(line).slice(0, 8));
      blocks.push(mkBlock(id, 'poetry_quote', 'shahid', line, '؎' + line,
        { has_hemistich: line.includes('∗∗∗') },
        ['poetry']));
    }
  }

  // 4. verse-anchor openers
  if (extractVerseAnchor) {
    VERSE_ANCHOR_RE.lastIndex = 0;
    let m;
    while ((m = VERSE_ANCHOR_RE.exec(stripped)) !== null) {
      const verse = m[1].trim();
      if (verse.length < 4) continue;
      const id = blockId(entry.id, 'verse_anchor', order, sha(verse).slice(0, 8));
      blocks.push(mkBlock(id, 'verse_anchor', 'qawluhu_taala', verse, m[0],
        { verse_text: verse }, ['anchor']));
    }
  }

  // 5. cross-ref chips
  if (extractQuranRefChips) {
    const seen = new Set();
    const pushChip = (label, surahName, ayahNum, raw) => {
      const key = `${surahName}:${ayahNum}`;
      if (seen.has(key)) return;
      seen.add(key);
      const id = blockId(entry.id, 'quran_ref_chip', order, sha(key).slice(0, 8));
      blocks.push(mkBlock(id, 'quran_ref_chip', 'cross_ref', label, raw,
        { surah_name_ar: surahName, ayah_str: ayahNum }, ['cross_ref']));
      // also as a ref row
      refs.push({
        id: refId(id, 'ayah', key), block_id: id, ref_kind: 'ayah',
        surah_no: null, ayah_no: null, ayah_to: null, ayah_key: null, ayah_group_key: null,
        word_index: null, typed_ref: `QR_NAMED:${surahName}:${ayahNum}`, label: key,
        meta_json: null,
      });
    };
    AYAH_TAG_HTML_RE.lastIndex = 0;
    let m;
    while ((m = AYAH_TAG_HTML_RE.exec(rawText)) !== null) {
      const inside = m[1].trim();
      const parts = inside.split(/\s*:\s*/);
      if (parts.length === 2) pushChip(inside, parts[0], parts[1], m[0]);
    }
    BARE_AYAH_REF_RE.lastIndex = 0;
    while ((m = BARE_AYAH_REF_RE.exec(stripped)) !== null) {
      pushChip(`${m[1]}:${m[2]}`, m[1].trim(), m[2].trim(), m[0]);
    }
  }

  // 6. paradigm chip (Mu'tazili / Ash'ari mentions in body)
  if (extractParadigm) {
    PARADIGM_RE.lastIndex = 0;
    const seen = new Set();
    let m;
    while ((m = PARADIGM_RE.exec(stripped)) !== null) {
      const term = m[1];
      if (seen.has(term)) continue;
      seen.add(term);
      const id = blockId(entry.id, 'paradigm_chip', order, sha(term).slice(0, 8));
      blocks.push(mkBlock(id, 'paradigm_chip', 'school_mention', term, term,
        { paradigm: term }, ['paradigm']));
    }
  }

  // 7. hadith source citations [[المسند (5/133)]]
  if (extractHadithSource) {
    HADITH_VOL_RE.lastIndex = 0;
    let m;
    while ((m = HADITH_VOL_RE.exec(rawText)) !== null) {
      const book = m[1].trim();
      const volRef = m[2].replace(/\s+/g, '');
      const label = `${book} (${volRef})`;
      const id = blockId(entry.id, 'hadith_source_chip', order, sha(label).slice(0, 8));
      blocks.push(mkBlock(id, 'hadith_source_chip', 'volume_ref', label, m[0],
        { hadith_book: book, volume_page: volRef }, ['narration', 'source_chip']));
      refs.push({
        id: refId(id, 'hadith_source', label), block_id: id, ref_kind: 'hadith_source',
        surah_no: null, ayah_no: null, ayah_to: null, ayah_key: null, ayah_group_key: null,
        word_index: null, typed_ref: `HADITH:${book}:${volRef}`, label,
        meta_json: null,
      });
    }
  }

  return { blocks, refs, links };
}

// ─── PHASE C: editorial asides → notes ───────────────────────────────────────

export function extractAsideNotes(entry, source = null, parentBlockId = null) {
  const notes = [];
  if (!entry?.content_ar) return notes;
  if (EXCLUDED_SCHOLARS.has(entry.scholar_id)) return notes;

  const loc = locatorFromEntry(entry);
  INLINE_ASIDE_RE.lastIndex = 0;
  let m;
  let order = 0;
  while ((m = INLINE_ASIDE_RE.exec(entry.content_ar)) !== null) {
    const body = plain(m[1]);
    if (!body || body.length < 5) continue;
    // Detect Mu'tazili rebuttal asides specifically
    const isMutazili = /\(ع\)\s*$/.test(m[1]) || /المعتزلة/.test(body);
    notes.push({
      id: noteId(parentBlockId ?? entry.id, 'aside', m[1]),
      block_id: parentBlockId,
      note_kind: isMutazili ? 'mutazili_rebuttal' : 'editorial',
      note_text_ar: body,
      note_text_en: null,
      is_inline: 1,
      surah_no: loc.surah_no,
      ayah_no: loc.ayah_no,
      ayah_key: loc.ayah_key,
      ayah_group_key: loc.ayah_group_key,
      source_slug: source?.source_slug ?? null,
      scholar_id: entry.scholar_id,
      display_order: order++,
      meta_json: JSON.stringify({ raw_marker: m[0] }),
      review_status: 'needs_review',
    });
  }
  return notes;
}

// ─── Unified entry-level dispatch ────────────────────────────────────────────

export function buildDisplayFromEntry(entry, source = null, opts = {}) {
  const all = { blocks: [], tags: [], refs: [], notes: [], links: [] };
  const a = buildBlocksFromEntry(entry, source);
  for (const k of ['blocks', 'tags', 'refs', 'notes']) all[k].push(...a[k]);
  const b = extractInlineBlocks(entry, source, opts);
  for (const k of ['blocks', 'refs', 'links']) all[k].push(...b[k]);
  // Phase C: attach asides to the tafsir_card if present
  const cardBlock = all.blocks.find(x => x.block_type === 'tafsir_card');
  const cNotes = extractAsideNotes(entry, source, cardBlock?.id ?? null);
  all.notes.push(...cNotes);
  return all;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const a = {
    surah: null, scholar: null, slug: null,
    allSurahs: false, fromSurah: 1, toSurah: 114,
    limit: 30000,
    apply: false,
    skipPhaseB: false,
    skipPhaseC: false,
  };
  for (let i = 2; i < process.argv.length; i++) {
    const v = process.argv[i];
    if (v === '--surah') a.surah = Number(process.argv[++i]);
    else if (v === '--scholar') a.scholar = process.argv[++i];
    else if (v === '--slug') a.slug = process.argv[++i];
    else if (v === '--all-surahs') a.allSurahs = true;
    else if (v === '--from-surah') a.fromSurah = Number(process.argv[++i]);
    else if (v === '--to-surah') a.toSurah = Number(process.argv[++i]);
    else if (v === '--limit') a.limit = Number(process.argv[++i]);
    else if (v === '--apply') a.apply = true;
    else if (v === '--no-phase-b') a.skipPhaseB = true;
    else if (v === '--no-phase-c') a.skipPhaseC = true;
  }
  return a;
}

function d1Query(sql) {
  const out = execFileSync('npx',
    ['wrangler', 'd1', 'execute', QR_DB, '--remote', '--json', '--command', sql],
    { cwd: QR_CWD, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return JSON.parse(out)?.[0]?.results ?? [];
}

/**
 * Execute SQL too large for --command (E2BIG) by writing to a temp file and
 * piping via --file. Used for bulk INSERT batches where content_ar can be
 * tens of KB per row and 100 statements would exceed ARG_MAX.
 */
function d1ExecFile(sql) {
  const file = join(tmpdir(), `tafsir-batch-${randomUUID().slice(0, 8)}.sql`);
  writeFileSync(file, sql, 'utf8');
  try {
    execFileSync('npx',
      ['wrangler', 'd1', 'execute', QR_DB, '--remote', '--file', file],
      { cwd: QR_CWD, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } finally {
    try { unlinkSync(file); } catch {}
  }
}
// Per-field safety cap. Any single TEXT field above this is truncated with a
// trailing "…[TRUNCATED]" marker so a future re-parse can refresh from the
// canonical qr_tafsir_entries row. ARG_MAX on macOS via execFileSync is ~128KB
// for the full command — capping fields at 25KB keeps any single row well under.
const MAX_FIELD_BYTES = 25 * 1024;
function sqlEsc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  let s = String(v);
  if (s.length > MAX_FIELD_BYTES) s = s.slice(0, MAX_FIELD_BYTES) + '…[TRUNCATED]';
  return `'${s.replace(/'/g, "''")}'`;
}
function insertSQL(table, row) {
  const cols = Object.keys(row);
  const vals = cols.map(c => sqlEsc(row[c]));
  return `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

async function processSurah(args, sourcesBySlug, sourcesByScholar, surah) {
  const clauses = ["entry_type='explanation'",
                   "scholar_id NOT IN ('QR:SCH:DARWISH','QR:SCH:SAFI')"];
  if (surah) clauses.push(`surah = ${surah}`);
  if (args.scholar) clauses.push(`scholar_id = ${sqlEsc(args.scholar)}`);
  if (args.slug) {
    // Look up scholar_id from slug
    const s = sourcesBySlug[args.slug];
    if (s) clauses.push(`scholar_id = ${sqlEsc(s.scholar_id)}`);
  }
  const where = 'WHERE ' + clauses.join(' AND ');
  const sql = `SELECT * FROM qr_tafsir_entries ${where} ORDER BY surah, ayah_from, scholar_id LIMIT ${args.limit};`;
  const entries = d1Query(sql);

  const all = { blocks: [], tags: [], refs: [], notes: [], links: [] };
  const opts = {
    extractIsnad:        !args.skipPhaseB,
    extractVoice:        !args.skipPhaseB,
    extractPoetry:       !args.skipPhaseB,
    extractVerseAnchor:  !args.skipPhaseB,
    extractQuranRefChips:!args.skipPhaseB,
    extractParadigm:     !args.skipPhaseB,
    extractHadithSource: !args.skipPhaseB,
  };
  for (const e of entries) {
    const source = sourcesByScholar[e.scholar_id];
    const built = buildDisplayFromEntry(e, source, opts);
    if (args.skipPhaseC) built.notes = built.notes.filter(n => n.note_kind !== 'editorial' && n.note_kind !== 'mutazili_rebuttal');
    for (const k of Object.keys(all)) all[k].push(...built[k]);
  }

  if (!args.apply) {
    return { surah, entries: entries.length, ...Object.fromEntries(Object.entries(all).map(([k,v])=>[k,v.length])), all };
  }

  // Idempotent reset
  const touchedEntryIds = [...new Set(all.blocks.map(b => b.source_tafsir_entry_id).filter(Boolean))];
  for (let i = 0; i < touchedEntryIds.length; i += 200) {
    const idList = touchedEntryIds.slice(i, i + 200).map(sqlEsc).join(',');
    d1Query(`DELETE FROM qr_tafsir_book_display_blocks WHERE source_tafsir_entry_id IN (${idList}) AND review_status='ai_candidate';`);
  }

  const stmts = [
    ...all.blocks.map(r => insertSQL('qr_tafsir_book_display_blocks', r)),
    ...all.tags.map(r => insertSQL('qr_tafsir_book_display_tags', r)),
    ...all.refs.map(r => insertSQL('qr_tafsir_book_display_refs', r)),
    ...all.notes.map(r => insertSQL('qr_tafsir_book_display_notes', r)),
    ...all.links.map(r => insertSQL('qr_tafsir_book_display_links', r)),
  ];
  // Byte-budgeted --command batching. Constraints:
  //   - ARG_MAX on macOS for execFileSync is conservatively ~128KB per command
  //   - D1 transaction timeout bites if a single command writes too many rows
  //   - tafsir content_ar can be tens of KB per row, dwarfing the iʿrāb case
  // Empirical-safe ceiling: 96KB per --command + 8-row cap.
  // (We tried --file mode but the D1 import endpoint requires different auth.)
  const BATCH_BYTES = 96 * 1024;
  const BATCH_ROWS  = 8;
  let buf = [];
  let bufBytes = 0;
  const flushBuf = () => {
    if (!buf.length) return;
    d1Query(buf.join('\n'));
    buf = []; bufBytes = 0;
  };
  for (const s of stmts) {
    const len = s.length + 1;
    // If a single statement is bigger than the byte cap, flush what we have
    // and run that single statement alone (best effort — may still ARG_MAX
    // on the longest entries, in which case we skip it and log).
    if (len > BATCH_BYTES) {
      flushBuf();
      try { d1Query(s); } catch (e) { console.error(`  oversized row skipped: ${e.message?.slice(0,80)}`); }
      continue;
    }
    if ((bufBytes + len > BATCH_BYTES || buf.length >= BATCH_ROWS) && buf.length) flushBuf();
    buf.push(s); bufBytes += len;
  }
  flushBuf();

  // FTS5 sync — DELETE+INSERT pairs. Small batches (50 ids) to stay safely
  // under any single-statement size + transaction-time limit. The INSERT is
  // SELECT-based so it doesn't blow up via --command argument size.
  const blockIds = all.blocks.map(b => b.id);
  for (let i = 0; i < blockIds.length; i += 50) {
    const idList = blockIds.slice(i, i + 50).map(sqlEsc).join(',');
    d1Query(`DELETE FROM qr_tafsir_book_display_blocks_fts WHERE block_id IN (${idList});`);
    d1Query(`INSERT INTO qr_tafsir_book_display_blocks_fts (block_id, source_slug, scholar_id, madhab, era, surah_no, ayah_no, ayah_key, ayah_group_key, block_type, title_ar, title_en, text_ar, text_en, raw_text) SELECT id, source_slug, scholar_id, madhab, era, surah_no, ayah_no, ayah_key, ayah_group_key, block_type, title_ar, title_en, text_ar, text_en, raw_text FROM qr_tafsir_book_display_blocks WHERE id IN (${idList});`);
  }

  return { surah, entries: entries.length, ...Object.fromEntries(Object.entries(all).map(([k,v])=>[k,v.length])), stmts: stmts.length };
}

async function main() {
  const args = parseArgs();
  const sources = d1Query('SELECT * FROM qr_tafsir_book_display_sources;');
  const sourcesBySlug = Object.fromEntries(sources.map(s => [s.source_slug, s]));
  const sourcesByScholar = Object.fromEntries(sources.map(s => [s.scholar_id, s]));
  console.error(`Loaded ${sources.length} display-tier sources.`);

  if (args.allSurahs) {
    const totals = { blocks: 0, tags: 0, refs: 0, notes: 0, links: 0, stmts: 0 };
    const start = Date.now();
    for (let s = args.fromSurah; s <= args.toSurah; s++) {
      const sStart = Date.now();
      try {
        const r = await processSurah(args, sourcesBySlug, sourcesByScholar, s);
        for (const k of Object.keys(totals)) totals[k] += (r[k] || 0);
        const dt = ((Date.now() - sStart) / 1000).toFixed(1);
        const el = ((Date.now() - start) / 60000).toFixed(1);
        console.error(`[surah ${String(s).padStart(3)}] ${dt}s · entries=${r.entries} blocks=${r.blocks} tags=${r.tags} refs=${r.refs} notes=${r.notes} · cumul blocks=${totals.blocks} · elapsed ${el}min`);
      } catch (e) {
        console.error(`[surah ${s}] FAILED: ${e.message}`);
      }
    }
    const total = ((Date.now() - start) / 60000).toFixed(1);
    console.error(`\nDONE in ${total} min · totals: ${JSON.stringify(totals)}`);
    return;
  }

  const surahsToRun = args.surah ? [args.surah] : [null];
  for (const s of surahsToRun) {
    const r = await processSurah(args, sourcesBySlug, sourcesByScholar, s);
    console.error(`entries=${r.entries} blocks=${r.blocks} tags=${r.tags} refs=${r.refs} notes=${r.notes} links=${r.links}`);
    if (!args.apply && r.all) console.log(JSON.stringify(r.all, null, 2));
    else if (args.apply) console.error(`applied ${r.stmts} statements (+ FTS5 sync)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e); process.exit(1); });
}
