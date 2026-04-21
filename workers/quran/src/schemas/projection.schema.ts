// ─── Projection schemas & types ───────────────────────────────────────────────

export interface WorldviewNode {
  id: string;
  surah: number | null;
  node_type: string;
  label_en: string;
  label_ar: string | null;
  summary_md: string | null;
  source_claim_id: string | null;
  wv_node_ref: string | null;
  created_at: string;
}

export interface WorldviewNodeCreate {
  surah?: number | null;
  node_type: string;
  label_en: string;
  label_ar?: string | null;
  summary_md?: string | null;
  source_claim_id?: string | null;
  wv_node_ref?: string | null;
}

export interface WorldviewEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note_md: string | null;
  created_at: string;
}

export interface WorldviewEdgeCreate {
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note_md?: string | null;
}

export interface DiagramSpec {
  id: string;
  spec_key: string;
  title: string;
  diagram_grammar: string;
  renderer_key: string;
  data_sources_json: string | null;
  description_md: string | null;
  created_at: string;
}

export interface DiagramSpecCreate {
  spec_key: string;
  title: string;
  diagram_grammar: string;
  renderer_key: string;
  data_sources_json?: string | null;
  description_md?: string | null;
}

export interface DiagramInstance {
  id: string;
  spec_id: string;
  scope_type: string;
  scope_ref: string;
  title: string | null;
  payload_json: string;
  generated_at: string;
  is_stale: number;
}

export interface DiagramInstanceCreate {
  spec_id: string;
  scope_type: string;
  scope_ref: string;
  title?: string | null;
  payload_json: string;
}

export interface DocLink {
  id: string;
  qr_scope_type: string;
  qr_scope_id: string;
  cm_doc_ref: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface DocLinkAdd {
  cm_doc_ref: string;
  link_type?: string;
  note_md?: string | null;
}

export interface SurahAnalysisCache {
  surah: number;
  cache_version: number;
  cache_generated_at: string | null;
  payload_json: string | null;
}

export interface PassageAnalysisCache {
  id: string;
  surah: number;
  passage_id: string;
  cache_version: number;
  cache_generated_at: string | null;
  payload_json: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateWorldviewNodeCreate(body: unknown): SchemaValidationResult<WorldviewNodeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('surah' in b) {
    if (b.surah !== null && (typeof b.surah !== 'number' || !Number.isFinite(b.surah))) return { error: 'surah must be a number or null' };
    data.surah = b.surah;
  }
  if (typeof b.node_type !== 'string' || !b.node_type.trim()) return { error: 'node_type is required and must be a non-empty string' };
  data.node_type = b.node_type.trim();
  if (typeof b.label_en !== 'string' || !b.label_en.trim()) return { error: 'label_en is required and must be a non-empty string' };
  data.label_en = b.label_en.trim();
  if ('label_ar' in b) {
    if (b.label_ar !== null && typeof b.label_ar !== 'string') return { error: 'label_ar must be a string or null' };
    data.label_ar = b.label_ar;
  }
  if ('summary_md' in b) {
    if (b.summary_md !== null && typeof b.summary_md !== 'string') return { error: 'summary_md must be a string or null' };
    data.summary_md = b.summary_md;
  }
  if ('source_claim_id' in b) {
    if (b.source_claim_id !== null && typeof b.source_claim_id !== 'string') return { error: 'source_claim_id must be a string or null' };
    data.source_claim_id = b.source_claim_id;
  }
  if ('wv_node_ref' in b) {
    if (b.wv_node_ref !== null && typeof b.wv_node_ref !== 'string') return { error: 'wv_node_ref must be a string or null' };
    data.wv_node_ref = b.wv_node_ref;
  }

  return { data: data as unknown as WorldviewNodeCreate };
}

export function validateWorldviewEdgeCreate(body: unknown): SchemaValidationResult<WorldviewEdgeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_node_id !== 'string' || !b.from_node_id.trim()) return { error: 'from_node_id is required and must be a non-empty string' };
  data.from_node_id = b.from_node_id.trim();
  if (typeof b.to_node_id !== 'string' || !b.to_node_id.trim()) return { error: 'to_node_id is required and must be a non-empty string' };
  data.to_node_id = b.to_node_id.trim();
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as WorldviewEdgeCreate };
}

export function validateDiagramSpecCreate(body: unknown): SchemaValidationResult<DiagramSpecCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.spec_key !== 'string' || !b.spec_key.trim()) return { error: 'spec_key is required and must be a non-empty string' };
  data.spec_key = b.spec_key.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if (typeof b.diagram_grammar !== 'string' || !b.diagram_grammar.trim()) return { error: 'diagram_grammar is required and must be a non-empty string' };
  data.diagram_grammar = b.diagram_grammar.trim();
  if (typeof b.renderer_key !== 'string' || !b.renderer_key.trim()) return { error: 'renderer_key is required and must be a non-empty string' };
  data.renderer_key = b.renderer_key.trim();
  if ('data_sources_json' in b) {
    if (b.data_sources_json !== null && typeof b.data_sources_json !== 'string') return { error: 'data_sources_json must be a string or null' };
    data.data_sources_json = b.data_sources_json;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as DiagramSpecCreate };
}

export function validateDiagramInstanceCreate(body: unknown): SchemaValidationResult<DiagramInstanceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.spec_id !== 'string' || !b.spec_id.trim()) return { error: 'spec_id is required and must be a non-empty string' };
  data.spec_id = b.spec_id.trim();
  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_ref !== 'string' || !b.scope_ref.trim()) return { error: 'scope_ref is required and must be a non-empty string' };
  data.scope_ref = b.scope_ref.trim();
  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if (typeof b.payload_json !== 'string' || !b.payload_json.trim()) return { error: 'payload_json is required and must be a non-empty string' };
  data.payload_json = b.payload_json.trim();

  return { data: data as unknown as DiagramInstanceCreate };
}

export function validateDocLinkAdd(body: unknown): SchemaValidationResult<DocLinkAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.cm_doc_ref !== 'string' || !b.cm_doc_ref.trim()) return { error: 'cm_doc_ref is required and must be a non-empty string' };
  data.cm_doc_ref = b.cm_doc_ref.trim();
  if ('link_type' in b) {
    if (typeof b.link_type !== 'string') return { error: 'link_type must be a string' };
    data.link_type = b.link_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as DocLinkAdd };
}
