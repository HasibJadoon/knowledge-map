// ─── Note schemas & types ─────────────────────────────────────────────────────

export interface CmNote {
  note_id: string;            // CM:ULID
  core_user_ref: string;
  note_type: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  title: string | null;
  body_text: string;
  body_ar: string | null;
  is_pinned: boolean;
  tags_json: string | null;
  workspace_ref: string | null;
  policy_ref: string | null;
  source_capture_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmNoteTarget {
  target_id: string;          // CM:ULID
  note_id: string;
  target_ref: string;
  relation_type: 'about' | 'from' | 'quotes' | 'related';
  seq_order: number;
}

export interface CmNoteCreate {
  core_user_ref: string;
  title?: string;
  note_type?: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  body_text?: string;
  body_ar?: string;
  workspace_ref?: string;
  tags_json?: string;
  is_pinned?: boolean;
  source_capture_ref?: string;
  policy_ref?: string;
  meta_json?: string;
}

export interface CmNotePatch {
  title?: string;
  note_type?: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  body_text?: string;
  body_ar?: string;
  is_pinned?: boolean;
  tags_json?: string;
  workspace_ref?: string;
  policy_ref?: string;
  source_capture_ref?: string;
  meta_json?: string;
}

export interface CmNoteTargetAdd {
  target_ref: string;
  relation_type?: 'about' | 'from' | 'quotes' | 'related';
  seq_order?: number;
}

export function validateCmNoteCreate(
  body: unknown
): { data: CmNoteCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  const validNoteTypes = ['general', 'annotation', 'reflection', 'question', 'summary'];
  if (b['note_type'] !== undefined && !validNoteTypes.includes(b['note_type'] as string)) {
    return { error: `note_type must be one of: ${validNoteTypes.join(', ')}` };
  }

  if (b['is_pinned'] !== undefined && typeof b['is_pinned'] !== 'boolean') {
    return { error: 'is_pinned must be a boolean' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      ...(b['title'] !== undefined && { title: b['title'] as string }),
      ...(b['note_type'] !== undefined && { note_type: b['note_type'] as CmNoteCreate['note_type'] }),
      ...(b['body_text'] !== undefined && { body_text: b['body_text'] as string }),
      ...(b['body_ar'] !== undefined && { body_ar: b['body_ar'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['is_pinned'] !== undefined && { is_pinned: b['is_pinned'] as boolean }),
      ...(b['source_capture_ref'] !== undefined && { source_capture_ref: b['source_capture_ref'] as string }),
      ...(b['policy_ref'] !== undefined && { policy_ref: b['policy_ref'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}
