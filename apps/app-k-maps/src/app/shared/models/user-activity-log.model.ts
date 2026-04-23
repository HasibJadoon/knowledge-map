/**
 * CANONICAL USER ACTIVITY LOG
 * Matches `user_activity_logs` table.
 * - event_type is flexible (string) but can be union-typed later
 * - target is polymorphic + stored as TEXT id
 * - event payload is structured wrapper for forward compatibility
 */

export interface UserActivityLog {
  entity_type: 'user_activity_log';
  id: number;

  user_id: number;

  event_type: string;

  target_type: ActivityTargetType | null;
  target_id: string | null;

  ref: string | null;
  note: string | null;

  event: ActivityEventPayload | null;

  created_at: string;
}

export type ActivityTargetType =
  | 'ar_lesson'
  | 'lexicon_entry'
  | 'root'
  | 'worldview_claim'
  | 'brainstorm_session'
  | 'content_item'
  | 'concept'
  | 'library_entry'
  | 'cross_reference'
  | 'discourse_edge'
  | 'grammatical_concept'
  | 'review'
  | 'sprint_review'
  | 'other';

export interface ActivityEventPayload {
  kind: string;
  data: Record<string, unknown>;
}

export class UserActivityLogModel {
  constructor(public data: UserActivityLog) {}
}
