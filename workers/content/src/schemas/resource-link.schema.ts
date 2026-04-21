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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmResourceLinkInput {
  source_ref: string;
  target_ref: string;
  link_type: string;
  anchor_text?: string | null;
  note?: string | null;
  core_user_ref?: string | null;
  confidence?: number;
  is_ai_suggested?: number;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmResourceLinkInput(body: unknown): SchemaValidationResult<CmResourceLinkInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_ref !== 'string' || !b.source_ref.trim()) return { error: 'source_ref is required and must be a non-empty string' };
  data.source_ref = b.source_ref.trim();
  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if (typeof b.link_type !== 'string' || !b.link_type.trim()) return { error: 'link_type is required and must be a non-empty string' };
  data.link_type = b.link_type.trim();
  if ('anchor_text' in b) {
    if (b.anchor_text !== null && typeof b.anchor_text !== 'string') return { error: 'anchor_text must be a string or null' };
    data.anchor_text = b.anchor_text;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }
  if ('core_user_ref' in b) {
    if (b.core_user_ref !== null && typeof b.core_user_ref !== 'string') return { error: 'core_user_ref must be a string or null' };
    data.core_user_ref = b.core_user_ref;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'number' || !Number.isFinite(b.confidence)) return { error: 'confidence must be a number' };
    data.confidence = b.confidence;
  }
  if ('is_ai_suggested' in b) {
    if (typeof b.is_ai_suggested !== 'number' || !Number.isFinite(b.is_ai_suggested)) return { error: 'is_ai_suggested must be a number' };
    data.is_ai_suggested = b.is_ai_suggested;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmResourceLinkInput };
}
