// ─── SrsRepo — ar_learn_srs_deck + ar_learn_srs_card + ar_learn_srs_review ──────────────────
// The K-MAPS spaced-repetition engine. Decks hold Anki-style cards (explicit
// front/back plus a typed resource_ref); each card tracks SM-2 scheduling
// state. Reviews log every rating event. Scheduling math lives in
// ../srs/scheduler.ts — this repo is storage only.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SrsDeck {
  id: string;
  core_user_ref: string;      // CORE:<user_id>
  core_ws_ref: string | null; // CORE:<workspace_id>
  title: string;
  deck_type: string;          // vocabulary|morphology|translation|theology|…
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

export interface SrsDeckPatch {
  title?: string;
  deck_type?: string;
  description?: string | null;
  is_shared?: number;
}

export interface SrsCard {
  id: string;
  deck_id: string;
  core_user_ref: string;
  resource_ref: string;       // typed ref to the canonical item, or '' for free-form
  resource_type: string;
  card_template: string;      // qr_vocab|qr_morph|wv_concept|freeform|…
  front_text: string;
  back_text: string;
  extra_json: string | null;
  tags: string | null;
  suspended: number;
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
  resource_ref?: string | null;
  resource_type?: string;
  card_template?: string;
  front_text: string;
  back_text: string;
  extra_json?: string | null;
  tags?: string | null;
}

export interface SrsCardPatch {
  front_text?: string;
  back_text?: string;
  extra_json?: string | null;
  tags?: string | null;
  card_template?: string;
  suspended?: number;
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

export interface SrsStats {
  decks: number;
  cards: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  suspended: number;
}

export interface SrsDeckSummary extends SrsDeck {
  due_count: number;
  new_count: number;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const DECK_COLS = `id, core_user_ref, core_ws_ref, title, deck_type,
  description, card_count, is_shared, meta_json, created_at`;

const CARD_COLS = `id, deck_id, core_user_ref, resource_ref, resource_type,
  card_template, front_text, back_text, extra_json, tags, suspended,
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
      `SELECT ${DECK_COLS} FROM ar_learn_srs_deck WHERE core_user_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM ar_learn_srs_deck WHERE core_user_ref = ?`,
      [userRef],
      opts,
    );
  }

  /** All decks for a user with live due / new counts — drives the dashboard. */
  async decksWithCounts(userRef: string): Promise<SrsDeckSummary[]> {
    const now = new Date().toISOString();
    return query<SrsDeckSummary>(
      this.db,
      `SELECT ${DECK_COLS.split(',').map((c) => `d.${c.trim()}`).join(', ')},
              COALESCE(SUM(
                CASE WHEN c.suspended = 0
                      AND c.next_review_at IS NOT NULL
                      AND c.next_review_at <= ? THEN 1 ELSE 0 END), 0) AS due_count,
              COALESCE(SUM(
                CASE WHEN c.suspended = 0
                      AND c.card_state = 'new' THEN 1 ELSE 0 END), 0) AS new_count
       FROM ar_learn_srs_deck d
       LEFT JOIN ar_learn_srs_card c ON c.deck_id = d.id
       WHERE d.core_user_ref = ?
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [now, userRef],
    );
  }

  findDeckById(id: string): Promise<SrsDeck | null> {
    return queryOne<SrsDeck>(
      this.db,
      `SELECT ${DECK_COLS} FROM ar_learn_srs_deck WHERE id = ?`,
      [id],
    );
  }

  async createDeck(input: SrsDeckCreate): Promise<SrsDeck> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_learn_srs_deck
         (id, core_user_ref, core_ws_ref, title, deck_type,
          description, card_count, is_shared, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.title,
        input.deck_type ?? 'mixed',
        input.description ?? null,
        input.is_shared ?? 0,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findDeckById(id))!;
  }

  async patchDeck(id: string, patch: SrsDeckPatch): Promise<SrsDeck | null> {
    const sets: string[]  = [];
    const vals: unknown[] = [];
    if (patch.title       !== undefined) { sets.push('title = ?');       vals.push(patch.title); }
    if (patch.deck_type   !== undefined) { sets.push('deck_type = ?');   vals.push(patch.deck_type); }
    if (patch.description !== undefined) { sets.push('description = ?'); vals.push(patch.description); }
    if (patch.is_shared   !== undefined) { sets.push('is_shared = ?');   vals.push(patch.is_shared); }
    if (sets.length === 0) return this.findDeckById(id);
    vals.push(id);
    await execute(this.db, `UPDATE ar_learn_srs_deck SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findDeckById(id);
  }

  /** Delete a deck and every card + review it owns. */
  async deleteDeck(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_learn_srs_review WHERE card_id IN (SELECT id FROM ar_learn_srs_card WHERE deck_id = ?)`,
      [id],
    );
    await execute(this.db, `DELETE FROM ar_learn_srs_card WHERE deck_id = ?`, [id]);
    await execute(this.db, `DELETE FROM ar_learn_srs_deck WHERE id = ?`, [id]);
  }

  // ── Cards ────────────────────────────────────────────────────────────────────

  /** Every card in a deck, newest first. */
  cardsInDeck(deckId: string): Promise<SrsCard[]> {
    return query<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_learn_srs_card WHERE deck_id = ? ORDER BY created_at DESC`,
      [deckId],
    );
  }

  /** Due cards for one deck: not suspended, next_review_at due (or never set). */
  dueCards(deckId: string, userRef: string, limit = 50): Promise<SrsCard[]> {
    const now = new Date().toISOString();
    return query<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_learn_srs_card
       WHERE deck_id = ? AND core_user_ref = ? AND suspended = 0
         AND (next_review_at IS NULL OR next_review_at <= ?)
       ORDER BY next_review_at IS NOT NULL, next_review_at ASC, created_at ASC
       LIMIT ?`,
      [deckId, userRef, now, limit],
    );
  }

  /** Due cards across every deck the user owns — the unified review queue. */
  dueAcrossDecks(userRef: string, limit = 100): Promise<SrsCard[]> {
    const now = new Date().toISOString();
    return query<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_learn_srs_card
       WHERE core_user_ref = ? AND suspended = 0
         AND (next_review_at IS NULL OR next_review_at <= ?)
       ORDER BY next_review_at IS NOT NULL, next_review_at ASC, created_at ASC
       LIMIT ?`,
      [userRef, now, limit],
    );
  }

  findCardById(id: string): Promise<SrsCard | null> {
    return queryOne<SrsCard>(
      this.db,
      `SELECT ${CARD_COLS} FROM ar_learn_srs_card WHERE id = ?`,
      [id],
    );
  }

  async createCard(input: SrsCardCreate): Promise<SrsCard> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_learn_srs_card
         (id, deck_id, core_user_ref, resource_ref, resource_type,
          card_template, front_text, back_text, extra_json, tags, suspended,
          stability, difficulty, elapsed_days, scheduled_days,
          reps, lapses, card_state, last_review_at, next_review_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0,
               1.0, 2.5, 0, 1, 0, 0, 'new', NULL, NULL, ?, ?)`,
      [
        id,
        input.deck_id,
        input.core_user_ref,
        input.resource_ref ?? '',
        input.resource_type ?? 'other',
        input.card_template ?? 'freeform',
        input.front_text,
        input.back_text,
        input.extra_json ?? null,
        input.tags ?? null,
        now,
        now,
      ],
    );
    await execute(
      this.db,
      `UPDATE ar_learn_srs_deck SET card_count = card_count + 1 WHERE id = ?`,
      [input.deck_id],
    );
    return (await this.findCardById(id))!;
  }

  async updateCard(id: string, patch: SrsCardPatch): Promise<SrsCard | null> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];
    const set = (col: string, val: unknown) => { sets.push(`${col} = ?`); vals.push(val); };

    if (patch.front_text     !== undefined) set('front_text', patch.front_text);
    if (patch.back_text      !== undefined) set('back_text', patch.back_text);
    if (patch.extra_json     !== undefined) set('extra_json', patch.extra_json);
    if (patch.tags           !== undefined) set('tags', patch.tags);
    if (patch.card_template  !== undefined) set('card_template', patch.card_template);
    if (patch.suspended      !== undefined) set('suspended', patch.suspended);
    if (patch.stability      !== undefined) set('stability', patch.stability);
    if (patch.difficulty     !== undefined) set('difficulty', patch.difficulty);
    if (patch.elapsed_days   !== undefined) set('elapsed_days', patch.elapsed_days);
    if (patch.scheduled_days !== undefined) set('scheduled_days', patch.scheduled_days);
    if (patch.reps           !== undefined) set('reps', patch.reps);
    if (patch.lapses         !== undefined) set('lapses', patch.lapses);
    if (patch.card_state     !== undefined) set('card_state', patch.card_state);
    if (patch.last_review_at !== undefined) set('last_review_at', patch.last_review_at);
    if (patch.next_review_at !== undefined) set('next_review_at', patch.next_review_at);

    vals.push(id);
    await execute(this.db, `UPDATE ar_learn_srs_card SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findCardById(id);
  }

  async deleteCard(card: SrsCard): Promise<void> {
    await execute(this.db, `DELETE FROM ar_learn_srs_review WHERE card_id = ?`, [card.id]);
    await execute(this.db, `DELETE FROM ar_learn_srs_card WHERE id = ?`, [card.id]);
    await execute(
      this.db,
      `UPDATE ar_learn_srs_deck SET card_count = MAX(0, card_count - 1) WHERE id = ?`,
      [card.deck_id],
    );
  }

  // ── Reviews ──────────────────────────────────────────────────────────────────

  async logReview(input: SrsReviewCreate): Promise<SrsReview> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_learn_srs_review
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
      `SELECT ${REVIEW_COLS} FROM ar_learn_srs_review WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  async stats(userRef: string): Promise<SrsStats> {
    const now = new Date().toISOString();
    const row = await queryOne<Record<string, number>>(
      this.db,
      `SELECT
         (SELECT COUNT(*) FROM ar_learn_srs_deck WHERE core_user_ref = ?) AS decks,
         COUNT(*) AS cards,
         SUM(CASE WHEN suspended = 0 AND next_review_at IS NOT NULL
                   AND next_review_at <= ? THEN 1 ELSE 0 END) AS due,
         SUM(CASE WHEN suspended = 0 AND card_state = 'new' THEN 1 ELSE 0 END) AS new,
         SUM(CASE WHEN suspended = 0
                   AND card_state IN ('learning', 'relearning') THEN 1 ELSE 0 END) AS learning,
         SUM(CASE WHEN suspended = 0 AND card_state = 'review' THEN 1 ELSE 0 END) AS review,
         SUM(CASE WHEN suspended = 1 THEN 1 ELSE 0 END) AS suspended
       FROM ar_learn_srs_card WHERE core_user_ref = ?`,
      [userRef, now, userRef],
    );
    return {
      decks:     Number(row?.['decks']     ?? 0),
      cards:     Number(row?.['cards']     ?? 0),
      due:       Number(row?.['due']       ?? 0),
      new:       Number(row?.['new']       ?? 0),
      learning:  Number(row?.['learning']  ?? 0),
      review:    Number(row?.['review']    ?? 0),
      suspended: Number(row?.['suspended'] ?? 0),
    };
  }
}
