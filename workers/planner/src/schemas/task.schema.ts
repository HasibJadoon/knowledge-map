// ─── Task schemas & types ──────────────────────────────────────────────────────

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

// Priority stored as integer (1=critical … 5=low) — matches DB column
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;               // PL:ULID
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
  assignee_ref: string | null;  // CORE:<user_id>
  step_no: number | null;
  sort_order: number;
  completed_at: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  plan_id: string;
  title: string;
  task_type?: TaskType;
  scope_id?: string | null;
  parent_task_id?: string | null;
  description_md?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  estimated_mins?: number | null;
  step_no?: number | null;
  sort_order?: number;
  assignee_ref?: string | null;
}

export interface TaskPatch {
  title?: string;
  task_type?: TaskType;
  scope_id?: string | null;
  parent_task_id?: string | null;
  description_md?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  estimated_mins?: number | null;
  actual_mins?: number | null;
  assignee_ref?: string | null;
  step_no?: number | null;
  sort_order?: number;
  completed_at?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const TASK_TYPES: TaskType[] = [
  'read', 'memorize', 'revise', 'review', 'exercise',
  'note', 'listen', 'watch', 'translate', 'submit', 'other',
];

const TASK_STATUSES: TaskStatus[] = [
  'pending', 'in_progress', 'done', 'skipped', 'blocked',
];

const TASK_PRIORITIES: TaskPriority[] = [1, 2, 3, 4, 5];

function isValidTaskType(v: unknown): v is TaskType {
  return typeof v === 'string' && (TASK_TYPES as string[]).includes(v);
}

function isValidTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (TASK_STATUSES as string[]).includes(v);
}

function isValidTaskPriority(v: unknown): v is TaskPriority {
  return typeof v === 'number' && Number.isInteger(v) && (TASK_PRIORITIES as number[]).includes(v);
}

function isNullablePositiveInt(v: unknown): boolean {
  return v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0);
}

export function validateTaskCreate(
  body: unknown,
): { data: TaskCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['plan_id'] !== 'string' || b['plan_id'].trim() === '')
    return { error: 'plan_id is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['task_type'] !== undefined && !isValidTaskType(b['task_type']))
    return { error: `task_type must be one of: ${TASK_TYPES.join(', ')}` };

  if (b['priority'] !== undefined && !isValidTaskPriority(b['priority']))
    return { error: 'priority must be an integer 1–5' };

  if (b['estimated_mins'] !== undefined && !isNullablePositiveInt(b['estimated_mins']))
    return { error: 'estimated_mins must be a non-negative integer or null' };

  if (b['step_no'] !== undefined && b['step_no'] !== null && !(typeof b['step_no'] === 'number' && Number.isInteger(b['step_no'])))
    return { error: 'step_no must be an integer or null' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: TaskCreate = {
    plan_id: (b['plan_id'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['task_type'] !== undefined) data.task_type = b['task_type'] as TaskType;
  if (b['scope_id'] !== undefined) data.scope_id = b['scope_id'] as string | null;
  if (b['parent_task_id'] !== undefined) data.parent_task_id = b['parent_task_id'] as string | null;
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['priority'] !== undefined) data.priority = b['priority'] as TaskPriority;
  if (b['due_date'] !== undefined) data.due_date = b['due_date'] as string | null;
  if (b['estimated_mins'] !== undefined) data.estimated_mins = b['estimated_mins'] as number | null;
  if (b['step_no'] !== undefined) data.step_no = b['step_no'] as number | null;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['assignee_ref'] !== undefined) data.assignee_ref = b['assignee_ref'] as string | null;

  return { data };
}

export function validateTaskPatch(
  body: unknown,
): { data: TaskPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['task_type'] !== undefined && !isValidTaskType(b['task_type']))
    return { error: `task_type must be one of: ${TASK_TYPES.join(', ')}` };

  if (b['status'] !== undefined && !isValidTaskStatus(b['status']))
    return { error: `status must be one of: ${TASK_STATUSES.join(', ')}` };

  if (b['priority'] !== undefined && !isValidTaskPriority(b['priority']))
    return { error: 'priority must be an integer 1–5' };

  if (b['estimated_mins'] !== undefined && !isNullablePositiveInt(b['estimated_mins']))
    return { error: 'estimated_mins must be a non-negative integer or null' };

  if (b['actual_mins'] !== undefined && !isNullablePositiveInt(b['actual_mins']))
    return { error: 'actual_mins must be a non-negative integer or null' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: TaskPatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['task_type'] !== undefined) data.task_type = b['task_type'] as TaskType;
  if (b['scope_id'] !== undefined) data.scope_id = b['scope_id'] as string | null;
  if (b['parent_task_id'] !== undefined) data.parent_task_id = b['parent_task_id'] as string | null;
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['status'] !== undefined) data.status = b['status'] as TaskStatus;
  if (b['priority'] !== undefined) data.priority = b['priority'] as TaskPriority;
  if (b['due_date'] !== undefined) data.due_date = b['due_date'] as string | null;
  if (b['estimated_mins'] !== undefined) data.estimated_mins = b['estimated_mins'] as number | null;
  if (b['actual_mins'] !== undefined) data.actual_mins = b['actual_mins'] as number | null;
  if (b['assignee_ref'] !== undefined) data.assignee_ref = b['assignee_ref'] as string | null;
  if (b['step_no'] !== undefined) data.step_no = b['step_no'] as number | null;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['completed_at'] !== undefined) data.completed_at = b['completed_at'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}
