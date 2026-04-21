// ─── Cross Surah schemas & types ───────────────────────────────────────────────

export interface SurahRelation {
  id: string;
  surah_a: number;
  surah_b: number;
  relation_type: string;
  description: string | null;
  evidence_summary: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahRelationCreate {
  surah_a: number;
  surah_b: number;
  relation_type: string;
  description?: string | null;
  evidence_summary?: string | null;
  note_md?: string | null;
}

export interface QbqRelation {
  id: string;
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  relation_type: string;
  scholar_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface QbqRelationCreate {
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  relation_type: string;
  scholar_ref?: string | null;
  note_md?: string | null;
}

export interface TraditionSource {
  id: string;
  tradition_name: string;
  source_text: string;
  source_content: string | null;
  relevance_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface TraditionSourceCreate {
  tradition_name: string;
  source_text: string;
  source_content?: string | null;
  relevance_note?: string | null;
  note_md?: string | null;
}

export interface ComparativeClaim {
  id: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  tradition_source_id: string | null;
  claim_type: string;
  claim_text: string;
  evidence_ids_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ComparativeClaimCreate {
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  tradition_source_id?: string | null;
  claim_type?: string;
  claim_text: string;
  evidence_ids_json?: string | null;
  note_md?: string | null;
}

export interface CivilizationalClaim {
  id: string;
  surah: number | null;
  topic: string;
  claim_text: string;
  civilization_context: string | null;
  debate_cluster_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface CivilizationalClaimCreate {
  surah?: number | null;
  topic: string;
  claim_text: string;
  civilization_context?: string | null;
  debate_cluster_id?: string | null;
  note_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSurahRelationCreate(body: unknown): SchemaValidationResult<SurahRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah_a !== 'number' || !Number.isFinite(b.surah_a)) return { error: 'surah_a is required and must be a number' };
  data.surah_a = b.surah_a;
  if (typeof b.surah_b !== 'number' || !Number.isFinite(b.surah_b)) return { error: 'surah_b is required and must be a number' };
  data.surah_b = b.surah_b;
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('evidence_summary' in b) {
    if (b.evidence_summary !== null && typeof b.evidence_summary !== 'string') return { error: 'evidence_summary must be a string or null' };
    data.evidence_summary = b.evidence_summary;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SurahRelationCreate };
}

export function validateQbqRelationCreate(body: unknown): SchemaValidationResult<QbqRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_surah !== 'number' || !Number.isFinite(b.from_surah)) return { error: 'from_surah is required and must be a number' };
  data.from_surah = b.from_surah;
  if (typeof b.from_ayah !== 'number' || !Number.isFinite(b.from_ayah)) return { error: 'from_ayah is required and must be a number' };
  data.from_ayah = b.from_ayah;
  if (typeof b.to_surah !== 'number' || !Number.isFinite(b.to_surah)) return { error: 'to_surah is required and must be a number' };
  data.to_surah = b.to_surah;
  if (typeof b.to_ayah !== 'number' || !Number.isFinite(b.to_ayah)) return { error: 'to_ayah is required and must be a number' };
  data.to_ayah = b.to_ayah;
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('scholar_ref' in b) {
    if (b.scholar_ref !== null && typeof b.scholar_ref !== 'string') return { error: 'scholar_ref must be a string or null' };
    data.scholar_ref = b.scholar_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as QbqRelationCreate };
}

export function validateTraditionSourceCreate(body: unknown): SchemaValidationResult<TraditionSourceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.tradition_name !== 'string' || !b.tradition_name.trim()) return { error: 'tradition_name is required and must be a non-empty string' };
  data.tradition_name = b.tradition_name.trim();
  if (typeof b.source_text !== 'string' || !b.source_text.trim()) return { error: 'source_text is required and must be a non-empty string' };
  data.source_text = b.source_text.trim();
  if ('source_content' in b) {
    if (b.source_content !== null && typeof b.source_content !== 'string') return { error: 'source_content must be a string or null' };
    data.source_content = b.source_content;
  }
  if ('relevance_note' in b) {
    if (b.relevance_note !== null && typeof b.relevance_note !== 'string') return { error: 'relevance_note must be a string or null' };
    data.relevance_note = b.relevance_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as TraditionSourceCreate };
}

export function validateComparativeClaimCreate(body: unknown): SchemaValidationResult<ComparativeClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

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
  if ('tradition_source_id' in b) {
    if (b.tradition_source_id !== null && typeof b.tradition_source_id !== 'string') return { error: 'tradition_source_id must be a string or null' };
    data.tradition_source_id = b.tradition_source_id;
  }
  if ('claim_type' in b) {
    if (typeof b.claim_type !== 'string') return { error: 'claim_type must be a string' };
    data.claim_type = b.claim_type;
  }
  if (typeof b.claim_text !== 'string' || !b.claim_text.trim()) return { error: 'claim_text is required and must be a non-empty string' };
  data.claim_text = b.claim_text.trim();
  if ('evidence_ids_json' in b) {
    if (b.evidence_ids_json !== null && typeof b.evidence_ids_json !== 'string') return { error: 'evidence_ids_json must be a string or null' };
    data.evidence_ids_json = b.evidence_ids_json;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ComparativeClaimCreate };
}

export function validateCivilizationalClaimCreate(body: unknown): SchemaValidationResult<CivilizationalClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if (typeof b.topic !== 'string' || !b.topic.trim()) return { error: 'topic is required and must be a non-empty string' };
  data.topic = b.topic.trim();
  if (typeof b.claim_text !== 'string' || !b.claim_text.trim()) return { error: 'claim_text is required and must be a non-empty string' };
  data.claim_text = b.claim_text.trim();
  if ('civilization_context' in b) {
    if (b.civilization_context !== null && typeof b.civilization_context !== 'string') return { error: 'civilization_context must be a string or null' };
    data.civilization_context = b.civilization_context;
  }
  if ('debate_cluster_id' in b) {
    if (b.debate_cluster_id !== null && typeof b.debate_cluster_id !== 'string') return { error: 'debate_cluster_id must be a string or null' };
    data.debate_cluster_id = b.debate_cluster_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as CivilizationalClaimCreate };
}
