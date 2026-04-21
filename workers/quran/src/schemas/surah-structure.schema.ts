// ─── Surah Structure schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSurahOpeningUpsert(body: unknown): SchemaValidationResult<SurahOpeningUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('ayah_from' in b) {
    if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from must be a number' };
    data.ayah_from = b.ayah_from;
  }
  if ('ayah_to' in b) {
    if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to must be a number' };
    data.ayah_to = b.ayah_to;
  }
  if ('opening_type' in b) {
    if (typeof b.opening_type !== 'string') return { error: 'opening_type must be a string' };
    data.opening_type = b.opening_type;
  }
  if ('rhetorical_force' in b) {
    if (b.rhetorical_force !== null && typeof b.rhetorical_force !== 'string') return { error: 'rhetorical_force must be a string or null' };
    data.rhetorical_force = b.rhetorical_force;
  }
  if ('sets_up_md' in b) {
    if (b.sets_up_md !== null && typeof b.sets_up_md !== 'string') return { error: 'sets_up_md must be a string or null' };
    data.sets_up_md = b.sets_up_md;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahOpeningUpsert };
}

export function validateSurahClosureUpsert(body: unknown): SchemaValidationResult<SurahClosureUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('ayah_from' in b) {
    if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from must be a number' };
    data.ayah_from = b.ayah_from;
  }
  if ('ayah_to' in b) {
    if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to must be a number' };
    data.ayah_to = b.ayah_to;
  }
  if ('closure_type' in b) {
    if (typeof b.closure_type !== 'string') return { error: 'closure_type must be a string' };
    data.closure_type = b.closure_type;
  }
  if ('echo_of_opening' in b) {
    if (typeof b.echo_of_opening !== 'number' || !Number.isFinite(b.echo_of_opening)) return { error: 'echo_of_opening must be a number' };
    data.echo_of_opening = b.echo_of_opening;
  }
  if ('rhetorical_force' in b) {
    if (b.rhetorical_force !== null && typeof b.rhetorical_force !== 'string') return { error: 'rhetorical_force must be a string or null' };
    data.rhetorical_force = b.rhetorical_force;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahClosureUpsert };
}

export function validateSurahStructuralPivotCreate(body: unknown): SchemaValidationResult<SurahStructuralPivotCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah !== 'number' || !Number.isFinite(b.ayah)) return { error: 'ayah is required and must be a number' };
  data.ayah = b.ayah;
  if (typeof b.pivot_type !== 'string' || !b.pivot_type.trim()) return { error: 'pivot_type is required and must be a non-empty string' };
  data.pivot_type = b.pivot_type.trim();
  if (typeof b.description !== 'string' || !b.description.trim()) return { error: 'description is required and must be a non-empty string' };
  data.description = b.description.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahStructuralPivotCreate };
}

export function validateSurahStructureUnitCreate(body: unknown): SchemaValidationResult<SurahStructureUnitCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index)) return { error: 'unit_index is required and must be a number' };
  data.unit_index = b.unit_index;
  if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from is required and must be a number' };
  data.ayah_from = b.ayah_from;
  if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to is required and must be a number' };
  data.ayah_to = b.ayah_to;
  if (typeof b.unit_role !== 'string' || !b.unit_role.trim()) return { error: 'unit_role is required and must be a non-empty string' };
  data.unit_role = b.unit_role.trim();
  if ('label' in b) {
    if (b.label !== null && typeof b.label !== 'string') return { error: 'label must be a string or null' };
    data.label = b.label;
  }
  if ('reading_id' in b) {
    if (b.reading_id !== null && typeof b.reading_id !== 'string') return { error: 'reading_id must be a string or null' };
    data.reading_id = b.reading_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahStructureUnitCreate };
}

export function validateSurahStructureLinkCreate(body: unknown): SchemaValidationResult<SurahStructureLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.from_unit_id !== 'string' || !b.from_unit_id.trim()) return { error: 'from_unit_id is required and must be a non-empty string' };
  data.from_unit_id = b.from_unit_id.trim();
  if (typeof b.to_unit_id !== 'string' || !b.to_unit_id.trim()) return { error: 'to_unit_id is required and must be a non-empty string' };
  data.to_unit_id = b.to_unit_id.trim();
  if (typeof b.link_type !== 'string' || !b.link_type.trim()) return { error: 'link_type is required and must be a non-empty string' };
  data.link_type = b.link_type.trim();
  if ('link_evidence' in b) {
    if (b.link_evidence !== null && typeof b.link_evidence !== 'string') return { error: 'link_evidence must be a string or null' };
    data.link_evidence = b.link_evidence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahStructureLinkCreate };
}

export function validateSurahStructureReadingCreate(body: unknown): SchemaValidationResult<SurahStructureReadingCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.reading_label !== 'string' || !b.reading_label.trim()) return { error: 'reading_label is required and must be a non-empty string' };
  data.reading_label = b.reading_label.trim();
  if (typeof b.structure_type !== 'string' || !b.structure_type.trim()) return { error: 'structure_type is required and must be a non-empty string' };
  data.structure_type = b.structure_type.trim();
  if ('scholar_ref' in b) {
    if (b.scholar_ref !== null && typeof b.scholar_ref !== 'string') return { error: 'scholar_ref must be a string or null' };
    data.scholar_ref = b.scholar_ref;
  }
  if ('paradigm_ref' in b) {
    if (b.paradigm_ref !== null && typeof b.paradigm_ref !== 'string') return { error: 'paradigm_ref must be a string or null' };
    data.paradigm_ref = b.paradigm_ref;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'string') return { error: 'confidence must be a string' };
    data.confidence = b.confidence;
  }
  if (typeof b.summary_md !== 'string' || !b.summary_md.trim()) return { error: 'summary_md is required and must be a non-empty string' };
  data.summary_md = b.summary_md.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahStructureReadingCreate };
}
