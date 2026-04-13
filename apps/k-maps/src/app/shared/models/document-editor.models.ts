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
