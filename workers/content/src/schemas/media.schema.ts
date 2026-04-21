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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmMediaAssetInput {
  core_user_ref: string;
  asset_type: string;
  title: string;
  title_ar?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  duration_sec?: number | null;
  storage_ref?: string | null;
  cdn_url?: string | null;
  thumbnail_url?: string | null;
  language?: string;
  publication_state?: string;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  meta_json?: string;
}

export interface CmMediaTranscriptInput {
  asset_id: string;
  language?: string;
  transcript_text: string;
  is_auto_generated?: number;
  is_reviewed?: number;
  word_timestamps_json?: string | null;
  meta_json?: string;
}

export interface CmAudioSceneInput {
  asset_id: string;
  transcript_id?: string | null;
  scene_index: number;
  scene_type?: string;
  title?: string | null;
  description?: string | null;
  start_ms: number;
  end_ms: number;
  speaker_ref?: string | null;
  transcript_excerpt?: string | null;
  tags_json?: string;
  meta_json?: string;
}

export interface CmMediaChapterInput {
  asset_id: string;
  chapter_index: number;
  title: string;
  title_ar?: string | null;
  start_ms: number;
  end_ms?: number | null;
  description?: string | null;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmMediaAssetPatch(body: unknown): SchemaValidationResult<CmMediaAssetPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (typeof b.title_ar !== 'string') return { error: 'title_ar must be a string' };
    data.title_ar = b.title_ar;
  }
  if ('asset_type' in b) {
    if (typeof b.asset_type !== 'string') return { error: 'asset_type must be a string' };
    data.asset_type = b.asset_type;
  }
  if ('file_name' in b) {
    if (typeof b.file_name !== 'string') return { error: 'file_name must be a string' };
    data.file_name = b.file_name;
  }
  if ('file_size_bytes' in b) {
    if (typeof b.file_size_bytes !== 'number' || !Number.isFinite(b.file_size_bytes)) return { error: 'file_size_bytes must be a number' };
    data.file_size_bytes = b.file_size_bytes;
  }
  if ('mime_type' in b) {
    if (typeof b.mime_type !== 'string') return { error: 'mime_type must be a string' };
    data.mime_type = b.mime_type;
  }
  if ('duration_sec' in b) {
    if (typeof b.duration_sec !== 'number' || !Number.isFinite(b.duration_sec)) return { error: 'duration_sec must be a number' };
    data.duration_sec = b.duration_sec;
  }
  if ('storage_ref' in b) {
    if (typeof b.storage_ref !== 'string') return { error: 'storage_ref must be a string' };
    data.storage_ref = b.storage_ref;
  }
  if ('cdn_url' in b) {
    if (typeof b.cdn_url !== 'string') return { error: 'cdn_url must be a string' };
    data.cdn_url = b.cdn_url;
  }
  if ('thumbnail_url' in b) {
    if (typeof b.thumbnail_url !== 'string') return { error: 'thumbnail_url must be a string' };
    data.thumbnail_url = b.thumbnail_url;
  }
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('is_transcribed' in b) {
    if (typeof b.is_transcribed !== 'boolean') return { error: 'is_transcribed must be a boolean' };
    data.is_transcribed = b.is_transcribed;
  }
  if ('publication_state' in b) {
    if (typeof b.publication_state !== 'string') return { error: 'publication_state must be a string' };
    data.publication_state = b.publication_state;
  }
  if ('policy_ref' in b) {
    if (typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string' };
    data.policy_ref = b.policy_ref;
  }
  if ('workspace_ref' in b) {
    if (typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmMediaAssetPatch };
}

export function validateCmTranscriptCreate(body: unknown): SchemaValidationResult<CmTranscriptCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.asset_id !== 'string' || !b.asset_id.trim()) return { error: 'asset_id is required and must be a non-empty string' };
  data.asset_id = b.asset_id.trim();
  if (typeof b.transcript_text !== 'string' || !b.transcript_text.trim()) return { error: 'transcript_text is required and must be a non-empty string' };
  data.transcript_text = b.transcript_text.trim();
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('is_auto_generated' in b) {
    if (typeof b.is_auto_generated !== 'boolean') return { error: 'is_auto_generated must be a boolean' };
    data.is_auto_generated = b.is_auto_generated;
  }
  if ('is_reviewed' in b) {
    if (typeof b.is_reviewed !== 'boolean') return { error: 'is_reviewed must be a boolean' };
    data.is_reviewed = b.is_reviewed;
  }
  if ('word_timestamps_json' in b) {
    if (typeof b.word_timestamps_json !== 'string') return { error: 'word_timestamps_json must be a string' };
    data.word_timestamps_json = b.word_timestamps_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmTranscriptCreate };
}

export function validateCmMediaAssetInput(body: unknown): SchemaValidationResult<CmMediaAssetInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.asset_type !== 'string' || !b.asset_type.trim()) return { error: 'asset_type is required and must be a non-empty string' };
  data.asset_type = b.asset_type.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('file_name' in b) {
    if (b.file_name !== null && typeof b.file_name !== 'string') return { error: 'file_name must be a string or null' };
    data.file_name = b.file_name;
  }
  if ('file_size_bytes' in b) {
    if (b.file_size_bytes !== null && (typeof b.file_size_bytes !== 'number' || !Number.isFinite(b.file_size_bytes))) return { error: 'file_size_bytes must be a number or null' };
    data.file_size_bytes = b.file_size_bytes;
  }
  if ('mime_type' in b) {
    if (b.mime_type !== null && typeof b.mime_type !== 'string') return { error: 'mime_type must be a string or null' };
    data.mime_type = b.mime_type;
  }
  if ('duration_sec' in b) {
    if (b.duration_sec !== null && (typeof b.duration_sec !== 'number' || !Number.isFinite(b.duration_sec))) return { error: 'duration_sec must be a number or null' };
    data.duration_sec = b.duration_sec;
  }
  if ('storage_ref' in b) {
    if (b.storage_ref !== null && typeof b.storage_ref !== 'string') return { error: 'storage_ref must be a string or null' };
    data.storage_ref = b.storage_ref;
  }
  if ('cdn_url' in b) {
    if (b.cdn_url !== null && typeof b.cdn_url !== 'string') return { error: 'cdn_url must be a string or null' };
    data.cdn_url = b.cdn_url;
  }
  if ('thumbnail_url' in b) {
    if (b.thumbnail_url !== null && typeof b.thumbnail_url !== 'string') return { error: 'thumbnail_url must be a string or null' };
    data.thumbnail_url = b.thumbnail_url;
  }
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('publication_state' in b) {
    if (typeof b.publication_state !== 'string') return { error: 'publication_state must be a string' };
    data.publication_state = b.publication_state;
  }
  if ('policy_ref' in b) {
    if (b.policy_ref !== null && typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string or null' };
    data.policy_ref = b.policy_ref;
  }
  if ('workspace_ref' in b) {
    if (b.workspace_ref !== null && typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string or null' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmMediaAssetInput };
}

export function validateCmMediaTranscriptInput(body: unknown): SchemaValidationResult<CmMediaTranscriptInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.asset_id !== 'string' || !b.asset_id.trim()) return { error: 'asset_id is required and must be a non-empty string' };
  data.asset_id = b.asset_id.trim();
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if (typeof b.transcript_text !== 'string' || !b.transcript_text.trim()) return { error: 'transcript_text is required and must be a non-empty string' };
  data.transcript_text = b.transcript_text.trim();
  if ('is_auto_generated' in b) {
    if (typeof b.is_auto_generated !== 'number' || !Number.isFinite(b.is_auto_generated)) return { error: 'is_auto_generated must be a number' };
    data.is_auto_generated = b.is_auto_generated;
  }
  if ('is_reviewed' in b) {
    if (typeof b.is_reviewed !== 'number' || !Number.isFinite(b.is_reviewed)) return { error: 'is_reviewed must be a number' };
    data.is_reviewed = b.is_reviewed;
  }
  if ('word_timestamps_json' in b) {
    if (b.word_timestamps_json !== null && typeof b.word_timestamps_json !== 'string') return { error: 'word_timestamps_json must be a string or null' };
    data.word_timestamps_json = b.word_timestamps_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmMediaTranscriptInput };
}

export function validateCmAudioSceneInput(body: unknown): SchemaValidationResult<CmAudioSceneInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.asset_id !== 'string' || !b.asset_id.trim()) return { error: 'asset_id is required and must be a non-empty string' };
  data.asset_id = b.asset_id.trim();
  if ('transcript_id' in b) {
    if (b.transcript_id !== null && typeof b.transcript_id !== 'string') return { error: 'transcript_id must be a string or null' };
    data.transcript_id = b.transcript_id;
  }
  if (typeof b.scene_index !== 'number' || !Number.isFinite(b.scene_index)) return { error: 'scene_index is required and must be a number' };
  data.scene_index = b.scene_index;
  if ('scene_type' in b) {
    if (typeof b.scene_type !== 'string') return { error: 'scene_type must be a string' };
    data.scene_type = b.scene_type;
  }
  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if (typeof b.start_ms !== 'number' || !Number.isFinite(b.start_ms)) return { error: 'start_ms is required and must be a number' };
  data.start_ms = b.start_ms;
  if (typeof b.end_ms !== 'number' || !Number.isFinite(b.end_ms)) return { error: 'end_ms is required and must be a number' };
  data.end_ms = b.end_ms;
  if ('speaker_ref' in b) {
    if (b.speaker_ref !== null && typeof b.speaker_ref !== 'string') return { error: 'speaker_ref must be a string or null' };
    data.speaker_ref = b.speaker_ref;
  }
  if ('transcript_excerpt' in b) {
    if (b.transcript_excerpt !== null && typeof b.transcript_excerpt !== 'string') return { error: 'transcript_excerpt must be a string or null' };
    data.transcript_excerpt = b.transcript_excerpt;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmAudioSceneInput };
}

export function validateCmMediaChapterInput(body: unknown): SchemaValidationResult<CmMediaChapterInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.asset_id !== 'string' || !b.asset_id.trim()) return { error: 'asset_id is required and must be a non-empty string' };
  data.asset_id = b.asset_id.trim();
  if (typeof b.chapter_index !== 'number' || !Number.isFinite(b.chapter_index)) return { error: 'chapter_index is required and must be a number' };
  data.chapter_index = b.chapter_index;
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if (typeof b.start_ms !== 'number' || !Number.isFinite(b.start_ms)) return { error: 'start_ms is required and must be a number' };
  data.start_ms = b.start_ms;
  if ('end_ms' in b) {
    if (b.end_ms !== null && (typeof b.end_ms !== 'number' || !Number.isFinite(b.end_ms))) return { error: 'end_ms must be a number or null' };
    data.end_ms = b.end_ms;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmMediaChapterInput };
}
