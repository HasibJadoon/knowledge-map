// ─── CoreEnv ───────────────────────────────────────────────────────────────────
// Owns DB_CORE (km_core). Identity, workspaces, roles, grants, policies.
// No domain tables. All other workers call CORE for auth context.
// CORE calls no other domain Worker by default.

export interface CoreEnv {
  // Owned database
  DB_CORE: D1Database;

  // Secrets
  JWT_SECRET: string;         // required — CORE issues tokens
  JWT_EXPIRY_SECONDS?: string; // default 3600
}
