// ─── /al/lexicon/five-lens route ──────────────────────────────────────────────
//
// Display-only "Five-Lens" lexicon lookup for a single Arabic root. Tapping a
// word in the Quran reading view surfaces a context menu whose "Five-Lens"
// action opens a modal that calls this endpoint with the word's normalized
// root (qr_word_occurrences.root).
//
//   GET /al/lexicon/five-lens/:rootNorm
//   → exposed publicly via the backend gateway as
//     GET /api/al/lexicon/five-lens/:rootNorm
//
// Assembles the full five-lens payload from km_arabic_linguistic (binding
// DB_AL). The curated, bilingual content lives in ar_ling_lexicon_blocks as
// sanitized HTML (text_html) — the ayah (Arabic + gloss) and each of the five
// lens bodies (Arabic spans inline with English), plus the cross-ref block —
// so the client renders the manuscript leaf directly. Provenance comes from
// ar_ling_lexicon_root_entry_sources, grouped by kind. Only the root "زلف" has
// an entry today (id re_kmaps_zlf_zumar_3); every other root resolves to
// { found: false } so the modal can paint its empty state. Read-only — never
// writes, never touches doc-space.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

const SOURCE_SLUG = 'kmaps_five_lens';

/** Normalize an Arabic root the same way ingestion stores `root_norm`:
 *  strip harakat and fold alif / ya / ta-marbuta variants. Mirrors the
 *  private helper in routes/lexicon.ts so a tapped word's raw root matches
 *  the stored normalized key. */
function normArabic(t: string): string {
  return t
    .replace(/[ً-ٰٟ]/g, '') // harakat / superscript alif
    .replace(/[أإآ]/g, 'ا') // أ إ آ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .trim();
}

function parseJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

interface EntryRow {
  id: string;
  root_text: string;
  entry_text_ar: string | null;
  entry_text_en: string | null;
  status: string;
}

interface BlockRow {
  block_seq: number;
  block_type: string;
  title_ar: string | null;
  title_en: string | null;
  text_html: string | null;
  data_json: string | null;
}

interface SourceRow {
  source_kind: string;
  source_slug: string;
}

interface LemmaRow {
  lemma_text: string;
  lemma_text_bare: string | null;
  part_of_speech: string;
  is_quran_word: number;
}

export function lexiconFiveLensRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/lexicon/five-lens/:rootNorm
  router.get('/al/lexicon/five-lens/:rootNorm', async (_req, env, params) => {
    const raw = decodeURIComponent((params as Record<string, string>).rootNorm ?? '');
    if (!raw) return badRequest('rootNorm required');

    const rootNorm = normArabic(raw);

    const entry = await env.DB_AL
      .prepare(
        `SELECT id, root_text, entry_text_ar, entry_text_en, status
           FROM ar_ling_lexicon_root_entries
          WHERE source_slug = ?1 AND root_norm = ?2
          LIMIT 1`,
      )
      .bind(SOURCE_SLUG, rootNorm)
      .first<EntryRow>();

    // No curated five-lens entry for this root yet — return a successful
    // empty payload so the modal renders its (non-error) empty state.
    if (!entry) return ok({ found: false });

    const [blocks, sources, lemmaRows] = await Promise.all([
      env.DB_AL
        .prepare(
          `SELECT block_seq, block_type, title_ar, title_en, text_html, data_json
             FROM ar_ling_lexicon_blocks
            WHERE root_entry_id = ?1
            ORDER BY block_seq`,
        )
        .bind(entry.id)
        .all<BlockRow>(),
      env.DB_AL
        .prepare(
          `SELECT source_kind, source_slug
             FROM ar_ling_lexicon_root_entry_sources
            WHERE root_entry_id = ?1`,
        )
        .bind(entry.id)
        .all<SourceRow>(),
      // Word constellation: the derivational family for this root, pulled live
      // from the canonical lemma store (same DB_AL). Qur'anic + frequent forms
      // rank first so the representative of each form/POS is the meaningful one.
      env.DB_AL
        .prepare(
          `SELECT l.lemma_text, l.lemma_text_bare, l.part_of_speech, l.is_quran_word
             FROM ar_ling_lemmas l
             JOIN ar_ling_roots r ON l.root_id = r.id
            WHERE r.root_text = ?1 AND l.part_of_speech <> 'root_entry'
            ORDER BY l.is_quran_word DESC, l.frequency_quran DESC, l.lemma_text`,
        )
        .bind(entry.root_text)
        .all<LemmaRow>(),
    ]);

    const blockRows = blocks.results ?? [];

    const metaData = parseJson(blockRows.find((b) => b.block_type === 'meta')?.data_json ?? null);

    const figureBlock = blockRows.find((b) => b.block_type === 'figure') ?? null;
    const figure = figureBlock
      ? { html: figureBlock.text_html ?? '', label: (parseJson(figureBlock.data_json).label as string) ?? null }
      : null;

    const meaningData = parseJson(blockRows.find((b) => b.block_type === 'meaning')?.data_json ?? null);
    const meaning = Array.isArray(meaningData.senses) ? { senses: meaningData.senses as unknown[] } : null;

    const sarfData = parseJson(blockRows.find((b) => b.block_type === 'sarf')?.data_json ?? null);
    const morphology = Array.isArray(sarfData.forms)
      ? { note: (sarfData.note as string) ?? null, forms: sarfData.forms as unknown[], keyword: (sarfData.keyword as unknown) ?? null }
      : null;

    const retentionData = parseJson(blockRows.find((b) => b.block_type === 'retention')?.data_json ?? null);
    const retention = typeof retentionData.hook === 'string'
      ? {
          hook: retentionData.hook as string,
          anchors: Array.isArray(retentionData.anchors) ? (retentionData.anchors as unknown[]) : [],
          contrast: (retentionData.contrast as string) ?? null,
          retrieval: (retentionData.retrieval as string) ?? null,
        }
      : null;

    const ayahBlock = blockRows.find((b) => b.block_type === 'ayah') ?? null;
    const ayahData = parseJson(ayahBlock?.data_json ?? null);
    const ayah = ayahBlock
      ? {
          titleAr: ayahBlock.title_ar,
          titleEn: ayahBlock.title_en,
          surahName: (ayahData.surah_name as string) ?? null,
          html: ayahBlock.text_html ?? '',
        }
      : null;

    const lenses = blockRows
      .filter((b) => b.block_type === 'lens')
      .map((b, i) => {
        const data = parseJson(b.data_json);
        return {
          seq: i + 1,
          headingAr: b.title_ar,
          labelEn: b.title_en ?? '',
          html: b.text_html ?? '',
          ledger: (data.ledger as unknown) ?? null,
        };
      });

    const xrefBlock = blockRows.find((b) => b.block_type === 'xref') ?? null;
    const xrefData = parseJson(xrefBlock?.data_json ?? null);
    const occurrences = {
      html: xrefBlock?.text_html ?? '',
      refs: Array.isArray(xrefData.refs) ? (xrefData.refs as string[]) : [],
      families: Array.isArray(xrefData.families) ? (xrefData.families as unknown[]) : [],
    };

    // group provenance by kind: { lexicon: [...], tafsir: [...], irab: [...] }
    const grouped: Record<string, string[]> = {};
    for (const r of sources.results ?? []) {
      (grouped[r.source_kind] ??= []).push(r.source_slug);
    }

    // Build the constellation nodes: one representative per form/POS (collapse
    // pure vocalization variants), skip multiword phrases, cap the spread.
    const seen = new Set<string>();
    const nodes: { ar: string; pos: string; isQuran: boolean }[] = [];
    for (const r of lemmaRows.results ?? []) {
      const bare = r.lemma_text_bare ?? r.lemma_text;
      if (bare.includes(' ')) continue; // drop multiword expressions
      const pos = r.part_of_speech === 'verb' ? 'verb' : 'noun';
      const key = `${pos}|${bare}`;
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({ ar: r.lemma_text, pos, isQuran: r.is_quran_word === 1 });
      if (nodes.length >= 13) break;
    }
    const constellation = nodes.length
      ? { root: entry.root_text, rootSpaced: [...entry.root_text].join(' '), nodes }
      : null;

    return ok({
      found: true,
      entry: {
        id: entry.id,
        root: entry.root_text,
        rootSpaced: [...entry.root_text].join(' '),
        lemmaAr: entry.entry_text_ar,
        translit: entry.entry_text_en,
        sense: (metaData.sense as string) ?? null,
        pattern: (metaData.pattern as string) ?? null,
        surahNameAr: (metaData.surah_name_ar as string) ?? null,
        status: entry.status,
      },
      figure,
      meaning,
      morphology,
      retention,
      ayah,
      lenses,
      occurrences,
      constellation,
      sources: grouped,
    });
  });
}
