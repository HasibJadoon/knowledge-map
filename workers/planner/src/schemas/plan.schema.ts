// ─── Plan schemas & types ──────────────────────────────────────────────────────

export type PlanType =
  | 'reading'
  | 'quran'
  | 'arabic'
  | 'worldview_research'
  | 'revision'
  | 'curriculum'
  | 'class'
  | 'sprint'
  | 'personal'
  | 'team'
  | 'other';

export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// Priority stored as integer (1=critical … 5=low) — matches DB column
export type PlanPriority = 1 | 2 | 3 | 4 | 5;

export interface Plan {
  id: string;              // PL:ULID
  core_user_ref: string;   // CORE:<user_id>
  core_ws_ref: string | null;
  title: string;
  slug: string | null;
  plan_type: PlanType;
  description_md: string | null;
  goals_md: string | null;
  status: PlanStatus;
  priority: PlanPriority;
  start_date: string | null;
  target_end_date: string | null;
  completed_at: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanCreate {
  title: string;
  core_user_ref: string;
  plan_type?: PlanType;
  core_ws_ref?: string | null;
  slug?: string | null;
  description_md?: string | null;
  goals_md?: string | null;
  status?: PlanStatus;
  priority?: PlanPriority;
  start_date?: string | null;
  target_end_date?: string | null;
  meta_json?: string | null;
}

export interface PlanPatch {
  title?: string;
  plan_type?: PlanType;
  core_user_ref?: string;
  core_ws_ref?: string | null;
  slug?: string | null;
  description_md?: string | null;
  goals_md?: string | null;
  status?: PlanStatus;
  priority?: PlanPriority;
  start_date?: string | null;
  target_end_date?: string | null;
  completed_at?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const PLAN_TYPES: PlanType[] = [
  'reading', 'quran', 'arabic', 'worldview_research', 'revision',
  'curriculum', 'class', 'sprint', 'personal', 'team', 'other',
];

const PLAN_STATUSES: PlanStatus[] = [
  'draft', 'active', 'paused', 'completed', 'archived',
];

const PLAN_PRIORITIES: PlanPriority[] = [1, 2, 3, 4, 5];

function isValidPlanType(v: unknown): v is PlanType {
  return typeof v === 'string' && (PLAN_TYPES as string[]).includes(v);
}

function isValidPlanStatus(v: unknown): v is PlanStatus {
  return typeof v === 'string' && (PLAN_STATUSES as string[]).includes(v);
}

function isValidPriority(v: unknown): v is PlanPriority {
  return typeof v === 'number' && (PLAN_PRIORITIES as number[]).includes(v);
}

export function validatePlanCreate(
  body: unknown,
): { data: PlanCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '')
    return { error: 'core_user_ref is required and must be a non-empty string' };

  if (b['plan_type'] !== undefined && !isValidPlanType(b['plan_type']))
    return { error: `plan_type must be one of: ${PLAN_TYPES.join(', ')}` };

  if (b['status'] !== undefined && !isValidPlanStatus(b['status']))
    return { error: `status must be one of: ${PLAN_STATUSES.join(', ')}` };

  if (b['priority'] !== undefined && !isValidPriority(b['priority']))
    return { error: 'priority must be an integer 1–5' };

  if (b['core_ws_ref'] !== undefined && b['core_ws_ref'] !== null && typeof b['core_ws_ref'] !== 'string')
    return { error: 'core_ws_ref must be a string or null' };

  if (b['slug'] !== undefined && b['slug'] !== null && typeof b['slug'] !== 'string')
    return { error: 'slug must be a string or null' };

  const data: PlanCreate = {
    title: (b['title'] as string).trim(),
    core_user_ref: (b['core_user_ref'] as string).trim(),
  };

  if (b['plan_type'] !== undefined) data.plan_type = b['plan_type'] as PlanType;
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = (b['core_ws_ref'] as string | null);
  if (b['slug'] !== undefined) data.slug = (b['slug'] as string | null);
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['goals_md'] !== undefined) data.goals_md = b['goals_md'] as string | null;
  if (b['status'] !== undefined) data.status = b['status'] as PlanStatus;
  if (b['priority'] !== undefined) data.priority = b['priority'] as PlanPriority;
  if (b['start_date'] !== undefined) data.start_date = b['start_date'] as string | null;
  if (b['target_end_date'] !== undefined) data.target_end_date = b['target_end_date'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validatePlanPatch(
  body: unknown,
): { data: PlanPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['plan_type'] !== undefined && !isValidPlanType(b['plan_type']))
    return { error: `plan_type must be one of: ${PLAN_TYPES.join(', ')}` };

  if (b['status'] !== undefined && !isValidPlanStatus(b['status']))
    return { error: `status must be one of: ${PLAN_STATUSES.join(', ')}` };

  if (b['priority'] !== undefined && !isValidPriority(b['priority']))
    return { error: 'priority must be an integer 1–5' };

  if (b['core_user_ref'] !== undefined && (typeof b['core_user_ref'] !== 'string' || (b['core_user_ref'] as string).trim() === ''))
    return { error: 'core_user_ref must be a non-empty string' };

  const data: PlanPatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['plan_type'] !== undefined) data.plan_type = b['plan_type'] as PlanType;
  if (b['core_user_ref'] !== undefined) data.core_user_ref = (b['core_user_ref'] as string).trim();
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = b['core_ws_ref'] as string | null;
  if (b['slug'] !== undefined) data.slug = b['slug'] as string | null;
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['goals_md'] !== undefined) data.goals_md = b['goals_md'] as string | null;
  if (b['status'] !== undefined) data.status = b['status'] as PlanStatus;
  if (b['priority'] !== undefined) data.priority = b['priority'] as PlanPriority;
  if (b['start_date'] !== undefined) data.start_date = b['start_date'] as string | null;
  if (b['target_end_date'] !== undefined) data.target_end_date = b['target_end_date'] as string | null;
  if (b['completed_at'] !== undefined) data.completed_at = b['completed_at'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface TaskSummary {
  id: string;
  plan_id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  resource_ref: string | null;
}
