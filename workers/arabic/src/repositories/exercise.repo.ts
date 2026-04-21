// ─── ExerciseRepo — ar_exercises ──────────────────────────────────────────────
// Practice exercises tied to lessons. Prompt/answer pairs with type-specific
// payload. No linguistic truth stored here — linked via AL:ULID refs.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Exercise {
  id: string;               // AR:ULID
  lesson_id: string;        // AR:ULID
  exercise_type: string;    // flashcard | fill-blank | mcq | translation | parsing
  prompt: string;
  answer: string | null;
  options_json: string | null; // JSON array of MCQ choices
  sort_order: number;
  status: string;
  created_at: string;
}

export interface ExerciseCreate {
  lesson_id: string;
  exercise_type: string;
  prompt: string;
  answer?: string | null;
  options_json?: string | null;
  sort_order?: number;
}

const COLS = `id, lesson_id, exercise_type, prompt, answer,
              options_json, sort_order, status, created_at`;

export class ExerciseRepo {
  constructor(private db: D1Database) {}

  byLesson(lessonId: string, opts: PaginateOptions = {}) {
    return paginate<Exercise>(
      this.db,
      `SELECT ${COLS} FROM ar_exercises WHERE lesson_id = ? ORDER BY sort_order`,
      `SELECT COUNT(*) AS count FROM ar_exercises WHERE lesson_id = ?`,
      [lessonId],
      opts,
    );
  }

  findById(id: string): Promise<Exercise | null> {
    return queryOne<Exercise>(
      this.db, `SELECT ${COLS} FROM ar_exercises WHERE id = ?`, [id],
    );
  }

  /** Random sample for a practice session. */
  sample(lessonId: string, limit = 10): Promise<Exercise[]> {
    return query<Exercise>(
      this.db,
      `SELECT ${COLS} FROM ar_exercises
       WHERE lesson_id = ? AND status = 'active'
       ORDER BY RANDOM() LIMIT ?`,
      [lessonId, limit],
    );
  }

  async create(input: ExerciseCreate): Promise<Exercise> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_exercises
         (id, lesson_id, exercise_type, prompt, answer, options_json, sort_order, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [id, input.lesson_id, input.exercise_type, input.prompt,
       input.answer ?? null, input.options_json ?? null,
       input.sort_order ?? 0, now],
    );
    return (await this.findById(id))!;
  }
}
