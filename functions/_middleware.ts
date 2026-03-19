// api/_middleware.ts

import { verifyToken } from './_utils/jwt';

interface Env {
  JWT_SECRET: string;
}

const staticAssetPattern = /\.(?:css|js|mjs|map|ico|png|jpg|jpeg|svg|webp|woff2?|ttf|eot|webmanifest)$/i;

const allowedOrigins = new Set([
  'https://k-maps.com',
  'https://api.k-maps.com',
  'https://app.k-maps.com',
  'https://app-k-maps.pages.dev',
  'http://localhost:8100',
  'http://localhost:5173',
  'http://localhost:4200',
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

  const contentType = headers.get('content-type') ?? '';
  // Keep shell HTML fresh to avoid stale chunk references after deploy.
  if (contentType.includes('text/html')) {
    headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const maybeConvertMissingAssetFallback = (
  pathname: string,
  response: Response
) => {
  // If an asset request is rewritten to HTML (SPA fallback), return 404.
  // This avoids module-script MIME failures from HTML responses.
  if (!staticAssetPattern.test(pathname)) {
    return response;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 200 && contentType.includes('text/html')) {
    return new Response('Asset not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return response;
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
  const isStaticAsset = request.method === 'GET' && staticAssetPattern.test(url.pathname);

  if (
    url.pathname === '/' ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/api-docs') ||
    url.pathname.startsWith('/openapi') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/api/quran') ||
    url.pathname.startsWith('/api/ar/quran') ||
    isStaticAsset
  ) {
    const response = await ctx.next();
    const hardened = maybeConvertMissingAssetFallback(url.pathname, response);
    return withCors(hardened, origin);
  }

  // ✅ Require Authorization header
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return withCors(
      Response.json({ error: 'Unauthorized' }, { status: 401 }),
      origin
    );
  }

  const token = auth.slice(7).trim();
  const payload = await verifyToken(token, env.JWT_SECRET);
  const rawExp = payload && typeof payload === 'object' ? (payload as Record<string, unknown>)['exp'] : null;
  const exp =
    typeof rawExp === 'number'
      ? rawExp
      : (typeof rawExp === 'string' && rawExp.trim() ? Number(rawExp) : NaN);

  if (!payload || !Number.isFinite(exp) || Date.now() >= exp * 1000) {
    return withCors(
      Response.json({ error: 'Invalid or expired token' }, { status: 401 }),
      origin
    );
  }

  // ✅ Attach user to request context
  ctx.data.user = payload;

  const response = await ctx.next();
  const hardened = maybeConvertMissingAssetFallback(url.pathname, response);
  return withCors(hardened, origin);
};
