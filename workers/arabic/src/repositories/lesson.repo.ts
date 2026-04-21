// ─── LessonRepo — ar_lessons ──────────────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Lesson {
  id: string;           // AR:ULID
  container_id: string; // AR:ULID
  title: string;
  lesson_type: string;  // vocabulary | grammar | reading | exercise
  sort_order: number;
  status: string;       // draft | published | archived
  created_at: string;
}

export interface LessonCreate {
  container_id: string;
  title: string;
  lesson_type: string;
  sort_order?: number;
}

const COLS = `id, container_id, title, lesson_type, sort_order, status, created_at`;

export class LessonRepo {
  constructor(private db: D1Database) {}

  byContainer(containerId: string, opts: PaginateOptions = {}) {
    return paginate<Lesson>(
      this.db,
      `SELECT ${COLS} FROM ar_lessons WHERE container_id = ? ORDER BY sort_order`,
      `SELECT COUNT(*) AS count FROM ar_lessons WHERE container_id = ?`,
      [containerId],
      opts,
    );
  }

  findById(id: string): Promise<Lesson | null> {
    return queryOne<Lesson>(
      this.db,
      `SELECT ${COLS} FROM ar_lessons WHERE id = ?`,
      [id],
    );
  }

  async create(input: LessonCreate): Promise<Lesson> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_lessons
         (id, container_id, title, lesson_type, sort_order, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      [id, input.container_id, input.title, input.lesson_type,
       input.sort_order ?? 0, now],
    );
    return (await this.findById(id))!;
  }

  async publish(id: string): Promise<Lesson | null> {
    await execute(
      this.db, `UPDATE ar_lessons SET status = 'published' WHERE id = ?`, [id],
    );
    return this.findById(id);
  }
}
