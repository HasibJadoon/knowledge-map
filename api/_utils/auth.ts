import { verifyToken } from './jwt';

interface Env {
  JWT_SECRET: string;
}

export type AuthedUser = {
  id: number;
  role: string;
};

export async function requireAuth(
  ctx: { request: Request; env: Env }
): Promise<AuthedUser | null> {
  const auth = ctx.request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.slice(7).trim();
  if (!token) {
    return null;
  }

  // ✅ Verify JWT signature
  const payload = await verifyToken(token, ctx.env.JWT_SECRET);
  if (!payload) {
    return null;
  }

  // ✅ Validate exp (MUST be number, seconds)
  if (typeof payload.exp !== 'number') {
    return null;
  }
  if (Date.now() >= payload.exp * 1000) {
    return null;
  }

  // ✅ Validate subject
  if (typeof payload.sub !== 'number') {
    return null;
  }

  return {
    id: payload.sub,
    role: payload.role ?? 'user',
  };
}
