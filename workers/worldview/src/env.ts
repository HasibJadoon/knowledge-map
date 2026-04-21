// ─── WorldviewEnv ──────────────────────────────────────────────────────────────
// Owns DB_WV (km_worldview). Civilizational reasoning engine: traditions,
// thinkers, moral ontology, claims, events, institutions.
// RULE: WV does NOT absorb Quranic claims as canonical truth — that is QR's domain.

export interface WorldviewEnv {
  // Owned database
  DB_WV: D1Database;

  // Service bindings
  CONTENT?: Fetcher;  // CM — authored sources, documents
  QURAN?: Fetcher;    // QR — quran node lookups, scope refs
  CORE?: Fetcher;     // CORE — user/workspace context

  // Secrets
  JWT_SECRET?: string;
}
