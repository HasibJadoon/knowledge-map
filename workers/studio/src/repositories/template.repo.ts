// ─── TemplateRepo — st_templates ──────────────────────────────────────────────
// Reusable episode skeletons. Built-in templates are seeded by migration and
// shared across all users (core_user_ref = 'CORE:system'). A user can also save
// their own episode structure as a private template.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export const SYSTEM_REF = 'CORE:system';

export interface TemplateRow {
  id: string;
  core_user_ref: string;
  name: string;
  description: string | null;
  format: string;
  is_builtin: number;
  structure_json: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreate {
  core_user_ref: string;
  name: string;
  description?: string | null;
  format?: string;
  structure_json: string;
}

const COLS = `id, core_user_ref, name, description, format, is_builtin,
              structure_json, created_at, updated_at`;

export class TemplateRepo {
  constructor(private db: D1Database) {}

  /** Built-in templates plus the caller's own private templates, built-ins first. */
  list(userRef: string): Promise<TemplateRow[]> {
    return query<TemplateRow>(
      this.db,
      `SELECT ${COLS} FROM st_templates
       WHERE is_builtin = 1 OR core_user_ref = ?
       ORDER BY is_builtin DESC, created_at ASC`,
      [userRef],
    );
  }

  findById(id: string): Promise<TemplateRow | null> {
    return queryOne<TemplateRow>(
      this.db, `SELECT ${COLS} FROM st_templates WHERE id = ?`, [id],
    );
  }

  async create(input: TemplateCreate): Promise<TemplateRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO st_templates
         (id, core_user_ref, name, description, format, is_builtin,
          structure_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.name,
        input.description ?? null,
        input.format ?? 'podcast',
        input.structure_json,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }
}
