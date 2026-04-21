// ─── Al Source schemas & types ───────────────────────────────────────────────

export interface AlSource {
  id: string;
  title_ar: string;
  title_en: string | null;
  source_type: string;
  author_ref: string | null;
  author_name: string | null;
  period_label: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AlSourceCreate {
  title_ar: string;
  title_en?: string | null;
  source_type?: string;
  author_ref?: string | null;
  author_name?: string | null;
  period_label?: string | null;
  note_md?: string | null;
}

export type AlSourcePatch = Partial<AlSourceCreate>;

export interface AlSourceEdition {
  id: string;
  source_id: string;
  edition_label: string;
  publisher: string | null;
  year: string | null;
  volume_count: number | null;
  note_md: string | null;
}

export interface AlSourceEditionCreate {
  source_id: string;
  edition_label: string;
  publisher?: string | null;
  year?: string | null;
  volume_count?: number | null;
  note_md?: string | null;
}

export interface AlSourceChunk {
  id: string;
  source_id: string;
  edition_id: string | null;
  chunk_kind: string | null;
  chunk_seq: number;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  tokens_approx: number | null;
  is_embedded: number;
  qdrant_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface AlSourceChunkCreate {
  source_id: string;
  edition_id?: string | null;
  chunk_kind?: string | null;
  chunk_seq: number;
  heading_norm?: string | null;
  text_ar: string;
  text_en?: string | null;
  page_no?: number | null;
  volume_no?: number | null;
  tokens_approx?: number | null;
  meta_json?: string | null;
}

export interface AlSourceToc {
  id: string;
  source_id: string;
  parent_id: string | null;
  title_ar: string;
  title_en: string | null;
  level: number;
  seq: number;
  page_start: number | null;
}

export interface AlSourceTocCreate {
  source_id: string;
  parent_id?: string | null;
  title_ar: string;
  title_en?: string | null;
  level?: number;
  seq: number;
  page_start?: number | null;
}

export interface AlEvidenceItem {
  id: string;
  evidence_type: string;
  text_ar: string;
  text_en: string | null;
  qr_ref: string | null;
  source_ref: string | null;
  locator_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AlEvidenceItemCreate {
  evidence_type: string;
  text_ar: string;
  text_en?: string | null;
  qr_ref?: string | null;
  source_ref?: string | null;
  locator_json?: string | null;
  note_md?: string | null;
}

export interface AlToken {
  id: string;
  token_text: string;
  token_text_bare: string | null;
  lemma_id: string | null;
  part_of_speech: string | null;
  source_ref: string | null;
  page_no: number | null;
  note_md: string | null;
  created_at: string;
}

export interface AlTokenCreate {
  token_text: string;
  token_text_bare?: string | null;
  lemma_id?: string | null;
  part_of_speech?: string | null;
  source_ref?: string | null;
  page_no?: number | null;
  note_md?: string | null;
}

export interface AlSentence {
  id: string;
  source_ref: string;
  sentence_text: string;
  sentence_text_bare: string | null;
  sentence_type: string;
  irab_json: string | null;
  tree_json: string | null;
  page_no: number | null;
  tokens_json: string | null;
  created_at: string;
}

export interface AlSentenceCreate {
  source_ref: string;
  sentence_text: string;
  sentence_text_bare?: string | null;
  sentence_type?: string;
  irab_json?: string | null;
  tree_json?: string | null;
  page_no?: number | null;
  tokens_json?: string | null;
}

export interface TokenLexiconLink {
  id: string;
  token_id: string;
  lexicon_entry_id: string;
  confidence: number;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateAlSourceCreate(body: unknown): SchemaValidationResult<AlSourceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title_ar !== 'string' || !b.title_ar.trim()) return { error: 'title_ar is required and must be a non-empty string' };
  data.title_ar = b.title_ar.trim();
  if ('title_en' in b) {
    if (b.title_en !== null && typeof b.title_en !== 'string') return { error: 'title_en must be a string or null' };
    data.title_en = b.title_en;
  }
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if ('author_ref' in b) {
    if (b.author_ref !== null && typeof b.author_ref !== 'string') return { error: 'author_ref must be a string or null' };
    data.author_ref = b.author_ref;
  }
  if ('author_name' in b) {
    if (b.author_name !== null && typeof b.author_name !== 'string') return { error: 'author_name must be a string or null' };
    data.author_name = b.author_name;
  }
  if ('period_label' in b) {
    if (b.period_label !== null && typeof b.period_label !== 'string') return { error: 'period_label must be a string or null' };
    data.period_label = b.period_label;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AlSourceCreate };
}

export function validateAlSourceEditionCreate(body: unknown): SchemaValidationResult<AlSourceEditionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if (typeof b.edition_label !== 'string' || !b.edition_label.trim()) return { error: 'edition_label is required and must be a non-empty string' };
  data.edition_label = b.edition_label.trim();
  if ('publisher' in b) {
    if (b.publisher !== null && typeof b.publisher !== 'string') return { error: 'publisher must be a string or null' };
    data.publisher = b.publisher;
  }
  if ('year' in b) {
    if (b.year !== null && typeof b.year !== 'string') return { error: 'year must be a string or null' };
    data.year = b.year;
  }
  if ('volume_count' in b) {
    if (b.volume_count !== null && (typeof b.volume_count !== 'number' || !Number.isFinite(b.volume_count))) return { error: 'volume_count must be a number or null' };
    data.volume_count = b.volume_count;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AlSourceEditionCreate };
}

export function validateAlSourceChunkCreate(body: unknown): SchemaValidationResult<AlSourceChunkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('edition_id' in b) {
    if (b.edition_id !== null && typeof b.edition_id !== 'string') return { error: 'edition_id must be a string or null' };
    data.edition_id = b.edition_id;
  }
  if ('chunk_kind' in b) {
    if (b.chunk_kind !== null && typeof b.chunk_kind !== 'string') return { error: 'chunk_kind must be a string or null' };
    data.chunk_kind = b.chunk_kind;
  }
  if (typeof b.chunk_seq !== 'number' || !Number.isFinite(b.chunk_seq)) return { error: 'chunk_seq is required and must be a number' };
  data.chunk_seq = b.chunk_seq;
  if ('heading_norm' in b) {
    if (b.heading_norm !== null && typeof b.heading_norm !== 'string') return { error: 'heading_norm must be a string or null' };
    data.heading_norm = b.heading_norm;
  }
  if (typeof b.text_ar !== 'string' || !b.text_ar.trim()) return { error: 'text_ar is required and must be a non-empty string' };
  data.text_ar = b.text_ar.trim();
  if ('text_en' in b) {
    if (b.text_en !== null && typeof b.text_en !== 'string') return { error: 'text_en must be a string or null' };
    data.text_en = b.text_en;
  }
  if ('page_no' in b) {
    if (b.page_no !== null && (typeof b.page_no !== 'number' || !Number.isFinite(b.page_no))) return { error: 'page_no must be a number or null' };
    data.page_no = b.page_no;
  }
  if ('volume_no' in b) {
    if (b.volume_no !== null && (typeof b.volume_no !== 'number' || !Number.isFinite(b.volume_no))) return { error: 'volume_no must be a number or null' };
    data.volume_no = b.volume_no;
  }
  if ('tokens_approx' in b) {
    if (b.tokens_approx !== null && (typeof b.tokens_approx !== 'number' || !Number.isFinite(b.tokens_approx))) return { error: 'tokens_approx must be a number or null' };
    data.tokens_approx = b.tokens_approx;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as AlSourceChunkCreate };
}

export function validateAlSourceTocCreate(body: unknown): SchemaValidationResult<AlSourceTocCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if (typeof b.title_ar !== 'string' || !b.title_ar.trim()) return { error: 'title_ar is required and must be a non-empty string' };
  data.title_ar = b.title_ar.trim();
  if ('title_en' in b) {
    if (b.title_en !== null && typeof b.title_en !== 'string') return { error: 'title_en must be a string or null' };
    data.title_en = b.title_en;
  }
  if ('level' in b) {
    if (typeof b.level !== 'number' || !Number.isFinite(b.level)) return { error: 'level must be a number' };
    data.level = b.level;
  }
  if (typeof b.seq !== 'number' || !Number.isFinite(b.seq)) return { error: 'seq is required and must be a number' };
  data.seq = b.seq;
  if ('page_start' in b) {
    if (b.page_start !== null && (typeof b.page_start !== 'number' || !Number.isFinite(b.page_start))) return { error: 'page_start must be a number or null' };
    data.page_start = b.page_start;
  }

  return { data: data as unknown as AlSourceTocCreate };
}

export function validateAlEvidenceItemCreate(body: unknown): SchemaValidationResult<AlEvidenceItemCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.evidence_type !== 'string' || !b.evidence_type.trim()) return { error: 'evidence_type is required and must be a non-empty string' };
  data.evidence_type = b.evidence_type.trim();
  if (typeof b.text_ar !== 'string' || !b.text_ar.trim()) return { error: 'text_ar is required and must be a non-empty string' };
  data.text_ar = b.text_ar.trim();
  if ('text_en' in b) {
    if (b.text_en !== null && typeof b.text_en !== 'string') return { error: 'text_en must be a string or null' };
    data.text_en = b.text_en;
  }
  if ('qr_ref' in b) {
    if (b.qr_ref !== null && typeof b.qr_ref !== 'string') return { error: 'qr_ref must be a string or null' };
    data.qr_ref = b.qr_ref;
  }
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }
  if ('locator_json' in b) {
    if (b.locator_json !== null && typeof b.locator_json !== 'string') return { error: 'locator_json must be a string or null' };
    data.locator_json = b.locator_json;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AlEvidenceItemCreate };
}

export function validateAlTokenCreate(body: unknown): SchemaValidationResult<AlTokenCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.token_text !== 'string' || !b.token_text.trim()) return { error: 'token_text is required and must be a non-empty string' };
  data.token_text = b.token_text.trim();
  if ('token_text_bare' in b) {
    if (b.token_text_bare !== null && typeof b.token_text_bare !== 'string') return { error: 'token_text_bare must be a string or null' };
    data.token_text_bare = b.token_text_bare;
  }
  if ('lemma_id' in b) {
    if (b.lemma_id !== null && typeof b.lemma_id !== 'string') return { error: 'lemma_id must be a string or null' };
    data.lemma_id = b.lemma_id;
  }
  if ('part_of_speech' in b) {
    if (b.part_of_speech !== null && typeof b.part_of_speech !== 'string') return { error: 'part_of_speech must be a string or null' };
    data.part_of_speech = b.part_of_speech;
  }
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }
  if ('page_no' in b) {
    if (b.page_no !== null && (typeof b.page_no !== 'number' || !Number.isFinite(b.page_no))) return { error: 'page_no must be a number or null' };
    data.page_no = b.page_no;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as AlTokenCreate };
}

export function validateAlSentenceCreate(body: unknown): SchemaValidationResult<AlSentenceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_ref !== 'string' || !b.source_ref.trim()) return { error: 'source_ref is required and must be a non-empty string' };
  data.source_ref = b.source_ref.trim();
  if (typeof b.sentence_text !== 'string' || !b.sentence_text.trim()) return { error: 'sentence_text is required and must be a non-empty string' };
  data.sentence_text = b.sentence_text.trim();
  if ('sentence_text_bare' in b) {
    if (b.sentence_text_bare !== null && typeof b.sentence_text_bare !== 'string') return { error: 'sentence_text_bare must be a string or null' };
    data.sentence_text_bare = b.sentence_text_bare;
  }
  if ('sentence_type' in b) {
    if (typeof b.sentence_type !== 'string') return { error: 'sentence_type must be a string' };
    data.sentence_type = b.sentence_type;
  }
  if ('irab_json' in b) {
    if (b.irab_json !== null && typeof b.irab_json !== 'string') return { error: 'irab_json must be a string or null' };
    data.irab_json = b.irab_json;
  }
  if ('tree_json' in b) {
    if (b.tree_json !== null && typeof b.tree_json !== 'string') return { error: 'tree_json must be a string or null' };
    data.tree_json = b.tree_json;
  }
  if ('page_no' in b) {
    if (b.page_no !== null && (typeof b.page_no !== 'number' || !Number.isFinite(b.page_no))) return { error: 'page_no must be a number or null' };
    data.page_no = b.page_no;
  }
  if ('tokens_json' in b) {
    if (b.tokens_json !== null && typeof b.tokens_json !== 'string') return { error: 'tokens_json must be a string or null' };
    data.tokens_json = b.tokens_json;
  }

  return { data: data as unknown as AlSentenceCreate };
}

export function validateAlSourcePatch(body: unknown): SchemaValidationResult<AlSourcePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as AlSourcePatch };
}
