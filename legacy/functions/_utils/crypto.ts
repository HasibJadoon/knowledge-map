const HASH = "SHA-256";
const KEYLEN_BITS = 256;

// -------------------- helpers --------------------

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function u8ToB64(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// -------------------- hashing --------------------

/**
 * Produces:
 * PBKDF2$<iterations>$<saltB64>$<hashB64>
 */
export async function hashPassword(
  password: string,
  iterations = 100_000
): Promise<string> {
  const enc = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: HASH,
      salt: salt as BufferSource, // ✅ TS fix
      iterations,
    },
    key,
    KEYLEN_BITS
  );

  const derived = new Uint8Array(bits);

  return `PBKDF2$${iterations}$${u8ToB64(salt)}$${u8ToB64(derived)}`;
}

// -------------------- verification --------------------

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4) return false;

    const [algo, iterStr, saltB64, hashB64] = parts;
    if (algo !== "PBKDF2") return false;

    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;

    const salt = b64ToU8(saltB64);
    const expected = b64ToU8(hashB64);

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: HASH,
        salt: salt as BufferSource, // ✅ TS fix
        iterations,
      },
      key,
      KEYLEN_BITS
    );

    const actual = new Uint8Array(bits);
    return timingSafeEqualBytes(actual, expected);
  } catch {
    return false;
  }
}
