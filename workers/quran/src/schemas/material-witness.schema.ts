// ─── Material Witness schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateMaterialWitnessCreate(body: unknown): SchemaValidationResult<MaterialWitnessCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.witness_type !== 'string' || !b.witness_type.trim()) return { error: 'witness_type is required and must be a non-empty string' };
  data.witness_type = b.witness_type.trim();
  if ('siglum' in b) {
    if (b.siglum !== null && typeof b.siglum !== 'string') return { error: 'siglum must be a string or null' };
    data.siglum = b.siglum;
  }
  if ('common_name' in b) {
    if (b.common_name !== null && typeof b.common_name !== 'string') return { error: 'common_name must be a string or null' };
    data.common_name = b.common_name;
  }
  if ('location' in b) {
    if (b.location !== null && typeof b.location !== 'string') return { error: 'location must be a string or null' };
    data.location = b.location;
  }
  if ('date_range_ce' in b) {
    if (b.date_range_ce !== null && typeof b.date_range_ce !== 'string') return { error: 'date_range_ce must be a string or null' };
    data.date_range_ce = b.date_range_ce;
  }
  if ('dating_method' in b) {
    if (b.dating_method !== null && typeof b.dating_method !== 'string') return { error: 'dating_method must be a string or null' };
    data.dating_method = b.dating_method;
  }
  if ('script_style' in b) {
    if (b.script_style !== null && typeof b.script_style !== 'string') return { error: 'script_style must be a string or null' };
    data.script_style = b.script_style;
  }
  if ('rasm_notes' in b) {
    if (b.rasm_notes !== null && typeof b.rasm_notes !== 'string') return { error: 'rasm_notes must be a string or null' };
    data.rasm_notes = b.rasm_notes;
  }
  if ('qiraat_notes' in b) {
    if (b.qiraat_notes !== null && typeof b.qiraat_notes !== 'string') return { error: 'qiraat_notes must be a string or null' };
    data.qiraat_notes = b.qiraat_notes;
  }
  if ('digitized_url' in b) {
    if (b.digitized_url !== null && typeof b.digitized_url !== 'string') return { error: 'digitized_url must be a string or null' };
    data.digitized_url = b.digitized_url;
  }
  if ('cm_document_ref' in b) {
    if (b.cm_document_ref !== null && typeof b.cm_document_ref !== 'string') return { error: 'cm_document_ref must be a string or null' };
    data.cm_document_ref = b.cm_document_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as MaterialWitnessCreate };
}

export function validateMaterialWitnessPatch(body: unknown): SchemaValidationResult<MaterialWitnessPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('witness_type' in b) {
    if (typeof b.witness_type !== 'string') return { error: 'witness_type must be a string' };
    data.witness_type = b.witness_type;
  }
  if ('siglum' in b) {
    if (b.siglum !== null && typeof b.siglum !== 'string') return { error: 'siglum must be a string or null' };
    data.siglum = b.siglum;
  }
  if ('common_name' in b) {
    if (b.common_name !== null && typeof b.common_name !== 'string') return { error: 'common_name must be a string or null' };
    data.common_name = b.common_name;
  }
  if ('location' in b) {
    if (b.location !== null && typeof b.location !== 'string') return { error: 'location must be a string or null' };
    data.location = b.location;
  }
  if ('date_range_ce' in b) {
    if (b.date_range_ce !== null && typeof b.date_range_ce !== 'string') return { error: 'date_range_ce must be a string or null' };
    data.date_range_ce = b.date_range_ce;
  }
  if ('dating_method' in b) {
    if (b.dating_method !== null && typeof b.dating_method !== 'string') return { error: 'dating_method must be a string or null' };
    data.dating_method = b.dating_method;
  }
  if ('script_style' in b) {
    if (b.script_style !== null && typeof b.script_style !== 'string') return { error: 'script_style must be a string or null' };
    data.script_style = b.script_style;
  }
  if ('rasm_notes' in b) {
    if (b.rasm_notes !== null && typeof b.rasm_notes !== 'string') return { error: 'rasm_notes must be a string or null' };
    data.rasm_notes = b.rasm_notes;
  }
  if ('qiraat_notes' in b) {
    if (b.qiraat_notes !== null && typeof b.qiraat_notes !== 'string') return { error: 'qiraat_notes must be a string or null' };
    data.qiraat_notes = b.qiraat_notes;
  }
  if ('digitized_url' in b) {
    if (b.digitized_url !== null && typeof b.digitized_url !== 'string') return { error: 'digitized_url must be a string or null' };
    data.digitized_url = b.digitized_url;
  }
  if ('cm_document_ref' in b) {
    if (b.cm_document_ref !== null && typeof b.cm_document_ref !== 'string') return { error: 'cm_document_ref must be a string or null' };
    data.cm_document_ref = b.cm_document_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as MaterialWitnessPatch };
}

export function validateWitnessObservationCreate(body: unknown): SchemaValidationResult<WitnessObservationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.observation_type !== 'string' || !b.observation_type.trim()) return { error: 'observation_type is required and must be a non-empty string' };
  data.observation_type = b.observation_type.trim();
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
  if (typeof b.observation_text !== 'string' || !b.observation_text.trim()) return { error: 'observation_text is required and must be a non-empty string' };
  data.observation_text = b.observation_text.trim();
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as WitnessObservationCreate };
}
