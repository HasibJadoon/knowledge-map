// ─── CM document model ────────────────────────────────────────────────────────
// Shapes for the km-content (CM) document API and the editor-facing document
// types. The CM backend stores documents as structured `cm_blocks` rows; the
// editor works in Tiptap JSON. `block-mapper.ts` converts between the two.

// ── Tiptap document JSON ──────────────────────────────────────────────────────

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

// ── CM wire shapes ────────────────────────────────────────────────────────────

export type DocPublicationState = 'draft' | 'review' | 'published' | 'archived';

/** A `cm_blocks` row as returned by the CM document aggregate endpoint. */
export interface KmBlock {
  block_id: string;
  doc_id: string;
  parent_block_id: string | null;
  block_type: string;
  seq_order: number;
  depth: number;
  content_text: string | null;
  content_ar: string | null;
  attrs_json: string;
  annotations_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

/** A `cm_documents` row (optionally with its decomposed blocks). */
export interface CmDocumentRow {
  doc_id: string;
  core_user_ref: string;
  doc_type: string;
  title: string;
  language: string;
  word_count: number | null;
  publication_state: DocPublicationState;
  workspace_ref: string | null;
  tags_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
  blocks?: KmBlock[];
}

/**
 * App-specific document context. CM has no `domain`/`surah`/parent columns, so
 * this rides in `cm_documents.meta_json` and is parsed back out by the adapter.
 */
export interface DocMeta {
  domain?: string;
  parent_doc_id?: string | null;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  source_id?: number | null;
  unit_id?: number | null;
  workspace_id?: number | null;
  sort_order?: number;
}

// ── Editor-facing shapes ──────────────────────────────────────────────────────

/** A document plus its recomposed Tiptap content, ready for the editor. */
export interface DocumentDetail {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: DocPublicationState;
  word_count: number;
  content: TiptapDoc;
  meta: DocMeta;
  updated_at: string;
}

/** A list-row summary used by the docs browser. */
export interface DocumentSummary {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: string;
  word_count: number;
  updated_at: string;
  parent_doc_id: string | null;
  sort_order: number;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: string;
  updated_at: string | null;
  excerpt?: string | null;
}

export interface CreateDocInput {
  title: string;
  domain: string;
  doc_type: string;
  parent_doc_id?: string | null;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  unit_id?: number | null;
  workspace_id?: number | null;
}

export interface UpdateDocInput {
  title?: string;
  content?: TiptapDoc;
  word_count?: number;
}
