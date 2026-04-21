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
