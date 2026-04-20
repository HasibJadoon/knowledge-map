# Domain Worker Migration Plan

Last updated: 2026-04-20

## Goal

Keep the existing UI and public API response shapes stable while moving the
backend to clean domain Workers. Each domain Worker owns exactly one D1
database. Cross-domain reads or writes happen through Worker-to-Worker calls,
never by binding another domain's database.

## Target Shape

```
UI / current Pages routes
        |
        v
API compatibility layer
        |
        | service binding / HTTP
        v
domain Worker
        |
        v
owned D1 database only
```

The compatibility layer is allowed to preserve old route paths and old response
JSON so Angular desktop and Ionic do not need broad UI rewrites during the
migration.

## Domain Ownership

| Domain | Worker | Own DB binding | Own tables | May call |
| --- | --- | --- | --- | --- |
| Quran | `km-quran-worker` | `DB_QR` | `qr_*` | `km-ar-linguistics-worker`, `km-worldview-worker`, `km-content-worker` |
| Arabic Linguistics | `km-ar-linguistics-worker` | `DB_AL` | `ar_ling_*` | `km-content-worker` |
| Arabic Learning | `km-arabic-worker` | `DB_AR` | `ar_*` | `km-ar-linguistics-worker`, `km-quran-worker`, `km-planner-worker` |
| Worldview | `km-worldview-worker` | `DB_WV` | `wv_*` | `km-content-worker`, `km-quran-worker`, `km-core-worker` |
| Planner | `km-planner-worker` | `DB_PL` | `pl_*` | `km-quran-worker`, `km-arabic-worker`, `km-core-worker` |
| Core | `km-core-worker` | `DB_CORE` | `core_*` | none by default |
| Content | `km-content-worker` | `DB_CM` | `cm_*` | `km-core-worker` |

Rule: a Worker can have service bindings to other Workers, but only one D1
binding: its own.

## Repository Shape

The current `functions/` tree remains the public compatibility layer. New
domain code should live beside it:

```
workers/
  shared/
    src/
      http.ts
      refs.ts
      service-client.ts
  quran/
    src/
      env.ts
      index.ts
      routes/
  ar-linguistics/
  arabic/
  worldview/
  planner/
  core/
  content/
```

`workers/shared` must contain only transport, typed-ref, and response helpers.
It must not contain D1 binding maps or SQL for any domain.

## Worker Config Pattern

Example Quran Worker:

```toml
name = "km-quran-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB_QR"
database_name = "km_quran"
database_id = "8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba"

[[services]]
binding = "AR_LINGUISTICS"
service = "km-ar-linguistics-worker"
```

Example type boundary:

```typescript
export interface QuranEnv {
  DB_QR: D1Database;
  AR_LINGUISTICS?: Fetcher;
  WORLDVIEW?: Fetcher;
  CONTENT?: Fetcher;
}
```

No `DB_AL`, `DB_AR`, `DB_WV`, `DB_PL`, `DB_CORE`, or `DB_CM` binding belongs in
the Quran Worker.

## Migration Order

1. Quran
   - Start with Surah-centered study data.
   - Keep current `/quran/surah/:surahId/study` and
     `/quran/surah/:surahId/study/:passageNo` response shapes.
   - Move reads to `km-quran-worker`; current routes become adapters.
   - For now, only `U:C:QURAN:12:1-7` is copied.

2. Arabic Linguistics
   - Move roots, lemmas, morphology, grammar registries, particles, and
     expressions to `km-ar-linguistics-worker`.
   - Quran and Arabic Workers call it for enrichment.

3. Arabic Learning
   - Move lessons, exercises, tasks, and learning units to `km-arabic-worker`.
   - Store Quran and linguistic links as typed refs, not duplicate data.

4. Planner
   - Move study sessions, weekly plans, progress, and review queues.
   - Planner calls Quran/Arabic Workers for display material.

5. Worldview
   - Move worldview nodes, claims, evidence, comparisons, and source links.
   - Use typed refs to Quran, Arabic Linguistics, and Content.

6. Content
   - Move documents, blocks, assets, imports, and authored artifacts.
   - Other domains call Content for source/document rendering.

7. Core
   - Move identity, workspaces, roles, policy, and shared user state last unless
     auth becomes a blocker earlier.

## Per-Domain Acceptance Checks

Before a domain migration is considered complete:

- The domain Worker binds exactly one D1 database.
- `rg "DB_" workers/<domain>` shows only the owned DB binding.
- Cross-domain data access is through `Fetcher` service bindings.
- Existing public route response JSON is unchanged or intentionally versioned.
- The migrated dataset is copied with a narrow, documented scope.
- A rollback path exists by pointing the compatibility route back to old logic.

## Current Quran Runtime Tables

The Surah-centered Quran study runtime lives in `km_quran`:

| Table | Purpose |
| --- | --- |
| `qr_surah_study_passages` | Surah passage unit, e.g. S12 ayahs 1-7 |
| `qr_surah_study_steps` | Root study steps such as reading, vocabulary, morphology, sentence structure |
| `qr_surah_study_tasks` | Root and child tasks copied from legacy task data |
| `qr_surah_study_task_json_chunks` | Large task payload chunks for D1-safe storage |
| `qr_surahs` | Surah metadata copied for active scope |
| `qr_ayah` | Ayah text copied for active scope |
| `qr_translations` | Translation rows copied for active scope |
| `qr_word_occurrences` | Word occurrences copied for active scope |
