// ─── PlannerEnv ───────────────────────────────────────────────────────────────
// Owns DB_PL (km_planner). Operational execution only: plans, tasks, lanes,
// review cycles, packets. NEVER stores canonical scholarly truth.
// Cross-domain display material comes via typed refs + service bindings.

export interface PlannerEnv {
  // Owned database
  DB_PL: D1Database;

  // Service bindings
  QURAN?: Fetcher;   // QR — passage/ayah display material
  ARABIC?: Fetcher;  // AR — lesson/unit display material
  CORE?: Fetcher;    // CORE — user/workspace context

  // Secrets
  JWT_SECRET?: string;
}
