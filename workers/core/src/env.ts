// ─── CoreEnv ───────────────────────────────────────────────────────────────────
// Owns DB_CORE (km_core). Identity, workspaces, roles, grants, policies.
// No domain tables. All other workers call CORE for auth context.
// CORE calls no other domain Worker by default.

export interface CoreEnv {
  // Owned database
  DB_CORE: D1Database;

  // Secrets
  JWT_SECRET: string;          // required — CORE issues tokens
  JWT_EXPIRY_SECONDS?: string; // default 3600

  // OAuth — optional. When unset, the matching provider is reported as
  // disabled by /core/auth/providers and its login endpoint refuses.
  // Comma-separated to allow multiple audiences (e.g. Apple services-id
  // plus native bundle-id).
  GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_REDIRECT_URI?: string; // required for the Apple web sign-in popup
}
