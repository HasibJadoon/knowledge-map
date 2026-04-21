// ─── SourceDetailRepo — cm_source_details + cm_source_toc + cm_source_units + cm_source_chunks ──
// Extended bibliographic metadata, table of contents, hierarchical units, and
// embedded text chunks (with embedding pipeline tracking) for a cm_source.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_source_details
// ---------------------------------------------------------------------------

export interface CmSourceDetail {
  detail_id: string;
  source_id: string;
  author_names_json: string;       // JSON array of strings
  editor_names_json: string;       // JSON array of strings
  publisher: string | null;
  publication_year: number | null;
  edition: string | null;
  isbn: string | null;
  doi: string | null;
  url: string | null;
  pages_total: number | null;
  language_original: string | null;
  translator_names_json: string;   // JSON array of strings
  series_title: string | null;
  volume: string | null;
  issue: string | null;
  abstract: string | null;
  keywords_json: string;           // JSON array of strings
  meta_json: string;
}

export interface CmSourceDetailInput {
  author_names_json?: string;
  editor_names_json?: string;
  publisher?: string | null;
  publication_year?: number | null;
  edition?: string | null;
  isbn?: string | null;
  doi?: string | null;
  url?: string | null;
  pages_total?: number | null;
  language_original?: string | null;
  translator_names_json?: string;
  series_title?: string | null;
  volume?: string | null;
  issue?: string | null;
  abstract?: string | null;
  keywords_json?: string;
  meta_json?: string;
}

const DETAIL_COLS = `detail_id, source_id, author_names_json, editor_names_json,
  publisher, publication_year, edition, isbn, doi, url, pages_total,
  language_original, translator_names_json, series_title, volume, issue,
  abstract, keywords_json, meta_json`;

// ---------------------------------------------------------------------------
// cm_source_toc
// ---------------------------------------------------------------------------

export interface CmSourceToc {
  toc_id: string;
  source_id: string;
  parent_toc_id: string | null;
  seq_order: number;
  depth: number;
  heading_text: string;
  heading_ar: string | null;
  page_start: number | null;
  page_end: number | null;
  unit_id: string | null;
  meta_json: string;
}

export interface CmSourceTocInput {
  source_id: string;
  parent_toc_id?: string | null;
  seq_order?: number;
  depth?: number;
  heading_text: string;
  heading_ar?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  unit_id?: string | null;
  meta_json?: string;
}

const TOC_COLS = `toc_id, source_id, parent_toc_id, seq_order, depth,
  heading_text, heading_ar, page_start, page_end, unit_id, meta_json`;

// ---------------------------------------------------------------------------
// cm_source_units
// ---------------------------------------------------------------------------

export interface CmSourceUnit {
  unit_id: string;
  source_id: string;
  parent_unit_id: string | null;
  toc_id: string | null;
  unit_type: string;
  seq_order: number;
  depth: number;
  heading: string | null;
  heading_ar: string | null;
  page_start: number | null;
  page_end: number | null;
  word_count: number | null;
  body_text: string | null;
  body_ar: string | null;
  summary: string | null;
  meta_json: string;
  created_at: string;
}

export interface CmSourceUnitInput {
  source_id: string;
  parent_unit_id?: string | null;
  toc_id?: string | null;
  unit_type: string;
  seq_order?: number;
  depth?: number;
  heading?: string | null;
  heading_ar?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  word_count?: number | null;
  body_text?: string | null;
  body_ar?: string | null;
  summary?: string | null;
  meta_json?: string;
}

const UNIT_COLS = `unit_id, source_id, parent_unit_id, toc_id, unit_type,
  seq_order, depth, heading, heading_ar, page_start, page_end, word_count,
  body_text, body_ar, summary, meta_json, created_at`;

// ---------------------------------------------------------------------------
// cm_source_chunks
// ---------------------------------------------------------------------------

export interface CmSourceChunk {
  chunk_id: string;
  source_id: string;
  unit_id: string | null;
  chunk_index: number;
  chunk_kind: string | null;
  page_no: number | null;
  heading_norm: string | null;
  text_content: string;
  token_count: number | null;
  is_embedded: number;         // 0 | 1
  qdrant_id: string | null;
  embed_model: string | null;
  meta_json: string;
  created_at: string;
}

export interface CmSourceChunkInput {
  source_id: string;
  unit_id?: string | null;
  chunk_index: number;
  chunk_kind?: string | null;
  page_no?: number | null;
  heading_norm?: string | null;
  text_content: string;
  token_count?: number | null;
  meta_json?: string;
}

const CHUNK_COLS = `chunk_id, source_id, unit_id, chunk_index, chunk_kind,
  page_no, heading_norm, text_content, token_count, is_embedded, qdrant_id,
  embed_model, meta_json, created_at`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class SourceDetailRepo {
  constructor(private db: D1Database) {}

  // ── cm_source_details ────────────────────────────────────────────────────

  detail(sourceId: string): Promise<CmSourceDetail | null> {
    return queryOne<CmSourceDetail>(
      this.db,
      `SELECT ${DETAIL_COLS} FROM cm_source_details WHERE source_id = ?`,
      [sourceId],
    );
  }

  async upsertDetail(sourceId: string, input: CmSourceDetailInput): Promise<CmSourceDetail> {
    const existing = await this.detail(sourceId);
    if (existing) {
      const sets: string[]  = [];
      const vals: unknown[] = [];
      if (input.author_names_json     !== undefined) { sets.push('author_names_json = ?');     vals.push(input.author_names_json); }
      if (input.editor_names_json     !== undefined) { sets.push('editor_names_json = ?');     vals.push(input.editor_names_json); }
      if (input.publisher             !== undefined) { sets.push('publisher = ?');             vals.push(input.publisher); }
      if (input.publication_year      !== undefined) { sets.push('publication_year = ?');      vals.push(input.publication_year); }
      if (input.edition               !== undefined) { sets.push('edition = ?');               vals.push(input.edition); }
      if (input.isbn                  !== undefined) { sets.push('isbn = ?');                  vals.push(input.isbn); }
      if (input.doi                   !== undefined) { sets.push('doi = ?');                   vals.push(input.doi); }
      if (input.url                   !== undefined) { sets.push('url = ?');                   vals.push(input.url); }
      if (input.pages_total           !== undefined) { sets.push('pages_total = ?');           vals.push(input.pages_total); }
      if (input.language_original     !== undefined) { sets.push('language_original = ?');     vals.push(input.language_original); }
      if (input.translator_names_json !== undefined) { sets.push('translator_names_json = ?'); vals.push(input.translator_names_json); }
      if (input.series_title          !== undefined) { sets.push('series_title = ?');          vals.push(input.series_title); }
      if (input.volume                !== undefined) { sets.push('volume = ?');                vals.push(input.volume); }
      if (input.issue                 !== undefined) { sets.push('issue = ?');                 vals.push(input.issue); }
      if (input.abstract              !== undefined) { sets.push('abstract = ?');              vals.push(input.abstract); }
      if (input.keywords_json         !== undefined) { sets.push('keywords_json = ?');         vals.push(input.keywords_json); }
      if (input.meta_json             !== undefined) { sets.push('meta_json = ?');             vals.push(input.meta_json); }
      if (sets.length > 0) {
        vals.push(existing.detail_id);
        await execute(
          this.db,
          `UPDATE cm_source_details SET ${sets.join(', ')} WHERE detail_id = ?`,
          vals,
        );
      }
    } else {
      const detail_id = typedId('CM');
      await execute(
        this.db,
        `INSERT INTO cm_source_details
           (detail_id, source_id, author_names_json, editor_names_json, publisher,
            publication_year, edition, isbn, doi, url, pages_total, language_original,
            translator_names_json, series_title, volume, issue, abstract, keywords_json, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detail_id, sourceId,
          input.author_names_json     ?? '[]',
          input.editor_names_json     ?? '[]',
          input.publisher             ?? null,
          input.publication_year      ?? null,
          input.edition               ?? null,
          input.isbn                  ?? null,
          input.doi                   ?? null,
          input.url                   ?? null,
          input.pages_total           ?? null,
          input.language_original     ?? null,
          input.translator_names_json ?? '[]',
          input.series_title          ?? null,
          input.volume                ?? null,
          input.issue                 ?? null,
          input.abstract              ?? null,
          input.keywords_json         ?? '[]',
          input.meta_json             ?? '{}',
        ],
      );
    }
    return (await this.detail(sourceId))!;
  }

  // ── cm_source_toc ────────────────────────────────────────────────────────

  toc(sourceId: string): Promise<CmSourceToc[]> {
    return query<CmSourceToc>(
      this.db,
      `SELECT ${TOC_COLS} FROM cm_source_toc
       WHERE source_id = ?
       ORDER BY depth ASC, seq_order ASC`,
      [sourceId],
    );
  }

  async createTocEntry(input: CmSourceTocInput): Promise<CmSourceToc> {
    const toc_id = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_source_toc
         (toc_id, source_id, parent_toc_id, seq_order, depth, heading_text,
          heading_ar, page_start, page_end, unit_id, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        toc_id, input.source_id,
        input.parent_toc_id  ?? null,
        input.seq_order      ?? 0,
        input.depth          ?? 0,
        input.heading_text,
        input.heading_ar     ?? null,
        input.page_start     ?? null,
        input.page_end       ?? null,
        input.unit_id        ?? null,
        input.meta_json      ?? '{}',
      ],
    );
    return (await queryOne<CmSourceToc>(
      this.db, `SELECT ${TOC_COLS} FROM cm_source_toc WHERE toc_id = ?`, [toc_id],
    ))!;
  }

  // ── cm_source_units ──────────────────────────────────────────────────────

  units(sourceId: string, opts: PaginateOptions = {}) {
    return paginate<CmSourceUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM cm_source_units
       WHERE source_id = ? ORDER BY depth ASC, seq_order ASC`,
      `SELECT COUNT(*) AS count FROM cm_source_units WHERE source_id = ?`,
      [sourceId], opts,
    );
  }

  findUnitById(unitId: string): Promise<CmSourceUnit | null> {
    return queryOne<CmSourceUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM cm_source_units WHERE unit_id = ?`,
      [unitId],
    );
  }

  async createUnit(input: CmSourceUnitInput): Promise<CmSourceUnit> {
    const unit_id  = typedId('CM');
    const created_at = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_source_units
         (unit_id, source_id, parent_unit_id, toc_id, unit_type, seq_order, depth,
          heading, heading_ar, page_start, page_end, word_count, body_text, body_ar,
          summary, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unit_id, input.source_id,
        input.parent_unit_id ?? null,
        input.toc_id         ?? null,
        input.unit_type,
        input.seq_order      ?? 0,
        input.depth          ?? 0,
        input.heading        ?? null,
        input.heading_ar     ?? null,
        input.page_start     ?? null,
        input.page_end       ?? null,
        input.word_count     ?? null,
        input.body_text      ?? null,
        input.body_ar        ?? null,
        input.summary        ?? null,
        input.meta_json      ?? '{}',
        created_at,
      ],
    );
    return (await this.findUnitById(unit_id))!;
  }

  // ── cm_source_chunks ─────────────────────────────────────────────────────

  chunks(sourceId: string, unitId: string | null, opts: PaginateOptions = {}) {
    const where  = unitId ? 'WHERE source_id = ? AND unit_id = ?' : 'WHERE source_id = ?';
    const params = unitId ? [sourceId, unitId] : [sourceId];
    return paginate<CmSourceChunk>(
      this.db,
      `SELECT ${CHUNK_COLS} FROM cm_source_chunks ${where} ORDER BY chunk_index ASC`,
      `SELECT COUNT(*) AS count FROM cm_source_chunks ${where}`,
      params, opts,
    );
  }

  pendingEmbeds(limit = 50): Promise<CmSourceChunk[]> {
    return query<CmSourceChunk>(
      this.db,
      `SELECT ${CHUNK_COLS} FROM cm_source_chunks
       WHERE is_embedded = 0 ORDER BY created_at ASC LIMIT ?`,
      [limit],
    );
  }

  async markEmbedded(chunkId: string, qdrantId: string, embedModel: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE cm_source_chunks
       SET is_embedded = 1, qdrant_id = ?, embed_model = ?
       WHERE chunk_id = ?`,
      [qdrantId, embedModel, chunkId],
    );
  }

  async createChunk(input: CmSourceChunkInput): Promise<CmSourceChunk> {
    const chunk_id   = typedId('CM');
    const created_at = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_source_chunks
         (chunk_id, source_id, unit_id, chunk_index, chunk_kind, page_no,
          heading_norm, text_content, token_count, is_embedded, qdrant_id,
          embed_model, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
      [
        chunk_id, input.source_id,
        input.unit_id      ?? null,
        input.chunk_index,
        input.chunk_kind   ?? null,
        input.page_no      ?? null,
        input.heading_norm ?? null,
        input.text_content,
        input.token_count  ?? null,
        input.meta_json    ?? '{}',
        created_at,
      ],
    );
    return (await queryOne<CmSourceChunk>(
      this.db, `SELECT ${CHUNK_COLS} FROM cm_source_chunks WHERE chunk_id = ?`, [chunk_id],
    ))!;
  }
}
