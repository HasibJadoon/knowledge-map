// ─── Lane & LaneItem schemas & types ──────────────────────────────────────────

export type LaneType = 'pending' | 'in_progress' | 'done' | 'skipped' | 'blocked' | 'custom';

export interface Lane {
  id: string;        // PL:ULID
  plan_id: string;
  title: string;
  lane_type: LaneType;
  sort_order: number;
  color: string | null;
  wip_limit: number | null;
  created_at: string;
}

export interface LaneItem {
  id: string;          // PL:ULID
  lane_id: string;
  task_id: string;
  sort_order: number;
  moved_at: string;
  moved_by_ref: string | null;  // CORE:<user_id>
}

export interface LaneCreate {
  plan_id: string;
  title: string;
  lane_type?: LaneType;
  sort_order?: number;
  color?: string | null;
  wip_limit?: number | null;
}

/**
 * Payload for moving a task into a lane (POST /lanes/:laneId/items).
 * The task_id is required; sort_order is optional.
 */
export interface LaneItemMove {
  task_id: string;
  sort_order?: number;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const LANE_TYPES: LaneType[] = [
  'pending', 'in_progress', 'done', 'skipped', 'blocked', 'custom',
];

function isValidLaneType(v: unknown): v is LaneType {
  return typeof v === 'string' && (LANE_TYPES as string[]).includes(v);
}

export function validateLaneCreate(
  body: unknown,
): { data: LaneCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['plan_id'] !== 'string' || b['plan_id'].trim() === '')
    return { error: 'plan_id is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['lane_type'] !== undefined && !isValidLaneType(b['lane_type']))
    return { error: `lane_type must be one of: ${LANE_TYPES.join(', ')}` };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  if (b['color'] !== undefined && b['color'] !== null && typeof b['color'] !== 'string')
    return { error: 'color must be a string or null' };

  if (
    b['wip_limit'] !== undefined &&
    b['wip_limit'] !== null &&
    !(typeof b['wip_limit'] === 'number' && Number.isInteger(b['wip_limit']) && (b['wip_limit'] as number) >= 0)
  ) {
    return { error: 'wip_limit must be a non-negative integer or null' };
  }

  const data: LaneCreate = {
    plan_id: (b['plan_id'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['lane_type'] !== undefined) data.lane_type = b['lane_type'] as LaneType;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['color'] !== undefined) data.color = b['color'] as string | null;
  if (b['wip_limit'] !== undefined) data.wip_limit = b['wip_limit'] as number | null;

  return { data };
}

export function validateLaneItemMove(
  body: unknown,
): { data: LaneItemMove } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['task_id'] !== 'string' || b['task_id'].trim() === '')
    return { error: 'task_id is required and must be a non-empty string' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: LaneItemMove = {
    task_id: (b['task_id'] as string).trim(),
  };

  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;

  return { data };
}
