// ─── SourceRepo — cm_sources ──────────────────────────────────────────────────
// CM sources: authored publications, references, media assets owned by CM.
// NOT the same as wv_sources (which are research artefacts in WV).
// cm_sources are content items (books, articles, podcasts) with attached docs/notes.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface CmSource {
  id: string;              // CM:ULID
  title: string;
  source_type: string;     // book | article | podcast | video | website
  author_ref: string | null; // typed ref (CORE:ULID or free text in author_name)
  author_name: string | null;
  language: string;        // ISO 639-1
  url: string | null;
  published_at: string | null; // ISO date
  created_at: string;
}

export interface CmSourceCreate {
  title: string;
  source_type?: string;
  author_ref?: string | null;
  author_name?: string | null;
  language?: string;
  url?: string | null;
  published_at?: string | null;
}

const COLS = `id, title, source_type, author_ref, author_name,
              language, url, published_at, created_at`;

export class CmSourceRepo {
  constructor(private db: D1Database) {}

  list(sourceType: string | null, opts: PaginateOptions = {}) {
    const where  = sourceType ? 'WHERE source_type = ?' : '';
    const params = sourceType ? [sourceType] : [];
    return paginate<CmSource>(
      this.db,
      `SELECT ${COLS} FROM cm_sources ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_sources ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<CmSource | null> {
    return queryOne<CmSource>(
      this.db, `SELECT ${COLS} FROM cm_sources WHERE id = ?`, [id],
    );
  }

  async create(input: CmSourceCreate): Promise<CmSource> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_sources
         (id, title, source_type, author_ref, author_name, language, url, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.source_type ?? 'book',
       input.author_ref ?? null, input.author_name ?? null,
       input.language ?? 'en', input.url ?? null, input.published_at ?? null, now],
    );
    return (await this.findById(id))!;
  }
}
