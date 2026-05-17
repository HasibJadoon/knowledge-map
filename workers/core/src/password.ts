// ─── Password hashing (PBKDF2 via SubtleCrypto) ───────────────────────────────
// Stored format: "pbkdf2:sha256:<iterations>:<saltHex>:<hashHex>"

const ITERATIONS = 100_000;
const KEY_BITS = 256;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    KEY_BITS,
  );
  return toHex(bits);
}

/** Hash a plaintext password for storage. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2:sha256:${ITERATIONS}:${toHex(salt)}:${hash}`;
}

/** Verify a plaintext password against a stored pbkdf2 string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const derived = await derive(password, fromHex(parts[3]), iterations);
  return derived === parts[4];
}
