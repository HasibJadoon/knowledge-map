// ─── km-backend-worker env ────────────────────────────────────────────────────
// The gateway owns NO databases. It only holds service-binding Fetchers and
// the JWT secret used to verify tokens issued by km-core-worker.

export interface BackendEnv {
  // Internal domain workers (service bindings)
  QURAN:          Fetcher;
  WORLDVIEW:      Fetcher;
  ARABIC:         Fetcher;
  AR_LINGUISTICS: Fetcher;
  CONTENT:        Fetcher;
  STUDIO:         Fetcher;
  CORE:           Fetcher;

  // Secrets
  JWT_SECRET:      string;   // shared with km-core-worker
  INTERNAL_SECRET: string;   // forwarded as X-KM-Internal-Secret to domain workers

  // Vars
  ALLOWED_ORIGINS: string;   // CSV — e.g. "https://k-maps.com,http://localhost:4200"
}
