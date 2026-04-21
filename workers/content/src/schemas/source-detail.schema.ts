// ─── Source Detail, TOC, Unit & Chunk schemas & types ────────────────────────

export interface CmSourceDetail {
  detail_id: string;
  source_id: string;
  author_names_json: string | null;
  editor_names_json: string | null;
  publisher: string | null;
  publication_year: number | null;
  edition: string | null;
  isbn: string | null;
  doi: string | null;
  url: string | null;
  pages_total: number | null;
  language_original: string | null;
  translator_names_json: string | null;
  series_title: string | null;
  volume: string | null;
  issue: string | null;
  abstract: string | null;
  keywords_json: string | null;
  meta_json: string | null;
}

export interface CmSourceToc {
  toc_id: string;             // CM:ULID
  source_id: string;
  parent_toc_id: string | null;
  seq_order: number;
  depth: number;
  heading_text: string;
  heading_ar: string | null;
  page_start: number | null;
  page_end: number | null;
  unit_id: string | null;
  meta_json: string | null;
}

export interface CmSourceUnit {
  unit_id: string;            // CM:ULID
  source_id: string;
  parent_unit_id: string | null;
  toc_id: string | null;
  unit_type: 'volume' | 'chapter' | 'section' | 'paragraph' | 'other';
  seq_order: number;
  depth: number;
  heading: string | null;
  heading_ar: string | null;
  page_start: number | null;
  page_end: number | null;
  word_count: number | null;
  body_text: string | null;
  body_ar: string | null;
  summary: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface CmSourceChunk {
  chunk_id: string;           // CM:ULID
  source_id: string;
  unit_id: string | null;
  chunk_index: number;
  chunk_kind: string | null;
  page_no: number | null;
  heading_norm: string | null;
  text_content: string;
  token_count: number | null;
  is_embedded: boolean;
  qdrant_id: string | null;
  embed_model: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface CmSourceDetailUpsert {
  author_names_json?: string;
  editor_names_json?: string;
  publisher?: string;
  publication_year?: number;
  edition?: string;
  isbn?: string;
  doi?: string;
  url?: string;
  pages_total?: number;
  language_original?: string;
  translator_names_json?: string;
  series_title?: string;
  volume?: string;
  issue?: string;
  abstract?: string;
  keywords_json?: string;
  meta_json?: string;
}

export interface CmSourceTocCreate {
  source_id: string;
  heading_text: string;
  seq_order?: number;
  depth?: number;
  page_start?: number;
  page_end?: number;
  parent_toc_id?: string;
  heading_ar?: string;
  unit_id?: string;
  meta_json?: string;
}

export interface CmSourceUnitCreate {
  source_id: string;
  unit_type?: 'volume' | 'chapter' | 'section' | 'paragraph' | 'other';
  heading?: string;
  heading_ar?: string;
  seq_order?: number;
  depth?: number;
  page_start?: number;
  page_end?: number;
  body_text?: string;
  body_ar?: string;
  summary?: string;
  word_count?: number;
  parent_unit_id?: string;
  toc_id?: string;
  meta_json?: string;
}

export function validateCmSourceUnitCreate(
  body: unknown
): { data: CmSourceUnitCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['source_id'] !== 'string' || b['source_id'].trim() === '') {
    return { error: 'source_id is required and must be a string' };
  }

  const validUnitTypes = ['volume', 'chapter', 'section', 'paragraph', 'other'];
  if (b['unit_type'] !== undefined && !validUnitTypes.includes(b['unit_type'] as string)) {
    return { error: `unit_type must be one of: ${validUnitTypes.join(', ')}` };
  }

  if (b['seq_order'] !== undefined && typeof b['seq_order'] !== 'number') {
    return { error: 'seq_order must be a number' };
  }
  if (b['depth'] !== undefined && typeof b['depth'] !== 'number') {
    return { error: 'depth must be a number' };
  }
  if (b['page_start'] !== undefined && typeof b['page_start'] !== 'number') {
    return { error: 'page_start must be a number' };
  }
  if (b['page_end'] !== undefined && typeof b['page_end'] !== 'number') {
    return { error: 'page_end must be a number' };
  }
  if (b['word_count'] !== undefined && typeof b['word_count'] !== 'number') {
    return { error: 'word_count must be a number' };
  }

  return {
    data: {
      source_id: b['source_id'] as string,
      ...(b['unit_type'] !== undefined && { unit_type: b['unit_type'] as CmSourceUnitCreate['unit_type'] }),
      ...(b['heading'] !== undefined && { heading: b['heading'] as string }),
      ...(b['heading_ar'] !== undefined && { heading_ar: b['heading_ar'] as string }),
      ...(b['seq_order'] !== undefined && { seq_order: b['seq_order'] as number }),
      ...(b['depth'] !== undefined && { depth: b['depth'] as number }),
      ...(b['page_start'] !== undefined && { page_start: b['page_start'] as number }),
      ...(b['page_end'] !== undefined && { page_end: b['page_end'] as number }),
      ...(b['body_text'] !== undefined && { body_text: b['body_text'] as string }),
      ...(b['body_ar'] !== undefined && { body_ar: b['body_ar'] as string }),
      ...(b['summary'] !== undefined && { summary: b['summary'] as string }),
      ...(b['word_count'] !== undefined && { word_count: b['word_count'] as number }),
      ...(b['parent_unit_id'] !== undefined && { parent_unit_id: b['parent_unit_id'] as string }),
      ...(b['toc_id'] !== undefined && { toc_id: b['toc_id'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

export function validateCmSourceTocCreate(
  body: unknown
): { data: CmSourceTocCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['source_id'] !== 'string' || b['source_id'].trim() === '') {
    return { error: 'source_id is required and must be a string' };
  }
  if (typeof b['heading_text'] !== 'string' || b['heading_text'].trim() === '') {
    return { error: 'heading_text is required and must be a string' };
  }

  if (b['seq_order'] !== undefined && typeof b['seq_order'] !== 'number') {
    return { error: 'seq_order must be a number' };
  }
  if (b['depth'] !== undefined && typeof b['depth'] !== 'number') {
    return { error: 'depth must be a number' };
  }
  if (b['page_start'] !== undefined && typeof b['page_start'] !== 'number') {
    return { error: 'page_start must be a number' };
  }
  if (b['page_end'] !== undefined && typeof b['page_end'] !== 'number') {
    return { error: 'page_end must be a number' };
  }

  return {
    data: {
      source_id: b['source_id'] as string,
      heading_text: b['heading_text'] as string,
      ...(b['seq_order'] !== undefined && { seq_order: b['seq_order'] as number }),
      ...(b['depth'] !== undefined && { depth: b['depth'] as number }),
      ...(b['page_start'] !== undefined && { page_start: b['page_start'] as number }),
      ...(b['page_end'] !== undefined && { page_end: b['page_end'] as number }),
      ...(b['parent_toc_id'] !== undefined && { parent_toc_id: b['parent_toc_id'] as string }),
      ...(b['heading_ar'] !== undefined && { heading_ar: b['heading_ar'] as string }),
      ...(b['unit_id'] !== undefined && { unit_id: b['unit_id'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmSourceDetailInput {
  author_names_json?: string;
  editor_names_json?: string;
  publisher?: string | null;
  publication_year?: number | null;
  edition?: string | null;
  isbn?: string | null;
  doi?: string | null;
  url?: string | null;
  pages_total?: number | null;
  language_original?: string | null;
  translator_names_json?: string;
  series_title?: string | null;
  volume?: string | null;
  issue?: string | null;
  abstract?: string | null;
  keywords_json?: string;
  meta_json?: string;
}

export interface CmSourceTocInput {
  source_id: string;
  parent_toc_id?: string | null;
  seq_order?: number;
  depth?: number;
  heading_text: string;
  heading_ar?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  unit_id?: string | null;
  meta_json?: string;
}

export interface CmSourceUnitInput {
  source_id: string;
  parent_unit_id?: string | null;
  toc_id?: string | null;
  unit_type: string;
  seq_order?: number;
  depth?: number;
  heading?: string | null;
  heading_ar?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  word_count?: number | null;
  body_text?: string | null;
  body_ar?: string | null;
  summary?: string | null;
  meta_json?: string;
}

export interface CmSourceChunkInput {
  source_id: string;
  unit_id?: string | null;
  chunk_index: number;
  chunk_kind?: string | null;
  page_no?: number | null;
  heading_norm?: string | null;
  text_content: string;
  token_count?: number | null;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmSourceDetailUpsert(body: unknown): SchemaValidationResult<CmSourceDetailUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('author_names_json' in b) {
    if (typeof b.author_names_json !== 'string') return { error: 'author_names_json must be a string' };
    data.author_names_json = b.author_names_json;
  }
  if ('editor_names_json' in b) {
    if (typeof b.editor_names_json !== 'string') return { error: 'editor_names_json must be a string' };
    data.editor_names_json = b.editor_names_json;
  }
  if ('publisher' in b) {
    if (typeof b.publisher !== 'string') return { error: 'publisher must be a string' };
    data.publisher = b.publisher;
  }
  if ('publication_year' in b) {
    if (typeof b.publication_year !== 'number' || !Number.isFinite(b.publication_year)) return { error: 'publication_year must be a number' };
    data.publication_year = b.publication_year;
  }
  if ('edition' in b) {
    if (typeof b.edition !== 'string') return { error: 'edition must be a string' };
    data.edition = b.edition;
  }
  if ('isbn' in b) {
    if (typeof b.isbn !== 'string') return { error: 'isbn must be a string' };
    data.isbn = b.isbn;
  }
  if ('doi' in b) {
    if (typeof b.doi !== 'string') return { error: 'doi must be a string' };
    data.doi = b.doi;
  }
  if ('url' in b) {
    if (typeof b.url !== 'string') return { error: 'url must be a string' };
    data.url = b.url;
  }
  if ('pages_total' in b) {
    if (typeof b.pages_total !== 'number' || !Number.isFinite(b.pages_total)) return { error: 'pages_total must be a number' };
    data.pages_total = b.pages_total;
  }
  if ('language_original' in b) {
    if (typeof b.language_original !== 'string') return { error: 'language_original must be a string' };
    data.language_original = b.language_original;
  }
  if ('translator_names_json' in b) {
    if (typeof b.translator_names_json !== 'string') return { error: 'translator_names_json must be a string' };
    data.translator_names_json = b.translator_names_json;
  }
  if ('series_title' in b) {
    if (typeof b.series_title !== 'string') return { error: 'series_title must be a string' };
    data.series_title = b.series_title;
  }
  if ('volume' in b) {
    if (typeof b.volume !== 'string') return { error: 'volume must be a string' };
    data.volume = b.volume;
  }
  if ('issue' in b) {
    if (typeof b.issue !== 'string') return { error: 'issue must be a string' };
    data.issue = b.issue;
  }
  if ('abstract' in b) {
    if (typeof b.abstract !== 'string') return { error: 'abstract must be a string' };
    data.abstract = b.abstract;
  }
  if ('keywords_json' in b) {
    if (typeof b.keywords_json !== 'string') return { error: 'keywords_json must be a string' };
    data.keywords_json = b.keywords_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourceDetailUpsert };
}

export function validateCmSourceDetailInput(body: unknown): SchemaValidationResult<CmSourceDetailInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('author_names_json' in b) {
    if (typeof b.author_names_json !== 'string') return { error: 'author_names_json must be a string' };
    data.author_names_json = b.author_names_json;
  }
  if ('editor_names_json' in b) {
    if (typeof b.editor_names_json !== 'string') return { error: 'editor_names_json must be a string' };
    data.editor_names_json = b.editor_names_json;
  }
  if ('publisher' in b) {
    if (b.publisher !== null && typeof b.publisher !== 'string') return { error: 'publisher must be a string or null' };
    data.publisher = b.publisher;
  }
  if ('publication_year' in b) {
    if (b.publication_year !== null && (typeof b.publication_year !== 'number' || !Number.isFinite(b.publication_year))) return { error: 'publication_year must be a number or null' };
    data.publication_year = b.publication_year;
  }
  if ('edition' in b) {
    if (b.edition !== null && typeof b.edition !== 'string') return { error: 'edition must be a string or null' };
    data.edition = b.edition;
  }
  if ('isbn' in b) {
    if (b.isbn !== null && typeof b.isbn !== 'string') return { error: 'isbn must be a string or null' };
    data.isbn = b.isbn;
  }
  if ('doi' in b) {
    if (b.doi !== null && typeof b.doi !== 'string') return { error: 'doi must be a string or null' };
    data.doi = b.doi;
  }
  if ('url' in b) {
    if (b.url !== null && typeof b.url !== 'string') return { error: 'url must be a string or null' };
    data.url = b.url;
  }
  if ('pages_total' in b) {
    if (b.pages_total !== null && (typeof b.pages_total !== 'number' || !Number.isFinite(b.pages_total))) return { error: 'pages_total must be a number or null' };
    data.pages_total = b.pages_total;
  }
  if ('language_original' in b) {
    if (b.language_original !== null && typeof b.language_original !== 'string') return { error: 'language_original must be a string or null' };
    data.language_original = b.language_original;
  }
  if ('translator_names_json' in b) {
    if (typeof b.translator_names_json !== 'string') return { error: 'translator_names_json must be a string' };
    data.translator_names_json = b.translator_names_json;
  }
  if ('series_title' in b) {
    if (b.series_title !== null && typeof b.series_title !== 'string') return { error: 'series_title must be a string or null' };
    data.series_title = b.series_title;
  }
  if ('volume' in b) {
    if (b.volume !== null && typeof b.volume !== 'string') return { error: 'volume must be a string or null' };
    data.volume = b.volume;
  }
  if ('issue' in b) {
    if (b.issue !== null && typeof b.issue !== 'string') return { error: 'issue must be a string or null' };
    data.issue = b.issue;
  }
  if ('abstract' in b) {
    if (b.abstract !== null && typeof b.abstract !== 'string') return { error: 'abstract must be a string or null' };
    data.abstract = b.abstract;
  }
  if ('keywords_json' in b) {
    if (typeof b.keywords_json !== 'string') return { error: 'keywords_json must be a string' };
    data.keywords_json = b.keywords_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourceDetailInput };
}

export function validateCmSourceTocInput(body: unknown): SchemaValidationResult<CmSourceTocInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('parent_toc_id' in b) {
    if (b.parent_toc_id !== null && typeof b.parent_toc_id !== 'string') return { error: 'parent_toc_id must be a string or null' };
    data.parent_toc_id = b.parent_toc_id;
  }
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('depth' in b) {
    if (typeof b.depth !== 'number' || !Number.isFinite(b.depth)) return { error: 'depth must be a number' };
    data.depth = b.depth;
  }
  if (typeof b.heading_text !== 'string' || !b.heading_text.trim()) return { error: 'heading_text is required and must be a non-empty string' };
  data.heading_text = b.heading_text.trim();
  if ('heading_ar' in b) {
    if (b.heading_ar !== null && typeof b.heading_ar !== 'string') return { error: 'heading_ar must be a string or null' };
    data.heading_ar = b.heading_ar;
  }
  if ('page_start' in b) {
    if (b.page_start !== null && (typeof b.page_start !== 'number' || !Number.isFinite(b.page_start))) return { error: 'page_start must be a number or null' };
    data.page_start = b.page_start;
  }
  if ('page_end' in b) {
    if (b.page_end !== null && (typeof b.page_end !== 'number' || !Number.isFinite(b.page_end))) return { error: 'page_end must be a number or null' };
    data.page_end = b.page_end;
  }
  if ('unit_id' in b) {
    if (b.unit_id !== null && typeof b.unit_id !== 'string') return { error: 'unit_id must be a string or null' };
    data.unit_id = b.unit_id;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourceTocInput };
}

export function validateCmSourceUnitInput(body: unknown): SchemaValidationResult<CmSourceUnitInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('parent_unit_id' in b) {
    if (b.parent_unit_id !== null && typeof b.parent_unit_id !== 'string') return { error: 'parent_unit_id must be a string or null' };
    data.parent_unit_id = b.parent_unit_id;
  }
  if ('toc_id' in b) {
    if (b.toc_id !== null && typeof b.toc_id !== 'string') return { error: 'toc_id must be a string or null' };
    data.toc_id = b.toc_id;
  }
  if (typeof b.unit_type !== 'string' || !b.unit_type.trim()) return { error: 'unit_type is required and must be a non-empty string' };
  data.unit_type = b.unit_type.trim();
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('depth' in b) {
    if (typeof b.depth !== 'number' || !Number.isFinite(b.depth)) return { error: 'depth must be a number' };
    data.depth = b.depth;
  }
  if ('heading' in b) {
    if (b.heading !== null && typeof b.heading !== 'string') return { error: 'heading must be a string or null' };
    data.heading = b.heading;
  }
  if ('heading_ar' in b) {
    if (b.heading_ar !== null && typeof b.heading_ar !== 'string') return { error: 'heading_ar must be a string or null' };
    data.heading_ar = b.heading_ar;
  }
  if ('page_start' in b) {
    if (b.page_start !== null && (typeof b.page_start !== 'number' || !Number.isFinite(b.page_start))) return { error: 'page_start must be a number or null' };
    data.page_start = b.page_start;
  }
  if ('page_end' in b) {
    if (b.page_end !== null && (typeof b.page_end !== 'number' || !Number.isFinite(b.page_end))) return { error: 'page_end must be a number or null' };
    data.page_end = b.page_end;
  }
  if ('word_count' in b) {
    if (b.word_count !== null && (typeof b.word_count !== 'number' || !Number.isFinite(b.word_count))) return { error: 'word_count must be a number or null' };
    data.word_count = b.word_count;
  }
  if ('body_text' in b) {
    if (b.body_text !== null && typeof b.body_text !== 'string') return { error: 'body_text must be a string or null' };
    data.body_text = b.body_text;
  }
  if ('body_ar' in b) {
    if (b.body_ar !== null && typeof b.body_ar !== 'string') return { error: 'body_ar must be a string or null' };
    data.body_ar = b.body_ar;
  }
  if ('summary' in b) {
    if (b.summary !== null && typeof b.summary !== 'string') return { error: 'summary must be a string or null' };
    data.summary = b.summary;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourceUnitInput };
}

export function validateCmSourceChunkInput(body: unknown): SchemaValidationResult<CmSourceChunkInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('unit_id' in b) {
    if (b.unit_id !== null && typeof b.unit_id !== 'string') return { error: 'unit_id must be a string or null' };
    data.unit_id = b.unit_id;
  }
  if (typeof b.chunk_index !== 'number' || !Number.isFinite(b.chunk_index)) return { error: 'chunk_index is required and must be a number' };
  data.chunk_index = b.chunk_index;
  if ('chunk_kind' in b) {
    if (b.chunk_kind !== null && typeof b.chunk_kind !== 'string') return { error: 'chunk_kind must be a string or null' };
    data.chunk_kind = b.chunk_kind;
  }
  if ('page_no' in b) {
    if (b.page_no !== null && (typeof b.page_no !== 'number' || !Number.isFinite(b.page_no))) return { error: 'page_no must be a number or null' };
    data.page_no = b.page_no;
  }
  if ('heading_norm' in b) {
    if (b.heading_norm !== null && typeof b.heading_norm !== 'string') return { error: 'heading_norm must be a string or null' };
    data.heading_norm = b.heading_norm;
  }
  if (typeof b.text_content !== 'string' || !b.text_content.trim()) return { error: 'text_content is required and must be a non-empty string' };
  data.text_content = b.text_content.trim();
  if ('token_count' in b) {
    if (b.token_count !== null && (typeof b.token_count !== 'number' || !Number.isFinite(b.token_count))) return { error: 'token_count must be a number or null' };
    data.token_count = b.token_count;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourceChunkInput };
}
