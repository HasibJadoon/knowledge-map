// ─── Goal, GoalSnapshot & Streak schemas & types ─────────────────────────────

export type GoalType =
  | 'habit'
  | 'milestone'
  | 'quota'
  | 'completion'
  | 'other';

export type GoalMetric =
  | 'sessions'
  | 'minutes'
  | 'pages'
  | 'ayahs'
  | 'tasks'
  | 'other';

export type GoalCadence = 'daily' | 'weekly' | 'monthly' | 'total';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface PlGoal {
  id: string;               // PL:ULID
  core_user_ref: string;    // CORE:<user_id>
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

export interface GoalSnapshot {
  id: string;              // PL:ULID
  goal_id: string;
  snapshot_date: string;   // YYYY-MM-DD
  value: number;
  note: string | null;
  created_at: string;
}

export type StreakType = 'daily_session' | 'weekly_goal' | 'task_chain' | 'other';

export interface PlStreak {
  id: string;              // PL:ULID
  core_user_ref: string;   // CORE:<user_id>
  plan_id: string | null;
  streak_type: StreakType;
  current_count: number;
  longest_count: number;
  last_active_date: string | null;
  started_date: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  core_user_ref: string;
  title: string;
  goal_type?: GoalType;
  metric?: GoalMetric;
  target_value?: number;
  cadence?: GoalCadence;
  period_start?: string | null;
  period_end?: string | null;
  plan_id?: string | null;
  core_ws_ref?: string | null;
  meta_json?: string | null;
}

export interface GoalPatch {
  title?: string;
  goal_type?: GoalType;
  metric?: GoalMetric;
  target_value?: number;
  status?: GoalStatus;
  cadence?: GoalCadence;
  period_start?: string | null;
  period_end?: string | null;
  core_ws_ref?: string | null;
}

export interface GoalSnapshotAdd {
  snapshot_date: string;
  value: number;
  note?: string | null;
}

export interface StreakUpsert {
  core_user_ref: string;
  streak_type: StreakType;
  plan_id?: string | null;
  current_count?: number;
  last_active_date?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const GOAL_TYPES: GoalType[] = ['habit', 'milestone', 'quota', 'completion', 'other'];
const GOAL_METRICS: GoalMetric[] = ['sessions', 'minutes', 'pages', 'ayahs', 'tasks', 'other'];
const GOAL_CADENCES: GoalCadence[] = ['daily', 'weekly', 'monthly', 'total'];
const GOAL_STATUSES: GoalStatus[] = ['active', 'completed', 'paused', 'archived'];
const STREAK_TYPES: StreakType[] = ['daily_session', 'weekly_goal', 'task_chain', 'other'];

function isValidGoalType(v: unknown): v is GoalType {
  return typeof v === 'string' && (GOAL_TYPES as string[]).includes(v);
}

function isValidGoalMetric(v: unknown): v is GoalMetric {
  return typeof v === 'string' && (GOAL_METRICS as string[]).includes(v);
}

function isValidGoalCadence(v: unknown): v is GoalCadence {
  return typeof v === 'string' && (GOAL_CADENCES as string[]).includes(v);
}

function isValidGoalStatus(v: unknown): v is GoalStatus {
  return typeof v === 'string' && (GOAL_STATUSES as string[]).includes(v);
}

function isValidStreakType(v: unknown): v is StreakType {
  return typeof v === 'string' && (STREAK_TYPES as string[]).includes(v);
}

export function validateGoalCreate(
  body: unknown,
): { data: GoalCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '')
    return { error: 'core_user_ref is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['goal_type'] !== undefined && !isValidGoalType(b['goal_type']))
    return { error: `goal_type must be one of: ${GOAL_TYPES.join(', ')}` };

  if (b['metric'] !== undefined && !isValidGoalMetric(b['metric']))
    return { error: `metric must be one of: ${GOAL_METRICS.join(', ')}` };

  if (b['target_value'] !== undefined && typeof b['target_value'] !== 'number')
    return { error: 'target_value must be a number' };

  if (b['cadence'] !== undefined && !isValidGoalCadence(b['cadence']))
    return { error: `cadence must be one of: ${GOAL_CADENCES.join(', ')}` };

  if (b['period_start'] !== undefined && b['period_start'] !== null && typeof b['period_start'] !== 'string')
    return { error: 'period_start must be a string or null' };

  if (b['period_end'] !== undefined && b['period_end'] !== null && typeof b['period_end'] !== 'string')
    return { error: 'period_end must be a string or null' };

  if (b['plan_id'] !== undefined && b['plan_id'] !== null && typeof b['plan_id'] !== 'string')
    return { error: 'plan_id must be a string or null' };

  if (b['core_ws_ref'] !== undefined && b['core_ws_ref'] !== null && typeof b['core_ws_ref'] !== 'string')
    return { error: 'core_ws_ref must be a string or null' };

  const data: GoalCreate = {
    core_user_ref: (b['core_user_ref'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['goal_type'] !== undefined) data.goal_type = b['goal_type'] as GoalType;
  if (b['metric'] !== undefined) data.metric = b['metric'] as GoalMetric;
  if (b['target_value'] !== undefined) data.target_value = b['target_value'] as number;
  if (b['cadence'] !== undefined) data.cadence = b['cadence'] as GoalCadence;
  if (b['period_start'] !== undefined) data.period_start = b['period_start'] as string | null;
  if (b['period_end'] !== undefined) data.period_end = b['period_end'] as string | null;
  if (b['plan_id'] !== undefined) data.plan_id = b['plan_id'] as string | null;
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = b['core_ws_ref'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validateGoalPatch(
  body: unknown,
): { data: GoalPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['goal_type'] !== undefined && !isValidGoalType(b['goal_type']))
    return { error: `goal_type must be one of: ${GOAL_TYPES.join(', ')}` };

  if (b['metric'] !== undefined && !isValidGoalMetric(b['metric']))
    return { error: `metric must be one of: ${GOAL_METRICS.join(', ')}` };

  if (b['target_value'] !== undefined && typeof b['target_value'] !== 'number')
    return { error: 'target_value must be a number' };

  if (b['status'] !== undefined && !isValidGoalStatus(b['status']))
    return { error: `status must be one of: ${GOAL_STATUSES.join(', ')}` };

  if (b['cadence'] !== undefined && !isValidGoalCadence(b['cadence']))
    return { error: `cadence must be one of: ${GOAL_CADENCES.join(', ')}` };

  if (b['period_start'] !== undefined && b['period_start'] !== null && typeof b['period_start'] !== 'string')
    return { error: 'period_start must be a string or null' };

  if (b['period_end'] !== undefined && b['period_end'] !== null && typeof b['period_end'] !== 'string')
    return { error: 'period_end must be a string or null' };

  if (b['core_ws_ref'] !== undefined && b['core_ws_ref'] !== null && typeof b['core_ws_ref'] !== 'string')
    return { error: 'core_ws_ref must be a string or null' };

  const data: GoalPatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['goal_type'] !== undefined) data.goal_type = b['goal_type'] as GoalType;
  if (b['metric'] !== undefined) data.metric = b['metric'] as GoalMetric;
  if (b['target_value'] !== undefined) data.target_value = b['target_value'] as number;
  if (b['status'] !== undefined) data.status = b['status'] as GoalStatus;
  if (b['cadence'] !== undefined) data.cadence = b['cadence'] as GoalCadence;
  if (b['period_start'] !== undefined) data.period_start = b['period_start'] as string | null;
  if (b['period_end'] !== undefined) data.period_end = b['period_end'] as string | null;
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = b['core_ws_ref'] as string | null;

  return { data };
}

export function validateGoalSnapshotAdd(
  body: unknown,
): { data: GoalSnapshotAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['snapshot_date'] !== 'string' || b['snapshot_date'].trim() === '')
    return { error: 'snapshot_date is required and must be a non-empty string (YYYY-MM-DD)' };

  if (typeof b['value'] !== 'number')
    return { error: 'value is required and must be a number' };

  if (b['note'] !== undefined && b['note'] !== null && typeof b['note'] !== 'string')
    return { error: 'note must be a string or null' };

  const data: GoalSnapshotAdd = {
    snapshot_date: (b['snapshot_date'] as string).trim(),
    value: b['value'] as number,
  };

  if (b['note'] !== undefined) data.note = b['note'] as string | null;

  return { data };
}

export function validateStreakUpsert(
  body: unknown,
): { data: StreakUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '')
    return { error: 'core_user_ref is required and must be a non-empty string' };

  if (!isValidStreakType(b['streak_type']))
    return { error: `streak_type is required and must be one of: ${STREAK_TYPES.join(', ')}` };

  if (b['plan_id'] !== undefined && b['plan_id'] !== null && typeof b['plan_id'] !== 'string')
    return { error: 'plan_id must be a string or null' };

  if (
    b['current_count'] !== undefined &&
    !(typeof b['current_count'] === 'number' && Number.isInteger(b['current_count']) && (b['current_count'] as number) >= 0)
  ) {
    return { error: 'current_count must be a non-negative integer' };
  }

  if (b['last_active_date'] !== undefined && b['last_active_date'] !== null && typeof b['last_active_date'] !== 'string')
    return { error: 'last_active_date must be a string or null' };

  if (b['meta_json'] !== undefined && b['meta_json'] !== null && typeof b['meta_json'] !== 'string')
    return { error: 'meta_json must be a string or null' };

  const data: StreakUpsert = {
    core_user_ref: (b['core_user_ref'] as string).trim(),
    streak_type: b['streak_type'] as StreakType,
  };

  if (b['plan_id'] !== undefined) data.plan_id = b['plan_id'] as string | null;
  if (b['current_count'] !== undefined) data.current_count = b['current_count'] as number;
  if (b['last_active_date'] !== undefined) data.last_active_date = b['last_active_date'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}
