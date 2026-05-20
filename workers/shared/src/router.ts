// ─── Lightweight Workers Router ────────────────────────────────────────────────
// URLPattern-based router that handles CORS preflight and wraps all handlers
// in a top-level error boundary.  No framework dependency.

import { internalError, err } from './response';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RouteHandler<Env> = (
  request: Request,
  env: Env,
  params: Record<string, string>,
) => Promise<Response> | Response;

interface Route<Env> {
  method: Method;
  pattern: URLPattern;
  handler: RouteHandler<Env>;
}

// Applied to every response so the Angular frontend can reach any worker.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Best-effort URL-decode for a single path segment captured by URLPattern. */
function decodePathParam(value: string): string {
  if (!value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed escape — leave as-is so handlers can decide how to respond.
    return value;
  }
}

export class Router<Env = unknown> {
  private routes: Route<Env>[] = [];

  get(path: string, handler: RouteHandler<Env>): this {
    return this.add('GET', path, handler);
  }
  post(path: string, handler: RouteHandler<Env>): this {
    return this.add('POST', path, handler);
  }
  put(path: string, handler: RouteHandler<Env>): this {
    return this.add('PUT', path, handler);
  }
  patch(path: string, handler: RouteHandler<Env>): this {
    return this.add('PATCH', path, handler);
  }
  delete(path: string, handler: RouteHandler<Env>): this {
    return this.add('DELETE', path, handler);
  }

  private add(method: Method, path: string, handler: RouteHandler<Env>): this {
    this.routes.push({ method, pattern: new URLPattern({ pathname: path }), handler });
    return this;
  }

  async handle(request: Request, env: Env): Promise<Response> {
    // CORS preflight — no auth needed
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    for (const route of this.routes) {
      if (route.method !== (request.method as Method)) continue;
      const match = route.pattern.exec({ pathname: url.pathname });
      if (!match) continue;

      // Extract named path params (e.g. :id → params.id). URLPattern keeps the
      // captured value in its URL-encoded form (e.g. ":" arrives as "%3A"),
      // which would never match the literal value stored in D1. Decode here so
      // every route handler sees the original value.
      const params = Object.fromEntries(
        Object.entries(match.pathname.groups).map(([k, v]) => [k, decodePathParam(v ?? '')]),
      );

      try {
        const response = await route.handler(request, env, params);
        return withCors(response);
      } catch (e) {
        console.error('[Router] Unhandled error:', e);
        return withCors(internalError());
      }
    }

    return withCors(err('not_found', 'Route not found', 404));
  }
}
