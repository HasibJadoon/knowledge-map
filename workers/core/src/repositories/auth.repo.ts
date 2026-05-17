// ─── AuthRepo — core_auth_sessions + core_auth_tokens ─────────────────────────

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AuthSession {
  id: string;
  user_id: string;
  session_token: string;
  session_type: 'web' | 'mobile' | 'api' | 'service';
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: string;
  expires_at: string;
  is_revoked: number;
  created_at: string;
}

export interface AuthSessionCreate {
  userId: string;
  sessionToken: string;
  sessionType?: 'web' | 'mobile' | 'api' | 'service';
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
}

export interface AuthToken {
  id: string;
  user_id: string;
  token_hash: string;
  token_type: 'api_key' | 'invitation' | 'password_reset' | 'email_verify' | 'link_share' | 'password';
  name: string | null;
  scopes_json: string | null;
  workspace_id: string | null;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuthTokenCreate {
  userId: string;
  tokenHash: string;
  tokenType?: 'api_key' | 'invitation' | 'password_reset' | 'email_verify' | 'link_share';
  name?: string;
  scopesJson?: string;
  workspaceId?: string;
  expiresAt?: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const SESSION_COLS = `
  id, user_id, session_token, session_type, device_info, ip_address,
  user_agent, last_seen_at, expires_at, is_revoked, created_at
FROM core_auth_sessions`;

const TOKEN_COLS = `
  id, user_id, token_hash, token_type, name, scopes_json, workspace_id,
  expires_at, used_at, revoked_at, created_at
FROM core_auth_tokens`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class AuthRepo {
  constructor(private db: D1Database) {}

  // ── Sessions ──

  findSession(token: string): Promise<AuthSession | null> {
    return queryOne<AuthSession>(
      this.db,
      `SELECT ${SESSION_COLS}
       WHERE session_token = ? AND is_revoked = 0 AND expires_at > datetime('now')`,
      [token],
    );
  }

  async createSession(input: AuthSessionCreate): Promise<AuthSession> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_auth_sessions
         (id, user_id, session_token, session_type, device_info, ip_address,
          user_agent, last_seen_at, expires_at, is_revoked, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        input.userId,
        input.sessionToken,
        input.sessionType ?? 'web',
        input.deviceInfo ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        now,
        input.expiresAt,
        now,
      ],
    );
    return (await queryOne<AuthSession>(
      this.db,
      `SELECT ${SESSION_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  async revokeSession(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_auth_sessions SET is_revoked = 1 WHERE id = ?`,
      [id],
    );
  }

  /** Touch last_seen_at on an active session. */
  async touchSession(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_auth_sessions SET last_seen_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  /** All non-revoked sessions for a user. */
  userSessions(userId: string): Promise<AuthSession[]> {
    return query<AuthSession>(
      this.db,
      `SELECT ${SESSION_COLS}
       WHERE user_id = ? AND is_revoked = 0 ORDER BY last_seen_at DESC`,
      [userId],
    );
  }

  // ── Tokens ──

  findToken(hash: string): Promise<AuthToken | null> {
    return queryOne<AuthToken>(
      this.db,
      `SELECT ${TOKEN_COLS}
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [hash],
    );
  }

  async createToken(input: AuthTokenCreate): Promise<AuthToken> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_auth_tokens
         (id, user_id, token_hash, token_type, name, scopes_json, workspace_id,
          expires_at, used_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        id,
        input.userId,
        input.tokenHash,
        input.tokenType ?? 'api_key',
        input.name ?? null,
        input.scopesJson ?? null,
        input.workspaceId ?? null,
        input.expiresAt ?? null,
        now,
      ],
    );
    return (await queryOne<AuthToken>(
      this.db,
      `SELECT ${TOKEN_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  async revokeToken(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_auth_tokens SET revoked_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  /** Mark token as used (e.g. one-time invitation or reset token). */
  async markTokenUsed(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_auth_tokens SET used_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  /** List all active (non-revoked, non-expired) tokens for a user. */
  userTokens(userId: string): Promise<AuthToken[]> {
    return query<AuthToken>(
      this.db,
      `SELECT ${TOKEN_COLS}
       WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
      [userId],
    );
  }

  // ── Password credentials ──
  // A user's password is stored as a single token_type='password' row.

  async findPasswordHash(userId: string): Promise<string | null> {
    const row = await queryOne<{ token_hash: string }>(
      this.db,
      `SELECT token_hash FROM core_auth_tokens
       WHERE user_id = ? AND token_type = 'password' AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return row?.token_hash ?? null;
  }

  /** Replace any existing password credential for the user. */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_auth_tokens WHERE user_id = ? AND token_type = 'password'`,
      [userId],
    );
    await execute(
      this.db,
      `INSERT INTO core_auth_tokens
         (id, user_id, token_hash, token_type, name, scopes_json, workspace_id,
          expires_at, used_at, revoked_at, created_at)
       VALUES (?, ?, ?, 'password', 'password', NULL, NULL, NULL, NULL, NULL, ?)`,
      [typedId('CORE'), userId, passwordHash, new Date().toISOString()],
    );
  }
}
