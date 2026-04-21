// ─── CollectionRepo — cm_collections + cm_collection_items ───────────────────
// Ordered or unordered collections of typed cross-module references —
// reading lists, playlists, curated sets.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_collections
// ---------------------------------------------------------------------------

export interface CmCollection {
  collection_id: string;
  core_user_ref: string;
  collection_type: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  is_ordered: number;           // 0 | 1
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string;
  cover_image_url: string | null;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

export interface CmCollectionInput {
  core_user_ref: string;
  collection_type?: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  is_ordered?: number;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  cover_image_url?: string | null;
  meta_json?: string;
}

export interface CmCollectionPatch {
  collection_type?: string;
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  is_ordered?: number;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  cover_image_url?: string | null;
  meta_json?: string;
}

const COL_COLS = `collection_id, core_user_ref, collection_type, title, title_ar,
  description, is_ordered, policy_ref, workspace_ref, tags_json,
  cover_image_url, meta_json, created_at, updated_at`;

// ---------------------------------------------------------------------------
// cm_collection_items
// ---------------------------------------------------------------------------

export interface CmCollectionItem {
  item_id: string;
  collection_id: string;
  target_ref: string;
  seq_order: number;
  item_note: string | null;
  meta_json: string;
}

const ITEM_COLS = `item_id, collection_id, target_ref, seq_order, item_note, meta_json`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class CollectionRepo {
  constructor(private db: D1Database) {}

  // ── cm_collections ───────────────────────────────────────────────────────

  list(userRef: string, workspaceRef: string | null, opts: PaginateOptions = {}) {
    let where  = 'WHERE core_user_ref = ?';
    const params: unknown[] = [userRef];
    if (workspaceRef) {
      where += ' AND workspace_ref = ?';
      params.push(workspaceRef);
    }
    return paginate<CmCollection>(
      this.db,
      `SELECT ${COL_COLS} FROM cm_collections ${where} ORDER BY updated_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_collections ${where}`,
      params, opts,
    );
  }

  findById(collectionId: string): Promise<CmCollection | null> {
    return queryOne<CmCollection>(
      this.db,
      `SELECT ${COL_COLS} FROM cm_collections WHERE collection_id = ?`,
      [collectionId],
    );
  }

  async create(input: CmCollectionInput): Promise<CmCollection> {
    const collection_id = typedId('CM');
    const now           = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_collections
         (collection_id, core_user_ref, collection_type, title, title_ar,
          description, is_ordered, policy_ref, workspace_ref, tags_json,
          cover_image_url, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        collection_id, input.core_user_ref,
        input.collection_type ?? 'mixed',
        input.title,
        input.title_ar        ?? null,
        input.description     ?? null,
        input.is_ordered      ?? 1,
        input.policy_ref      ?? null,
        input.workspace_ref   ?? null,
        input.tags_json       ?? '[]',
        input.cover_image_url ?? null,
        input.meta_json       ?? '{}',
        now, now,
      ],
    );
    return (await this.findById(collection_id))!;
  }

  async patch(collectionId: string, patch: CmCollectionPatch): Promise<CmCollection | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.collection_type !== undefined) { sets.push('collection_type = ?'); vals.push(patch.collection_type); }
    if (patch.title           !== undefined) { sets.push('title = ?');           vals.push(patch.title); }
    if (patch.title_ar        !== undefined) { sets.push('title_ar = ?');        vals.push(patch.title_ar); }
    if (patch.description     !== undefined) { sets.push('description = ?');     vals.push(patch.description); }
    if (patch.is_ordered      !== undefined) { sets.push('is_ordered = ?');      vals.push(patch.is_ordered); }
    if (patch.policy_ref      !== undefined) { sets.push('policy_ref = ?');      vals.push(patch.policy_ref); }
    if (patch.workspace_ref   !== undefined) { sets.push('workspace_ref = ?');   vals.push(patch.workspace_ref); }
    if (patch.tags_json       !== undefined) { sets.push('tags_json = ?');       vals.push(patch.tags_json); }
    if (patch.cover_image_url !== undefined) { sets.push('cover_image_url = ?'); vals.push(patch.cover_image_url); }
    if (patch.meta_json       !== undefined) { sets.push('meta_json = ?');       vals.push(patch.meta_json); }
    vals.push(collectionId);
    await execute(
      this.db,
      `UPDATE cm_collections SET ${sets.join(', ')} WHERE collection_id = ?`,
      vals,
    );
    return this.findById(collectionId);
  }

  async delete(collectionId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM cm_collection_items WHERE collection_id = ?`,
      [collectionId],
    );
    await execute(
      this.db,
      `DELETE FROM cm_collections WHERE collection_id = ?`,
      [collectionId],
    );
  }

  // ── cm_collection_items ──────────────────────────────────────────────────

  items(collectionId: string): Promise<CmCollectionItem[]> {
    return query<CmCollectionItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM cm_collection_items
       WHERE collection_id = ? ORDER BY seq_order ASC`,
      [collectionId],
    );
  }

  async addItem(
    collectionId: string,
    targetRef: string,
    note?: string | null,
  ): Promise<CmCollectionItem> {
    const item_id = typedId('CM');
    // Determine next seq_order
    const maxRow = await queryOne<{ max_order: number | null }>(
      this.db,
      `SELECT MAX(seq_order) AS max_order FROM cm_collection_items WHERE collection_id = ?`,
      [collectionId],
    );
    const seq_order = (maxRow?.max_order ?? -1) + 1;
    await execute(
      this.db,
      `INSERT INTO cm_collection_items
         (item_id, collection_id, target_ref, seq_order, item_note, meta_json)
       VALUES (?, ?, ?, ?, ?, '{}')`,
      [item_id, collectionId, targetRef, seq_order, note ?? null],
    );
    return (await queryOne<CmCollectionItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM cm_collection_items WHERE item_id = ?`,
      [item_id],
    ))!;
  }

  async removeItem(itemId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM cm_collection_items WHERE item_id = ?`,
      [itemId],
    );
  }

  async reorder(collectionId: string, orderedItemIds: string[]): Promise<void> {
    // Execute one UPDATE per item — D1 does not support CTEs with UPDATE in all contexts
    for (let i = 0; i < orderedItemIds.length; i++) {
      await execute(
        this.db,
        `UPDATE cm_collection_items SET seq_order = ? WHERE item_id = ? AND collection_id = ?`,
        [i, orderedItemIds[i], collectionId],
      );
    }
  }
}
