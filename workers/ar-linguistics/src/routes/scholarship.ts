// ─── /al/scholarship/* — academic notes on Arabic roots & vocabulary ────────
//
// Distinct from the classical lexicon corpus (Lane, Lisan, Sihah, …).
// Holds modern academic readings: epigraphic, comparative-Semitic,
// archaeological, philological, etc. Backed by `ar_ling_root_scholarship`
// and `ar_ling_vocab_scholarship` (see migration 0015).

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

// Genre → bilingual label. Adding a new genre here surfaces its label in
// the UI; the genre values themselves come from `ar_ling_sources.genre`.
const GENRE_LABELS: Record<string, { ar: string; en: string }> = {
  qur_anic_hermeneutic: { ar: 'تأويل قرآني',           en: "Qur'ānic Hermeneutic"        },
  epigraphic:           { ar: 'نقوش',                    en: 'Epigraphic'                  },
  archaeological:       { ar: 'أركيولوجي',               en: 'Archaeological'              },
  comparative_semitic:  { ar: 'مقارن (سامي)',            en: 'Comparative Semitic'         },
  philological:         { ar: 'فقه اللغة',               en: 'Philological'                },
  historical_phonology: { ar: 'صوتيات تاريخية',          en: 'Historical Phonology'        },
  etymological:         { ar: 'اشتقاقي',                 en: 'Etymological'                },
  general:              { ar: 'عام',                     en: 'General'                     },
};

// Response types ────────────────────────────────────────────────────────────

interface ScholarshipSource {
  id:       string;
  slug:     string | null;             // url-safe slug for routing
  title_ar: string;
  title_en: string;
  author:   string;
  year:     number | null;
  genre:    string;
  genre_label: { ar: string; en: string };
  url:      string | null;
  count:    number;        // entries for this source
}

interface ScholarshipNote {
  id:           string;
  source_id:    string;
  source:       ScholarshipSource;
  root_norm:    string;
  root_text:    string | null;
  reading_kind: string;
  reading_label:{ ar: string; en: string };
  title_en:     string | null;
  title_ar:     string | null;
  body_md:      string | null;
  body_plain:   string | null;
  page_no:      number | null;
  page_range:   string | null;
  section_label:string | null;
}

interface SourceRow {
  id:           string;
  title_ar:     string | null;
  title_en:     string | null;
  author_name:  string | null;
  period_label: string | null;
  source_type:  string | null;
  genre:        string | null;
  note_md:      string | null;
}

/** Extract a 4-digit year from `period_label` (e.g. "contemporary-2026"
 *  → 2026). Returns null when not present. */
function yearFrom(period: string | null): number | null {
  if (!period) return null;
  const m = period.match(/\b(1\d{3}|20\d{2}|21\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

/** Lift a URL out of `note_md` if one is mentioned. */
function urlFrom(note: string | null): string | null {
  if (!note) return null;
  const m = note.match(/https?:\/\/\S+/);
  return m ? m[0].replace(/[.,);]+$/, '') : null;
}

function srcMetaFromRow(row: SourceRow | null | undefined): {
  title_ar: string; title_en: string; author: string;
  year: number | null; genre: string; url: string | null;
} {
  if (!row) {
    return { title_ar: '', title_en: '', author: '', year: null, genre: 'general', url: null };
  }
  return {
    title_ar: row.title_ar ?? '',
    title_en: row.title_en ?? '',
    author:   row.author_name ?? '',
    year:     yearFrom(row.period_label),
    genre:    row.genre ?? 'general',
    url:      urlFrom(row.note_md),
  };
}

function genreLabel(genre: string) {
  return GENRE_LABELS[genre] ?? { ar: genre, en: genre };
}

/** Pre-fetch the `ar_ling_sources` rows the request needs in one round-trip. */
async function fetchSourceRows(env: ArLinguisticsEnv, ids: string[]): Promise<Map<string, SourceRow>> {
  if (ids.length === 0) return new Map();
  // De-duplicate; SQLite IN with bound params.
  const uniq = [...new Set(ids)];
  const placeholders = uniq.map(() => '?').join(',');
  const rows = (await env.DB_AL.prepare(
    `SELECT id, title_ar, title_en, author_name, period_label,
            source_type, genre, note_md
     FROM ar_ling_sources
     WHERE id IN (${placeholders})`,
  ).bind(...uniq).all<SourceRow>()).results ?? [];
  return new Map(rows.map(r => [r.id, r]));
}

export function scholarshipRoutes(router: Router<ArLinguisticsEnv>) {

  // ── GET /al/scholarship/sources ─────────────────────────────────────
  // List all academic sources with at least one root-note. Used by UI
  // to render a separate "Academic readings" catalog.
  router.get('/al/scholarship/sources', async (_req, env) => {
    const rows = (await env.DB_AL.prepare(
      `SELECT source_id,
              MAX(source_slug) AS source_slug,
              COUNT(*)          AS count
       FROM ar_ling_root_scholarship
       GROUP BY source_id
       ORDER BY count DESC`,
    ).all<{ source_id: string; source_slug: string | null; count: number }>()).results ?? [];

    const sourceMeta = await fetchSourceRows(env, rows.map(r => r.source_id));

    const sources: ScholarshipSource[] = rows.map(r => {
      const m = srcMetaFromRow(sourceMeta.get(r.source_id));
      return {
        id:          r.source_id,
        slug:        r.source_slug,
        ...m,
        genre_label: genreLabel(m.genre),
        count:       Number(r.count),
      };
    });

    return ok({ sources, total: sources.length });
  });

  // ── GET /al/scholarship/roots/:slug ─────────────────────────────────
  // Root index for a single scholarship source — used by the shell's
  // left-rail to let the reader navigate all roots in that source.
  router.get('/al/scholarship/roots/:slug', async (_req, env, params) => {
    const slug = decodeURIComponent(params.slug ?? '').trim();
    if (!slug) return badRequest('slug required');

    const rows = (await env.DB_AL.prepare(
      `SELECT root_norm, root_text, page_no, COUNT(*) AS n
       FROM ar_ling_root_scholarship
       WHERE source_slug = ?
       GROUP BY root_norm
       ORDER BY page_no, root_norm`,
    ).bind(slug).all<{ root_norm: string; root_text: string | null; page_no: number | null; n: number }>()).results ?? [];

    return ok({ slug, rows, total: rows.length });
  });

  // ── GET /al/scholarship/by-source/:slug/:root_norm ──────────────────
  // All notes for a (source, root) pair — the shell's main panel.
  router.get('/al/scholarship/by-source/:slug/:root_norm', async (_req, env, params) => {
    const slug = decodeURIComponent(params.slug ?? '').trim();
    const root_norm = decodeURIComponent(params.root_norm ?? '').trim();
    if (!slug || !root_norm) return badRequest('slug and root_norm required');

    const rows = (await env.DB_AL.prepare(
      `SELECT id, source_id, source_slug, root_norm, root_text,
              reading_kind, title_en, title_ar,
              body_md, body_plain, page_no, page_range, section_label
       FROM ar_ling_root_scholarship
       WHERE source_slug = ? AND root_norm = ?
       ORDER BY page_no`,
    ).bind(slug, root_norm).all<any>()).results ?? [];

    if (rows.length === 0) return ok({ slug, root_norm, source: null, notes: [], total: 0 });

    const sourceId = rows[0].source_id as string;
    const sourceMeta = await fetchSourceRows(env, [sourceId]);
    const m = srcMetaFromRow(sourceMeta.get(sourceId));
    const source: ScholarshipSource = {
      id:          sourceId,
      slug,
      ...m,
      genre_label: genreLabel(m.genre),
      count:       rows.length,
    };

    const notes: ScholarshipNote[] = rows.map(r => ({
      id:            r.id,
      source_id:     r.source_id,
      source,
      root_norm:     r.root_norm,
      root_text:     r.root_text ?? null,
      reading_kind:  r.reading_kind ?? 'general',
      reading_label: genreLabel(r.reading_kind ?? 'general'),
      title_en:      r.title_en ?? null,
      title_ar:      r.title_ar ?? null,
      body_md:       r.body_md ?? null,
      body_plain:    r.body_plain ?? null,
      page_no:       r.page_no ?? null,
      page_range:    r.page_range ?? null,
      section_label: r.section_label ?? null,
    }));

    return ok({ slug, root_norm, source, notes, total: notes.length });
  });

  // ── GET /al/scholarship/root/:root_norm ─────────────────────────────
  // All academic notes for a given root, with source metadata expanded.
  router.get('/al/scholarship/root/:root_norm', async (_req, env, params) => {
    const root_norm = decodeURIComponent(params.root_norm ?? '').trim();
    if (!root_norm) return badRequest('root_norm required');

    const rows = (await env.DB_AL.prepare(
      `SELECT id, source_id, source_slug, root_norm, root_text,
              reading_kind, title_en, title_ar,
              body_md, body_plain, page_no, page_range, section_label
       FROM ar_ling_root_scholarship
       WHERE root_norm = ?
       ORDER BY source_id, page_no`,
    ).bind(root_norm).all<any>()).results ?? [];

    // Pre-compute per-source counts so each note can carry its source row.
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.source_id, (counts.get(r.source_id) ?? 0) + 1);

    const sourceMeta = await fetchSourceRows(env, rows.map(r => r.source_id));

    const notes: ScholarshipNote[] = rows.map(r => {
      const meta = srcMetaFromRow(sourceMeta.get(r.source_id));
      const source: ScholarshipSource = {
        id:          r.source_id,
        slug:        r.source_slug ?? null,
        ...meta,
        genre_label: genreLabel(meta.genre),
        count:       counts.get(r.source_id) ?? 0,
      };
      return {
        id:            r.id,
        source_id:     r.source_id,
        source,
        root_norm:     r.root_norm,
        root_text:     r.root_text ?? null,
        reading_kind:  r.reading_kind ?? 'general',
        reading_label: genreLabel(r.reading_kind ?? 'general'),
        title_en:      r.title_en ?? null,
        title_ar:      r.title_ar ?? null,
        body_md:       r.body_md ?? null,
        body_plain:    r.body_plain ?? null,
        page_no:       r.page_no ?? null,
        page_range:    r.page_range ?? null,
        section_label: r.section_label ?? null,
      };
    });

    return ok({ root_norm, notes, total: notes.length });
  });

  // ── GET /al/scholarship/has/:root_norm ──────────────────────────────
  // Lightweight existence check — used by the hub to decide whether to
  // render the "Academic readings" section at all.
  router.get('/al/scholarship/has/:root_norm', async (_req, env, params) => {
    const root_norm = decodeURIComponent(params.root_norm ?? '').trim();
    if (!root_norm) return badRequest('root_norm required');

    const row = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_root_scholarship WHERE root_norm = ?`,
    ).bind(root_norm).first<{ n: number }>();

    return ok({ root_norm, count: Number(row?.n ?? 0) });
  });
}
