// functions/_middleware.ts

import { verifyToken } from './_utils/jwt';

interface Env {
  JWT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  // ✅ Allow preflight requests
  if (request.method === 'OPTIONS') {
    return ctx.next();
  }

  // ✅ Public routes
  if (
    url.pathname === '/' ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/favicon')
  ) {
    return ctx.next();
  }

  // ✅ Require Authorization header
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = auth.slice(7);

  // ✅ VERIFY TOKEN (ASYNC!)
  const payload = await verifyToken(token, env.JWT_SECRET);

  if (!payload || Date.now() > Date.parse(payload.exp)) {
    return Response.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // ✅ Attach user to request context
  ctx.data.user = payload;

  return ctx.next();
};
