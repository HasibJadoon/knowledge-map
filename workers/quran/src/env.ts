// ─── QuranEnv ─────────────────────────────────────────────────────────────────
// Declares ONLY the bindings this Worker is allowed to hold.
// Rule: one D1 binding (DB_QR). Cross-domain access via Fetcher service bindings.

export interface QuranEnv {
  // Owned database
  DB_QR: D1Database;

  // Service bindings (optional — only used when a route needs cross-domain data)
  AR_LINGUISTICS?: Fetcher; // roots, lemmas, morphology, nahw, balagha
  WORLDVIEW?: Fetcher;      // worldview node lookups
  CONTENT?: Fetcher;        // source / document metadata

  // R2 buckets
  DEP_GRAPHS_BUCKET: R2Bucket;

  // Secrets
  JWT_SECRET?: string;
}
