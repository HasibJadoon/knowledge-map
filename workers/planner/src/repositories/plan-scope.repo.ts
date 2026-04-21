// ─── PlanScopeRepo — pl_plan_scopes ────────────────────────────────────────────
// Execution shells within a plan — each scope carves a canonical resource
// (QR passage, WV source, AR class, CM doc, etc.) into a planning envelope.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface PlanScope {
  id: string;               // PL:ULID
  plan_id: string;          // PL:ULID
  title: string;
  scope_type: string;       // 'source'|'surah_range'|'arabic_class'|'wv_node'|'cm_document'|'custom'
  resource_ref: string | null;  // typed ref e.g. 'WV:ULID', 'QR:2:1-286', 'AR:ULID', 'CM:ULID'
  resource_label: string | null; // denormalized display name — never truth
  total_units: number | null;
  completed_units: number;
  sort_order: number;
  meta_json: string | null;
  created_at: string;
}

export interface PlanScopeCreate {
  plan_id: string;
  title: string;
  scope_type?: string;
  resource_ref?: string | null;
  resource_label?: string | null;
  total_units?: number | null;
  sort_order?: number;
  meta_json?: string | null;
}

export interface PlanScopePatch {
  title?: string;
  scope_type?: string;
  resource_ref?: string | null;
  resource_label?: string | null;
  total_units?: number | null;
  sort_order?: number;
  meta_json?: string | null;
}

const COLS = `id, plan_id, title, scope_type, resource_ref, resource_label,
              total_units, completed_units, sort_order, meta_json, created_at`;

export class PlanScopeRepo {
  constructor(private db: D1Database) {}

  /** All scopes for a plan, ordered by sort_order. */
  list(planId: string): Promise<PlanScope[]> {
    return query<PlanScope>(
      this.db,
      `SELECT ${COLS} FROM pl_plan_scopes WHERE plan_id = ? ORDER BY sort_order, created_at`,
      [planId],
    );
  }

  findById(id: string): Promise<PlanScope | null> {
    return queryOne<PlanScope>(
      this.db,
      `SELECT ${COLS} FROM pl_plan_scopes WHERE id = ?`,
      [id],
    );
  }

  async create(input: PlanScopeCreate): Promise<PlanScope> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_plan_scopes
         (id, plan_id, title, scope_type, resource_ref, resource_label,
          total_units, completed_units, sort_order, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        input.plan_id,
        input.title,
        input.scope_type ?? 'source',
        input.resource_ref ?? null,
        input.resource_label ?? null,
        input.total_units ?? null,
        input.sort_order ?? 0,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PlanScopePatch): Promise<PlanScope | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.title          !== undefined) { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.scope_type     !== undefined) { sets.push('scope_type = ?');     vals.push(patch.scope_type); }
    if (patch.resource_ref   !== undefined) { sets.push('resource_ref = ?');   vals.push(patch.resource_ref); }
    if (patch.resource_label !== undefined) { sets.push('resource_label = ?'); vals.push(patch.resource_label); }
    if (patch.total_units    !== undefined) { sets.push('total_units = ?');    vals.push(patch.total_units); }
    if (patch.sort_order     !== undefined) { sets.push('sort_order = ?');     vals.push(patch.sort_order); }
    if (patch.meta_json      !== undefined) { sets.push('meta_json = ?');      vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE pl_plan_scopes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  /** Increment completed_units by delta (use negative to decrement). */
  async updateProgress(id: string, completedUnits: number): Promise<PlanScope | null> {
    await execute(
      this.db,
      `UPDATE pl_plan_scopes SET completed_units = ? WHERE id = ?`,
      [completedUnits, id],
    );
    return this.findById(id);
  }
}
