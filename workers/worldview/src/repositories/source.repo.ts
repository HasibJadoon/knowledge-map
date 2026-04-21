// ─── SourceRepo — wv_sources, wv_source_units, wv_source_chunks ───────────────
// Sources = books, lectures, articles, manuscripts, classical texts.
// Units   = chapters, sections, paragraphs within a source.
// Chunks  = embedding-ready text segments for the AI pipeline.
//
// Canonical columns per 001_wv_schema.sql §2.8-2.9 + §S.1.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvSource {
  id: string;            // WV:ULID
  slug: string | null;
  title: string;
  title_ar: string | null;
  source_type: string;   // book|article|lecture|talk|manuscript|video|podcast|classical_text|fatwa|document|other
  source_domain: string; // general|classical_text|academic|journalistic|media|other
  tradition_id: string | null;
  language: string | null;
  published_year: number | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  description_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvSourceUnit {
  id: string;
  source_id: string;
  parent_id: string | null;
  unit_type: string;     // volume|chapter|section|paragraph|footnote|appendix|other
  title: string | null;
  unit_index: number | null;
  page_start: number | null;
  page_end: number | null;
  text_excerpt: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvSourceChunk {
  id: string;
  source_id: string;
  source_unit_id: string | null;
  chunk_index: number;
  heading_norm: string | null;
  page_no: number | null;
  token_count: number | null;
  text_content: string;
  chunk_kind: string | null;
  is_embedded: number;   // 0|1
  created_at: string;
}

export interface SourceCreate {
  title: string;
  title_ar?: string | null;
  source_type?: string;
  source_domain?: string;
  tradition_id?: string | null;
  language?: string;
  published_year?: number | null;
  publisher?: string | null;
  description_md?: string | null;
  url?: string | null;
  slug?: string | null;
}

export interface SourcePatch {
  title?: string;
  title_ar?: string | null;
  source_type?: string;
  source_domain?: string;
  tradition_id?: string | null;
  language?: string;
  published_year?: number | null;
  publisher?: string | null;
  description_md?: string | null;
  url?: string | null;
  slug?: string | null;
}

export interface UnitCreate {
  source_id: string;
  parent_id?: string | null;
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  text_excerpt?: string | null;
  description_md?: string | null;
}

export interface UnitPatch {
  title?: string | null;
  unit_type?: string;
  unit_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  text_excerpt?: string | null;
  description_md?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const SRC_COLS = `
  id, slug, title, title_ar, source_type, source_domain,
  tradition_id, language, published_year, publisher, doi, url,
  description_md, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

const UNIT_COLS = `
  id, source_id, parent_id, unit_type, title, unit_index,
  page_start, page_end, text_excerpt, description_md, created_at
`.trim().replace(/\n\s+/g, ' ');

const CHUNK_COLS = `
  id, source_id, source_unit_id, chunk_index, heading_norm,
  page_no, token_count, text_content, chunk_kind, is_embedded, created_at
`.trim().replace(/\n\s+/g, ' ');

// ── Repo ─────────────────────────────────────────────────────────────────────

export class SourceRepo {
  constructor(private db: D1Database) {}

  // ── Sources ──────────────────────────────────────────────────────────────

  list(opts: {
    domain?: string | null;
    source_type?: string | null;
    tradition_id?: string | null;
    search?: string | null;
  } & PaginateOptions = {}) {
    const { domain, source_type, tradition_id } = opts;
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (domain)       { conds.push('source_domain = ?');  params.push(domain); }
    if (source_type)  { conds.push('source_type = ?');    params.push(source_type); }
    if (tradition_id) { conds.push('tradition_id = ?');   params.push(tradition_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvSource>(
      this.db,
      `SELECT ${SRC_COLS} FROM wv_sources ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_sources ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvSource | null> {
    return queryOne<WvSource>(
      this.db, `SELECT ${SRC_COLS} FROM wv_sources WHERE id = ?`, [id],
    );
  }

  findBySlug(slug: string): Promise<WvSource | null> {
    return queryOne<WvSource>(
      this.db, `SELECT ${SRC_COLS} FROM wv_sources WHERE slug = ?`, [slug],
    );
  }

  async create(input: SourceCreate): Promise<WvSource> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_sources
         (id, slug, title, title_ar, source_type, source_domain,
          tradition_id, language, published_year, publisher, url,
          description_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug ?? null,
        input.title,
        input.title_ar ?? null,
        input.source_type ?? 'book',
        input.source_domain ?? 'general',
        input.tradition_id ?? null,
        input.language ?? 'en',
        input.published_year ?? null,
        input.publisher ?? null,
        input.url ?? null,
        input.description_md ?? null,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: SourcePatch): Promise<WvSource | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];

    const MAP: [keyof SourcePatch, string][] = [
      ['title',          'title = ?'],
      ['title_ar',       'title_ar = ?'],
      ['source_type',    'source_type = ?'],
      ['source_domain',  'source_domain = ?'],
      ['tradition_id',   'tradition_id = ?'],
      ['language',       'language = ?'],
      ['published_year', 'published_year = ?'],
      ['publisher',      'publisher = ?'],
      ['description_md', 'description_md = ?'],
      ['url',            'url = ?'],
      ['slug',           'slug = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(this.db, `UPDATE wv_sources SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  // ── Source units ─────────────────────────────────────────────────────────

  units(sourceId: string, opts: PaginateOptions = {}) {
    return paginate<WvSourceUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM wv_source_units WHERE source_id = ?
       ORDER BY COALESCE(unit_index, 0), id`,
      `SELECT COUNT(*) AS count FROM wv_source_units WHERE source_id = ?`,
      [sourceId], opts,
    );
  }

  findUnitById(id: string): Promise<WvSourceUnit | null> {
    return queryOne<WvSourceUnit>(
      this.db, `SELECT ${UNIT_COLS} FROM wv_source_units WHERE id = ?`, [id],
    );
  }

  async createUnit(input: UnitCreate): Promise<WvSourceUnit> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_source_units
         (id, source_id, parent_id, unit_type, title, unit_index,
          page_start, page_end, text_excerpt, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id,
        input.parent_id ?? null,
        input.unit_type ?? 'chapter',
        input.title ?? null,
        input.unit_index ?? null,
        input.page_start ?? null,
        input.page_end ?? null,
        input.text_excerpt ?? null,
        input.description_md ?? null,
        now,
      ],
    );
    return (await this.findUnitById(id))!;
  }

  async patchUnit(id: string, patch: UnitPatch): Promise<WvSourceUnit | null> {
    const sets: string[]  = [];
    const vals: unknown[] = [];

    const MAP: [keyof UnitPatch, string][] = [
      ['title',          'title = ?'],
      ['unit_type',      'unit_type = ?'],
      ['unit_index',     'unit_index = ?'],
      ['page_start',     'page_start = ?'],
      ['page_end',       'page_end = ?'],
      ['text_excerpt',   'text_excerpt = ?'],
      ['description_md', 'description_md = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    if (!sets.length) return this.findUnitById(id);

    vals.push(id);
    await execute(this.db, `UPDATE wv_source_units SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findUnitById(id);
  }

  // ── Chunks (source content for AI pipeline + reader) ─────────────────────

  /** All chunks for a source, optionally filtered to a single unit. */
  chunksBySource(
    sourceId: string,
    sourceUnitId?: string | null,
    opts: PaginateOptions = {},
  ) {
    const conds = ['source_id = ?'];
    const params: unknown[] = [sourceId];
    if (sourceUnitId) { conds.push('source_unit_id = ?'); params.push(sourceUnitId); }
    const where = `WHERE ${conds.join(' AND ')}`;
    return paginate<WvSourceChunk>(
      this.db,
      `SELECT ${CHUNK_COLS} FROM wv_source_chunks ${where} ORDER BY chunk_index`,
      `SELECT COUNT(*) AS count FROM wv_source_chunks ${where}`,
      params, opts,
    );
  }

  // ── Workflow summary (lightweight list — used by /worldview/workflow) ─────

  /** Return all sources with their unit count, ordered by most recent. */
  async workflowSources(): Promise<(WvSource & { unit_count: number })[]> {
    return query<WvSource & { unit_count: number }>(
      this.db,
      `SELECT
         s.id, s.slug, s.title, s.title_ar, s.source_type, s.source_domain,
         s.tradition_id, s.language, s.published_year, s.publisher,
         s.doi, s.url, s.description_md, s.created_at, s.updated_at,
         (SELECT COUNT(*) FROM wv_source_units u WHERE u.source_id = s.id) AS unit_count
       FROM wv_sources s
       ORDER BY s.updated_at DESC
       LIMIT 200`,
      [],
    );
  }
}
