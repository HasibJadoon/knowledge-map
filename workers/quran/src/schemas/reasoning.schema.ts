// ─── Reasoning schemas & types ───────────────────────────────────────────────

export interface AnalysisScope {
  id: string;
  scope_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  ref_id: string | null;
  label: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AnalysisScopeCreate {
  scope_type: string;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  ref_id?: string | null;
  label?: string | null;
  note_md?: string | null;
}

export interface AnalysisClaim {
  id: string;
  scope_id: string;
  claim_type: string;
  claim_text: string;
  claim_text_ar: string | null;
  confidence: string;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisClaimCreate {
  scope_id: string;
  claim_type: string;
  claim_text: string;
  claim_text_ar?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface AnalysisClaimPatch {
  claim_type?: string;
  claim_text?: string;
  claim_text_ar?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface ScopeNuance {
  id: string;
  scope_id: string;
  claim_id: string | null;
  nuance_type: string;
  nuance_text: string;
  nuance_text_ar: string | null;
  discourse_force: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeNuanceCreate {
  scope_id: string;
  claim_id?: string | null;
  nuance_type?: string;
  nuance_text: string;
  nuance_text_ar?: string | null;
  discourse_force?: string | null;
  note_md?: string | null;
}

export interface EvidenceItem {
  id: string;
  evidence_type: string;
  provenance: string | null;
  locator: string | null;
  content_text: string;
  content_text_ar: string | null;
  is_disputed: number;
  dispute_note: string | null;
  source_ref: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItemCreate {
  evidence_type: string;
  provenance?: string | null;
  locator?: string | null;
  content_text: string;
  content_text_ar?: string | null;
  is_disputed?: number;
  dispute_note?: string | null;
  source_ref?: string | null;
  note_md?: string | null;
}

export interface ClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  support_type: string;
  note_md: string | null;
  created_at: string;
}

export interface Argument {
  id: string;
  surah: number | null;
  title: string;
  title_ar: string | null;
  argument_type: string;
  summary_md: string;
  claims_json: string | null;
  evidence_ids_json: string | null;
  confidence: string;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArgumentCreate {
  surah?: number | null;
  title: string;
  title_ar?: string | null;
  argument_type?: string;
  summary_md: string;
  claims_json?: string | null;
  evidence_ids_json?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface ArgumentRelation {
  id: string;
  from_argument_id: string;
  to_argument_id: string;
  relation_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ArgumentRelationCreate {
  from_argument_id: string;
  to_argument_id: string;
  relation_type: string;
  note_md?: string | null;
}

export interface DebateCluster {
  id: string;
  surah: number | null;
  title_en: string;
  title_ar: string | null;
  cluster_type: string;
  scope_description: string | null;
  arguments_json: string | null;
  summary_md: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebateClusterCreate {
  surah?: number | null;
  title_en: string;
  title_ar?: string | null;
  cluster_type?: string;
  scope_description?: string | null;
  arguments_json?: string | null;
  summary_md?: string | null;
  note_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateAnalysisScopeCreate(body: unknown): SchemaValidationResult<AnalysisScopeCreate> {
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
  if ('ref_id' in b) {
    if (b.ref_id !== null && typeof b.ref_id !== 'string') return { error: 'ref_id must be a string or null' };
    data.ref_id = b.ref_id;
  }
  if ('label' in b) {
    if (b.label !== null && typeof b.label !== 'string') return { error: 'label must be a string or null' };
    data.label = b.label;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AnalysisScopeCreate };
}

export function validateAnalysisClaimCreate(body: unknown): SchemaValidationResult<AnalysisClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if (typeof b.claim_type !== 'string' || !b.claim_type.trim()) return { error: 'claim_type is required and must be a non-empty string' };
  data.claim_type = b.claim_type.trim();
  if (typeof b.claim_text !== 'string' || !b.claim_text.trim()) return { error: 'claim_text is required and must be a non-empty string' };
  data.claim_text = b.claim_text.trim();
  if ('claim_text_ar' in b) {
    if (b.claim_text_ar !== null && typeof b.claim_text_ar !== 'string') return { error: 'claim_text_ar must be a string or null' };
    data.claim_text_ar = b.claim_text_ar;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'string') return { error: 'confidence must be a string' };
    data.confidence = b.confidence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AnalysisClaimCreate };
}

export function validateAnalysisClaimPatch(body: unknown): SchemaValidationResult<AnalysisClaimPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('claim_type' in b) {
    if (typeof b.claim_type !== 'string') return { error: 'claim_type must be a string' };
    data.claim_type = b.claim_type;
  }
  if ('claim_text' in b) {
    if (typeof b.claim_text !== 'string') return { error: 'claim_text must be a string' };
    data.claim_text = b.claim_text;
  }
  if ('claim_text_ar' in b) {
    if (b.claim_text_ar !== null && typeof b.claim_text_ar !== 'string') return { error: 'claim_text_ar must be a string or null' };
    data.claim_text_ar = b.claim_text_ar;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'string') return { error: 'confidence must be a string' };
    data.confidence = b.confidence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AnalysisClaimPatch };
}

export function validateScopeNuanceCreate(body: unknown): SchemaValidationResult<ScopeNuanceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if ('claim_id' in b) {
    if (b.claim_id !== null && typeof b.claim_id !== 'string') return { error: 'claim_id must be a string or null' };
    data.claim_id = b.claim_id;
  }
  if ('nuance_type' in b) {
    if (typeof b.nuance_type !== 'string') return { error: 'nuance_type must be a string' };
    data.nuance_type = b.nuance_type;
  }
  if (typeof b.nuance_text !== 'string' || !b.nuance_text.trim()) return { error: 'nuance_text is required and must be a non-empty string' };
  data.nuance_text = b.nuance_text.trim();
  if ('nuance_text_ar' in b) {
    if (b.nuance_text_ar !== null && typeof b.nuance_text_ar !== 'string') return { error: 'nuance_text_ar must be a string or null' };
    data.nuance_text_ar = b.nuance_text_ar;
  }
  if ('discourse_force' in b) {
    if (b.discourse_force !== null && typeof b.discourse_force !== 'string') return { error: 'discourse_force must be a string or null' };
    data.discourse_force = b.discourse_force;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeNuanceCreate };
}

export function validateEvidenceItemCreate(body: unknown): SchemaValidationResult<EvidenceItemCreate> {
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
  if ('content_text_ar' in b) {
    if (b.content_text_ar !== null && typeof b.content_text_ar !== 'string') return { error: 'content_text_ar must be a string or null' };
    data.content_text_ar = b.content_text_ar;
  }
  if ('is_disputed' in b) {
    if (typeof b.is_disputed !== 'number' || !Number.isFinite(b.is_disputed)) return { error: 'is_disputed must be a number' };
    data.is_disputed = b.is_disputed;
  }
  if ('dispute_note' in b) {
    if (b.dispute_note !== null && typeof b.dispute_note !== 'string') return { error: 'dispute_note must be a string or null' };
    data.dispute_note = b.dispute_note;
  }
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as EvidenceItemCreate };
}

export function validateArgumentCreate(body: unknown): SchemaValidationResult<ArgumentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('argument_type' in b) {
    if (typeof b.argument_type !== 'string') return { error: 'argument_type must be a string' };
    data.argument_type = b.argument_type;
  }
  if (typeof b.summary_md !== 'string' || !b.summary_md.trim()) return { error: 'summary_md is required and must be a non-empty string' };
  data.summary_md = b.summary_md.trim();
  if ('claims_json' in b) {
    if (b.claims_json !== null && typeof b.claims_json !== 'string') return { error: 'claims_json must be a string or null' };
    data.claims_json = b.claims_json;
  }
  if ('evidence_ids_json' in b) {
    if (b.evidence_ids_json !== null && typeof b.evidence_ids_json !== 'string') return { error: 'evidence_ids_json must be a string or null' };
    data.evidence_ids_json = b.evidence_ids_json;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'string') return { error: 'confidence must be a string' };
    data.confidence = b.confidence;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArgumentCreate };
}

export function validateArgumentRelationCreate(body: unknown): SchemaValidationResult<ArgumentRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_argument_id !== 'string' || !b.from_argument_id.trim()) return { error: 'from_argument_id is required and must be a non-empty string' };
  data.from_argument_id = b.from_argument_id.trim();
  if (typeof b.to_argument_id !== 'string' || !b.to_argument_id.trim()) return { error: 'to_argument_id is required and must be a non-empty string' };
  data.to_argument_id = b.to_argument_id.trim();
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArgumentRelationCreate };
}

export function validateDebateClusterCreate(body: unknown): SchemaValidationResult<DebateClusterCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if (typeof b.title_en !== 'string' || !b.title_en.trim()) return { error: 'title_en is required and must be a non-empty string' };
  data.title_en = b.title_en.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('cluster_type' in b) {
    if (typeof b.cluster_type !== 'string') return { error: 'cluster_type must be a string' };
    data.cluster_type = b.cluster_type;
  }
  if ('scope_description' in b) {
    if (b.scope_description !== null && typeof b.scope_description !== 'string') return { error: 'scope_description must be a string or null' };
    data.scope_description = b.scope_description;
  }
  if ('arguments_json' in b) {
    if (b.arguments_json !== null && typeof b.arguments_json !== 'string') return { error: 'arguments_json must be a string or null' };
    data.arguments_json = b.arguments_json;
  }
  if ('summary_md' in b) {
    if (b.summary_md !== null && typeof b.summary_md !== 'string') return { error: 'summary_md must be a string or null' };
    data.summary_md = b.summary_md;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as DebateClusterCreate };
}
