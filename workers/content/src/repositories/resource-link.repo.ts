// ─── ResourceLinkRepo — cm_resource_links ────────────────────────────────────
// Directed typed links between any two domain-name-driven typed refs across
// all modules. Supports AI-suggested links with confidence scores.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_resource_links
// ---------------------------------------------------------------------------

export interface CmResourceLink {
  link_id: string;
  source_ref: string;
  target_ref: string;
  link_type: string;
  anchor_text: string | null;
  note: string | null;
  core_user_ref: string | null;
  confidence: number;
  is_ai_suggested: number;      // 0 | 1
  meta_json: string;
  created_at: string;
}

export interface CmResourceLinkInput {
  source_ref: string;
  target_ref: string;
  link_type: string;
  anchor_text?: string | null;
  note?: string | null;
  core_user_ref?: string | null;
  confidence?: number;
  is_ai_suggested?: number;
  meta_json?: string;
}

const LINK_COLS = `link_id, source_ref, target_ref, link_type, anchor_text, note,
  core_user_ref, confidence, is_ai_suggested, meta_json, created_at`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ResourceLinkRepo {
  constructor(private db: D1Database) {}

  /** All links whose source_ref matches the given typed ref. */
  fromSource(sourceRef: string, opts: PaginateOptions = {}) {
    return paginate<CmResourceLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_resource_links
       WHERE source_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_resource_links WHERE source_ref = ?`,
      [sourceRef], opts,
    );
  }

  /** All links whose target_ref matches the given typed ref. */
  toTarget(targetRef: string, opts: PaginateOptions = {}) {
    return paginate<CmResourceLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_resource_links
       WHERE target_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_resource_links WHERE target_ref = ?`,
      [targetRef], opts,
    );
  }

  findById(linkId: string): Promise<CmResourceLink | null> {
    return queryOne<CmResourceLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_resource_links WHERE link_id = ?`,
      [linkId],
    );
  }

  async create(input: CmResourceLinkInput): Promise<CmResourceLink> {
    const link_id = typedId('CM');
    const now     = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_resource_links
         (link_id, source_ref, target_ref, link_type, anchor_text, note,
          core_user_ref, confidence, is_ai_suggested, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link_id, input.source_ref, input.target_ref, input.link_type,
        input.anchor_text    ?? null,
        input.note           ?? null,
        input.core_user_ref  ?? null,
        input.confidence     ?? 1.0,
        input.is_ai_suggested ?? 0,
        input.meta_json      ?? '{}',
        now,
      ],
    );
    return (await this.findById(link_id))!;
  }

  async delete(linkId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM cm_resource_links WHERE link_id = ?`,
      [linkId],
    );
  }
}
