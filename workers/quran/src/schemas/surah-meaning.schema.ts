// ─── Surah Meaning schemas & types ───────────────────────────────────────────────

export interface TopicRegistry {
  id: string;
  topic_key: string;
  topic_label_en: string;
  topic_label_ar: string | null;
  topic_domain: string;
  note_md: string | null;
  created_at: string;
}

export interface TopicRegistryCreate {
  topic_key: string;
  topic_label_en: string;
  topic_label_ar?: string | null;
  topic_domain: string;
  note_md?: string | null;
}

export interface ScopeTopic {
  id: string;
  topic_id: string;
  scope_type: string;
  surah: number;
  ayah_from: number | null;
  ayah_to: number | null;
  prominence: string;
  note_md: string | null;
  created_at: string;
}

export interface ScopeTopicCreate {
  topic_id: string;
  scope_type: string;
  surah: number;
  ayah_from?: number | null;
  ayah_to?: number | null;
  prominence?: string;
  note_md?: string | null;
}

export interface SurahTopicFlow {
  id: string;
  surah: number;
  flow_index: number;
  ayah_from: number;
  ayah_to: number;
  topic_label: string;
  topic_label_ar: string | null;
  flow_direction: string | null;
  transitions_from_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahTopicFlowCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  topic_label: string;
  topic_label_ar?: string | null;
  flow_direction?: string | null;
  transitions_from_id?: string | null;
  note_md?: string | null;
}

export interface SurahRhetoricProfile {
  surah: number;
  dominant_mode: string | null;
  clause_density: string | null;
  emphasis_patterns: string | null;
  suspension_use: string | null;
  contrast_patterns: string | null;
  rhetorical_devices: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahRhetoricProfileUpsert {
  dominant_mode?: string | null;
  clause_density?: string | null;
  emphasis_patterns?: string | null;
  suspension_use?: string | null;
  contrast_patterns?: string | null;
  rhetorical_devices?: string | null;
  note_md?: string | null;
}

export interface SurahThemeProfile {
  surah: number;
  primary_theme: string;
  secondary_themes: string | null;
  theological_axis: string | null;
  ethical_axis: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahThemeProfileUpsert {
  primary_theme?: string;
  secondary_themes?: string | null;
  theological_axis?: string | null;
  ethical_axis?: string | null;
  note_md?: string | null;
}

export interface SurahTheologyProfile {
  surah: number;
  divine_attributes: string | null;
  prophethood_aspects: string | null;
  eschatology_aspects: string | null;
  cosmology_aspects: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahTheologyProfileUpsert {
  divine_attributes?: string | null;
  prophethood_aspects?: string | null;
  eschatology_aspects?: string | null;
  cosmology_aspects?: string | null;
  note_md?: string | null;
}

export interface SurahWorldviewProfile {
  surah: number;
  anthropology_notes: string | null;
  value_architecture: string | null;
  moral_universe: string | null;
  divine_human_rel: string | null;
  worldview_tensions: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahWorldviewProfileUpsert {
  anthropology_notes?: string | null;
  value_architecture?: string | null;
  moral_universe?: string | null;
  divine_human_rel?: string | null;
  worldview_tensions?: string | null;
  note_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateTopicRegistryCreate(body: unknown): SchemaValidationResult<TopicRegistryCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.topic_key !== 'string' || !b.topic_key.trim()) return { error: 'topic_key is required and must be a non-empty string' };
  data.topic_key = b.topic_key.trim();
  if (typeof b.topic_label_en !== 'string' || !b.topic_label_en.trim()) return { error: 'topic_label_en is required and must be a non-empty string' };
  data.topic_label_en = b.topic_label_en.trim();
  if ('topic_label_ar' in b) {
    if (b.topic_label_ar !== null && typeof b.topic_label_ar !== 'string') return { error: 'topic_label_ar must be a string or null' };
    data.topic_label_ar = b.topic_label_ar;
  }
  if (typeof b.topic_domain !== 'string' || !b.topic_domain.trim()) return { error: 'topic_domain is required and must be a non-empty string' };
  data.topic_domain = b.topic_domain.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as TopicRegistryCreate };
}

export function validateScopeTopicCreate(body: unknown): SchemaValidationResult<ScopeTopicCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.topic_id !== 'string' || !b.topic_id.trim()) return { error: 'topic_id is required and must be a non-empty string' };
  data.topic_id = b.topic_id.trim();
  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if ('ayah_from' in b) {
    if (b.ayah_from !== null && (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from))) return { error: 'ayah_from must be a number or null' };
    data.ayah_from = b.ayah_from;
  }
  if ('ayah_to' in b) {
    if (b.ayah_to !== null && (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to))) return { error: 'ayah_to must be a number or null' };
    data.ayah_to = b.ayah_to;
  }
  if ('prominence' in b) {
    if (typeof b.prominence !== 'string') return { error: 'prominence must be a string' };
    data.prominence = b.prominence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeTopicCreate };
}

export function validateSurahTopicFlowCreate(body: unknown): SchemaValidationResult<SurahTopicFlowCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from is required and must be a number' };
  data.ayah_from = b.ayah_from;
  if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to is required and must be a number' };
  data.ayah_to = b.ayah_to;
  if (typeof b.topic_label !== 'string' || !b.topic_label.trim()) return { error: 'topic_label is required and must be a non-empty string' };
  data.topic_label = b.topic_label.trim();
  if ('topic_label_ar' in b) {
    if (b.topic_label_ar !== null && typeof b.topic_label_ar !== 'string') return { error: 'topic_label_ar must be a string or null' };
    data.topic_label_ar = b.topic_label_ar;
  }
  if ('flow_direction' in b) {
    if (b.flow_direction !== null && typeof b.flow_direction !== 'string') return { error: 'flow_direction must be a string or null' };
    data.flow_direction = b.flow_direction;
  }
  if ('transitions_from_id' in b) {
    if (b.transitions_from_id !== null && typeof b.transitions_from_id !== 'string') return { error: 'transitions_from_id must be a string or null' };
    data.transitions_from_id = b.transitions_from_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahTopicFlowCreate };
}

export function validateSurahRhetoricProfileUpsert(body: unknown): SchemaValidationResult<SurahRhetoricProfileUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('dominant_mode' in b) {
    if (b.dominant_mode !== null && typeof b.dominant_mode !== 'string') return { error: 'dominant_mode must be a string or null' };
    data.dominant_mode = b.dominant_mode;
  }
  if ('clause_density' in b) {
    if (b.clause_density !== null && typeof b.clause_density !== 'string') return { error: 'clause_density must be a string or null' };
    data.clause_density = b.clause_density;
  }
  if ('emphasis_patterns' in b) {
    if (b.emphasis_patterns !== null && typeof b.emphasis_patterns !== 'string') return { error: 'emphasis_patterns must be a string or null' };
    data.emphasis_patterns = b.emphasis_patterns;
  }
  if ('suspension_use' in b) {
    if (b.suspension_use !== null && typeof b.suspension_use !== 'string') return { error: 'suspension_use must be a string or null' };
    data.suspension_use = b.suspension_use;
  }
  if ('contrast_patterns' in b) {
    if (b.contrast_patterns !== null && typeof b.contrast_patterns !== 'string') return { error: 'contrast_patterns must be a string or null' };
    data.contrast_patterns = b.contrast_patterns;
  }
  if ('rhetorical_devices' in b) {
    if (b.rhetorical_devices !== null && typeof b.rhetorical_devices !== 'string') return { error: 'rhetorical_devices must be a string or null' };
    data.rhetorical_devices = b.rhetorical_devices;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahRhetoricProfileUpsert };
}

export function validateSurahThemeProfileUpsert(body: unknown): SchemaValidationResult<SurahThemeProfileUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('primary_theme' in b) {
    if (typeof b.primary_theme !== 'string') return { error: 'primary_theme must be a string' };
    data.primary_theme = b.primary_theme;
  }
  if ('secondary_themes' in b) {
    if (b.secondary_themes !== null && typeof b.secondary_themes !== 'string') return { error: 'secondary_themes must be a string or null' };
    data.secondary_themes = b.secondary_themes;
  }
  if ('theological_axis' in b) {
    if (b.theological_axis !== null && typeof b.theological_axis !== 'string') return { error: 'theological_axis must be a string or null' };
    data.theological_axis = b.theological_axis;
  }
  if ('ethical_axis' in b) {
    if (b.ethical_axis !== null && typeof b.ethical_axis !== 'string') return { error: 'ethical_axis must be a string or null' };
    data.ethical_axis = b.ethical_axis;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahThemeProfileUpsert };
}

export function validateSurahTheologyProfileUpsert(body: unknown): SchemaValidationResult<SurahTheologyProfileUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('divine_attributes' in b) {
    if (b.divine_attributes !== null && typeof b.divine_attributes !== 'string') return { error: 'divine_attributes must be a string or null' };
    data.divine_attributes = b.divine_attributes;
  }
  if ('prophethood_aspects' in b) {
    if (b.prophethood_aspects !== null && typeof b.prophethood_aspects !== 'string') return { error: 'prophethood_aspects must be a string or null' };
    data.prophethood_aspects = b.prophethood_aspects;
  }
  if ('eschatology_aspects' in b) {
    if (b.eschatology_aspects !== null && typeof b.eschatology_aspects !== 'string') return { error: 'eschatology_aspects must be a string or null' };
    data.eschatology_aspects = b.eschatology_aspects;
  }
  if ('cosmology_aspects' in b) {
    if (b.cosmology_aspects !== null && typeof b.cosmology_aspects !== 'string') return { error: 'cosmology_aspects must be a string or null' };
    data.cosmology_aspects = b.cosmology_aspects;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahTheologyProfileUpsert };
}

export function validateSurahWorldviewProfileUpsert(body: unknown): SchemaValidationResult<SurahWorldviewProfileUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('anthropology_notes' in b) {
    if (b.anthropology_notes !== null && typeof b.anthropology_notes !== 'string') return { error: 'anthropology_notes must be a string or null' };
    data.anthropology_notes = b.anthropology_notes;
  }
  if ('value_architecture' in b) {
    if (b.value_architecture !== null && typeof b.value_architecture !== 'string') return { error: 'value_architecture must be a string or null' };
    data.value_architecture = b.value_architecture;
  }
  if ('moral_universe' in b) {
    if (b.moral_universe !== null && typeof b.moral_universe !== 'string') return { error: 'moral_universe must be a string or null' };
    data.moral_universe = b.moral_universe;
  }
  if ('divine_human_rel' in b) {
    if (b.divine_human_rel !== null && typeof b.divine_human_rel !== 'string') return { error: 'divine_human_rel must be a string or null' };
    data.divine_human_rel = b.divine_human_rel;
  }
  if ('worldview_tensions' in b) {
    if (b.worldview_tensions !== null && typeof b.worldview_tensions !== 'string') return { error: 'worldview_tensions must be a string or null' };
    data.worldview_tensions = b.worldview_tensions;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahWorldviewProfileUpsert };
}
