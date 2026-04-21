// ─── Task extras schemas & types ───────────────────────────────────────────────
// Covers: pl_task_resources, pl_task_assignees, pl_task_dependencies

// ─── Task Resource ─────────────────────────────────────────────────────────────

export type TaskResourceType =
  | 'cm_doc'
  | 'ar_class'
  | 'ar_unit'
  | 'qr_passage'
  | 'wv_node'
  | 'wv_source'
  | 'al_concept'
  | 'cm_media'
  | 'other';

export type TaskResourceRole = 'primary' | 'reference' | 'exercise' | 'supplementary';

export interface TaskResource {
  id: string;               // PL:ULID
  task_id: string;
  resource_ref: string;     // typed cross-module ref (e.g. 'CM:<id>', 'QR:2:1-10')
  resource_type: TaskResourceType;
  resource_label: string | null;
  role: TaskResourceRole;
  sort_order: number;
  created_at: string;
}

export interface TaskResourceAdd {
  resource_ref: string;
  resource_type: TaskResourceType;
  resource_label?: string | null;
  role?: TaskResourceRole;
  sort_order?: number;
}

// ─── Task Assignee ─────────────────────────────────────────────────────────────

export type TaskAssigneeRole = 'owner' | 'assignee' | 'reviewer' | 'observer';

export interface TaskAssignee {
  id: string;             // PL:ULID
  task_id: string;
  user_ref: string;       // CORE:<user_id>
  role: TaskAssigneeRole;
  assigned_at: string;
}

export interface TaskAssigneeAdd {
  user_ref: string;
  role?: TaskAssigneeRole;
}

// ─── Task Dependency ───────────────────────────────────────────────────────────

export type TaskDepType = 'blocks' | 'related' | 'sequence';

export interface TaskDependency {
  id: string;
  from_task_id: string;
  to_task_id: string;
  dep_type: TaskDepType;
  created_at: string;
}

export interface TaskDependencyAdd {
  from_task_id: string;
  to_task_id: string;
  dep_type?: TaskDepType;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const TASK_RESOURCE_TYPES: TaskResourceType[] = [
  'cm_doc', 'ar_class', 'ar_unit', 'qr_passage',
  'wv_node', 'wv_source', 'al_concept', 'cm_media', 'other',
];

const TASK_RESOURCE_ROLES: TaskResourceRole[] = [
  'primary', 'reference', 'exercise', 'supplementary',
];

const TASK_ASSIGNEE_ROLES: TaskAssigneeRole[] = [
  'owner', 'assignee', 'reviewer', 'observer',
];

const TASK_DEP_TYPES: TaskDepType[] = ['blocks', 'related', 'sequence'];

function isValidResourceType(v: unknown): v is TaskResourceType {
  return typeof v === 'string' && (TASK_RESOURCE_TYPES as string[]).includes(v);
}

function isValidResourceRole(v: unknown): v is TaskResourceRole {
  return typeof v === 'string' && (TASK_RESOURCE_ROLES as string[]).includes(v);
}

function isValidAssigneeRole(v: unknown): v is TaskAssigneeRole {
  return typeof v === 'string' && (TASK_ASSIGNEE_ROLES as string[]).includes(v);
}

function isValidDepType(v: unknown): v is TaskDepType {
  return typeof v === 'string' && (TASK_DEP_TYPES as string[]).includes(v);
}

export function validateTaskResourceAdd(
  body: unknown,
): { data: TaskResourceAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['resource_ref'] !== 'string' || b['resource_ref'].trim() === '')
    return { error: 'resource_ref is required and must be a non-empty string' };

  if (!isValidResourceType(b['resource_type']))
    return { error: `resource_type is required and must be one of: ${TASK_RESOURCE_TYPES.join(', ')}` };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (b['role'] !== undefined && !isValidResourceRole(b['role']))
    return { error: `role must be one of: ${TASK_RESOURCE_ROLES.join(', ')}` };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: TaskResourceAdd = {
    resource_ref: (b['resource_ref'] as string).trim(),
    resource_type: b['resource_type'] as TaskResourceType,
  };

  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['role'] !== undefined) data.role = b['role'] as TaskResourceRole;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;

  return { data };
}

export function validateTaskAssigneeAdd(
  body: unknown,
): { data: TaskAssigneeAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['user_ref'] !== 'string' || b['user_ref'].trim() === '')
    return { error: 'user_ref is required and must be a non-empty string' };

  if (b['role'] !== undefined && !isValidAssigneeRole(b['role']))
    return { error: `role must be one of: ${TASK_ASSIGNEE_ROLES.join(', ')}` };

  const data: TaskAssigneeAdd = {
    user_ref: (b['user_ref'] as string).trim(),
  };

  if (b['role'] !== undefined) data.role = b['role'] as TaskAssigneeRole;

  return { data };
}

export function validateTaskDependencyAdd(
  body: unknown,
): { data: TaskDependencyAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['from_task_id'] !== 'string' || b['from_task_id'].trim() === '')
    return { error: 'from_task_id is required and must be a non-empty string' };

  if (typeof b['to_task_id'] !== 'string' || b['to_task_id'].trim() === '')
    return { error: 'to_task_id is required and must be a non-empty string' };

  if (b['dep_type'] !== undefined && !isValidDepType(b['dep_type']))
    return { error: `dep_type must be one of: ${TASK_DEP_TYPES.join(', ')}` };

  const fromId = (b['from_task_id'] as string).trim();
  const toId = (b['to_task_id'] as string).trim();

  if (fromId === toId)
    return { error: 'from_task_id and to_task_id must be different tasks' };

  const data: TaskDependencyAdd = {
    from_task_id: fromId,
    to_task_id: toId,
  };

  if (b['dep_type'] !== undefined) data.dep_type = b['dep_type'] as TaskDepType;

  return { data };
}
