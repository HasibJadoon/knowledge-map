// ─── Edge cache helper ──────────────────────────────────────────────────────
// Wraps a Worker route handler so its response is served from Cloudflare's
// Cache API for `maxAgeSec` seconds. Use this for read-mostly aggregate
// endpoints (source listings, catalog totals) that hammer D1 with full-scan
// queries every call. The data only changes on ingest; a few minutes of
// staleness is acceptable in exchange for ~7× faster TTFB.
//
// The cache key is the full request URL, so different query strings get
// independent cache entries.

export interface CachedOptions {
  /** Browser-side TTL in seconds. Default 60. */
  browser?: number;
  /** Cloudflare edge TTL in seconds. Default 600 (10 min). */
  edge?: number;
}

/**
 * Run `build()` only if the request URL isn't already in the Workers cache.
 * The built Response gets a `Cache-Control: public, max-age=…, s-maxage=…`
 * header and is stored for future requests.
 *
 * Honours a `?refresh=1` query param: bypasses the cache and re-runs the
 * build, replacing the stored entry. Useful after an ingestion run.
 */
export async function cached(
  req: Request,
  build: () => Promise<Response>,
  opts: CachedOptions = {},
): Promise<Response> {
  const browser = opts.browser ?? 60;
  const edge    = opts.edge ?? 600;

  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  // Strip `refresh` from the cache key so the cached entry remains
  // reachable after a forced rebuild.
  url.searchParams.delete('refresh');
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const cache = (caches as unknown as { default: Cache }).default;

  if (!refresh) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const response = await build();
  // Only cache 2xx responses. Errors should remain transient.
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set(
      'Cache-Control',
      `public, max-age=${browser}, s-maxage=${edge}`,
    );
    const cacheable = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    // Clone before putting — the cached copy needs its own readable stream.
    await cache.put(cacheKey, cacheable.clone());
    return cacheable;
  }
  return response;
}
