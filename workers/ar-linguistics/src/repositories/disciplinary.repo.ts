// ─── DisciplinaryRepo — ar_ling_discipline_containers + units + relations ────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DisciplineContainer {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  discipline: string;
  description_md: string | null;
}

export interface DisciplineContainerCreate {
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
  discipline: string;
  description_md?: string | null;
}

export type DisciplineContainerPatch = Partial<
  Omit<DisciplineContainerCreate, 'discipline'>
>;

export interface DisciplineUnit {
  id: string;
  container_id: string;
  parent_unit_id: string | null;
  name_ar: string;
  name_en: string;
  unit_type: string;
  description_md: string | null;
  seq: number;
}

export interface DisciplineUnitCreate {
  container_id: string;
  parent_unit_id?: string | null;
  name_ar: string;
  name_en: string;
  unit_type?: string;
  description_md?: string | null;
  seq?: number;
}

export interface DisciplineRelation {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  relation_type: string;
  note_md: string | null;
}

export interface DisciplineRelationCreate {
  from_unit_id: string;
  to_unit_id: string;
  relation_type: string;
  note_md?: string | null;
}

// ── Repo ─────────────────────────────────────────────────────────────────────

export class DisciplinaryRepo {
  constructor(private db: D1Database) {}

  // ── Containers ─────────────────────────────────────────────────────────────

  containers(opts: PaginateOptions = {}) {
    return paginate<DisciplineContainer>(
      this.db,
      `SELECT id, name_ar, name_en, parent_id, discipline, description_md
       FROM ar_ling_discipline_containers
       ORDER BY discipline, name_en`,
      `SELECT COUNT(*) AS count FROM ar_ling_discipline_containers`,
      [],
      opts,
    );
  }

  containersByDiscipline(discipline: string): Promise<DisciplineContainer[]> {
    return query<DisciplineContainer>(
      this.db,
      `SELECT id, name_ar, name_en, parent_id, discipline, description_md
       FROM ar_ling_discipline_containers
       WHERE discipline = ?
       ORDER BY name_en`,
      [discipline],
    );
  }

  findContainerById(id: string): Promise<DisciplineContainer | null> {
    return queryOne<DisciplineContainer>(
      this.db,
      `SELECT id, name_ar, name_en, parent_id, discipline, description_md
       FROM ar_ling_discipline_containers WHERE id = ?`,
      [id],
    );
  }

  findContainerBySlug(nameEn: string): Promise<DisciplineContainer | null> {
    // Containers have no slug column — match by normalised name_en
    return queryOne<DisciplineContainer>(
      this.db,
      `SELECT id, name_ar, name_en, parent_id, discipline, description_md
       FROM ar_ling_discipline_containers
       WHERE LOWER(name_en) = LOWER(?)`,
      [nameEn],
    );
  }

  async createContainer(
    input: DisciplineContainerCreate,
  ): Promise<DisciplineContainer> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_discipline_containers
         (id, name_ar, name_en, parent_id, discipline, description_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name_ar,
        input.name_en,
        input.parent_id ?? null,
        input.discipline,
        input.description_md ?? null,
      ],
    );
    return (await this.findContainerById(id))!;
  }

  async patchContainer(
    id: string,
    patch: DisciplineContainerPatch,
  ): Promise<DisciplineContainer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.name_ar !== undefined) {
      fields.push('name_ar = ?');
      values.push(patch.name_ar);
    }
    if (patch.name_en !== undefined) {
      fields.push('name_en = ?');
      values.push(patch.name_en);
    }
    if (patch.parent_id !== undefined) {
      fields.push('parent_id = ?');
      values.push(patch.parent_id);
    }
    if (patch.description_md !== undefined) {
      fields.push('description_md = ?');
      values.push(patch.description_md);
    }

    if (fields.length === 0) return this.findContainerById(id);

    values.push(id);
    await execute(
      this.db,
      `UPDATE ar_ling_discipline_containers SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findContainerById(id);
  }

  // ── Units ──────────────────────────────────────────────────────────────────

  units(containerId: string, opts: PaginateOptions = {}) {
    return paginate<DisciplineUnit>(
      this.db,
      `SELECT id, container_id, parent_unit_id, name_ar, name_en,
              unit_type, description_md, seq
       FROM ar_ling_discipline_units
       WHERE container_id = ?
       ORDER BY seq, name_en`,
      `SELECT COUNT(*) AS count FROM ar_ling_discipline_units WHERE container_id = ?`,
      [containerId],
      opts,
    );
  }

  findUnitById(id: string): Promise<DisciplineUnit | null> {
    return queryOne<DisciplineUnit>(
      this.db,
      `SELECT id, container_id, parent_unit_id, name_ar, name_en,
              unit_type, description_md, seq
       FROM ar_ling_discipline_units WHERE id = ?`,
      [id],
    );
  }

  async createUnit(input: DisciplineUnitCreate): Promise<DisciplineUnit> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_discipline_units
         (id, container_id, parent_unit_id, name_ar, name_en,
          unit_type, description_md, seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.container_id,
        input.parent_unit_id ?? null,
        input.name_ar,
        input.name_en,
        input.unit_type ?? 'concept',
        input.description_md ?? null,
        input.seq ?? 0,
      ],
    );
    return (await this.findUnitById(id))!;
  }

  // ── Relations ──────────────────────────────────────────────────────────────

  /** All relations where unitId is from_unit_id or to_unit_id. */
  relations(unitId: string): Promise<DisciplineRelation[]> {
    return query<DisciplineRelation>(
      this.db,
      `SELECT id, from_unit_id, to_unit_id, relation_type, note_md
       FROM ar_ling_discipline_relations
       WHERE from_unit_id = ? OR to_unit_id = ?
       ORDER BY relation_type`,
      [unitId, unitId],
    );
  }

  /** Outbound relations only (from_unit_id = unitId). */
  outboundRelations(unitId: string): Promise<DisciplineRelation[]> {
    return query<DisciplineRelation>(
      this.db,
      `SELECT id, from_unit_id, to_unit_id, relation_type, note_md
       FROM ar_ling_discipline_relations
       WHERE from_unit_id = ?
       ORDER BY relation_type`,
      [unitId],
    );
  }

  async addRelation(
    input: DisciplineRelationCreate,
  ): Promise<DisciplineRelation> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_discipline_relations
         (id, from_unit_id, to_unit_id, relation_type, note_md)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.from_unit_id,
        input.to_unit_id,
        input.relation_type,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<DisciplineRelation>(
      this.db,
      `SELECT id, from_unit_id, to_unit_id, relation_type, note_md
       FROM ar_ling_discipline_relations WHERE id = ?`,
      [id],
    ))!;
  }

  async removeRelation(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_discipline_relations WHERE id = ?`,
      [id],
    );
  }
}
