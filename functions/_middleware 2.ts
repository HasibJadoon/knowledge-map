// _middleware.ts — CORS only, all routes are public

interface Env {}

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
  const { request } = ctx;
  const url = new URL(request.url);
  const origin = request.headers.get('origin');

  // Allow preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // All routes are public — pass through with CORS
  const response = await ctx.next();
  const hardened = maybeConvertMissingAssetFallback(url.pathname, response);
  return withCors(hardened, origin);
};
