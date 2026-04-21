// ─── MediaRepo — cm_media_assets + cm_media_transcripts + cm_audio_scenes + cm_media_chapters ──
// Media asset lifecycle: upload tracking, transcript storage, scene segmentation,
// and chapter markers for audio/video content.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_media_assets
// ---------------------------------------------------------------------------

export interface CmMediaAsset {
  asset_id: string;
  core_user_ref: string;
  asset_type: string;
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
  is_transcribed: number;       // 0 | 1
  publication_state: string;
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

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

export interface CmMediaAssetPatch {
  title?: string;
  title_ar?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  duration_sec?: number | null;
  storage_ref?: string | null;
  cdn_url?: string | null;
  thumbnail_url?: string | null;
  language?: string;
  is_transcribed?: number;
  publication_state?: string;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  meta_json?: string;
}

const ASSET_COLS = `asset_id, core_user_ref, asset_type, title, title_ar,
  file_name, file_size_bytes, mime_type, duration_sec, storage_ref, cdn_url,
  thumbnail_url, language, is_transcribed, publication_state, policy_ref,
  workspace_ref, tags_json, meta_json, created_at, updated_at`;

// ---------------------------------------------------------------------------
// cm_media_transcripts
// ---------------------------------------------------------------------------

export interface CmMediaTranscript {
  transcript_id: string;
  asset_id: string;
  language: string;
  transcript_text: string;
  is_auto_generated: number;    // 0 | 1
  is_reviewed: number;          // 0 | 1
  word_timestamps_json: string | null;
  meta_json: string;
  created_at: string;
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

const TRANSCRIPT_COLS = `transcript_id, asset_id, language, transcript_text,
  is_auto_generated, is_reviewed, word_timestamps_json, meta_json, created_at`;

// ---------------------------------------------------------------------------
// cm_audio_scenes
// ---------------------------------------------------------------------------

export interface CmAudioScene {
  scene_id: string;
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
  tags_json: string;
  meta_json: string;
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

const SCENE_COLS = `scene_id, asset_id, transcript_id, scene_index, scene_type,
  title, description, start_ms, end_ms, speaker_ref, transcript_excerpt,
  tags_json, meta_json`;

// ---------------------------------------------------------------------------
// cm_media_chapters
// ---------------------------------------------------------------------------

export interface CmMediaChapter {
  chapter_id: string;
  asset_id: string;
  chapter_index: number;
  title: string;
  title_ar: string | null;
  start_ms: number;
  end_ms: number | null;
  description: string | null;
  meta_json: string;
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

const CHAPTER_COLS = `chapter_id, asset_id, chapter_index, title, title_ar,
  start_ms, end_ms, description, meta_json`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class MediaRepo {
  constructor(private db: D1Database) {}

  // ── cm_media_assets ──────────────────────────────────────────────────────

  list(workspaceRef: string | null, opts: PaginateOptions = {}) {
    const where  = workspaceRef ? 'WHERE workspace_ref = ?' : '';
    const params = workspaceRef ? [workspaceRef] : [];
    return paginate<CmMediaAsset>(
      this.db,
      `SELECT ${ASSET_COLS} FROM cm_media_assets ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_media_assets ${where}`,
      params, opts,
    );
  }

  findById(assetId: string): Promise<CmMediaAsset | null> {
    return queryOne<CmMediaAsset>(
      this.db,
      `SELECT ${ASSET_COLS} FROM cm_media_assets WHERE asset_id = ?`,
      [assetId],
    );
  }

  async create(input: CmMediaAssetInput): Promise<CmMediaAsset> {
    const asset_id = typedId('CM');
    const now      = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_media_assets
         (asset_id, core_user_ref, asset_type, title, title_ar, file_name,
          file_size_bytes, mime_type, duration_sec, storage_ref, cdn_url,
          thumbnail_url, language, is_transcribed, publication_state, policy_ref,
          workspace_ref, tags_json, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset_id, input.core_user_ref, input.asset_type, input.title,
        input.title_ar         ?? null,
        input.file_name        ?? null,
        input.file_size_bytes  ?? null,
        input.mime_type        ?? null,
        input.duration_sec     ?? null,
        input.storage_ref      ?? null,
        input.cdn_url          ?? null,
        input.thumbnail_url    ?? null,
        input.language         ?? 'en',
        input.publication_state ?? 'draft',
        input.policy_ref       ?? null,
        input.workspace_ref    ?? null,
        input.tags_json        ?? '[]',
        input.meta_json        ?? '{}',
        now, now,
      ],
    );
    return (await this.findById(asset_id))!;
  }

  async patch(assetId: string, patch: CmMediaAssetPatch): Promise<CmMediaAsset | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.title             !== undefined) { sets.push('title = ?');             vals.push(patch.title); }
    if (patch.title_ar          !== undefined) { sets.push('title_ar = ?');          vals.push(patch.title_ar); }
    if (patch.file_name         !== undefined) { sets.push('file_name = ?');         vals.push(patch.file_name); }
    if (patch.file_size_bytes   !== undefined) { sets.push('file_size_bytes = ?');   vals.push(patch.file_size_bytes); }
    if (patch.mime_type         !== undefined) { sets.push('mime_type = ?');         vals.push(patch.mime_type); }
    if (patch.duration_sec      !== undefined) { sets.push('duration_sec = ?');      vals.push(patch.duration_sec); }
    if (patch.storage_ref       !== undefined) { sets.push('storage_ref = ?');       vals.push(patch.storage_ref); }
    if (patch.cdn_url           !== undefined) { sets.push('cdn_url = ?');           vals.push(patch.cdn_url); }
    if (patch.thumbnail_url     !== undefined) { sets.push('thumbnail_url = ?');     vals.push(patch.thumbnail_url); }
    if (patch.language          !== undefined) { sets.push('language = ?');          vals.push(patch.language); }
    if (patch.is_transcribed    !== undefined) { sets.push('is_transcribed = ?');    vals.push(patch.is_transcribed); }
    if (patch.publication_state !== undefined) { sets.push('publication_state = ?'); vals.push(patch.publication_state); }
    if (patch.policy_ref        !== undefined) { sets.push('policy_ref = ?');        vals.push(patch.policy_ref); }
    if (patch.workspace_ref     !== undefined) { sets.push('workspace_ref = ?');     vals.push(patch.workspace_ref); }
    if (patch.tags_json         !== undefined) { sets.push('tags_json = ?');         vals.push(patch.tags_json); }
    if (patch.meta_json         !== undefined) { sets.push('meta_json = ?');         vals.push(patch.meta_json); }
    vals.push(assetId);
    await execute(this.db, `UPDATE cm_media_assets SET ${sets.join(', ')} WHERE asset_id = ?`, vals);
    return this.findById(assetId);
  }

  // ── cm_media_transcripts ─────────────────────────────────────────────────

  transcript(assetId: string): Promise<CmMediaTranscript | null> {
    return queryOne<CmMediaTranscript>(
      this.db,
      `SELECT ${TRANSCRIPT_COLS} FROM cm_media_transcripts
       WHERE asset_id = ? ORDER BY created_at DESC LIMIT 1`,
      [assetId],
    );
  }

  async createTranscript(input: CmMediaTranscriptInput): Promise<CmMediaTranscript> {
    const transcript_id = typedId('CM');
    const now           = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_media_transcripts
         (transcript_id, asset_id, language, transcript_text, is_auto_generated,
          is_reviewed, word_timestamps_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transcript_id, input.asset_id,
        input.language             ?? 'en',
        input.transcript_text,
        input.is_auto_generated    ?? 1,
        input.is_reviewed          ?? 0,
        input.word_timestamps_json ?? null,
        input.meta_json            ?? '{}',
        now,
      ],
    );
    return (await queryOne<CmMediaTranscript>(
      this.db,
      `SELECT ${TRANSCRIPT_COLS} FROM cm_media_transcripts WHERE transcript_id = ?`,
      [transcript_id],
    ))!;
  }

  // ── cm_audio_scenes ──────────────────────────────────────────────────────

  scenes(assetId: string, opts: PaginateOptions = {}) {
    return paginate<CmAudioScene>(
      this.db,
      `SELECT ${SCENE_COLS} FROM cm_audio_scenes
       WHERE asset_id = ? ORDER BY scene_index ASC`,
      `SELECT COUNT(*) AS count FROM cm_audio_scenes WHERE asset_id = ?`,
      [assetId], opts,
    );
  }

  async createScene(input: CmAudioSceneInput): Promise<CmAudioScene> {
    const scene_id = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_audio_scenes
         (scene_id, asset_id, transcript_id, scene_index, scene_type, title,
          description, start_ms, end_ms, speaker_ref, transcript_excerpt,
          tags_json, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scene_id, input.asset_id,
        input.transcript_id    ?? null,
        input.scene_index,
        input.scene_type       ?? 'segment',
        input.title            ?? null,
        input.description      ?? null,
        input.start_ms,
        input.end_ms,
        input.speaker_ref      ?? null,
        input.transcript_excerpt ?? null,
        input.tags_json        ?? '[]',
        input.meta_json        ?? '{}',
      ],
    );
    return (await queryOne<CmAudioScene>(
      this.db,
      `SELECT ${SCENE_COLS} FROM cm_audio_scenes WHERE scene_id = ?`,
      [scene_id],
    ))!;
  }

  // ── cm_media_chapters ────────────────────────────────────────────────────

  chapters(assetId: string): Promise<CmMediaChapter[]> {
    return query<CmMediaChapter>(
      this.db,
      `SELECT ${CHAPTER_COLS} FROM cm_media_chapters
       WHERE asset_id = ? ORDER BY chapter_index ASC`,
      [assetId],
    );
  }

  async createChapter(input: CmMediaChapterInput): Promise<CmMediaChapter> {
    const chapter_id = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_media_chapters
         (chapter_id, asset_id, chapter_index, title, title_ar,
          start_ms, end_ms, description, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chapter_id, input.asset_id,
        input.chapter_index,
        input.title,
        input.title_ar    ?? null,
        input.start_ms,
        input.end_ms      ?? null,
        input.description ?? null,
        input.meta_json   ?? '{}',
      ],
    );
    return (await queryOne<CmMediaChapter>(
      this.db,
      `SELECT ${CHAPTER_COLS} FROM cm_media_chapters WHERE chapter_id = ?`,
      [chapter_id],
    ))!;
  }
}
