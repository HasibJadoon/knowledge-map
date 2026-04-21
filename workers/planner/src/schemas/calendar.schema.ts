// ─── CalendarEntry schemas & types ────────────────────────────────────────────

export type CalendarEntryType =
  | 'scheduled_session'
  | 'deadline'
  | 'milestone'
  | 'review'
  | 'event'
  | 'other';

export interface CalendarEntry {
  id: string;               // PL:ULID
  core_user_ref: string;    // CORE:<user_id>
  core_ws_ref: string | null;
  plan_id: string | null;
  task_id: string | null;
  session_id: string | null;
  title: string;
  entry_type: CalendarEntryType;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  recurrence_json: string | null;  // RRULE-compatible JSON string
  is_completed: boolean;
  meta_json: string | null;
  created_at: string;
}

export interface CalendarEntryCreate {
  core_user_ref: string;
  title: string;
  start_datetime: string;
  entry_type?: CalendarEntryType;
  end_datetime?: string | null;
  all_day?: boolean;
  plan_id?: string | null;
  task_id?: string | null;
  session_id?: string | null;
  core_ws_ref?: string | null;
  recurrence_json?: string | null;
  meta_json?: string | null;
}

export interface CalendarEntryPatch {
  title?: string;
  start_datetime?: string;
  end_datetime?: string | null;
  all_day?: boolean;
  entry_type?: CalendarEntryType;
  is_completed?: boolean;
  recurrence_json?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const ENTRY_TYPES: CalendarEntryType[] = [
  'scheduled_session', 'deadline', 'milestone', 'review', 'event', 'other',
];

function isValidEntryType(v: unknown): v is CalendarEntryType {
  return typeof v === 'string' && (ENTRY_TYPES as string[]).includes(v);
}

export function validateCalendarEntryCreate(
  body: unknown,
): { data: CalendarEntryCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '')
    return { error: 'core_user_ref is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (typeof b['start_datetime'] !== 'string' || b['start_datetime'].trim() === '')
    return { error: 'start_datetime is required and must be a non-empty string (ISO 8601)' };

  if (b['entry_type'] !== undefined && !isValidEntryType(b['entry_type']))
    return { error: `entry_type must be one of: ${ENTRY_TYPES.join(', ')}` };

  if (b['end_datetime'] !== undefined && b['end_datetime'] !== null && typeof b['end_datetime'] !== 'string')
    return { error: 'end_datetime must be a string or null' };

  if (b['all_day'] !== undefined && typeof b['all_day'] !== 'boolean')
    return { error: 'all_day must be a boolean' };

  if (b['plan_id'] !== undefined && b['plan_id'] !== null && typeof b['plan_id'] !== 'string')
    return { error: 'plan_id must be a string or null' };

  if (b['task_id'] !== undefined && b['task_id'] !== null && typeof b['task_id'] !== 'string')
    return { error: 'task_id must be a string or null' };

  if (b['session_id'] !== undefined && b['session_id'] !== null && typeof b['session_id'] !== 'string')
    return { error: 'session_id must be a string or null' };

  if (b['core_ws_ref'] !== undefined && b['core_ws_ref'] !== null && typeof b['core_ws_ref'] !== 'string')
    return { error: 'core_ws_ref must be a string or null' };

  if (b['recurrence_json'] !== undefined && b['recurrence_json'] !== null && typeof b['recurrence_json'] !== 'string')
    return { error: 'recurrence_json must be a JSON string or null' };

  const data: CalendarEntryCreate = {
    core_user_ref: (b['core_user_ref'] as string).trim(),
    title: (b['title'] as string).trim(),
    start_datetime: (b['start_datetime'] as string).trim(),
  };

  if (b['entry_type'] !== undefined) data.entry_type = b['entry_type'] as CalendarEntryType;
  if (b['end_datetime'] !== undefined) data.end_datetime = b['end_datetime'] as string | null;
  if (b['all_day'] !== undefined) data.all_day = b['all_day'] as boolean;
  if (b['plan_id'] !== undefined) data.plan_id = b['plan_id'] as string | null;
  if (b['task_id'] !== undefined) data.task_id = b['task_id'] as string | null;
  if (b['session_id'] !== undefined) data.session_id = b['session_id'] as string | null;
  if (b['core_ws_ref'] !== undefined) data.core_ws_ref = b['core_ws_ref'] as string | null;
  if (b['recurrence_json'] !== undefined) data.recurrence_json = b['recurrence_json'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validateCalendarEntryPatch(
  body: unknown,
): { data: CalendarEntryPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['start_datetime'] !== undefined && (typeof b['start_datetime'] !== 'string' || (b['start_datetime'] as string).trim() === ''))
    return { error: 'start_datetime must be a non-empty string (ISO 8601)' };

  if (b['end_datetime'] !== undefined && b['end_datetime'] !== null && typeof b['end_datetime'] !== 'string')
    return { error: 'end_datetime must be a string or null' };

  if (b['all_day'] !== undefined && typeof b['all_day'] !== 'boolean')
    return { error: 'all_day must be a boolean' };

  if (b['entry_type'] !== undefined && !isValidEntryType(b['entry_type']))
    return { error: `entry_type must be one of: ${ENTRY_TYPES.join(', ')}` };

  if (b['is_completed'] !== undefined && typeof b['is_completed'] !== 'boolean')
    return { error: 'is_completed must be a boolean' };

  if (b['recurrence_json'] !== undefined && b['recurrence_json'] !== null && typeof b['recurrence_json'] !== 'string')
    return { error: 'recurrence_json must be a JSON string or null' };

  if (b['meta_json'] !== undefined && b['meta_json'] !== null && typeof b['meta_json'] !== 'string')
    return { error: 'meta_json must be a string or null' };

  const data: CalendarEntryPatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['start_datetime'] !== undefined) data.start_datetime = (b['start_datetime'] as string).trim();
  if (b['end_datetime'] !== undefined) data.end_datetime = b['end_datetime'] as string | null;
  if (b['all_day'] !== undefined) data.all_day = b['all_day'] as boolean;
  if (b['entry_type'] !== undefined) data.entry_type = b['entry_type'] as CalendarEntryType;
  if (b['is_completed'] !== undefined) data.is_completed = b['is_completed'] as boolean;
  if (b['recurrence_json'] !== undefined) data.recurrence_json = b['recurrence_json'] as string | null;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}
