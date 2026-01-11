const SALT = 'quran-vocab-admin';

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${SALT}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const hashed = await hashPassword(password);
  return timingSafeEqual(hashed, storedHash);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}
