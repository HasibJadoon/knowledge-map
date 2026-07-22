// ─── DashboardRepo — km-core control-system snapshot ──────────────────────────
// Read-only aggregate over the whole km_core database. Powers the higher-level
// "control systems" dashboard: subsystem health, KPI counts, and live feeds.
// One repo, one round of parallel COUNT / SELECT queries, no cross-domain SQL.

import { query, queryOne } from '../../../shared/src/db';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SubsystemStat {
  /** Stable subsystem key — 'identity', 'workspaces', 'access', … */
  key: string;
  /** Human label shown on the control tile. */
  label: string;
  /** Primary live count. */
  total: number;
  /** Secondary count (active / enabled / unread / pending …). */
  active: number;
  /** Derived operational status — 'nominal' | 'active' | 'idle' | 'alert'. */
  status: 'nominal' | 'active' | 'idle' | 'alert';
}

export interface FeedEvent {
  id: string;
  kind: 'activity' | 'audit';
  actor_user_ref: string;
  label: string;         // event_type or action
  resource_ref: string | null;
  workspace_id: string | null;
  created_at: string;
}

export interface FeatureFlagRow {
  flag_key: string;
  title: string;
  is_enabled: number;
  rollout_percent: number;
  updated_at: string;
}

export interface DashboardSnapshot {
  generated_at: string;
  subsystems: SubsystemStat[];
  /** 0–100 composite health index derived from subsystem states. */
  health_index: number;
  totals: Record<string, number>;
  feature_flags: FeatureFlagRow[];
  feed: FeedEvent[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function count(db: D1Database, sql: string): Promise<number> {
  const row = await queryOne<{ n: number }>(db, sql);
  return row?.n ?? 0;
}

function statusFor(total: number, active: number): SubsystemStat['status'] {
  if (total === 0) return 'idle';
  if (active > 0) return 'active';
  return 'nominal';
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export class DashboardRepo {
  constructor(private db: D1Database) {}

  /** Full control-system snapshot in a single call. */
  async snapshot(): Promise<DashboardSnapshot> {
    const db = this.db;

    // Counts — run concurrently. Each is a cheap indexed COUNT(*).
    const [
      users,
      usersActive,
      workspaces,
      workspacesActive,
      sessions,
      sessionsLive,
      tokens,
      tokensLive,
      grants,
      grantsLive,
      policies,
      flags,
      flagsOn,
      notifications,
      notifUnread,
      reviewQueue,
      reviewPending,
      people,
      podcasts,
      activityCount,
      auditCount,
    ] = await Promise.all([
      count(db, `SELECT COUNT(*) AS n FROM core_users`),
      count(db, `SELECT COUNT(*) AS n FROM core_users WHERE account_status = 'active'`),
      count(db, `SELECT COUNT(*) AS n FROM core_workspaces`),
      count(db, `SELECT COUNT(*) AS n FROM core_workspaces WHERE status = 'active'`),
      count(db, `SELECT COUNT(*) AS n FROM core_auth_sessions`),
      count(db, `SELECT COUNT(*) AS n FROM core_auth_sessions WHERE is_revoked = 0 AND expires_at > datetime('now')`),
      count(db, `SELECT COUNT(*) AS n FROM core_auth_tokens`),
      count(db, `SELECT COUNT(*) AS n FROM core_auth_tokens WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))`),
      count(db, `SELECT COUNT(*) AS n FROM core_resource_grants`),
      count(db, `SELECT COUNT(*) AS n FROM core_resource_grants WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))`),
      count(db, `SELECT COUNT(*) AS n FROM core_resource_policies`),
      count(db, `SELECT COUNT(*) AS n FROM core_feature_flags`),
      count(db, `SELECT COUNT(*) AS n FROM core_feature_flags WHERE is_enabled = 1`),
      count(db, `SELECT COUNT(*) AS n FROM core_notifications`),
      count(db, `SELECT COUNT(*) AS n FROM core_notifications WHERE is_read = 0`),
      count(db, `SELECT COUNT(*) AS n FROM core_review_queue`),
      count(db, `SELECT COUNT(*) AS n FROM core_review_queue WHERE status = 'pending'`),
      count(db, `SELECT COUNT(*) AS n FROM core_people`),
      count(db, `SELECT COUNT(*) AS n FROM core_podcasts`),
      count(db, `SELECT COUNT(*) AS n FROM core_activity_events`),
      count(db, `SELECT COUNT(*) AS n FROM core_audit_log`),
    ]);

    const [flagRows, activityFeed, auditFeed] = await Promise.all([
      query<FeatureFlagRow>(
        db,
        `SELECT flag_key, title, is_enabled, rollout_percent, updated_at
           FROM core_feature_flags
          ORDER BY updated_at DESC
          LIMIT 12`,
      ),
      query<{ id: string; actor_user_ref: string; event_type: string; resource_ref: string | null; workspace_id: string | null; created_at: string }>(
        db,
        `SELECT id, actor_user_ref, event_type, resource_ref, workspace_id, created_at
           FROM core_activity_events
          ORDER BY created_at DESC
          LIMIT 15`,
      ),
      query<{ id: string; actor_user_ref: string; action: string; resource_ref: string | null; workspace_id: string | null; created_at: string }>(
        db,
        `SELECT id, actor_user_ref, action, resource_ref, workspace_id, created_at
           FROM core_audit_log
          ORDER BY created_at DESC
          LIMIT 15`,
      ),
    ]);

    const subsystems: SubsystemStat[] = [
      { key: 'identity',   label: 'Identity',        total: users,         active: usersActive,      status: statusFor(users, usersActive) },
      { key: 'workspaces', label: 'Workspaces',      total: workspaces,    active: workspacesActive, status: statusFor(workspaces, workspacesActive) },
      { key: 'sessions',   label: 'Live Sessions',   total: sessions,      active: sessionsLive,     status: sessionsLive > 0 ? 'active' : 'idle' },
      { key: 'tokens',     label: 'API Tokens',      total: tokens,        active: tokensLive,       status: statusFor(tokens, tokensLive) },
      { key: 'access',     label: 'Access Grants',   total: grants,        active: grantsLive,       status: statusFor(grants, grantsLive) },
      { key: 'policies',   label: 'Policies',        total: policies,      active: policies,         status: statusFor(policies, policies) },
      { key: 'flags',      label: 'Feature Flags',   total: flags,         active: flagsOn,          status: statusFor(flags, flagsOn) },
      { key: 'review',     label: 'Review Queue',    total: reviewQueue,   active: reviewPending,    status: reviewPending > 0 ? 'alert' : statusFor(reviewQueue, 0) },
      { key: 'signals',    label: 'Notifications',   total: notifications, active: notifUnread,      status: notifUnread > 0 ? 'alert' : 'nominal' },
      { key: 'people',     label: 'People',          total: people,        active: people,           status: statusFor(people, 0) },
      { key: 'podcasts',   label: 'Podcasts',        total: podcasts,      active: podcasts,         status: statusFor(podcasts, 0) },
      { key: 'telemetry',  label: 'Event Log',       total: activityCount + auditCount, active: activityCount, status: 'nominal' },
    ];

    // Composite health: penalise alert subsystems, reward active ones.
    const alerts = subsystems.filter((s) => s.status === 'alert').length;
    const idle = subsystems.filter((s) => s.status === 'idle').length;
    const healthIndex = Math.max(
      0,
      Math.min(100, Math.round(100 - alerts * 9 - idle * 3)),
    );

    const feed: FeedEvent[] = [
      ...activityFeed.map((e): FeedEvent => ({
        id: e.id,
        kind: 'activity',
        actor_user_ref: e.actor_user_ref,
        label: e.event_type,
        resource_ref: e.resource_ref,
        workspace_id: e.workspace_id,
        created_at: e.created_at,
      })),
      ...auditFeed.map((e): FeedEvent => ({
        id: e.id,
        kind: 'audit',
        actor_user_ref: e.actor_user_ref,
        label: e.action,
        resource_ref: e.resource_ref,
        workspace_id: e.workspace_id,
        created_at: e.created_at,
      })),
    ]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 20);

    return {
      generated_at: new Date().toISOString(),
      subsystems,
      health_index: healthIndex,
      totals: {
        users,
        users_active: usersActive,
        workspaces,
        workspaces_active: workspacesActive,
        sessions_live: sessionsLive,
        tokens_live: tokensLive,
        grants_live: grantsLive,
        policies,
        flags,
        flags_on: flagsOn,
        notifications_unread: notifUnread,
        review_pending: reviewPending,
        people,
        podcasts,
        events_total: activityCount + auditCount,
      },
      feature_flags: flagRows,
      feed,
    };
  }
}
