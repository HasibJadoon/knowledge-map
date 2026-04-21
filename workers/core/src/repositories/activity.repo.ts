// ─── ActivityRepo — core_activity_events + core_notifications ─────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  workspace_id: string | null;
  actor_user_ref: string;
  event_type: string;
  resource_ref: string | null;
  resource_type: string | null;
  payload_json: string | null;
  created_at: string;
}

export interface ActivityEventInput {
  workspaceId?: string;
  actorUserRef: string;
  eventType: string;
  resourceRef?: string;
  resourceType?: string;
  payloadJson?: string;
}

export interface Notification {
  id: string;
  user_ref: string;
  workspace_id: string | null;
  notif_type: string;
  title: string;
  body_md: string | null;
  resource_ref: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
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

// ── Column fragments ──────────────────────────────────────────────────────────

const EVENT_COLS = `
  id, workspace_id, actor_user_ref, event_type, resource_ref,
  resource_type, payload_json, created_at
FROM core_activity_events`;

const NOTIF_COLS = `
  id, user_ref, workspace_id, notif_type, title, body_md,
  resource_ref, is_read, read_at, created_at
FROM core_notifications`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ActivityRepo {
  constructor(private db: D1Database) {}

  // ── Activity Events ──

  async log(input: ActivityEventInput): Promise<ActivityEvent> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_activity_events
         (id, workspace_id, actor_user_ref, event_type, resource_ref,
          resource_type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId ?? null,
        input.actorUserRef,
        input.eventType,
        input.resourceRef ?? null,
        input.resourceType ?? null,
        input.payloadJson ?? null,
        now,
      ],
    );
    return (await queryOne<ActivityEvent>(
      this.db,
      `SELECT ${EVENT_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  workspaceEvents(workspaceId: string, opts: ActivityListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.eventType) {
      conditions.push('event_type = ?');
      args.push(opts.eventType);
    }
    if (opts.actorUserRef) {
      conditions.push('actor_user_ref = ?');
      args.push(opts.actorUserRef);
    }
    if (opts.resourceRef) {
      conditions.push('resource_ref = ?');
      args.push(opts.resourceRef);
    }

    const where = conditions.join(' AND ');
    return paginate<ActivityEvent>(
      this.db,
      `SELECT ${EVENT_COLS} WHERE ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_activity_events WHERE ${where}`,
      args,
      opts,
    );
  }

  /** Events touching a specific resource (cross-workspace). */
  resourceEvents(resourceRef: string, opts: PaginateOptions = {}) {
    return paginate<ActivityEvent>(
      this.db,
      `SELECT ${EVENT_COLS} WHERE resource_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_activity_events WHERE resource_ref = ?`,
      [resourceRef],
      opts,
    );
  }

  // ── Notifications ──

  async notify(input: NotificationInput): Promise<Notification> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_notifications
         (id, user_ref, workspace_id, notif_type, title, body_md,
          resource_ref, is_read, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      [
        id,
        input.userRef,
        input.workspaceId ?? null,
        input.notifType,
        input.title,
        input.bodyMd ?? null,
        input.resourceRef ?? null,
        now,
      ],
    );
    return (await queryOne<Notification>(
      this.db,
      `SELECT ${NOTIF_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  userNotifications(userRef: string, opts: NotifListOptions = {}) {
    const conditions: string[] = ['user_ref = ?'];
    const args: unknown[] = [userRef];

    if (opts.unreadOnly) {
      conditions.push('is_read = 0');
    }

    const where = conditions.join(' AND ');
    return paginate<Notification>(
      this.db,
      `SELECT ${NOTIF_COLS} WHERE ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_notifications WHERE ${where}`,
      args,
      opts,
    );
  }

  async markRead(notifId: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_notifications
       SET is_read = 1, read_at = datetime('now')
       WHERE id = ?`,
      [notifId],
    );
  }

  async markAllRead(userRef: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_notifications
       SET is_read = 1, read_at = datetime('now')
       WHERE user_ref = ? AND is_read = 0`,
      [userRef],
    );
  }

  unreadCount(userRef: string): Promise<{ count: number } | null> {
    return queryOne<{ count: number }>(
      this.db,
      `SELECT COUNT(*) AS count FROM core_notifications WHERE user_ref = ? AND is_read = 0`,
      [userRef],
    );
  }
}
