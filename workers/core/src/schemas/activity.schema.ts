// ─── Activity & Notification schemas & types ──────────────────────────────────

// core_activity_events
import type { PaginateOptions } from '../../../shared/src/types';

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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface ActivityEventInput {
  workspaceId?: string;
  actorUserRef: string;
  eventType: string;
  resourceRef?: string;
  resourceType?: string;
  payloadJson?: string;
}

export interface NotificationInput {
  userRef: string;
  workspaceId?: string;
  notifType: string;
  title: string;
  bodyMd?: string;
  resourceRef?: string;
}

export interface ActivityListOptions extends PaginateOptions {
  eventType?: string;
  actorUserRef?: string;
  resourceRef?: string;
}

export interface NotifListOptions extends PaginateOptions {
  unreadOnly?: boolean;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateActivityEventInput(body: unknown): SchemaValidationResult<ActivityEventInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('workspaceId' in b) {
    if (typeof b.workspaceId !== 'string') return { error: 'workspaceId must be a string' };
    data.workspaceId = b.workspaceId;
  }
  if (typeof b.actorUserRef !== 'string' || !b.actorUserRef.trim()) return { error: 'actorUserRef is required and must be a non-empty string' };
  data.actorUserRef = b.actorUserRef.trim();
  if (typeof b.eventType !== 'string' || !b.eventType.trim()) return { error: 'eventType is required and must be a non-empty string' };
  data.eventType = b.eventType.trim();
  if ('resourceRef' in b) {
    if (typeof b.resourceRef !== 'string') return { error: 'resourceRef must be a string' };
    data.resourceRef = b.resourceRef;
  }
  if ('resourceType' in b) {
    if (typeof b.resourceType !== 'string') return { error: 'resourceType must be a string' };
    data.resourceType = b.resourceType;
  }
  if ('payloadJson' in b) {
    if (typeof b.payloadJson !== 'string') return { error: 'payloadJson must be a string' };
    data.payloadJson = b.payloadJson;
  }

  return { data: data as unknown as ActivityEventInput };
}

export function validateNotificationInput(body: unknown): SchemaValidationResult<NotificationInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.userRef !== 'string' || !b.userRef.trim()) return { error: 'userRef is required and must be a non-empty string' };
  data.userRef = b.userRef.trim();
  if ('workspaceId' in b) {
    if (typeof b.workspaceId !== 'string') return { error: 'workspaceId must be a string' };
    data.workspaceId = b.workspaceId;
  }
  if (typeof b.notifType !== 'string' || !b.notifType.trim()) return { error: 'notifType is required and must be a non-empty string' };
  data.notifType = b.notifType.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('bodyMd' in b) {
    if (typeof b.bodyMd !== 'string') return { error: 'bodyMd must be a string' };
    data.bodyMd = b.bodyMd;
  }
  if ('resourceRef' in b) {
    if (typeof b.resourceRef !== 'string') return { error: 'resourceRef must be a string' };
    data.resourceRef = b.resourceRef;
  }

  return { data: data as unknown as NotificationInput };
}
