// ─── /qr/surahs/:id/reader — combined reader payload ──────────────────────────
// Primary endpoint for the Angular QuranTextComponent.
//
// Returns surah header + paginated ayah window + translations in one response.
// Surah, count, translation source, ayahs, and translations are all resolved
// in parallel with Promise.all — one network RTT to the database layer.
//
// Design:
//  - ?source=QR:ULID  select any installed translation edition
//    (no source given → uses DB-flagged default; no default → translations null)
//  - ?from=1&to=7     explicit ayah range (precise slice, ignores page/limit)
//  - ?page=1&limit=300 offset pagination (default: 300 ayahs — full short surah)
//  - Text column priority: text_uthmani_clean → text_uthmani → text_bare → text
//  - verse_mark: plain Arabic-Indic digits only; U+06DD never used.
//  - translation field: source translation row → built-in column → null

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, internalError } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

// ── Row types ─────────────────────────────────────────────────────────────────

interface SurahRow {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

interface AyahRow {
  surah: number;
  ayah: number;
  text_display: string;         // COALESCE result — canonical display text
  text_uthmani_clean: string | null;
  text_uthmani: string | null;
  text_bare: string | null;
  translation: string | null;   // built-in column (secondary fallback)
  verse_mark: string | null;
  page_number: number | null;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
}

interface TranslationSourceRow {
  id: string;
  slug: string;
  language: string;
  author: string;
  title: string;
  is_default: number;
}

interface TranslationRow {
  ayah: number;
  text: string;
}

interface CountRow { total: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function toInt(raw: string | null, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export function readerRoutes(router: Router<QuranEnv>) {

  /**
   * GET /qr/surahs/:id/reader
   *
   * Query params:
   *   source  — QR:ULID of a translation edition (optional; uses DB default)
   *   page    — 1-based page number (default 1, ignored when from/to given)
   *   limit   — ayahs per page, 1–500 (default 300)
   *   from    — start ayah for a precise range slice
   *   to      — end ayah for a precise range slice
   *
   * Response:
   * {
   *   ok: true,
   *   data: {
   *     surah, translation_source,
   *     meta: { total, page, per_page, has_more },
   *     ayahs: [{ surah, ayah, verse_key, text, verse_mark, translation, … }]
   *   }
   * }
   */
  router.get('/qr/surahs/:id/reader', async (req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114) {
      return badRequest('Surah ID must be 1–114');
    }

    const url         = new URL(req.url);
    const sourceParam = url.searchParams.get('source');
    const fromParam   = url.searchParams.get('from');
    const toParam     = url.searchParams.get('to');
    const rangeMode   = fromParam !== null || toParam !== null;
    const page        = Math.max(1, toInt(url.searchParams.get('page'), 1));
    const limit       = clamp(toInt(url.searchParams.get('limit'), 300), 1, 500);

    try {
      // ── Phase 1: resolve metadata in parallel ─────────────────────────────
      // Three queries fly simultaneously: surah row, ayah count, translation source.
      const sourceSQL = sourceParam
        ? env.DB_QR.prepare(
            `SELECT id,
                    source_code AS slug,
                    language,
                    translator_name AS author,
                    COALESCE(edition, translator_name) AS title,
                    is_default
             FROM qr_translation_sources
             WHERE id = ?`,
          ).bind(sourceParam).first<TranslationSourceRow>()
        : env.DB_QR.prepare(
            `SELECT id, slug, language, author, title, is_default
             FROM (
               SELECT s.id,
                      s.source_code AS slug,
                      s.language,
                      s.translator_name AS author,
                      COALESCE(s.edition, s.translator_name) AS title,
                      s.is_default,
                      CASE WHEN s.is_default = 1 THEN 0 ELSE 1 END AS default_rank,
                      CASE WHEN s.language = 'en' THEN 0 ELSE 1 END AS language_rank
               FROM qr_translation_sources s
               WHERE EXISTS (
                 SELECT 1
                 FROM qr_translations t
                 WHERE t.source_id = s.id AND t.surah = ?
                 LIMIT 1
               )
             )
             ORDER BY default_rank, language_rank, author
             LIMIT 1`,
          ).bind(surahId).first<TranslationSourceRow>();

      const [surahRow, countRow, sourceRow] = await Promise.all([
        env.DB_QR
          .prepare(
            `SELECT id, name_ar, name_en, name_transliteration,
                    revelation_type, ayah_count, juz_start, page_start
             FROM qr_surahs WHERE id = ?`,
          )
          .bind(surahId)
          .first<SurahRow>(),
        env.DB_QR
          .prepare(`SELECT COUNT(*) AS total FROM qr_ayah WHERE surah = ?`)
          .bind(surahId)
          .first<CountRow>(),
        sourceSQL.catch(() => null),
      ]);

      if (!surahRow) return notFound(`surah ${surahId}`);

      const total = countRow?.total ?? 0;

      // ── Phase 2: determine ayah window ───────────────────────────────────
      let ayahFrom: number;
      let ayahTo: number;
      let effectivePage: number;
      let windowSize: number;

      if (rangeMode) {
        ayahFrom      = clamp(toInt(fromParam, 1), 1, total);
        ayahTo        = clamp(toInt(toParam, total), ayahFrom, total);
        effectivePage = 1;
        windowSize    = ayahTo - ayahFrom + 1;
      } else {
        const offset  = (page - 1) * limit;
        ayahFrom      = offset + 1;
        ayahTo        = Math.min(offset + limit, total);
        effectivePage = page;
        windowSize    = limit;
      }

      // ── Phase 3: fetch ayahs + translations in parallel ───────────────────
      const ayahSQL = `
        SELECT surah, ayah,
               COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_display,
               text_uthmani_clean, text_uthmani, text_bare,
               translation, verse_mark, page_number
        FROM qr_ayah
        WHERE surah = ? AND ayah BETWEEN ? AND ?
        ORDER BY ayah`;

      // Only query translations when a source is available
      const [ayahResult, trResult] = await Promise.all([
        env.DB_QR
          .prepare(ayahSQL)
          .bind(surahId, ayahFrom, ayahTo)
          .all<AyahRow>(),
        sourceRow
          ? env.DB_QR
              .prepare(
                `SELECT ayah, translation_text AS text
                 FROM qr_translations
                 WHERE source_id = ? AND surah = ? AND ayah BETWEEN ? AND ?
                 ORDER BY ayah`,
              )
              .bind(sourceRow.id, surahId, ayahFrom, ayahTo)
              .all<TranslationRow>()
              .catch(() => ({ results: [] as TranslationRow[] }))
          : Promise.resolve({ results: [] as TranslationRow[] }),
      ]);

      const ayahRows = ayahResult.results ?? [];
      const trRows   = trResult.results   ?? [];

      // Index translations by ayah number for O(1) lookup
      const trMap = new Map<number, string>();
      for (const tr of trRows) trMap.set(tr.ayah, tr.text);

      // ── Phase 4: build response ───────────────────────────────────────────
      return ok({
        surah: {
          id:                   surahRow.id,
          name_ar:              surahRow.name_ar,
          name_en:              surahRow.name_en              ?? null,
          name_transliteration: surahRow.name_transliteration ?? null,
          revelation_type:      surahRow.revelation_type      ?? null,
          ayah_count:           surahRow.ayah_count,
          juz_start:            surahRow.juz_start            ?? null,
          page_start:           surahRow.page_start           ?? null,
        },
        translation_source: sourceRow
          ? {
              id:       sourceRow.id,
              slug:     sourceRow.slug,
              language: sourceRow.language,
              author:   sourceRow.author,
              title:    sourceRow.title,
            }
          : null,
        meta: {
          total,
          page:     effectivePage,
          per_page: windowSize,
          has_more: rangeMode
            ? ayahTo < total
            : (page - 1) * limit + windowSize < total,
        },
        ayahs: ayahRows.map(row => ({
          surah:              row.surah,
          ayah:               row.ayah,
          verse_key:          `${row.surah}:${row.ayah}`,
          text:               row.text_display,
          text_uthmani_clean: row.text_uthmani_clean ?? null,
          text_uthmani:       row.text_uthmani        ?? null,
          text_bare:          row.text_bare           ?? null,
          verse_mark:         row.verse_mark          ?? null,
          page_number:        row.page_number         ?? null,
          juz:                null,
          hizb:               null,
          ruku:               null,
          // Translation precedence: selected source → built-in column → null
          translation: trMap.get(row.ayah) ?? row.translation ?? null,
        })),
      });

    } catch (err) {
      console.error('[qr/reader]', err);
      return internalError('Failed to load surah reader');
    }
  });
}
