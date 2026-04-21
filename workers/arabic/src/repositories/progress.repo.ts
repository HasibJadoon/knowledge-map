// ─── ProgressRepo — ar_task_completions + ar_unit_progress + ar_mastery_profiles
// Learner telemetry: task-level completions, unit-level progress state,
// and per-skill mastery scores per track.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface TaskCompletion {
  id: string;
  task_id: string;
  core_user_ref: string;
  completed_at: string;
  time_spent_mins: number | null;
  notes: string | null;
}

export interface UnitProgress {
  id: string;
  unit_id: string;
  core_user_ref: string;
  status: string;             // not_started|in_progress|completed|revisiting
  progress_pct: number;       // 0–100
  last_activity_at: string | null;
  completed_at: string | null;
  meta_json: string | null;
}

export interface UnitProgressInput {
  unit_id: string;
  core_user_ref: string;
  status?: string;
  progress_pct?: number;
  last_activity_at?: string | null;
  completed_at?: string | null;
  meta_json?: string | null;
}

export interface MasteryProfile {
  id: string;
  core_user_ref: string;
  track_id: string | null;
  skill: string;              // sarf|nahw|balagha|vocab_size|reading|listening|other
  mastery_score: number;      // 0–1
  items_mastered: number;
  items_learning: number;
  last_assessed_at: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasteryInput {
  core_user_ref: string;
  track_id: string | null;
  skill: string;
  mastery_score: number;
  items_mastered?: number;
  items_learning?: number;
  last_assessed_at?: string | null;
  meta_json?: string | null;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const TC_COLS = `id, task_id, core_user_ref, completed_at, time_spent_mins, notes`;

const UP_COLS = `id, unit_id, core_user_ref, status, progress_pct,
  last_activity_at, completed_at, meta_json`;

const MP_COLS = `id, core_user_ref, track_id, skill, mastery_score,
  items_mastered, items_learning, last_assessed_at, meta_json,
  created_at, updated_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ProgressRepo {
  constructor(private db: D1Database) {}

  // ── Task completions ─────────────────────────────────────────────────────────

  /** Record (or update) a task completion. Uses INSERT OR REPLACE on (task_id, core_user_ref). */
  async completeTask(
    taskId: string,
    userRef: string,
    timeMins: number,
    notes?: string,
  ): Promise<TaskCompletion> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    // Attempt upsert: unique constraint on (task_id, core_user_ref)
    const existing = await queryOne<TaskCompletion>(
      this.db,
      `SELECT ${TC_COLS} FROM ar_task_completions WHERE task_id = ? AND core_user_ref = ?`,
      [taskId, userRef],
    );
    if (existing) {
      await execute(
        this.db,
        `UPDATE ar_task_completions
         SET completed_at = ?, time_spent_mins = ?, notes = ?
         WHERE task_id = ? AND core_user_ref = ?`,
        [now, timeMins, notes ?? null, taskId, userRef],
      );
    } else {
      await execute(
        this.db,
        `INSERT INTO ar_task_completions
           (id, task_id, core_user_ref, completed_at, time_spent_mins, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, taskId, userRef, now, timeMins, notes ?? null],
      );
    }
    return (await queryOne<TaskCompletion>(
      this.db,
      `SELECT ${TC_COLS} FROM ar_task_completions WHERE task_id = ? AND core_user_ref = ?`,
      [taskId, userRef],
    ))!;
  }

  taskCompletions(taskId: string): Promise<TaskCompletion[]> {
    return query<TaskCompletion>(
      this.db,
      `SELECT ${TC_COLS} FROM ar_task_completions
       WHERE task_id = ? ORDER BY completed_at DESC`,
      [taskId],
    );
  }

  // ── Unit progress ────────────────────────────────────────────────────────────

  unitProgress(userRef: string, unitId: string): Promise<UnitProgress | null> {
    return queryOne<UnitProgress>(
      this.db,
      `SELECT ${UP_COLS} FROM ar_unit_progress
       WHERE core_user_ref = ? AND unit_id = ?`,
      [userRef, unitId],
    );
  }

  async upsertUnitProgress(input: UnitProgressInput): Promise<UnitProgress> {
    const now = new Date().toISOString();
    const existing = await this.unitProgress(input.core_user_ref, input.unit_id);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (input.status           !== undefined) { sets.push('status = ?');           vals.push(input.status); }
      if (input.progress_pct     !== undefined) { sets.push('progress_pct = ?');     vals.push(input.progress_pct); }
      if (input.last_activity_at !== undefined) { sets.push('last_activity_at = ?'); vals.push(input.last_activity_at); }
      if (input.completed_at     !== undefined) { sets.push('completed_at = ?');     vals.push(input.completed_at); }
      if (input.meta_json        !== undefined) { sets.push('meta_json = ?');        vals.push(input.meta_json); }
      if (sets.length) {
        vals.push(existing.id);
        await execute(
          this.db,
          `UPDATE ar_unit_progress SET ${sets.join(', ')} WHERE id = ?`,
          vals,
        );
      }
    } else {
      const id = typedId('AR');
      await execute(
        this.db,
        `INSERT INTO ar_unit_progress
           (id, unit_id, core_user_ref, status, progress_pct,
            last_activity_at, completed_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.unit_id,
          input.core_user_ref,
          input.status ?? 'not_started',
          input.progress_pct ?? 0,
          input.last_activity_at ?? now,
          input.completed_at ?? null,
          input.meta_json ?? null,
        ],
      );
    }
    return (await this.unitProgress(input.core_user_ref, input.unit_id))!;
  }

  // ── Mastery profiles ─────────────────────────────────────────────────────────

  masteryProfile(
    userRef: string,
    trackId: string | null,
    skill: string,
  ): Promise<MasteryProfile | null> {
    if (trackId) {
      return queryOne<MasteryProfile>(
        this.db,
        `SELECT ${MP_COLS} FROM ar_mastery_profiles
         WHERE core_user_ref = ? AND track_id = ? AND skill = ?`,
        [userRef, trackId, skill],
      );
    }
    return queryOne<MasteryProfile>(
      this.db,
      `SELECT ${MP_COLS} FROM ar_mastery_profiles
       WHERE core_user_ref = ? AND track_id IS NULL AND skill = ?`,
      [userRef, skill],
    );
  }

  async upsertMastery(input: MasteryInput): Promise<MasteryProfile> {
    const now = new Date().toISOString();
    const existing = await this.masteryProfile(
      input.core_user_ref,
      input.track_id,
      input.skill,
    );
    if (existing) {
      await execute(
        this.db,
        `UPDATE ar_mastery_profiles
         SET mastery_score = ?, items_mastered = ?, items_learning = ?,
             last_assessed_at = ?, meta_json = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.mastery_score,
          input.items_mastered ?? existing.items_mastered,
          input.items_learning ?? existing.items_learning,
          input.last_assessed_at ?? now,
          input.meta_json ?? existing.meta_json,
          now,
          existing.id,
        ],
      );
    } else {
      const id = typedId('AR');
      await execute(
        this.db,
        `INSERT INTO ar_mastery_profiles
           (id, core_user_ref, track_id, skill, mastery_score,
            items_mastered, items_learning, last_assessed_at,
            meta_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.core_user_ref,
          input.track_id,
          input.skill,
          input.mastery_score,
          input.items_mastered ?? 0,
          input.items_learning ?? 0,
          input.last_assessed_at ?? now,
          input.meta_json ?? null,
          now,
          now,
        ],
      );
    }
    return (await this.masteryProfile(
      input.core_user_ref,
      input.track_id,
      input.skill,
    ))!;
  }
}
