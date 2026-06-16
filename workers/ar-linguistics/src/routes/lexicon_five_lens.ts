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
// Assembles the complete five-lens payload for a root from km_arabic_linguistic
// (binding DB_AL): the root entry + the five lens sections + the ayah and
// cross-ref blocks + linked provenance. Everything the modal needs lives in one
// payload, so the client never fans out across DBs. Only the root "زلف" has an
// entry today (id re_kmaps_zlf_zumar_3); every other root resolves to
// { found: false } so the modal can paint its empty state. Read-only — never
// writes, never touches doc-space.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

const SOURCE_SLUG = 'kmaps_five_lens';

// Arabic lens heading → English label for the modal's lens rail.
const LENS_LABELS: Record<string, string> = {
  'صَرْف': 'Morphology',
  'إعراب': 'Syntax',
  'دلالة': 'Semantics',
  'بلاغة': 'Rhetoric',
  'ترجمة': 'Translation',
};

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

interface EntryRow {
  id: string;
  root_text: string;
  entry_text_en: string | null;
  status: string;
}

interface SectionRow {
  section_seq: number;
  heading_ar: string | null;
  section_type: string;
  text_en: string | null;
}

interface BlockRow {
  block_type: string;
  title_ar: string | null;
  title_en: string | null;
  text_plain: string | null;
}

interface SourceRow {
  source_kind: string;
  source_slug: string;
}

export function lexiconFiveLensRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/lexicon/five-lens/:rootNorm
  router.get('/al/lexicon/five-lens/:rootNorm', async (_req, env, params) => {
    const raw = decodeURIComponent((params as Record<string, string>).rootNorm ?? '');
    if (!raw) return badRequest('rootNorm required');

    const rootNorm = normArabic(raw);

    const entry = await env.DB_AL
      .prepare(
        `SELECT id, root_text, entry_text_en, status
           FROM ar_ling_lexicon_root_entries
          WHERE source_slug = ?1 AND root_norm = ?2
          LIMIT 1`,
      )
      .bind(SOURCE_SLUG, rootNorm)
      .first<EntryRow>();

    // No curated five-lens entry for this root yet — return a successful
    // empty payload so the modal renders its (non-error) empty state.
    if (!entry) return ok({ found: false });

    const [sections, blocks, sources] = await Promise.all([
      env.DB_AL
        .prepare(
          `SELECT section_seq, heading_ar, section_type, text_en
             FROM ar_ling_lexicon_entry_sections
            WHERE root_entry_id = ?1
            ORDER BY section_seq`,
        )
        .bind(entry.id)
        .all<SectionRow>(),
      env.DB_AL
        .prepare(
          `SELECT block_type, title_ar, title_en, text_plain
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
    ]);

    const blockRows = blocks.results ?? [];
    const ayah = blockRows.find((b) => b.block_type === 'ayah') ?? null;
    const xref = blockRows.find((b) => b.block_type === 'xref') ?? null;

    const lenses = (sections.results ?? [])
      .filter((s) => s.section_type === 'lens')
      .map((s) => ({
        seq: s.section_seq,
        headingAr: s.heading_ar,
        labelEn: (s.heading_ar && LENS_LABELS[s.heading_ar]) || '',
        body: s.text_en ?? '',
      }));

    // group provenance by kind: { lexicon: [...], tafsir: [...], irab: [...] }
    const grouped: Record<string, string[]> = {};
    for (const r of sources.results ?? []) {
      (grouped[r.source_kind] ??= []).push(r.source_slug);
    }

    return ok({
      found: true,
      entry: {
        id: entry.id,
        root: entry.root_text,
        rootSpaced: [...entry.root_text].join(' '),
        lemma: entry.entry_text_en,
        status: entry.status,
      },
      ayah: ayah ? { titleAr: ayah.title_ar, line: ayah.text_plain } : null,
      lenses,
      occurrences: xref?.text_plain ?? '',
      sources: grouped,
    });
  });
}
