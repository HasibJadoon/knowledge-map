// ─── CORS helpers ─────────────────────────────────────────────────────────────
// The gateway is the only Worker that sets CORS headers visible to browsers.
// Internal workers use Access-Control-Allow-Origin: * which the gateway strips
// and replaces with an origin-specific value + credentials support.

function parseOrigins(csv: string): string[] {
  return csv.split(',').map((o) => o.trim()).filter(Boolean);
}

function isAllowed(origin: string, allowed: string[]): boolean {
  return allowed.includes('*') || allowed.includes(origin);
}

export function corsHeaders(origin: string, allowedOriginsCsv: string): Record<string, string> {
  const allowed = parseOrigins(allowedOriginsCsv);
  return {
    'Access-Control-Allow-Origin':      isAllowed(origin, allowed) ? origin : '',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods':     'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Max-Age':           '86400',
    'Vary':                             'Origin',
  };
}

export function preflight(request: Request, allowedOriginsCsv: string): Response | null {
  if (request.method !== 'OPTIONS') return null;
  const origin = request.headers.get('Origin') ?? '';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, allowedOriginsCsv),
  });
}

/** Clone a response and replace CORS headers with gateway-controlled values. */
export function withCors(
  response: Response,
  origin: string,
  allowedOriginsCsv: string,
): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin, allowedOriginsCsv);
  for (const [k, v] of Object.entries(cors)) {
    if (v) headers.set(k, v);
    else headers.delete(k);
  }
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}
