// ─── OAuth ID-token verification (Google / Apple) ─────────────────────────────
// Verifies provider-issued OpenID Connect ID tokens (RS256) against the
// provider JWKS. No client secret is needed — server-side ID-token
// verification is the standard "Sign in with Google / Apple" flow.

export interface OAuthIdentity {
  provider: 'google' | 'apple';
  subject: string;          // provider 'sub' — a stable per-user id
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}

// ── JWKS fetch + per-isolate cache ──────────────────────────────────────────────

const JWKS_TTL_MS = 60 * 60 * 1000;
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

async function fetchJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  jwksCache.set(url, { keys, fetchedAt: Date.now() });
  return keys;
}

// ── Base64url decoding ──────────────────────────────────────────────────────────

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeSegment<T>(seg: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg))) as T;
}

// ── RS256 verification ──────────────────────────────────────────────────────────

async function verifyRs256(token: string, jwksUrl: string): Promise<IdTokenClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerSeg, payloadSeg, sigSeg] = parts;

  let header: { kid?: string; alg?: string };
  try {
    header = decodeSegment(headerSeg);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || !header.kid) return null;

  const jwk = (await fetchJwks(jwksUrl)).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(sigSeg),
    new TextEncoder().encode(`${headerSeg}.${payloadSeg}`),
  );
  if (!valid) return null;

  try {
    return decodeSegment<IdTokenClaims>(payloadSeg);
  } catch {
    return null;
  }
}

function audienceMatches(aud: string | string[] | undefined, allowed: string[]): boolean {
  if (!aud) return false;
  const list = Array.isArray(aud) ? aud : [aud];
  return list.some((a) => allowed.includes(a));
}

// ── Public verifiers ────────────────────────────────────────────────────────────

const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_JWKS = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

export async function verifyGoogleIdToken(
  idToken: string,
  clientIds: string[],
): Promise<OAuthIdentity | null> {
  const claims = await verifyRs256(idToken, GOOGLE_JWKS);
  if (!claims) return null;
  if (!claims.iss || !GOOGLE_ISSUERS.includes(claims.iss)) return null;
  if (!audienceMatches(claims.aud, clientIds)) return null;
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  if (!claims.sub) return null;
  return {
    provider: 'google',
    subject: claims.sub,
    email: claims.email ?? null,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name ?? null,
    picture: claims.picture ?? null,
  };
}

export async function verifyAppleIdToken(
  idToken: string,
  clientIds: string[],
): Promise<OAuthIdentity | null> {
  const claims = await verifyRs256(idToken, APPLE_JWKS);
  if (!claims) return null;
  if (claims.iss !== APPLE_ISSUER) return null;
  if (!audienceMatches(claims.aud, clientIds)) return null;
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  if (!claims.sub) return null;
  return {
    provider: 'apple',
    subject: claims.sub,
    email: claims.email ?? null,
    // Apple only marks email_verified on the relay/real address claim.
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name ?? null,
    picture: null,
  };
}
