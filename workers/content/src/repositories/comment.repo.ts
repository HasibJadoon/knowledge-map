// ─── CommentRepo — cm_comments + cm_comment_reactions ────────────────────────
// Threaded comments on any typed cross-module ref, with emoji reactions.
// Supports resolve workflow and edit history tracking.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_comments
// ---------------------------------------------------------------------------

export interface CmComment {
  comment_id: string;
  core_user_ref: string;
  target_ref: string;
  parent_comment_id: string | null;
  thread_root_id: string | null;
  comment_text: string;
  comment_ar: string | null;
  is_resolved: number;          // 0 | 1
  resolved_by_ref: string | null;
  resolved_at: string | null;
  edit_history_json: string;
  workspace_ref: string | null;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

export interface CmCommentInput {
  core_user_ref: string;
  target_ref: string;
  parent_comment_id?: string | null;
  thread_root_id?: string | null;
  comment_text: string;
  comment_ar?: string | null;
  workspace_ref?: string | null;
  meta_json?: string;
}

export interface CmCommentPatch {
  comment_text?: string;
  comment_ar?: string | null;
  workspace_ref?: string | null;
  meta_json?: string;
}

const COMMENT_COLS = `comment_id, core_user_ref, target_ref, parent_comment_id,
  thread_root_id, comment_text, comment_ar, is_resolved, resolved_by_ref,
  resolved_at, edit_history_json, workspace_ref, meta_json, created_at, updated_at`;

// ---------------------------------------------------------------------------
// cm_comment_reactions
// ---------------------------------------------------------------------------

export interface CmCommentReaction {
  reaction_id: string;
  comment_id: string;
  core_user_ref: string;
  emoji: string;
  created_at: string;
}

const REACTION_COLS = `reaction_id, comment_id, core_user_ref, emoji, created_at`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class CommentRepo {
  constructor(private db: D1Database) {}

  // ── cm_comments ──────────────────────────────────────────────────────────

  byTarget(targetRef: string, opts: PaginateOptions = {}) {
    return paginate<CmComment>(
      this.db,
      `SELECT ${COMMENT_COLS} FROM cm_comments
       WHERE target_ref = ? AND parent_comment_id IS NULL
       ORDER BY created_at ASC`,
      `SELECT COUNT(*) AS count FROM cm_comments
       WHERE target_ref = ? AND parent_comment_id IS NULL`,
      [targetRef], opts,
    );
  }

  thread(rootId: string): Promise<CmComment[]> {
    return query<CmComment>(
      this.db,
      `SELECT ${COMMENT_COLS} FROM cm_comments
       WHERE thread_root_id = ? OR comment_id = ?
       ORDER BY created_at ASC`,
      [rootId, rootId],
    );
  }

  findById(commentId: string): Promise<CmComment | null> {
    return queryOne<CmComment>(
      this.db,
      `SELECT ${COMMENT_COLS} FROM cm_comments WHERE comment_id = ?`,
      [commentId],
    );
  }

  async create(input: CmCommentInput): Promise<CmComment> {
    const comment_id = typedId('CM');
    const now        = new Date().toISOString();
    // Derive thread_root_id: if replying to a comment that itself has a
    // thread_root_id use that, otherwise use the parent_comment_id as root.
    let thread_root_id = input.thread_root_id ?? null;
    if (!thread_root_id && input.parent_comment_id) {
      const parent = await this.findById(input.parent_comment_id);
      thread_root_id = parent?.thread_root_id ?? input.parent_comment_id;
    }
    await execute(
      this.db,
      `INSERT INTO cm_comments
         (comment_id, core_user_ref, target_ref, parent_comment_id, thread_root_id,
          comment_text, comment_ar, is_resolved, resolved_by_ref, resolved_at,
          edit_history_json, workspace_ref, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, '[]', ?, ?, ?, ?)`,
      [
        comment_id, input.core_user_ref, input.target_ref,
        input.parent_comment_id ?? null,
        thread_root_id,
        input.comment_text,
        input.comment_ar    ?? null,
        input.workspace_ref ?? null,
        input.meta_json     ?? '{}',
        now, now,
      ],
    );
    return (await this.findById(comment_id))!;
  }

  async patch(commentId: string, patch: CmCommentPatch): Promise<CmComment | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.comment_text  !== undefined) { sets.push('comment_text = ?');  vals.push(patch.comment_text); }
    if (patch.comment_ar    !== undefined) { sets.push('comment_ar = ?');    vals.push(patch.comment_ar); }
    if (patch.workspace_ref !== undefined) { sets.push('workspace_ref = ?'); vals.push(patch.workspace_ref); }
    if (patch.meta_json     !== undefined) { sets.push('meta_json = ?');     vals.push(patch.meta_json); }
    vals.push(commentId);
    await execute(
      this.db,
      `UPDATE cm_comments SET ${sets.join(', ')} WHERE comment_id = ?`,
      vals,
    );
    return this.findById(commentId);
  }

  async resolve(commentId: string, resolvedByRef: string): Promise<CmComment | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE cm_comments
       SET is_resolved = 1, resolved_by_ref = ?, resolved_at = ?, updated_at = ?
       WHERE comment_id = ?`,
      [resolvedByRef, now, now, commentId],
    );
    return this.findById(commentId);
  }

  async delete(commentId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM cm_comment_reactions WHERE comment_id = ?`,
      [commentId],
    );
    await execute(
      this.db,
      `DELETE FROM cm_comments WHERE comment_id = ?`,
      [commentId],
    );
  }

  // ── cm_comment_reactions ─────────────────────────────────────────────────

  reactions(commentId: string): Promise<CmCommentReaction[]> {
    return query<CmCommentReaction>(
      this.db,
      `SELECT ${REACTION_COLS} FROM cm_comment_reactions
       WHERE comment_id = ? ORDER BY created_at ASC`,
      [commentId],
    );
  }

  async addReaction(commentId: string, userRef: string, emoji: string): Promise<CmCommentReaction> {
    const reaction_id = typedId('CM');
    const now         = new Date().toISOString();
    // INSERT OR IGNORE respects the UNIQUE(comment_id, core_user_ref, emoji) constraint
    await execute(
      this.db,
      `INSERT OR IGNORE INTO cm_comment_reactions
         (reaction_id, comment_id, core_user_ref, emoji, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [reaction_id, commentId, userRef, emoji, now],
    );
    return (await queryOne<CmCommentReaction>(
      this.db,
      `SELECT ${REACTION_COLS} FROM cm_comment_reactions
       WHERE comment_id = ? AND core_user_ref = ? AND emoji = ?`,
      [commentId, userRef, emoji],
    ))!;
  }

  async removeReaction(commentId: string, userRef: string, emoji: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM cm_comment_reactions
       WHERE comment_id = ? AND core_user_ref = ? AND emoji = ?`,
      [commentId, userRef, emoji],
    );
  }
}
