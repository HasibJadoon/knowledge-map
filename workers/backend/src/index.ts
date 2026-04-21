// ─── km-backend-worker ────────────────────────────────────────────────────────
// The ONLY public-facing Cloudflare Worker. Exposed at backend.k-maps.com.
//
// Responsibilities:
//   1. CORS — origin-specific headers with credentials support
//   2. Auth  — validates Bearer JWT; injects user context headers
//   3. Route — maps /api/{module}/... to the correct internal service binding
//   4. Proxy — forwards the request and streams the response back
//
// All other workers (quran, core, content, …) are internal-only.
// They must never be given a custom domain or a workers.dev URL.

import type { BackendEnv } from './env';
import { MODULE_MAP, type ModuleKey } from './modules';
import { preflight, withCors, corsHeaders } from './cors';
import { authenticate } from '../../shared/src/auth';
import { unauthorized, err, internalError } from '../../shared/src/response';
import { json } from '../../shared/src/http';

export default {
  async fetch(request: Request, env: BackendEnv): Promise<Response> {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const co     = env.ALLOWED_ORIGINS ?? '';

    // ── CORS preflight ─────────────────────────────────────────────────────────
    const pre = preflight(request, co);
    if (pre) return pre;

    // ── Root / health ──────────────────────────────────────────────────────────
    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        json({ ok: true, service: 'km-backend', version: '1' }),
        origin, co,
      );
    }

    // ── Only /api/* is routable ────────────────────────────────────────────────
    if (!url.pathname.startsWith('/api/')) {
      return withCors(err('not_found', 'Not found', 404), origin, co);
    }

    // ── Identify module: /api/qr/... → 'qr' ───────────────────────────────────
    // pathname.slice(5) strips the leading '/api/' → 'qr/menu'
    const remainder  = url.pathname.slice(5);          // 'qr/menu'
    const moduleKey  = remainder.split('/')[0] as ModuleKey;
    const mod        = MODULE_MAP[moduleKey];

    if (!mod) {
      return withCors(
        err('not_found', `Unknown module: ${moduleKey}`, 404),
        origin, co,
      );
    }

    // ── Auth ───────────────────────────────────────────────────────────────────
    const isPublic = mod.publicGet && request.method === 'GET';
    const authCtx  = await authenticate(request, env.JWT_SECRET ?? '');

    if (!isPublic && !authCtx) {
      return withCors(unauthorized('Valid Bearer token required'), origin, co);
    }

    // ── Build forwarded request ────────────────────────────────────────────────
    // Rewrite hostname so the internal worker sees /qr/menu, not /api/qr/menu.
    const fwdUrl      = new URL(request.url);
    fwdUrl.hostname   = 'internal.k-maps.local'; // ignored by service binding
    fwdUrl.pathname   = '/' + remainder;          // /qr/menu

    const fwdHeaders = new Headers(request.headers);
    // Stamp every internal request so domain workers can reject public traffic.
    fwdHeaders.set('X-KM-Internal',        '1');
    fwdHeaders.set('X-KM-Internal-Secret', env.INTERNAL_SECRET ?? '');

    // Propagate authenticated user context as structured headers.
    if (authCtx) {
      fwdHeaders.set('X-KM-User-Id', authCtx.userId);
      if (authCtx.workspaceId) fwdHeaders.set('X-KM-Workspace-Id', authCtx.workspaceId);
      if (authCtx.role)        fwdHeaders.set('X-KM-Role', authCtx.role);
    }

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const fwdRequest = new Request(fwdUrl.toString(), {
      method:  request.method,
      headers: fwdHeaders,
      body:    hasBody ? request.body : undefined,
      // Required for streaming request bodies through service bindings
      ...(hasBody ? { duplex: 'half' } as RequestInit : {}),
    });

    // ── Dispatch ───────────────────────────────────────────────────────────────
    try {
      const fetcher  = env[mod.binding] as Fetcher;
      const internal = await fetcher.fetch(fwdRequest);
      return withCors(internal, origin, co);
    } catch (e) {
      console.error(`[backend] ${mod.binding} error:`, e);
      return withCors(
        json(
          { ok: false, error: { code: 'service_error', message: 'Internal service unavailable' } },
          { status: 502 },
        ),
        origin, co,
      );
    }
  },
} satisfies ExportedHandler<BackendEnv>;
