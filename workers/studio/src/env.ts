// ─── StudioEnv ────────────────────────────────────────────────────────────────
// Owns DB_ST (km_studio). Episode Studio: build podcast / tutorial /
// talking-head / conversation episodes from reusable templates, then run live
// synced sessions. Phase 1 covers episode authoring only.
// RULE: ST stores typed refs to other domains — it never duplicates canonical
// scholarly content.

export interface StudioEnv {
  // Owned database
  DB_ST: D1Database;

  // Durable Object — one instance per live episode session
  EPISODE_SESSION: DurableObjectNamespace;
}
