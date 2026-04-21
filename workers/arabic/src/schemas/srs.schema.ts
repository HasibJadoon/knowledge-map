// ─── SRS (Spaced Repetition System) schemas & types ───────────────────────────

export type ArSrsDeckType = 'vocabulary' | 'grammar' | 'verse' | 'custom';
export type ArSrsCardState = 'new' | 'learning' | 'review' | 'relearning';
export type ArSrsRating = 1 | 2 | 3 | 4;

// ─── SRS Deck ─────────────────────────────────────────────────────────────────

export interface ArSrsDeck {
  id: string;                        // AR:ULID
  core_user_ref: string;             // CORE:<user_id>
  core_ws_ref: string | null;        // CORE:<workspace_id>
  title: string;
  deck_type: ArSrsDeckType;
  description: string | null;
  card_count: number;
  is_shared: boolean;
  meta_json: string | null;
  created_at: string;
}

export interface ArSrsDeckCreate {
  core_user_ref: string;
  title: string;
  deck_type?: ArSrsDeckType;
  core_ws_ref?: string | null;
  description?: string | null;
  is_shared?: boolean;
}

export interface ArSrsDeckPatch {
  title?: string;
  deck_type?: ArSrsDeckType;
  core_ws_ref?: string | null;
  description?: string | null;
  is_shared?: boolean;
  meta_json?: string | null;
}

// ─── SRS Card ─────────────────────────────────────────────────────────────────

export interface ArSrsCard {
  id: string;                        // AR:ULID
  deck_id: string;
  core_user_ref: string;             // CORE:<user_id>
  resource_ref: string;              // typed ref to vocab/grammar/ayah/concept
  resource_type: string;
  stability: number;                 // FSRS memory stability S
  difficulty: number;                // FSRS item difficulty D (0–1)
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  card_state: ArSrsCardState;
  last_review_at: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArSrsCardCreate {
  deck_id: string;
  core_user_ref: string;
  resource_ref: string;
  resource_type: string;
}

export interface ArSrsCardPatch {
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  card_state?: ArSrsCardState;
  last_review_at?: string | null;
  next_review_at?: string | null;
}

// ─── SRS Review ───────────────────────────────────────────────────────────────

export interface ArSrsReview {
  id: string;                        // AR:ULID
  card_id: string;
  core_user_ref: string;             // CORE:<user_id>
  rating: ArSrsRating;              // FSRS: 1=Again 2=Hard 3=Good 4=Easy
  stability_after: number | null;
  difficulty_after: number | null;
  scheduled_days_after: number | null;
  state_after: string | null;
  review_duration_secs: number | null;
  reviewed_at: string;
}

export interface ArSrsReviewLog {
  card_id: string;
  core_user_ref: string;
  rating: ArSrsRating;
  stability_after?: number | null;
  difficulty_after?: number | null;
  scheduled_days_after?: number | null;
  state_after?: string | null;
  review_duration_secs?: number | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_DECK_TYPES: ArSrsDeckType[] = ['vocabulary', 'grammar', 'verse', 'custom'];
const VALID_RATINGS: ArSrsRating[] = [1, 2, 3, 4];

export function validateArSrsDeckCreate(
  body: unknown,
): { data: ArSrsDeckCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.core_user_ref || typeof b.core_user_ref !== 'string') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }
  if (b.deck_type !== undefined && !VALID_DECK_TYPES.includes(b.deck_type as ArSrsDeckType)) {
    return { error: `deck_type must be one of: ${VALID_DECK_TYPES.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b.core_user_ref as string,
      title: (b.title as string).trim(),
      deck_type: b.deck_type !== undefined ? (b.deck_type as ArSrsDeckType) : undefined,
      core_ws_ref: typeof b.core_ws_ref === 'string' ? b.core_ws_ref : b.core_ws_ref === null ? null : undefined,
      description: typeof b.description === 'string' ? b.description : b.description === null ? null : undefined,
      is_shared: typeof b.is_shared === 'boolean' ? b.is_shared : undefined,
    },
  };
}

export function validateArSrsCardCreate(
  body: unknown,
): { data: ArSrsCardCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.deck_id || typeof b.deck_id !== 'string') {
    return { error: 'deck_id is required and must be a string' };
  }
  if (!b.core_user_ref || typeof b.core_user_ref !== 'string') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (!b.resource_ref || typeof b.resource_ref !== 'string') {
    return { error: 'resource_ref is required and must be a string' };
  }
  if (!b.resource_type || typeof b.resource_type !== 'string') {
    return { error: 'resource_type is required and must be a string' };
  }

  return {
    data: {
      deck_id: b.deck_id as string,
      core_user_ref: b.core_user_ref as string,
      resource_ref: b.resource_ref as string,
      resource_type: b.resource_type as string,
    },
  };
}

export function validateArSrsReviewLog(
  body: unknown,
): { data: ArSrsReviewLog } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.card_id || typeof b.card_id !== 'string') {
    return { error: 'card_id is required and must be a string' };
  }
  if (!b.core_user_ref || typeof b.core_user_ref !== 'string') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (typeof b.rating !== 'number' || !VALID_RATINGS.includes(b.rating as ArSrsRating)) {
    return { error: 'rating is required and must be 1, 2, 3, or 4' };
  }

  return {
    data: {
      card_id: b.card_id as string,
      core_user_ref: b.core_user_ref as string,
      rating: b.rating as ArSrsRating,
      stability_after: typeof b.stability_after === 'number' ? b.stability_after : b.stability_after === null ? null : undefined,
      difficulty_after: typeof b.difficulty_after === 'number' ? b.difficulty_after : b.difficulty_after === null ? null : undefined,
      scheduled_days_after: typeof b.scheduled_days_after === 'number' ? b.scheduled_days_after : b.scheduled_days_after === null ? null : undefined,
      state_after: typeof b.state_after === 'string' ? b.state_after : b.state_after === null ? null : undefined,
      review_duration_secs: typeof b.review_duration_secs === 'number' ? b.review_duration_secs : b.review_duration_secs === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface SrsDeck {
  id: string;
  core_user_ref: string;      // CORE:<user_id>
  core_ws_ref: string | null; // CORE:<workspace_id>
  title: string;
  deck_type: string;          // vocabulary|grammar|ayah|balagha|expression|mixed|other
  description: string | null;
  card_count: number;
  is_shared: number;
  meta_json: string | null;
  created_at: string;
}

export interface SrsDeckCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  title: string;
  deck_type?: string;
  description?: string | null;
  is_shared?: number;
  meta_json?: string | null;
}

export interface SrsCard {
  id: string;
  deck_id: string;
  core_user_ref: string;
  resource_ref: string;       // typed ref to vocab/grammar/ayah/concept
  resource_type: string;      // vocabulary|grammar|ayah|balagha|expression|al_lemma|other
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  card_state: string;         // new|learning|review|relearning
  last_review_at: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SrsCardCreate {
  deck_id: string;
  core_user_ref: string;
  resource_ref: string;
  resource_type: string;
  stability?: number;
  difficulty?: number;
  next_review_at?: string | null;
}

export interface SrsCardPatch {
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  card_state?: string;
  last_review_at?: string | null;
  next_review_at?: string | null;
}

export interface SrsReview {
  id: string;
  card_id: string;
  core_user_ref: string;
  rating: number;             // 1=Again 2=Hard 3=Good 4=Easy
  stability_after: number | null;
  difficulty_after: number | null;
  scheduled_days_after: number | null;
  state_after: string | null;
  review_duration_secs: number | null;
  reviewed_at: string;
}

export interface SrsReviewCreate {
  card_id: string;
  core_user_ref: string;
  rating: number;
  stability_after?: number | null;
  difficulty_after?: number | null;
  scheduled_days_after?: number | null;
  state_after?: string | null;
  review_duration_secs?: number | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArSrsDeckPatch(body: unknown): SchemaValidationResult<ArSrsDeckPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('deck_type' in b) {
    data.deck_type = b.deck_type;
  }
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('is_shared' in b) {
    if (typeof b.is_shared !== 'boolean') return { error: 'is_shared must be a boolean' };
    data.is_shared = b.is_shared;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArSrsDeckPatch };
}

export function validateArSrsCardPatch(body: unknown): SchemaValidationResult<ArSrsCardPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('stability' in b) {
    if (typeof b.stability !== 'number' || !Number.isFinite(b.stability)) return { error: 'stability must be a number' };
    data.stability = b.stability;
  }
  if ('difficulty' in b) {
    if (typeof b.difficulty !== 'number' || !Number.isFinite(b.difficulty)) return { error: 'difficulty must be a number' };
    data.difficulty = b.difficulty;
  }
  if ('elapsed_days' in b) {
    if (typeof b.elapsed_days !== 'number' || !Number.isFinite(b.elapsed_days)) return { error: 'elapsed_days must be a number' };
    data.elapsed_days = b.elapsed_days;
  }
  if ('scheduled_days' in b) {
    if (typeof b.scheduled_days !== 'number' || !Number.isFinite(b.scheduled_days)) return { error: 'scheduled_days must be a number' };
    data.scheduled_days = b.scheduled_days;
  }
  if ('reps' in b) {
    if (typeof b.reps !== 'number' || !Number.isFinite(b.reps)) return { error: 'reps must be a number' };
    data.reps = b.reps;
  }
  if ('lapses' in b) {
    if (typeof b.lapses !== 'number' || !Number.isFinite(b.lapses)) return { error: 'lapses must be a number' };
    data.lapses = b.lapses;
  }
  if ('card_state' in b) {
    data.card_state = b.card_state;
  }
  if ('last_review_at' in b) {
    if (b.last_review_at !== null && typeof b.last_review_at !== 'string') return { error: 'last_review_at must be a string or null' };
    data.last_review_at = b.last_review_at;
  }
  if ('next_review_at' in b) {
    if (b.next_review_at !== null && typeof b.next_review_at !== 'string') return { error: 'next_review_at must be a string or null' };
    data.next_review_at = b.next_review_at;
  }

  return { data: data as unknown as ArSrsCardPatch };
}

export function validateSrsDeckCreate(body: unknown): SchemaValidationResult<SrsDeckCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('deck_type' in b) {
    if (typeof b.deck_type !== 'string') return { error: 'deck_type must be a string' };
    data.deck_type = b.deck_type;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('is_shared' in b) {
    if (typeof b.is_shared !== 'number' || !Number.isFinite(b.is_shared)) return { error: 'is_shared must be a number' };
    data.is_shared = b.is_shared;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as SrsDeckCreate };
}

export function validateSrsCardCreate(body: unknown): SchemaValidationResult<SrsCardCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.deck_id !== 'string' || !b.deck_id.trim()) return { error: 'deck_id is required and must be a non-empty string' };
  data.deck_id = b.deck_id.trim();
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.resource_type !== 'string' || !b.resource_type.trim()) return { error: 'resource_type is required and must be a non-empty string' };
  data.resource_type = b.resource_type.trim();
  if ('stability' in b) {
    if (typeof b.stability !== 'number' || !Number.isFinite(b.stability)) return { error: 'stability must be a number' };
    data.stability = b.stability;
  }
  if ('difficulty' in b) {
    if (typeof b.difficulty !== 'number' || !Number.isFinite(b.difficulty)) return { error: 'difficulty must be a number' };
    data.difficulty = b.difficulty;
  }
  if ('next_review_at' in b) {
    if (b.next_review_at !== null && typeof b.next_review_at !== 'string') return { error: 'next_review_at must be a string or null' };
    data.next_review_at = b.next_review_at;
  }

  return { data: data as unknown as SrsCardCreate };
}

export function validateSrsCardPatch(body: unknown): SchemaValidationResult<SrsCardPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('stability' in b) {
    if (typeof b.stability !== 'number' || !Number.isFinite(b.stability)) return { error: 'stability must be a number' };
    data.stability = b.stability;
  }
  if ('difficulty' in b) {
    if (typeof b.difficulty !== 'number' || !Number.isFinite(b.difficulty)) return { error: 'difficulty must be a number' };
    data.difficulty = b.difficulty;
  }
  if ('elapsed_days' in b) {
    if (typeof b.elapsed_days !== 'number' || !Number.isFinite(b.elapsed_days)) return { error: 'elapsed_days must be a number' };
    data.elapsed_days = b.elapsed_days;
  }
  if ('scheduled_days' in b) {
    if (typeof b.scheduled_days !== 'number' || !Number.isFinite(b.scheduled_days)) return { error: 'scheduled_days must be a number' };
    data.scheduled_days = b.scheduled_days;
  }
  if ('reps' in b) {
    if (typeof b.reps !== 'number' || !Number.isFinite(b.reps)) return { error: 'reps must be a number' };
    data.reps = b.reps;
  }
  if ('lapses' in b) {
    if (typeof b.lapses !== 'number' || !Number.isFinite(b.lapses)) return { error: 'lapses must be a number' };
    data.lapses = b.lapses;
  }
  if ('card_state' in b) {
    if (typeof b.card_state !== 'string') return { error: 'card_state must be a string' };
    data.card_state = b.card_state;
  }
  if ('last_review_at' in b) {
    if (b.last_review_at !== null && typeof b.last_review_at !== 'string') return { error: 'last_review_at must be a string or null' };
    data.last_review_at = b.last_review_at;
  }
  if ('next_review_at' in b) {
    if (b.next_review_at !== null && typeof b.next_review_at !== 'string') return { error: 'next_review_at must be a string or null' };
    data.next_review_at = b.next_review_at;
  }

  return { data: data as unknown as SrsCardPatch };
}

export function validateSrsReviewCreate(body: unknown): SchemaValidationResult<SrsReviewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.card_id !== 'string' || !b.card_id.trim()) return { error: 'card_id is required and must be a non-empty string' };
  data.card_id = b.card_id.trim();
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.rating !== 'number' || !Number.isFinite(b.rating)) return { error: 'rating is required and must be a number' };
  data.rating = b.rating;
  if ('stability_after' in b) {
    if (b.stability_after !== null && (typeof b.stability_after !== 'number' || !Number.isFinite(b.stability_after))) return { error: 'stability_after must be a number or null' };
    data.stability_after = b.stability_after;
  }
  if ('difficulty_after' in b) {
    if (b.difficulty_after !== null && (typeof b.difficulty_after !== 'number' || !Number.isFinite(b.difficulty_after))) return { error: 'difficulty_after must be a number or null' };
    data.difficulty_after = b.difficulty_after;
  }
  if ('scheduled_days_after' in b) {
    if (b.scheduled_days_after !== null && (typeof b.scheduled_days_after !== 'number' || !Number.isFinite(b.scheduled_days_after))) return { error: 'scheduled_days_after must be a number or null' };
    data.scheduled_days_after = b.scheduled_days_after;
  }
  if ('state_after' in b) {
    if (b.state_after !== null && typeof b.state_after !== 'string') return { error: 'state_after must be a string or null' };
    data.state_after = b.state_after;
  }
  if ('review_duration_secs' in b) {
    if (b.review_duration_secs !== null && (typeof b.review_duration_secs !== 'number' || !Number.isFinite(b.review_duration_secs))) return { error: 'review_duration_secs must be a number or null' };
    data.review_duration_secs = b.review_duration_secs;
  }

  return { data: data as unknown as SrsReviewCreate };
}
