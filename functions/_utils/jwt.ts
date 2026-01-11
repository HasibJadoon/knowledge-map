const enc = new TextEncoder();

export async function signToken(payload: any, secret: string) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return `${data}.${signature}`;
}

export async function verifyToken(token: string, secret: string) {
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    Uint8Array.from(atob(s), c => c.charCodeAt(0)),
    enc.encode(`${h}.${b}`)
  );

  if (!valid) return null;
  return JSON.parse(atob(b));
}
