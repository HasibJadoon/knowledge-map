// ─── Podcast schemas & types ───────────────────────────────────────────────────

// core_podcasts
import type { PaginateOptions } from '../../../shared/src/types';

export interface Podcast {
  id: string;                                           // CORE:ULID
  workspace_id: string;                                 // CORE:ULID → core_workspaces
  title: string;
  description_md: string | null;
  podcast_type: 'discussion' | 'lecture' | 'interview' | 'reading_session' | 'other';
  status: 'planned' | 'recorded' | 'published' | 'archived';
  recorded_at: string | null;
  duration_secs: number | null;
  media_ref: string | null;                             // 'CM:<media_asset_id>'
  host_user_ref: string | null;                         // 'CORE:<user_id>'
  visibility: string;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PodcastCreate {
  workspace_id: string;
  title: string;
  description_md?: string;
  podcast_type?: 'discussion' | 'lecture' | 'interview' | 'reading_session' | 'other';
  host_user_ref?: string;
}

export interface PodcastPatch {
  title?: string;
  description_md?: string | null;
  podcast_type?: 'discussion' | 'lecture' | 'interview' | 'reading_session' | 'other';
  status?: 'planned' | 'recorded' | 'published' | 'archived';
  recorded_at?: string | null;
  duration_secs?: number | null;
  media_ref?: string | null;
  host_user_ref?: string | null;
  visibility?: string;
  meta_json?: string | null;
}

// core_podcast_participants
export interface PodcastParticipant {
  id: string;                                           // CORE:ULID
  podcast_id: string;                                   // CORE:ULID → core_podcasts
  person_id: string | null;                             // → core_people.id (private) or NULL
  user_ref: string | null;                              // 'CORE:<user_id>' if has account
  role: 'host' | 'guest' | 'moderator' | 'producer';
  display_name: string | null;
  created_at: string;
}

export interface ParticipantAdd {
  person_id?: string;
  user_ref?: string;
  role?: 'host' | 'guest' | 'moderator' | 'producer';
  display_name?: string;
}

// core_talking_points
export interface TalkingPoint {
  id: string;                                           // CORE:ULID
  podcast_id: string;                                   // CORE:ULID → core_podcasts
  speaker_ref: string | null;                           // participant or user
  timestamp_secs: number | null;
  content: string;
  topic_ref: string | null;                             // typed ref to WV topic or QR scope
  sort_order: number;
  created_at: string;
}

export interface TalkingPointAdd {
  speaker_ref?: string;
  timestamp_secs?: number;
  content: string;
  topic_ref?: string;
  sort_order?: number;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validatePodcastCreate(
  body: unknown,
): { data: PodcastCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.title !== 'string' || !b.title.trim())
    return { error: 'title is required' };

  const podcastTypes = ['discussion', 'lecture', 'interview', 'reading_session', 'other'] as const;
  const podcast_type = (b.podcast_type as string) ?? 'discussion';
  if (!podcastTypes.includes(podcast_type as never))
    return { error: `podcast_type must be one of: ${podcastTypes.join(', ')}` };

  const data: PodcastCreate = {
    workspace_id: b.workspace_id.trim(),
    title: b.title.trim(),
    podcast_type: podcast_type as PodcastCreate['podcast_type'],
  };

  if (typeof b.description_md === 'string') data.description_md = b.description_md;
  if (typeof b.host_user_ref === 'string') data.host_user_ref = b.host_user_ref;

  return { data };
}

export function validatePodcastPatch(
  body: unknown,
): { data: PodcastPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const data: PodcastPatch = {};

  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || !b.title.trim())
      return { error: 'title must be a non-empty string' };
    data.title = b.title.trim();
  }

  if (b.podcast_type !== undefined) {
    const podcastTypes = ['discussion', 'lecture', 'interview', 'reading_session', 'other'] as const;
    if (!podcastTypes.includes(b.podcast_type as never))
      return { error: `podcast_type must be one of: ${podcastTypes.join(', ')}` };
    data.podcast_type = b.podcast_type as PodcastPatch['podcast_type'];
  }

  if (b.status !== undefined) {
    const statuses = ['planned', 'recorded', 'published', 'archived'] as const;
    if (!statuses.includes(b.status as never))
      return { error: `status must be one of: ${statuses.join(', ')}` };
    data.status = b.status as PodcastPatch['status'];
  }

  if (b.description_md !== undefined)
    data.description_md = typeof b.description_md === 'string' ? b.description_md : null;
  if (b.recorded_at !== undefined)
    data.recorded_at = typeof b.recorded_at === 'string' ? b.recorded_at : null;
  if (b.duration_secs !== undefined)
    data.duration_secs = typeof b.duration_secs === 'number' ? b.duration_secs : null;
  if (b.media_ref !== undefined)
    data.media_ref = typeof b.media_ref === 'string' ? b.media_ref : null;
  if (b.host_user_ref !== undefined)
    data.host_user_ref = typeof b.host_user_ref === 'string' ? b.host_user_ref : null;
  if (typeof b.visibility === 'string')
    data.visibility = b.visibility;
  if (b.meta_json !== undefined)
    data.meta_json = typeof b.meta_json === 'string' ? b.meta_json : null;

  return { data };
}

export function validateParticipantAdd(
  body: unknown,
): { data: ParticipantAdd } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  // At least one of person_id or user_ref is needed in practice, but both are optional here
  const data: ParticipantAdd = {};

  if (typeof b.person_id === 'string') data.person_id = b.person_id;
  if (typeof b.user_ref === 'string') data.user_ref = b.user_ref;
  if (typeof b.display_name === 'string') data.display_name = b.display_name;

  if (b.role !== undefined) {
    const roles = ['host', 'guest', 'moderator', 'producer'] as const;
    if (!roles.includes(b.role as never))
      return { error: `role must be one of: ${roles.join(', ')}` };
    data.role = b.role as ParticipantAdd['role'];
  }

  return { data };
}

export function validateTalkingPointAdd(
  body: unknown,
): { data: TalkingPointAdd } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.content !== 'string' || !b.content.trim())
    return { error: 'content is required' };

  const data: TalkingPointAdd = {
    content: b.content.trim(),
  };

  if (typeof b.speaker_ref === 'string') data.speaker_ref = b.speaker_ref;
  if (typeof b.timestamp_secs === 'number') data.timestamp_secs = b.timestamp_secs;
  if (typeof b.topic_ref === 'string') data.topic_ref = b.topic_ref;
  if (typeof b.sort_order === 'number') data.sort_order = b.sort_order;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface PodcastListOptions extends PaginateOptions {
  status?: Podcast['status'];
}

export interface ParticipantInput {
  personId?: string;
  userRef?: string;
  role?: PodcastParticipant['role'];
  displayName?: string;
}

export interface TalkingPointInput {
  speakerRef?: string;
  timestampSecs?: number;
  content: string;
  topicRef?: string;
  sortOrder?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateParticipantInput(body: unknown): SchemaValidationResult<ParticipantInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('personId' in b) {
    if (typeof b.personId !== 'string') return { error: 'personId must be a string' };
    data.personId = b.personId;
  }
  if ('userRef' in b) {
    if (typeof b.userRef !== 'string') return { error: 'userRef must be a string' };
    data.userRef = b.userRef;
  }
  if ('role' in b) {
    if (typeof b.role !== 'string') return { error: 'role must be a string' };
    data.role = b.role;
  }
  if ('displayName' in b) {
    if (typeof b.displayName !== 'string') return { error: 'displayName must be a string' };
    data.displayName = b.displayName;
  }

  return { data: data as unknown as ParticipantInput };
}

export function validateTalkingPointInput(body: unknown): SchemaValidationResult<TalkingPointInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('speakerRef' in b) {
    if (typeof b.speakerRef !== 'string') return { error: 'speakerRef must be a string' };
    data.speakerRef = b.speakerRef;
  }
  if ('timestampSecs' in b) {
    if (typeof b.timestampSecs !== 'number' || !Number.isFinite(b.timestampSecs)) return { error: 'timestampSecs must be a number' };
    data.timestampSecs = b.timestampSecs;
  }
  if (typeof b.content !== 'string' || !b.content.trim()) return { error: 'content is required and must be a non-empty string' };
  data.content = b.content.trim();
  if ('topicRef' in b) {
    if (typeof b.topicRef !== 'string') return { error: 'topicRef must be a string' };
    data.topicRef = b.topicRef;
  }
  if ('sortOrder' in b) {
    if (typeof b.sortOrder !== 'number' || !Number.isFinite(b.sortOrder)) return { error: 'sortOrder must be a number' };
    data.sortOrder = b.sortOrder;
  }

  return { data: data as unknown as TalkingPointInput };
}
