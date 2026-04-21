// ─── Capture schemas & types ──────────────────────────────────────────────────

export interface CmCapture {
  capture_id: string;         // CM:ULID
  core_user_ref: string;
  capture_type: 'text' | 'url' | 'image' | 'audio' | 'other';
  raw_text: string | null;
  raw_ar: string | null;
  source_url: string | null;
  source_title: string | null;
  media_asset_ref: string | null;
  is_processed: boolean;
  processed_into_ref: string | null;
  tags_json: string | null;
  workspace_ref: string | null;
  meta_json: string | null;
  captured_at: string;
  created_at: string;
}

export interface CmCaptureLink {
  link_id: string;            // CM:ULID
  capture_id: string;
  target_ref: string;
  link_type: string;
  created_at: string;
}

export interface CmCaptureCreate {
  core_user_ref: string;
  capture_type?: 'text' | 'url' | 'image' | 'audio' | 'other';
  raw_text?: string;
  raw_ar?: string;
  source_url?: string;
  source_title?: string;
  media_asset_ref?: string;
  workspace_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export interface CmCaptureLinkAdd {
  capture_id: string;
  target_ref: string;
  link_type?: string;
}

export function validateCmCaptureCreate(
  body: unknown
): { data: CmCaptureCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  const validCaptureTypes = ['text', 'url', 'image', 'audio', 'other'];
  if (b['capture_type'] !== undefined && !validCaptureTypes.includes(b['capture_type'] as string)) {
    return { error: `capture_type must be one of: ${validCaptureTypes.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      ...(b['capture_type'] !== undefined && { capture_type: b['capture_type'] as CmCaptureCreate['capture_type'] }),
      ...(b['raw_text'] !== undefined && { raw_text: b['raw_text'] as string }),
      ...(b['raw_ar'] !== undefined && { raw_ar: b['raw_ar'] as string }),
      ...(b['source_url'] !== undefined && { source_url: b['source_url'] as string }),
      ...(b['source_title'] !== undefined && { source_title: b['source_title'] as string }),
      ...(b['media_asset_ref'] !== undefined && { media_asset_ref: b['media_asset_ref'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}
