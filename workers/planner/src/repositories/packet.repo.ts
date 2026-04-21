// ─── PacketRepo — pl_packets + pl_packet_items ──────────────────────────────────
// Work bundles that aggregate tasks + resources from multiple modules into one
// workflow envelope (weekly class assignment, sprint bundle, study packet, etc.).

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── pl_packets ────────────────────────────────────────────────────────────────

export interface Packet {
  id: string;               // PL:ULID
  plan_id: string;          // PL:ULID
  title: string;
  packet_type: string;      // 'assignment'|'sprint'|'review_bundle'|'class_session'|'study_packet'|'other'
  assignee_refs: string | null;   // JSON array ['CORE:<user_id>',...]
  resource_refs: string | null;   // JSON array [{ref, type, label}]
  due_date: string | null;
  status: string;           // 'open'|'in_progress'|'submitted'|'reviewed'|'closed'
  instructions_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PacketCreate {
  plan_id: string;
  title: string;
  packet_type?: string;
  assignee_refs?: string | null;  // pre-serialized JSON string or null
  resource_refs?: string | null;  // pre-serialized JSON string or null
  due_date?: string | null;
  instructions_md?: string | null;
  meta_json?: string | null;
}

export interface PacketPatch {
  title?: string;
  packet_type?: string;
  assignee_refs?: string | null;
  resource_refs?: string | null;
  due_date?: string | null;
  status?: string;
  instructions_md?: string | null;
  meta_json?: string | null;
}

// ── pl_packet_items ───────────────────────────────────────────────────────────

export interface PacketItem {
  id: string;               // PL:ULID
  packet_id: string;        // PL:ULID
  task_id: string | null;   // PL:ULID — optional task link
  resource_ref: string | null;   // typed ref to canonical item
  resource_type: string | null;
  resource_label: string | null; // denormalized
  sort_order: number;
  is_required: number;      // 1 = required, 0 = optional (SQLite INTEGER bool)
  created_at: string;
}

export interface PacketItemCreate {
  task_id?: string | null;
  resource_ref?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  sort_order?: number;
  is_required?: boolean;
}

const PACKET_COLS = `id, plan_id, title, packet_type, assignee_refs, resource_refs,
                     due_date, status, instructions_md, meta_json, created_at, updated_at`;
const ITEM_COLS   = `id, packet_id, task_id, resource_ref, resource_type, resource_label,
                     sort_order, is_required, created_at`;

export class PacketRepo {
  constructor(private db: D1Database) {}

  // ── Packets ────────────────────────────────────────────────────────────────

  list(planId: string, opts: PaginateOptions = {}) {
    return paginate<Packet>(
      this.db,
      `SELECT ${PACKET_COLS} FROM pl_packets WHERE plan_id = ? ORDER BY due_date NULLS LAST, created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_packets WHERE plan_id = ?`,
      [planId],
      opts,
    );
  }

  findById(id: string): Promise<Packet | null> {
    return queryOne<Packet>(
      this.db,
      `SELECT ${PACKET_COLS} FROM pl_packets WHERE id = ?`,
      [id],
    );
  }

  async create(input: PacketCreate): Promise<Packet> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_packets
         (id, plan_id, title, packet_type, assignee_refs, resource_refs,
          due_date, status, instructions_md, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [
        id,
        input.plan_id,
        input.title,
        input.packet_type ?? 'assignment',
        input.assignee_refs ?? null,
        input.resource_refs ?? null,
        input.due_date ?? null,
        input.instructions_md ?? null,
        input.meta_json ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PacketPatch): Promise<Packet | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.title           !== undefined) { sets.push('title = ?');           vals.push(patch.title); }
    if (patch.packet_type     !== undefined) { sets.push('packet_type = ?');     vals.push(patch.packet_type); }
    if (patch.assignee_refs   !== undefined) { sets.push('assignee_refs = ?');   vals.push(patch.assignee_refs); }
    if (patch.resource_refs   !== undefined) { sets.push('resource_refs = ?');   vals.push(patch.resource_refs); }
    if (patch.due_date        !== undefined) { sets.push('due_date = ?');        vals.push(patch.due_date); }
    if (patch.status          !== undefined) { sets.push('status = ?');          vals.push(patch.status); }
    if (patch.instructions_md !== undefined) { sets.push('instructions_md = ?'); vals.push(patch.instructions_md); }
    if (patch.meta_json       !== undefined) { sets.push('meta_json = ?');       vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE pl_packets SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  // ── Packet Items ───────────────────────────────────────────────────────────

  items(packetId: string): Promise<PacketItem[]> {
    return query<PacketItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM pl_packet_items WHERE packet_id = ? ORDER BY sort_order, created_at`,
      [packetId],
    );
  }

  async addItem(packetId: string, input: PacketItemCreate): Promise<PacketItem> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_packet_items
         (id, packet_id, task_id, resource_ref, resource_type, resource_label,
          sort_order, is_required, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        packetId,
        input.task_id ?? null,
        input.resource_ref ?? null,
        input.resource_type ?? null,
        input.resource_label ?? null,
        input.sort_order ?? 0,
        input.is_required !== false ? 1 : 0,
        now,
      ],
    );
    return (await queryOne<PacketItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM pl_packet_items WHERE id = ?`,
      [id],
    ))!;
  }

  async removeItem(itemId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM pl_packet_items WHERE id = ?`,
      [itemId],
    );
  }
}
