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
