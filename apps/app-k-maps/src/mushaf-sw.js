// ─── Mushaf service worker ────────────────────────────────────────────────
//
// Caches the QPC V2 per-page mushaf fonts permanently on-device. Each page
// has its own ~80 KB woff2 file (`/assets/fonts/QPC V2 Font.woff2/pN.woff2`)
// and the Quran text is immutable, so a once-fetched font never needs to be
// re-fetched. Cache-first strategy: subsequent visits to any page the user
// has opened before are instant — no network, no Cloudflare round-trip, no
// FOUT.
//
// Scope: only intercepts requests under `/assets/fonts/QPC%20V2%20Font.woff2/`
// and `/api/qr/mushaf/pages/` so we don't accidentally cache anything else.
// Everything else passes through to the network untouched.

const CACHE_NAME = 'mushaf-v1';

// URL patterns we intercept. Both are read-only, immutable resources.
const FONT_PATH_PREFIX = '/assets/fonts/QPC%20V2%20Font.woff2/';
const PAGE_API_PREFIX  = '/api/qr/mushaf/pages/';

self.addEventListener('install', (event) => {
  // Activate immediately — no waiting for the previous SW to release pages.
  // Safe here because we only handle additive caching (no version-breaking
  // changes to cached payloads possible: the Quran is fixed text).
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Take control of all open clients without requiring a reload.
    await self.clients.claim();
    // Clean up any older cache versions left over from previous deploys.
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => n.startsWith('mushaf-') && n !== CACHE_NAME)
           .map(n => caches.delete(n)),
    );
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isFontReq = url.pathname.startsWith(FONT_PATH_PREFIX)
                 || url.pathname.includes('/QPC%20V2%20Font.woff2/');
  const isPageReq = url.pathname.startsWith(PAGE_API_PREFIX);
  if (!isFontReq && !isPageReq) return;

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req);
    if (hit) {
      // Optional: revalidate in the background if we ever change the assets.
      // For QPC fonts the Quran is fixed; skip revalidation to save data.
      return hit;
    }
    const fresh = await fetch(req);
    // Only cache successful, opaque-friendly responses. 4xx/5xx pass
    // through untouched so transient errors aren't pinned to the device.
    if (fresh && fresh.ok) {
      // Clone before put: a Response body is a stream consumable once.
      cache.put(req, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch (err) {
    // Offline + no cache entry: surface a clean network error to the
    // caller. The mushaf reader's UI will show a skeleton until retry.
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Listen for explicit prefetch requests from the page. The reader's
// `prefetchNeighbours()` posts messages here to warm pages N±3 in the
// background without going through Angular's HTTP stack.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'prefetch-pages' || !Array.isArray(data.pages)) return;
  event.waitUntil(prefetchPages(data.pages));
});

async function prefetchPages(pages) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(pages.map(async (page) => {
    if (typeof page !== 'number' || page < 1 || page > 604) return;
    const url = `/assets/fonts/QPC%20V2%20Font.woff2/p${page}.woff2`;
    try {
      const hit = await cache.match(url);
      if (hit) return;  // already cached
      const fresh = await fetch(url, { credentials: 'omit' });
      if (fresh && fresh.ok) await cache.put(url, fresh.clone());
    } catch { /* silent — best-effort */ }
  }));
}
