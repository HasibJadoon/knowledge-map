// ─── LaneRepo — pl_lanes ──────────────────────────────────────────────────────
// Kanban lanes per plan. Default lanes (Pending / In Progress / Done / Skipped)
// are virtual (derived from task.status), but custom lanes are stored here and
// allow user-defined workflow stages beyond the standard four.

import { queryOne, query, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export interface Lane {
  id: string;         // PL:ULID
  plan_id: string;    // PL:ULID
  label: string;
  color: string | null;
  lane_order: number;
  maps_to_status: string | null; // pending | in_progress | done | skipped | null (custom)
  created_at: string;
}

export interface LaneCreate {
  plan_id: string;
  label: string;
  lane_order: number;
  color?: string | null;
  maps_to_status?: string | null;
}

const COLS = `id, plan_id, label, color, lane_order, maps_to_status, created_at`;

export class LaneRepo {
  constructor(private db: D1Database) {}

  /** All lanes for a plan, ordered by lane_order. */
  byPlan(planId: string): Promise<Lane[]> {
    return query<Lane>(
      this.db,
      `SELECT ${COLS} FROM pl_lanes WHERE plan_id = ? ORDER BY lane_order`,
      [planId],
    );
  }

  findById(id: string): Promise<Lane | null> {
    return queryOne<Lane>(
      this.db, `SELECT ${COLS} FROM pl_lanes WHERE id = ?`, [id],
    );
  }

  async create(input: LaneCreate): Promise<Lane> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_lanes (id, plan_id, label, color, lane_order, maps_to_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.plan_id, input.label, input.color ?? null,
       input.lane_order, input.maps_to_status ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async reorder(planId: string, orderedIds: string[]): Promise<void> {
    // Update lane_order for each lane in the provided sequence
    for (let i = 0; i < orderedIds.length; i++) {
      await execute(
        this.db,
        `UPDATE pl_lanes SET lane_order = ? WHERE id = ? AND plan_id = ?`,
        [i, orderedIds[i], planId],
      );
    }
  }
}
