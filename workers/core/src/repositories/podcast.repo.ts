// ─── PodcastRepo — core_podcasts + core_podcast_participants + core_talking_points ─

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Podcast {
  id: string;
  workspace_id: string;
  title: string;
  description_md: string | null;
  podcast_type: 'discussion' | 'lecture' | 'interview' | 'reading_session' | 'other';
  status: 'planned' | 'recorded' | 'published' | 'archived';
  recorded_at: string | null;
  duration_secs: number | null;
  media_ref: string | null;
  host_user_ref: string | null;
  visibility: string;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PodcastCreate {
  workspaceId: string;
  title: string;
  descriptionMd?: string;
  podcastType?: Podcast['podcast_type'];
  status?: Podcast['status'];
  recordedAt?: string;
  durationSecs?: number;
  mediaRef?: string;
  hostUserRef?: string;
  visibility?: string;
  metaJson?: string;
}

export type PodcastPatch = Partial<Omit<PodcastCreate, 'workspaceId'>>;

export interface PodcastListOptions extends PaginateOptions {
  status?: Podcast['status'];
}

export interface PodcastParticipant {
  id: string;
  podcast_id: string;
  person_id: string | null;
  user_ref: string | null;
  role: 'host' | 'guest' | 'moderator' | 'producer';
  display_name: string | null;
  created_at: string;
}

export interface ParticipantInput {
  personId?: string;
  userRef?: string;
  role?: PodcastParticipant['role'];
  displayName?: string;
}

export interface TalkingPoint {
  id: string;
  podcast_id: string;
  speaker_ref: string | null;
  timestamp_secs: number | null;
  content: string;
  topic_ref: string | null;
  sort_order: number;
  created_at: string;
}

export interface TalkingPointInput {
  speakerRef?: string;
  timestampSecs?: number;
  content: string;
  topicRef?: string;
  sortOrder?: number;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const PODCAST_COLS = `
  id, workspace_id, title, description_md, podcast_type, status,
  recorded_at, duration_secs, media_ref, host_user_ref, visibility,
  meta_json, created_at, updated_at
FROM core_podcasts`;

const PARTICIPANT_COLS = `
  id, podcast_id, person_id, user_ref, role, display_name, created_at
FROM core_podcast_participants`;

const TP_COLS = `
  id, podcast_id, speaker_ref, timestamp_secs, content, topic_ref,
  sort_order, created_at
FROM core_talking_points`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class PodcastRepo {
  constructor(private db: D1Database) {}

  // ── Podcasts ──

  list(workspaceId: string, opts: PodcastListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.status) {
      conditions.push('status = ?');
      args.push(opts.status);
    }

    const where = conditions.join(' AND ');
    return paginate<Podcast>(
      this.db,
      `SELECT ${PODCAST_COLS} WHERE ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_podcasts WHERE ${where}`,
      args,
      opts,
    );
  }

  findById(id: string): Promise<Podcast | null> {
    return queryOne<Podcast>(
      this.db,
      `SELECT ${PODCAST_COLS} WHERE id = ?`,
      [id],
    );
  }

  async create(input: PodcastCreate): Promise<Podcast> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_podcasts
         (id, workspace_id, title, description_md, podcast_type, status,
          recorded_at, duration_secs, media_ref, host_user_ref, visibility,
          meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.title,
        input.descriptionMd ?? null,
        input.podcastType ?? 'discussion',
        input.status ?? 'planned',
        input.recordedAt ?? null,
        input.durationSecs ?? null,
        input.mediaRef ?? null,
        input.hostUserRef ?? null,
        input.visibility ?? 'workspace',
        input.metaJson ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PodcastPatch): Promise<Podcast | null> {
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [new Date().toISOString()];

    if (patch.title !== undefined)         { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.descriptionMd !== undefined) { sets.push('description_md = ?'); vals.push(patch.descriptionMd); }
    if (patch.podcastType !== undefined)   { sets.push('podcast_type = ?');   vals.push(patch.podcastType); }
    if (patch.status !== undefined)        { sets.push('status = ?');         vals.push(patch.status); }
    if (patch.recordedAt !== undefined)    { sets.push('recorded_at = ?');    vals.push(patch.recordedAt); }
    if (patch.durationSecs !== undefined)  { sets.push('duration_secs = ?');  vals.push(patch.durationSecs); }
    if (patch.mediaRef !== undefined)      { sets.push('media_ref = ?');      vals.push(patch.mediaRef); }
    if (patch.hostUserRef !== undefined)   { sets.push('host_user_ref = ?');  vals.push(patch.hostUserRef); }
    if (patch.visibility !== undefined)    { sets.push('visibility = ?');     vals.push(patch.visibility); }
    if (patch.metaJson !== undefined)      { sets.push('meta_json = ?');      vals.push(patch.metaJson); }

    if (sets.length === 1) return this.findById(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE core_podcasts SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  // ── Participants ──

  participants(podcastId: string): Promise<PodcastParticipant[]> {
    return query<PodcastParticipant>(
      this.db,
      `SELECT ${PARTICIPANT_COLS} WHERE podcast_id = ? ORDER BY created_at`,
      [podcastId],
    );
  }

  async addParticipant(
    podcastId: string,
    input: ParticipantInput,
  ): Promise<PodcastParticipant> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_podcast_participants
         (id, podcast_id, person_id, user_ref, role, display_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        podcastId,
        input.personId ?? null,
        input.userRef ?? null,
        input.role ?? 'guest',
        input.displayName ?? null,
        now,
      ],
    );
    return (await queryOne<PodcastParticipant>(
      this.db,
      `SELECT ${PARTICIPANT_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  async removeParticipant(participantId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_podcast_participants WHERE id = ?`,
      [participantId],
    );
  }

  // ── Talking Points ──

  talkingPoints(podcastId: string): Promise<TalkingPoint[]> {
    return query<TalkingPoint>(
      this.db,
      `SELECT ${TP_COLS} WHERE podcast_id = ? ORDER BY sort_order, timestamp_secs`,
      [podcastId],
    );
  }

  async addTalkingPoint(
    podcastId: string,
    input: TalkingPointInput,
  ): Promise<TalkingPoint> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_talking_points
         (id, podcast_id, speaker_ref, timestamp_secs, content, topic_ref,
          sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        podcastId,
        input.speakerRef ?? null,
        input.timestampSecs ?? null,
        input.content,
        input.topicRef ?? null,
        input.sortOrder ?? 0,
        now,
      ],
    );
    return (await queryOne<TalkingPoint>(
      this.db,
      `SELECT ${TP_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  async deleteTalkingPoint(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_talking_points WHERE id = ?`,
      [id],
    );
  }
}
