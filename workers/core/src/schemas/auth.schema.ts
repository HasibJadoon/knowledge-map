// ─── Auth schemas & types ──────────────────────────────────────────────────────

// core_auth_sessions
export interface AuthSession {
  id: string;                                           // CORE:ULID
  user_id: string;                                      // CORE:ULID → core_users
  session_token: string;
  session_type: 'web' | 'mobile' | 'api' | 'service';
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: string;
  expires_at: string;
  is_revoked: boolean;                                  // DB: INTEGER 0|1
  created_at: string;
}

export interface AuthSessionCreate {
  user_id: string;
  session_token: string;
  session_type?: 'web' | 'mobile' | 'api' | 'service';
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at?: string;
}

// core_auth_tokens
export interface AuthToken {
  id: string;                                           // CORE:ULID
  user_id: string;                                      // CORE:ULID → core_users
  token_hash: string;                                   // SHA-256 hash of raw token
  token_type: 'api_key' | 'invitation' | 'password_reset' | 'email_verify' | 'link_share';
  name: string | null;
  scopes_json: string | null;                           // JSON [string] — granted scopes
  workspace_id: string | null;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuthTokenCreate {
  user_id: string;
  token_hash: string;
  token_type?: 'api_key' | 'invitation' | 'password_reset' | 'email_verify' | 'link_share';
  name?: string;
  scopes_json?: string;
  workspace_id?: string;
  expires_at?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateAuthSessionCreate(
  body: unknown,
): { data: AuthSessionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.user_id !== 'string' || !b.user_id.trim())
    return { error: 'user_id is required' };
  if (typeof b.session_token !== 'string' || !b.session_token.trim())
    return { error: 'session_token is required' };

  const sessionTypes = ['web', 'mobile', 'api', 'service'] as const;
  const session_type = (b.session_type as string) ?? 'web';
  if (!sessionTypes.includes(session_type as never))
    return { error: `session_type must be one of: ${sessionTypes.join(', ')}` };

  const data: AuthSessionCreate = {
    user_id: b.user_id.trim(),
    session_token: b.session_token.trim(),
    session_type: session_type as AuthSessionCreate['session_type'],
  };

  if (typeof b.device_info === 'string') data.device_info = b.device_info;
  if (typeof b.ip_address === 'string') data.ip_address = b.ip_address;
  if (typeof b.user_agent === 'string') data.user_agent = b.user_agent;
  if (typeof b.expires_at === 'string') data.expires_at = b.expires_at;

  return { data };
}

export function validateAuthTokenCreate(
  body: unknown,
): { data: AuthTokenCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.user_id !== 'string' || !b.user_id.trim())
    return { error: 'user_id is required' };
  if (typeof b.token_hash !== 'string' || !b.token_hash.trim())
    return { error: 'token_hash is required' };

  const tokenTypes = ['api_key', 'invitation', 'password_reset', 'email_verify', 'link_share'] as const;
  const token_type = (b.token_type as string) ?? 'api_key';
  if (!tokenTypes.includes(token_type as never))
    return { error: `token_type must be one of: ${tokenTypes.join(', ')}` };

  const data: AuthTokenCreate = {
    user_id: b.user_id.trim(),
    token_hash: b.token_hash.trim(),
    token_type: token_type as AuthTokenCreate['token_type'],
  };

  if (typeof b.name === 'string') data.name = b.name;
  if (typeof b.scopes_json === 'string') data.scopes_json = b.scopes_json;
  if (typeof b.workspace_id === 'string') data.workspace_id = b.workspace_id;
  if (typeof b.expires_at === 'string') data.expires_at = b.expires_at;

  return { data };
}
