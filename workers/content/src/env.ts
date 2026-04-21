// ─── ContentEnv ───────────────────────────────────────────────────────────────
// Owns DB_CM (km_content). ALL authored artifacts: documents, notes, highlights,
// captures, sources, media, publications.
// RULE: CM does NOT grow its own ACL — it uses CORE policy tables via CORE Fetcher.

export interface ContentEnv {
  // Owned database
  DB_CM: D1Database;

  // Service bindings
  CORE?: Fetcher;  // CORE — user auth, workspace context, resource grants

  // Secrets
  JWT_SECRET?: string;
}
