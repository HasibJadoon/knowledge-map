// ─── /qr/menu — Quran navigation dataset ──────────────────────────────────────
// Returns all 114 surahs with juz groupings and page stats.
// Primary data source for the Angular navigation sidebar and Quran index page.
//
// New architecture advantage: qr_surahs stores juz_start and page_start
// directly, so no JOIN to qr_ayah is needed (unlike the legacy implementation).

import type { Router } from '../../../shared/src/router';
import { ok, internalError } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

interface SurahMenuRow {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

interface PageRangeRow {
  total_pages: number | null;
  total_ayahs: number | null;
}

interface JuzMember {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  page_start: number | null;
}

interface JuzEntry {
  juz: number;
  surahs: JuzMember[];
}

export function menuRoutes(router: Router<QuranEnv>) {

  /**
   * GET /qr/menu
   *
   * Returns the complete Quran navigation dataset:
   * - `surahs[]`  — all 114 surahs with id, names, revelation type, ayah count,
   *                 juz_start and page_start
   * - `juzs[]`    — 30 entries, each with the list of surahs that begin in that juz
   * - `stats`     — total_pages, total_surahs, total_juzs, total_ayahs
   *
   * Response is safe to cache aggressively on the client (Quran text never changes).
   */
  router.get('/qr/menu', async (_req, env) => {
    try {
      const [surahs, stats] = await Promise.all([
        query<SurahMenuRow>(
          env.DB_QR,
          `SELECT id, name_ar, name_en, name_transliteration,
                  revelation_type, ayah_count, juz_start, page_start
           FROM qr_surahs
           ORDER BY id`,
        ),
        queryOne<PageRangeRow>(
          env.DB_QR,
          `SELECT MAX(page_number) AS total_pages, COUNT(*) AS total_ayahs
           FROM qr_ayah`,
        ),
      ]);

      // Build juz index: 30 juz buckets, each listing its member surahs
      const juzMap = new Map<number, JuzMember[]>();
      for (const s of surahs) {
        if (s.juz_start == null) continue;
        const bucket = juzMap.get(s.juz_start) ?? [];
        bucket.push({
          id: s.id,
          name_ar: s.name_ar,
          name_en: s.name_en ?? null,
          name_transliteration: s.name_transliteration ?? null,
          revelation_type: s.revelation_type ?? null,
          ayah_count: s.ayah_count,
          page_start: s.page_start ?? null,
        });
        juzMap.set(s.juz_start, bucket);
      }

      // Emit all 30 juzs in order (even if empty — robustness)
      const juzs: JuzEntry[] = [];
      for (let juz = 1; juz <= 30; juz++) {
        juzs.push({ juz, surahs: juzMap.get(juz) ?? [] });
      }

      return ok({
        stats: {
          total_surahs: surahs.length,
          total_juzs:   30,             // canonical — the Quran always has 30 juzs
          total_pages:  stats?.total_pages ?? 0,
          total_ayahs:  stats?.total_ayahs ?? 0,
        },
        surahs: surahs.map(s => ({
          id:                   s.id,
          name_ar:              s.name_ar,
          name_en:              s.name_en ?? null,
          name_transliteration: s.name_transliteration ?? null,
          revelation_type:      s.revelation_type ?? null,
          ayah_count:           s.ayah_count,
          juz_start:            s.juz_start ?? null,
          page_start:           s.page_start ?? null,
        })),
        juzs,
      });
    } catch (err) {
      console.error('[qr/menu]', err);
      return internalError('Failed to load Quran menu');
    }
  });
}
