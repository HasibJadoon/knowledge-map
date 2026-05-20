// Phase-2 planner entities: goals, calendar entries and review cycles.
// Mirrors workers/planner/src/schemas (goal / calendar / review-cycle).

// ── Goals ─────────────────────────────────────────────────────────────────────

export type GoalType = 'habit' | 'milestone' | 'quota' | 'completion' | 'other';
export type GoalMetric = 'sessions' | 'minutes' | 'pages' | 'ayahs' | 'tasks' | 'other';
export type GoalCadence = 'daily' | 'weekly' | 'monthly' | 'total';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  plan_id: string | null;
  title: string;
  goal_type: GoalType;
  metric: GoalMetric;
  target_value: number;
  current_value: number;
  cadence: GoalCadence;
  period_start: string | null;
  period_end: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface GoalCreatePayload {
  title: string;
  goal_type?: GoalType;
  metric?: GoalMetric;
  target_value?: number;
  cadence?: GoalCadence;
  plan_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface GoalPatchPayload {
  title?: string;
  goal_type?: GoalType;
  metric?: GoalMetric;
  target_value?: number;
  status?: GoalStatus;
  cadence?: GoalCadence;
}

export const GOAL_TYPES: ReadonlyArray<GoalType> = ['habit', 'milestone', 'quota', 'completion', 'other'];
export const GOAL_METRICS: ReadonlyArray<GoalMetric> = ['sessions', 'minutes', 'pages', 'ayahs', 'tasks', 'other'];
export const GOAL_CADENCES: ReadonlyArray<GoalCadence> = ['daily', 'weekly', 'monthly', 'total'];

export function goalProgress(goal: Goal): number {
  if (!goal.target_value || goal.target_value <= 0) {
    return goal.status === 'completed' ? 1 : 0;
  }
  return Math.min(1, goal.current_value / goal.target_value);
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export type CalendarEntryType =
  | 'scheduled_session'
  | 'deadline'
  | 'milestone'
  | 'review'
  | 'event'
  | 'other';

export interface CalendarEntry {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  plan_id: string | null;
  task_id: string | null;
  session_id: string | null;
  title: string;
  entry_type: CalendarEntryType;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  recurrence_json: string | null;
  is_completed: boolean;
  meta_json: string | null;
  created_at: string;
}

export interface CalendarEntryCreatePayload {
  title: string;
  start_datetime: string;
  entry_type?: CalendarEntryType;
  end_datetime?: string | null;
  all_day?: boolean;
  plan_id?: string | null;
  task_id?: string | null;
}

export const CALENDAR_ENTRY_TYPES: ReadonlyArray<CalendarEntryType> = [
  'scheduled_session', 'deadline', 'milestone', 'review', 'event', 'other',
];

export const CALENDAR_ENTRY_LABELS: Record<CalendarEntryType, string> = {
  scheduled_session: 'Session',
  deadline: 'Deadline',
  milestone: 'Milestone',
  review: 'Review',
  event: 'Event',
  other: 'Other',
};

// ── Review cycles ─────────────────────────────────────────────────────────────

export type ReviewCycleType =
  | 'periodic'
  | 'milestone'
  | 'submission'
  | 'class_round'
  | 'sprint_retro'
  | 'other';

export type ReviewCycleStatus = 'pending' | 'active' | 'complete' | 'cancelled';
export type ReviewCycleCadence = 'daily' | 'weekly' | 'monthly' | 'custom';

// ── Capture notes ─────────────────────────────────────────────────────────────
// Quick captures stored as TipTap (ProseMirror) documents. Mirrors
// workers/planner/src/routes/captures.ts.

export type CaptureNoteStatus = 'draft' | 'plan' | 'review' | 'done';

export const CAPTURE_NOTE_STATUSES: ReadonlyArray<CaptureNoteStatus> =
  ['draft', 'plan', 'review', 'done'];

export const CAPTURE_NOTE_STATUS_LABELS: Readonly<Record<CaptureNoteStatus, string>> = {
  draft:  'Draft',
  plan:   'Plan',
  review: 'Review',
  done:   'Done',
};

/** A TipTap / ProseMirror document node. */
export interface TiptapJson {
  type: string;
  content?: TiptapJson[];
  [key: string]: unknown;
}

export interface CaptureNote {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  status: CaptureNoteStatus;
  title: string | null;
  text: string;
  doc: TiptapJson;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CaptureNoteCreatePayload {
  doc: TiptapJson;
  text: string;
  title?: string | null;
  status?: CaptureNoteStatus;
  meta?: Record<string, unknown> | null;
}

export interface CaptureNotePatchPayload {
  doc?: TiptapJson;
  text?: string;
  title?: string | null;
  status?: CaptureNoteStatus;
  meta?: Record<string, unknown> | null;
}

export interface ReviewCycle {
  id: string;
  plan_id: string;
  packet_id: string | null;
  title: string;
  cycle_type: ReviewCycleType;
  cadence: ReviewCycleCadence | null;
  cadence_days: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: ReviewCycleStatus;
  meta_json: string | null;
  created_at: string;
}
