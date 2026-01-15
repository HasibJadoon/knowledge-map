// functions/_middleware.ts

import { verifyToken } from './_utils/jwt';

interface Env {
  JWT_SECRET: string;
}

const allowedOrigins = new Set([
  'https://k-maps.com',
  'https://api.k-maps.com',
  'https://app.k-maps.com',
  'http://localhost:8100',
  'http://localhost:5173',
]);

const corsHeaders = (origin: string | null) => {
  const headers = new Headers();
  if (origin && allowedOrigins.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
  }
  headers.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('access-control-allow-headers', 'authorization,content-type');
  headers.set('access-control-max-age', '86400');
  return headers;
};

const withCors = (response: Response, origin: string | null) => {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin);
  cors.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const origin = request.headers.get('origin');

  // ✅ Allow preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // ✅ Public routes
  if (
    url.pathname === '/' ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/docs') ||
    url.pathname.startsWith('/openapi') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/favicon')
  ) {
    return withCors(await ctx.next(), origin);
  }

  // ✅ Require Authorization header
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return withCors(
      Response.json({ error: 'Unauthorized' }, { status: 401 }),
      origin
    );
  }

  const token = auth.slice(7);

  // ✅ VERIFY TOKEN (ASYNC!)
  const payload = await verifyToken(token, env.JWT_SECRET);

  if (!payload || Date.now() > Date.parse(payload.exp)) {
    return withCors(
      Response.json({ error: 'Invalid or expired token' }, { status: 401 }),
      origin
    );
  }

  // ✅ Attach user to request context
  ctx.data.user = payload;

  return withCors(await ctx.next(), origin);
};
