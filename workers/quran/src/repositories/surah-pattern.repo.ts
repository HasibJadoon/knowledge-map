// ─── SurahPatternRepo — qr_surah_symmetry_pattern + qr_surah_diamond_pattern +
//     qr_surah_sequence_pattern + qr_surah_motif_cluster +
//     qr_surah_coherence_signal + qr_surah_clause_pattern +
//     qr_surah_register_shift + qr_surah_ellipsis_pattern ──────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Row shapes ─────────────────────────────────────────────────────────────────

export interface SurahSymmetryPattern {
  id: string;
  surah: number;
  structure_reading_id: string | null;
  pattern_type: string;
  center_ayah_from: number | null;
  center_ayah_to: number | null;
  pattern_notation: string | null;
  pairs_json: string | null;
  summary_md: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahSymmetryPatternCreate {
  surah: number;
  structure_reading_id?: string | null;
  pattern_type: string;
  center_ayah_from?: number | null;
  center_ayah_to?: number | null;
  pattern_notation?: string | null;
  pairs_json?: string | null;
  summary_md?: string | null;
  note_md?: string | null;
}

export interface SurahDiamondPattern {
  id: string;
  surah: number;
  structure_reading_id: string | null;
  pattern_type: string;
  top_section_from: number | null;
  top_section_to: number | null;
  center_from: number | null;
  center_to: number | null;
  bottom_section_from: number | null;
  bottom_section_to: number | null;
  balance_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahDiamondPatternCreate {
  surah: number;
  structure_reading_id?: string | null;
  pattern_type?: string;
  top_section_from?: number | null;
  top_section_to?: number | null;
  center_from?: number | null;
  center_to?: number | null;
  bottom_section_from?: number | null;
  bottom_section_to?: number | null;
  balance_note?: string | null;
  note_md?: string | null;
}

export interface SurahSequencePattern {
  id: string;
  surah: number;
  sequence_type: string;
  stages_json: string;
  description: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahSequencePatternCreate {
  surah: number;
  sequence_type: string;
  stages_json: string;
  description?: string | null;
  note_md?: string | null;
}

export interface SurahMotifCluster {
  id: string;
  surah: number;
  cluster_label: string;
  cluster_label_ar: string | null;
  motif_keys: string;
  ayah_range_json: string | null;
  semantic_role: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahMotifClusterCreate {
  surah: number;
  cluster_label: string;
  cluster_label_ar?: string | null;
  motif_keys: string;
  ayah_range_json?: string | null;
  semantic_role?: string | null;
  note_md?: string | null;
}

export interface SurahCoherenceSignal {
  id: string;
  surah: number;
  signal_type: string;
  description: string;
  ayahs_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahCoherenceSignalCreate {
  surah: number;
  signal_type: string;
  description: string;
  ayahs_json?: string | null;
  note_md?: string | null;
}

export interface SurahClausePatterns {
  surah: number;
  dominant_clause_type: string | null;
  nominal_clause_pct: number | null;
  verbal_clause_pct: number | null;
  conditional_count: number;
  oath_count: number;
  interrogative_count: number;
  dominant_mood: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurahClausePatternsUpsert {
  dominant_clause_type?: string | null;
  nominal_clause_pct?: number | null;
  verbal_clause_pct?: number | null;
  conditional_count?: number;
  oath_count?: number;
  interrogative_count?: number;
  dominant_mood?: string | null;
  note_md?: string | null;
}

export interface SurahRegisterShift {
  id: string;
  surah: number;
  ayah_shift: number;
  shift_axis: string;
  from_state: string | null;
  to_state: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahRegisterShiftCreate {
  surah: number;
  ayah_shift: number;
  shift_axis: string;
  from_state?: string | null;
  to_state?: string | null;
  note_md?: string | null;
}

export interface SurahEllipsisPatterns {
  surah: number;
  dominant_ellipsis_type: string | null;
  total_ellipsis_count: number;
  typical_effect: string | null;
  notable_instances: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahEllipsisPatternsUpsert {
  dominant_ellipsis_type?: string | null;
  total_ellipsis_count?: number;
  typical_effect?: string | null;
  notable_instances?: string | null;
  note_md?: string | null;
}

// ── Repo ───────────────────────────────────────────────────────────────────────

export class SurahPatternRepo {
  constructor(private db: D1Database) {}

  // ── qr_surah_symmetry_pattern ─────────────────────────────────────────────

  symmetryPatterns(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahSymmetryPattern>(
      this.db,
      `SELECT id, surah, structure_reading_id, pattern_type, center_ayah_from, center_ayah_to,
              pattern_notation, pairs_json, summary_md, note_md, created_at
       FROM qr_surah_symmetry_pattern
       WHERE surah = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_surah_symmetry_pattern WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createSymmetry(input: SurahSymmetryPatternCreate): Promise<SurahSymmetryPattern | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_symmetry_pattern
         (id, surah, structure_reading_id, pattern_type, center_ayah_from, center_ayah_to,
          pattern_notation, pairs_json, summary_md, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.structure_reading_id ?? null,
        input.pattern_type,
        input.center_ayah_from ?? null,
        input.center_ayah_to ?? null,
        input.pattern_notation ?? null,
        input.pairs_json ?? null,
        input.summary_md ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahSymmetryPattern>(
      this.db,
      `SELECT id, surah, structure_reading_id, pattern_type, center_ayah_from, center_ayah_to,
              pattern_notation, pairs_json, summary_md, note_md, created_at
       FROM qr_surah_symmetry_pattern WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_diamond_pattern ──────────────────────────────────────────────

  diamondPatterns(surahId: number): Promise<SurahDiamondPattern[]> {
    return query<SurahDiamondPattern>(
      this.db,
      `SELECT id, surah, structure_reading_id, pattern_type,
              top_section_from, top_section_to, center_from, center_to,
              bottom_section_from, bottom_section_to, balance_note, note_md, created_at
       FROM qr_surah_diamond_pattern
       WHERE surah = ?
       ORDER BY created_at`,
      [surahId],
    );
  }

  async createDiamond(input: SurahDiamondPatternCreate): Promise<SurahDiamondPattern | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_diamond_pattern
         (id, surah, structure_reading_id, pattern_type, top_section_from, top_section_to,
          center_from, center_to, bottom_section_from, bottom_section_to, balance_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.structure_reading_id ?? null,
        input.pattern_type ?? 'diamond',
        input.top_section_from ?? null,
        input.top_section_to ?? null,
        input.center_from ?? null,
        input.center_to ?? null,
        input.bottom_section_from ?? null,
        input.bottom_section_to ?? null,
        input.balance_note ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahDiamondPattern>(
      this.db,
      `SELECT id, surah, structure_reading_id, pattern_type,
              top_section_from, top_section_to, center_from, center_to,
              bottom_section_from, bottom_section_to, balance_note, note_md, created_at
       FROM qr_surah_diamond_pattern WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_sequence_pattern ─────────────────────────────────────────────

  sequencePatterns(surahId: number): Promise<SurahSequencePattern[]> {
    return query<SurahSequencePattern>(
      this.db,
      `SELECT id, surah, sequence_type, stages_json, description, note_md, created_at
       FROM qr_surah_sequence_pattern
       WHERE surah = ?
       ORDER BY created_at`,
      [surahId],
    );
  }

  async createSequence(input: SurahSequencePatternCreate): Promise<SurahSequencePattern | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_sequence_pattern
         (id, surah, sequence_type, stages_json, description, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.sequence_type,
        input.stages_json,
        input.description ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahSequencePattern>(
      this.db,
      `SELECT id, surah, sequence_type, stages_json, description, note_md, created_at
       FROM qr_surah_sequence_pattern WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_motif_cluster ────────────────────────────────────────────────

  motifClusters(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahMotifCluster>(
      this.db,
      `SELECT id, surah, cluster_label, cluster_label_ar, motif_keys,
              ayah_range_json, semantic_role, note_md, created_at
       FROM qr_surah_motif_cluster
       WHERE surah = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_surah_motif_cluster WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createMotifCluster(input: SurahMotifClusterCreate): Promise<SurahMotifCluster | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_motif_cluster
         (id, surah, cluster_label, cluster_label_ar, motif_keys, ayah_range_json, semantic_role, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.cluster_label,
        input.cluster_label_ar ?? null,
        input.motif_keys,
        input.ayah_range_json ?? null,
        input.semantic_role ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahMotifCluster>(
      this.db,
      `SELECT id, surah, cluster_label, cluster_label_ar, motif_keys,
              ayah_range_json, semantic_role, note_md, created_at
       FROM qr_surah_motif_cluster WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_coherence_signal ─────────────────────────────────────────────

  coherenceSignals(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahCoherenceSignal>(
      this.db,
      `SELECT id, surah, signal_type, description, ayahs_json, note_md, created_at
       FROM qr_surah_coherence_signal
       WHERE surah = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_surah_coherence_signal WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createCoherenceSignal(input: SurahCoherenceSignalCreate): Promise<SurahCoherenceSignal | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_coherence_signal
         (id, surah, signal_type, description, ayahs_json, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.signal_type,
        input.description,
        input.ayahs_json ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahCoherenceSignal>(
      this.db,
      `SELECT id, surah, signal_type, description, ayahs_json, note_md, created_at
       FROM qr_surah_coherence_signal WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_clause_pattern (surah-level rollup) ──────────────────────────

  clausePatterns(surahId: number): Promise<SurahClausePatterns | null> {
    return queryOne<SurahClausePatterns>(
      this.db,
      `SELECT surah, dominant_clause_type, nominal_clause_pct, verbal_clause_pct,
              conditional_count, oath_count, interrogative_count, dominant_mood,
              note_md, created_at, updated_at
       FROM qr_surah_clause_pattern
       WHERE surah = ?`,
      [surahId],
    );
  }

  async createClausePattern(surahId: number, data: SurahClausePatternsUpsert): Promise<SurahClausePatterns | null> {
    const existing = await this.clausePatterns(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_clause_pattern
           (surah, dominant_clause_type, nominal_clause_pct, verbal_clause_pct,
            conditional_count, oath_count, interrogative_count, dominant_mood, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.dominant_clause_type ?? null,
          data.nominal_clause_pct ?? null,
          data.verbal_clause_pct ?? null,
          data.conditional_count ?? 0,
          data.oath_count ?? 0,
          data.interrogative_count ?? 0,
          data.dominant_mood ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const vals: unknown[] = [];

      if (data.dominant_clause_type !== undefined) { sets.push('dominant_clause_type = ?'); vals.push(data.dominant_clause_type); }
      if (data.nominal_clause_pct !== undefined)   { sets.push('nominal_clause_pct = ?');   vals.push(data.nominal_clause_pct); }
      if (data.verbal_clause_pct !== undefined)    { sets.push('verbal_clause_pct = ?');    vals.push(data.verbal_clause_pct); }
      if (data.conditional_count !== undefined)    { sets.push('conditional_count = ?');    vals.push(data.conditional_count); }
      if (data.oath_count !== undefined)           { sets.push('oath_count = ?');           vals.push(data.oath_count); }
      if (data.interrogative_count !== undefined)  { sets.push('interrogative_count = ?');  vals.push(data.interrogative_count); }
      if (data.dominant_mood !== undefined)        { sets.push('dominant_mood = ?');        vals.push(data.dominant_mood); }
      if (data.note_md !== undefined)              { sets.push('note_md = ?');              vals.push(data.note_md); }

      vals.push(surahId);
      await execute(this.db, `UPDATE qr_surah_clause_pattern SET ${sets.join(', ')} WHERE surah = ?`, vals);
    }

    return this.clausePatterns(surahId);
  }

  // ── qr_surah_register_shift ───────────────────────────────────────────────

  registerShifts(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahRegisterShift>(
      this.db,
      `SELECT id, surah, ayah_shift, shift_axis, from_state, to_state, note_md, created_at
       FROM qr_surah_register_shift
       WHERE surah = ?
       ORDER BY ayah_shift`,
      `SELECT COUNT(*) AS count FROM qr_surah_register_shift WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createRegisterShift(input: SurahRegisterShiftCreate): Promise<SurahRegisterShift | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_surah_register_shift
         (id, surah, ayah_shift, shift_axis, from_state, to_state, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.ayah_shift,
        input.shift_axis,
        input.from_state ?? null,
        input.to_state ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahRegisterShift>(
      this.db,
      `SELECT id, surah, ayah_shift, shift_axis, from_state, to_state, note_md, created_at
       FROM qr_surah_register_shift WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_ellipsis_pattern (surah-level rollup) ────────────────────────

  ellipsisPatterns(surahId: number): Promise<SurahEllipsisPatterns | null> {
    return queryOne<SurahEllipsisPatterns>(
      this.db,
      `SELECT surah, dominant_ellipsis_type, total_ellipsis_count, typical_effect,
              notable_instances, note_md, created_at
       FROM qr_surah_ellipsis_pattern
       WHERE surah = ?`,
      [surahId],
    );
  }

  async createEllipsisPattern(surahId: number, data: SurahEllipsisPatternsUpsert): Promise<SurahEllipsisPatterns | null> {
    const existing = await this.ellipsisPatterns(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_ellipsis_pattern
           (surah, dominant_ellipsis_type, total_ellipsis_count, typical_effect,
            notable_instances, note_md)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.dominant_ellipsis_type ?? null,
          data.total_ellipsis_count ?? 0,
          data.typical_effect ?? null,
          data.notable_instances ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.dominant_ellipsis_type !== undefined) { sets.push('dominant_ellipsis_type = ?'); vals.push(data.dominant_ellipsis_type); }
      if (data.total_ellipsis_count !== undefined)   { sets.push('total_ellipsis_count = ?');   vals.push(data.total_ellipsis_count); }
      if (data.typical_effect !== undefined)         { sets.push('typical_effect = ?');         vals.push(data.typical_effect); }
      if (data.notable_instances !== undefined)      { sets.push('notable_instances = ?');      vals.push(data.notable_instances); }
      if (data.note_md !== undefined)                { sets.push('note_md = ?');                vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_ellipsis_pattern SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.ellipsisPatterns(surahId);
  }
}
