// ─── Highlight schemas & types ───────────────────────────────────────────────

export interface WvHighlight {
  id: string;              // WV:ULID
  source_id: string | null;
  source_unit_id: string | null;
  corpus_unit_id: string | null;
  locator: string | null;  // page, verse, timestamp
  text_excerpt: string;
  note: string | null;
  highlight_type: string;  // general|key_claim|evidence|question|contradiction|insight
  color: string | null;
  moral_axis_id: string | null;
  topic_id: string | null;
  core_user_ref: string;   // CORE:ULID
  core_ws_ref: string | null;
  created_at: string;
}

export interface HighlightCreate {
  source_id?: string | null;
  source_unit_id?: string | null;
  corpus_unit_id?: string | null;
  locator?: string | null;
  text_excerpt: string;
  note?: string | null;
  highlight_type?: string;
  color?: string | null;
  moral_axis_id?: string | null;
  topic_id?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateHighlightCreate(body: unknown): SchemaValidationResult<HighlightCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('source_id' in b) {
    if (b.source_id !== null && typeof b.source_id !== 'string') return { error: 'source_id must be a string or null' };
    data.source_id = b.source_id;
  }
  if ('source_unit_id' in b) {
    if (b.source_unit_id !== null && typeof b.source_unit_id !== 'string') return { error: 'source_unit_id must be a string or null' };
    data.source_unit_id = b.source_unit_id;
  }
  if ('corpus_unit_id' in b) {
    if (b.corpus_unit_id !== null && typeof b.corpus_unit_id !== 'string') return { error: 'corpus_unit_id must be a string or null' };
    data.corpus_unit_id = b.corpus_unit_id;
  }
  if ('locator' in b) {
    if (b.locator !== null && typeof b.locator !== 'string') return { error: 'locator must be a string or null' };
    data.locator = b.locator;
  }
  if (typeof b.text_excerpt !== 'string' || !b.text_excerpt.trim()) return { error: 'text_excerpt is required and must be a non-empty string' };
  data.text_excerpt = b.text_excerpt.trim();
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }
  if ('highlight_type' in b) {
    if (typeof b.highlight_type !== 'string') return { error: 'highlight_type must be a string' };
    data.highlight_type = b.highlight_type;
  }
  if ('color' in b) {
    if (b.color !== null && typeof b.color !== 'string') return { error: 'color must be a string or null' };
    data.color = b.color;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }

  return { data: data as unknown as HighlightCreate };
}
