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
