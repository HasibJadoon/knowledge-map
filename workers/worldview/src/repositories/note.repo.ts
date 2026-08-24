// ─── NoteRepo — L10 tables ────────────────────────────────────────────────────
// wv_notes, wv_note_relations
//
// wv_notes columns (from SQL):
//   id, note_type, title, body_md, tradition_id, topic_id, moral_axis_id,
//   core_user_ref, core_ws_ref, is_pinned, meta_json, created_at, updated_at
//
// wv_note_relations columns:
//   id, note_id, target_type, target_id, relation_role, created_at

import { query, queryOne, execute, paginate, buildPatch } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface WvNote {
  id: string;
  note_type: string;
  title: string | null;
  body_md: string;
  tradition_id: string | null;
  topic_id: string | null;
  moral_axis_id: string | null;
  core_user_ref: string;
  core_ws_ref: string | null;
  is_pinned: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvNoteRelation {
  id: string;
  note_id: string;
  target_type: string;
  target_id: string;
  relation_role: string | null;
  created_at: string;
}

// ─── Create/patch input types ──────────────────────────────────────────────────

export interface NoteCreate {
  note_type: string;
  title?: string | null;
  body_md: string;
  tradition_id?: string | null;
  topic_id?: string | null;
  moral_axis_id?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
  is_pinned?: number;
  meta_json?: string | null;
}

export type NotePatch = Partial<Omit<NoteCreate, 'core_user_ref'>>;

export interface NoteRelationCreate {
  note_id: string;
  target_type: string;
  target_id: string;
  relation_role?: string | null;
}

// ─── Column lists ──────────────────────────────────────────────────────────────

const NOTE_COLS = `id, note_type, title, body_md, tradition_id, topic_id, moral_axis_id, core_user_ref, core_ws_ref, is_pinned, meta_json, created_at, updated_at`;
const NR_COLS   = `id, note_id, target_type, target_id, relation_role, created_at`;

// ─── Patch helper ──────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// NoteRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class NoteRepo {
  constructor(private db: D1Database) {}

  // ── Notes ──────────────────────────────────────────────────────────────────

  list(
    coreUserRef: string | null,
    topicId: string | null,
    noteType: string | null,
    opts: PaginateOptions = {},
  ) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (coreUserRef) { conds.push('core_user_ref = ?'); params.push(coreUserRef); }
    if (topicId)     { conds.push('topic_id = ?');      params.push(topicId); }
    if (noteType)    { conds.push('note_type = ?');     params.push(noteType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvNote>(
      this.db,
      `SELECT ${NOTE_COLS} FROM wv_notes ${where} ORDER BY is_pinned DESC, updated_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_notes ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvNote | null> {
    return queryOne<WvNote>(
      this.db, `SELECT ${NOTE_COLS} FROM wv_notes WHERE id = ?`, [id],
    );
  }

  async create(input: NoteCreate): Promise<WvNote> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_notes
         (id, note_type, title, body_md, tradition_id, topic_id, moral_axis_id,
          core_user_ref, core_ws_ref, is_pinned, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.note_type, input.title ?? null, input.body_md,
       input.tradition_id ?? null, input.topic_id ?? null,
       input.moral_axis_id ?? null, input.core_user_ref,
       input.core_ws_ref ?? null, input.is_pinned ?? 0,
       input.meta_json ?? null, now, now],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: NotePatch): Promise<WvNote | null> {
    const { setClauses, values } = buildPatch({
      ...(patch as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    });
    if (!setClauses) return this.findById(id);
    await execute(this.db, `UPDATE wv_notes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_notes WHERE id = ?`, [id]);
  }

  // ── Note Relations ─────────────────────────────────────────────────────────

  relations(noteId: string): Promise<WvNoteRelation[]> {
    return query<WvNoteRelation>(
      this.db,
      `SELECT ${NR_COLS} FROM wv_note_relations WHERE note_id = ? ORDER BY target_type`,
      [noteId],
    );
  }

  findRelationById(id: string): Promise<WvNoteRelation | null> {
    return queryOne<WvNoteRelation>(
      this.db, `SELECT ${NR_COLS} FROM wv_note_relations WHERE id = ?`, [id],
    );
  }

  async addRelation(input: NoteRelationCreate): Promise<WvNoteRelation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_note_relations
         (id, note_id, target_type, target_id, relation_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.note_id, input.target_type, input.target_id,
       input.relation_role ?? null, now],
    );
    return (await this.findRelationById(id))!;
  }

  async removeRelation(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_note_relations WHERE id = ?`, [id]);
  }
}
