// ─── SurahProfileRepo — qr_surah_profiles + qr_surah_atomic_profiles + qr_surah_ayah_meta ─

import { query, queryOne, execute } from '../../../shared/src/db';

// ── Row shapes ─────────────────────────────────────────────────────────────────

export interface SurahProfile {
  surah: number;
  governing_movement: string | null;
  central_claim: string | null;
  opening_force: string | null;
  closure_force: string | null;
  dominant_addressee: string | null;
  dominant_tone: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurahProfileUpsert {
  governing_movement?: string | null;
  central_claim?: string | null;
  opening_force?: string | null;
  closure_force?: string | null;
  dominant_addressee?: string | null;
  dominant_tone?: string | null;
  note_md?: string | null;
}

export interface SurahAtomicProfile {
  surah: number;
  atomic_center: string;
  atomic_center_ar: string | null;
  structural_type: string;
  structural_type_note: string | null;
  resolution_pattern: string | null;
  interpretive_lens: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurahAtomicProfileUpsert {
  atomic_center?: string;
  atomic_center_ar?: string | null;
  structural_type?: string;
  structural_type_note?: string | null;
  resolution_pattern?: string | null;
  interpretive_lens?: string | null;
  note_md?: string | null;
}

export interface SurahAyahMeta {
  surah: number;
  ayah: number;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
  manzil: number | null;
  sajda: number;
}

export interface SurahAyahMetaUpsert {
  juz?: number | null;
  hizb?: number | null;
  ruku?: number | null;
  manzil?: number | null;
  sajda?: number;
}

// ── Repo ───────────────────────────────────────────────────────────────────────

export class SurahProfileRepo {
  constructor(private db: D1Database) {}

  // ── qr_surah_profiles ──────────────────────────────────────────────────────

  findBySurah(surahId: number): Promise<SurahProfile | null> {
    return queryOne<SurahProfile>(
      this.db,
      `SELECT surah, governing_movement, central_claim, opening_force, closure_force,
              dominant_addressee, dominant_tone, note_md, created_at, updated_at
       FROM qr_surah_profiles
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertProfile(surahId: number, data: SurahProfileUpsert): Promise<SurahProfile | null> {
    const existing = await this.findBySurah(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_profiles
           (surah, governing_movement, central_claim, opening_force, closure_force,
            dominant_addressee, dominant_tone, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.governing_movement ?? null,
          data.central_claim ?? null,
          data.opening_force ?? null,
          data.closure_force ?? null,
          data.dominant_addressee ?? null,
          data.dominant_tone ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const vals: unknown[] = [];

      if (data.governing_movement !== undefined) { sets.push('governing_movement = ?'); vals.push(data.governing_movement); }
      if (data.central_claim !== undefined)      { sets.push('central_claim = ?');      vals.push(data.central_claim); }
      if (data.opening_force !== undefined)      { sets.push('opening_force = ?');      vals.push(data.opening_force); }
      if (data.closure_force !== undefined)      { sets.push('closure_force = ?');      vals.push(data.closure_force); }
      if (data.dominant_addressee !== undefined) { sets.push('dominant_addressee = ?'); vals.push(data.dominant_addressee); }
      if (data.dominant_tone !== undefined)      { sets.push('dominant_tone = ?');      vals.push(data.dominant_tone); }
      if (data.note_md !== undefined)            { sets.push('note_md = ?');            vals.push(data.note_md); }

      vals.push(surahId);
      await execute(this.db, `UPDATE qr_surah_profiles SET ${sets.join(', ')} WHERE surah = ?`, vals);
    }

    return this.findBySurah(surahId);
  }

  // ── qr_surah_atomic_profiles ───────────────────────────────────────────────

  findAtomicBySurah(surahId: number): Promise<SurahAtomicProfile | null> {
    return queryOne<SurahAtomicProfile>(
      this.db,
      `SELECT surah, atomic_center, atomic_center_ar, structural_type, structural_type_note,
              resolution_pattern, interpretive_lens, note_md, created_at, updated_at
       FROM qr_surah_atomic_profiles
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertAtomic(surahId: number, data: SurahAtomicProfileUpsert): Promise<SurahAtomicProfile | null> {
    const existing = await this.findAtomicBySurah(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_atomic_profiles
           (surah, atomic_center, atomic_center_ar, structural_type, structural_type_note,
            resolution_pattern, interpretive_lens, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.atomic_center ?? '',
          data.atomic_center_ar ?? null,
          data.structural_type ?? 'mixed',
          data.structural_type_note ?? null,
          data.resolution_pattern ?? null,
          data.interpretive_lens ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const vals: unknown[] = [];

      if (data.atomic_center !== undefined)      { sets.push('atomic_center = ?');      vals.push(data.atomic_center); }
      if (data.atomic_center_ar !== undefined)   { sets.push('atomic_center_ar = ?');   vals.push(data.atomic_center_ar); }
      if (data.structural_type !== undefined)    { sets.push('structural_type = ?');    vals.push(data.structural_type); }
      if (data.structural_type_note !== undefined){ sets.push('structural_type_note = ?'); vals.push(data.structural_type_note); }
      if (data.resolution_pattern !== undefined) { sets.push('resolution_pattern = ?'); vals.push(data.resolution_pattern); }
      if (data.interpretive_lens !== undefined)  { sets.push('interpretive_lens = ?');  vals.push(data.interpretive_lens); }
      if (data.note_md !== undefined)            { sets.push('note_md = ?');            vals.push(data.note_md); }

      vals.push(surahId);
      await execute(this.db, `UPDATE qr_surah_atomic_profiles SET ${sets.join(', ')} WHERE surah = ?`, vals);
    }

    return this.findAtomicBySurah(surahId);
  }

  // ── qr_surah_ayah_meta ─────────────────────────────────────────────────────

  /** All ayah-meta rows for a surah, ordered by ayah number. */
  ayahMeta(surahId: number): Promise<SurahAyahMeta[]> {
    return query<SurahAyahMeta>(
      this.db,
      `SELECT surah, ayah, juz, hizb, ruku, manzil, sajda
       FROM qr_surah_ayah_meta
       WHERE surah = ?
       ORDER BY ayah`,
      [surahId],
    );
  }

  findAyahMeta(surah: number, ayah: number): Promise<SurahAyahMeta | null> {
    return queryOne<SurahAyahMeta>(
      this.db,
      `SELECT surah, ayah, juz, hizb, ruku, manzil, sajda
       FROM qr_surah_ayah_meta
       WHERE surah = ? AND ayah = ?`,
      [surah, ayah],
    );
  }

  async upsertAyahMeta(surah: number, ayah: number, data: SurahAyahMetaUpsert): Promise<SurahAyahMeta | null> {
    const existing = await this.findAyahMeta(surah, ayah);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_ayah_meta (surah, ayah, juz, hizb, ruku, manzil, sajda)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          surah,
          ayah,
          data.juz ?? null,
          data.hizb ?? null,
          data.ruku ?? null,
          data.manzil ?? null,
          data.sajda ?? 0,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.juz !== undefined)    { sets.push('juz = ?');    vals.push(data.juz); }
      if (data.hizb !== undefined)   { sets.push('hizb = ?');   vals.push(data.hizb); }
      if (data.ruku !== undefined)   { sets.push('ruku = ?');   vals.push(data.ruku); }
      if (data.manzil !== undefined) { sets.push('manzil = ?'); vals.push(data.manzil); }
      if (data.sajda !== undefined)  { sets.push('sajda = ?');  vals.push(data.sajda); }

      if (sets.length > 0) {
        vals.push(surah, ayah);
        await execute(this.db, `UPDATE qr_surah_ayah_meta SET ${sets.join(', ')} WHERE surah = ? AND ayah = ?`, vals);
      }
    }

    return this.findAyahMeta(surah, ayah);
  }
}
