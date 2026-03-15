type TokenPayload = {
  exp?: number;
  role?: string;
};

const base64ToJson = (value: string): TokenPayload | null => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
};

export const isTokenValid = (token: string | null): boolean => {
  if (!token) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const payload = base64ToJson(parts[1]);
  if (!payload?.exp) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};

export const getTokenRole = (token: string | null): string | null => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const payload = base64ToJson(parts[1]);
  return typeof payload?.role === 'string' && payload.role.trim() ? payload.role.trim().toLowerCase() : null;
};

export const isAdminToken = (token: string | null): boolean => getTokenRole(token) === 'admin';
