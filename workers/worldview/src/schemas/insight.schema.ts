// ─── Insight schemas & types ───────────────────────────────────────────────

export interface InsightSuggestion {
  id: string;               // WV:ULID
  suggestion_type: string;  // node | edge | cluster
  payload_json: string;     // JSON: the extracted knowledge payload
  status: string;           // suggested | approved | edited | rejected | saved
  batch_id: string | null;  // WV:ULID → wv_distill_batches
  source_chunk_ref: string | null; // AL:ULID → ar_ling_source_chunks
  created_at: string;
  reviewed_at: string | null;
}

export interface SuggestionCreate {
  suggestion_type: string;
  payload_json: string;
  batch_id?: string | null;
  source_chunk_ref?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSuggestionCreate(body: unknown): SchemaValidationResult<SuggestionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.suggestion_type !== 'string' || !b.suggestion_type.trim()) return { error: 'suggestion_type is required and must be a non-empty string' };
  data.suggestion_type = b.suggestion_type.trim();
  if (typeof b.payload_json !== 'string' || !b.payload_json.trim()) return { error: 'payload_json is required and must be a non-empty string' };
  data.payload_json = b.payload_json.trim();
  if ('batch_id' in b) {
    if (b.batch_id !== null && typeof b.batch_id !== 'string') return { error: 'batch_id must be a string or null' };
    data.batch_id = b.batch_id;
  }
  if ('source_chunk_ref' in b) {
    if (b.source_chunk_ref !== null && typeof b.source_chunk_ref !== 'string') return { error: 'source_chunk_ref must be a string or null' };
    data.source_chunk_ref = b.source_chunk_ref;
  }

  return { data: data as unknown as SuggestionCreate };
}
