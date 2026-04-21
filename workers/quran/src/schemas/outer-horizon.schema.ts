// ─── Outer Horizon schemas & types ───────────────────────────────────────────────

export interface ContextTopic {
  id: string;
  topic_key: string;
  topic_label: string;
  topic_domain: string;
  note_md: string | null;
  created_at: string;
}

export interface ContextTopicCreate {
  topic_key: string;
  topic_label: string;
  topic_domain: string;
  note_md?: string | null;
}

export interface ContextTopicLink {
  id: string;
  topic_id: string;
  scope_type: string;
  surah: number | null;
  scope_ref: string | null;
  relevance_note: string | null;
  created_at: string;
}

export interface ContextTopicLinkAdd {
  scope_type: string;
  surah?: number | null;
  scope_ref?: string | null;
  relevance_note?: string | null;
}

export interface ContextClaim {
  id: string;
  topic_id: string;
  claim_text: string;
  claim_type: string;
  confidence: string;
  note_md: string | null;
  created_at: string;
}

export interface ContextClaimCreate {
  topic_id: string;
  claim_text: string;
  claim_type?: string;
  confidence?: string;
  note_md?: string | null;
}

export interface ContextEvidenceItem {
  id: string;
  evidence_type: string;
  provenance: string | null;
  locator: string | null;
  content_text: string;
  is_disputed: number;
  dispute_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ContextEvidenceItemCreate {
  evidence_type: string;
  provenance?: string | null;
  locator?: string | null;
  content_text: string;
  is_disputed?: number;
  dispute_note?: string | null;
  note_md?: string | null;
}

export interface ContextEvidenceLink {
  claim_id: string;
  evidence_id: string;
  support_type: string;
}

export interface ContextEvidenceAdd {
  evidence_id: string;
  support_type?: string;
}

export interface HistoricalContextProfile {
  surah: number;
  arabian_milieu: string | null;
  political_context: string | null;
  late_antique_setting: string | null;
  inter_scriptural_env: string | null;
  note_md: string | null;
  created_at: string;
}

export interface HistoricalContextData {
  arabian_milieu?: string | null;
  political_context?: string | null;
  late_antique_setting?: string | null;
  inter_scriptural_env?: string | null;
  note_md?: string | null;
}

export interface AcademicQuestion {
  id: string;
  question_text: string;
  question_domain: string;
  linked_surah: number | null;
  debate_cluster_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AcademicQuestionCreate {
  question_text: string;
  question_domain: string;
  linked_surah?: number | null;
  debate_cluster_id?: string | null;
  note_md?: string | null;
}

export interface AcademicPosition {
  id: string;
  question_id: string;
  scholar_id: string | null;
  paradigm_id: string | null;
  position_text: string;
  evidence_ids_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AcademicPositionCreate {
  question_id: string;
  scholar_id?: string | null;
  paradigm_id?: string | null;
  position_text: string;
  evidence_ids_json?: string | null;
  note_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateContextTopicCreate(body: unknown): SchemaValidationResult<ContextTopicCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.topic_key !== 'string' || !b.topic_key.trim()) return { error: 'topic_key is required and must be a non-empty string' };
  data.topic_key = b.topic_key.trim();
  if (typeof b.topic_label !== 'string' || !b.topic_label.trim()) return { error: 'topic_label is required and must be a non-empty string' };
  data.topic_label = b.topic_label.trim();
  if (typeof b.topic_domain !== 'string' || !b.topic_domain.trim()) return { error: 'topic_domain is required and must be a non-empty string' };
  data.topic_domain = b.topic_domain.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ContextTopicCreate };
}

export function validateContextTopicLinkAdd(body: unknown): SchemaValidationResult<ContextTopicLinkAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if ('scope_ref' in b) {
    if (b.scope_ref !== null && typeof b.scope_ref !== 'string') return { error: 'scope_ref must be a string or null' };
    data.scope_ref = b.scope_ref;
  }
  if ('relevance_note' in b) {
    if (b.relevance_note !== null && typeof b.relevance_note !== 'string') return { error: 'relevance_note must be a string or null' };
    data.relevance_note = b.relevance_note;
  }

  return { data: data as unknown as ContextTopicLinkAdd };
}

export function validateContextClaimCreate(body: unknown): SchemaValidationResult<ContextClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.topic_id !== 'string' || !b.topic_id.trim()) return { error: 'topic_id is required and must be a non-empty string' };
  data.topic_id = b.topic_id.trim();
  if (typeof b.claim_text !== 'string' || !b.claim_text.trim()) return { error: 'claim_text is required and must be a non-empty string' };
  data.claim_text = b.claim_text.trim();
  if ('claim_type' in b) {
    if (typeof b.claim_type !== 'string') return { error: 'claim_type must be a string' };
    data.claim_type = b.claim_type;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'string') return { error: 'confidence must be a string' };
    data.confidence = b.confidence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ContextClaimCreate };
}

export function validateContextEvidenceItemCreate(body: unknown): SchemaValidationResult<ContextEvidenceItemCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.evidence_type !== 'string' || !b.evidence_type.trim()) return { error: 'evidence_type is required and must be a non-empty string' };
  data.evidence_type = b.evidence_type.trim();
  if ('provenance' in b) {
    if (b.provenance !== null && typeof b.provenance !== 'string') return { error: 'provenance must be a string or null' };
    data.provenance = b.provenance;
  }
  if ('locator' in b) {
    if (b.locator !== null && typeof b.locator !== 'string') return { error: 'locator must be a string or null' };
    data.locator = b.locator;
  }
  if (typeof b.content_text !== 'string' || !b.content_text.trim()) return { error: 'content_text is required and must be a non-empty string' };
  data.content_text = b.content_text.trim();
  if ('is_disputed' in b) {
    if (typeof b.is_disputed !== 'number' || !Number.isFinite(b.is_disputed)) return { error: 'is_disputed must be a number' };
    data.is_disputed = b.is_disputed;
  }
  if ('dispute_note' in b) {
    if (b.dispute_note !== null && typeof b.dispute_note !== 'string') return { error: 'dispute_note must be a string or null' };
    data.dispute_note = b.dispute_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ContextEvidenceItemCreate };
}

export function validateContextEvidenceAdd(body: unknown): SchemaValidationResult<ContextEvidenceAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.evidence_id !== 'string' || !b.evidence_id.trim()) return { error: 'evidence_id is required and must be a non-empty string' };
  data.evidence_id = b.evidence_id.trim();
  if ('support_type' in b) {
    if (typeof b.support_type !== 'string') return { error: 'support_type must be a string' };
    data.support_type = b.support_type;
  }

  return { data: data as unknown as ContextEvidenceAdd };
}

export function validateAcademicQuestionCreate(body: unknown): SchemaValidationResult<AcademicQuestionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.question_text !== 'string' || !b.question_text.trim()) return { error: 'question_text is required and must be a non-empty string' };
  data.question_text = b.question_text.trim();
  if (typeof b.question_domain !== 'string' || !b.question_domain.trim()) return { error: 'question_domain is required and must be a non-empty string' };
  data.question_domain = b.question_domain.trim();
  if ('linked_surah' in b) {
    if (b.linked_surah !== null && (typeof b.linked_surah !== 'number' || !Number.isFinite(b.linked_surah))) return { error: 'linked_surah must be a number or null' };
    data.linked_surah = b.linked_surah;
  }
  if ('debate_cluster_id' in b) {
    if (b.debate_cluster_id !== null && typeof b.debate_cluster_id !== 'string') return { error: 'debate_cluster_id must be a string or null' };
    data.debate_cluster_id = b.debate_cluster_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AcademicQuestionCreate };
}

export function validateAcademicPositionCreate(body: unknown): SchemaValidationResult<AcademicPositionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.question_id !== 'string' || !b.question_id.trim()) return { error: 'question_id is required and must be a non-empty string' };
  data.question_id = b.question_id.trim();
  if ('scholar_id' in b) {
    if (b.scholar_id !== null && typeof b.scholar_id !== 'string') return { error: 'scholar_id must be a string or null' };
    data.scholar_id = b.scholar_id;
  }
  if ('paradigm_id' in b) {
    if (b.paradigm_id !== null && typeof b.paradigm_id !== 'string') return { error: 'paradigm_id must be a string or null' };
    data.paradigm_id = b.paradigm_id;
  }
  if (typeof b.position_text !== 'string' || !b.position_text.trim()) return { error: 'position_text is required and must be a non-empty string' };
  data.position_text = b.position_text.trim();
  if ('evidence_ids_json' in b) {
    if (b.evidence_ids_json !== null && typeof b.evidence_ids_json !== 'string') return { error: 'evidence_ids_json must be a string or null' };
    data.evidence_ids_json = b.evidence_ids_json;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AcademicPositionCreate };
}
