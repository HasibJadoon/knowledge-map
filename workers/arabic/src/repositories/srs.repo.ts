// ─── SrsRepo — ar_srs_decks + ar_srs_cards + ar_srs_reviews ──────────────────
// Full FSRS spaced-repetition system. Decks hold cards; each card tracks
// stability, difficulty, reps, lapses and state. Reviews log every rating event.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

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

// ── Column lists ──────────────────────────────────────────────────────────────

const DECK_COLS = `id, core_user_ref, core_ws_ref, title, deck_type,
  description, card_count, is_shared, meta_json, created_at`;

const CARD_COLS = `id, deck_id, core_user_ref, resource_ref, resource_type,
  stability, difficulty, elapsed_days, scheduled_days, reps, lapses,
  card_state, last_review_at, next_review_at, created_at, updated_at`;

const REVIEW_COLS = `id, card_id, core_user_ref, rating, stability_after,
  difficulty_after, scheduled_days_after, state_after,
  review_duration_secs, reviewed_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class SrsRepo {
  constructor(private db: D1Database) {}

  // ── Decks ────────────────────────────────────────────────────────────────────

  decks(userRef: string, opts: PaginateOptions = {}) {
    return paginate<SrsDeck>(
      this.db,
      `SELECT ${DECK_COLS} FROM ar_srs_decks WHERE core_user_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM ar_srs_decks WHERE core_user_ref = ?`,
      [userRef],
      opts,
    );
  }

  findDeckById(id: string): Promise<SrsDeck | null> {
    return queryOne<SrsDeck>(
      this.db,
      `SELECT ${DECK_COLS} FROM ar_srs_decks WHERE id = ?`,
      [id],
    );
  }

  async createDeck(input: SrsDeckCreate): Promise<SrsDeck> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_srs_decks
         (id, core_user_ref, core_ws_ref, title, deck_type,
          description, card_count, is_shared, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.title,
        input.deck_type ?? 'vocabulary',
        input.description ?? null,
        input.is_shared ?? 0,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findDeckById(id))!;
  }

  // ── Cards ────────────────────────────────────────────────────────────────────

  /** Cards due for review: next_review_at <= now, ordered by next_review_at. */
  dueCards(deckId: string, userRef: string, limit = 20): Promise<SrsCard[]> {
    const now = new Date().toISOString();
    return query<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_srs_cards
       WHERE deck_id = ? AND core_user_ref = ?
         AND (next_review_at IS NULL OR next_review_at <= ?)
         AND card_state != 'suspended'
       ORDER BY next_review_at NULLS FIRST
       LIMIT ?`,
      [deckId, userRef, now, limit],
    );
  }

  findCardById(id: string): Promise<SrsCard | null> {
    return queryOne<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_srs_cards WHERE id = ?`,
      [id],
    );
  }

  async createCard(input: SrsCardCreate): Promise<SrsCard> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_srs_cards
         (id, deck_id, core_user_ref, resource_ref, resource_type,
          stability, difficulty, elapsed_days, scheduled_days,
          reps, lapses, card_state, last_review_at, next_review_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 0, 0, 'new', NULL, ?, ?, ?)`,
      [
        id,
        input.deck_id,
        input.core_user_ref,
        input.resource_ref,
        input.resource_type,
        input.stability ?? 1.0,
        input.difficulty ?? 0.3,
        input.next_review_at ?? null,
        now,
        now,
      ],
    );
    // Increment deck card_count
    await execute(
      this.db,
      `UPDATE ar_srs_decks SET card_count = card_count + 1 WHERE id = ?`,
      [input.deck_id],
    );
    return (await this.findCardById(id))!;
  }

  async updateCard(id: string, patch: SrsCardPatch): Promise<SrsCard | null> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.stability         !== undefined) { sets.push('stability = ?');         vals.push(patch.stability); }
    if (patch.difficulty        !== undefined) { sets.push('difficulty = ?');        vals.push(patch.difficulty); }
    if (patch.elapsed_days      !== undefined) { sets.push('elapsed_days = ?');      vals.push(patch.elapsed_days); }
    if (patch.scheduled_days    !== undefined) { sets.push('scheduled_days = ?');    vals.push(patch.scheduled_days); }
    if (patch.reps              !== undefined) { sets.push('reps = ?');              vals.push(patch.reps); }
    if (patch.lapses            !== undefined) { sets.push('lapses = ?');            vals.push(patch.lapses); }
    if (patch.card_state        !== undefined) { sets.push('card_state = ?');        vals.push(patch.card_state); }
    if (patch.last_review_at    !== undefined) { sets.push('last_review_at = ?');    vals.push(patch.last_review_at); }
    if (patch.next_review_at    !== undefined) { sets.push('next_review_at = ?');    vals.push(patch.next_review_at); }
    vals.push(id);
    await execute(
      this.db,
      `UPDATE ar_srs_cards SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findCardById(id);
  }

  // ── Reviews ──────────────────────────────────────────────────────────────────

  async logReview(input: SrsReviewCreate): Promise<SrsReview> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_srs_reviews
         (id, card_id, core_user_ref, rating, stability_after,
          difficulty_after, scheduled_days_after, state_after,
          review_duration_secs, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.card_id,
        input.core_user_ref,
        input.rating,
        input.stability_after ?? null,
        input.difficulty_after ?? null,
        input.scheduled_days_after ?? null,
        input.state_after ?? null,
        input.review_duration_secs ?? null,
        now,
      ],
    );
    return (await queryOne<SrsReview>(
      this.db,
      `SELECT ${REVIEW_COLS} FROM ar_srs_reviews WHERE id = ?`,
      [id],
    ))!;
  }
}
