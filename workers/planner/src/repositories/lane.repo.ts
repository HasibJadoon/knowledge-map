// ─── LaneRepo — pl_lanes ──────────────────────────────────────────────────────
// Kanban lanes per plan. Columns mirror the pl_lanes table.

import { queryOne, query, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { Lane, LaneCreate } from '../schemas/lane.schema';

const COLS = `id, plan_id, title, lane_type, sort_order, color, wip_limit, created_at`;

export class LaneRepo {
  constructor(private db: D1Database) {}

  /** All lanes for a plan, ordered by sort_order. */
  byPlan(planId: string): Promise<Lane[]> {
    return query<Lane>(
      this.db,
      `SELECT ${COLS} FROM pl_lanes WHERE plan_id = ? ORDER BY sort_order`,
      [planId],
    );
  }

  findById(id: string): Promise<Lane | null> {
    return queryOne<Lane>(this.db, `SELECT ${COLS} FROM pl_lanes WHERE id = ?`, [id]);
  }

  async create(input: LaneCreate): Promise<Lane> {
    const id = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_lanes (id, plan_id, title, lane_type, sort_order, color, wip_limit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.plan_id,
        input.title,
        input.lane_type ?? 'custom',
        input.sort_order ?? 0,
        input.color ?? null,
        input.wip_limit ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  /** Apply a new ordering, indexing sort_order by position in the array. */
  async reorder(planId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await execute(
        this.db,
        `UPDATE pl_lanes SET sort_order = ? WHERE id = ? AND plan_id = ?`,
        [i, orderedIds[i], planId],
      );
    }
  }
}
