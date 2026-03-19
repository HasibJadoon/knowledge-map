const enc = new TextEncoder();
const dec = new TextDecoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const fromBase64 = (value: string): Uint8Array | null => {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
};

const fromBase64Flexible = (value: string): Uint8Array | null => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return fromBase64(`${normalized}${'='.repeat(padding)}`);
};

const encodeJson = (payload: unknown): string =>
  toBase64Url(enc.encode(JSON.stringify(payload)));

const decodeJson = (payload: string): Record<string, unknown> | null => {
  const bytes = fromBase64Flexible(payload);
  if (!bytes) {
    return null;
  }

  try {
    return JSON.parse(dec.decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export async function signToken(payload: Record<string, unknown>, secret: string) {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson(payload);
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const signature = toBase64Url(new Uint8Array(sig));

  return `${data}.${signature}`;
}

export async function verifyToken(token: string, secret: string) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) {
      return null;
    }

    const signatureBytes = fromBase64Flexible(signature);
    if (!signatureBytes) {
      return null;
    }

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
      signatureBytes,
      enc.encode(`${header}.${body}`)
    );

    if (!valid) {
      return null;
    }

    return decodeJson(body);
  } catch {
    return null;
  }
}
