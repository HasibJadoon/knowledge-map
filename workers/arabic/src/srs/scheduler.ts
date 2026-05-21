// ─── SRS scheduler ────────────────────────────────────────────────────────────
// Pure scheduling math. Given a card's current state and a 1-4 rating, returns
// the next state. No DB access — the route layer persists the result.
//
// Classic SM-2, mapped onto the FSRS-shaped columns so the storage layer is
// ready for an FSRS upgrade later without a schema change:
//   difficulty     → SM-2 ease factor (1.3 .. 3.0), higher = easier
//   scheduled_days → current interval in days
//   stability      → kept equal to the interval (FSRS-forward compatible)
//   card_state     → new | review | relearning
//   reps           → successful repetitions in a row (0 after a lapse)
//   lapses         → total times the card was rated "Again" from review

export type Rating = 1 | 2 | 3 | 4;          // Again · Hard · Good · Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface ScheduleInput {
  card_state: string;
  difficulty: number;       // ease factor
  scheduled_days: number;   // last interval in days
  reps: number;
  lapses: number;
  last_review_at: string | null;
}

export interface ScheduleResult {
  card_state: CardState;
  difficulty: number;
  stability: number;
  scheduled_days: number;
  elapsed_days: number;
  reps: number;
  lapses: number;
  next_review_at: string;   // ISO 8601
}

const MIN_EF = 1.3;
const MAX_EF = 3.0;
const DEFAULT_EF = 2.5;
const FIRST_INTERVAL = 1;          // days — first successful review
const FIRST_EASY_INTERVAL = 4;     // days — first review rated Easy
const SECOND_INTERVAL = 6;         // days — second successful review
const HARD_FACTOR = 0.6;           // Hard shortens the computed interval
const EASY_BONUS = 1.3;            // Easy lengthens it
const LAPSE_INTERVAL = 1;          // days — interval after a lapse
const MAX_INTERVAL = 365 * 5;      // days — sanity cap

const DAY_MS = 86_400_000;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

export function isRating(v: unknown): v is Rating {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

function clampEf(ef: number): number {
  if (!Number.isFinite(ef) || ef <= 0) return DEFAULT_EF;
  return Math.min(MAX_EF, Math.max(MIN_EF, ef));
}

function isoAfterDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/**
 * Compute the next schedule for a card given the learner's rating.
 *
 * @param input  current persisted card state
 * @param rating 1 Again · 2 Hard · 3 Good · 4 Easy
 * @param now    review timestamp (injected for testability)
 */
export function schedule(input: ScheduleInput, rating: Rating, now: Date = new Date()): ScheduleResult {
  let ef = clampEf(input.difficulty || DEFAULT_EF);
  let reps = Math.max(0, Math.trunc(input.reps) || 0);
  let lapses = Math.max(0, Math.trunc(input.lapses) || 0);
  const prevInterval = Math.max(1, Math.trunc(input.scheduled_days) || 1);

  const elapsedDays = input.last_review_at
    ? Math.max(0, Math.round((now.getTime() - new Date(input.last_review_at).getTime()) / DAY_MS))
    : 0;

  // ── Again — the card lapsed ────────────────────────────────────────────────
  if (rating === 1) {
    ef = clampEf(ef - 0.2);
    return {
      card_state: 'relearning',
      difficulty: ef,
      stability: LAPSE_INTERVAL,
      scheduled_days: LAPSE_INTERVAL,
      elapsed_days: elapsedDays,
      reps: 0,
      lapses: lapses + 1,
      next_review_at: isoAfterDays(now, LAPSE_INTERVAL),
    };
  }

  // ── Hard / Good / Easy — a successful review ───────────────────────────────
  let interval: number;
  if (reps <= 0) {
    interval = rating === 4 ? FIRST_EASY_INTERVAL : FIRST_INTERVAL;
  } else if (reps === 1) {
    interval = SECOND_INTERVAL;
  } else {
    interval = prevInterval * ef;
  }

  if (rating === 2) interval *= HARD_FACTOR;
  if (rating === 4) interval *= EASY_BONUS;

  // SM-2 ease-factor update — quality maps Again·Hard·Good·Easy → 2·3·4·5.
  const quality = rating + 1;
  ef = clampEf(ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  interval = Math.min(MAX_INTERVAL, Math.max(1, Math.round(interval)));

  return {
    card_state: 'review',
    difficulty: ef,
    stability: interval,
    scheduled_days: interval,
    elapsed_days: elapsedDays,
    reps: reps + 1,
    lapses,
    next_review_at: isoAfterDays(now, interval),
  };
}

/** The interval (in days) each rating would produce — for review-button hints. */
export function previewIntervals(input: ScheduleInput, now: Date = new Date()): Record<Rating, number> {
  return {
    1: schedule(input, 1, now).scheduled_days,
    2: schedule(input, 2, now).scheduled_days,
    3: schedule(input, 3, now).scheduled_days,
    4: schedule(input, 4, now).scheduled_days,
  };
}
