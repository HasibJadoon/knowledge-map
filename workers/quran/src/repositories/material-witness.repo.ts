// ─── MaterialWitnessRepo — Layer 8: Material Witnesses ───────────────────────
// Tables: qr_material_witnesses, qr_material_witness_observations

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Row shapes (aligned to 005_reception_and_projections.sql) ────────────────

export interface MaterialWitness {
  id: string;
  witness_type: string;
  siglum: string | null;
  common_name: string | null;
  location: string | null;
  date_range_ce: string | null;
  dating_method: string | null;
  script_style: string | null;
  rasm_notes: string | null;
  qiraat_notes: string | null;
  digitized_url: string | null;
  cm_document_ref: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialWitnessCreate {
  witness_type: string;
  siglum?: string | null;
  common_name?: string | null;
  location?: string | null;
  date_range_ce?: string | null;
  dating_method?: string | null;
  script_style?: string | null;
  rasm_notes?: string | null;
  qiraat_notes?: string | null;
  digitized_url?: string | null;
  cm_document_ref?: string | null;
  note_md?: string | null;
}

export interface MaterialWitnessPatch {
  witness_type?: string;
  siglum?: string | null;
  common_name?: string | null;
  location?: string | null;
  date_range_ce?: string | null;
  dating_method?: string | null;
  script_style?: string | null;
  rasm_notes?: string | null;
  qiraat_notes?: string | null;
  digitized_url?: string | null;
  cm_document_ref?: string | null;
  note_md?: string | null;
}

export interface WitnessObservation {
  id: string;
  witness_id: string;
  observation_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  observation_text: string;
  source_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface WitnessObservationCreate {
  observation_type: string;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  observation_text: string;
  source_ref?: string | null;
  note_md?: string | null;
}

// ─── Column SELECT constants ───────────────────────────────────────────────────

const MW_COLS = `
  id, witness_type, siglum, common_name, location, date_range_ce,
  dating_method, script_style, rasm_notes, qiraat_notes,
  digitized_url, cm_document_ref, note_md, created_at, updated_at`;

const OBS_COLS = `
  id, witness_id, observation_type, surah, ayah_from, ayah_to,
  observation_text, source_ref, note_md, created_at`;

// ─── MaterialWitnessRepo ──────────────────────────────────────────────────────

export class MaterialWitnessRepo {
  constructor(private db: D1Database) {}

  // ── Material Witnesses ──────────────────────────────────────────────────────

  list(opts: PaginateOptions = {}) {
    return paginate<MaterialWitness>(
      this.db,
      `SELECT ${MW_COLS} FROM qr_material_witnesses ORDER BY witness_type, common_name`,
      `SELECT COUNT(*) AS count FROM qr_material_witnesses`,
      [],
      opts,
    );
  }

  byType(witnessType: string, opts: PaginateOptions = {}) {
    return paginate<MaterialWitness>(
      this.db,
      `SELECT ${MW_COLS}
       FROM qr_material_witnesses
       WHERE witness_type = ?
       ORDER BY date_range_ce, common_name`,
      `SELECT COUNT(*) AS count FROM qr_material_witnesses WHERE witness_type = ?`,
      [witnessType],
      opts,
    );
  }

  findById(id: string): Promise<MaterialWitness | null> {
    return queryOne<MaterialWitness>(
      this.db,
      `SELECT ${MW_COLS} FROM qr_material_witnesses WHERE id = ?`,
      [id],
    );
  }

  findBySlug(siglum: string): Promise<MaterialWitness | null> {
    return queryOne<MaterialWitness>(
      this.db,
      `SELECT ${MW_COLS} FROM qr_material_witnesses WHERE siglum = ? LIMIT 1`,
      [siglum],
    );
  }

  async create(input: MaterialWitnessCreate): Promise<MaterialWitness> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_material_witnesses
         (id, witness_type, siglum, common_name, location, date_range_ce,
          dating_method, script_style, rasm_notes, qiraat_notes,
          digitized_url, cm_document_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.witness_type,
        input.siglum ?? null,
        input.common_name ?? null,
        input.location ?? null,
        input.date_range_ce ?? null,
        input.dating_method ?? null,
        input.script_style ?? null,
        input.rasm_notes ?? null,
        input.qiraat_notes ?? null,
        input.digitized_url ?? null,
        input.cm_document_ref ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: MaterialWitnessPatch): Promise<MaterialWitness | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.witness_type !== undefined)   { sets.push('witness_type = ?');   vals.push(patch.witness_type); }
    if (patch.siglum !== undefined)         { sets.push('siglum = ?');         vals.push(patch.siglum); }
    if (patch.common_name !== undefined)    { sets.push('common_name = ?');    vals.push(patch.common_name); }
    if (patch.location !== undefined)       { sets.push('location = ?');       vals.push(patch.location); }
    if (patch.date_range_ce !== undefined)  { sets.push('date_range_ce = ?');  vals.push(patch.date_range_ce); }
    if (patch.dating_method !== undefined)  { sets.push('dating_method = ?');  vals.push(patch.dating_method); }
    if (patch.script_style !== undefined)   { sets.push('script_style = ?');   vals.push(patch.script_style); }
    if (patch.rasm_notes !== undefined)     { sets.push('rasm_notes = ?');     vals.push(patch.rasm_notes); }
    if (patch.qiraat_notes !== undefined)   { sets.push('qiraat_notes = ?');   vals.push(patch.qiraat_notes); }
    if (patch.digitized_url !== undefined)  { sets.push('digitized_url = ?');  vals.push(patch.digitized_url); }
    if (patch.cm_document_ref !== undefined){ sets.push('cm_document_ref = ?');vals.push(patch.cm_document_ref); }
    if (patch.note_md !== undefined)        { sets.push('note_md = ?');        vals.push(patch.note_md); }

    if (sets.length === 0) return this.findById(id);

    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await execute(this.db, `UPDATE qr_material_witnesses SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  // ── Witness Observations ────────────────────────────────────────────────────

  observations(witnessId: string, opts: PaginateOptions = {}) {
    return paginate<WitnessObservation>(
      this.db,
      `SELECT ${OBS_COLS}
       FROM qr_material_witness_observations
       WHERE witness_id = ?
       ORDER BY observation_type, surah, ayah_from`,
      `SELECT COUNT(*) AS count
       FROM qr_material_witness_observations
       WHERE witness_id = ?`,
      [witnessId],
      opts,
    );
  }

  observationsBySurahRange(
    witnessId: string,
    surah: number,
    ayahFrom?: number,
    ayahTo?: number,
  ): Promise<WitnessObservation[]> {
    const where: string[] = ['witness_id = ?', 'surah = ?'];
    const params: unknown[] = [witnessId, surah];

    if (ayahFrom !== undefined) {
      where.push('ayah_from >= ?');
      params.push(ayahFrom);
    }
    if (ayahTo !== undefined) {
      where.push('ayah_to <= ?');
      params.push(ayahTo);
    }

    return query<WitnessObservation>(
      this.db,
      `SELECT ${OBS_COLS}
       FROM qr_material_witness_observations
       WHERE ${where.join(' AND ')}
       ORDER BY ayah_from, observation_type`,
      params,
    );
  }

  findObservationById(id: string): Promise<WitnessObservation | null> {
    return queryOne<WitnessObservation>(
      this.db,
      `SELECT ${OBS_COLS} FROM qr_material_witness_observations WHERE id = ?`,
      [id],
    );
  }

  async createObservation(
    witnessId: string,
    input: WitnessObservationCreate,
  ): Promise<WitnessObservation> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_material_witness_observations
         (id, witness_id, observation_type, surah, ayah_from, ayah_to,
          observation_text, source_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        witnessId,
        input.observation_type,
        input.surah ?? null,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.observation_text,
        input.source_ref ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findObservationById(id))!;
  }
}
