// ─── Packet & PacketItem schemas & types ──────────────────────────────────────

export type PacketType =
  | 'assignment'
  | 'sprint'
  | 'review_bundle'
  | 'class_session'
  | 'study_packet'
  | 'other';

export type PacketStatus =
  | 'open'
  | 'in_progress'
  | 'submitted'
  | 'reviewed'
  | 'closed';

export interface Packet {
  id: string;               // PL:ULID
  plan_id: string;
  title: string;
  packet_type: PacketType;
  assignee_refs: string | null;   // JSON string: ['CORE:<user_id>', ...]
  resource_refs: string | null;   // JSON string: [{ref, type, label}, ...]
  due_date: string | null;
  status: PacketStatus;
  instructions_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PacketItem {
  id: string;              // PL:ULID
  packet_id: string;
  task_id: string | null;
  resource_ref: string | null;
  resource_type: string | null;
  resource_label: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface PacketCreate {
  plan_id: string;
  title: string;
  packet_type?: PacketType;
  instructions_md?: string | null;
  due_date?: string | null;
  assignee_refs?: string | null;
  resource_refs?: string | null;
  meta_json?: string | null;
}

export interface PacketPatch {
  title?: string;
  packet_type?: PacketType;
  instructions_md?: string | null;
  due_date?: string | null;
  status?: PacketStatus;
  assignee_refs?: string | null;
  resource_refs?: string | null;
  meta_json?: string | null;
}

export interface PacketItemAdd {
  task_id?: string | null;
  resource_ref?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  sort_order?: number;
  is_required?: boolean;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const PACKET_TYPES: PacketType[] = [
  'assignment', 'sprint', 'review_bundle', 'class_session', 'study_packet', 'other',
];

const PACKET_STATUSES: PacketStatus[] = [
  'open', 'in_progress', 'submitted', 'reviewed', 'closed',
];

function isValidPacketType(v: unknown): v is PacketType {
  return typeof v === 'string' && (PACKET_TYPES as string[]).includes(v);
}

function isValidPacketStatus(v: unknown): v is PacketStatus {
  return typeof v === 'string' && (PACKET_STATUSES as string[]).includes(v);
}

export function validatePacketCreate(
  body: unknown,
): { data: PacketCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['plan_id'] !== 'string' || b['plan_id'].trim() === '')
    return { error: 'plan_id is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['packet_type'] !== undefined && !isValidPacketType(b['packet_type']))
    return { error: `packet_type must be one of: ${PACKET_TYPES.join(', ')}` };

  if (b['instructions_md'] !== undefined && b['instructions_md'] !== null && typeof b['instructions_md'] !== 'string')
    return { error: 'instructions_md must be a string or null' };

  if (b['due_date'] !== undefined && b['due_date'] !== null && typeof b['due_date'] !== 'string')
    return { error: 'due_date must be a string or null' };

  if (b['assignee_refs'] !== undefined && b['assignee_refs'] !== null && typeof b['assignee_refs'] !== 'string')
    return { error: 'assignee_refs must be a JSON string or null' };

  if (b['resource_refs'] !== undefined && b['resource_refs'] !== null && typeof b['resource_refs'] !== 'string')
    return { error: 'resource_refs must be a JSON string or null' };

  const data: PacketCreate = {
    plan_id: (b['plan_id'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['packet_type'] !== undefined) data.packet_type = b['packet_type'] as PacketType;
  if (b['instructions_md'] !== undefined) data.instructions_md = b['instructions_md'] as string | null;
  if (b['due_date'] !== undefined) data.due_date = b['due_date'] as string | null;
  if (b['assignee_refs'] !== undefined) data.assignee_refs = b['assignee_refs'] as string | null;
  if (b['resource_refs'] !== undefined) data.resource_refs = b['resource_refs'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validatePacketPatch(
  body: unknown,
): { data: PacketPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['packet_type'] !== undefined && !isValidPacketType(b['packet_type']))
    return { error: `packet_type must be one of: ${PACKET_TYPES.join(', ')}` };

  if (b['status'] !== undefined && !isValidPacketStatus(b['status']))
    return { error: `status must be one of: ${PACKET_STATUSES.join(', ')}` };

  if (b['due_date'] !== undefined && b['due_date'] !== null && typeof b['due_date'] !== 'string')
    return { error: 'due_date must be a string or null' };

  if (b['instructions_md'] !== undefined && b['instructions_md'] !== null && typeof b['instructions_md'] !== 'string')
    return { error: 'instructions_md must be a string or null' };

  if (b['assignee_refs'] !== undefined && b['assignee_refs'] !== null && typeof b['assignee_refs'] !== 'string')
    return { error: 'assignee_refs must be a JSON string or null' };

  if (b['resource_refs'] !== undefined && b['resource_refs'] !== null && typeof b['resource_refs'] !== 'string')
    return { error: 'resource_refs must be a JSON string or null' };

  const data: PacketPatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['packet_type'] !== undefined) data.packet_type = b['packet_type'] as PacketType;
  if (b['instructions_md'] !== undefined) data.instructions_md = b['instructions_md'] as string | null;
  if (b['due_date'] !== undefined) data.due_date = b['due_date'] as string | null;
  if (b['status'] !== undefined) data.status = b['status'] as PacketStatus;
  if (b['assignee_refs'] !== undefined) data.assignee_refs = b['assignee_refs'] as string | null;
  if (b['resource_refs'] !== undefined) data.resource_refs = b['resource_refs'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validatePacketItemAdd(
  body: unknown,
): { data: PacketItemAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  // At least one of task_id or resource_ref should be provided
  const hasTask = b['task_id'] !== undefined && b['task_id'] !== null;
  const hasResource = b['resource_ref'] !== undefined && b['resource_ref'] !== null;
  if (!hasTask && !hasResource)
    return { error: 'At least one of task_id or resource_ref must be provided' };

  if (b['task_id'] !== undefined && b['task_id'] !== null && typeof b['task_id'] !== 'string')
    return { error: 'task_id must be a string or null' };

  if (b['resource_ref'] !== undefined && b['resource_ref'] !== null && typeof b['resource_ref'] !== 'string')
    return { error: 'resource_ref must be a string or null' };

  if (b['resource_type'] !== undefined && b['resource_type'] !== null && typeof b['resource_type'] !== 'string')
    return { error: 'resource_type must be a string or null' };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  if (b['is_required'] !== undefined && typeof b['is_required'] !== 'boolean')
    return { error: 'is_required must be a boolean' };

  const data: PacketItemAdd = {};

  if (b['task_id'] !== undefined) data.task_id = b['task_id'] as string | null;
  if (b['resource_ref'] !== undefined) data.resource_ref = b['resource_ref'] as string | null;
  if (b['resource_type'] !== undefined) data.resource_type = b['resource_type'] as string | null;
  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['is_required'] !== undefined) data.is_required = b['is_required'] as boolean;

  return { data };
}
