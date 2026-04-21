// ─── Resource Link schemas & types ────────────────────────────────────────────

export interface CmResourceLink {
  link_id: string;            // CM:ULID
  source_ref: string;
  target_ref: string;
  link_type: 'references' | 'expands' | 'contradicts' | 'illustrates' | 'translates' | 'other';
  anchor_text: string | null;
  note: string | null;
  core_user_ref: string | null;
  confidence: number;
  is_ai_suggested: boolean;
  meta_json: string | null;
  created_at: string;
}

export interface CmResourceLinkCreate {
  source_ref: string;
  target_ref: string;
  core_user_ref: string;
  link_type?: 'references' | 'expands' | 'contradicts' | 'illustrates' | 'translates' | 'other';
  anchor_text?: string;
  note?: string;
  confidence?: number;
  is_ai_suggested?: boolean;
  meta_json?: string;
}

export function validateCmResourceLinkCreate(
  body: unknown
): { data: CmResourceLinkCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['source_ref'] !== 'string' || b['source_ref'].trim() === '') {
    return { error: 'source_ref is required and must be a string' };
  }
  if (typeof b['target_ref'] !== 'string' || b['target_ref'].trim() === '') {
    return { error: 'target_ref is required and must be a string' };
  }
  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  const validLinkTypes = ['references', 'expands', 'contradicts', 'illustrates', 'translates', 'other'];
  if (b['link_type'] !== undefined && !validLinkTypes.includes(b['link_type'] as string)) {
    return { error: `link_type must be one of: ${validLinkTypes.join(', ')}` };
  }

  if (b['confidence'] !== undefined && typeof b['confidence'] !== 'number') {
    return { error: 'confidence must be a number' };
  }
  if (b['confidence'] !== undefined) {
    const conf = b['confidence'] as number;
    if (conf < 0 || conf > 1) {
      return { error: 'confidence must be between 0 and 1' };
    }
  }

  if (b['is_ai_suggested'] !== undefined && typeof b['is_ai_suggested'] !== 'boolean') {
    return { error: 'is_ai_suggested must be a boolean' };
  }

  return {
    data: {
      source_ref: b['source_ref'] as string,
      target_ref: b['target_ref'] as string,
      core_user_ref: b['core_user_ref'] as string,
      ...(b['link_type'] !== undefined && { link_type: b['link_type'] as CmResourceLinkCreate['link_type'] }),
      ...(b['anchor_text'] !== undefined && { anchor_text: b['anchor_text'] as string }),
      ...(b['note'] !== undefined && { note: b['note'] as string }),
      ...(b['confidence'] !== undefined && { confidence: b['confidence'] as number }),
      ...(b['is_ai_suggested'] !== undefined && { is_ai_suggested: b['is_ai_suggested'] as boolean }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}
