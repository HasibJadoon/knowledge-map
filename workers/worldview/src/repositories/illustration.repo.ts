// ─── IllustrationRepo — wv_source_unit_illustrations ──────────────────────────
// Per-source-unit visual illustrations. A wv_source_units chapter / session /
// passage owns 1..N illustrations, ordered by order_index. Each illustration is
// a COMPLETE, self-contained HTML document (its own <style>, SVG, etc.) stored
// verbatim in html_content and served as-is. The other columns are lightweight
// listing metadata (title / caption / order) for the reader's table of contents.
//
// Canonical columns per 003_add_wv_source_unit_illustrations.sql.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WvIllustration {
  id: string;                       // WV:ULID
  source_unit_id: string;
  source_id: string | null;
  slug: string | null;
  order_index: number;
  title: string | null;
  caption: string | null;
  theme: string;                    // dark | paper
  html_content: string;             // full standalone HTML document
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

/** List rows omit the (potentially large) html_content blob. */
export type WvIllustrationSummary = Omit<WvIllustration, 'html_content'>;

export interface IllustrationCreate {
  source_unit_id: string;
  source_id?: string | null;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  html_content: string;
  meta_json?: string | null;
}

export interface IllustrationPatch {
  source_unit_id?: string;
  source_id?: string | null;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  html_content?: string;
  meta_json?: string | null;
}

// ── Column lists ────────────────────────────────────────────────────────────────

const COLS = `
  id, source_unit_id, source_id, slug, order_index, title, caption,
  theme, html_content, meta_json, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

// Listing columns deliberately exclude html_content to keep TOC payloads small.
const SUMMARY_COLS = `
  id, source_unit_id, source_id, slug, order_index, title, caption,
  theme, meta_json, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

// Mutable columns a PATCH may touch, in a stable order.
const PATCH_COLS: (keyof IllustrationPatch)[] = [
  'source_unit_id', 'source_id', 'slug', 'order_index', 'title',
  'caption', 'theme', 'html_content', 'meta_json',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Best-effort title from a full HTML document (<title> then first <h1>). */
export function deriveTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title && title.trim()) return title.trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const text = h1.replace(/<[^>]+>/g, '').trim();
    if (text) return text;
  }
  return null;
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export class IllustrationRepo {
  constructor(private db: D1Database) {}

  /** All illustrations for a single source unit, in display order (no html_content). */
  listByUnit(sourceUnitId: string, opts: PaginateOptions = {}) {
    return paginate<WvIllustrationSummary>(
      this.db,
      `SELECT ${SUMMARY_COLS} FROM wv_source_unit_illustrations
        WHERE source_unit_id = ?
        ORDER BY order_index, created_at, id`,
      `SELECT COUNT(*) AS count FROM wv_source_unit_illustrations WHERE source_unit_id = ?`,
      [sourceUnitId], opts,
    );
  }

  /** All illustrations for a whole source, grouped by unit then order (no html_content). */
  listBySource(sourceId: string, opts: PaginateOptions = {}) {
    return paginate<WvIllustrationSummary>(
      this.db,
      `SELECT ${SUMMARY_COLS} FROM wv_source_unit_illustrations
        WHERE source_id = ?
        ORDER BY source_unit_id, order_index, created_at, id`,
      `SELECT COUNT(*) AS count FROM wv_source_unit_illustrations WHERE source_id = ?`,
      [sourceId], opts,
    );
  }

  findById(id: string): Promise<WvIllustration | null> {
    return queryOne<WvIllustration>(
      this.db, `SELECT ${COLS} FROM wv_source_unit_illustrations WHERE id = ?`, [id],
    );
  }

  findBySlug(slug: string): Promise<WvIllustration | null> {
    return queryOne<WvIllustration>(
      this.db, `SELECT ${COLS} FROM wv_source_unit_illustrations WHERE slug = ?`, [slug],
    );
  }

  /** Largest order_index currently used within a unit (or 0 if none). */
  private async maxOrder(sourceUnitId: string): Promise<number> {
    const row = await queryOne<{ max_order: number | null }>(
      this.db,
      `SELECT MAX(order_index) AS max_order FROM wv_source_unit_illustrations WHERE source_unit_id = ?`,
      [sourceUnitId],
    );
    return row?.max_order ?? 0;
  }

  async create(input: IllustrationCreate): Promise<WvIllustration> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    // Default to appending after the last illustration in the unit.
    const order = input.order_index ?? (await this.maxOrder(input.source_unit_id)) + 1;
    // Fall back to a derived title when the caller did not supply one.
    const title = input.title ?? deriveTitle(input.html_content);
    await execute(
      this.db,
      `INSERT INTO wv_source_unit_illustrations
         (id, source_unit_id, source_id, slug, order_index, title, caption,
          theme, html_content, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_unit_id,
        input.source_id   ?? null,
        input.slug        ?? null,
        order,
        title,
        input.caption     ?? null,
        input.theme       ?? 'dark',
        input.html_content,
        input.meta_json   ?? null,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  /** Partial update. Only provided fields are written. */
  async patch(id: string, fields: IllustrationPatch): Promise<WvIllustration | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const col of PATCH_COLS) {
      if (fields[col] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(fields[col] ?? null);
      }
    }
    if (!sets.length) return this.findById(id);

    sets.push(`updated_at = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    await execute(
      this.db,
      `UPDATE wv_source_unit_illustrations SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_source_unit_illustrations WHERE id = ?`, [id]);
  }
}
