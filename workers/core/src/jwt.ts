// ─── HS256 JWT signing (SubtleCrypto) ─────────────────────────────────────────
// CORE is the token authority. Both the password login and the OAuth login
// issue tokens through signJwt so every token has an identical shape.

function base64url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

/** Issue a session token for an authenticated user. */
export async function issueSessionToken(
  user: { id: string; role: string },
  secret: string,
  expirySeconds: number,
): Promise<{ token: string; expires_in: number }> {
  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt(
    { sub: user.id, role: user.role, iat: now, exp: now + expirySeconds },
    secret,
  );
  return { token, expires_in: expirySeconds };
}
