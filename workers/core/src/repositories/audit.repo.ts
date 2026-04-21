// ─── AuditRepo — core_audit_log + core_feature_flags + core_platform_config ───

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'policy_changed'
  | 'grant_issued'
  | 'grant_revoked'
  | 'member_removed'
  | 'visibility_changed'
  | 'publication_state_changed'
  | 'auth_token_issued'
  | 'auth_token_revoked'
  | 'user_suspended'
  | 'workspace_archived'
  | 'other';

export interface AuditLogEntry {
  id: string;
  workspace_id: string | null;
  actor_user_ref: string;
  action: AuditAction;
  resource_ref: string | null;
  before_json: string | null;
  after_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInput {
  workspaceId?: string;
  actorUserRef: string;
  action: AuditAction;
  resourceRef?: string;
  beforeJson?: string;
  afterJson?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditListOptions extends PaginateOptions {
  action?: AuditAction;
  actorUserRef?: string;
  resourceRef?: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  title: string;
  is_enabled: number;
  rollout_percent: number;
  enabled_for: string | null;
  description: string | null;
  updated_by_ref: string | null;
  updated_at: string;
}

export interface PlatformConfig {
  id: string;
  config_key: string;
  config_value: string;
  value_type: 'string' | 'integer' | 'boolean' | 'json';
  description: string | null;
  updated_by_ref: string | null;
  updated_at: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const AUDIT_COLS = `
  id, workspace_id, actor_user_ref, action, resource_ref,
  before_json, after_json, ip_address, user_agent, created_at
FROM core_audit_log`;

const FLAG_COLS = `
  id, flag_key, title, is_enabled, rollout_percent, enabled_for,
  description, updated_by_ref, updated_at
FROM core_feature_flags`;

const CONFIG_COLS = `
  id, config_key, config_value, value_type, description,
  updated_by_ref, updated_at
FROM core_platform_config`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class AuditRepo {
  constructor(private db: D1Database) {}

  // ── Audit Log ──

  async logAudit(input: AuditLogInput): Promise<AuditLogEntry> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_audit_log
         (id, workspace_id, actor_user_ref, action, resource_ref,
          before_json, after_json, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId ?? null,
        input.actorUserRef,
        input.action,
        input.resourceRef ?? null,
        input.beforeJson ?? null,
        input.afterJson ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        now,
      ],
    );
    return (await queryOne<AuditLogEntry>(
      this.db,
      `SELECT ${AUDIT_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  listAudit(workspaceId: string, opts: AuditListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.action) {
      conditions.push('action = ?');
      args.push(opts.action);
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
    return paginate<AuditLogEntry>(
      this.db,
      `SELECT ${AUDIT_COLS} WHERE ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_audit_log WHERE ${where}`,
      args,
      opts,
    );
  }

  // ── Feature Flags ──

  getFlag(key: string): Promise<FeatureFlag | null> {
    return queryOne<FeatureFlag>(
      this.db,
      `SELECT ${FLAG_COLS} WHERE flag_key = ?`,
      [key],
    );
  }

  listFlags(): Promise<FeatureFlag[]> {
    return query<FeatureFlag>(
      this.db,
      `SELECT ${FLAG_COLS} ORDER BY flag_key`,
      [],
    );
  }

  async setFlag(
    key: string,
    enabled: boolean,
    rolloutPercent?: number,
    updatedByRef?: string,
  ): Promise<FeatureFlag | null> {
    const now = new Date().toISOString();
    const existing = await this.getFlag(key);

    if (!existing) {
      const id = typedId('CORE');
      await execute(
        this.db,
        `INSERT INTO core_feature_flags
           (id, flag_key, title, is_enabled, rollout_percent, enabled_for,
            description, updated_by_ref, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [id, key, key, enabled ? 1 : 0, rolloutPercent ?? 0, updatedByRef ?? null, now],
      );
    } else {
      const sets: string[] = ['is_enabled = ?', 'updated_at = ?'];
      const vals: unknown[] = [enabled ? 1 : 0, now];

      if (rolloutPercent !== undefined) { sets.push('rollout_percent = ?'); vals.push(rolloutPercent); }
      if (updatedByRef !== undefined)   { sets.push('updated_by_ref = ?'); vals.push(updatedByRef); }

      vals.push(key);
      await execute(
        this.db,
        `UPDATE core_feature_flags SET ${sets.join(', ')} WHERE flag_key = ?`,
        vals,
      );
    }
    return this.getFlag(key);
  }

  /** Update the enabled_for JSON list for a flag. */
  async setFlagEnabledFor(key: string, enabledFor: string[], updatedByRef?: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_feature_flags
       SET enabled_for = ?, updated_by_ref = ?, updated_at = datetime('now')
       WHERE flag_key = ?`,
      [JSON.stringify(enabledFor), updatedByRef ?? null, key],
    );
  }

  // ── Platform Config ──

  getConfig(key: string): Promise<PlatformConfig | null> {
    return queryOne<PlatformConfig>(
      this.db,
      `SELECT ${CONFIG_COLS} WHERE config_key = ?`,
      [key],
    );
  }

  listConfigs(): Promise<PlatformConfig[]> {
    return query<PlatformConfig>(
      this.db,
      `SELECT ${CONFIG_COLS} ORDER BY config_key`,
      [],
    );
  }

  async setConfig(
    key: string,
    value: string,
    valueType?: PlatformConfig['value_type'],
    updatedByRef?: string,
  ): Promise<PlatformConfig | null> {
    const now = new Date().toISOString();
    const existing = await this.getConfig(key);

    if (!existing) {
      const id = typedId('CORE');
      await execute(
        this.db,
        `INSERT INTO core_platform_config
           (id, config_key, config_value, value_type, description, updated_by_ref, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        [id, key, value, valueType ?? 'string', updatedByRef ?? null, now],
      );
    } else {
      const sets: string[] = ['config_value = ?', 'updated_at = ?'];
      const vals: unknown[] = [value, now];

      if (valueType !== undefined)   { sets.push('value_type = ?');    vals.push(valueType); }
      if (updatedByRef !== undefined){ sets.push('updated_by_ref = ?'); vals.push(updatedByRef); }

      vals.push(key);
      await execute(
        this.db,
        `UPDATE core_platform_config SET ${sets.join(', ')} WHERE config_key = ?`,
        vals,
      );
    }
    return this.getConfig(key);
  }
}
