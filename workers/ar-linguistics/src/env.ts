// ─── ArLinguisticsEnv ─────────────────────────────────────────────────────────
// Owns DB_AL (km_arabic_linguistic). Single prefix: ar_ling_*.
// LX:... typed refs resolve here (legacy compat — no separate DB_LX).
// May call CONTENT for source/evidence lookups.

export interface ArLinguisticsEnv {
  // Owned database
  DB_AL: D1Database;

  // Service bindings
  CONTENT?: Fetcher;  // cm_* — source metadata, evidence documents

  // Secrets
  JWT_SECRET?: string;
}
