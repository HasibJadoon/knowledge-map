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
