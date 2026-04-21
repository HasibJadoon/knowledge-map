// ─── Activity & Notification schemas & types ──────────────────────────────────

// core_activity_events
export interface ActivityEvent {
  id: string;                                           // CORE:ULID
  workspace_id: string | null;
  actor_user_ref: string;                               // 'CORE:<user_id>'
  event_type: string;
    // 'resource_created'|'resource_updated'|'resource_deleted'|'member_joined'|
    // 'comment_added'|'suggestion_approved'|'plan_completed'|'session_logged'|'other'
  resource_ref: string | null;                          // typed ref to affected resource
  resource_type: string | null;
  payload_json: string | null;                          // contextual data snapshot
  created_at: string;
}

export interface ActivityEventLog {
  workspace_id: string;
  actor_user_ref: string;
  event_type: string;
  resource_ref?: string;
  resource_type?: string;
  payload_json?: string;
}

// core_notifications
export interface Notification {
  id: string;                                           // CORE:ULID
  user_ref: string;                                     // 'CORE:<user_id>'
  workspace_id: string | null;
  notif_type: string;
    // 'mention'|'comment'|'approval_request'|'assignment'|'milestone'|
    // 'suggestion'|'system'|'review'|'other'
  title: string;
  body_md: string | null;
  resource_ref: string | null;
  is_read: boolean;                                     // DB: INTEGER 0|1
  read_at: string | null;
  created_at: string;
}

export interface NotificationCreate {
  user_ref: string;
  workspace_id?: string;
  notif_type: string;
  title: string;
  body_md?: string;
  resource_ref?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateActivityLog(
  body: unknown,
): { data: ActivityEventLog } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.actor_user_ref !== 'string' || !b.actor_user_ref.trim())
    return { error: 'actor_user_ref is required' };
  if (typeof b.event_type !== 'string' || !b.event_type.trim())
    return { error: 'event_type is required' };

  const data: ActivityEventLog = {
    workspace_id: b.workspace_id.trim(),
    actor_user_ref: b.actor_user_ref.trim(),
    event_type: b.event_type.trim(),
  };

  if (typeof b.resource_ref === 'string') data.resource_ref = b.resource_ref;
  if (typeof b.resource_type === 'string') data.resource_type = b.resource_type;
  if (typeof b.payload_json === 'string') data.payload_json = b.payload_json;

  return { data };
}

export function validateNotificationCreate(
  body: unknown,
): { data: NotificationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.user_ref !== 'string' || !b.user_ref.trim())
    return { error: 'user_ref is required' };
  if (typeof b.notif_type !== 'string' || !b.notif_type.trim())
    return { error: 'notif_type is required' };
  if (typeof b.title !== 'string' || !b.title.trim())
    return { error: 'title is required' };

  const data: NotificationCreate = {
    user_ref: b.user_ref.trim(),
    notif_type: b.notif_type.trim(),
    title: b.title.trim(),
  };

  if (typeof b.workspace_id === 'string') data.workspace_id = b.workspace_id;
  if (typeof b.body_md === 'string') data.body_md = b.body_md;
  if (typeof b.resource_ref === 'string') data.resource_ref = b.resource_ref;

  return { data };
}
