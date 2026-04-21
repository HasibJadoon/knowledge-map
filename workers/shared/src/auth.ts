// ─── JWT auth helpers (Cloudflare Workers SubtleCrypto) ───────────────────────
// All Workers validate tokens here. CORE is the authority; other Workers verify
// tokens but do not issue them.

import type { AuthContext } from './types';
import { unauthorized } from './response';

interface JwtPayload {
  sub: string;         // CORE:ULID — the user
  wid?: string;        // active workspace CORE:ULID
  role?: string;       // 'admin' | 'member' | 'guest'
  iat: number;
  exp: number;
}

// ── Low-level JWT verification ─────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function b64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const key = await importKey(secret);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = b64url(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Request helpers ────────────────────────────────────────────────────────────

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Authenticate a request and return an AuthContext, or null if no valid token.
 */
export async function authenticate(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const payload = await verifyJwt(token, jwtSecret);
  if (!payload) return null;

  return {
    userId: payload.sub,
    workspaceId: payload.wid,
    role: payload.role,
    isAdmin: payload.role === 'admin',
  };
}

/**
 * Require authentication. Returns AuthContext or a 401 Response.
 */
export async function requireAuth(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | Response> {
  const ctx = await authenticate(request, jwtSecret);
  if (!ctx) return unauthorized('Valid Bearer token required');
  return ctx;
}

/**
 * Require admin role. Returns AuthContext or a 401/403 Response.
 */
export async function requireAdmin(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | Response> {
  const ctx = await requireAuth(request, jwtSecret);
  if (ctx instanceof Response) return ctx;
  if (!ctx.isAdmin) {
    const { forbidden } = await import('./response');
    return forbidden('Admin role required');
  }
  return ctx;
}
