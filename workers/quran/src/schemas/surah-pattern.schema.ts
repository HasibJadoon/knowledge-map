// ─── Surah Pattern schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSurahSymmetryPatternCreate(body: unknown): SchemaValidationResult<SurahSymmetryPatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if ('structure_reading_id' in b) {
    if (b.structure_reading_id !== null && typeof b.structure_reading_id !== 'string') return { error: 'structure_reading_id must be a string or null' };
    data.structure_reading_id = b.structure_reading_id;
  }
  if (typeof b.pattern_type !== 'string' || !b.pattern_type.trim()) return { error: 'pattern_type is required and must be a non-empty string' };
  data.pattern_type = b.pattern_type.trim();
  if ('center_ayah_from' in b) {
    if (b.center_ayah_from !== null && (typeof b.center_ayah_from !== 'number' || !Number.isFinite(b.center_ayah_from))) return { error: 'center_ayah_from must be a number or null' };
    data.center_ayah_from = b.center_ayah_from;
  }
  if ('center_ayah_to' in b) {
    if (b.center_ayah_to !== null && (typeof b.center_ayah_to !== 'number' || !Number.isFinite(b.center_ayah_to))) return { error: 'center_ayah_to must be a number or null' };
    data.center_ayah_to = b.center_ayah_to;
  }
  if ('pattern_notation' in b) {
    if (b.pattern_notation !== null && typeof b.pattern_notation !== 'string') return { error: 'pattern_notation must be a string or null' };
    data.pattern_notation = b.pattern_notation;
  }
  if ('pairs_json' in b) {
    if (b.pairs_json !== null && typeof b.pairs_json !== 'string') return { error: 'pairs_json must be a string or null' };
    data.pairs_json = b.pairs_json;
  }
  if ('summary_md' in b) {
    if (b.summary_md !== null && typeof b.summary_md !== 'string') return { error: 'summary_md must be a string or null' };
    data.summary_md = b.summary_md;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahSymmetryPatternCreate };
}

export function validateSurahDiamondPatternCreate(body: unknown): SchemaValidationResult<SurahDiamondPatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if ('structure_reading_id' in b) {
    if (b.structure_reading_id !== null && typeof b.structure_reading_id !== 'string') return { error: 'structure_reading_id must be a string or null' };
    data.structure_reading_id = b.structure_reading_id;
  }
  if ('pattern_type' in b) {
    if (typeof b.pattern_type !== 'string') return { error: 'pattern_type must be a string' };
    data.pattern_type = b.pattern_type;
  }
  if ('top_section_from' in b) {
    if (b.top_section_from !== null && (typeof b.top_section_from !== 'number' || !Number.isFinite(b.top_section_from))) return { error: 'top_section_from must be a number or null' };
    data.top_section_from = b.top_section_from;
  }
  if ('top_section_to' in b) {
    if (b.top_section_to !== null && (typeof b.top_section_to !== 'number' || !Number.isFinite(b.top_section_to))) return { error: 'top_section_to must be a number or null' };
    data.top_section_to = b.top_section_to;
  }
  if ('center_from' in b) {
    if (b.center_from !== null && (typeof b.center_from !== 'number' || !Number.isFinite(b.center_from))) return { error: 'center_from must be a number or null' };
    data.center_from = b.center_from;
  }
  if ('center_to' in b) {
    if (b.center_to !== null && (typeof b.center_to !== 'number' || !Number.isFinite(b.center_to))) return { error: 'center_to must be a number or null' };
    data.center_to = b.center_to;
  }
  if ('bottom_section_from' in b) {
    if (b.bottom_section_from !== null && (typeof b.bottom_section_from !== 'number' || !Number.isFinite(b.bottom_section_from))) return { error: 'bottom_section_from must be a number or null' };
    data.bottom_section_from = b.bottom_section_from;
  }
  if ('bottom_section_to' in b) {
    if (b.bottom_section_to !== null && (typeof b.bottom_section_to !== 'number' || !Number.isFinite(b.bottom_section_to))) return { error: 'bottom_section_to must be a number or null' };
    data.bottom_section_to = b.bottom_section_to;
  }
  if ('balance_note' in b) {
    if (b.balance_note !== null && typeof b.balance_note !== 'string') return { error: 'balance_note must be a string or null' };
    data.balance_note = b.balance_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahDiamondPatternCreate };
}

export function validateSurahSequencePatternCreate(body: unknown): SchemaValidationResult<SurahSequencePatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.sequence_type !== 'string' || !b.sequence_type.trim()) return { error: 'sequence_type is required and must be a non-empty string' };
  data.sequence_type = b.sequence_type.trim();
  if (typeof b.stages_json !== 'string' || !b.stages_json.trim()) return { error: 'stages_json is required and must be a non-empty string' };
  data.stages_json = b.stages_json.trim();
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahSequencePatternCreate };
}

export function validateSurahMotifClusterCreate(body: unknown): SchemaValidationResult<SurahMotifClusterCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.cluster_label !== 'string' || !b.cluster_label.trim()) return { error: 'cluster_label is required and must be a non-empty string' };
  data.cluster_label = b.cluster_label.trim();
  if ('cluster_label_ar' in b) {
    if (b.cluster_label_ar !== null && typeof b.cluster_label_ar !== 'string') return { error: 'cluster_label_ar must be a string or null' };
    data.cluster_label_ar = b.cluster_label_ar;
  }
  if (typeof b.motif_keys !== 'string' || !b.motif_keys.trim()) return { error: 'motif_keys is required and must be a non-empty string' };
  data.motif_keys = b.motif_keys.trim();
  if ('ayah_range_json' in b) {
    if (b.ayah_range_json !== null && typeof b.ayah_range_json !== 'string') return { error: 'ayah_range_json must be a string or null' };
    data.ayah_range_json = b.ayah_range_json;
  }
  if ('semantic_role' in b) {
    if (b.semantic_role !== null && typeof b.semantic_role !== 'string') return { error: 'semantic_role must be a string or null' };
    data.semantic_role = b.semantic_role;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahMotifClusterCreate };
}

export function validateSurahCoherenceSignalCreate(body: unknown): SchemaValidationResult<SurahCoherenceSignalCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.signal_type !== 'string' || !b.signal_type.trim()) return { error: 'signal_type is required and must be a non-empty string' };
  data.signal_type = b.signal_type.trim();
  if (typeof b.description !== 'string' || !b.description.trim()) return { error: 'description is required and must be a non-empty string' };
  data.description = b.description.trim();
  if ('ayahs_json' in b) {
    if (b.ayahs_json !== null && typeof b.ayahs_json !== 'string') return { error: 'ayahs_json must be a string or null' };
    data.ayahs_json = b.ayahs_json;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahCoherenceSignalCreate };
}

export function validateSurahClausePatternsUpsert(body: unknown): SchemaValidationResult<SurahClausePatternsUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('dominant_clause_type' in b) {
    if (b.dominant_clause_type !== null && typeof b.dominant_clause_type !== 'string') return { error: 'dominant_clause_type must be a string or null' };
    data.dominant_clause_type = b.dominant_clause_type;
  }
  if ('nominal_clause_pct' in b) {
    if (b.nominal_clause_pct !== null && (typeof b.nominal_clause_pct !== 'number' || !Number.isFinite(b.nominal_clause_pct))) return { error: 'nominal_clause_pct must be a number or null' };
    data.nominal_clause_pct = b.nominal_clause_pct;
  }
  if ('verbal_clause_pct' in b) {
    if (b.verbal_clause_pct !== null && (typeof b.verbal_clause_pct !== 'number' || !Number.isFinite(b.verbal_clause_pct))) return { error: 'verbal_clause_pct must be a number or null' };
    data.verbal_clause_pct = b.verbal_clause_pct;
  }
  if ('conditional_count' in b) {
    if (typeof b.conditional_count !== 'number' || !Number.isFinite(b.conditional_count)) return { error: 'conditional_count must be a number' };
    data.conditional_count = b.conditional_count;
  }
  if ('oath_count' in b) {
    if (typeof b.oath_count !== 'number' || !Number.isFinite(b.oath_count)) return { error: 'oath_count must be a number' };
    data.oath_count = b.oath_count;
  }
  if ('interrogative_count' in b) {
    if (typeof b.interrogative_count !== 'number' || !Number.isFinite(b.interrogative_count)) return { error: 'interrogative_count must be a number' };
    data.interrogative_count = b.interrogative_count;
  }
  if ('dominant_mood' in b) {
    if (b.dominant_mood !== null && typeof b.dominant_mood !== 'string') return { error: 'dominant_mood must be a string or null' };
    data.dominant_mood = b.dominant_mood;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahClausePatternsUpsert };
}

export function validateSurahRegisterShiftCreate(body: unknown): SchemaValidationResult<SurahRegisterShiftCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah_shift !== 'number' || !Number.isFinite(b.ayah_shift)) return { error: 'ayah_shift is required and must be a number' };
  data.ayah_shift = b.ayah_shift;
  if (typeof b.shift_axis !== 'string' || !b.shift_axis.trim()) return { error: 'shift_axis is required and must be a non-empty string' };
  data.shift_axis = b.shift_axis.trim();
  if ('from_state' in b) {
    if (b.from_state !== null && typeof b.from_state !== 'string') return { error: 'from_state must be a string or null' };
    data.from_state = b.from_state;
  }
  if ('to_state' in b) {
    if (b.to_state !== null && typeof b.to_state !== 'string') return { error: 'to_state must be a string or null' };
    data.to_state = b.to_state;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahRegisterShiftCreate };
}

export function validateSurahEllipsisPatternsUpsert(body: unknown): SchemaValidationResult<SurahEllipsisPatternsUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('dominant_ellipsis_type' in b) {
    if (b.dominant_ellipsis_type !== null && typeof b.dominant_ellipsis_type !== 'string') return { error: 'dominant_ellipsis_type must be a string or null' };
    data.dominant_ellipsis_type = b.dominant_ellipsis_type;
  }
  if ('total_ellipsis_count' in b) {
    if (typeof b.total_ellipsis_count !== 'number' || !Number.isFinite(b.total_ellipsis_count)) return { error: 'total_ellipsis_count must be a number' };
    data.total_ellipsis_count = b.total_ellipsis_count;
  }
  if ('typical_effect' in b) {
    if (b.typical_effect !== null && typeof b.typical_effect !== 'string') return { error: 'typical_effect must be a string or null' };
    data.typical_effect = b.typical_effect;
  }
  if ('notable_instances' in b) {
    if (b.notable_instances !== null && typeof b.notable_instances !== 'string') return { error: 'notable_instances must be a string or null' };
    data.notable_instances = b.notable_instances;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahEllipsisPatternsUpsert };
}
