// ─── Media schemas & types ────────────────────────────────────────────────────

export interface CmMediaAsset {
  asset_id: string;           // CM:ULID
  core_user_ref: string;
  asset_type: 'audio' | 'video' | 'image' | 'document' | 'other';
  title: string;
  title_ar: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  duration_sec: number | null;
  storage_ref: string | null;
  cdn_url: string | null;
  thumbnail_url: string | null;
  language: string;
  is_transcribed: boolean;
  publication_state: 'draft' | 'published' | 'archived';
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmMediaTranscript {
  transcript_id: string;      // CM:ULID
  asset_id: string;
  language: string;
  transcript_text: string;
  is_auto_generated: boolean;
  is_reviewed: boolean;
  word_timestamps_json: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface CmAudioScene {
  scene_id: string;           // CM:ULID
  asset_id: string;
  transcript_id: string | null;
  scene_index: number;
  scene_type: string;
  title: string | null;
  description: string | null;
  start_ms: number;
  end_ms: number;
  speaker_ref: string | null;
  transcript_excerpt: string | null;
  tags_json: string | null;
  meta_json: string | null;
}

export interface CmMediaChapter {
  chapter_id: string;         // CM:ULID
  asset_id: string;
  chapter_index: number;
  title: string;
  title_ar: string | null;
  start_ms: number;
  end_ms: number | null;
  description: string | null;
  meta_json: string | null;
}

export interface CmMediaAssetCreate {
  core_user_ref: string;
  title: string;
  asset_type?: 'audio' | 'video' | 'image' | 'document' | 'other';
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  duration_sec?: number;
  storage_ref?: string;
  cdn_url?: string;
  thumbnail_url?: string;
  title_ar?: string;
  language?: string;
  workspace_ref?: string;
  policy_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export interface CmMediaAssetPatch {
  title?: string;
  title_ar?: string;
  asset_type?: 'audio' | 'video' | 'image' | 'document' | 'other';
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  duration_sec?: number;
  storage_ref?: string;
  cdn_url?: string;
  thumbnail_url?: string;
  language?: string;
  is_transcribed?: boolean;
  publication_state?: 'draft' | 'published' | 'archived';
  policy_ref?: string;
  workspace_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export interface CmTranscriptCreate {
  asset_id: string;
  transcript_text: string;
  language?: string;
  is_auto_generated?: boolean;
  is_reviewed?: boolean;
  word_timestamps_json?: string;
  meta_json?: string;
}

export function validateCmMediaAssetCreate(
  body: unknown
): { data: CmMediaAssetCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (typeof b['title'] !== 'string' || b['title'].trim() === '') {
    return { error: 'title is required and must be a string' };
  }

  const validAssetTypes = ['audio', 'video', 'image', 'document', 'other'];
  if (b['asset_type'] !== undefined && !validAssetTypes.includes(b['asset_type'] as string)) {
    return { error: `asset_type must be one of: ${validAssetTypes.join(', ')}` };
  }

  if (b['file_size_bytes'] !== undefined && typeof b['file_size_bytes'] !== 'number') {
    return { error: 'file_size_bytes must be a number' };
  }
  if (b['duration_sec'] !== undefined && typeof b['duration_sec'] !== 'number') {
    return { error: 'duration_sec must be a number' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      title: b['title'] as string,
      ...(b['asset_type'] !== undefined && { asset_type: b['asset_type'] as CmMediaAssetCreate['asset_type'] }),
      ...(b['file_name'] !== undefined && { file_name: b['file_name'] as string }),
      ...(b['file_size_bytes'] !== undefined && { file_size_bytes: b['file_size_bytes'] as number }),
      ...(b['mime_type'] !== undefined && { mime_type: b['mime_type'] as string }),
      ...(b['duration_sec'] !== undefined && { duration_sec: b['duration_sec'] as number }),
      ...(b['storage_ref'] !== undefined && { storage_ref: b['storage_ref'] as string }),
      ...(b['cdn_url'] !== undefined && { cdn_url: b['cdn_url'] as string }),
      ...(b['thumbnail_url'] !== undefined && { thumbnail_url: b['thumbnail_url'] as string }),
      ...(b['title_ar'] !== undefined && { title_ar: b['title_ar'] as string }),
      ...(b['language'] !== undefined && { language: b['language'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['policy_ref'] !== undefined && { policy_ref: b['policy_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}
