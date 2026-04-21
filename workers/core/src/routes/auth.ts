// ─── /core/auth routes — token issuance ───────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, unauthorized, badRequest } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';

// ── Minimal HS256 JWT sign (SubtleCrypto) ─────────────────────────────────────
function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body   = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key    = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}

// ── Password verification (PBKDF2 via SubtleCrypto) ──────────────────────────
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // stored format: "pbkdf2:sha256:<iterations>:<salt_hex>:<hash_hex>"
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, , iterStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterStr, 10);

  const salt    = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const keyMat  = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMat, 256,
  );
  const derivedHex = Array.from(new Uint8Array(derived)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return derivedHex === hashHex;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function authRoutes(router: Router<CoreEnv>) {

  // POST /core/auth/token — email + password → JWT
  router.post('/core/auth/token', async (req, env) => {
    const body = await req.json() as Record<string, unknown>;
    const email    = body.email    as string | undefined;
    const password = body.password as string | undefined;

    if (!email || !password) return badRequest('email and password required');

    const repo = new UserRepo(env.DB_CORE);
    const user = await repo.findWithCredentials(email);
    if (!user || user.status !== 'active') return unauthorized('Invalid credentials');
    if (!user.password_hash) return unauthorized('Password auth not configured for this account');

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return unauthorized('Invalid credentials');

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const now    = Math.floor(Date.now() / 1000);
    const token  = await signJwt(
      { sub: user.id, role: user.role, iat: now, exp: now + expiry },
      env.JWT_SECRET,
    );

    return ok({ token, expires_in: expiry, user_id: user.id, role: user.role });
  });

  // POST /core/auth/verify — check token validity and return user info
  router.post('/core/auth/verify', async (req, env) => {
    const { requireAuth } = await import('../../../shared/src/auth');
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(ctx);
  });
}
