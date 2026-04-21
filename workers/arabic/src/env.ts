// ─── ArabicEnv ────────────────────────────────────────────────────────────────
// Owns DB_AR (km_arabic). Arabic PEDAGOGY layer: curriculum, classes, SRS,
// lessons, exercises, vocabulary (via AL:ULID refs).
// RULE: Never store linguistic truth (roots/lemmas/grammar) here — reference AL.

export interface ArabicEnv {
  // Owned database
  DB_AR: D1Database;

  // Service bindings
  AR_LINGUISTICS?: Fetcher; // AL — roots, lemmas, sarf, nahw, balagha
  QURAN?: Fetcher;           // QR — passage/ayah display material
  PLANNER?: Fetcher;         // PL — lesson plan integration

  // Secrets
  JWT_SECRET?: string;
}
