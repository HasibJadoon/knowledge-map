// ─── /al/lex/v2/read/lane_lexicon/:root_norm — Lane composer ────────────────
//
// Lane's "An Arabic-English Lexicon" is structurally unlike every other
// source in the corpus:
//   ▸ Sections are PER-VERB-FORM (form I, II, III, …) within a root.
//     Each section's `text_ar` is just the form headword (e.g. كَتَّبَ).
//     The real bilingual content lives in `definition` blocks.
//   ▸ Definition blocks interleave English explanation with Arabic
//     forms in `{…}` braces, scholarly sigla in parens `(Ṣ, Ḳ, TA)`,
//     cross-references marked by `↓`, and figurative-meaning markers
//     `‡` and `†`.
//   ▸ Authority attribution is structured — each block has tags like
//     `#authority:TA` and `block_links` with `link_kind='authority'`
//     covering 30+ scholarly codes (TA, M, L, Mgh, Lth, JK, Az, Fr, …).
//   ▸ Qur'ān refs are pre-resolved (2,526 rows) and linked by block.
//
// The composer turns this into a LaneReadView the front-end can render
// as bilingual prose with click-through to authorities, Qur'ān verses,
// and cross-referenced forms.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo } from '../repositories/sources.repo';

// Slug stays in code — it's the URL path segment, not metadata. The SOURCE_META
// object that used to live here was deleted in favour of D1-backed metadata
// resolved per-request via SourcesRepo.bySlug(SOURCE_SLUG); see fetchLaneMeta().
const SOURCE_SLUG = 'lane_lexicon';

interface LaneSourceMeta {
  slug:      string;
  title_ar:  string;
  title_en:  string;
  author:    string;
  period:    string;
  origin:    'lane';
  bilingual: true;
}

/** Resolve the Lane display metadata from ar_ling_source. The route is
 *  edge-cached, so this runs once per cache miss and the result is included
 *  in the cached response body — no per-request hit in the steady state. */
async function fetchLaneMeta(db: D1Database): Promise<LaneSourceMeta> {
  const row = await new SourcesRepo(db).bySlug(SOURCE_SLUG);
  // Fallback shape ensures the response type stays stable even if the row
  // somehow disappears from D1 (post-migration regression, dev sandbox).
  return {
    slug:      SOURCE_SLUG,
    title_ar:  row?.title_ar ?? 'معجم لين العربي الإنجليزي',
    title_en:  row?.title_en ?? "Lane's Arabic-English Lexicon",
    author:    row?.author_name ?? 'Edward William Lane',
    period:    row?.period_label ?? '19th century',
    origin:    'lane',
    bilingual: true,
  };
}

// ── Scholar / source sigla used throughout Lane (Table IV expansion) ────
const SIGLA: Record<string, { ar: string; en: string }> = {
  'TA':  { ar: 'تاج العروس',                en: 'Taj al-Arus (al-Zabidi)' },
  'M':   { ar: 'المحكم',                    en: 'al-Muḥkam (Ibn Sidah)' },
  'L':   { ar: 'لسان العرب',                en: 'Lisan al-Arab (Ibn Manzur)' },
  'Ṣ':   { ar: 'الصحاح',                    en: 'al-Ṣiḥāḥ (al-Jawhari)' },
  'S':   { ar: 'الصحاح',                    en: 'al-Ṣiḥāḥ (al-Jawhari)' },
  'Ḳ':   { ar: 'القاموس المحيط',            en: 'al-Qāmūs al-Muḥīṭ (al-Firuzabadi)' },
  'K':   { ar: 'القاموس المحيط',            en: 'al-Qāmūs al-Muḥīṭ (al-Firuzabadi)' },
  'A':   { ar: 'أساس البلاغة',              en: 'Asās al-Balāgha (al-Zamakhshari)' },
  'T':   { ar: 'تهذيب اللغة',               en: 'Tahdhīb al-Lugha (al-Azhari)' },
  'O':   { ar: 'العباب الزاخر',             en: 'al-ʿUbāb al-Zākhir (al-Saghani)' },
  'Mṣb': { ar: 'المصباح المنير',            en: 'al-Miṣbāḥ al-Munīr (al-Fayyumi)' },
  'Mgh': { ar: 'المغرب',                    en: 'al-Mughrib (al-Muṭarrizi)' },
  'JK':  { ar: 'كتاب العين',                en: "Kitāb al-ʿAyn (al-Khalīl)" },
  'Msb': { ar: 'المصباح المنير',            en: 'al-Miṣbāḥ al-Munīr' },
  'IDrd':{ ar: 'ابن دريد',                  en: 'Ibn Durayd' },
  'AZ':  { ar: 'أبو زيد الأنصاري',          en: 'Abu Zayd al-Anṣārī' },
  'Az':  { ar: 'الأزهري',                   en: 'al-Azhari' },
  'Lḥ':  { ar: 'اللحياني',                  en: 'al-Liḥyānī' },
  'Lth': { ar: 'الليث',                     en: 'al-Layth (ibn al-Muẓaffar)' },
  'MF':  { ar: 'محب الدين الفاسي',          en: 'Muḥibb al-Dīn al-Fāsī' },
  'Fr':  { ar: 'الفراء',                    en: 'al-Farrāʾ' },
  'Zj':  { ar: 'الزجاج',                    en: 'al-Zajjāj' },
  'IAạr':{ ar: 'ابن الأعرابي',              en: 'Ibn al-Aʿrābī' },
  'Ṣgh': { ar: 'الصاغاني',                  en: 'al-Ṣāghānī' },
  'IB':  { ar: 'ابن بري',                   en: 'Ibn Barrī' },
  'ISh': { ar: 'ابن شميل',                  en: 'Ibn Shumayl' },
  'Mb':  { ar: 'المبرد',                    en: 'al-Mubarrad' },
  'AḤn': { ar: 'أبو حنيفة الدينوري',        en: 'Abū Ḥanīfa al-Dīnawarī' },
  'Sb':  { ar: 'سيبويه',                    en: 'Sibawayh' },
  'AObd':{ ar: 'أبو عبيد',                  en: 'Abū ʿUbayd' },
  'Aʿṣm':{ ar: 'الأصمعي',                   en: 'al-Aṣmaʿī' },
  'IAth':{ ar: 'ابن الأثير',                en: 'Ibn al-Athīr' },
  'IF':  { ar: 'ابن فارس',                  en: 'Ibn Fāris' },
  'IJ':  { ar: 'ابن جني',                   en: 'Ibn Jinnī' },
  'AHat':{ ar: 'أبو حاتم السجستاني',        en: 'Abū Ḥātim al-Sijistānī' },
  'Mz':  { ar: 'المزني',                    en: 'al-Muzanī' },
};

// ── Response shape ───────────────────────────────────────────────────────────

interface LaneToken_Text     { kind: 'text';     value: string; }
interface LaneToken_Arabic   { kind: 'arabic';   value: string; }   // {…} brace form
interface LaneToken_Headword { kind: 'headword'; value: string; }   // text after ⇒
interface LaneToken_Siglum   { kind: 'siglum';   code: string; name_en: string; name_ar: string; raw: string; }
interface LaneToken_CrossRef { kind: 'cross_ref'; target: string; }  // form before ↓
interface LaneToken_Quran    { kind: 'quran'; surah: number; ayah: number; raw: string; }
interface LaneToken_Figurative{ kind: 'figurative'; }                // ‡ / † marker
interface LaneToken_Break    { kind: 'br'; }

type LaneToken =
  | LaneToken_Text | LaneToken_Arabic | LaneToken_Headword
  | LaneToken_Siglum | LaneToken_CrossRef | LaneToken_Quran
  | LaneToken_Figurative | LaneToken_Break;

interface LanePeer {
  /** The sense letter — Lane uses "A", "A1", "A2", "B", "C" etc. */
  label: string | null;
  /** Optional "Signification" or "Dissociation" descriptor. */
  kind: 'signification' | 'dissociation' | 'plain' | null;
  tokens: LaneToken[];
}

interface LaneVerbForm {
  section_id: string;
  form_num: number | null;          // 1-10 = forms I-X, null if not derivable
  form_label_ar: string | null;     // e.g. كَتَّبَ
  page_no: number | null;
  /** Top-level header "1. ⇒ كتب" line (heading paragraph). */
  header_tokens: LaneToken[];
  /** The senses / sub-meanings, split on Lane's "Dissociation / Signification" markers. */
  senses: LanePeer[];
}

interface LaneReadView {
  kind: 'lane';
  meta: LaneSourceMeta;
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: unknown | null;
  forms: LaneVerbForm[];
  authorities: {
    code: string; name_en: string; name_ar: string;
    count: number;
  }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  cross_refs: { target: string; count: number }[];
  stats: {
    forms: number;
    senses: number;
    authorities: number; authority_total: number;
    quran_citations: number;
    cross_refs: number;
  };
}

// ── Public route ─────────────────────────────────────────────────────────────

export function lexiconLaneRoutes(router: Router<ArLinguisticsEnv>) {
  // Edge-cached per (root) — Lane entries are immutable post-ingest.
  router.get(
    `/al/lex/v2/read/${SOURCE_SLUG}/:root_norm`,
    (req, env, params) => cached(req, async () => {
      const root_norm = (params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      const entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id
         FROM ar_ling_lexicon_entry
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(SOURCE_SLUG, root_norm).first<any>();
      if (!entry) return notFound('entry not found in Lane');

      const sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no
         FROM ar_ling_lexicon_entry_section
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, text_html, data_json, printed_page
         FROM ar_ling_lexicon_block
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const quranRefs = (await env.DB_AL.prepare(
        `SELECT block_id, surah, ayah, raw_ref, context_snippet
         FROM ar_ling_lexicon_quran_ref
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY surah, ayah`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const authorityLinks = (await env.DB_AL.prepare(
        `SELECT from_block_id, to_authority_code, label
         FROM ar_ling_lexicon_block_link
         WHERE source_slug = ? AND link_kind = 'authority'
           AND from_block_id IN (
             SELECT id FROM ar_ling_lexicon_block
             WHERE source_slug = ? AND root_norm = ?
           )`
      ).bind(SOURCE_SLUG, SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const rootLinks = (await env.DB_AL.prepare(
        `SELECT to_root_norm, label, COUNT(*) AS n
         FROM ar_ling_lexicon_block_link
         WHERE source_slug = ? AND link_kind = 'root'
           AND from_block_id IN (
             SELECT id FROM ar_ling_lexicon_block
             WHERE source_slug = ? AND root_norm = ?
           )
         GROUP BY to_root_norm`
      ).bind(SOURCE_SLUG, SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const meta = await fetchLaneMeta(env.DB_AL);
      const view = composeView(entry, sectionsRaw, blocks, quranRefs,
                               authorityLinks, rootLinks, canonical, meta);
      return ok(view);
    }),
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function composeView(
  entry: any, rawSections: any[], rawBlocks: any[],
  quranRefs: any[], authorityLinks: any[], rootLinks: any[],
  canonical: any | null,
  meta: LaneSourceMeta,
): LaneReadView {
  // refs by block_id for inline placement
  const refsByBlock = new Map<string, { surah: number; ayah: number; raw: string }[]>();
  for (const r of quranRefs) {
    if (!r.block_id) continue;
    const arr = refsByBlock.get(r.block_id) ?? [];
    arr.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    refsByBlock.set(r.block_id, arr);
  }

  // Aggregate authorities entry-wide.
  const authCounts = new Map<string, number>();
  for (const a of authorityLinks) {
    if (!a.to_authority_code) continue;
    authCounts.set(a.to_authority_code, (authCounts.get(a.to_authority_code) ?? 0) + 1);
  }

  // Build forms — one LaneVerbForm per section (in section_seq order).
  const forms: LaneVerbForm[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);

    let header_tokens: LaneToken[] = [];
    const senses: LanePeer[] = [];
    let form_num: number | null = null;

    // The section's lane_itype (1-10) is the canonical Roman-numeral form
    // number. Fall back to parsing entry_header text only if it's missing.
    if (s.lane_itype && /^\d+$/.test(String(s.lane_itype))) {
      form_num = parseInt(s.lane_itype, 10);
    }

    for (const b of sectionBlocks) {
      if (b.block_type === 'page_break' || b.block_type === 'root_header') continue;

      if (b.block_type === 'entry_header') {
        const text = (b.text_plain ?? '').trim();
        if (!text) continue;
        const m = text.match(/^(\d+)\.\s+(.*)/);
        if (m) {
          if (form_num == null) form_num = parseInt(m[1], 10);
          header_tokens = [
            { kind: 'text',   value: m[1] + '. ' },
            { kind: 'arabic', value: m[2] },
          ];
        }
        continue;
      }

      if (b.block_type === 'definition') {
        // Full body lives in `text_html` (text_plain is a 400-char preview).
        const html = (b.text_html ?? '').trim();
        if (!html) {
          // No HTML body — fall back to text_plain so we at least surface something.
          const fallback = (b.text_plain ?? '').trim();
          if (fallback) {
            senses.push({ label: null, kind: 'plain', tokens: tokenize(fallback, undefined) });
          }
          continue;
        }
        const peers = splitHtmlIntoPeers(html);
        for (const p of peers) {
          senses.push({ label: p.label, kind: p.kind, tokens: p.tokens });
        }
      }
    }

    return {
      section_id: s.id,
      form_num,
      form_label_ar: s.heading_ar ?? null,
      page_no: s.page_no ?? null,
      header_tokens,
      senses,
    };
  });

  // Aggregate Quran citations entry-wide
  const qAgg = new Map<string, {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }>();
  for (const r of quranRefs) {
    const key = `${r.surah}:${r.ayah}`;
    const cur = qAgg.get(key);
    if (cur) cur.count++;
    else qAgg.set(key, {
      surah: r.surah, ayah: r.ayah, raw: r.raw_ref,
      context_snippet: r.context_snippet, count: 1,
    });
  }

  const authorities = [...authCounts.entries()]
    .map(([code, count]) => ({
      code, count,
      name_en: SIGLA[code]?.en ?? code,
      name_ar: SIGLA[code]?.ar ?? code,
    }))
    .sort((a, b) => b.count - a.count);

  const cross_refs = rootLinks
    .filter((r: any) => r.to_root_norm)
    .map((r: any) => ({ target: r.to_root_norm as string, count: Number(r.n) }))
    .sort((a, b) => b.count - a.count);

  const total_senses = forms.reduce((s, f) => s + f.senses.length, 0);

  return {
    kind: 'lane',
    meta,
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    forms,
    authorities,
    quran_citations: [...qAgg.values()].sort(
      (a, b) => a.surah - b.surah || a.ayah - b.ayah,
    ),
    cross_refs,
    stats: {
      forms: forms.length,
      senses: total_senses,
      authorities: authorities.length,
      authority_total: authorities.reduce((s, a) => s + a.count, 0),
      quran_citations: qAgg.size,
      cross_refs: cross_refs.length,
    },
  };
}

// ── Sense splitter (Lane's dissociation / signification markers) ────────────
//
// Lane definitions are nominally one block but contain MANY senses, each
// introduced by ingestion-inserted markers:
//
//   `Root: <root> - Entry: N. ＝ Dissociation: A` (then text…)
//   `Root: <root> - Entry: N. ― Signification: A1` (then text…)
//
// The first chunk (before any marker) is the primary sense. Subsequent
// chunks each get a label (A, A1, A2, B, …).
const SENSE_SPLIT_RX =
  /(?:Root:\s*\S+\s*-\s*Entry:\s*\d+\.\s*[＝―]\s*(Dissociation|Signification):\s*)([A-Z]\d*)/g;

function splitIntoPeers(text: string): {
  text: string; label: string | null; kind: 'signification' | 'dissociation' | 'plain' | null;
}[] {
  const peers: { text: string; label: string | null; kind: any }[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let prev: { label: string | null; kind: any } = { label: null, kind: 'plain' };
  SENSE_SPLIT_RX.lastIndex = 0;
  while ((m = SENSE_SPLIT_RX.exec(text)) != null) {
    const chunk = text.slice(lastIdx, m.index).trim();
    if (chunk) peers.push({ text: chunk, ...prev });
    prev = {
      label: m[2],
      kind: m[1].toLowerCase() === 'dissociation' ? 'dissociation' : 'signification',
    };
    lastIdx = m.index + m[0].length;
  }
  const tail = text.slice(lastIdx).trim();
  if (tail) peers.push({ text: tail, ...prev });
  return peers;
}

// ── Tokenizer ──────────────────────────────────────────────────────────────
//
// Walks the cleaned text and emits a stream of tokens. Recognizes:
//   • {…}          → arabic-form pill
//   • ⇒ Word…      → headword (capture the word and the rest as text)
//   • (Sigla)      → siglum chip (look up in SIGLA registry)
//   • word↓        → cross-reference (word before the arrow links to that entry)
//   • ‡  / †       → figurative marker
//   • everything else → text run (mixed-direction, UI handles bidi)

const BRACE_RX  = /\{([^}]+)\}/g;
const ARROW_RX  = /⇒\s+(\S+)/g;
const FIG_RX    = /[‡†]/g;
const CROSS_RX  = /(\S+)↓/g;
// Parens that look like sigla-lists: only short capitalized codes + comma
// separated. Captures inner text; UI splits and looks up each token.
const SIGLA_RX  = /\(((?:[A-ZḤḲṢʿ][A-Za-zḥḳṣʿ]{0,4}(?:\s*,\s*[A-ZḤḲṢʿ][A-Za-zḥḳṣʿ]{0,4})*)\s*[;:]?)\)/g;
// Lane's INLINE Qur'ān reference notation: `[Roman. N]` where Roman is
// the surah number in lowercase Roman numerals (i, ii, iii, …, cxiv)
// and N is the ayah number in Arabic digits. Example: `[ii. 143]`.
// Variants seen: `[ii. 143]`, `[Kur ii. 143]`, `[Ḳur. ii. 143]`.
const QURAN_INLINE_RX = /\[(?:(?:Kur|Ḳur|Ḳur\.|Ḳ)\.?\s+)?([ivxlcdm]+)\.\s*(\d{1,3})\s*\]/gi;

function romanToInt(roman: string): number {
  const map: Record<string, number> = {
    i:1, v:5, x:10, l:50, c:100, d:500, m:1000,
  };
  const s = roman.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] ?? 0;
    const next = map[s[i+1]] ?? 0;
    if (next > cur) { total -= cur; } else { total += cur; }
  }
  return total;
}

interface Mark { start: number; end: number; token: LaneToken; }

function tokenize(text: string,
                  refs: { surah: number; ayah: number; raw: string }[] | undefined): LaneToken[] {
  if (!text) return [];
  // Normalize whitespace once
  const flat = text.replace(/\s+/g, ' ').trim();
  const marks: Mark[] = [];

  const scan = (rx: RegExp, build: (m: RegExpExecArray) => LaneToken | LaneToken[] | null) => {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(flat)) != null) {
      const t = build(m);
      if (!t) continue;
      const tokens = Array.isArray(t) ? t : [t];
      for (const tok of tokens) {
        marks.push({ start: m.index, end: m.index + m[0].length, token: tok });
      }
    }
  };

  scan(BRACE_RX, m => ({ kind: 'arabic', value: m[1].trim() }));
  scan(ARROW_RX, m => ({ kind: 'headword', value: m[1] }));
  // Inline Qur'ān refs: `[ii. 143]` → quran token. Surah from Roman.
  scan(QURAN_INLINE_RX, m => {
    const surah = romanToInt(m[1]);
    const ayah  = parseInt(m[2], 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return null;
    if (!Number.isFinite(ayah) || ayah < 1) return null;
    return { kind: 'quran', surah, ayah, raw: m[0] };
  });
  scan(SIGLA_RX, m => {
    const inner = m[1].replace(/[;:]/g, '').trim();
    const codes = inner.split(/\s*,\s*/).filter(Boolean);
    // Build a parent siglum token for the whole paren group; we'll let
    // the UI split into chips at render time using `raw`.
    if (codes.length === 0) return null;
    return {
      kind: 'siglum',
      code: codes[0],
      name_en: SIGLA[codes[0]]?.en ?? codes[0],
      name_ar: SIGLA[codes[0]]?.ar ?? codes[0],
      raw: inner,
    };
  });
  scan(CROSS_RX, m => ({ kind: 'cross_ref', target: m[1] }));
  scan(FIG_RX, () => ({ kind: 'figurative' }));

  // Resolve overlaps: prefer longer matches at the same start; fall back
  // to first-emitted.
  marks.sort((a, b) =>
    a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const accepted: Mark[] = [];
  let lastEnd = 0;
  for (const mk of marks) {
    if (mk.start < lastEnd) continue;
    accepted.push(mk); lastEnd = mk.end;
  }

  // Emit text-runs between accepted marks.
  const out: LaneToken[] = [];
  let cur = 0;
  for (const mk of accepted) {
    if (mk.start > cur) {
      const slice = flat.slice(cur, mk.start);
      if (slice.trim()) out.push({ kind: 'text', value: slice });
    }
    out.push(mk.token);
    cur = mk.end;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail.trim()) out.push({ kind: 'text', value: tail });
  }

  // NB: deliberately do NOT append Quran chips inline at the end of the
  // token stream. Lane already writes its native `[ii. 143]` style refs
  // INTO the prose where they belong — those survive as plain text. The
  // pre-resolved (surah, ayah) verses from `ar_ling_lexicon_quran_ref`
  // are surfaced cleanly in the right-rail "Qur'ān citations" panel,
  // which is the right place for them. Appending them inline at the
  // paragraph tail produced an ugly trailing chip cluster.
  return out;
}

// ── HTML walker (full body) ─────────────────────────────────────────────────
//
// Lane's `text_html` is the source of truth (text_plain is a 400-char
// preview). The HTML shape is well-formed Perseus-style markup:
//
//   <div class="sense visible" id="Ate_1_A1"><p>… body …</p></div>
//   <div class="signification visible">…label divider…</div>
//   <div class="sense visible" id="Ate_1_A2">…</div>
//
// Inline within <p>:
//   <span class="ar">…</span>     — Arabic form pill
//   <span class="ar long">…</span> — long Arabic phrase (Qur'an text, verse)
//   <span class="auth">(…)</span> — siglum list (parens INSIDE the span)
//   <span class="add">[…]</span>  — editorial addition (brackets inside)
//   <em>…</em>                    — emphasized text
//   <a href="#root-file:…">…</a>  — cross-reference to another root
//   [ii. 143]                     — inline Qur'an reference (plain text)

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Find matching close index for a given open-tag end position. Handles
 *  nesting by counting open/close of the same tag name. Returns the index
 *  of the `<` of the matching close tag, or -1. */
function findMatchingClose(html: string, openEnd: number, tagName: string): number {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  const close = new RegExp(`</${tagName}>`, 'gi');
  open.lastIndex = openEnd + 1;
  close.lastIndex = openEnd + 1;
  let depth = 1;
  while (depth > 0) {
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth++;
      close.lastIndex = c.index;
      continue;
    }
    depth--;
    if (depth === 0) return c.index;
    open.lastIndex = c.index + 1;
  }
  return -1;
}

/** Scan a plain-text fragment for inline Qur'an refs `[ii. 143]` and
 *  emit a mix of text + quran tokens. */
function emitTextWithQuranRefs(text: string, out: LaneToken[]): void {
  if (!text) return;
  const flat = decodeEntities(text);
  QURAN_INLINE_RX.lastIndex = 0;
  let cur = 0;
  let m: RegExpExecArray | null;
  while ((m = QURAN_INLINE_RX.exec(flat)) != null) {
    const surah = romanToInt(m[1]);
    const ayah  = parseInt(m[2], 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
    if (!Number.isFinite(ayah) || ayah < 1) continue;
    if (m.index > cur) {
      const slice = flat.slice(cur, m.index);
      if (slice) out.push({ kind: 'text', value: slice });
    }
    out.push({ kind: 'quran', surah, ayah, raw: m[0] });
    cur = m.index + m[0].length;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail) out.push({ kind: 'text', value: tail });
  }
}

/** Walk inline HTML and emit a LaneToken[] stream. Recurses into nested
 *  structural elements (e.g. <span class="add">[…<span class="ar">…</span>]</span>). */
function tokenizeHtml(html: string): LaneToken[] {
  const out: LaneToken[] = [];
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (!textBuf) return;
    emitTextWithQuranRefs(textBuf, out);
    textBuf = '';
  };

  while (i < html.length) {
    const ch = html[i];
    if (ch !== '<') { textBuf += ch; i++; continue; }
    const tagEnd = html.indexOf('>', i);
    if (tagEnd === -1) { textBuf += ch; i++; continue; }
    const rawTag = html.slice(i, tagEnd + 1);
    const tag = rawTag.toLowerCase();

    // <br> self-closing
    if (tag.startsWith('<br')) {
      flushText();
      out.push({ kind: 'br' });
      i = tagEnd + 1;
      continue;
    }

    // <span class="ar"...> — Arabic pill
    if (/^<span\s[^>]*class="ar(?:\s+long)?"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = stripTags(html.slice(tagEnd + 1, close));
      if (inner) out.push({ kind: 'arabic', value: inner });
      i = close + '</span>'.length;
      continue;
    }

    // <span class="auth"> — siglum list (parens INSIDE)
    if (/^<span\s[^>]*class="auth"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = stripTags(html.slice(tagEnd + 1, close));
      const cleaned = inner.replace(/^\s*\(/, '').replace(/[;:,]?\s*\)\s*$/, '').trim();
      const codes = cleaned.split(/\s*,\s*/).map(c => c.replace(/\*$/, '').trim()).filter(Boolean);
      if (codes.length) {
        out.push({
          kind: 'siglum',
          code: codes[0],
          name_en: SIGLA[codes[0]]?.en ?? codes[0],
          name_ar: SIGLA[codes[0]]?.ar ?? codes[0],
          raw: cleaned,
        });
      }
      i = close + '</span>'.length;
      continue;
    }

    // <span class="add"> — editorial addition; recursively tokenize so
    // nested <span class="ar">…</span> still renders. Lane's HTML usually
    // already includes literal [ … ] inside the span, so we DO NOT add
    // our own brackets — that would produce ugly `[[ … ]]` doubling.
    if (/^<span\s[^>]*class="add"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      out.push(...tokenizeHtml(inner));
      i = close + '</span>'.length;
      continue;
    }

    // <em> — emphasized text (italics). Recurse to preserve any nested ar spans.
    if (/^<em\b/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'em');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      out.push(...tokenizeHtml(inner));
      i = close + '</em>'.length;
      continue;
    }

    // <a href="..."> — cross-references
    if (/^<a\s/.test(tag)) {
      flushText();
      const hrefMatch = rawTag.match(/href="([^"]+)"/);
      const close = findMatchingClose(html, tagEnd, 'a');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      const href = hrefMatch?.[1] ?? '';
      // Lane's cross-root anchors: `#root-file:01_A/016_Atw`
      if (href.startsWith('#root-file:')) {
        // Prefer Arabic from inner <span class="ar">…</span>
        const arMatch = inner.match(/<span[^>]*class="ar(?:\s+long)?"[^>]*>([^<]+)<\/span>/);
        const target = arMatch ? stripTags(arMatch[1]) : href.replace('#root-file:', '');
        out.push({ kind: 'cross_ref', target });
      } else {
        // Intra-page anchor (e.g. `#Ate_4`) or other — just inline the text
        out.push(...tokenizeHtml(inner));
      }
      i = close + '</a>'.length;
      continue;
    }

    // <p>, </p>, <div>, </div>, </span>, </em>, </a> stragglers: skip the tag
    i = tagEnd + 1;
  }

  flushText();
  return out;
}

/** Split a definition block's HTML into peer chunks (one per `<div
 *  class="sense">`). Sense ids encode the label (e.g. `Ate_1_A2` → "A2");
 *  preceding `<div class="signification|dissociation">` markers determine
 *  the kind. */
function splitHtmlIntoPeers(html: string): {
  tokens: LaneToken[]; label: string | null; kind: 'signification' | 'dissociation' | 'plain' | null;
}[] {
  const peers: { tokens: LaneToken[]; label: string | null; kind: any }[] = [];

  // Strip the leading <h3 class="entry">…</h3> heading (it duplicates the
  // section heading which the UI renders separately).
  let body = html.replace(/<h3\b[^>]*class="entry"[^>]*>[\s\S]*?<\/h3>/i, '');

  // Walk through, identifying sense and marker divs.
  // Pattern: alternating markers (signification|dissociation) and sense divs.
  const markerRx = /<div\s+class="(signification|dissociation)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const senseRx  = /<div\s+class="sense[^"]*"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div\s+class="(?:signification|dissociation|sense)|$))/gi;

  // Find marker positions
  const markers: { start: number; end: number; kind: 'signification' | 'dissociation' }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = markerRx.exec(body)) != null) {
    markers.push({ start: mm.index, end: mm.index + mm[0].length, kind: mm[1] as any });
  }

  // Find senses
  const senses: { start: number; end: number; id: string; inner: string }[] = [];
  let ss: RegExpExecArray | null;
  senseRx.lastIndex = 0;
  while ((ss = senseRx.exec(body)) != null) {
    senses.push({ start: ss.index, end: ss.index + ss[0].length, id: ss[1], inner: ss[2] });
  }

  // Fallback: if no <div class="sense"> found, treat entire body as one peer
  if (senses.length === 0) {
    const tokens = tokenizeHtml(body);
    if (tokens.length) peers.push({ tokens, label: null, kind: 'plain' });
    return peers;
  }

  for (const sense of senses) {
    // Label from id suffix (e.g. "Ate_1_A2" → "A2", "A_B1" → "B1")
    const idParts = sense.id.split('_');
    const label = idParts.length > 1 ? idParts[idParts.length - 1] : sense.id;

    // Find the most-recent marker that precedes this sense (within ~200 chars)
    let kind: 'signification' | 'dissociation' | 'plain' = 'plain';
    for (let k = markers.length - 1; k >= 0; k--) {
      if (markers[k].end <= sense.start) {
        kind = markers[k].kind;
        break;
      }
    }

    const tokens = tokenizeHtml(sense.inner);
    if (tokens.length) peers.push({ tokens, label, kind });
  }

  return peers;
}
