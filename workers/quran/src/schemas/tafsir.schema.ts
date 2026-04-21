// ─── Tafsir schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateTafsirEntryCreate(body: unknown): SchemaValidationResult<TafsirEntryCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from is required and must be a number' };
  data.ayah_from = b.ayah_from;
  if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to is required and must be a number' };
  data.ayah_to = b.ayah_to;
  if ('entry_type' in b) {
    if (typeof b.entry_type !== 'string') return { error: 'entry_type must be a string' };
    data.entry_type = b.entry_type;
  }
  if ('scholar_id' in b) {
    if (b.scholar_id !== null && typeof b.scholar_id !== 'string') return { error: 'scholar_id must be a string or null' };
    data.scholar_id = b.scholar_id;
  }
  if ('work_id' in b) {
    if (b.work_id !== null && typeof b.work_id !== 'string') return { error: 'work_id must be a string or null' };
    data.work_id = b.work_id;
  }
  if (typeof b.content_ar !== 'string' || !b.content_ar.trim()) return { error: 'content_ar is required and must be a non-empty string' };
  data.content_ar = b.content_ar.trim();
  if ('content_en' in b) {
    if (b.content_en !== null && typeof b.content_en !== 'string') return { error: 'content_en must be a string or null' };
    data.content_en = b.content_en;
  }
  if ('source_page' in b) {
    if (b.source_page !== null && typeof b.source_page !== 'string') return { error: 'source_page must be a string or null' };
    data.source_page = b.source_page;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as TafsirEntryCreate };
}

export function validateTafsirEntryPatch(body: unknown): SchemaValidationResult<TafsirEntryPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('entry_type' in b) {
    if (typeof b.entry_type !== 'string') return { error: 'entry_type must be a string' };
    data.entry_type = b.entry_type;
  }
  if ('scholar_id' in b) {
    if (b.scholar_id !== null && typeof b.scholar_id !== 'string') return { error: 'scholar_id must be a string or null' };
    data.scholar_id = b.scholar_id;
  }
  if ('work_id' in b) {
    if (b.work_id !== null && typeof b.work_id !== 'string') return { error: 'work_id must be a string or null' };
    data.work_id = b.work_id;
  }
  if ('content_ar' in b) {
    if (typeof b.content_ar !== 'string') return { error: 'content_ar must be a string' };
    data.content_ar = b.content_ar;
  }
  if ('content_en' in b) {
    if (b.content_en !== null && typeof b.content_en !== 'string') return { error: 'content_en must be a string or null' };
    data.content_en = b.content_en;
  }
  if ('source_page' in b) {
    if (b.source_page !== null && typeof b.source_page !== 'string') return { error: 'source_page must be a string or null' };
    data.source_page = b.source_page;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as TafsirEntryPatch };
}

export function validateScholarCreate(body: unknown): SchemaValidationResult<ScholarCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.name_ar !== 'string' || !b.name_ar.trim()) return { error: 'name_ar is required and must be a non-empty string' };
  data.name_ar = b.name_ar.trim();
  if ('name_en' in b) {
    if (b.name_en !== null && typeof b.name_en !== 'string') return { error: 'name_en must be a string or null' };
    data.name_en = b.name_en;
  }
  if ('kunya' in b) {
    if (b.kunya !== null && typeof b.kunya !== 'string') return { error: 'kunya must be a string or null' };
    data.kunya = b.kunya;
  }
  if ('laqab' in b) {
    if (b.laqab !== null && typeof b.laqab !== 'string') return { error: 'laqab must be a string or null' };
    data.laqab = b.laqab;
  }
  if ('nisba' in b) {
    if (b.nisba !== null && typeof b.nisba !== 'string') return { error: 'nisba must be a string or null' };
    data.nisba = b.nisba;
  }
  if ('birth_year_hijri' in b) {
    if (b.birth_year_hijri !== null && (typeof b.birth_year_hijri !== 'number' || !Number.isFinite(b.birth_year_hijri))) return { error: 'birth_year_hijri must be a number or null' };
    data.birth_year_hijri = b.birth_year_hijri;
  }
  if ('death_year_hijri' in b) {
    if (b.death_year_hijri !== null && (typeof b.death_year_hijri !== 'number' || !Number.isFinite(b.death_year_hijri))) return { error: 'death_year_hijri must be a number or null' };
    data.death_year_hijri = b.death_year_hijri;
  }
  if ('birth_year_ce' in b) {
    if (b.birth_year_ce !== null && (typeof b.birth_year_ce !== 'number' || !Number.isFinite(b.birth_year_ce))) return { error: 'birth_year_ce must be a number or null' };
    data.birth_year_ce = b.birth_year_ce;
  }
  if ('death_year_ce' in b) {
    if (b.death_year_ce !== null && (typeof b.death_year_ce !== 'number' || !Number.isFinite(b.death_year_ce))) return { error: 'death_year_ce must be a number or null' };
    data.death_year_ce = b.death_year_ce;
  }
  if ('era' in b) {
    if (b.era !== null && typeof b.era !== 'string') return { error: 'era must be a string or null' };
    data.era = b.era;
  }
  if ('madhab' in b) {
    if (b.madhab !== null && typeof b.madhab !== 'string') return { error: 'madhab must be a string or null' };
    data.madhab = b.madhab;
  }
  if ('kalam_school' in b) {
    if (b.kalam_school !== null && typeof b.kalam_school !== 'string') return { error: 'kalam_school must be a string or null' };
    data.kalam_school = b.kalam_school;
  }
  if ('specialization' in b) {
    if (b.specialization !== null && typeof b.specialization !== 'string') return { error: 'specialization must be a string or null' };
    data.specialization = b.specialization;
  }
  if ('biography_md' in b) {
    if (b.biography_md !== null && typeof b.biography_md !== 'string') return { error: 'biography_md must be a string or null' };
    data.biography_md = b.biography_md;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScholarCreate };
}

export function validateScholarPatch(body: unknown): SchemaValidationResult<ScholarPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name_en' in b) {
    if (b.name_en !== null && typeof b.name_en !== 'string') return { error: 'name_en must be a string or null' };
    data.name_en = b.name_en;
  }
  if ('kunya' in b) {
    if (b.kunya !== null && typeof b.kunya !== 'string') return { error: 'kunya must be a string or null' };
    data.kunya = b.kunya;
  }
  if ('laqab' in b) {
    if (b.laqab !== null && typeof b.laqab !== 'string') return { error: 'laqab must be a string or null' };
    data.laqab = b.laqab;
  }
  if ('nisba' in b) {
    if (b.nisba !== null && typeof b.nisba !== 'string') return { error: 'nisba must be a string or null' };
    data.nisba = b.nisba;
  }
  if ('birth_year_hijri' in b) {
    if (b.birth_year_hijri !== null && (typeof b.birth_year_hijri !== 'number' || !Number.isFinite(b.birth_year_hijri))) return { error: 'birth_year_hijri must be a number or null' };
    data.birth_year_hijri = b.birth_year_hijri;
  }
  if ('death_year_hijri' in b) {
    if (b.death_year_hijri !== null && (typeof b.death_year_hijri !== 'number' || !Number.isFinite(b.death_year_hijri))) return { error: 'death_year_hijri must be a number or null' };
    data.death_year_hijri = b.death_year_hijri;
  }
  if ('birth_year_ce' in b) {
    if (b.birth_year_ce !== null && (typeof b.birth_year_ce !== 'number' || !Number.isFinite(b.birth_year_ce))) return { error: 'birth_year_ce must be a number or null' };
    data.birth_year_ce = b.birth_year_ce;
  }
  if ('death_year_ce' in b) {
    if (b.death_year_ce !== null && (typeof b.death_year_ce !== 'number' || !Number.isFinite(b.death_year_ce))) return { error: 'death_year_ce must be a number or null' };
    data.death_year_ce = b.death_year_ce;
  }
  if ('era' in b) {
    if (b.era !== null && typeof b.era !== 'string') return { error: 'era must be a string or null' };
    data.era = b.era;
  }
  if ('madhab' in b) {
    if (b.madhab !== null && typeof b.madhab !== 'string') return { error: 'madhab must be a string or null' };
    data.madhab = b.madhab;
  }
  if ('kalam_school' in b) {
    if (b.kalam_school !== null && typeof b.kalam_school !== 'string') return { error: 'kalam_school must be a string or null' };
    data.kalam_school = b.kalam_school;
  }
  if ('specialization' in b) {
    if (b.specialization !== null && typeof b.specialization !== 'string') return { error: 'specialization must be a string or null' };
    data.specialization = b.specialization;
  }
  if ('biography_md' in b) {
    if (b.biography_md !== null && typeof b.biography_md !== 'string') return { error: 'biography_md must be a string or null' };
    data.biography_md = b.biography_md;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScholarPatch };
}

export function validateScholarWorkCreate(body: unknown): SchemaValidationResult<ScholarWorkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scholar_id !== 'string' || !b.scholar_id.trim()) return { error: 'scholar_id is required and must be a non-empty string' };
  data.scholar_id = b.scholar_id.trim();
  if (typeof b.title_ar !== 'string' || !b.title_ar.trim()) return { error: 'title_ar is required and must be a non-empty string' };
  data.title_ar = b.title_ar.trim();
  if ('title_en' in b) {
    if (b.title_en !== null && typeof b.title_en !== 'string') return { error: 'title_en must be a string or null' };
    data.title_en = b.title_en;
  }
  if ('work_type' in b) {
    if (typeof b.work_type !== 'string') return { error: 'work_type must be a string' };
    data.work_type = b.work_type;
  }
  if ('composition_year_hijri' in b) {
    if (b.composition_year_hijri !== null && (typeof b.composition_year_hijri !== 'number' || !Number.isFinite(b.composition_year_hijri))) return { error: 'composition_year_hijri must be a number or null' };
    data.composition_year_hijri = b.composition_year_hijri;
  }
  if ('composition_year_ce' in b) {
    if (b.composition_year_ce !== null && (typeof b.composition_year_ce !== 'number' || !Number.isFinite(b.composition_year_ce))) return { error: 'composition_year_ce must be a number or null' };
    data.composition_year_ce = b.composition_year_ce;
  }
  if ('lx_source_ref' in b) {
    if (b.lx_source_ref !== null && typeof b.lx_source_ref !== 'string') return { error: 'lx_source_ref must be a string or null' };
    data.lx_source_ref = b.lx_source_ref;
  }
  if ('volumes' in b) {
    if (b.volumes !== null && (typeof b.volumes !== 'number' || !Number.isFinite(b.volumes))) return { error: 'volumes must be a number or null' };
    data.volumes = b.volumes;
  }
  if ('is_complete' in b) {
    if (typeof b.is_complete !== 'number' || !Number.isFinite(b.is_complete)) return { error: 'is_complete must be a number' };
    data.is_complete = b.is_complete;
  }
  if ('print_edition' in b) {
    if (b.print_edition !== null && typeof b.print_edition !== 'string') return { error: 'print_edition must be a string or null' };
    data.print_edition = b.print_edition;
  }
  if ('summary' in b) {
    if (b.summary !== null && typeof b.summary !== 'string') return { error: 'summary must be a string or null' };
    data.summary = b.summary;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScholarWorkCreate };
}

export function validateParadigmCreate(body: unknown): SchemaValidationResult<ParadigmCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.name_ar !== 'string' || !b.name_ar.trim()) return { error: 'name_ar is required and must be a non-empty string' };
  data.name_ar = b.name_ar.trim();
  if (typeof b.name_en !== 'string' || !b.name_en.trim()) return { error: 'name_en is required and must be a non-empty string' };
  data.name_en = b.name_en.trim();
  if (typeof b.paradigm_type !== 'string' || !b.paradigm_type.trim()) return { error: 'paradigm_type is required and must be a non-empty string' };
  data.paradigm_type = b.paradigm_type.trim();
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('era_range' in b) {
    if (b.era_range !== null && typeof b.era_range !== 'string') return { error: 'era_range must be a string or null' };
    data.era_range = b.era_range;
  }

  return { data: data as unknown as ParadigmCreate };
}

export function validateParadigmLinkAdd(body: unknown): SchemaValidationResult<ParadigmLinkAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.paradigm_id !== 'string' || !b.paradigm_id.trim()) return { error: 'paradigm_id is required and must be a non-empty string' };
  data.paradigm_id = b.paradigm_id.trim();
  if ('affiliation_type' in b) {
    if (typeof b.affiliation_type !== 'string') return { error: 'affiliation_type must be a string' };
    data.affiliation_type = b.affiliation_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ParadigmLinkAdd };
}

export function validatePositionCreate(body: unknown): SchemaValidationResult<PositionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scholar_id !== 'string' || !b.scholar_id.trim()) return { error: 'scholar_id is required and must be a non-empty string' };
  data.scholar_id = b.scholar_id.trim();
  if ('work_id' in b) {
    if (b.work_id !== null && typeof b.work_id !== 'string') return { error: 'work_id must be a string or null' };
    data.work_id = b.work_id;
  }
  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if ('ayah_from' in b) {
    if (b.ayah_from !== null && (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from))) return { error: 'ayah_from must be a number or null' };
    data.ayah_from = b.ayah_from;
  }
  if ('ayah_to' in b) {
    if (b.ayah_to !== null && (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to))) return { error: 'ayah_to must be a number or null' };
    data.ayah_to = b.ayah_to;
  }
  if ('position_type' in b) {
    if (typeof b.position_type !== 'string') return { error: 'position_type must be a string' };
    data.position_type = b.position_type;
  }
  if (typeof b.position_text_ar !== 'string' || !b.position_text_ar.trim()) return { error: 'position_text_ar is required and must be a non-empty string' };
  data.position_text_ar = b.position_text_ar.trim();
  if ('position_text_en' in b) {
    if (b.position_text_en !== null && typeof b.position_text_en !== 'string') return { error: 'position_text_en must be a string or null' };
    data.position_text_en = b.position_text_en;
  }
  if ('position_summary' in b) {
    if (b.position_summary !== null && typeof b.position_summary !== 'string') return { error: 'position_summary must be a string or null' };
    data.position_summary = b.position_summary;
  }
  if ('original_page' in b) {
    if (b.original_page !== null && typeof b.original_page !== 'string') return { error: 'original_page must be a string or null' };
    data.original_page = b.original_page;
  }
  if ('is_minority_view' in b) {
    if (typeof b.is_minority_view !== 'number' || !Number.isFinite(b.is_minority_view)) return { error: 'is_minority_view must be a number' };
    data.is_minority_view = b.is_minority_view;
  }
  if ('is_contested' in b) {
    if (typeof b.is_contested !== 'number' || !Number.isFinite(b.is_contested)) return { error: 'is_contested must be a number' };
    data.is_contested = b.is_contested;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as PositionCreate };
}

export function validateInterpretiveDiffCreate(body: unknown): SchemaValidationResult<InterpretiveDiffCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if ('ayah_from' in b) {
    if (b.ayah_from !== null && (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from))) return { error: 'ayah_from must be a number or null' };
    data.ayah_from = b.ayah_from;
  }
  if ('ayah_to' in b) {
    if (b.ayah_to !== null && (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to))) return { error: 'ayah_to must be a number or null' };
    data.ayah_to = b.ayah_to;
  }
  if (typeof b.question_ar !== 'string' || !b.question_ar.trim()) return { error: 'question_ar is required and must be a non-empty string' };
  data.question_ar = b.question_ar.trim();
  if ('question_en' in b) {
    if (b.question_en !== null && typeof b.question_en !== 'string') return { error: 'question_en must be a string or null' };
    data.question_en = b.question_en;
  }
  if ('difference_type' in b) {
    if (typeof b.difference_type !== 'string') return { error: 'difference_type must be a string' };
    data.difference_type = b.difference_type;
  }
  if ('positions_summary' in b) {
    if (b.positions_summary !== null && typeof b.positions_summary !== 'string') return { error: 'positions_summary must be a string or null' };
    data.positions_summary = b.positions_summary;
  }
  if ('majority_view' in b) {
    if (b.majority_view !== null && typeof b.majority_view !== 'string') return { error: 'majority_view must be a string or null' };
    data.majority_view = b.majority_view;
  }
  if ('minority_view' in b) {
    if (b.minority_view !== null && typeof b.minority_view !== 'string') return { error: 'minority_view must be a string or null' };
    data.minority_view = b.minority_view;
  }
  if ('resolution_note' in b) {
    if (b.resolution_note !== null && typeof b.resolution_note !== 'string') return { error: 'resolution_note must be a string or null' };
    data.resolution_note = b.resolution_note;
  }
  if ('is_doctrinally_significant' in b) {
    if (typeof b.is_doctrinally_significant !== 'number' || !Number.isFinite(b.is_doctrinally_significant)) return { error: 'is_doctrinally_significant must be a number' };
    data.is_doctrinally_significant = b.is_doctrinally_significant;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as InterpretiveDiffCreate };
}
