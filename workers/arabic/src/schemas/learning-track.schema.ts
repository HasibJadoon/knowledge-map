// ─── Learning Track schemas & types ───────────────────────────────────────────

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ArLearningTrackType =
  | 'grammar'
  | 'vocabulary'
  | 'reading'
  | 'conversation'
  | 'quran'
  | 'custom';

export interface ArLearningTrack {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  track_type: ArLearningTrackType;
  cefr_from: CefrLevel | null;
  cefr_to: CefrLevel | null;
  description_md: string | null;
  prerequisites_json: string | null; // JSON [track_id]
  sort_order: number;
  is_public: boolean;
  created_at: string;
}

export interface ArLearningTrackCreate {
  title: string;
  track_type?: ArLearningTrackType;
  slug?: string;
  title_ar?: string | null;
  cefr_from?: CefrLevel | null;
  cefr_to?: CefrLevel | null;
  description_md?: string | null;
  is_public?: boolean;
}

export interface ArLearningTrackPatch {
  title?: string;
  track_type?: ArLearningTrackType;
  slug?: string;
  title_ar?: string | null;
  cefr_from?: CefrLevel | null;
  cefr_to?: CefrLevel | null;
  description_md?: string | null;
  prerequisites_json?: string | null;
  sort_order?: number;
  is_public?: boolean;
}

// ─── User Track Profile ────────────────────────────────────────────────────────

export interface ArUserTrackProfile {
  id: string;                        // AR:ULID
  core_user_ref: string;             // CORE:<user_id>
  track_id: string;
  current_level: CefrLevel | null;
  started_at: string;
  last_activity_at: string | null;
  total_xp: number;
  meta_json: string | null;
}

export interface ArUserTrackProfileUpsert {
  core_user_ref: string;
  track_id: string;
  current_level?: CefrLevel | null;
  total_xp?: number;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_TRACK_TYPES: ArLearningTrackType[] = [
  'grammar', 'vocabulary', 'reading', 'conversation', 'quran', 'custom',
];

const VALID_CEFR: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function validateArLearningTrackCreate(
  body: unknown,
): { data: ArLearningTrackCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  if (b.track_type !== undefined && !VALID_TRACK_TYPES.includes(b.track_type as ArLearningTrackType)) {
    return { error: `track_type must be one of: ${VALID_TRACK_TYPES.join(', ')}` };
  }

  if (b.cefr_from !== undefined && b.cefr_from !== null && !VALID_CEFR.includes(b.cefr_from as CefrLevel)) {
    return { error: `cefr_from must be one of: ${VALID_CEFR.join(', ')}` };
  }

  if (b.cefr_to !== undefined && b.cefr_to !== null && !VALID_CEFR.includes(b.cefr_to as CefrLevel)) {
    return { error: `cefr_to must be one of: ${VALID_CEFR.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      track_type: b.track_type !== undefined ? (b.track_type as ArLearningTrackType) : undefined,
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
      cefr_from: (b.cefr_from as CefrLevel | null | undefined),
      cefr_to: (b.cefr_to as CefrLevel | null | undefined),
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      is_public: typeof b.is_public === 'boolean' ? b.is_public : undefined,
    },
  };
}

export function validateArUserTrackProfileUpsert(
  body: unknown,
): { data: ArUserTrackProfileUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.core_user_ref || typeof b.core_user_ref !== 'string') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (!b.track_id || typeof b.track_id !== 'string') {
    return { error: 'track_id is required and must be a string' };
  }
  if (b.current_level !== undefined && b.current_level !== null && !VALID_CEFR.includes(b.current_level as CefrLevel)) {
    return { error: `current_level must be one of: ${VALID_CEFR.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b.core_user_ref as string,
      track_id: b.track_id as string,
      current_level: b.current_level !== undefined ? (b.current_level as CefrLevel | null) : undefined,
      total_xp: typeof b.total_xp === 'number' ? Math.max(0, Math.floor(b.total_xp)) : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface LearningTrack {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  track_type: string;         // classical|quranic|msa|dialect|academic|custom
  cefr_from: string | null;
  cefr_to: string | null;
  description_md: string | null;
  prerequisites_json: string | null;
  sort_order: number;
  is_public: number;
  created_at: string;
}

export interface LearningTrackCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  track_type?: string;
  cefr_from?: string | null;
  cefr_to?: string | null;
  description_md?: string | null;
  prerequisites_json?: string | null;
  sort_order?: number;
  is_public?: number;
}

export interface UserTrackProfile {
  id: string;
  core_user_ref: string;      // CORE:<user_id>
  track_id: string;
  current_level: string | null;
  started_at: string;
  last_activity_at: string | null;
  total_xp: number;
  meta_json: string | null;
}

export interface UserTrackProfilePatch {
  current_level?: string | null;
  last_activity_at?: string | null;
  meta_json?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLearningTrackPatch(body: unknown): SchemaValidationResult<ArLearningTrackPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('track_type' in b) {
    data.track_type = b.track_type;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('cefr_from' in b) {
    data.cefr_from = b.cefr_from;
  }
  if ('cefr_to' in b) {
    data.cefr_to = b.cefr_to;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('prerequisites_json' in b) {
    if (b.prerequisites_json !== null && typeof b.prerequisites_json !== 'string') return { error: 'prerequisites_json must be a string or null' };
    data.prerequisites_json = b.prerequisites_json;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }
  if ('is_public' in b) {
    if (typeof b.is_public !== 'boolean') return { error: 'is_public must be a boolean' };
    data.is_public = b.is_public;
  }

  return { data: data as unknown as ArLearningTrackPatch };
}

export function validateLearningTrackCreate(body: unknown): SchemaValidationResult<LearningTrackCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('track_type' in b) {
    if (typeof b.track_type !== 'string') return { error: 'track_type must be a string' };
    data.track_type = b.track_type;
  }
  if ('cefr_from' in b) {
    if (b.cefr_from !== null && typeof b.cefr_from !== 'string') return { error: 'cefr_from must be a string or null' };
    data.cefr_from = b.cefr_from;
  }
  if ('cefr_to' in b) {
    if (b.cefr_to !== null && typeof b.cefr_to !== 'string') return { error: 'cefr_to must be a string or null' };
    data.cefr_to = b.cefr_to;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('prerequisites_json' in b) {
    if (b.prerequisites_json !== null && typeof b.prerequisites_json !== 'string') return { error: 'prerequisites_json must be a string or null' };
    data.prerequisites_json = b.prerequisites_json;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }
  if ('is_public' in b) {
    if (typeof b.is_public !== 'number' || !Number.isFinite(b.is_public)) return { error: 'is_public must be a number' };
    data.is_public = b.is_public;
  }

  return { data: data as unknown as LearningTrackCreate };
}

export function validateUserTrackProfilePatch(body: unknown): SchemaValidationResult<UserTrackProfilePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('current_level' in b) {
    if (b.current_level !== null && typeof b.current_level !== 'string') return { error: 'current_level must be a string or null' };
    data.current_level = b.current_level;
  }
  if ('last_activity_at' in b) {
    if (b.last_activity_at !== null && typeof b.last_activity_at !== 'string') return { error: 'last_activity_at must be a string or null' };
    data.last_activity_at = b.last_activity_at;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as UserTrackProfilePatch };
}
