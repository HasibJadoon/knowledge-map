// ── Scope ─────────────────────────────────────────────────────────────────────

export interface DocumentEditorScope {
  domain: 'quran' | 'arabic' | 'worldview' | 'classical_theology' |
          'jewish_wv' | 'christian_wv' | 'history' | 'planner' | 'workspace' | 'other';
  surah?: number;
  source_id?: string;
  source_unit_id?: string;
  unit_id?: string;
}

// ── Doc types ─────────────────────────────────────────────────────────────────

export type QuranDocType =
  | 'running_notes'
  | 'morphology'
  | 'nahw'
  | 'passage_notes'
  | 'tafsir'
  | 'draft';

export const QURAN_DOC_TYPES: { value: QuranDocType; label: string }[] = [
  { value: 'running_notes',  label: 'Running Notes' },
  { value: 'morphology',     label: 'Morphology' },
  { value: 'nahw',           label: 'Nahw / Structure' },
  { value: 'passage_notes',  label: 'Passage Notes' },
  { value: 'tafsir',         label: 'Tafsir' },
  { value: 'draft',          label: 'Draft' },
];

// ── Tiptap doc JSON ───────────────────────────────────────────────────────────

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

// ── List item ─────────────────────────────────────────────────────────────────

export interface DocumentListItem {
  id: string;
  title: string;
  doc_type: string;
  summary: string | null;
  status: string;
  is_published: boolean;
  domain: string | null;
  surah: number | null;
  source_id: string | null;
  source_unit_id: string | null;
  unit_id: string | null;
  created_at: string;
  updated_at: string | null;
}

// ── Full document ─────────────────────────────────────────────────────────────

export interface DocumentDetail extends DocumentListItem {
  document_json: TiptapDoc;
  meta_json: Record<string, unknown>;
  workspace_id: string;
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface DocumentListResponse {
  ok: boolean;
  total: number;
  documents: DocumentListItem[];
  error?: string;
}

export interface DocumentDetailResponse {
  ok: boolean;
  document: DocumentDetail;
  error?: string;
}

export interface DocumentCreateResponse {
  ok: boolean;
  document_id: string;
  document: DocumentListItem & { document_json: TiptapDoc };
  error?: string;
}

export interface DocumentSaveResponse {
  ok: boolean;
  document_id: string;
  blocks_synced: number;
  error?: string;
}

export interface DocumentUploadResponse {
  ok: boolean;
  url: string;
  key: string;
  resource_id: string;
  resource_type: 'image' | 'audio';
  mime_type: string;
  size_bytes: number;
  file_name: string;
  error?: string;
}

// ── Save state ────────────────────────────────────────────────────────────────

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ── CM (km-content) document API ──────────────────────────────────────────────
// The CM backend stores a document as structured `cm_blocks` rows. The editor
// works in Tiptap JSON; `block-mapper.ts` converts between the two.

export type CmPublicationState = 'draft' | 'review' | 'published' | 'archived';

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
  publication_state: CmPublicationState;
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
  target_audience?: string;
  sort_order?: number;
}

/** A document plus its recomposed Tiptap content, ready for the editor. */
export interface DocDetail {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: CmPublicationState;
  word_count: number;
  content: TiptapDoc;
  meta: DocMeta;
  updated_at: string;
}

/** A list-row summary used by the docs sidebar. */
export interface DocSummaryItem {
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

export interface CreateDocInput {
  title: string;
  domain: string;
  doc_type: string;
  parent_doc_id?: string | null;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  source_id?: number | null;
  unit_id?: number | null;
  workspace_id?: number | null;
}

export interface UpdateDocInput {
  title?: string;
  content?: TiptapDoc;
  word_count?: number;
}

export interface MetaPatchInput {
  doc_type?: string;
  domain?: string;
  target_audience?: string;
}
