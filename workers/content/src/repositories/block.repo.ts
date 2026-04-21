// ─── BlockRepo — cm_blocks + cm_block_refs + cm_block_embeds ─────────────────
// Structured content blocks inside a document, with typed cross-module refs
// and embedded media/widget payloads.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ---------------------------------------------------------------------------
// cm_blocks
// ---------------------------------------------------------------------------

export interface CmBlock {
  block_id: string;
  doc_id: string;
  parent_block_id: string | null;
  block_type: string;
  seq_order: number;
  depth: number;
  content_text: string | null;
  content_ar: string | null;
  attrs_json: string;
  annotations_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

export interface CmBlockInput {
  doc_id: string;
  parent_block_id?: string | null;
  block_type: string;
  seq_order?: number;
  depth?: number;
  content_text?: string | null;
  content_ar?: string | null;
  attrs_json?: string;
  annotations_json?: string;
  meta_json?: string;
}

export interface CmBlockPatch {
  block_type?: string;
  seq_order?: number;
  depth?: number;
  content_text?: string | null;
  content_ar?: string | null;
  attrs_json?: string;
  annotations_json?: string;
  meta_json?: string;
}

const BLOCK_COLS = `block_id, doc_id, parent_block_id, block_type, seq_order, depth,
  content_text, content_ar, attrs_json, annotations_json, meta_json, created_at, updated_at`;

// ---------------------------------------------------------------------------
// cm_block_refs
// ---------------------------------------------------------------------------

export interface CmBlockRef {
  ref_id: string;
  block_id: string;
  target_ref: string;
  ref_type: string;
  anchor_text: string | null;
  note: string | null;
  seq_order: number;
  meta_json: string;
}

export interface CmBlockRefInput {
  target_ref: string;
  ref_type: string;
  anchor_text?: string | null;
  note?: string | null;
  seq_order?: number;
  meta_json?: string;
}

const REF_COLS = `ref_id, block_id, target_ref, ref_type, anchor_text, note, seq_order, meta_json`;

// ---------------------------------------------------------------------------
// cm_block_embeds
// ---------------------------------------------------------------------------

export interface CmBlockEmbed {
  embed_id: string;
  block_id: string;
  embed_type: string;
  target_ref: string | null;
  embed_config_json: string;
  caption: string | null;
  meta_json: string;
}

export interface CmBlockEmbedInput {
  embed_type: string;
  target_ref?: string | null;
  embed_config_json?: string;
  caption?: string | null;
  meta_json?: string;
}

const EMBED_COLS = `embed_id, block_id, embed_type, target_ref, embed_config_json, caption, meta_json`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class BlockRepo {
  constructor(private db: D1Database) {}

  // ── cm_blocks ────────────────────────────────────────────────────────────

  byDocument(docId: string): Promise<CmBlock[]> {
    return query<CmBlock>(
      this.db,
      `SELECT ${BLOCK_COLS} FROM cm_blocks
       WHERE doc_id = ? ORDER BY seq_order ASC, created_at ASC`,
      [docId],
    );
  }

  findById(blockId: string): Promise<CmBlock | null> {
    return queryOne<CmBlock>(
      this.db,
      `SELECT ${BLOCK_COLS} FROM cm_blocks WHERE block_id = ?`,
      [blockId],
    );
  }

  async create(input: CmBlockInput): Promise<CmBlock> {
    const block_id   = typedId('CM');
    const now        = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_blocks
         (block_id, doc_id, parent_block_id, block_type, seq_order, depth,
          content_text, content_ar, attrs_json, annotations_json, meta_json,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        block_id, input.doc_id,
        input.parent_block_id  ?? null,
        input.block_type,
        input.seq_order        ?? 0,
        input.depth            ?? 0,
        input.content_text     ?? null,
        input.content_ar       ?? null,
        input.attrs_json       ?? '{}',
        input.annotations_json ?? '[]',
        input.meta_json        ?? '{}',
        now, now,
      ],
    );
    return (await this.findById(block_id))!;
  }

  async patch(blockId: string, patch: CmBlockPatch): Promise<CmBlock | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.block_type        !== undefined) { sets.push('block_type = ?');        vals.push(patch.block_type); }
    if (patch.seq_order         !== undefined) { sets.push('seq_order = ?');         vals.push(patch.seq_order); }
    if (patch.depth             !== undefined) { sets.push('depth = ?');             vals.push(patch.depth); }
    if (patch.content_text      !== undefined) { sets.push('content_text = ?');      vals.push(patch.content_text); }
    if (patch.content_ar        !== undefined) { sets.push('content_ar = ?');        vals.push(patch.content_ar); }
    if (patch.attrs_json        !== undefined) { sets.push('attrs_json = ?');        vals.push(patch.attrs_json); }
    if (patch.annotations_json  !== undefined) { sets.push('annotations_json = ?');  vals.push(patch.annotations_json); }
    if (patch.meta_json         !== undefined) { sets.push('meta_json = ?');         vals.push(patch.meta_json); }
    vals.push(blockId);
    await execute(this.db, `UPDATE cm_blocks SET ${sets.join(', ')} WHERE block_id = ?`, vals);
    return this.findById(blockId);
  }

  async delete(blockId: string): Promise<void> {
    await execute(this.db, `DELETE FROM cm_blocks WHERE block_id = ?`, [blockId]);
  }

  // ── cm_block_refs ────────────────────────────────────────────────────────

  refs(blockId: string): Promise<CmBlockRef[]> {
    return query<CmBlockRef>(
      this.db,
      `SELECT ${REF_COLS} FROM cm_block_refs
       WHERE block_id = ? ORDER BY seq_order ASC`,
      [blockId],
    );
  }

  async addRef(blockId: string, input: CmBlockRefInput): Promise<CmBlockRef> {
    const ref_id = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_block_refs
         (ref_id, block_id, target_ref, ref_type, anchor_text, note, seq_order, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref_id, blockId,
        input.target_ref,
        input.ref_type,
        input.anchor_text ?? null,
        input.note        ?? null,
        input.seq_order   ?? 0,
        input.meta_json   ?? '{}',
      ],
    );
    return (await queryOne<CmBlockRef>(
      this.db, `SELECT ${REF_COLS} FROM cm_block_refs WHERE ref_id = ?`, [ref_id],
    ))!;
  }

  async removeRef(refId: string): Promise<void> {
    await execute(this.db, `DELETE FROM cm_block_refs WHERE ref_id = ?`, [refId]);
  }

  // ── cm_block_embeds ──────────────────────────────────────────────────────

  embeds(blockId: string): Promise<CmBlockEmbed[]> {
    return query<CmBlockEmbed>(
      this.db,
      `SELECT ${EMBED_COLS} FROM cm_block_embeds WHERE block_id = ?`,
      [blockId],
    );
  }

  async addEmbed(blockId: string, input: CmBlockEmbedInput): Promise<CmBlockEmbed> {
    const embed_id = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_block_embeds
         (embed_id, block_id, embed_type, target_ref, embed_config_json, caption, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        embed_id, blockId,
        input.embed_type,
        input.target_ref        ?? null,
        input.embed_config_json ?? '{}',
        input.caption           ?? null,
        input.meta_json         ?? '{}',
      ],
    );
    return (await queryOne<CmBlockEmbed>(
      this.db, `SELECT ${EMBED_COLS} FROM cm_block_embeds WHERE embed_id = ?`, [embed_id],
    ))!;
  }

  async removeEmbed(embedId: string): Promise<void> {
    await execute(this.db, `DELETE FROM cm_block_embeds WHERE embed_id = ?`, [embedId]);
  }
}
