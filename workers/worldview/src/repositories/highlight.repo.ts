// ─── HighlightRepo — wv_highlights ────────────────────────────────────────────
// Anchored reading highlights from sources and corpus units.
// Used for the /worldview/units/:unitId/annotations endpoint.
//
// Canonical columns per 001_wv_schema.sql §10.1.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WvHighlight {
  id: string;              // WV:ULID
  source_id: string | null;
  source_unit_id: string | null;
  corpus_unit_id: string | null;
  locator: string | null;  // page, verse, timestamp
  text_excerpt: string;
  note: string | null;
  highlight_type: string;  // general|key_claim|evidence|question|contradiction|insight
  color: string | null;
  moral_axis_id: string | null;
  topic_id: string | null;
  core_user_ref: string;   // CORE:ULID
  core_ws_ref: string | null;
  created_at: string;
}

export interface HighlightCreate {
  source_id?: string | null;
  source_unit_id?: string | null;
  corpus_unit_id?: string | null;
  locator?: string | null;
  text_excerpt: string;
  note?: string | null;
  highlight_type?: string;
  color?: string | null;
  moral_axis_id?: string | null;
  topic_id?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

// ── Column list ───────────────────────────────────────────────────────────────

const COLS = `
  id, source_id, source_unit_id, corpus_unit_id, locator,
  text_excerpt, note, highlight_type, color,
  moral_axis_id, topic_id, core_user_ref, core_ws_ref, created_at
`.trim().replace(/\n\s+/g, ' ');

// ── Repo ──────────────────────────────────────────────────────────────────────

export class HighlightRepo {
  constructor(private db: D1Database) {}

  /** All highlights for a source unit (used as "annotations" in the reader). */
  byUnit(sourceUnitId: string): Promise<WvHighlight[]> {
    return query<WvHighlight>(
      this.db,
      `SELECT ${COLS} FROM wv_highlights WHERE source_unit_id = ? ORDER BY created_at`,
      [sourceUnitId],
    );
  }

  /** All highlights for a source (all units). */
  bySource(sourceId: string, opts: PaginateOptions = {}) {
    return paginate<WvHighlight>(
      this.db,
      `SELECT ${COLS} FROM wv_highlights WHERE source_id = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_highlights WHERE source_id = ?`,
      [sourceId], opts,
    );
  }

  findById(id: string): Promise<WvHighlight | null> {
    return queryOne<WvHighlight>(
      this.db, `SELECT ${COLS} FROM wv_highlights WHERE id = ?`, [id],
    );
  }

  async create(input: HighlightCreate): Promise<WvHighlight> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_highlights
         (id, source_id, source_unit_id, corpus_unit_id, locator,
          text_excerpt, note, highlight_type, color,
          moral_axis_id, topic_id, core_user_ref, core_ws_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id       ?? null,
        input.source_unit_id  ?? null,
        input.corpus_unit_id  ?? null,
        input.locator         ?? null,
        input.text_excerpt,
        input.note            ?? null,
        input.highlight_type  ?? 'general',
        input.color           ?? null,
        input.moral_axis_id   ?? null,
        input.topic_id        ?? null,
        input.core_user_ref,
        input.core_ws_ref     ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_highlights WHERE id = ?`, [id]);
  }
}
