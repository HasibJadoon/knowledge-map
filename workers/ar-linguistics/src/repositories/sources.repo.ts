// ─── SourcesRepo — ar_ling_source metadata (single source of truth) ─────────
// Replaces the SOURCE_META / SOURCES / SOURCE_ORDER constants that used to
// live inline in lexicon.ts, lexicon_v2.ts, lexicon_lane.ts,
// lexicon_mufradat.ts, and lexicon_lisan.ts. After 0016/0017 every lexicon
// source has slug + origin + source_order + bilingual + parser-hint columns
// in D1, so this repo is the only place worker code reads source metadata.
//
// Caller pattern:
//
//   const repo  = new SourcesRepo(env.DB_AL);
//   const src   = await repo.bySlug('ketabonline_al_raghib_mufradat');
//   const all   = await repo.inDisplayOrder();
//   const some  = await repo.bySlugs(['lane_lexicon', 'qomra_al_qamus_al_muhit']);
//
// Per-request memoisation: each call (re)reads D1. There's no module-level
// cache because Cloudflare Workers instances are short-lived and a stale row
// here would mis-label every entry response. If a route makes multiple lookups
// (e.g. group entries by source then enrich each group), the caller can hold
// onto the returned objects rather than re-querying.

import { query, queryOne } from '../../../shared/src/db';

/** A normalised lexicon-source row. Every field corresponds 1:1 to a column
 *  on ar_ling_source after migration 0016 + seed 0017. `slug` is null for
 *  rows that don't correspond to a TS-side identifier (orphaned duplicates,
 *  scholarship sources, synonym datasets) — those are filtered out by every
 *  query below. */
export interface LexiconSource {
  id:                 string;        // D1 primary key (e.g. SRC:KETABONLINE:MUFRADAT)
  slug:               string;        // TS-side identifier used in URLs (e.g. ketabonline_al_raghib_mufradat)
  title_ar:           string;
  title_en:           string | null;
  author_name:        string | null;
  period_label:       string | null;
  origin:             string | null; // lane / ketabonline / thahabi / saaid / qomra
  bilingual:          boolean;       // Lane only
  source_order:       number | null; // catalogue ordering (1 = first)
  footnote_source:    string | null; // 'inline_brackets' | 'footnote_blocks' | 'none' | null
  quran_block_shape:  string | null; // 'inline_verse' | 'cue_only_verse_in_braces' | null
  genre:              string | null;
}

interface SourceRow {
  id:                 string;
  slug:               string;
  title_ar:           string;
  title_en:           string | null;
  author_name:        string | null;
  period_label:       string | null;
  origin:             string | null;
  bilingual:          number;
  source_order:       number | null;
  footnote_source:    string | null;
  quran_block_shape:  string | null;
  genre:              string | null;
}

const SELECT = `
  id, slug, title_ar, title_en, author_name, period_label,
  origin, bilingual, source_order, footnote_source, quran_block_shape, genre
FROM ar_ling_source`;

function toSource(r: SourceRow): LexiconSource {
  return {
    id:                 r.id,
    slug:               r.slug,
    title_ar:           r.title_ar,
    title_en:           r.title_en,
    author_name:        r.author_name,
    period_label:       r.period_label,
    origin:             r.origin,
    bilingual:          r.bilingual === 1,
    source_order:       r.source_order,
    footnote_source:    r.footnote_source,
    quran_block_shape:  r.quran_block_shape,
    genre:              r.genre,
  };
}

export class SourcesRepo {
  constructor(private db: D1Database) {}

  /** Resolve one source by its TS-style slug. Returns null when the slug is
   *  not registered (no D1 row OR the row exists but its slug column is NULL
   *  — orphaned duplicates from earlier imports). */
  async bySlug(slug: string): Promise<LexiconSource | null> {
    if (!slug) return null;
    const row = await queryOne<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug = ? LIMIT 1`,
      [slug],
    );
    return row ? toSource(row) : null;
  }

  /** Bulk-resolve many slugs in one query. Returned in the same order as the
   *  input array; missing slugs are simply omitted (no null gaps). Callers
   *  that need to detect missing slugs should diff against the input. */
  async bySlugs(slugs: readonly string[]): Promise<LexiconSource[]> {
    if (!slugs.length) return [];
    const placeholders = slugs.map(() => '?').join(',');
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug IN (${placeholders})`,
      [...slugs],
    );
    // Preserve input order — D1 returns rows in arbitrary order.
    const bySlug = new Map(rows.map(r => [r.slug, r]));
    return slugs
      .map(s => bySlug.get(s))
      .filter((r): r is SourceRow => r != null)
      .map(toSource);
  }

  /** Every active source (slug NOT NULL), in catalogue order. Rows without a
   *  source_order sort to the end alphabetically — keeps newly imported
   *  sources visible until an admin assigns them a position. */
  async inDisplayOrder(): Promise<LexiconSource[]> {
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT}
       WHERE slug IS NOT NULL
       ORDER BY (source_order IS NULL), source_order ASC, slug ASC`,
    );
    return rows.map(toSource);
  }

  /** Active sources filtered to one origin pipeline (e.g. all qomra editions
   *  for an admin view). Same ordering rules as inDisplayOrder. */
  async byOrigin(origin: string): Promise<LexiconSource[]> {
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT}
       WHERE slug IS NOT NULL AND origin = ?
       ORDER BY (source_order IS NULL), source_order ASC, slug ASC`,
      [origin],
    );
    return rows.map(toSource);
  }

  /** All slugs registered in D1 — useful for validation (e.g. is `:rootSlug`
   *  in this URL a known lexicon?) without paying the cost of fetching every
   *  column. Returned as a Set for O(1) `has()` checks at call sites. */
  async knownSlugs(): Promise<Set<string>> {
    const rows = await query<{ slug: string }>(
      this.db,
      `SELECT slug FROM ar_ling_source WHERE slug IS NOT NULL`,
    );
    return new Set(rows.map(r => r.slug));
  }
}

// ─── Light-weight UI projection used by lexicon route responses ─────────────
// Five of the six existing route handlers shape their per-source response
// blocks identically:
//   { slug, title_ar, title_en, author, period }
// `toResponseMeta` centralises that projection so all five emit the same
// keys — eliminating drift between e.g. `period` (lexicon.ts) and
// `period_label` (lexicon_lisan.ts) seen in the audit.
export interface SourceResponseMeta {
  slug:     string;
  title_ar: string;
  title_en: string;
  author:   string;
  period:   string;
}

export function toResponseMeta(s: LexiconSource): SourceResponseMeta {
  return {
    slug:     s.slug,
    title_ar: s.title_ar,
    title_en: s.title_en ?? s.title_ar,
    author:   s.author_name ?? '',
    period:   s.period_label ?? '',
  };
}
