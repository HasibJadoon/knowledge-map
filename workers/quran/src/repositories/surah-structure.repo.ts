// ─── SurahStructureRepo — qr_surah_opening + qr_surah_closure +
//     qr_surah_structural_pivot + qr_surah_structure_unit +
//     qr_surah_structure_link + qr_surah_structure_reading ──────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Row shapes ─────────────────────────────────────────────────────────────────

export interface SurahOpening {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  opening_type: string;
  rhetorical_force: string | null;
  sets_up_md: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahOpeningUpsert {
  ayah_from?: number;
  ayah_to?: number;
  opening_type?: string;
  rhetorical_force?: string | null;
  sets_up_md?: string | null;
  note_md?: string | null;
}

export interface SurahClosure {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  closure_type: string;
  echo_of_opening: number;
  rhetorical_force: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahClosureUpsert {
  ayah_from?: number;
  ayah_to?: number;
  closure_type?: string;
  echo_of_opening?: number;
  rhetorical_force?: string | null;
  note_md?: string | null;
}

export interface SurahStructuralPivot {
  id: string;
  surah: number;
  pivot_index: number;
  ayah: number;
  pivot_type: string;
  description: string;
  note_md: string | null;
  created_at: string;
}

export interface SurahStructuralPivotCreate {
  surah: number;
  ayah: number;
  pivot_type: string;
  description: string;
  note_md?: string | null;
}

export interface SurahStructureUnit {
  id: string;
  surah: number;
  unit_index: number;
  ayah_from: number;
  ayah_to: number;
  unit_role: string;
  label: string | null;
  reading_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahStructureUnitCreate {
  surah: number;
  unit_index: number;
  ayah_from: number;
  ayah_to: number;
  unit_role: string;
  label?: string | null;
  reading_id?: string | null;
  note_md?: string | null;
}

export interface SurahStructureLink {
  id: string;
  surah: number;
  from_unit_id: string;
  to_unit_id: string;
  link_type: string;
  link_evidence: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahStructureLinkCreate {
  surah: number;
  from_unit_id: string;
  to_unit_id: string;
  link_type: string;
  link_evidence?: string | null;
  note_md?: string | null;
}

export interface SurahStructureReading {
  id: string;
  surah: number;
  reading_label: string;
  structure_type: string;
  scholar_ref: string | null;
  paradigm_ref: string | null;
  confidence: string;
  summary_md: string;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurahStructureReadingCreate {
  surah: number;
  reading_label: string;
  structure_type: string;
  scholar_ref?: string | null;
  paradigm_ref?: string | null;
  confidence?: string;
  summary_md: string;
  note_md?: string | null;
}

// ── Repo ───────────────────────────────────────────────────────────────────────

export class SurahStructureRepo {
  constructor(private db: D1Database) {}

  // ── qr_surah_opening ──────────────────────────────────────────────────────

  openings(surahId: number): Promise<SurahOpening | null> {
    return queryOne<SurahOpening>(
      this.db,
      `SELECT surah, ayah_from, ayah_to, opening_type, rhetorical_force,
              sets_up_md, note_md, created_at
       FROM qr_surah_opening
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertOpening(surahId: number, data: SurahOpeningUpsert): Promise<SurahOpening | null> {
    const existing = await this.openings(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_opening
           (surah, ayah_from, ayah_to, opening_type, rhetorical_force, sets_up_md, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.ayah_from ?? 1,
          data.ayah_to ?? 1,
          data.opening_type ?? 'other',
          data.rhetorical_force ?? null,
          data.sets_up_md ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.ayah_from !== undefined)       { sets.push('ayah_from = ?');       vals.push(data.ayah_from); }
      if (data.ayah_to !== undefined)         { sets.push('ayah_to = ?');         vals.push(data.ayah_to); }
      if (data.opening_type !== undefined)    { sets.push('opening_type = ?');    vals.push(data.opening_type); }
      if (data.rhetorical_force !== undefined){ sets.push('rhetorical_force = ?');vals.push(data.rhetorical_force); }
      if (data.sets_up_md !== undefined)      { sets.push('sets_up_md = ?');      vals.push(data.sets_up_md); }
      if (data.note_md !== undefined)         { sets.push('note_md = ?');         vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_opening SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.openings(surahId);
  }

  // ── qr_surah_closure ──────────────────────────────────────────────────────

  closures(surahId: number): Promise<SurahClosure | null> {
    return queryOne<SurahClosure>(
      this.db,
      `SELECT surah, ayah_from, ayah_to, closure_type, echo_of_opening,
              rhetorical_force, note_md, created_at
       FROM qr_surah_closure
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertClosure(surahId: number, data: SurahClosureUpsert): Promise<SurahClosure | null> {
    const existing = await this.closures(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_closure
           (surah, ayah_from, ayah_to, closure_type, echo_of_opening, rhetorical_force, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.ayah_from ?? 1,
          data.ayah_to ?? 1,
          data.closure_type ?? 'other',
          data.echo_of_opening ?? 0,
          data.rhetorical_force ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.ayah_from !== undefined)       { sets.push('ayah_from = ?');       vals.push(data.ayah_from); }
      if (data.ayah_to !== undefined)         { sets.push('ayah_to = ?');         vals.push(data.ayah_to); }
      if (data.closure_type !== undefined)    { sets.push('closure_type = ?');    vals.push(data.closure_type); }
      if (data.echo_of_opening !== undefined) { sets.push('echo_of_opening = ?'); vals.push(data.echo_of_opening); }
      if (data.rhetorical_force !== undefined){ sets.push('rhetorical_force = ?');vals.push(data.rhetorical_force); }
      if (data.note_md !== undefined)         { sets.push('note_md = ?');         vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_closure SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.closures(surahId);
  }

  // ── qr_surah_structural_pivot ─────────────────────────────────────────────

  pivots(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahStructuralPivot>(
      this.db,
      `SELECT id, surah, pivot_index, ayah, pivot_type, description, note_md, created_at
       FROM qr_surah_structural_pivot
       WHERE surah = ?
       ORDER BY pivot_index`,
      `SELECT COUNT(*) AS count FROM qr_surah_structural_pivot WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createPivot(input: SurahStructuralPivotCreate): Promise<SurahStructuralPivot | null> {
    const id = typedId('QR');

    const maxRow = await queryOne<{ max_idx: number | null }>(
      this.db,
      `SELECT MAX(pivot_index) AS max_idx FROM qr_surah_structural_pivot WHERE surah = ?`,
      [input.surah],
    );
    const pivot_index = (maxRow?.max_idx ?? 0) + 1;

    await execute(
      this.db,
      `INSERT INTO qr_surah_structural_pivot
         (id, surah, pivot_index, ayah, pivot_type, description, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.surah, pivot_index, input.ayah, input.pivot_type, input.description, input.note_md ?? null],
    );

    return queryOne<SurahStructuralPivot>(
      this.db,
      `SELECT id, surah, pivot_index, ayah, pivot_type, description, note_md, created_at
       FROM qr_surah_structural_pivot WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_structure_unit ───────────────────────────────────────────────

  structureUnits(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahStructureUnit>(
      this.db,
      `SELECT id, surah, unit_index, ayah_from, ayah_to, unit_role, label, reading_id, note_md, created_at
       FROM qr_surah_structure_unit
       WHERE surah = ?
       ORDER BY unit_index`,
      `SELECT COUNT(*) AS count FROM qr_surah_structure_unit WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  findUnitById(id: string): Promise<SurahStructureUnit | null> {
    return queryOne<SurahStructureUnit>(
      this.db,
      `SELECT id, surah, unit_index, ayah_from, ayah_to, unit_role, label, reading_id, note_md, created_at
       FROM qr_surah_structure_unit
       WHERE id = ?`,
      [id],
    );
  }

  async createUnit(input: SurahStructureUnitCreate): Promise<SurahStructureUnit | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_structure_unit
         (id, surah, unit_index, ayah_from, ayah_to, unit_role, label, reading_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.unit_index,
        input.ayah_from,
        input.ayah_to,
        input.unit_role,
        input.label ?? null,
        input.reading_id ?? null,
        input.note_md ?? null,
      ],
    );

    return this.findUnitById(id);
  }

  // ── qr_surah_structure_link ───────────────────────────────────────────────

  structureLinks(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahStructureLink>(
      this.db,
      `SELECT id, surah, from_unit_id, to_unit_id, link_type, link_evidence, note_md, created_at
       FROM qr_surah_structure_link
       WHERE surah = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_surah_structure_link WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createLink(input: SurahStructureLinkCreate): Promise<SurahStructureLink | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_structure_link
         (id, surah, from_unit_id, to_unit_id, link_type, link_evidence, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.from_unit_id,
        input.to_unit_id,
        input.link_type,
        input.link_evidence ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahStructureLink>(
      this.db,
      `SELECT id, surah, from_unit_id, to_unit_id, link_type, link_evidence, note_md, created_at
       FROM qr_surah_structure_link WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_structure_reading ────────────────────────────────────────────

  readings(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahStructureReading>(
      this.db,
      `SELECT id, surah, reading_label, structure_type, scholar_ref, paradigm_ref,
              confidence, summary_md, note_md, created_at, updated_at
       FROM qr_surah_structure_reading
       WHERE surah = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_surah_structure_reading WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createReading(input: SurahStructureReadingCreate): Promise<SurahStructureReading | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_structure_reading
         (id, surah, reading_label, structure_type, scholar_ref, paradigm_ref,
          confidence, summary_md, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.reading_label,
        input.structure_type,
        input.scholar_ref ?? null,
        input.paradigm_ref ?? null,
        input.confidence ?? 'proposed',
        input.summary_md,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahStructureReading>(
      this.db,
      `SELECT id, surah, reading_label, structure_type, scholar_ref, paradigm_ref,
              confidence, summary_md, note_md, created_at, updated_at
       FROM qr_surah_structure_reading WHERE id = ?`,
      [id],
    );
  }
}
