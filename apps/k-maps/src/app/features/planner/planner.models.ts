// Data model for the rich km-planner-worker API (/pl/*).
// Mirrors workers/planner/src/schemas.

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
export type PlanPriority = 1 | 2 | 3 | 4 | 5;

export type TaskType =
  | 'read'
  | 'memorize'
  | 'revise'
  | 'review'
  | 'exercise'
  | 'note'
  | 'listen'
  | 'watch'
  | 'translate'
  | 'submit'
  | 'other';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped' | 'blocked';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type LaneType = 'pending' | 'in_progress' | 'done' | 'skipped' | 'blocked' | 'custom';

// Cross-cutting facet — every plan belongs to one K-MAPS domain.
export type PlannerDomain = 'quran' | 'arabic' | 'worldview' | 'content' | 'general';

export interface Plan {
  id: string;
  core_user_ref: string;
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

export interface PlanTask {
  id: string;
  plan_id: string;
  scope_id: string | null;
  parent_task_id: string | null;
  title: string;
  description_md: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  estimated_mins: number | null;
  actual_mins: number | null;
  assignee_ref: string | null;
  step_no: number | null;
  sort_order: number;
  completed_at: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lane {
  id: string;
  plan_id: string;
  title: string;
  lane_type: LaneType;
  sort_order: number;
  color: string | null;
  wip_limit: number | null;
  created_at: string;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
}

export interface PaginatedEnvelope<T> {
  ok: boolean;
  data: T[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface PlanMeta {
  domain?: PlannerDomain;
  [key: string]: unknown;
}

export interface PlanCreatePayload {
  title: string;
  plan_type?: PlanType;
  description_md?: string | null;
  status?: PlanStatus;
  priority?: PlanPriority;
  start_date?: string | null;
  target_end_date?: string | null;
  meta_json?: string | null;
}

export interface PlanPatchPayload {
  title?: string;
  plan_type?: PlanType;
  description_md?: string | null;
  status?: PlanStatus;
  priority?: PlanPriority;
  start_date?: string | null;
  target_end_date?: string | null;
  meta_json?: string | null;
}

export interface TaskCreatePayload {
  plan_id: string;
  title: string;
  task_type?: TaskType;
  description_md?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  estimated_mins?: number | null;
  sort_order?: number;
}

export interface TaskPatchPayload {
  title?: string;
  task_type?: TaskType;
  description_md?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  estimated_mins?: number | null;
  actual_mins?: number | null;
  sort_order?: number;
}

// ── Domain facet ──────────────────────────────────────────────────────────────

export interface DomainConfig {
  id: PlannerDomain;
  label: string;
  color: string;
}

export const PLANNER_DOMAINS: ReadonlyArray<DomainConfig> = [
  { id: 'quran', label: 'Quran', color: '#c9a84c' },
  { id: 'arabic', label: 'Arabic', color: '#4f96ff' },
  { id: 'worldview', label: 'Worldview', color: '#a78bfa' },
  { id: 'content', label: 'Content', color: '#34b996' },
  { id: 'general', label: 'General', color: '#94a3b8' },
];

const PLAN_TYPE_DOMAIN: Partial<Record<PlanType, PlannerDomain>> = {
  quran: 'quran',
  arabic: 'arabic',
  worldview_research: 'worldview',
};

export function parsePlanMeta(plan: Pick<Plan, 'meta_json'>): PlanMeta {
  if (!plan.meta_json) {
    return {};
  }
  try {
    const parsed = JSON.parse(plan.meta_json);
    return parsed && typeof parsed === 'object' ? (parsed as PlanMeta) : {};
  } catch {
    return {};
  }
}

export function planDomain(plan: Pick<Plan, 'meta_json' | 'plan_type'>): PlannerDomain {
  const metaDomain = parsePlanMeta(plan).domain;
  if (metaDomain && PLANNER_DOMAINS.some((entry) => entry.id === metaDomain)) {
    return metaDomain;
  }
  return PLAN_TYPE_DOMAIN[plan.plan_type] ?? 'general';
}

export function domainConfig(domain: PlannerDomain): DomainConfig {
  return PLANNER_DOMAINS.find((entry) => entry.id === domain) ?? PLANNER_DOMAINS[4];
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
  blocked: 'Blocked',
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

export const PLANNER_TASK_STATUSES: ReadonlyArray<TaskStatus> = [
  'pending',
  'in_progress',
  'done',
  'skipped',
  'blocked',
];

export const PLANNER_TASK_TYPES: ReadonlyArray<TaskType> = [
  'read', 'memorize', 'revise', 'review', 'exercise',
  'note', 'listen', 'watch', 'translate', 'submit', 'other',
];

export function priorityLabel(priority: PlanPriority | TaskPriority): string {
  return ['', 'Critical', 'High', 'Medium', 'Low', 'Lowest'][priority] ?? 'Medium';
}
