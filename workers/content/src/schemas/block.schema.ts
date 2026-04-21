// ─── Block schemas & types ────────────────────────────────────────────────────

export interface CmBlock {
  block_id: string;           // CM:ULID
  doc_id: string;
  parent_block_id: string | null;
  block_type: 'paragraph' | 'heading' | 'quote' | 'code' | 'list' | 'divider' | 'embed' | 'other';
  seq_order: number;
  depth: number;
  content_text: string | null;
  content_ar: string | null;
  attrs_json: string | null;
  annotations_json: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmBlockRef {
  ref_id: string;             // CM:ULID
  block_id: string;
  target_ref: string;
  ref_type: 'citation' | 'footnote' | 'link' | 'note';
  anchor_text: string | null;
  note: string | null;
  seq_order: number;
  meta_json: string | null;
}

export interface CmBlockEmbed {
  embed_id: string;           // CM:ULID
  block_id: string;
  embed_type: 'media' | 'source' | 'chart' | 'other';
  target_ref: string | null;
  embed_config_json: string | null;
  caption: string | null;
  meta_json: string | null;
}

export interface CmBlockCreate {
  doc_id: string;
  block_type?: 'paragraph' | 'heading' | 'quote' | 'code' | 'list' | 'divider' | 'embed' | 'other';
  content_text?: string;
  content_ar?: string;
  seq_order?: number;
  depth?: number;
  parent_block_id?: string;
  attrs_json?: string;
  annotations_json?: string;
  meta_json?: string;
}

export interface CmBlockPatch {
  block_type?: 'paragraph' | 'heading' | 'quote' | 'code' | 'list' | 'divider' | 'embed' | 'other';
  content_text?: string;
  content_ar?: string;
  seq_order?: number;
  attrs_json?: string;
  annotations_json?: string;
  meta_json?: string;
}

export interface CmBlockRefAdd {
  target_ref: string;
  ref_type?: 'citation' | 'footnote' | 'link' | 'note';
  anchor_text?: string;
  note?: string;
  seq_order?: number;
  meta_json?: string;
}

export interface CmBlockEmbedAdd {
  target_ref: string;
  embed_type?: 'media' | 'source' | 'chart' | 'other';
  embed_config_json?: string;
  caption?: string;
  meta_json?: string;
}

export function validateCmBlockCreate(
  body: unknown
): { data: CmBlockCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['doc_id'] !== 'string' || b['doc_id'].trim() === '') {
    return { error: 'doc_id is required and must be a string' };
  }

  const validBlockTypes = ['paragraph', 'heading', 'quote', 'code', 'list', 'divider', 'embed', 'other'];
  if (b['block_type'] !== undefined && !validBlockTypes.includes(b['block_type'] as string)) {
    return { error: `block_type must be one of: ${validBlockTypes.join(', ')}` };
  }

  if (b['seq_order'] !== undefined && typeof b['seq_order'] !== 'number') {
    return { error: 'seq_order must be a number' };
  }
  if (b['depth'] !== undefined && typeof b['depth'] !== 'number') {
    return { error: 'depth must be a number' };
  }

  return {
    data: {
      doc_id: b['doc_id'] as string,
      ...(b['block_type'] !== undefined && { block_type: b['block_type'] as CmBlockCreate['block_type'] }),
      ...(b['content_text'] !== undefined && { content_text: b['content_text'] as string }),
      ...(b['content_ar'] !== undefined && { content_ar: b['content_ar'] as string }),
      ...(b['seq_order'] !== undefined && { seq_order: b['seq_order'] as number }),
      ...(b['depth'] !== undefined && { depth: b['depth'] as number }),
      ...(b['parent_block_id'] !== undefined && { parent_block_id: b['parent_block_id'] as string }),
      ...(b['attrs_json'] !== undefined && { attrs_json: b['attrs_json'] as string }),
      ...(b['annotations_json'] !== undefined && { annotations_json: b['annotations_json'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmBlockInput {
  doc_id: string;
  parent_block_id?: string | null;
  block_type: string;
  seq_order?: number;
  depth?: number;
  content_text?: string | null;
  content_ar?: string | null;
  attrs_json?: string;
  annotations_json?: string;
  meta_json?: string;
}

export interface CmBlockRefInput {
  target_ref: string;
  ref_type: string;
  anchor_text?: string | null;
  note?: string | null;
  seq_order?: number;
  meta_json?: string;
}

export interface CmBlockEmbedInput {
  embed_type: string;
  target_ref?: string | null;
  embed_config_json?: string;
  caption?: string | null;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmBlockPatch(body: unknown): SchemaValidationResult<CmBlockPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('block_type' in b) {
    if (typeof b.block_type !== 'string') return { error: 'block_type must be a string' };
    data.block_type = b.block_type;
  }
  if ('content_text' in b) {
    if (typeof b.content_text !== 'string') return { error: 'content_text must be a string' };
    data.content_text = b.content_text;
  }
  if ('content_ar' in b) {
    if (typeof b.content_ar !== 'string') return { error: 'content_ar must be a string' };
    data.content_ar = b.content_ar;
  }
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('attrs_json' in b) {
    if (typeof b.attrs_json !== 'string') return { error: 'attrs_json must be a string' };
    data.attrs_json = b.attrs_json;
  }
  if ('annotations_json' in b) {
    if (typeof b.annotations_json !== 'string') return { error: 'annotations_json must be a string' };
    data.annotations_json = b.annotations_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockPatch };
}

export function validateCmBlockRefAdd(body: unknown): SchemaValidationResult<CmBlockRefAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if ('ref_type' in b) {
    if (typeof b.ref_type !== 'string') return { error: 'ref_type must be a string' };
    data.ref_type = b.ref_type;
  }
  if ('anchor_text' in b) {
    if (typeof b.anchor_text !== 'string') return { error: 'anchor_text must be a string' };
    data.anchor_text = b.anchor_text;
  }
  if ('note' in b) {
    if (typeof b.note !== 'string') return { error: 'note must be a string' };
    data.note = b.note;
  }
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockRefAdd };
}

export function validateCmBlockEmbedAdd(body: unknown): SchemaValidationResult<CmBlockEmbedAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if ('embed_type' in b) {
    if (typeof b.embed_type !== 'string') return { error: 'embed_type must be a string' };
    data.embed_type = b.embed_type;
  }
  if ('embed_config_json' in b) {
    if (typeof b.embed_config_json !== 'string') return { error: 'embed_config_json must be a string' };
    data.embed_config_json = b.embed_config_json;
  }
  if ('caption' in b) {
    if (typeof b.caption !== 'string') return { error: 'caption must be a string' };
    data.caption = b.caption;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockEmbedAdd };
}

export function validateCmBlockInput(body: unknown): SchemaValidationResult<CmBlockInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.doc_id !== 'string' || !b.doc_id.trim()) return { error: 'doc_id is required and must be a non-empty string' };
  data.doc_id = b.doc_id.trim();
  if ('parent_block_id' in b) {
    if (b.parent_block_id !== null && typeof b.parent_block_id !== 'string') return { error: 'parent_block_id must be a string or null' };
    data.parent_block_id = b.parent_block_id;
  }
  if (typeof b.block_type !== 'string' || !b.block_type.trim()) return { error: 'block_type is required and must be a non-empty string' };
  data.block_type = b.block_type.trim();
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('depth' in b) {
    if (typeof b.depth !== 'number' || !Number.isFinite(b.depth)) return { error: 'depth must be a number' };
    data.depth = b.depth;
  }
  if ('content_text' in b) {
    if (b.content_text !== null && typeof b.content_text !== 'string') return { error: 'content_text must be a string or null' };
    data.content_text = b.content_text;
  }
  if ('content_ar' in b) {
    if (b.content_ar !== null && typeof b.content_ar !== 'string') return { error: 'content_ar must be a string or null' };
    data.content_ar = b.content_ar;
  }
  if ('attrs_json' in b) {
    if (typeof b.attrs_json !== 'string') return { error: 'attrs_json must be a string' };
    data.attrs_json = b.attrs_json;
  }
  if ('annotations_json' in b) {
    if (typeof b.annotations_json !== 'string') return { error: 'annotations_json must be a string' };
    data.annotations_json = b.annotations_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockInput };
}

export function validateCmBlockRefInput(body: unknown): SchemaValidationResult<CmBlockRefInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if (typeof b.ref_type !== 'string' || !b.ref_type.trim()) return { error: 'ref_type is required and must be a non-empty string' };
  data.ref_type = b.ref_type.trim();
  if ('anchor_text' in b) {
    if (b.anchor_text !== null && typeof b.anchor_text !== 'string') return { error: 'anchor_text must be a string or null' };
    data.anchor_text = b.anchor_text;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockRefInput };
}

export function validateCmBlockEmbedInput(body: unknown): SchemaValidationResult<CmBlockEmbedInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.embed_type !== 'string' || !b.embed_type.trim()) return { error: 'embed_type is required and must be a non-empty string' };
  data.embed_type = b.embed_type.trim();
  if ('target_ref' in b) {
    if (b.target_ref !== null && typeof b.target_ref !== 'string') return { error: 'target_ref must be a string or null' };
    data.target_ref = b.target_ref;
  }
  if ('embed_config_json' in b) {
    if (typeof b.embed_config_json !== 'string') return { error: 'embed_config_json must be a string' };
    data.embed_config_json = b.embed_config_json;
  }
  if ('caption' in b) {
    if (b.caption !== null && typeof b.caption !== 'string') return { error: 'caption must be a string or null' };
    data.caption = b.caption;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmBlockEmbedInput };
}
