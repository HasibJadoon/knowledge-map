// ─── Highlight schemas & types ────────────────────────────────────────────────

export interface CmHighlight {
  highlight_id: string;       // CM:ULID
  core_user_ref: string;
  target_ref: string;
  target_type: string;
  color: string;
  anchor_start_json: string | null;
  anchor_end_json: string | null;
  selected_text: string;
  selected_text_ar: string | null;
  note_ref: string | null;
  tags_json: string | null;
  workspace_ref: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface CmHighlightCreate {
  core_user_ref: string;
  target_ref: string;
  target_type: string;
  selected_text: string;
  color?: string;
  anchor_start_json?: string;
  anchor_end_json?: string;
  selected_text_ar?: string;
  note_ref?: string;
  workspace_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export function validateCmHighlightCreate(
  body: unknown
): { data: CmHighlightCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (typeof b['target_ref'] !== 'string' || b['target_ref'].trim() === '') {
    return { error: 'target_ref is required and must be a string' };
  }
  if (typeof b['target_type'] !== 'string' || b['target_type'].trim() === '') {
    return { error: 'target_type is required and must be a string' };
  }
  if (typeof b['selected_text'] !== 'string' || b['selected_text'].trim() === '') {
    return { error: 'selected_text is required and must be a string' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      target_ref: b['target_ref'] as string,
      target_type: b['target_type'] as string,
      selected_text: b['selected_text'] as string,
      ...(b['color'] !== undefined && { color: b['color'] as string }),
      ...(b['anchor_start_json'] !== undefined && { anchor_start_json: b['anchor_start_json'] as string }),
      ...(b['anchor_end_json'] !== undefined && { anchor_end_json: b['anchor_end_json'] as string }),
      ...(b['selected_text_ar'] !== undefined && { selected_text_ar: b['selected_text_ar'] as string }),
      ...(b['note_ref'] !== undefined && { note_ref: b['note_ref'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Highlight {
  id: string;                // CM:ULID
  resource_ref: string;      // typed ref — e.g. QR:2:255, WV:ULID
  anchor_start: string;      // serialised DOM/text position (e.g. "p3:c12")
  anchor_end: string;
  text_excerpt: string | null;
  color: string | null;      // UI colour tag: yellow | green | blue | pink
  note_ref: string | null;   // CM:ULID → cm_notes (optional linked note)
  created_at: string;
}

export interface HighlightCreate {
  resource_ref: string;
  anchor_start: string;
  anchor_end: string;
  text_excerpt?: string | null;
  color?: string | null;
  note_ref?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateHighlightCreate(body: unknown): SchemaValidationResult<HighlightCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.anchor_start !== 'string' || !b.anchor_start.trim()) return { error: 'anchor_start is required and must be a non-empty string' };
  data.anchor_start = b.anchor_start.trim();
  if (typeof b.anchor_end !== 'string' || !b.anchor_end.trim()) return { error: 'anchor_end is required and must be a non-empty string' };
  data.anchor_end = b.anchor_end.trim();
  if ('text_excerpt' in b) {
    if (b.text_excerpt !== null && typeof b.text_excerpt !== 'string') return { error: 'text_excerpt must be a string or null' };
    data.text_excerpt = b.text_excerpt;
  }
  if ('color' in b) {
    if (b.color !== null && typeof b.color !== 'string') return { error: 'color must be a string or null' };
    data.color = b.color;
  }
  if ('note_ref' in b) {
    if (b.note_ref !== null && typeof b.note_ref !== 'string') return { error: 'note_ref must be a string or null' };
    data.note_ref = b.note_ref;
  }

  return { data: data as unknown as HighlightCreate };
}
