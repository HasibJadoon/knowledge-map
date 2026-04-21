// ─── TemplateRepo — pl_plan_templates ──────────────────────────────────────────
// Reusable plan scaffolds — built-in and user-created templates that can be
// instantiated into new pl_plans with pre-wired scopes and tasks.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface PlanTemplate {
  id: string;               // PL:ULID (or fixed seed ID for built-ins)
  slug: string;             // unique URL-safe identifier e.g. 'quran-30-days'
  title: string;
  plan_type: string;        // 'reading'|'quran'|'arabic'|'worldview_research'|'revision'|'curriculum'|'class'|'sprint'|'personal'|'team'|'other'
  description_md: string | null;
  template_json: string;    // full plan scaffold definition (JSON string)
  is_public: number;        // SQLite INTEGER bool (0/1)
  created_by_ref: string | null; // 'CORE:<user_id>' — null for built-in templates
  created_at: string;
}

export interface PlanTemplateCreate {
  slug: string;
  title: string;
  plan_type?: string;
  description_md?: string | null;
  template_json: string;    // must be valid JSON
  is_public?: boolean;
  created_by_ref?: string | null;
}

export interface PlanTemplatePatch {
  slug?: string;
  title?: string;
  plan_type?: string;
  description_md?: string | null;
  template_json?: string;
  is_public?: boolean;
}

const COLS = `id, slug, title, plan_type, description_md, template_json, is_public, created_by_ref, created_at`;

export class TemplateRepo {
  constructor(private db: D1Database) {}

  /**
   * List templates. By default returns only public templates.
   * Pass createdByRef to include the user's private templates as well.
   */
  list(opts: PaginateOptions & { createdByRef?: string | null; includePrivate?: boolean } = {}) {
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (!opts.includePrivate) {
      if (opts.createdByRef) {
        // public templates OR own private templates
        conds.push('(is_public = 1 OR created_by_ref = ?)');
        params.push(opts.createdByRef);
      } else {
        conds.push('is_public = 1');
      }
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<PlanTemplate>(
      this.db,
      `SELECT ${COLS} FROM pl_plan_templates ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM pl_plan_templates ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<PlanTemplate | null> {
    return queryOne<PlanTemplate>(
      this.db,
      `SELECT ${COLS} FROM pl_plan_templates WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<PlanTemplate | null> {
    return queryOne<PlanTemplate>(
      this.db,
      `SELECT ${COLS} FROM pl_plan_templates WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: PlanTemplateCreate): Promise<PlanTemplate> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_plan_templates
         (id, slug, title, plan_type, description_md, template_json, is_public, created_by_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.plan_type ?? 'reading',
        input.description_md ?? null,
        input.template_json,
        input.is_public ? 1 : 0,
        input.created_by_ref ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PlanTemplatePatch): Promise<PlanTemplate | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.slug           !== undefined) { sets.push('slug = ?');           vals.push(patch.slug); }
    if (patch.title          !== undefined) { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.plan_type      !== undefined) { sets.push('plan_type = ?');      vals.push(patch.plan_type); }
    if (patch.description_md !== undefined) { sets.push('description_md = ?'); vals.push(patch.description_md); }
    if (patch.template_json  !== undefined) { sets.push('template_json = ?');  vals.push(patch.template_json); }
    if (patch.is_public      !== undefined) { sets.push('is_public = ?');      vals.push(patch.is_public ? 1 : 0); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE pl_plan_templates SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
