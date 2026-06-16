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
// Reads the curated `kmaps_five_lens` source rows from
// ar_ling_lexicon_root_entries (+ ar_ling_lexicon_entry_sections). Only the
// root "زلف" has an entry today (id re_kmaps_zlf_zumar_3); every other root
// resolves to `found: false` so the modal can paint its empty state. This is a
// read-only lookup — it never writes, and never touches doc-space.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

const FIVE_LENS_SLUG = 'kmaps_five_lens';

/** Normalize an Arabic root the same way ingestion stores `root_norm`:
 *  strip harakat and fold alif / ya / ta-marbuta variants. Mirrors the
 *  private helper in routes/lexicon.ts so a tapped word's raw root matches
 *  the stored normalized key. */
function normArabic(t: string): string {
  return t
    .replace(/[ً-ٰٟ]/g, '') // harakat / superscript alif
    .replace(/[أإآ]/g, 'ا') // أ إ آ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .trim();
}

interface RootEntryRow {
  id: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  entry_text_ar: string | null;
  entry_text_en: string | null;
  source_url: string | null;
  page_start: number | null;
  page_end: number | null;
  volume_no: number | null;
  status: string;
}

interface SectionRow {
  id: string;
  section_seq: number;
  heading_ar: string | null;
  heading_norm: string | null;
  section_type: string;
  text_ar: string | null;
  text_en: string | null;
  page_no: number | null;
}

export function lexiconFiveLensRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/lexicon/five-lens/:rootNorm
  router.get('/al/lexicon/five-lens/:rootNorm', async (_req, env, params) => {
    const raw = decodeURIComponent((params as Record<string, string>).rootNorm ?? '');
    if (!raw) return badRequest('rootNorm required');

    const rootNorm = normArabic(raw);

    const entry = await env.DB_AL
      .prepare(`
        SELECT id, source_slug, root_text, root_norm,
               entry_text_ar, entry_text_en,
               source_url, page_start, page_end, volume_no, status
        FROM   ar_ling_lexicon_root_entries
        WHERE  source_slug = ?
          AND  root_norm    = ?
        LIMIT  1
      `)
      .bind(FIVE_LENS_SLUG, rootNorm)
      .first<RootEntryRow>();

    // No curated five-lens entry for this root yet — return a successful
    // empty payload so the modal renders its (non-error) empty state.
    if (!entry) {
      return ok({
        found: false,
        root_norm: rootNorm,
        root_text: raw,
        entry: null,
        lenses: [] as SectionRow[],
      });
    }

    const { results: lenses } = await env.DB_AL
      .prepare(`
        SELECT id, section_seq, heading_ar, heading_norm,
               section_type, text_ar, text_en, page_no
        FROM   ar_ling_lexicon_entry_sections
        WHERE  root_entry_id = ?
        ORDER BY section_seq
      `)
      .bind(entry.id)
      .all<SectionRow>();

    return ok({
      found: true,
      root_norm: entry.root_norm,
      root_text: entry.root_text,
      entry: {
        id:            entry.id,
        source_slug:   entry.source_slug,
        root_text:     entry.root_text,
        root_norm:     entry.root_norm,
        entry_text_ar: entry.entry_text_ar,
        entry_text_en: entry.entry_text_en,
        source_url:    entry.source_url,
        page_start:    entry.page_start,
        page_end:      entry.page_end,
        volume_no:     entry.volume_no,
        status:        entry.status,
      },
      lenses: lenses ?? [],
    });
  });
}
