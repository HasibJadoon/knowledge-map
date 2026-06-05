// ─── /core/auth routes — token issuance ───────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, unauthorized, forbidden, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { verifyPassword, hashPassword } from '../password';
import { issueSessionToken } from '../jwt';

// ── Refresh-token helpers ─────────────────────────────────────────────────────
// The opaque refresh token is returned to the client once; only its SHA-256
// hash is stored in core_auth_sessions.session_token, so a DB leak can't be
// replayed. Default refresh lifetime: 30 days.
const REFRESH_TTL_DAYS = 30;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Create a refresh session for a user, returning the raw refresh token. */
async function startSession(
  env: CoreEnv,
  userId: string,
  sessionType: 'web' | 'mobile',
  deviceInfo: string | undefined,
): Promise<string> {
  const refresh = randomToken();
  const sessionToken = await sha256Hex(refresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000).toISOString();
  await new AuthRepo(env.DB_CORE).createSession({
    userId,
    sessionToken,
    sessionType,
    deviceInfo,
    expiresAt,
  });
  return refresh;
}

function deviceInfoOf(b: Record<string, unknown>): string | undefined {
  return typeof b['device_info'] === 'string' ? b['device_info'] : undefined;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function authRoutes(router: Router<CoreEnv>) {

  // POST /core/auth/login — email + password → JWT
  const login = async (req: Request, env: CoreEnv): Promise<Response> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
    const password = typeof b['password'] === 'string' ? b['password'] : '';
    if (!email || !password) return badRequest('email and password required');

    const userRepo = new UserRepo(env.DB_CORE);
    const user = await userRepo.findByEmail(email);
    if (!user || user.status !== 'active') return unauthorized('Invalid credentials');

    const hash = await new AuthRepo(env.DB_CORE).findPasswordHash(user.id);
    if (!hash || !(await verifyPassword(password, hash))) {
      return unauthorized('Invalid credentials');
    }

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const mustChange = await userRepo.getMustChangePassword(user.id);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry, {
      mustChangePassword: mustChange,
    });
    const refresh_token = await startSession(env, user.id, 'mobile', deviceInfoOf(b));
    return ok({ token, expires_in, refresh_token, user, must_change_password: mustChange });
  };

  router.post('/core/auth/login', login);
  router.post('/core/auth/token', login); // alias

  // POST /core/auth/register — self-service signup → member account + token.
  router.post('/core/auth/register', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
    const displayName = typeof b['display_name'] === 'string' ? b['display_name'].trim() : email.split('@')[0];
    const password = typeof b['password'] === 'string' ? b['password'] : '';
    if (!email || !email.includes('@')) return badRequest('A valid email is required');
    if (password.length < 8) return badRequest('password must be at least 8 characters');

    const userRepo = new UserRepo(env.DB_CORE);
    if (await userRepo.findByEmail(email)) {
      return badRequest('An account with that email already exists');
    }
    const user = await userRepo.create({ email, display_name: displayName, role: 'member' });
    await new AuthRepo(env.DB_CORE).setPassword(user.id, await hashPassword(password));

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    const refresh_token = await startSession(env, user.id, 'mobile', deviceInfoOf(b));
    return created({ token, expires_in, refresh_token, user });
  });

  // POST /core/auth/refresh — swap a valid refresh token for a fresh JWT.
  router.post('/core/auth/refresh', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const refresh = typeof b['refresh_token'] === 'string' ? b['refresh_token'] : '';
    if (!refresh) return badRequest('refresh_token is required');

    const authRepo = new AuthRepo(env.DB_CORE);
    const session = await authRepo.findSession(await sha256Hex(refresh));
    if (!session) return unauthorized('Refresh token is invalid or expired');

    const user = await new UserRepo(env.DB_CORE).findById(session.user_id);
    if (!user || user.status !== 'active') return unauthorized('Account unavailable');

    await authRepo.touchSession(session.id);
    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return ok({ token, expires_in });
  });

  // POST /core/auth/logout — revoke the refresh session.
  router.post('/core/auth/logout', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const refresh = typeof b['refresh_token'] === 'string' ? b['refresh_token'] : '';
    if (refresh) {
      const authRepo = new AuthRepo(env.DB_CORE);
      const session = await authRepo.findSession(await sha256Hex(refresh));
      if (session) await authRepo.revokeSession(session.id);
    }
    return ok({ revoked: true });
  });

  // GET /core/auth/me — the signed-in user (for the account + scope picker).
  router.get('/core/auth/me', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const user = await new UserRepo(env.DB_CORE).findById(ctx.userId);
    if (!user) return unauthorized('Account not found');
    return ok({ user });
  });

  // POST /core/auth/verify — check token validity and return the auth context
  router.post('/core/auth/verify', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(ctx);
  });

  // POST /core/auth/change-password — the signed-in user sets a new password.
  // Verifies the current password, clears any forced-change flag, and issues
  // a fresh token so the `mcp` claim is dropped immediately.
  router.post('/core/auth/change-password', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const current = typeof b['current_password'] === 'string' ? b['current_password'] : '';
    const next = typeof b['new_password'] === 'string' ? b['new_password'] : '';
    if (!current) return badRequest('current_password is required');
    if (next.length < 8) return badRequest('new_password must be at least 8 characters');
    if (next === current) return badRequest('New password must differ from the current one');

    const userRepo = new UserRepo(env.DB_CORE);
    const authRepo = new AuthRepo(env.DB_CORE);
    const user = await userRepo.findById(ctx.userId);
    if (!user) return unauthorized('Account not found');

    const hash = await authRepo.findPasswordHash(user.id);
    if (!hash || !(await verifyPassword(current, hash))) {
      return unauthorized('Current password is incorrect');
    }

    await authRepo.setPassword(user.id, await hashPassword(next));
    await userRepo.setMustChangePassword(user.id, false);

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return ok({ token, expires_in });
  });

  // ── First-run setup ───────────────────────────────────────────────────────
  // GET /core/auth/bootstrap — is the one-time admin setup still available?
  router.get('/core/auth/bootstrap', async (_req, env) => {
    const adminExists = await new UserRepo(env.DB_CORE).adminExists();
    return ok({ needs_setup: !adminExists });
  });

  // POST /core/auth/bootstrap — create the very first administrator.
  // Public so a fresh install can be set up, but self-disabling: it refuses
  // as soon as any admin account exists, so it never needs manual teardown.
  router.post('/core/auth/bootstrap', async (req, env) => {
    const userRepo = new UserRepo(env.DB_CORE);
    if (await userRepo.adminExists()) {
      return forbidden('Setup is already complete — an administrator exists.');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
    const displayName = typeof b['display_name'] === 'string' ? b['display_name'].trim() : '';
    const password = typeof b['password'] === 'string' ? b['password'] : '';
    if (!email || !email.includes('@')) return badRequest('A valid email is required');
    if (!displayName) return badRequest('display_name is required');
    if (password.length < 8) return badRequest('password must be at least 8 characters');
    if (await userRepo.findByEmail(email)) {
      return badRequest('An account with that email already exists');
    }

    const user = await userRepo.create({ email, display_name: displayName, role: 'admin' });
    await new AuthRepo(env.DB_CORE).setPassword(user.id, await hashPassword(password));
    // Suspend the legacy admin@k-maps.local placeholder, if present, so the
    // known default credentials can no longer be used.
    await userRepo.retireLegacyAdmin();

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return created({ token, expires_in, user });
  });
}
