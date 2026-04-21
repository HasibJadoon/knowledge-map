// ─── Bridge schemas & types ───────────────────────────────────────────────

export interface WvNodeQuranLink {
  id: string;
  node_id: string;
  qr_scope_ref: string;   // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvTermLink {
  id: string;
  entity_type: string;    // 'node'|'claim'|'moral_axis'|'topic'|'virtue'|'other'
  entity_id: string;
  al_concept_ref: string; // 'AL:<lemma_id>'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvEpisodeQuranLink {
  id: string;
  episode_id: string;
  qr_scope_ref: string;   // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvEvidenceScopeLink {
  id: string;
  evidence_id: string;
  scope_module: string;   // 'QR'|'AL'|'AR'|'CM'|'PL'
  scope_ref: string;      // typed ref
  link_role: string;
  created_at: string;
}

export interface WvDocLink {
  id: string;
  entity_type: string;
  entity_id: string;
  cm_doc_ref: string;     // 'CM:<doc_id>'
  link_role: string;
  note: string | null;
  created_at: string;
}

export interface NodeQuranLinkCreate {
  node_id: string;
  qr_scope_ref: string;
  link_type: string;
  note?: string | null;
}

export interface TermLinkCreate {
  entity_type: string;
  entity_id: string;
  al_concept_ref: string;
  link_type: string;
  note?: string | null;
}

export interface EpisodeQuranLinkCreate {
  episode_id: string;
  qr_scope_ref: string;
  link_type: string;
  note?: string | null;
}

export interface EvidenceScopeLinkCreate {
  evidence_id: string;
  scope_module: string;
  scope_ref: string;
  link_role?: string;
}

export interface DocLinkCreate {
  entity_type: string;
  entity_id: string;
  cm_doc_ref: string;
  link_role?: string;
  note?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateNodeQuranLinkCreate(body: unknown): SchemaValidationResult<NodeQuranLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.node_id !== 'string' || !b.node_id.trim()) return { error: 'node_id is required and must be a non-empty string' };
  data.node_id = b.node_id.trim();
  if (typeof b.qr_scope_ref !== 'string' || !b.qr_scope_ref.trim()) return { error: 'qr_scope_ref is required and must be a non-empty string' };
  data.qr_scope_ref = b.qr_scope_ref.trim();
  if (typeof b.link_type !== 'string' || !b.link_type.trim()) return { error: 'link_type is required and must be a non-empty string' };
  data.link_type = b.link_type.trim();
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as NodeQuranLinkCreate };
}

export function validateTermLinkCreate(body: unknown): SchemaValidationResult<TermLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.entity_type !== 'string' || !b.entity_type.trim()) return { error: 'entity_type is required and must be a non-empty string' };
  data.entity_type = b.entity_type.trim();
  if (typeof b.entity_id !== 'string' || !b.entity_id.trim()) return { error: 'entity_id is required and must be a non-empty string' };
  data.entity_id = b.entity_id.trim();
  if (typeof b.al_concept_ref !== 'string' || !b.al_concept_ref.trim()) return { error: 'al_concept_ref is required and must be a non-empty string' };
  data.al_concept_ref = b.al_concept_ref.trim();
  if (typeof b.link_type !== 'string' || !b.link_type.trim()) return { error: 'link_type is required and must be a non-empty string' };
  data.link_type = b.link_type.trim();
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as TermLinkCreate };
}

export function validateEpisodeQuranLinkCreate(body: unknown): SchemaValidationResult<EpisodeQuranLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.episode_id !== 'string' || !b.episode_id.trim()) return { error: 'episode_id is required and must be a non-empty string' };
  data.episode_id = b.episode_id.trim();
  if (typeof b.qr_scope_ref !== 'string' || !b.qr_scope_ref.trim()) return { error: 'qr_scope_ref is required and must be a non-empty string' };
  data.qr_scope_ref = b.qr_scope_ref.trim();
  if (typeof b.link_type !== 'string' || !b.link_type.trim()) return { error: 'link_type is required and must be a non-empty string' };
  data.link_type = b.link_type.trim();
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as EpisodeQuranLinkCreate };
}

export function validateEvidenceScopeLinkCreate(body: unknown): SchemaValidationResult<EvidenceScopeLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.evidence_id !== 'string' || !b.evidence_id.trim()) return { error: 'evidence_id is required and must be a non-empty string' };
  data.evidence_id = b.evidence_id.trim();
  if (typeof b.scope_module !== 'string' || !b.scope_module.trim()) return { error: 'scope_module is required and must be a non-empty string' };
  data.scope_module = b.scope_module.trim();
  if (typeof b.scope_ref !== 'string' || !b.scope_ref.trim()) return { error: 'scope_ref is required and must be a non-empty string' };
  data.scope_ref = b.scope_ref.trim();
  if ('link_role' in b) {
    if (typeof b.link_role !== 'string') return { error: 'link_role must be a string' };
    data.link_role = b.link_role;
  }

  return { data: data as unknown as EvidenceScopeLinkCreate };
}

export function validateDocLinkCreate(body: unknown): SchemaValidationResult<DocLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.entity_type !== 'string' || !b.entity_type.trim()) return { error: 'entity_type is required and must be a non-empty string' };
  data.entity_type = b.entity_type.trim();
  if (typeof b.entity_id !== 'string' || !b.entity_id.trim()) return { error: 'entity_id is required and must be a non-empty string' };
  data.entity_id = b.entity_id.trim();
  if (typeof b.cm_doc_ref !== 'string' || !b.cm_doc_ref.trim()) return { error: 'cm_doc_ref is required and must be a non-empty string' };
  data.cm_doc_ref = b.cm_doc_ref.trim();
  if ('link_role' in b) {
    if (typeof b.link_role !== 'string') return { error: 'link_role must be a string' };
    data.link_role = b.link_role;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as DocLinkCreate };
}
