// ─── /qr/surahs/:id/vocabulary — unique lemma vocabulary per surah/passage ────
// Serves the Arabic study vocabulary step.
//
// Design philosophy:
//   The study feature needs *unique vocabulary items*, not raw word occurrence
//   lists. A word like كَانَ appearing 1,372× in the Quran should appear once in
//   the vocabulary panel — with its frequency count and a few sample surface
//   forms, not 1,372 separate rows.
//
//   SQL does the deduplication: GROUP BY lx_lemma_ref, root_text, pos_tag.
//   sample_forms are gathered with GROUP_CONCAT (up to 5 distinct surface forms).
//   frequency is the occurrence count within the requested scope.
//
//   lx_lemma_ref = 'AL:ULID' — typed cross-module ref. The study UI can batch-
//   resolve full lemma data (transliteration, definition, morphology paradigms)
//   from the AR_LINGUISTICS service binding using these refs.
//
// New vs. legacy:
//   Legacy queried two stale tables (quran_ayah_lemmas, ar_u_tokens) with no
//   stable IDs and no cross-module refs. This version is entirely grounded in
//   the canonical qr_word_occurrences table and uses AL:ULID refs.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

// ── POS group normalisation ───────────────────────────────────────────────────

type PosGroup = 'verbs' | 'nouns' | 'adjectives' | 'proper_nouns' | 'particles' | 'other';

function normPos(tag: string | null): PosGroup {
  if (!tag) return 'other';
  const t = tag.toUpperCase();
  // QAC short codes (dominant in qr_word_occurrences)
  if (t === 'V'   || t === 'VERB')                        return 'verbs';
  if (t === 'N'   || t === 'NOUN' || t === 'IMPN')        return 'nouns';
  if (t === 'ADJ' || t === 'SUP')                         return 'adjectives';
  if (t === 'PN'  || t === 'PROPN' || t === 'PROPER_NOUN') return 'proper_nouns';
  // Particles: prepositions, pronouns, conjunctions, discourse markers, etc.
  if (['P','REL','PRON','NEG','ACC','T','DEM','COND','CONJ','SUB','LOC',
       'RES','INTG','CERT','PRO','RET','EXP','INC','EXL','AMD','INT',
       'FUT','EXH','ANS','SUR','AVR','INL','PREP','DET','ADV'].includes(t)) return 'particles';
  return 'other';
}

// ── Row type from the GROUP BY query ─────────────────────────────────────────

interface VocabLemmaRow {
  lx_lemma_ref: string | null;    // 'AL:ULID' — null if word has no lemma link yet
  root_text: string | null;
  pos_tag: string | null;
  frequency: number;              // occurrences within scope
  sample_forms: string | null;    // comma-separated distinct surface forms (≤5)
  first_surah: number;
  first_ayah: number;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export function vocabularyRoutes(router: Router<QuranEnv>) {

  /**
   * GET /qr/surahs/:id/vocabulary
   *
   * Query params:
   *   ayah_from  — restrict to a passage range start (optional)
   *   ayah_to    — restrict to a passage range end   (optional)
   *   pos        — filter to one POS group: verbs | nouns | adjectives |
   *                proper_nouns | particles | other  (optional)
   *   sort       — 'frequency' (default) | 'pos' | 'ayah'
   *   limit      — max unique lemmas returned, 1–500 (default 200)
   *
   * Response shape:
   * {
   *   ok: true,
   *   data: {
   *     surah_id: number,
   *     scope: { ayah_from, ayah_to },
   *     total_unique_lemmas: number,
   *     groups: {
   *       verbs:        VocabItem[],
   *       nouns:        VocabItem[],
   *       adjectives:   VocabItem[],
   *       proper_nouns: VocabItem[],
   *       particles:    VocabItem[],
   *       other:        VocabItem[],
   *     }
   *   }
   * }
   *
   * VocabItem: {
   *   lx_lemma_ref, root_text, pos_tag, pos_group,
   *   frequency, sample_forms: string[],
   *   first_location: { surah, ayah }
   * }
   */
  router.get('/qr/surahs/:id/vocabulary', async (req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114) {
      return badRequest('Surah ID must be 1–114');
    }

    const url       = new URL(req.url);
    const fromParam = url.searchParams.get('ayah_from');
    const toParam   = url.searchParams.get('ayah_to');
    const posFilter = url.searchParams.get('pos') as PosGroup | null;
    const sort      = url.searchParams.get('sort') ?? 'frequency';
    const limit     = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));

    const ayahFrom = fromParam ? (parseInt(fromParam, 10) || null) : null;
    const ayahTo   = toParam   ? (parseInt(toParam,   10) || null) : null;

    if (ayahFrom !== null && ayahTo !== null && ayahTo < ayahFrom) {
      return badRequest('ayah_to must be >= ayah_from');
    }

    try {
      // Build WHERE clause
      const conditions: string[] = ['surah = ?'];
      const params: unknown[]    = [surahId];
      if (ayahFrom !== null) { conditions.push('ayah >= ?'); params.push(ayahFrom); }
      if (ayahTo   !== null) { conditions.push('ayah <= ?'); params.push(ayahTo); }

      // ORDER BY clause
      const orderBy = sort === 'ayah'
        ? 'first_ayah ASC'
        : sort === 'pos'
          ? 'pos_tag ASC, frequency DESC'
          : 'frequency DESC';   // default: most frequent first

      params.push(limit);

      // GROUP BY lemma, root, pos — one row per unique lemma.
      // qr_word_occurrences columns: lemma, root, pos, word_text (not lx_lemma_ref etc.)
      // Alias to the VocabLemmaRow field names so the rest of the handler stays unchanged.
      // GROUP_CONCAT(DISTINCT word_text) gives up to ~5 sample surface forms (trimmed below).
      const rows = await query<VocabLemmaRow>(
        env.DB_QR,
        `SELECT
           lemma            AS lx_lemma_ref,
           root             AS root_text,
           pos              AS pos_tag,
           COUNT(*)         AS frequency,
           GROUP_CONCAT(DISTINCT word_text) AS sample_forms,
           MIN(surah)       AS first_surah,
           MIN(ayah)        AS first_ayah
         FROM qr_word_occurrences
         WHERE ${conditions.join(' AND ')}
         GROUP BY lemma, root, pos
         ORDER BY ${orderBy}
         LIMIT ?`,
        params,
      );

      // Group into POS buckets
      const groups: Record<PosGroup, ReturnType<typeof toVocabItem>[]> = {
        verbs: [], nouns: [], adjectives: [], proper_nouns: [], particles: [], other: [],
      };

      let totalUnique = 0;

      for (const row of rows) {
        const group = normPos(row.pos_tag);
        if (posFilter && group !== posFilter) continue;
        groups[group].push(toVocabItem(row, group));
        totalUnique++;
      }

      const scopeFrom = ayahFrom ?? (rows[0]?.first_ayah ?? 1);
      const scopeTo   = ayahTo   ?? (rows[rows.length - 1]?.first_ayah ?? scopeFrom);

      return ok({
        surah_id:            surahId,
        scope:               { ayah_from: scopeFrom, ayah_to: scopeTo },
        total_unique_lemmas: totalUnique,
        groups,
      });

    } catch (err) {
      console.error('[qr/vocabulary]', err);
      return internalError('Failed to load surah vocabulary');
    }
  });
}

// ── Shape helper ─────────────────────────────────────────────────────────────

function toVocabItem(row: VocabLemmaRow, posGroup: PosGroup) {
  // Trim GROUP_CONCAT to max 5 sample forms
  const forms = row.sample_forms
    ? row.sample_forms.split(',').slice(0, 5).filter(Boolean)
    : [];

  return {
    lx_lemma_ref:   row.lx_lemma_ref ?? null,   // 'AL:ULID' — use to fetch full lemma
    root_text:      row.root_text    ?? null,
    pos_tag:        row.pos_tag      ?? null,
    pos_group,
    frequency:      row.frequency,
    sample_forms:   forms,                        // up to 5 distinct surface forms
    first_location: {
      surah: row.first_surah,
      ayah:  row.first_ayah,
    },
  };
}
