// ─── Session & SessionItemLog schemas & types ─────────────────────────────────

export type SessionType =
  | 'reading'
  | 'memorization'
  | 'revision'
  | 'exercise'
  | 'lecture'
  | 'class'
  | 'podcast'
  | 'research'
  | 'other';

export type SessionItemStatus = 'completed' | 'partial' | 'skipped' | 'reviewed';

export interface PlSession {
  id: string;               // PL:ULID
  plan_id: string | null;
  task_id: string | null;
  core_user_ref: string;    // CORE:<user_id>
  core_ws_ref: string | null;
  session_type: SessionType;
  resource_ref: string | null;
  resource_type: string | null;
  resource_label: string | null;
  qr_scope_ref: string | null;   // e.g. 'QR:2:1-10'
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  pages_covered: string | null;  // e.g. '45-60'
  ayahs_covered: string | null;  // e.g. '1-15'
  rating: number | null;         // 1–5
  notes_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface SessionItemLog {
  id: string;              // PL:ULID
  session_id: string;
  resource_ref: string;
  resource_type: string;
  resource_label: string | null;
  item_status: SessionItemStatus;
  time_spent_mins: number | null;
  notes: string | null;
  created_at: string;
}

export interface SessionCreate {
  plan_id?: string | null;
  core_user_ref: string;
  session_type?: SessionType;
  task_id?: string | null;
  core_ws_ref?: string | null;
  resource_ref?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  qr_scope_ref?: string | null;
  started_at?: string;
}

export interface SessionComplete {
  duration_mins: number;
  rating?: number | null;
  notes_md?: string | null;
  pages_covered?: string | null;
  ayahs_covered?: string | null;
  ended_at?: string;
}

export interface SessionItemLogAdd {
  resource_ref?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  item_status?: SessionItemStatus;
  time_spent_mins?: number | null;
  notes?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const SESSION_TYPES: SessionType[] = [
  'reading', 'memorization', 'revision', 'exercise',
  'lecture', 'class', 'podcast', 'research', 'other',
];

const SESSION_ITEM_STATUSES: SessionItemStatus[] = [
  'completed', 'partial', 'skipped', 'reviewed',
];

function isValidSessionType(v: unknown): v is SessionType {
  return typeof v === 'string' && (SESSION_TYPES as string[]).includes(v);
}

function isValidSessionItemStatus(v: unknown): v is SessionItemStatus {
  return typeof v === 'string' && (SESSION_ITEM_STATUSES as string[]).includes(v);
}

function isValidRating(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
}

export function validateSessionCreate(
  body: unknown,
): { data: SessionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '')
    return { error: 'core_user_ref is required and must be a non-empty string' };

  if (b['session_type'] !== undefined && !isValidSessionType(b['session_type']))
    return { error: `session_type must be one of: ${SESSION_TYPES.join(', ')}` };

  if (b['plan_id'] !== undefined && b['plan_id'] !== null && typeof b['plan_id'] !== 'string')
    return { error: 'plan_id must be a string or null' };

  if (b['task_id'] !== undefined && b['task_id'] !== null && typeof b['task_id'] !== 'string')
    return { error: 'task_id must be a string or null' };

  if (b['core_ws_ref'] !== undefined && b['core_ws_ref'] !== null && typeof b['core_ws_ref'] !== 'string')
    return { error: 'core_ws_ref must be a string or null' };

  if (b['resource_ref'] !== undefined && b['resource_ref'] !== null && typeof b['resource_ref'] !== 'string')
    return { error: 'resource_ref must be a string or null' };

  if (b['resource_type'] !== undefined && b['resource_type'] !== null && typeof b['resource_type'] !== 'string')
    return { error: 'resource_type must be a string or null' };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (b['qr_scope_ref'] !== undefined && b['qr_scope_ref'] !== null && typeof b['qr_scope_ref'] !== 'string')
    return { error: 'qr_scope_ref must be a string or null' };

  if (b['started_at'] !== undefined && typeof b['started_at'] !== 'string')
    return { error: 'started_at must be a string (ISO 8601)' };

  const data: SessionCreate = {
    core_user_ref: (b['core_user_ref'] as string).trim(),
  };

  if (b['plan_id'] !== undefined) data.plan_id = b['plan_id'] as string | null;
  if (b['task_id'] !== undefined) data.task_id = b['task_id'] as string | null;
  if (b['session_type'] !== undefined) data.session_type = b['session_type'] as SessionType;
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = b['core_ws_ref'] as string | null;
  if (b['resource_ref'] !== undefined) data.resource_ref = b['resource_ref'] as string | null;
  if (b['resource_type'] !== undefined) data.resource_type = b['resource_type'] as string | null;
  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['qr_scope_ref'] !== undefined) data.qr_scope_ref = b['qr_scope_ref'] as string | null;
  if (b['started_at'] !== undefined) data.started_at = b['started_at'] as string;

  return { data };
}

export function validateSessionComplete(
  body: unknown,
): { data: SessionComplete } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (
    typeof b['duration_mins'] !== 'number' ||
    !Number.isInteger(b['duration_mins']) ||
    (b['duration_mins'] as number) < 0
  ) {
    return { error: 'duration_mins is required and must be a non-negative integer' };
  }

  if (b['rating'] !== undefined && b['rating'] !== null && !isValidRating(b['rating']))
    return { error: 'rating must be an integer 1–5 or null' };

  if (b['notes_md'] !== undefined && b['notes_md'] !== null && typeof b['notes_md'] !== 'string')
    return { error: 'notes_md must be a string or null' };

  if (b['pages_covered'] !== undefined && b['pages_covered'] !== null && typeof b['pages_covered'] !== 'string')
    return { error: 'pages_covered must be a string or null' };

  if (b['ayahs_covered'] !== undefined && b['ayahs_covered'] !== null && typeof b['ayahs_covered'] !== 'string')
    return { error: 'ayahs_covered must be a string or null' };

  if (b['ended_at'] !== undefined && typeof b['ended_at'] !== 'string')
    return { error: 'ended_at must be a string (ISO 8601)' };

  const data: SessionComplete = {
    duration_mins: b['duration_mins'] as number,
  };

  if (b['rating'] !== undefined) data.rating = b['rating'] as number | null;
  if (b['notes_md'] !== undefined) data.notes_md = b['notes_md'] as string | null;
  if (b['pages_covered'] !== undefined) data.pages_covered = b['pages_covered'] as string | null;
  if (b['ayahs_covered'] !== undefined) data.ayahs_covered = b['ayahs_covered'] as string | null;
  if (b['ended_at'] !== undefined) data.ended_at = b['ended_at'] as string;

  return { data };
}

export function validateSessionItemLogAdd(
  body: unknown,
): { data: SessionItemLogAdd } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['item_status'] !== undefined && !isValidSessionItemStatus(b['item_status']))
    return { error: `item_status must be one of: ${SESSION_ITEM_STATUSES.join(', ')}` };

  if (b['resource_ref'] !== undefined && b['resource_ref'] !== null && typeof b['resource_ref'] !== 'string')
    return { error: 'resource_ref must be a string or null' };

  if (b['resource_type'] !== undefined && b['resource_type'] !== null && typeof b['resource_type'] !== 'string')
    return { error: 'resource_type must be a string or null' };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (
    b['time_spent_mins'] !== undefined &&
    b['time_spent_mins'] !== null &&
    !(typeof b['time_spent_mins'] === 'number' && Number.isInteger(b['time_spent_mins']) && (b['time_spent_mins'] as number) >= 0)
  ) {
    return { error: 'time_spent_mins must be a non-negative integer or null' };
  }

  if (b['notes'] !== undefined && b['notes'] !== null && typeof b['notes'] !== 'string')
    return { error: 'notes must be a string or null' };

  const data: SessionItemLogAdd = {};

  if (b['resource_ref'] !== undefined) data.resource_ref = b['resource_ref'] as string | null;
  if (b['resource_type'] !== undefined) data.resource_type = b['resource_type'] as string | null;
  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['item_status'] !== undefined) data.item_status = b['item_status'] as SessionItemStatus;
  if (b['time_spent_mins'] !== undefined) data.time_spent_mins = b['time_spent_mins'] as number | null;
  if (b['notes'] !== undefined) data.notes = b['notes'] as string | null;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Session {
  id: string;                 // PL:ULID
  plan_id: string | null;     // PL:ULID
  task_id: string | null;     // PL:ULID
  core_user_ref: string;      // 'CORE:<user_id>'
  core_ws_ref: string | null; // 'CORE:<workspace_id>'
  session_type: string;       // 'reading'|'memorization'|'revision'|'exercise'|'lecture'|'class'|'podcast'|'research'|'other'
  resource_ref: string | null;    // primary resource studied
  resource_type: string | null;
  resource_label: string | null;  // denormalized
  qr_scope_ref: string | null;    // 'QR:2:1-10' if Quran session
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  pages_covered: string | null;   // e.g. '45-60'
  ayahs_covered: string | null;   // e.g. '1-15'
  rating: number | null;          // 1–5 quality/focus rating
  notes_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface SessionItemLogCreate {
  resource_ref: string;
  resource_type: string;
  resource_label?: string | null;
  item_status?: string;
  time_spent_mins?: number | null;
  notes?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSessionItemLogCreate(body: unknown): SchemaValidationResult<SessionItemLogCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.resource_type !== 'string' || !b.resource_type.trim()) return { error: 'resource_type is required and must be a non-empty string' };
  data.resource_type = b.resource_type.trim();
  if ('resource_label' in b) {
    if (b.resource_label !== null && typeof b.resource_label !== 'string') return { error: 'resource_label must be a string or null' };
    data.resource_label = b.resource_label;
  }
  if ('item_status' in b) {
    if (typeof b.item_status !== 'string') return { error: 'item_status must be a string' };
    data.item_status = b.item_status;
  }
  if ('time_spent_mins' in b) {
    if (b.time_spent_mins !== null && (typeof b.time_spent_mins !== 'number' || !Number.isFinite(b.time_spent_mins))) return { error: 'time_spent_mins must be a number or null' };
    data.time_spent_mins = b.time_spent_mins;
  }
  if ('notes' in b) {
    if (b.notes !== null && typeof b.notes !== 'string') return { error: 'notes must be a string or null' };
    data.notes = b.notes;
  }

  return { data: data as unknown as SessionItemLogCreate };
}
