// ─── Audit, Feature Flags & Platform Config schemas & types ───────────────────

// core_audit_log
import type { PaginateOptions } from '../../../shared/src/types';

export interface AuditLogEntry {
  id: string;                                           // CORE:ULID
  workspace_id: string | null;
  actor_user_ref: string;                               // 'CORE:<user_id>'
  action: string;
    // 'policy_changed'|'grant_issued'|'grant_revoked'|'member_removed'|
    // 'visibility_changed'|'publication_state_changed'|'auth_token_issued'|
    // 'auth_token_revoked'|'user_suspended'|'workspace_archived'|'other'
  resource_ref: string | null;
  before_json: string | null;                           // snapshot before change
  after_json: string | null;                            // snapshot after change
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInput {
  workspace_id?: string;
  actor_user_ref: string;
  action: string;
  resource_ref?: string;
  before_json?: string;
  after_json?: string;
  ip_address?: string;
  user_agent?: string;
}

// core_feature_flags
export interface FeatureFlag {
  id: string;                                           // CORE:ULID
  flag_key: string;                                     // UNIQUE
  title: string;
  is_enabled: boolean;                                  // DB: INTEGER 0|1
  rollout_percent: number;                              // 0–100
  enabled_for: string | null;                           // JSON [user_ref or workspace_ref]
  description: string | null;
  updated_by_ref: string | null;
  updated_at: string;
}

export interface FeatureFlagPatch {
  is_enabled?: boolean;
  rollout_percent?: number;
  enabled_for?: string | null;
  description?: string | null;
  updated_by_ref?: string;
}

// core_platform_config
export interface PlatformConfig {
  id: string;                                           // CORE:ULID
  config_key: string;                                   // UNIQUE
  config_value: string;
  value_type: 'string' | 'integer' | 'boolean' | 'json';
  description: string | null;
  updated_by_ref: string | null;
  updated_at: string;
}

export interface PlatformConfigPatch {
  config_value: string;
  value_type?: 'string' | 'integer' | 'boolean' | 'json';
  description?: string | null;
  updated_by_ref?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateAuditLogInput(
  body: unknown,
): { data: AuditLogInput } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.actor_user_ref !== 'string' || !b.actor_user_ref.trim())
    return { error: 'actor_user_ref is required' };
  if (typeof b.action !== 'string' || !b.action.trim())
    return { error: 'action is required' };

  const data: AuditLogInput = {
    actor_user_ref: b.actor_user_ref.trim(),
    action: b.action.trim(),
  };

  if (typeof b.workspace_id === 'string') data.workspace_id = b.workspace_id;
  if (typeof b.resource_ref === 'string') data.resource_ref = b.resource_ref;
  if (typeof b.before_json === 'string') data.before_json = b.before_json;
  if (typeof b.after_json === 'string') data.after_json = b.after_json;
  if (typeof b.ip_address === 'string') data.ip_address = b.ip_address;
  if (typeof b.user_agent === 'string') data.user_agent = b.user_agent;

  return { data };
}

export function validateFeatureFlagPatch(
  body: unknown,
): { data: FeatureFlagPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const data: FeatureFlagPatch = {};

  if (b.is_enabled !== undefined)
    data.is_enabled = Boolean(b.is_enabled);

  if (b.rollout_percent !== undefined) {
    if (typeof b.rollout_percent !== 'number' || b.rollout_percent < 0 || b.rollout_percent > 100)
      return { error: 'rollout_percent must be a number between 0 and 100' };
    data.rollout_percent = b.rollout_percent;
  }

  if (b.enabled_for !== undefined)
    data.enabled_for = typeof b.enabled_for === 'string' ? b.enabled_for : null;
  if (b.description !== undefined)
    data.description = typeof b.description === 'string' ? b.description : null;
  if (typeof b.updated_by_ref === 'string')
    data.updated_by_ref = b.updated_by_ref;

  return { data };
}

export function validatePlatformConfigPatch(
  body: unknown,
): { data: PlatformConfigPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.config_value !== 'string')
    return { error: 'config_value is required and must be a string' };

  const valueTypes = ['string', 'integer', 'boolean', 'json'] as const;
  if (b.value_type !== undefined && !valueTypes.includes(b.value_type as never))
    return { error: `value_type must be one of: ${valueTypes.join(', ')}` };

  const data: PlatformConfigPatch = {
    config_value: b.config_value,
  };

  if (b.value_type !== undefined)
    data.value_type = b.value_type as PlatformConfigPatch['value_type'];
  if (b.description !== undefined)
    data.description = typeof b.description === 'string' ? b.description : null;
  if (typeof b.updated_by_ref === 'string')
    data.updated_by_ref = b.updated_by_ref;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

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

export interface AuditListOptions extends PaginateOptions {
  action?: AuditAction;
  actorUserRef?: string;
  resourceRef?: string;
}
