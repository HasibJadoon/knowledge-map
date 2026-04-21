// ─── ReviewCycle & ReviewEvent schemas & types ────────────────────────────────

export type ReviewCycleType =
  | 'periodic'
  | 'milestone'
  | 'submission'
  | 'class_round'
  | 'sprint_retro'
  | 'other';

export type ReviewCycleStatus = 'pending' | 'active' | 'complete' | 'cancelled';

export type ReviewCycleCadence = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReviewCycle {
  id: string;              // PL:ULID
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

export type ReviewEventType =
  | 'submission'
  | 'feedback'
  | 'approval'
  | 'rejection'
  | 'revision'
  | 'final';

export type ReviewEventStatus = 'pending' | 'complete' | 'cancelled';

export interface ReviewEvent {
  id: string;              // PL:ULID
  cycle_id: string;
  reviewer_ref: string | null;   // CORE:<user_id>
  reviewee_ref: string | null;   // CORE:<user_id>
  event_type: ReviewEventType;
  notes_md: string | null;
  score: number | null;
  status: ReviewEventStatus;
  due_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ReviewCycleCreate {
  plan_id: string;
  title: string;
  cycle_type?: ReviewCycleType;
  cadence?: ReviewCycleCadence | null;
  cadence_days?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  packet_id?: string | null;
  meta_json?: string | null;
}

export interface ReviewEventCreate {
  cycle_id: string;
  reviewer_ref: string;
  reviewee_ref?: string | null;
  event_type?: ReviewEventType;
  due_at?: string | null;
  notes_md?: string | null;
}

export interface ReviewEventUpdate {
  status: ReviewEventStatus;
  score?: number | null;
  notes_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const CYCLE_TYPES: ReviewCycleType[] = [
  'periodic', 'milestone', 'submission', 'class_round', 'sprint_retro', 'other',
];

const CYCLE_STATUSES: ReviewCycleStatus[] = [
  'pending', 'active', 'complete', 'cancelled',
];

const CADENCES: ReviewCycleCadence[] = ['daily', 'weekly', 'monthly', 'custom'];

const EVENT_TYPES: ReviewEventType[] = [
  'submission', 'feedback', 'approval', 'rejection', 'revision', 'final',
];

const EVENT_STATUSES: ReviewEventStatus[] = ['pending', 'complete', 'cancelled'];

function isValidCycleType(v: unknown): v is ReviewCycleType {
  return typeof v === 'string' && (CYCLE_TYPES as string[]).includes(v);
}

function isValidCycleStatus(v: unknown): v is ReviewCycleStatus {
  return typeof v === 'string' && (CYCLE_STATUSES as string[]).includes(v);
}

function isValidCadence(v: unknown): v is ReviewCycleCadence {
  return typeof v === 'string' && (CADENCES as string[]).includes(v);
}

function isValidEventType(v: unknown): v is ReviewEventType {
  return typeof v === 'string' && (EVENT_TYPES as string[]).includes(v);
}

function isValidEventStatus(v: unknown): v is ReviewEventStatus {
  return typeof v === 'string' && (EVENT_STATUSES as string[]).includes(v);
}

export function validateReviewCycleCreate(
  body: unknown,
): { data: ReviewCycleCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['plan_id'] !== 'string' || b['plan_id'].trim() === '')
    return { error: 'plan_id is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['cycle_type'] !== undefined && !isValidCycleType(b['cycle_type']))
    return { error: `cycle_type must be one of: ${CYCLE_TYPES.join(', ')}` };

  if (b['cadence'] !== undefined && b['cadence'] !== null && !isValidCadence(b['cadence']))
    return { error: `cadence must be one of: ${CADENCES.join(', ')}` };

  if (
    b['cadence_days'] !== undefined &&
    b['cadence_days'] !== null &&
    !(typeof b['cadence_days'] === 'number' && Number.isInteger(b['cadence_days']) && (b['cadence_days'] as number) > 0)
  ) {
    return { error: 'cadence_days must be a positive integer or null' };
  }

  if (b['starts_at'] !== undefined && b['starts_at'] !== null && typeof b['starts_at'] !== 'string')
    return { error: 'starts_at must be a string or null' };

  if (b['ends_at'] !== undefined && b['ends_at'] !== null && typeof b['ends_at'] !== 'string')
    return { error: 'ends_at must be a string or null' };

  if (b['packet_id'] !== undefined && b['packet_id'] !== null && typeof b['packet_id'] !== 'string')
    return { error: 'packet_id must be a string or null' };

  const data: ReviewCycleCreate = {
    plan_id: (b['plan_id'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['cycle_type'] !== undefined) data.cycle_type = b['cycle_type'] as ReviewCycleType;
  if (b['cadence'] !== undefined) data.cadence = b['cadence'] as ReviewCycleCadence | null;
  if (b['cadence_days'] !== undefined) data.cadence_days = b['cadence_days'] as number | null;
  if (b['starts_at'] !== undefined) data.starts_at = b['starts_at'] as string | null;
  if (b['ends_at'] !== undefined) data.ends_at = b['ends_at'] as string | null;
  if (b['packet_id'] !== undefined) data.packet_id = b['packet_id'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validateReviewEventCreate(
  body: unknown,
): { data: ReviewEventCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['cycle_id'] !== 'string' || b['cycle_id'].trim() === '')
    return { error: 'cycle_id is required and must be a non-empty string' };

  if (typeof b['reviewer_ref'] !== 'string' || b['reviewer_ref'].trim() === '')
    return { error: 'reviewer_ref is required and must be a non-empty string' };

  if (b['reviewee_ref'] !== undefined && b['reviewee_ref'] !== null && typeof b['reviewee_ref'] !== 'string')
    return { error: 'reviewee_ref must be a string or null' };

  if (b['event_type'] !== undefined && !isValidEventType(b['event_type']))
    return { error: `event_type must be one of: ${EVENT_TYPES.join(', ')}` };

  if (b['due_at'] !== undefined && b['due_at'] !== null && typeof b['due_at'] !== 'string')
    return { error: 'due_at must be a string or null' };

  if (b['notes_md'] !== undefined && b['notes_md'] !== null && typeof b['notes_md'] !== 'string')
    return { error: 'notes_md must be a string or null' };

  const data: ReviewEventCreate = {
    cycle_id: (b['cycle_id'] as string).trim(),
    reviewer_ref: (b['reviewer_ref'] as string).trim(),
  };

  if (b['reviewee_ref'] !== undefined) data.reviewee_ref = b['reviewee_ref'] as string | null;
  if (b['event_type'] !== undefined) data.event_type = b['event_type'] as ReviewEventType;
  if (b['due_at'] !== undefined) data.due_at = b['due_at'] as string | null;
  if (b['notes_md'] !== undefined) data.notes_md = b['notes_md'] as string | null;

  return { data };
}

export function validateReviewEventUpdate(
  body: unknown,
): { data: ReviewEventUpdate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (!isValidEventStatus(b['status']))
    return { error: `status is required and must be one of: ${EVENT_STATUSES.join(', ')}` };

  if (
    b['score'] !== undefined &&
    b['score'] !== null &&
    typeof b['score'] !== 'number'
  ) {
    return { error: 'score must be a number or null' };
  }

  if (b['notes_md'] !== undefined && b['notes_md'] !== null && typeof b['notes_md'] !== 'string')
    return { error: 'notes_md must be a string or null' };

  const data: ReviewEventUpdate = {
    status: b['status'] as ReviewEventStatus,
  };

  if (b['score'] !== undefined) data.score = b['score'] as number | null;
  if (b['notes_md'] !== undefined) data.notes_md = b['notes_md'] as string | null;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface ReviewCyclePatch {
  title?: string;
  cycle_type?: string;
  cadence?: string | null;
  cadence_days?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string;
  meta_json?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateReviewCyclePatch(body: unknown): SchemaValidationResult<ReviewCyclePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('cycle_type' in b) {
    if (typeof b.cycle_type !== 'string') return { error: 'cycle_type must be a string' };
    data.cycle_type = b.cycle_type;
  }
  if ('cadence' in b) {
    if (b.cadence !== null && typeof b.cadence !== 'string') return { error: 'cadence must be a string or null' };
    data.cadence = b.cadence;
  }
  if ('cadence_days' in b) {
    if (b.cadence_days !== null && (typeof b.cadence_days !== 'number' || !Number.isFinite(b.cadence_days))) return { error: 'cadence_days must be a number or null' };
    data.cadence_days = b.cadence_days;
  }
  if ('starts_at' in b) {
    if (b.starts_at !== null && typeof b.starts_at !== 'string') return { error: 'starts_at must be a string or null' };
    data.starts_at = b.starts_at;
  }
  if ('ends_at' in b) {
    if (b.ends_at !== null && typeof b.ends_at !== 'string') return { error: 'ends_at must be a string or null' };
    data.ends_at = b.ends_at;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ReviewCyclePatch };
}
