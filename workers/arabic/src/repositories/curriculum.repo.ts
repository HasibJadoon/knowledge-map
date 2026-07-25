// ─── CurriculumRepo — ar_curriculum + ar_curriculum_unit ─────────────────────
// Formal 3-discipline curriculum trees (nahw, sarf, balagha, combined).
// Units form a tree (parent_id self-ref) and carry AL:ULID concept refs.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Curriculum {
  id: string;
  slug: string;
  title: string;
  discipline: string;         // sarf|nahw|balagha|combined|vocab|reading|other
  level: string | null;       // A1–C2
  track_id: string | null;
  container_id: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface CurriculumCreate {
  slug: string;
  title: string;
  discipline?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

export interface CurriculumUnit {
  id: string;
  curriculum_id: string;
  parent_id: string | null;
  title: string;
  al_concept_ref: string | null;  // AL:<ar_ling_nahw|sarf|balagha_concept_id>
  unit_index: number;
  description_md: string | null;
  examples_json: string | null;   // JSON [{arabic, translation, notes}]
  created_at: string;
}

export interface CurriculumUnitCreate {
  curriculum_id: string;
  parent_id?: string | null;
  title: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
}

export interface CurriculumUnitPatch {
  title?: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const CURR_COLS = `id, slug, title, discipline, level, track_id, container_id,
  description_md, sort_order, created_at`;

const UNIT_COLS = `id, curriculum_id, parent_id, title, al_concept_ref,
  unit_index, description_md, examples_json, created_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class CurriculumRepo {
  constructor(private db: D1Database) {}

  // ── Curricula ────────────────────────────────────────────────────────────────

  list(trackId: string | null = null, opts: PaginateOptions = {}) {
    const where  = trackId ? 'WHERE track_id = ?' : '';
    const params = trackId ? [trackId] : [];
    return paginate<Curriculum>(
      this.db,
      `SELECT ${CURR_COLS} FROM ar_curriculum ${where} ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM ar_curriculum ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Curriculum | null> {
    return queryOne<Curriculum>(
      this.db,
      `SELECT ${CURR_COLS} FROM ar_curriculum WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<Curriculum | null> {
    return queryOne<Curriculum>(
      this.db,
      `SELECT ${CURR_COLS} FROM ar_curriculum WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: CurriculumCreate): Promise<Curriculum> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum
         (id, slug, title, discipline, level, track_id, container_id,
          description_md, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.discipline ?? 'nahw',
        input.level ?? null,
        input.track_id ?? null,
        input.container_id ?? null,
        input.description_md ?? null,
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  // ── Curriculum units ─────────────────────────────────────────────────────────

  /** Top-level units for a curriculum, ordered by unit_index. */
  units(curriculumId: string): Promise<CurriculumUnit[]> {
    return query<CurriculumUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM ar_curriculum_unit
       WHERE curriculum_id = ?
       ORDER BY unit_index`,
      [curriculumId],
    );
  }

  findUnitById(id: string): Promise<CurriculumUnit | null> {
    return queryOne<CurriculumUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM ar_curriculum_unit WHERE id = ?`,
      [id],
    );
  }

  async createUnit(input: CurriculumUnitCreate): Promise<CurriculumUnit> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_unit
         (id, curriculum_id, parent_id, title, al_concept_ref,
          unit_index, description_md, examples_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.curriculum_id,
        input.parent_id ?? null,
        input.title,
        input.al_concept_ref ?? null,
        input.unit_index ?? 0,
        input.description_md ?? null,
        input.examples_json ?? null,
        now,
      ],
    );
    return (await this.findUnitById(id))!;
  }

  async patchUnit(id: string, patch: CurriculumUnitPatch): Promise<CurriculumUnit | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title          !== undefined) { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.al_concept_ref !== undefined) { sets.push('al_concept_ref = ?'); vals.push(patch.al_concept_ref); }
    if (patch.unit_index     !== undefined) { sets.push('unit_index = ?');     vals.push(patch.unit_index); }
    if (patch.description_md !== undefined) { sets.push('description_md = ?'); vals.push(patch.description_md); }
    if (patch.examples_json  !== undefined) { sets.push('examples_json = ?');  vals.push(patch.examples_json); }
    if (!sets.length) return this.findUnitById(id);
    vals.push(id);
    await execute(
      this.db,
      `UPDATE ar_curriculum_unit SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findUnitById(id);
  }
}
