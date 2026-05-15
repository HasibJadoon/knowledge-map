// ─── /al/lex/v2/read/<source_slug>/:root_norm — classical-lexicon composer ──
//
// Single composer that serves the FIVE classical lexicons that share the
// same right-rail panel set (Qur'ān citations · Footnotes · Hadith ·
// Poetry shawāhid · Authorities):
//
//   • Lisan al-Arab            (Ibn Manzur)         — inline [[…]] footnotes
//   • al-Sihah                 (al-Jawhari)         — verses in adjacent {…} blocks
//   • Kitab al-‘Ayn            (al-Khalil)          — footnote_blocks pattern
//   • Maqayis al-Lugha         (Ibn Faris)          — [surah_name N] brackets
//   • Ubab al-Zakhir           (al-Saghani)         — Lisan-like inline verses
//
// Mufradat (al-Raghib) has its OWN endpoint at lexicon_mufradat.ts —
// it ships explicit [سورة/ آية] brackets that require a different
// parser. Lane has its own rich XML structure (bilingual, 47K sections)
// and isn't routed through here.
//
// Per-source variation (titles, authors, parser hints) lives in D1's
// ar_ling_sources and is loaded per-request via SourcesRepo. The shape
// returned is identical for all sources (single LisanReadView type) so
// the front-end can use one shell for all of them.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo } from '../repositories/sources.repo';

// ── Source registry — one entry per supported classical lexicon ─────────
type FootnoteSource = 'inline_brackets' | 'footnote_blocks' | 'none';
type QuranBlockShape = 'inline_verse' | 'cue_only_verse_in_braces';
type Origin = 'ketabonline' | 'thahabi' | 'saaid' | 'qomra' | 'lane';

interface SourceConfig {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  origin: Origin;
  /** Where footnote text comes from. */
  footnote_source: FootnoteSource;
  /** Shape of `block_type='quran_quote'` blocks for this source. */
  quran_block_shape: QuranBlockShape;
}

// Slug list — URLs registered at module load; one route per slug. The full
// per-source metadata (title_ar / title_en / author / period / origin /
// footnote_source / quran_block_shape) was retired from this file in favour
// of D1-backed lookups via SourcesRepo.bySlug(). Migrations 0017 + 0018
// seeded every slug below. Parser hints (footnote_source, quran_block_shape)
// live in ar_ling_sources columns of the same name.
//
// Some books are richly Quran-quoted (Lisan, Mufradat), others have only a
// handful (al-Qamus: ~36 quran_quote blocks across 9,567 roots) — the rich
// composer is registered for all of them anyway; the rare-citation cases
// just produce sparse panels rather than failing.
const LISAN_SLUGS: readonly string[] = [
  'ketabonline_ibn_manzur_lisan_al_arab',
  'ketabonline_al_jawhari_al_sihah',
  'thahabi_al_khalil_kitab_al_ayn',
  'saaid_maqayis_al_lugha',
  'qomra_al_ubab_al_zakhir',
  // Brace-block sources (cue_only_verse_in_braces) — Qur'ān citations were
  // resolved offline via the 5-gram matcher and stored in
  // ar_ling_lexicon_quran_refs. The composer reads those refs by block_id.
  'ketabonline_al_zabidi_taj_al_arus',
  'ketabonline_al_fayyumi_misbah_munir',
  'ketabonline_ibn_duraid_jamharat_al_lugha',
  'qomra_al_qamus_al_muhit',
] as const;


// ── Response shape ───────────────────────────────────────────────────────────

interface ProseToken_Text { kind: 'text'; value: string; }
interface ProseToken_Footnote {
  kind: 'footnote';
  num: number;
  has_text: boolean;
  text: string | null;
  pivot: string | null;          // the lemma the footnote annotates
}
interface ProseToken_Quran {
  kind: 'quran';
  surah: number | null;          // resolved via Phase-0.5 ngram match
  ayah: number | null;
  raw: string;                   // the verse text as it appears in Lisan
}
interface ProseToken_Authority {
  kind: 'authority';
  name: string;                  // canonical key
  label: string;                 // surface form as it appears in text
  authority_kind: AuthorityKind; // category (lexicographer | poet | ...)
}
interface ProseToken_LineBreak { kind: 'br'; }
type ProseToken =
  | ProseToken_Text | ProseToken_Footnote | ProseToken_Quran
  | ProseToken_Authority | ProseToken_LineBreak;

type LisanParagraph =
  | { kind: 'prose';   tokens: ProseToken[] }
  | { kind: 'quran';   verse_text: string; surah: number | null; ayah: number | null; tokens: ProseToken[] }
  | { kind: 'hadith';  cue: string | null; tokens: ProseToken[] }
  | { kind: 'poetry';  cue: string | null; verses: string[]; attribution: string | null };

interface LisanSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: LisanParagraph[];
}

interface LisanReadView {
  kind: 'lisan';
  meta: {
    slug: string;
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: Origin;
  };
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: unknown | null;
  sections: LisanSection[];
  footnotes: { num: number; text: string; pivot: string | null }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  hadith_quotes: { id: string; text: string; cue: string | null; page: number | null }[];
  poetry_shawahid: {
    id: string; verses: string[]; attribution: string | null; cue: string | null;
    page: number | null;
  }[];
  authorities: {
    name: string; name_label: string; kind: AuthorityKind;
    count: number; first_page: number | null;
  }[];
  stats: {
    paragraphs: number; hadith: number; poetry: number;
    quran_citations: number; footnotes: number;
    authorities: number; authority_total: number;
  };
}

// ── Route registration: one endpoint per configured source ─────────────────

export function lexiconLisanRoutes(router: Router<ArLinguisticsEnv>) {
  for (const slug of LISAN_SLUGS) {
    registerSourceRoute(router, slug);
  }
}

/**
 * Resolve a SourceConfig at request time from D1, with a TS-side fallback
 * for the parser-hint defaults so the handler can run even on a cold DB.
 * D1 row reads add ~10ms but the entire endpoint is edge-cached, so the
 * cost is amortised across cache hits.
 */
async function resolveSourceConfig(db: D1Database, slug: string): Promise<SourceConfig> {
  const row = await new SourcesRepo(db).bySlug(slug);
  return {
    slug,
    title_ar: row?.title_ar ?? slug,
    title_en: row?.title_en ?? slug,
    author:   row?.author_name ?? '',
    period:   row?.period_label ?? '',
    origin:   (row?.origin as Origin) ?? 'ketabonline',
    footnote_source:   (row?.footnote_source as FootnoteSource) ?? 'none',
    quran_block_shape: (row?.quran_block_shape as QuranBlockShape) ?? 'inline_verse',
  };
}

function registerSourceRoute(router: Router<ArLinguisticsEnv>, slug: string) {
  router.get(
    `/al/lex/v2/read/${slug}/:root_norm`,
    async (_req, env, params) => {
      const root_norm = decodeURIComponent(params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      // Pull the per-source config (title, parser hints) from D1 instead of
      // a closed-over TS constant. The slug is what gets bound into queries
      // below; everything else (display meta + footnote_source +
      // quran_block_shape) flows from ar_ling_sources via SourcesRepo.
      const cfg = await resolveSourceConfig(env.DB_AL, slug);

      const entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id
         FROM ar_ling_lexicon_root_entries
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(cfg.slug, root_norm).first<any>();
      if (!entry) return notFound(`entry not found in ${cfg.title_en}`);

      const sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no
         FROM ar_ling_lexicon_entry_sections
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, data_json, printed_page
         FROM ar_ling_lexicon_blocks
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const quranRefs = (await env.DB_AL.prepare(
        `SELECT block_id, surah, ayah, raw_ref, context_snippet
         FROM ar_ling_lexicon_quran_refs
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY surah, ayah`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const view = composeView(cfg, entry, sectionsRaw, blocks, quranRefs, canonical);
      return ok(view);
    },
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function composeView(
  cfg: SourceConfig,
  entry: any,
  rawSections: any[],
  rawBlocks: any[],
  quranRefs: any[],
  canonical: any | null,
): LisanReadView {
  // ── Source-specific pre-pass: collect standalone footnote blocks ───
  // For sources with `footnote_source='footnote_blocks'` (al-Khalil), we
  // pull out every `block_type='footnote'` row and index them by their
  // `data_json.footnote_no`. These become a global footnotes panel; the
  // reading-order walk below skips footnote blocks (they're not prose).
  const standaloneFootnotes: { num: number; text: string; pivot: string | null }[] = [];
  if (cfg.footnote_source === 'footnote_blocks') {
    let n = 1;
    for (const b of rawBlocks) {
      if (b.block_type !== 'footnote') continue;
      const text = (b.text_plain ?? '').trim();
      if (!text) continue;
      let parsedNum: number | null = null;
      try {
        const dj = JSON.parse(b.data_json || '{}');
        const raw = dj.footnote_no ?? dj.footnote_num ?? dj.num;
        if (raw != null) parsedNum = +String(raw).replace(/[٠-٩]/g, ch =>
          String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
      } catch { /* fall through */ }
      standaloneFootnotes.push({
        num: parsedNum ?? n, text, pivot: null,
      });
      n++;
    }
  }

  // ── Source-specific pre-pass: harvest verses from {…} blocks ───────
  // For sources with `quran_block_shape='cue_only_verse_in_braces'`
  // (al-Sihah), the actual verse text lives in a separate block whose
  // text_plain looks like `{verse text}`. We pair each such block with
  // any quran_refs that target it (resolved offline by build-resolver).
  const braceVerseByBlockId = new Map<string, { text: string; refs: { surah: number; ayah: number; raw: string }[] }>();
  if (cfg.quran_block_shape === 'cue_only_verse_in_braces') {
    for (const b of rawBlocks) {
      const t = (b.text_plain ?? '').trim();
      if (!t.startsWith('{') || !t.endsWith('}')) continue;
      braceVerseByBlockId.set(b.id, {
        text: t.slice(1, -1).trim(), refs: [],
      });
    }
    for (const r of quranRefs) {
      const v = r.block_id ? braceVerseByBlockId.get(r.block_id) : null;
      if (v) v.refs.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    }
  }

  // Build a block-id → list-of-(surah,ayah) lookup for inline marker placement
  const refsByBlock = new Map<string, { surah: number; ayah: number; raw: string }[]>();
  for (const r of quranRefs) {
    if (!r.block_id) continue;
    const arr = refsByBlock.get(r.block_id) ?? [];
    arr.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    refsByBlock.set(r.block_id, arr);
  }

  // Walk each section's blocks in order, building paragraphs and panels.
  const allFootnotes: { num: number; text: string; pivot: string | null }[] = [];
  let footnoteCounter = 1;

  const hadith_quotes: LisanReadView['hadith_quotes'] = [];
  const poetry_shawahid: LisanReadView['poetry_shawahid'] = [];
  const authorityHits = new Map<string, {
    name: string; name_label: string; kind: AuthorityKind;
    count: number; first_page: number | null;
  }>();
  const citationsAgg = new Map<string, {
    surah: number; ayah: number; raw: string; context_snippet: string | null; count: number;
  }>();
  for (const r of quranRefs) {
    const key = `${r.surah}:${r.ayah}`;
    const cur = citationsAgg.get(key);
    if (cur) cur.count++;
    else citationsAgg.set(key, {
      surah: r.surah, ayah: r.ayah, raw: r.raw_ref,
      context_snippet: r.context_snippet, count: 1,
    });
  }

  let pCount = 0, hadithCount = 0, poetryCount = 0;

  const sections: LisanSection[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);

    const paragraphs: LisanParagraph[] = [];
    // Buffer the most-recent prose block text so we can look BEHIND when
    // the next block is `poetry_quote` — Lisan's chunker often mis-tags
    // continuation prose as poetry. A trailing `قال الشاعر:` (or similar
    // cue) in the previous prose IS the strongest signal that the next
    // block really is verse.
    let prevProseTail = '';

    for (const b of sectionBlocks) {
      if (b.block_type === 'root_header') continue;
      // Skip standalone footnote blocks (al-Khalil pattern). Their text
      // is already collected into `standaloneFootnotes` and surfaced via
      // the global footnotes panel, NOT as inline prose paragraphs.
      if (cfg.footnote_source === 'footnote_blocks' && b.block_type === 'footnote') continue;
      // Skip {…} verse blocks when they're being consumed by a preceding
      // quran_quote cue block (al-Sihah pattern). We render them as part
      // of the cue block's verse paragraph below.
      if (cfg.quran_block_shape === 'cue_only_verse_in_braces' && braceVerseByBlockId.has(b.id)) {
        continue;
      }
      const text = (b.text_plain ?? '').trim();
      if (!text) continue;
      // Drop print-scan noise blocks — bracket-only / punctuation-only
      // text that the chunker preserved as separate blocks. Audit found
      // ~31,000 of these across nine sources (Taj al-Arus 22,827 alone,
      // Maqayis 3,292, Jamharat 2,999, …). They render as empty callouts
      // in the UI. The data migration in 0019 deletes them at rest; this
      // composer guard catches any survivors and any future re-ingest.
      if (isNoiseText(text)) continue;

      if (b.block_type === 'hadith_quote' && hasHadithCue(text)) {
        const cue = detectHadithCue(text);
        const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
        footnoteCounter += footnotes.length;
        allFootnotes.push(...footnotes);
        paragraphs.push({ kind: 'hadith', cue, tokens });
        hadithCount++;
        hadith_quotes.push({
          id: b.id, text,
          cue, page: b.printed_page ?? null,
        });
      } else if (b.block_type === 'poetry_quote'
                 && (looksLikePoetry(text) || prevBlockEndsWithPoetryCue(prevProseTail))) {
        const { verses, attribution, cue: ownCue } = parsePoetry(text);
        // If our own block didn't carry a cue but the previous prose did,
        // promote the previous-block cue so the UI can show it.
        const cue = ownCue ?? extractTrailingPoetryCue(prevProseTail);
        paragraphs.push({ kind: 'poetry', cue, verses, attribution });
        poetryCount++;
        poetry_shawahid.push({
          id: b.id, verses, attribution, cue, page: b.printed_page ?? null,
        });
      } else if (b.block_type === 'quran_quote') {
        // Two source-specific paths:
        //   A) cue_only_verse_in_braces (al-Sihah): the cue block carries
        //      lead-in prose only; the verse lives in the NEXT block in
        //      reading order, tagged 'definition' and wrapped in `{…}`.
        //   B) inline_verse (Lisan/Khalil/Maqayis/Ubab/Mufradat): the
        //      block text IS the verse content.
        if (cfg.quran_block_shape === 'cue_only_verse_in_braces') {
          // Find the next block in seq order for this section, see if
          // it's a {…} verse block.
          const cueIdx = sectionBlocks.indexOf(b);
          const next   = cueIdx >= 0 ? sectionBlocks[cueIdx + 1] : null;
          const braceV = next ? braceVerseByBlockId.get(next.id) : null;
          if (braceV) {
            // Refs may be attached to the brace block (resolver target)
            const refs = braceV.refs;
            paragraphs.push({
              kind: 'quran',
              verse_text: braceV.text,
              surah: refs[0]?.surah ?? null,
              ayah:  refs[0]?.ayah  ?? null,
              tokens: [{ kind: 'text', value: braceV.text }],
            });
          } else {
            // Cue without an adjacent verse — emit the cue as prose.
            const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
            footnoteCounter += footnotes.length;
            allFootnotes.push(...footnotes);
            paragraphs.push({ kind: 'prose', tokens });
          }
        } else {
          // inline_verse: the block text IS the verse.
          const refs = refsByBlock.get(b.id) ?? [];
          const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
          footnoteCounter += footnotes.length;
          allFootnotes.push(...footnotes);
          paragraphs.push({
            kind: 'quran',
            verse_text: stripInlineMarkers(text),
            surah: refs[0]?.surah ?? null,
            ayah:  refs[0]?.ayah  ?? null,
            tokens,
          });
        }
      } else {
        // definition (or mis-tagged hadith/poetry) → prose
        const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
        footnoteCounter += footnotes.length;
        allFootnotes.push(...footnotes);
        paragraphs.push({ kind: 'prose', tokens });
        // Stash the trailing portion of prose so the NEXT block can
        // look back for a poetry cue. We only need the last ~120 chars.
        prevProseTail = text.length > 120 ? text.slice(-120) : text;
      }
      pCount++;

      // Authority scan on every block.
      for (const { name, label, kind } of detectAuthorities(text)) {
        const cur = authorityHits.get(name);
        if (cur) cur.count++;
        else authorityHits.set(name, {
          name, name_label: label, kind, count: 1,
          first_page: b.printed_page ?? null,
        });
      }
    }

    return {
      id: s.id,
      seq: s.section_seq,
      heading_ar: s.heading_ar ?? null,
      page_no: s.page_no ?? null,
      paragraphs,
    };
  });

  const authorities = [...authorityHits.values()].sort((a, b) => b.count - a.count);
  const quran_citations = [...citationsAgg.values()].sort(
    (a, b) => a.surah - b.surah || a.ayah - b.ayah,
  );

  // Sources with `footnote_blocks` (al-Khalil): merge in the standalone
  // footnotes collected in the pre-pass. They sit at the end of the
  // numbering — inline `[[…]]` notes (Lisan) come first.
  if (standaloneFootnotes.length > 0) {
    allFootnotes.push(...standaloneFootnotes);
  }

  return {
    kind: 'lisan',
    meta: {
      slug: cfg.slug,
      title_ar: cfg.title_ar,
      title_en: cfg.title_en,
      author: cfg.author,
      period: cfg.period,
      origin: cfg.origin,
    },
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    sections,
    footnotes: allFootnotes,
    quran_citations,
    hadith_quotes,
    poetry_shawahid,
    authorities,
    stats: {
      paragraphs: pCount,
      hadith: hadithCount,
      poetry: poetryCount,
      quran_citations: quran_citations.length,
      footnotes: allFootnotes.length,
      authorities: authorities.length,
      authority_total: authorities.reduce((s, a) => s + a.count, 0),
    },
  };
}

// ── Footnote extraction (Lisan-specific) ────────────────────────────────────
// Source format: `[[. قوله [pivot] body text]]` where `[pivot]` is optional.
// Body may end with `(*)` or a period — strip those too.
// Noise-block detector. Matches print-scan artifacts the chunker preserved
// as separate blocks: bracket pairs, punctuation, asterisks, digits.
// Anything <=5 chars that's purely "noise" gets dropped from the composer
// output. Real Arabic content of any length passes through.
//   Catches:  "["  "]"  "{"  "}"  "*"  "."  ":"  "(" ")" "(68)" "12" "—"
//   Spares:   "أبّ"  "في" (Arabic letters)
//
// Hand-listed char class rather than a regex with /u flag — V8 in
// Cloudflare Workers rejected the regex form with "Invalid escape" on
// the em-dash / BiDi marks. The loop is fast for the <=5 char inputs.
const NOISE_CHARS = '[]{}*.,:;()\\-–—‎‏0123456789 \t\'"';
function isNoiseText(text: string): boolean {
  if (!text) return true;
  if (text.length > 5) return false;
  for (let i = 0; i < text.length; i++) {
    if (NOISE_CHARS.indexOf(text[i]) === -1) return false;
  }
  return true;
}

const INLINE_FN_RX = /\[\[([\s\S]*?)\]\]/g;
const PIVOT_RX     = /^\s*\.\s*قوله\s*[:：]?\s*\[?([^\]]+)\]?\s*/;

function extractInlineFootnotes(text: string): {
  cleaned: string;
  notes: { pivot: string | null; text: string }[];
} {
  const notes: { pivot: string | null; text: string }[] = [];
  const cleaned = text.replace(INLINE_FN_RX, (_full, body: string) => {
    const m = PIVOT_RX.exec(body);
    let pivot: string | null = null;
    let rest = body.trim();
    if (m) {
      pivot = m[1].trim();
      rest  = body.slice(m[0].length).trim();
    }
    rest = rest.replace(/\(\*\)\s*$/, '').replace(/^\.+/, '').trim();
    notes.push({ pivot, text: rest });
    return 'FN'; // placeholder, replaced in tokenize()
  });
  return { cleaned, notes };
}

function stripInlineMarkers(text: string): string {
  return text.replace(INLINE_FN_RX, '').replace(/\s+/g, ' ').trim();
}

// ── Tokenizer ───────────────────────────────────────────────────────────────
// Walks the cleaned text, emitting text segments interleaved with footnote
// markers and authority pills. Quran tokens come from the block's resolved
// refs (one quran token at the start of the block if the block is a verse
// block, or attached via the verse_text on the paragraph).
function tokenize(
  text: string,
  block: any,
  refsByBlock: Map<string, { surah: number; ayah: number; raw: string }[]>,
  startNum: number,
): { tokens: ProseToken[]; footnotes: { num: number; text: string; pivot: string | null }[] } {
  const { cleaned, notes } = extractInlineFootnotes(text);
  const footnotes = notes.map((n, i) => ({
    num: startNum + i,
    text: n.text,
    pivot: n.pivot,
  }));

  // Walk the cleaned string, replacing the \x01FN\x01 markers with footnote
  // tokens and detecting authority names inline.
  const tokens: ProseToken[] = [];
  const parts = cleaned.split(/(FN)/);
  let fnIdx = 0;
  for (const part of parts) {
    if (part === 'FN') {
      const fn = footnotes[fnIdx++];
      if (fn) tokens.push({
        kind: 'footnote', num: fn.num,
        has_text: !!fn.text, text: fn.text || null, pivot: fn.pivot,
      });
      continue;
    }
    if (!part) continue;
    // Find authority spans, tokenize around them
    pushTextWithAuthorities(part, tokens);
  }
  return { tokens, footnotes };
}

function pushTextWithAuthorities(part: string, out: ProseToken[]) {
  const hits = scanAuthoritySpans(part);
  if (hits.length === 0) {
    out.push({ kind: 'text', value: part });
    return;
  }
  let cur = 0;
  for (const h of hits) {
    if (h.start > cur) out.push({ kind: 'text', value: part.slice(cur, h.start) });
    out.push({ kind: 'authority', name: h.name, label: h.label, authority_kind: h.kind });
    cur = h.end;
  }
  if (cur < part.length) out.push({ kind: 'text', value: part.slice(cur) });
}

// ── Hadith cues ────────────────────────────────────────────────────────────
const HADITH_CUES = [
  'وفي الحديث', 'وفي حديث', 'في الحديث', 'الحديث', 'النبي',
  'رسول الله', 'صلى الله عليه', 'حدثنا', 'روى عن',
];
const DIACR_RX = /[ً-ْٰۖ-ۭـ]/g;
function stripDiac(s: string): string { return s.replace(DIACR_RX, ''); }

function hasHadithCue(text: string): boolean {
  const t = stripDiac(text);
  return HADITH_CUES.some(c => t.includes(c));
}
function detectHadithCue(text: string): string | null {
  const t = stripDiac(text);
  for (const c of HADITH_CUES) {
    const i = t.indexOf(c);
    if (i >= 0 && i < 80) return c;
  }
  return null;
}

// ── Poetry detection ───────────────────────────────────────────────────────
const POETRY_CUES = [
  'قال الشاعر', 'قول الشاعر', 'وأنشد', 'أنشد', 'قال الراجز',
  'قال امرؤ القيس', 'قال جرير', 'قال الفرزدق', 'قال ذو الرمة',
  'قال لبيد', 'قال الأعشى', 'قال الكميت', 'قال رؤبة', 'قال العجاج',
  'قال ابن مقبل', 'قال الهذلي', 'قال زهير', 'قال النابغة',
  'قال طرفة', 'قال عنترة', 'قال الخنساء',
];
// `قال X:` where X is a 2-3 token name — used as a generic look-behind
// trigger when the next block is poetry_quote.
const GENERIC_QAILA_RX = /قال\s+[ء-ي\s]{2,30}:\s*$/;
const HEMISTICH_DIVIDER = /\s+\.{3,}\s+|\s+\*\s+|\n+/;

function looksLikePoetry(text: string): boolean {
  const t = stripDiac(text);
  if (POETRY_CUES.some(c => t.includes(c))) return true;
  // Multi-hemistich structure (line break or `...` divider)
  if (HEMISTICH_DIVIDER.test(text)) return true;
  return false;
}

/** True if the trailing text ends with a poetry-introduction cue. */
function prevBlockEndsWithPoetryCue(tail: string): boolean {
  if (!tail) return false;
  const t = stripDiac(tail).trim();
  // Direct named-poet cue or generic "قال X:" pattern (allowing trailing space)
  for (const cue of POETRY_CUES) {
    if (t.endsWith(cue) || t.endsWith(cue + ':') || t.endsWith(cue + ' :')) return true;
  }
  return GENERIC_QAILA_RX.test(t);
}

/** Pull the poetry cue out of a trailing prose tail, if present. */
function extractTrailingPoetryCue(tail: string): string | null {
  if (!tail) return null;
  const t = stripDiac(tail).trim();
  for (const cue of POETRY_CUES) {
    const i = t.lastIndexOf(cue);
    if (i >= 0 && i > t.length - cue.length - 6) return cue;
  }
  const m = t.match(/(قال\s+[ء-ي\s]{2,30})\s*:\s*$/);
  return m ? m[1].trim() : null;
}

function parsePoetry(text: string): {
  verses: string[]; attribution: string | null; cue: string | null;
} {
  const t = stripDiac(text);
  let cue: string | null = null;
  let attribution: string | null = null;
  for (const c of POETRY_CUES) {
    if (t.includes(c)) { cue = c; break; }
  }
  // "قال X:" — capture name after "قال "
  const attrMatch = t.match(/قال\s+([^\s:]+(?:\s+[^\s:]+){0,2})\s*:/);
  if (attrMatch) attribution = attrMatch[1].trim();
  // Split verses on hemistich divider or newline
  const verses = text.split(HEMISTICH_DIVIDER)
    .map(v => v.replace(/^\s+|\s+$/g, ''))
    .filter(v => v.length > 4);
  return { verses, attribution, cue };
}

// ── Authority registry (Lisan-specific NER) ────────────────────────────────
// Canonical key → list of unvocalized variants. Names < 5 chars require
// word-anchored matching (space/start/punctuation boundaries on both sides)
// to avoid false-positive substring hits inside longer words.
type AuthoritySpec = { name: string; kind: AuthorityKind; variants: string[]; anchored?: boolean };
type AuthorityKind =
  | 'lexicographer' | 'grammarian' | 'quran_reader'
  | 'hadith_scholar' | 'companion' | 'tabii' | 'poet' | 'prophet';

const AUTHORITIES: AuthoritySpec[] = [
  // ── Lexicographers / philologists (heavily quoted in Lisan) ─────────
  { name: 'al-Azhari',            kind: 'lexicographer', variants: ['الأزهري', 'أبو منصور الأزهري'] },
  { name: 'Ibn al-A‘rabi',        kind: 'lexicographer', variants: ['ابن الأعرابي'] },
  { name: 'Ibn Barri',            kind: 'lexicographer', variants: ['ابن بري'] },
  { name: 'Ibn Sidah',            kind: 'lexicographer', variants: ['ابن سيده', 'ابن سيدة'] },
  { name: 'al-Jawhari',           kind: 'lexicographer', variants: ['الجوهري'] },
  { name: 'Abu ‘Ubayd',           kind: 'lexicographer', variants: ['أبو عبيد القاسم بن سلام', 'أبو عبيد'] },
  { name: 'al-Asma‘i',            kind: 'lexicographer', variants: ['الأصمعي'] },
  { name: 'Tha‘lab',              kind: 'lexicographer', variants: ['ثعلب', 'أبو العباس ثعلب'] },
  { name: 'Shammar',              kind: 'lexicographer', variants: ['شمر'], anchored: true },
  { name: 'al-Lihyani',           kind: 'lexicographer', variants: ['اللحياني'] },
  { name: 'Abu Zayd al-Ansari',   kind: 'lexicographer', variants: ['أبو زيد الأنصاري', 'أبو زيد'] },
  { name: 'Abu Hanifa Dinawari',  kind: 'lexicographer', variants: ['أبو حنيفة الدينوري', 'أبو حنيفة'] },
  { name: 'Ibn al-Sikkit',        kind: 'lexicographer', variants: ['ابن السكيت'] },
  { name: 'al-Khalil',            kind: 'lexicographer', variants: ['الخليل بن أحمد', 'الخليل'] },
  { name: 'Ibn Durayd',           kind: 'lexicographer', variants: ['ابن دريد'] },
  { name: 'Ibn Faris',            kind: 'lexicographer', variants: ['ابن فارس'] },
  { name: 'al-Saghani',           kind: 'lexicographer', variants: ['الصاغاني'] },
  { name: 'al-Zabidi',            kind: 'lexicographer', variants: ['الزبيدي'] },
  { name: 'al-Mubarrad',          kind: 'lexicographer', variants: ['المبرد', 'أبو العباس المبرد'] },
  { name: 'Yunus ibn Habib',      kind: 'lexicographer', variants: ['يونس بن حبيب', 'يونس'], anchored: true },
  { name: 'Abu Misḥal',           kind: 'lexicographer', variants: ['أبو مسحل'] },
  { name: 'al-Riyashi',           kind: 'lexicographer', variants: ['الرياشي'] },
  { name: 'Ibn Hamdun',           kind: 'lexicographer', variants: ['ابن حمدون'] },

  // ── Grammarians (nahw + sarf) ────────────────────────────────────────
  { name: 'Sibawayh',             kind: 'grammarian',    variants: ['سيبويه'] },
  { name: 'al-Farra',             kind: 'grammarian',    variants: ['الفراء', 'أبو زكريا الفراء'] },
  { name: 'al-Akhfash',           kind: 'grammarian',    variants: ['الأخفش الأكبر', 'الأخفش الأوسط', 'الأخفش'] },
  { name: 'Ibn Jinni',            kind: 'grammarian',    variants: ['ابن جني'] },
  { name: 'al-Zajjaj',            kind: 'grammarian',    variants: ['الزجاج', 'أبو إسحاق الزجاج'] },
  { name: 'al-Zajjaji',           kind: 'grammarian',    variants: ['الزجاجي'] },
  { name: 'al-Mazini',            kind: 'grammarian',    variants: ['أبو عثمان المازني', 'المازني'] },
  { name: 'Abu ‘Ali al-Farisi',   kind: 'grammarian',    variants: ['أبو علي الفارسي', 'الفارسي'] },
  { name: 'Ibn al-Anbari',        kind: 'grammarian',    variants: ['ابن الأنباري', 'أبو بكر بن الأنباري'] },
  { name: 'Ibn al-Sarraj',        kind: 'grammarian',    variants: ['ابن السراج'] },
  { name: 'al-Jarmi',             kind: 'grammarian',    variants: ['الجرمي'] },
  { name: 'al-Mubarrad',          kind: 'grammarian',    variants: ['المبرد'] },
  { name: 'al-Suhayli',           kind: 'grammarian',    variants: ['السهيلي'] },

  // ── Qur’ān readers (qira'at) ────────────────────────────────────────
  { name: 'al-Kisa’i',            kind: 'quran_reader',  variants: ['الكسائي'] },
  { name: 'Nafi‘',                kind: 'quran_reader',  variants: ['نافع المدني', 'نافع'], anchored: true },
  { name: 'Ibn Kathir (qari)',    kind: 'quran_reader',  variants: ['ابن كثير المكي'] },
  { name: 'Abu ‘Amr',             kind: 'quran_reader',  variants: ['أبو عمرو بن العلاء', 'أبو عمرو'] },
  { name: '‘Asim',                kind: 'quran_reader',  variants: ['عاصم بن أبي النجود', 'عاصم'], anchored: true },
  { name: 'Hamza',                kind: 'quran_reader',  variants: ['حمزة الزيات', 'حمزة'], anchored: true },
  { name: 'Ibn ‘Amir',            kind: 'quran_reader',  variants: ['ابن عامر الشامي', 'ابن عامر'] },
  { name: 'Ya‘qub',               kind: 'quran_reader',  variants: ['يعقوب الحضرمي', 'يعقوب'], anchored: true },
  { name: 'Khalaf',               kind: 'quran_reader',  variants: ['خلف العاشر', 'خلف'], anchored: true },
  { name: 'Abu Ja‘far',           kind: 'quran_reader',  variants: ['أبو جعفر المدني', 'أبو جعفر'] },
  { name: 'al-Hasan al-Basri (q)',kind: 'quran_reader',  variants: ['قراءة الحسن', 'الحسن البصري'] },

  // ── Hadith / tafsir / fiqh scholars ─────────────────────────────────
  { name: 'Ibn al-Athir',         kind: 'hadith_scholar',variants: ['ابن الأثير'] },
  { name: 'al-Khattabi',          kind: 'hadith_scholar',variants: ['الخطابي'] },
  { name: 'al-Tabari',            kind: 'hadith_scholar',variants: ['الطبري', 'أبو جعفر الطبري'] },
  { name: 'al-Zuhri',             kind: 'hadith_scholar',variants: ['الزهري', 'ابن شهاب'] },
  { name: 'al-Harbi',             kind: 'hadith_scholar',variants: ['إبراهيم الحربي', 'الحربي'] },
  { name: 'Ibn Qutayba',          kind: 'hadith_scholar',variants: ['ابن قتيبة'] },
  { name: 'al-Jahiz',             kind: 'hadith_scholar',variants: ['الجاحظ'] },
  { name: 'al-Zamakhshari',       kind: 'hadith_scholar',variants: ['الزمخشري'] },
  { name: 'Ibn ‘Adi',             kind: 'hadith_scholar',variants: ['ابن عدي'] },
  { name: 'al-Bayhaqi',           kind: 'hadith_scholar',variants: ['البيهقي'] },
  { name: 'Ibn al-Mubarak',       kind: 'hadith_scholar',variants: ['ابن المبارك'] },

  // ── Companions of the Prophet ───────────────────────────────────────
  { name: 'Ibn ‘Abbas',           kind: 'companion',     variants: ['ابن عباس', 'عبد الله بن عباس'] },
  { name: 'Ibn Mas‘ud',           kind: 'companion',     variants: ['ابن مسعود', 'عبد الله بن مسعود'] },
  { name: 'Ibn ‘Umar',            kind: 'companion',     variants: ['ابن عمر', 'عبد الله بن عمر'] },
  { name: '‘Ali ibn Abi Talib',   kind: 'companion',     variants: ['علي بن أبي طالب'] },
  { name: '‘Umar ibn al-Khattab', kind: 'companion',     variants: ['عمر بن الخطاب'] },
  { name: 'Abu Bakr',             kind: 'companion',     variants: ['أبو بكر الصديق'] },
  { name: '‘Uthman',              kind: 'companion',     variants: ['عثمان بن عفان'] },
  { name: '‘A’isha',              kind: 'companion',     variants: ['عائشة'] },
  { name: 'Abu Hurayra',          kind: 'companion',     variants: ['أبو هريرة'] },
  { name: 'Anas',                 kind: 'companion',     variants: ['أنس بن مالك'] },
  { name: 'Jabir',                kind: 'companion',     variants: ['جابر بن عبد الله'] },
  { name: 'Ubayy',                kind: 'companion',     variants: ['أبي بن كعب'] },
  { name: 'Zayd ibn Thabit',      kind: 'companion',     variants: ['زيد بن ثابت'] },
  { name: 'Mu‘adh ibn Jabal',     kind: 'companion',     variants: ['معاذ بن جبل'] },

  // ── Tabi’in (next generation) ───────────────────────────────────────
  { name: 'al-Hasan al-Basri',    kind: 'tabii',         variants: ['الحسن البصري'] },
  { name: 'Ibn Sirin',            kind: 'tabii',         variants: ['ابن سيرين'] },
  { name: 'Mujahid',              kind: 'tabii',         variants: ['مجاهد'], anchored: true },
  { name: 'Qatada',               kind: 'tabii',         variants: ['قتادة'], anchored: true },
  { name: '‘Ikrima',              kind: 'tabii',         variants: ['عكرمة'] },
  { name: 'al-Suddi',             kind: 'tabii',         variants: ['السدي'] },
  { name: 'al-Sha‘bi',            kind: 'tabii',         variants: ['الشعبي'] },
  { name: 'Sa‘id ibn al-Musayyib',kind: 'tabii',         variants: ['سعيد بن المسيب'] },
  { name: 'Ibrahim al-Nakha‘i',   kind: 'tabii',         variants: ['إبراهيم النخعي', 'النخعي'] },
  { name: 'al-A‘mash',            kind: 'tabii',         variants: ['الأعمش'] },

  // ── Pre-Islamic + Mukhadram poets ───────────────────────────────────
  { name: 'Imru’ al-Qays',        kind: 'poet',          variants: ['امرؤ القيس'] },
  { name: 'al-Nabigha',           kind: 'poet',          variants: ['النابغة الذبياني', 'النابغة'] },
  { name: 'Zuhayr',               kind: 'poet',          variants: ['زهير بن أبي سلمى', 'زهير'], anchored: true },
  { name: '‘Antara',              kind: 'poet',          variants: ['عنترة بن شداد', 'عنترة'] },
  { name: 'Tarafa',               kind: 'poet',          variants: ['طرفة بن العبد', 'طرفة'] },
  { name: 'Labid',                kind: 'poet',          variants: ['لبيد بن ربيعة', 'لبيد'] },
  { name: 'al-A‘sha',             kind: 'poet',          variants: ['الأعشى'], anchored: true },
  { name: '‘Amr ibn Kulthum',     kind: 'poet',          variants: ['عمرو بن كلثوم'] },
  { name: 'al-Harith ibn Hilliza',kind: 'poet',          variants: ['الحارث بن حلزة'] },
  { name: 'al-Khansa',            kind: 'poet',          variants: ['الخنساء'] },
  { name: 'Hassan ibn Thabit',    kind: 'poet',          variants: ['حسان بن ثابت'] },
  { name: 'Ka‘b ibn Zuhayr',      kind: 'poet',          variants: ['كعب بن زهير'] },
  { name: 'al-Nabigha al-Ja‘di',  kind: 'poet',          variants: ['النابغة الجعدي'] },
  { name: 'al-Shanfara',          kind: 'poet',          variants: ['الشنفرى'] },
  { name: 'Ta’abbata Sharran',    kind: 'poet',          variants: ['تأبط شرا'] },
  { name: '‘Adi ibn Zayd',        kind: 'poet',          variants: ['عدي بن زيد'] },
  { name: 'al-Aswad ibn Ya‘fur',  kind: 'poet',          variants: ['الأسود بن يعفر'] },

  // ── Umayyad poets ───────────────────────────────────────────────────
  { name: 'Jarir',                kind: 'poet',          variants: ['جرير'], anchored: true },
  { name: 'al-Farazdaq',          kind: 'poet',          variants: ['الفرزدق'] },
  { name: 'al-Akhtal',            kind: 'poet',          variants: ['الأخطل'] },
  { name: 'Dhu al-Rumma',         kind: 'poet',          variants: ['ذو الرمة'] },
  { name: '‘Umar ibn Abi Rabi‘a', kind: 'poet',          variants: ['عمر بن أبي ربيعة'] },
  { name: 'al-Kumayt',            kind: 'poet',          variants: ['الكميت'] },
  { name: 'al-‘Ajjaj',            kind: 'poet',          variants: ['العجاج'] },
  { name: 'Ru’ba',                kind: 'poet',          variants: ['رؤبة بن العجاج', 'رؤبة'] },
  { name: 'Dhu al-Isba‘',         kind: 'poet',          variants: ['ذو الإصبع العدواني'] },

  // ── Abbasid + later poets ───────────────────────────────────────────
  { name: 'Abu Nuwas',            kind: 'poet',          variants: ['أبو نواس'] },
  { name: 'Bashshar',             kind: 'poet',          variants: ['بشار بن برد'] },
  { name: 'Abu Tammam',           kind: 'poet',          variants: ['أبو تمام'] },
  { name: 'al-Buhturi',           kind: 'poet',          variants: ['البحتري'] },
  { name: 'al-Mutanabbi',         kind: 'poet',          variants: ['المتنبي'] },
  { name: 'al-Ma‘arri',           kind: 'poet',          variants: ['أبو العلاء المعري', 'المعري'] },
  { name: 'Ibn al-Rumi',          kind: 'poet',          variants: ['ابن الرومي'] },

  // ── The Prophet ─────────────────────────────────────────────────────
  { name: 'The Prophet ﷺ',        kind: 'prophet',       variants: ['النبي صلى الله عليه وسلم', 'النبي ﷺ', 'رسول الله'] },

  // ── Mined via weak-supervision (`قال X:` pattern scan, ≥10 hits) ────
  // Names auto-discovered from the Lisan corpus that the hand-curated
  // registry didn't have. Each promoted only after manual review against
  // generic-pronoun / book-reference / verb noise.
  { name: 'al-Layth',              kind: 'lexicographer', variants: ['الليث بن المظفر', 'الليث'], anchored: true },
  { name: 'Ibn Shumayl (short)',   kind: 'lexicographer', variants: ['ابن شميل'] },
  { name: 'Abu al-Haytham',        kind: 'lexicographer', variants: ['أبو الهيثم الرازي', 'أبو الهيثم'] },
  { name: 'Abu Saʿid al-Sirafi',   kind: 'grammarian',    variants: ['أبو سعيد السيرافي', 'أبو سعيد'] },
  { name: 'Ibn Buzurj',            kind: 'lexicographer', variants: ['ابن بزرج'] },
  { name: 'Abu Hatim al-Sijistani',kind: 'lexicographer', variants: ['أبو حاتم السجستاني', 'أبو حاتم'] },
  { name: 'Ibn Muqbil',            kind: 'poet',          variants: ['تميم بن أبي بن مقبل', 'ابن مقبل'] },
  { name: 'Abu al-Najm al-ʿIjli',  kind: 'poet',          variants: ['أبو النجم العجلي', 'أبو النجم'] },
  { name: 'Kuraʿ al-Naml',         kind: 'lexicographer', variants: ['كراع النمل', 'كراع'], anchored: true },
  { name: 'Ibn Kaysan',            kind: 'grammarian',    variants: ['ابن كيسان'] },
  { name: 'al-Shammakh',           kind: 'poet',          variants: ['الشماخ بن ضرار', 'الشماخ'] },
  { name: 'Ibn Khalawayh',         kind: 'grammarian',    variants: ['ابن خالويه'] },
  { name: 'Abu Dhu’ayb al-Hudhali',kind: 'poet',          variants: ['أبو ذؤيب الهذلي', 'أبو ذؤيب'] },
  { name: 'al-Raʿi al-Numayri',    kind: 'poet',          variants: ['الراعي النميري', 'الراعي'], anchored: true },
  { name: 'Abu ʿUbayda Maʿmar',    kind: 'lexicographer', variants: ['أبو عبيدة معمر', 'أبو عبيدة'] },
  { name: 'Abu Misḥal al-Aʿrabi',  kind: 'lexicographer', variants: ['أبو مسحل الأعرابي'] },
  { name: 'Abu Bakr al-Anbari',    kind: 'grammarian',    variants: ['أبو بكر بن الأنباري'] },
  // Generic poet / rajaz cue markers — count them so the UI can show
  // "12 anonymous poet citations" but they're not specific identities.
  { name: 'anon. poet',            kind: 'poet',          variants: ['الشاعر'], anchored: true },
  { name: 'anon. rajaz',           kind: 'poet',          variants: ['الراجز'], anchored: true },
];

// Pre-build a map of (variant-stripped → canonical) for one-pass scanning.
// Each entry stores its raw byte length so we can advance the cursor past
// the original-form span in the source (which may include diacritics).
interface ScanSpec {
  variant: string; stripped: string; canonical: string;
  kind: AuthorityKind; anchored: boolean;
}
const SCAN_SPECS: ScanSpec[] = [];
for (const a of AUTHORITIES) {
  for (const v of a.variants) {
    SCAN_SPECS.push({
      variant: v, stripped: stripDiac(v), canonical: a.name, kind: a.kind,
      anchored: a.anchored ?? false,
    });
  }
}
// Sort by stripped-length DESC so longer variants match first.
SCAN_SPECS.sort((a, b) => b.stripped.length - a.stripped.length);

function isBoundary(ch: string | undefined): boolean {
  if (!ch) return true;
  return /\s|[.,،؛:!؟?()\[\]«»"'\-—]/.test(ch);
}

function scanAuthoritySpans(part: string): Array<{
  start: number; end: number; name: string; label: string; kind: AuthorityKind;
}> {
  // Strip diacritics into a parallel string with index mapping, scan there
  const stripped: string[] = [];
  const map: number[] = [];   // map[stripped_idx] = original_idx
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if (!/[ً-ْٰۖ-ۭـ]/.test(ch)) {
      stripped.push(ch);
      map.push(i);
    }
  }
  const sn = stripped.join('');

  const hits: Array<{ start: number; end: number; name: string; label: string; kind: AuthorityKind }> = [];
  const taken: boolean[] = new Array(sn.length).fill(false);

  for (const spec of SCAN_SPECS) {
    let from = 0;
    while (true) {
      const i = sn.indexOf(spec.stripped, from);
      if (i < 0) break;
      const j = i + spec.stripped.length;
      from = i + 1;
      // Skip if overlapping a previously-claimed span
      if (taken.slice(i, j).some(Boolean)) continue;
      if (spec.anchored) {
        if (!isBoundary(sn[i - 1]) || !isBoundary(sn[j])) continue;
      }
      for (let k = i; k < j; k++) taken[k] = true;
      hits.push({
        start: map[i],
        end:   (map[j - 1] ?? part.length - 1) + 1,
        name:  spec.canonical,
        label: spec.variant,
        kind:  spec.kind,
      });
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}

function detectAuthorities(text: string): Array<{ name: string; label: string; kind: AuthorityKind }> {
  return scanAuthoritySpans(text).map(h => ({ name: h.name, label: h.label, kind: h.kind }));
}
