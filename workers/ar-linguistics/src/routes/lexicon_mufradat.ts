// ─── /al/lex/v2/read/ketabonline_al_raghib_mufradat/:root_norm ───────────────
//
// Reader-ready endpoint for Mufradat al-Quran (al-Raghib al-Isfahani).
//
// Why a per-source endpoint:
//   The generic /al/lex/v2/entry returns raw ingestion blocks — fine for
//   cross-source comparison, useless for rendering. Each lexicon has its
//   own discourse conventions (Mufradat: inline [Sura/Aya] brackets +
//   (( N )) footnote marks + occasional قول الشاعر cues), so each source
//   gets its own composer that knows how to turn the raw text into typed
//   reader paragraphs.
//
// What this composer fills in over the raw entry:
//   ▸ All inline Quran citations parsed into structured refs with the
//     surah name resolved to surah_num (1–114) via the canonical map.
//     (The quran_refs DB table only covers ~25% of the inline brackets.)
//   ▸ Footnote markers `(( N ))` collected entry-wide so the reader can
//     show a notes panel. Backing text is left null when the ingestion
//     pipeline never captured it.
//   ▸ Paragraph kinds: prose | poetry | hadith | qira_variant | editorial.
//     Mufradat ingestion tags poetry_quote / hadith_quote blocks (~2%
//     of blocks); we honor those when present and detect cue lines
//     (`قول الشاعر:`, `قال الراجز:`, `وفي الحديث:`) inside prose to
//     promote the next short line into a poetry/hadith paragraph.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { normalizeSurahName } from '../data/surah_names';

const SOURCE_SLUG = 'ketabonline_al_raghib_mufradat';
const SOURCE_META = {
  slug: SOURCE_SLUG,
  title_ar: 'مفردات القرآن',
  title_en: 'Mufradat al-Quran',
  author: 'الراغب الأصفهاني',
  period: 'كلاسيكي',
  origin: 'ketabonline' as const,
};

// ── Response shape ───────────────────────────────────────────────────────────

interface ProseToken_Text { kind: 'text'; value: string; }
interface ProseToken_Quran {
  kind: 'quran';
  surah: string;             // raw spelling from source
  surah_num: number | null;  // canonical 1–114, null if unmappable
  ayah: number;
  ayah_to: number | null;
  raw: string;               // the original bracket, e.g. "[النحل/ ١]"
}
interface ProseToken_Footnote {
  kind: 'footnote';
  num: number;
  has_text: boolean;
  text: string | null;        // backing text, or null when not in DB
  printed_page: number | null; // which printed page this marker sits on
}
interface ProseToken_ParenQuote { kind: 'paren_quote'; value: string; }  // (( قراءة ابن مسعود ))
interface ProseToken_LineBreak { kind: 'br'; }
type ProseToken =
  | ProseToken_Text | ProseToken_Quran | ProseToken_Footnote
  | ProseToken_ParenQuote | ProseToken_LineBreak;

type MufradatParagraph =
  | { kind: 'prose'; tokens: ProseToken[] }
  | { kind: 'poetry'; cue: string | null; verses: string[]; attribution: string | null }
  | { kind: 'hadith'; cue: string | null; tokens: ProseToken[] }
  | { kind: 'qira_variant'; reader: string | null; tokens: ProseToken[] }
  | { kind: 'editorial'; tokens: ProseToken[] };

interface MufradatSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: MufradatParagraph[];
}

interface MufradatReadView {
  kind: 'mufradat';
  meta: typeof SOURCE_META;
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: {
    id: string; root_text: string; root_letters: string; root_type: string;
    frequency_quran: number | null; meaning_core_en: string | null;
  } | null;
  sections: MufradatSection[];
  footnotes: { num: number; text: string | null; printed_page: number | null }[];
  quran_citations: {
    surah: string; surah_num: number | null; ayah: number; ayah_to: number | null;
    raw: string; count: number;
  }[];
  stats: {
    paragraphs: number; poetry: number; hadith: number; qira_variants: number;
    quran_citations: number; footnote_markers: number;
  };
}

// ── Public route ─────────────────────────────────────────────────────────────

export function lexiconMufradatRoutes(router: Router<ArLinguisticsEnv>) {
  // Edge-cached per (root) — Mufradat entries are immutable post-ingest.
  router.get(
    `/al/lex/v2/read/${SOURCE_SLUG}/:root_norm`,
    (req, env, params) => cached(req, async () => {
      const root_norm = decodeURIComponent(params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      const entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id
         FROM ar_ling_lexicon_root_entries
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(SOURCE_SLUG, root_norm).first<any>();
      if (!entry) return notFound('entry not found in Mufradat');

      const sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no
         FROM ar_ling_lexicon_entry_sections
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, data_json
         FROM ar_ling_lexicon_blocks
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const view = composeView(entry, sectionsRaw, blocks, canonical);
      return ok(view);
    }),
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function composeView(
  entry: any,
  rawSections: any[],
  rawBlocks: any[],
  canonical: any | null,
): MufradatReadView {
  // Footnote backing text from `block_type='footnote'` blocks, if any.
  const fnBacking = collectFootnoteBacking(rawBlocks);

  const entryStartPage = Number(entry.page_start) || 1;

  const sections: MufradatSection[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);
    const paragraphs = composeParagraphs(s.text_ar ?? '', sectionBlocks, fnBacking);
    // Walk all footnote tokens in reading order. The source restarts
    // footnote numbering on each printed page, so a marker number that is
    // less than or equal to the previous one signals a page boundary.
    let curPage = entryStartPage;
    let lastN = 0;
    for (const p of paragraphs) {
      if (!('tokens' in p)) continue;
      for (const tok of p.tokens) {
        if (tok.kind !== 'footnote') continue;
        if (tok.num <= lastN) curPage++;
        lastN = tok.num;
        tok.printed_page = curPage;
        // Prefer the precise (page, num) lookup; fall back to the
        // legacy num-only map so single-page entries still resolve when
        // backing rows lack a printed_page value.
        const text =
          fnBacking.byPageNum.get(`${curPage}:${tok.num}`) ??
          fnBacking.byNum.get(tok.num) ?? null;
        tok.text = text;
        tok.has_text = !!text;
      }
    }
    return {
      id: s.id,
      seq: s.section_seq,
      heading_ar: s.heading_ar,
      page_no: s.page_no,
      paragraphs,
    };
  });

  // Aggregate stats + entry-wide footnote/citation lists.
  // Footnotes panel: one row per distinct (printed_page, num) actually
  // referenced inside this entry. Two `(( 5 ))` markers on different pages
  // produce two rows so the UI can show both backing texts.
  const fnPanelMap = new Map<string, {
    num: number; text: string | null; printed_page: number | null;
  }>();
  const citationsMap = new Map<string, {
    surah: string; surah_num: number | null; ayah: number; ayah_to: number | null;
    raw: string; count: number;
  }>();

  let poetry = 0, hadith = 0, qira = 0, pCount = 0, fnMarkers = 0;
  for (const sec of sections) {
    for (const p of sec.paragraphs) {
      pCount++;
      if (p.kind === 'poetry') poetry++;
      else if (p.kind === 'hadith') hadith++;
      else if (p.kind === 'qira_variant') qira++;
      const tokens = ('tokens' in p) ? p.tokens : [];
      for (const t of tokens) {
        if (t.kind === 'footnote') {
          fnMarkers++;
          const key = `${t.printed_page ?? '?'}:${t.num}`;
          if (!fnPanelMap.has(key)) {
            fnPanelMap.set(key, {
              num: t.num, text: t.text, printed_page: t.printed_page,
            });
          }
        } else if (t.kind === 'quran') {
          const key = `${t.surah_num ?? t.surah}:${t.ayah}-${t.ayah_to ?? ''}`;
          const cur = citationsMap.get(key);
          if (cur) cur.count++;
          else citationsMap.set(key, {
            surah: t.surah, surah_num: t.surah_num, ayah: t.ayah,
            ayah_to: t.ayah_to, raw: t.raw, count: 1,
          });
        }
      }
    }
  }

  return {
    kind: 'mufradat',
    meta: SOURCE_META,
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    sections,
    footnotes: [...fnPanelMap.values()].sort((a, b) =>
      (a.printed_page ?? 0) - (b.printed_page ?? 0) || a.num - b.num,
    ),
    quran_citations: [...citationsMap.values()]
      .sort((a, b) => (a.surah_num ?? 999) - (b.surah_num ?? 999) || a.ayah - b.ayah),
    stats: {
      paragraphs: pCount, poetry, hadith, qira_variants: qira,
      quran_citations: citationsMap.size, footnote_markers: fnMarkers,
    },
  };
}

// ── Paragraph composer ───────────────────────────────────────────────────────

/**
 * Walk a section's blocks in order, fusing consecutive `definition` text into
 * prose paragraphs and emitting `poetry`/`hadith` paragraphs when ingestion
 * tagged them. Each prose run is then sentence-split and tokenized.
 *
 * `section.text_ar` is the joined truth, but the block stream tells us
 * *where* the typed blocks land. We use both: blocks for structure, text
 * for fallback when block_type is missing.
 */
function composeParagraphs(
  _sectionText: string,
  blocks: any[],
  _fnBacking: FootnoteBacking,
): MufradatParagraph[] {
  const out: MufradatParagraph[] = [];
  let proseBuf: string[] = [];

  const flushProse = () => {
    const text = proseBuf.join(' ').replace(/\s+/g, ' ').trim();
    proseBuf = [];
    if (!text) return;
    const split = splitOutEditorial(text);
    for (const piece of split) {
      if (piece.kind === 'editorial') {
        out.push({ kind: 'editorial', tokens: tokenizeProse(piece.text) });
        continue;
      }
      const paras = sentenceSplit(piece.text);
      for (const p of paras) out.push(classifyParagraph(p));
    }
  };

  for (const b of blocks) {
    const type = b.block_type as string;
    const txt = (b.text_plain ?? '').trim();
    if (!txt) continue;
    if (type === 'root_header' || type === 'page_break' ||
        type === 'chapter_header' || type === 'entry_header' || type === 'footnote') {
      continue;
    }
    if (type === 'poetry_quote') {
      flushProse();
      out.push(buildPoetry(txt));
      continue;
    }
    if (type === 'hadith_quote') {
      flushProse();
      out.push({ kind: 'hadith', cue: null, tokens: tokenizeProse(txt) });
      continue;
    }
    proseBuf.push(txt);
  }
  flushProse();
  return out;
}

// ── Sentence splitter — same heuristic as section.body, kept local for clarity.

function sentenceSplit(flat: string): string[] {
  if (!flat) return [];
  return flat.split(/(?<=[.!؟۔])\s+/u).map(p => p.trim()).filter(Boolean);
}

// ── Paragraph classifier — detect poetry/hadith/qira cues in prose

const POETRY_CUE = /(قول الشاعر|قال الشاعر|قال الراجز|وأنشد|قال الفرزدق|قال امرؤ القيس)\s*:?\s*$/u;
const HADITH_CUE = /(وفي الحديث|الحديث الشريف|روي عن النبي)/u;
const QIRA_CUE   = /(?:في )?قراءة (عبد الله|ابن مسعود|أُبي|أبي|الحسن|من قرأ|من قرأها)/u;

function classifyParagraph(text: string): MufradatParagraph {
  const qm = text.match(QIRA_CUE);
  if (qm && qm.index !== undefined && qm.index < 30) {
    return { kind: 'qira_variant', reader: qm[1] ?? null, tokens: tokenizeProse(text) };
  }
  const hm = text.match(HADITH_CUE);
  if (hm && hm.index !== undefined && hm.index < 80) {
    return { kind: 'hadith', cue: hm[1] ?? null, tokens: tokenizeProse(text) };
  }
  return { kind: 'prose', tokens: tokenizeProse(text) };
}

// ── Poetry block parser — split couplet halves on common dividers.

function buildPoetry(text: string): MufradatParagraph {
  // Mufradat poetry blocks usually contain one couplet, sometimes two.
  // Couplets use "..." separators or simple line breaks; we split on either.
  const lines = text
    .split(/\n+|\s+\.{3,}\s+|\s+\*\s+/u)
    .map(s => s.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean);
  return { kind: 'poetry', cue: null, verses: lines, attribution: null };
}

// ── Editorial-bracket extraction
//
// Patterns like "[وخصّ دفع الصدقة في القرآن بالإيتاء]" are al-Raghib's
// editorial asides inserted by the source. We pull them out as standalone
// `editorial` paragraphs so the reader can style them as marginalia.

function splitOutEditorial(text: string): { kind: 'prose' | 'editorial'; text: string }[] {
  // Editorial bracket = `[ TEXT ]` where TEXT is ≥ 4 chars AND does not look
  // like a Quran ref (would have `/` followed by digits) AND is bounded
  // (cap at 200 chars to avoid runaway captures across paragraphs).
  //
  // Trailing-citation rule: a `(( N ))` footnote marker (and optional
  // sentence-terminator `.`) that appears immediately after the closing
  // bracket is the source-author's citation for the editorial aside, not a
  // standalone fragment. Absorb them into the editorial so the tokenizer
  // picks them up at the tail of that paragraph.
  const re = /\[((?:[^\[\]]){4,200})\](\s*(?:(?:\(\(\s*[0-9٠-٩]+\s*\)\)|«\s*[0-9٠-٩]+\s*»)\s*)*\.?)/gu;
  const out: { kind: 'prose' | 'editorial'; text: string }[] = [];
  let cur = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    const inner = m[1];
    const trailing = m[2] ?? '';
    if (/\/\s*[0-9٠-٩]/.test(inner)) continue; // skip Quran refs
    if (m.index > cur) out.push({ kind: 'prose', text: text.slice(cur, m.index) });
    const editorialBody = trailing.trim()
      ? `${inner.trim()} ${trailing.trim()}`.replace(/\s*\.\s*$/, '')
      : inner.trim();
    out.push({ kind: 'editorial', text: editorialBody });
    cur = m.index + m[0].length;
  }
  if (cur < text.length) out.push({ kind: 'prose', text: text.slice(cur) });
  return out.filter(p => p.text.trim().length > 0);
}

// ── Prose tokenizer
//
// Recognize:
//   ▸ [SURAH/ AYAH(-AYAH_TO)?]   →  quran token (surah_num normalized)
//   ▸ (( N ))   →  footnote token (with has_text from fnBacking)
//   ▸ « N »     →  footnote token (same)
//   ▸ (( ARABIC ))  →  paren_quote (variant readings / inserted words)
//
// Surah-name capture is length-limited so an editorial paragraph containing
// a real Quran ref can't be misread as a name with a 500-char prefix.

const D = '[0-9٠-٩]';
const SURAH_NAME = '[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\u200F\\s]{1,30}?';
const Q_RX  = new RegExp(`\\[\\s*(${SURAH_NAME})\\s*\\/\\s*(${D}{1,3})(?:\\s*[-،]\\s*(${D}{1,3}))?\\s*\\]`, 'gu');
const FN_PAREN = new RegExp(`\\(\\s*\\(\\s*(${D}+)\\s*\\)\\s*\\)`, 'gu');
const FN_GUIL  = new RegExp(`«\\s*(${D}+)\\s*»`, 'gu');
// Paren-quote content must contain at least one Arabic letter, never start
// with a digit (that would be a footnote — see FN_PAREN). The leading
// negative lookahead rejects "(( 5 ))" before the Arabic-letter requirement.
const PAREN_QT = new RegExp(
  `\\(\\s*\\(\\s*(?![0-9٠-٩\\s]*\\)\\s*\\))([^()]*[\\u0600-\\u06FF][^()]*?)\\)\\s*\\)`,
  'gu',
);

function toAscii(s: string): string {
  return s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
}

interface Match {
  start: number; end: number;
  token: ProseToken;
}

function tokenizeProse(text: string, _fnBacking: FootnoteBacking | null = null): ProseToken[] {
  if (!text) return [];
  const flat = text.replace(/\s+/g, ' ').trim();
  const matches: Match[] = [];

  const scan = (rx: RegExp, build: (m: RegExpExecArray) => ProseToken | null) => {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(flat)) != null) {
      const tok = build(m);
      if (tok) matches.push({ start: m.index, end: m.index + m[0].length, token: tok });
    }
  };

  scan(Q_RX, m => {
    const surah = m[1].trim();
    const ayah = parseInt(toAscii(m[2]), 10);
    const ayah_to = m[3] ? parseInt(toAscii(m[3]), 10) : null;
    if (!Number.isFinite(ayah)) return null;
    return {
      kind: 'quran', surah,
      surah_num: normalizeSurahName(surah),
      ayah, ayah_to, raw: m[0],
    };
  });

  // Footnotes BEFORE paren-quote. The two patterns overlap on `(( N ))`
  // (digit content) — earlier-pushed wins on equal span in the overlap
  // resolver below, so footnote takes priority over paren_quote.
  // Footnote tokens are emitted with placeholder text/page — a second pass
  // in composeView walks the section in order, detects page resets, and
  // patches the right `printed_page` + `text` into each token.
  scan(FN_PAREN, m => {
    const n = parseInt(toAscii(m[1]), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { kind: 'footnote', num: n, has_text: false, text: null, printed_page: null };
  });
  scan(FN_GUIL, m => {
    const n = parseInt(toAscii(m[1]), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { kind: 'footnote', num: n, has_text: false, text: null, printed_page: null };
  });
  scan(PAREN_QT, m => ({ kind: 'paren_quote', value: m[1].trim() }));

  // Resolve overlaps: shorter footnote should not collide with paren_quote
  // because their patterns are distinct (digit vs. Arabic word), but be
  // defensive — drop any match that overlaps a longer earlier match.
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const accepted: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start < lastEnd) continue;
    accepted.push(m);
    lastEnd = m.end;
  }

  const out: ProseToken[] = [];
  let cur = 0;
  for (const m of accepted) {
    if (m.start > cur) {
      const slice = flat.slice(cur, m.start);
      if (slice.trim()) out.push({ kind: 'text', value: slice });
    }
    out.push(m.token);
    cur = m.end;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail.trim()) out.push({ kind: 'text', value: tail });
  }
  return out;
}

// ── Footnote backing — pulls text out of any block_type='footnote' rows.

interface FootnoteBacking {
  // Keyed by `${printed_page}:${num}` for precise lookup; multi-page entries
  // can have two `(( 5 ))` markers referring to two different footnotes.
  byPageNum: Map<string, string>;
  // Fallback: keyed by num alone (last writer wins). Used when the page
  // tracker can't determine which page a marker sits on (e.g., single-page
  // entry, or partial data).
  byNum: Map<number, string>;
  // For the entry-level panel: every distinct (page, num) → text.
  allRows: Array<{ printed_page: number | null; num: number; text: string }>;
}

function collectFootnoteBacking(blocks: any[]): FootnoteBacking {
  const byPageNum = new Map<string, string>();
  const byNum = new Map<number, string>();
  const allRows: FootnoteBacking['allRows'] = [];
  for (const b of blocks) {
    if (b.block_type !== 'footnote') continue;
    let num: number | null = null;
    let page: number | null = null;
    try {
      const dj = JSON.parse(b.data_json || '{}');
      const rawN = dj.footnote_no ?? dj.footnote_num ?? dj.num;
      const rawP = dj.printed_page;
      if (rawN != null) num = parseInt(toAscii(String(rawN)), 10);
      if (rawP != null) page = parseInt(toAscii(String(rawP)), 10);
    } catch { /* fallthrough */ }
    if (num == null) {
      const probe = (b.title_ar || b.text_plain || '').trim();
      const m = probe.match(/^[(\[«]?\s*([0-9٠-٩]+)/);
      if (m) num = parseInt(toAscii(m[1]), 10);
    }
    if (page == null && b.printed_page != null) page = Number(b.printed_page);
    if (num == null || !Number.isFinite(num)) continue;
    const text = (b.text_plain ?? '').trim();
    if (!text) continue;
    byNum.set(num, text);
    if (page != null && Number.isFinite(page)) byPageNum.set(`${page}:${num}`, text);
    allRows.push({ printed_page: page ?? null, num, text });
  }
  // Sort the panel rows by (page, num) so the UI renders them in book order.
  allRows.sort((a, b) =>
    (a.printed_page ?? 0) - (b.printed_page ?? 0) || a.num - b.num);
  return { byPageNum, byNum, allRows };
}
