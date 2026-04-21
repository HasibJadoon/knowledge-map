// ─── ReviewCycleRepo — pl_review_cycles + pl_review_events ──────────────────────
// Scheduled review loops (periodic, milestone, class round, sprint retro) and
// the individual submission / feedback events within each cycle.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── pl_review_cycles ──────────────────────────────────────────────────────────

export interface ReviewCycle {
  id: string;               // PL:ULID
  plan_id: string;          // PL:ULID
  packet_id: string | null; // PL:ULID — optional packet scope
  title: string;
  cycle_type: string;       // 'periodic'|'milestone'|'submission'|'class_round'|'sprint_retro'|'other'
  cadence: string | null;   // 'daily'|'weekly'|'monthly'|'custom'
  cadence_days: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;           // 'pending'|'active'|'complete'|'cancelled'
  meta_json: string | null;
  created_at: string;
}

export interface ReviewCycleCreate {
  plan_id: string;
  packet_id?: string | null;
  title: string;
  cycle_type?: string;
  cadence?: string | null;
  cadence_days?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  meta_json?: string | null;
}

export interface ReviewCyclePatch {
  title?: string;
  cycle_type?: string;
  cadence?: string | null;
  cadence_days?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string;
  meta_json?: string | null;
}

// ── pl_review_events ──────────────────────────────────────────────────────────

export interface ReviewEvent {
  id: string;                   // PL:ULID
  cycle_id: string;             // PL:ULID
  reviewer_ref: string | null;  // 'CORE:<user_id>'
  reviewee_ref: string | null;  // 'CORE:<user_id>'
  event_type: string;           // 'submission'|'feedback'|'approval'|'rejection'|'revision'|'final'
  notes_md: string | null;
  score: number | null;
  status: string;               // 'pending'|'complete'|'cancelled'
  due_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ReviewEventCreate {
  reviewer_ref?: string | null;
  reviewee_ref?: string | null;
  event_type?: string;
  notes_md?: string | null;
  score?: number | null;
  due_at?: string | null;
}

const CYCLE_COLS = `id, plan_id, packet_id, title, cycle_type, cadence, cadence_days,
                    starts_at, ends_at, status, meta_json, created_at`;
const EVENT_COLS = `id, cycle_id, reviewer_ref, reviewee_ref, event_type, notes_md,
                    score, status, due_at, resolved_at, created_at`;

export class ReviewCycleRepo {
  constructor(private db: D1Database) {}

  // ── Cycles ────────────────────────────────────────────────────────────────

  list(planId: string, opts: PaginateOptions = {}) {
    return paginate<ReviewCycle>(
      this.db,
      `SELECT ${CYCLE_COLS} FROM pl_review_cycles WHERE plan_id = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_review_cycles WHERE plan_id = ?`,
      [planId],
      opts,
    );
  }

  findById(id: string): Promise<ReviewCycle | null> {
    return queryOne<ReviewCycle>(
      this.db,
      `SELECT ${CYCLE_COLS} FROM pl_review_cycles WHERE id = ?`,
      [id],
    );
  }

  async create(input: ReviewCycleCreate): Promise<ReviewCycle> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_review_cycles
         (id, plan_id, packet_id, title, cycle_type, cadence, cadence_days,
          starts_at, ends_at, status, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        id,
        input.plan_id,
        input.packet_id ?? null,
        input.title,
        input.cycle_type ?? 'periodic',
        input.cadence ?? null,
        input.cadence_days ?? null,
        input.starts_at ?? null,
        input.ends_at ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: ReviewCyclePatch): Promise<ReviewCycle | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.title        !== undefined) { sets.push('title = ?');        vals.push(patch.title); }
    if (patch.cycle_type   !== undefined) { sets.push('cycle_type = ?');   vals.push(patch.cycle_type); }
    if (patch.cadence      !== undefined) { sets.push('cadence = ?');      vals.push(patch.cadence); }
    if (patch.cadence_days !== undefined) { sets.push('cadence_days = ?'); vals.push(patch.cadence_days); }
    if (patch.starts_at    !== undefined) { sets.push('starts_at = ?');    vals.push(patch.starts_at); }
    if (patch.ends_at      !== undefined) { sets.push('ends_at = ?');      vals.push(patch.ends_at); }
    if (patch.status       !== undefined) { sets.push('status = ?');       vals.push(patch.status); }
    if (patch.meta_json    !== undefined) { sets.push('meta_json = ?');    vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE pl_review_cycles SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  events(cycleId: string, opts: PaginateOptions = {}) {
    return paginate<ReviewEvent>(
      this.db,
      `SELECT ${EVENT_COLS} FROM pl_review_events WHERE cycle_id = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_review_events WHERE cycle_id = ?`,
      [cycleId],
      opts,
    );
  }

  async createEvent(cycleId: string, input: ReviewEventCreate): Promise<ReviewEvent> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_review_events
         (id, cycle_id, reviewer_ref, reviewee_ref, event_type, notes_md,
          score, status, due_at, resolved_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`,
      [
        id,
        cycleId,
        input.reviewer_ref ?? null,
        input.reviewee_ref ?? null,
        input.event_type ?? 'submission',
        input.notes_md ?? null,
        input.score ?? null,
        input.due_at ?? null,
        now,
      ],
    );
    return (await queryOne<ReviewEvent>(
      this.db,
      `SELECT ${EVENT_COLS} FROM pl_review_events WHERE id = ?`,
      [id],
    ))!;
  }

  async updateEventStatus(eventId: string, status: string, score?: number | null): Promise<ReviewEvent | null> {
    const sets: string[]   = ['status = ?'];
    const vals: unknown[]  = [status];
    if (status === 'complete' || status === 'cancelled') {
      sets.push('resolved_at = ?');
      vals.push(new Date().toISOString());
    }
    if (score !== undefined) {
      sets.push('score = ?');
      vals.push(score);
    }
    vals.push(eventId);
    await execute(
      this.db,
      `UPDATE pl_review_events SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return queryOne<ReviewEvent>(
      this.db,
      `SELECT ${EVENT_COLS} FROM pl_review_events WHERE id = ?`,
      [eventId],
    );
  }
}
