// ─── TafsirRepo — Layer 8: Reception (tafsir, scholars, paradigms, positions, reception) ─

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Row shapes (aligned to 005_reception_and_projections.sql) ────────────────

export interface TafsirEntry {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  entry_type: string;
  scholar_id: string | null;
  work_id: string | null;
  content_ar: string;
  content_en: string | null;
  source_page: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface TafsirEntryCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  entry_type?: string;
  scholar_id?: string | null;
  work_id?: string | null;
  content_ar: string;
  content_en?: string | null;
  source_page?: string | null;
  note_md?: string | null;
}

export interface TafsirEntryPatch {
  entry_type?: string;
  scholar_id?: string | null;
  work_id?: string | null;
  content_ar?: string;
  content_en?: string | null;
  source_page?: string | null;
  note_md?: string | null;
}

export interface ScholarProfile {
  id: string;
  name_ar: string;
  name_en: string | null;
  kunya: string | null;
  laqab: string | null;
  nisba: string | null;
  birth_year_hijri: number | null;
  death_year_hijri: number | null;
  birth_year_ce: number | null;
  death_year_ce: number | null;
  era: string | null;
  madhab: string | null;
  kalam_school: string | null;
  specialization: string | null;
  biography_md: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScholarCreate {
  name_ar: string;
  name_en?: string | null;
  kunya?: string | null;
  laqab?: string | null;
  nisba?: string | null;
  birth_year_hijri?: number | null;
  death_year_hijri?: number | null;
  birth_year_ce?: number | null;
  death_year_ce?: number | null;
  era?: string | null;
  madhab?: string | null;
  kalam_school?: string | null;
  specialization?: string | null;
  biography_md?: string | null;
  note_md?: string | null;
}

export interface ScholarPatch {
  name_en?: string | null;
  kunya?: string | null;
  laqab?: string | null;
  nisba?: string | null;
  birth_year_hijri?: number | null;
  death_year_hijri?: number | null;
  birth_year_ce?: number | null;
  death_year_ce?: number | null;
  era?: string | null;
  madhab?: string | null;
  kalam_school?: string | null;
  specialization?: string | null;
  biography_md?: string | null;
  note_md?: string | null;
}

export interface ScholarWork {
  id: string;
  scholar_id: string;
  title_ar: string;
  title_en: string | null;
  work_type: string;
  composition_year_hijri: number | null;
  composition_year_ce: number | null;
  lx_source_ref: string | null;
  volumes: number | null;
  is_complete: number;
  print_edition: string | null;
  summary: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScholarWorkCreate {
  scholar_id: string;
  title_ar: string;
  title_en?: string | null;
  work_type?: string;
  composition_year_hijri?: number | null;
  composition_year_ce?: number | null;
  lx_source_ref?: string | null;
  volumes?: number | null;
  is_complete?: number;
  print_edition?: string | null;
  summary?: string | null;
  note_md?: string | null;
}

export interface ScholarlyParadigm {
  id: string;
  name_ar: string;
  name_en: string;
  paradigm_type: string;
  description_md: string | null;
  era_range: string | null;
  created_at: string;
}

export interface ParadigmCreate {
  name_ar: string;
  name_en: string;
  paradigm_type: string;
  description_md?: string | null;
  era_range?: string | null;
}

export interface ScholarParadigmLink {
  scholar_id: string;
  paradigm_id: string;
  affiliation_type: string;
  note_md: string | null;
}

export interface ParadigmLinkAdd {
  paradigm_id: string;
  affiliation_type?: string;
  note_md?: string | null;
}

export interface ScholarPosition {
  id: string;
  scholar_id: string;
  work_id: string | null;
  scope_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  position_type: string;
  position_text_ar: string;
  position_text_en: string | null;
  position_summary: string | null;
  original_page: string | null;
  is_minority_view: number;
  is_contested: number;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionCreate {
  scholar_id: string;
  work_id?: string | null;
  scope_type: string;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  position_type?: string;
  position_text_ar: string;
  position_text_en?: string | null;
  position_summary?: string | null;
  original_page?: string | null;
  is_minority_view?: number;
  is_contested?: number;
  note_md?: string | null;
}

export interface ReceptionHistory {
  id: string;
  surah: number;
  era: string;
  dominant_methodology: string | null;
  dominant_themes: string | null;
  notable_scholars: string | null;
  tendencies_md: string | null;
  notable_shifts_md: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ReceptionHistoryData {
  era: string;
  dominant_methodology?: string | null;
  dominant_themes?: string | null;
  notable_scholars?: string | null;
  tendencies_md?: string | null;
  notable_shifts_md?: string | null;
  note_md?: string | null;
}

export interface InterpretiveDiff {
  id: string;
  scope_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  question_ar: string;
  question_en: string | null;
  difference_type: string;
  positions_summary: string | null;
  majority_view: string | null;
  minority_view: string | null;
  resolution_note: string | null;
  is_doctrinally_significant: number;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterpretiveDiffCreate {
  scope_type: string;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  question_ar: string;
  question_en?: string | null;
  difference_type?: string;
  positions_summary?: string | null;
  majority_view?: string | null;
  minority_view?: string | null;
  resolution_note?: string | null;
  is_doctrinally_significant?: number;
  note_md?: string | null;
}

// ─── Column SELECT constants ───────────────────────────────────────────────────

const ENTRY_COLS = `
  id, surah, ayah_from, ayah_to, entry_type,
  scholar_id, work_id, content_ar, content_en,
  source_page, note_md, created_at, updated_at`;

const SCHOLAR_COLS = `
  id, name_ar, name_en, kunya, laqab, nisba,
  birth_year_hijri, death_year_hijri, birth_year_ce, death_year_ce,
  era, madhab, kalam_school, specialization,
  biography_md, note_md, created_at, updated_at`;

const WORK_COLS = `
  id, scholar_id, title_ar, title_en, work_type,
  composition_year_hijri, composition_year_ce, lx_source_ref,
  volumes, is_complete, print_edition, summary, note_md, created_at`;

const PARADIGM_COLS = `
  id, name_ar, name_en, paradigm_type, description_md, era_range, created_at`;

const POSITION_COLS = `
  id, scholar_id, work_id, scope_type, surah, ayah_from, ayah_to,
  position_type, position_text_ar, position_text_en, position_summary,
  original_page, is_minority_view, is_contested, note_md,
  created_at, updated_at`;

const RECEPTION_COLS = `
  id, surah, era, dominant_methodology, dominant_themes,
  notable_scholars, tendencies_md, notable_shifts_md, note_md, created_at`;

const DIFF_COLS = `
  id, scope_type, surah, ayah_from, ayah_to,
  question_ar, question_en, difference_type,
  positions_summary, majority_view, minority_view,
  resolution_note, is_doctrinally_significant, note_md,
  created_at, updated_at`;

// ─── TafsirRepo ───────────────────────────────────────────────────────────────

export class TafsirRepo {
  constructor(private db: D1Database) {}

  // ── Tafsir Entries ──────────────────────────────────────────────────────────

  entries(
    surahId?: number,
    ayahFrom?: number,
    scholarId?: string,
    opts: PaginateOptions = {},
  ) {
    const where: string[] = [];
    const params: unknown[] = [];

    if (surahId !== undefined) {
      where.push('surah = ?');
      params.push(surahId);
    }
    if (ayahFrom !== undefined) {
      where.push('ayah_from <= ? AND ayah_to >= ?');
      params.push(ayahFrom, ayahFrom);
    }
    if (scholarId !== undefined) {
      where.push('scholar_id = ?');
      params.push(scholarId);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `FROM qr_tafsir_entry ${whereClause}`;
    const order = `ORDER BY surah, ayah_from, created_at`;

    return paginate<TafsirEntry>(
      this.db,
      `SELECT ${ENTRY_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  findEntryById(id: string): Promise<TafsirEntry | null> {
    return queryOne<TafsirEntry>(
      this.db,
      `SELECT ${ENTRY_COLS} FROM qr_tafsir_entry WHERE id = ?`,
      [id],
    );
  }

  async createEntry(input: TafsirEntryCreate): Promise<TafsirEntry> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_tafsir_entry
         (id, surah, ayah_from, ayah_to, entry_type,
          scholar_id, work_id, content_ar, content_en,
          source_page, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.ayah_from,
        input.ayah_to,
        input.entry_type ?? 'explanation',
        input.scholar_id ?? null,
        input.work_id ?? null,
        input.content_ar,
        input.content_en ?? null,
        input.source_page ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findEntryById(id))!;
  }

  async patchEntry(id: string, patch: TafsirEntryPatch): Promise<TafsirEntry | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.entry_type !== undefined)  { sets.push('entry_type = ?');  vals.push(patch.entry_type); }
    if (patch.scholar_id !== undefined)  { sets.push('scholar_id = ?');  vals.push(patch.scholar_id); }
    if (patch.work_id !== undefined)     { sets.push('work_id = ?');     vals.push(patch.work_id); }
    if (patch.content_ar !== undefined)  { sets.push('content_ar = ?');  vals.push(patch.content_ar); }
    if (patch.content_en !== undefined)  { sets.push('content_en = ?');  vals.push(patch.content_en); }
    if (patch.source_page !== undefined) { sets.push('source_page = ?'); vals.push(patch.source_page); }
    if (patch.note_md !== undefined)     { sets.push('note_md = ?');     vals.push(patch.note_md); }

    if (sets.length === 0) return this.findEntryById(id);

    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await execute(this.db, `UPDATE qr_tafsir_entry SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findEntryById(id);
  }

  // ── Scholar Profiles ────────────────────────────────────────────────────────

  scholars(opts: PaginateOptions = {}) {
    return paginate<ScholarProfile>(
      this.db,
      `SELECT ${SCHOLAR_COLS} FROM qr_scholar_profile ORDER BY name_en, name_ar`,
      `SELECT COUNT(*) AS count FROM qr_scholar_profile`,
      [],
      opts,
    );
  }

  findScholarById(id: string): Promise<ScholarProfile | null> {
    return queryOne<ScholarProfile>(
      this.db,
      `SELECT ${SCHOLAR_COLS} FROM qr_scholar_profile WHERE id = ?`,
      [id],
    );
  }

  findScholarBySlug(nisba: string): Promise<ScholarProfile | null> {
    return queryOne<ScholarProfile>(
      this.db,
      `SELECT ${SCHOLAR_COLS} FROM qr_scholar_profile WHERE nisba = ? LIMIT 1`,
      [nisba],
    );
  }

  async createScholar(input: ScholarCreate): Promise<ScholarProfile> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_scholar_profile
         (id, name_ar, name_en, kunya, laqab, nisba,
          birth_year_hijri, death_year_hijri, birth_year_ce, death_year_ce,
          era, madhab, kalam_school, specialization, biography_md, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name_ar,
        input.name_en ?? null,
        input.kunya ?? null,
        input.laqab ?? null,
        input.nisba ?? null,
        input.birth_year_hijri ?? null,
        input.death_year_hijri ?? null,
        input.birth_year_ce ?? null,
        input.death_year_ce ?? null,
        input.era ?? null,
        input.madhab ?? null,
        input.kalam_school ?? null,
        input.specialization ?? null,
        input.biography_md ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findScholarById(id))!;
  }

  async patchScholar(id: string, patch: ScholarPatch): Promise<ScholarProfile | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.name_en !== undefined)           { sets.push('name_en = ?');           vals.push(patch.name_en); }
    if (patch.kunya !== undefined)             { sets.push('kunya = ?');             vals.push(patch.kunya); }
    if (patch.laqab !== undefined)             { sets.push('laqab = ?');             vals.push(patch.laqab); }
    if (patch.nisba !== undefined)             { sets.push('nisba = ?');             vals.push(patch.nisba); }
    if (patch.birth_year_hijri !== undefined)  { sets.push('birth_year_hijri = ?');  vals.push(patch.birth_year_hijri); }
    if (patch.death_year_hijri !== undefined)  { sets.push('death_year_hijri = ?');  vals.push(patch.death_year_hijri); }
    if (patch.birth_year_ce !== undefined)     { sets.push('birth_year_ce = ?');     vals.push(patch.birth_year_ce); }
    if (patch.death_year_ce !== undefined)     { sets.push('death_year_ce = ?');     vals.push(patch.death_year_ce); }
    if (patch.era !== undefined)               { sets.push('era = ?');               vals.push(patch.era); }
    if (patch.madhab !== undefined)            { sets.push('madhab = ?');            vals.push(patch.madhab); }
    if (patch.kalam_school !== undefined)      { sets.push('kalam_school = ?');      vals.push(patch.kalam_school); }
    if (patch.specialization !== undefined)    { sets.push('specialization = ?');    vals.push(patch.specialization); }
    if (patch.biography_md !== undefined)      { sets.push('biography_md = ?');      vals.push(patch.biography_md); }
    if (patch.note_md !== undefined)           { sets.push('note_md = ?');           vals.push(patch.note_md); }

    if (sets.length === 0) return this.findScholarById(id);

    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await execute(this.db, `UPDATE qr_scholar_profile SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findScholarById(id);
  }

  // ── Scholar Works ───────────────────────────────────────────────────────────

  works(scholarId: string, opts: PaginateOptions = {}) {
    return paginate<ScholarWork>(
      this.db,
      `SELECT ${WORK_COLS} FROM qr_scholar_work WHERE scholar_id = ? ORDER BY composition_year_hijri`,
      `SELECT COUNT(*) AS count FROM qr_scholar_work WHERE scholar_id = ?`,
      [scholarId],
      opts,
    );
  }

  findWorkById(id: string): Promise<ScholarWork | null> {
    return queryOne<ScholarWork>(
      this.db,
      `SELECT ${WORK_COLS} FROM qr_scholar_work WHERE id = ?`,
      [id],
    );
  }

  async createWork(input: ScholarWorkCreate): Promise<ScholarWork> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_scholar_work
         (id, scholar_id, title_ar, title_en, work_type,
          composition_year_hijri, composition_year_ce, lx_source_ref,
          volumes, is_complete, print_edition, summary, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scholar_id,
        input.title_ar,
        input.title_en ?? null,
        input.work_type ?? 'tafsir',
        input.composition_year_hijri ?? null,
        input.composition_year_ce ?? null,
        input.lx_source_ref ?? null,
        input.volumes ?? null,
        input.is_complete ?? 1,
        input.print_edition ?? null,
        input.summary ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findWorkById(id))!;
  }

  // ── Scholarly Paradigms ─────────────────────────────────────────────────────

  paradigms(opts: PaginateOptions = {}) {
    return paginate<ScholarlyParadigm>(
      this.db,
      `SELECT ${PARADIGM_COLS} FROM qr_scholarly_paradigm ORDER BY paradigm_type, name_en`,
      `SELECT COUNT(*) AS count FROM qr_scholarly_paradigm`,
      [],
      opts,
    );
  }

  findParadigmById(id: string): Promise<ScholarlyParadigm | null> {
    return queryOne<ScholarlyParadigm>(
      this.db,
      `SELECT ${PARADIGM_COLS} FROM qr_scholarly_paradigm WHERE id = ?`,
      [id],
    );
  }

  async createParadigm(input: ParadigmCreate): Promise<ScholarlyParadigm> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_scholarly_paradigm
         (id, name_ar, name_en, paradigm_type, description_md, era_range)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name_ar,
        input.name_en,
        input.paradigm_type,
        input.description_md ?? null,
        input.era_range ?? null,
      ],
    );
    return (await this.findParadigmById(id))!;
  }

  // ── Scholar ↔ Paradigm Links ────────────────────────────────────────────────

  paradigmLinks(scholarId: string): Promise<ScholarParadigmLink[]> {
    return query<ScholarParadigmLink>(
      this.db,
      `SELECT scholar_id, paradigm_id, affiliation_type, note_md
       FROM qr_scholar_paradigm_link
       WHERE scholar_id = ?
       ORDER BY affiliation_type`,
      [scholarId],
    );
  }

  async addParadigmLink(scholarId: string, input: ParadigmLinkAdd): Promise<ScholarParadigmLink> {
    await execute(
      this.db,
      `INSERT OR REPLACE INTO qr_scholar_paradigm_link
         (scholar_id, paradigm_id, affiliation_type, note_md)
       VALUES (?, ?, ?, ?)`,
      [
        scholarId,
        input.paradigm_id,
        input.affiliation_type ?? 'primary',
        input.note_md ?? null,
      ],
    );
    const row = await queryOne<ScholarParadigmLink>(
      this.db,
      `SELECT scholar_id, paradigm_id, affiliation_type, note_md
       FROM qr_scholar_paradigm_link
       WHERE scholar_id = ? AND paradigm_id = ?`,
      [scholarId, input.paradigm_id],
    );
    return row!;
  }

  // ── Scholar Positions ───────────────────────────────────────────────────────

  positions(
    scholarId?: string,
    scopeRef?: { surah: number; ayah?: number },
    opts: PaginateOptions = {},
  ) {
    const where: string[] = [];
    const params: unknown[] = [];

    if (scholarId !== undefined) {
      where.push('scholar_id = ?');
      params.push(scholarId);
    }
    if (scopeRef !== undefined) {
      where.push('surah = ?');
      params.push(scopeRef.surah);
      if (scopeRef.ayah !== undefined) {
        where.push('ayah_from <= ? AND ayah_to >= ?');
        params.push(scopeRef.ayah, scopeRef.ayah);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `FROM qr_scholar_position ${whereClause}`;
    const order = `ORDER BY surah, ayah_from, created_at`;

    return paginate<ScholarPosition>(
      this.db,
      `SELECT ${POSITION_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  findPositionById(id: string): Promise<ScholarPosition | null> {
    return queryOne<ScholarPosition>(
      this.db,
      `SELECT ${POSITION_COLS} FROM qr_scholar_position WHERE id = ?`,
      [id],
    );
  }

  async createPosition(input: PositionCreate): Promise<ScholarPosition> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_scholar_position
         (id, scholar_id, work_id, scope_type, surah, ayah_from, ayah_to,
          position_type, position_text_ar, position_text_en, position_summary,
          original_page, is_minority_view, is_contested, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scholar_id,
        input.work_id ?? null,
        input.scope_type,
        input.surah ?? null,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.position_type ?? 'meaning',
        input.position_text_ar,
        input.position_text_en ?? null,
        input.position_summary ?? null,
        input.original_page ?? null,
        input.is_minority_view ?? 0,
        input.is_contested ?? 0,
        input.note_md ?? null,
      ],
    );
    return (await this.findPositionById(id))!;
  }

  // ── Surah Reception Histories ───────────────────────────────────────────────

  receptionHistories(surahId: number): Promise<ReceptionHistory[]> {
    return query<ReceptionHistory>(
      this.db,
      `SELECT ${RECEPTION_COLS}
       FROM qr_surah_reception
       WHERE surah = ?
       ORDER BY era`,
      [surahId],
    );
  }

  async upsertReceptionHistory(surahId: number, data: ReceptionHistoryData): Promise<ReceptionHistory> {
    const existing = await queryOne<{ id: string }>(
      this.db,
      `SELECT id FROM qr_surah_reception WHERE surah = ? AND era = ?`,
      [surahId, data.era],
    );

    if (existing) {
      await execute(
        this.db,
        `UPDATE qr_surah_reception SET
           dominant_methodology = ?,
           dominant_themes = ?,
           notable_scholars = ?,
           tendencies_md = ?,
           notable_shifts_md = ?,
           note_md = ?
         WHERE id = ?`,
        [
          data.dominant_methodology ?? null,
          data.dominant_themes ?? null,
          data.notable_scholars ?? null,
          data.tendencies_md ?? null,
          data.notable_shifts_md ?? null,
          data.note_md ?? null,
          existing.id,
        ],
      );
      return (await queryOne<ReceptionHistory>(
        this.db,
        `SELECT ${RECEPTION_COLS} FROM qr_surah_reception WHERE id = ?`,
        [existing.id],
      ))!;
    }

    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_surah_reception
         (id, surah, era, dominant_methodology, dominant_themes,
          notable_scholars, tendencies_md, notable_shifts_md, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        surahId,
        data.era,
        data.dominant_methodology ?? null,
        data.dominant_themes ?? null,
        data.notable_scholars ?? null,
        data.tendencies_md ?? null,
        data.notable_shifts_md ?? null,
        data.note_md ?? null,
      ],
    );
    return (await queryOne<ReceptionHistory>(
      this.db,
      `SELECT ${RECEPTION_COLS} FROM qr_surah_reception WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Interpretive Differences ────────────────────────────────────────────────

  interpretiveDiffs(surahId: number, opts: PaginateOptions = {}) {
    return paginate<InterpretiveDiff>(
      this.db,
      `SELECT ${DIFF_COLS}
       FROM qr_interpretive_difference
       WHERE surah = ?
       ORDER BY ayah_from, difference_type`,
      `SELECT COUNT(*) AS count FROM qr_interpretive_difference WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createInterpretiveDiff(input: InterpretiveDiffCreate): Promise<InterpretiveDiff> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_interpretive_difference
         (id, scope_type, surah, ayah_from, ayah_to,
          question_ar, question_en, difference_type,
          positions_summary, majority_view, minority_view,
          resolution_note, is_doctrinally_significant, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.surah ?? null,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.question_ar,
        input.question_en ?? null,
        input.difference_type ?? 'meaning',
        input.positions_summary ?? null,
        input.majority_view ?? null,
        input.minority_view ?? null,
        input.resolution_note ?? null,
        input.is_doctrinally_significant ?? 0,
        input.note_md ?? null,
      ],
    );
    const row = await queryOne<InterpretiveDiff>(
      this.db,
      `SELECT ${DIFF_COLS} FROM qr_interpretive_difference WHERE id = ?`,
      [id],
    );
    return row!;
  }
}
