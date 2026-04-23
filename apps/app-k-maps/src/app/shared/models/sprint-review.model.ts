/**
 * CANONICAL SPRINT REVIEW
 * Purpose:
 * - Periodic (weekly / monthly) reflective review
 * - Captures learning progress, outputs, blockers, insights
 * - `review_json` holds the full structured reflection payload
 */

export interface SprintReview {
  entity_type: 'sprint_review';
  id: number;

  user_id: number | null;

  period_start: string;
  period_end: string;

  status: SprintReviewStatus;

  review: SprintReviewPayload;

  created_at: string;
  updated_at: string | null;
}

export type SprintReviewStatus = 'draft' | 'finalized';

export interface SprintReviewPayload {
  summary: string | null;
  goals: SprintGoalReview[];
  achievements: SprintAchievement[];
  blockers: SprintBlocker[];
  metrics: SprintMetrics | null;
  lessons_learned: string[];
  next_actions: string[];
  reflections: SprintReflection[];
}

export interface SprintGoalReview {
  goal_id: string | null;
  description: string;
  status: 'completed' | 'partial' | 'missed';
  note: string | null;
}

export interface SprintAchievement {
  description: string;
  related_type: SprintRelatedType | null;
  related_id: string | null;
  note: string | null;
}

export interface SprintBlocker {
  description: string;
  resolved: boolean;
  note: string | null;
}

export interface SprintMetrics {
  lessons_completed?: number;
  claims_created?: number;
  lexicon_entries_added?: number;
  content_published?: number;
  hours_spent?: number;
  custom?: Record<string, number>;
}

export interface SprintReflection {
  prompt: string;
  response: string;
}

export type SprintRelatedType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'content_item'
  | 'lexicon_entry'
  | 'library_entry'
  | 'concept';

export class SprintReviewModel {
  constructor(public data: SprintReview) {}
}
