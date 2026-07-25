# D1 ↔ worker drift report

> Generated 2026-07-25 by auditing every `FROM` / `JOIN` / `INSERT INTO` /
> `UPDATE` in `workers/*/src` against the **live** Cloudflare D1 schemas.
> The live databases are treated as final: code follows D1, not the reverse.

## How to re-run the audit

For each worker, extract the table names its SQL touches, then ask the live
database which of them do not exist:

```sql
WITH refs(n) AS (VALUES ('qr_surah'),('qr_lemma'), …)
SELECT n FROM refs WHERE n NOT IN (SELECT name FROM sqlite_master);
```

An empty result means the worker is fully aligned with its database.

## Status by worker

| Worker | DB | Unresolved refs |
|---|---|---|
| worldview | km_worldview | 0 — clean |
| planner | km_planner | 0 — clean |
| content | km_content | 0 |
| studio | km_studio | 0 |
| arabic | km_arabic | 0 in wired code |
| quran | km_quran | 15, all in dead code (below) |
| ar-linguistics | km_arabic_linguistic | 17 (below) |
| core | km_core | 17 — **not yet addressed** |

## What was fixed

- **quran** — 77 table renames + `PassageRepo` rewritten onto
  `qr_surah_study_passage`.
- **arabic** — curriculum/learner tables regrouped to `ar_curriculum_*` /
  `ar_learn_*`; SRS tables created (they had never existed, so `/srs` and Anki
  export were dead); `ar_exercises` + `ar_grammar` created.
- **content** — `CaptureRepo` moved onto `cm_capture_entries`.
- **studio** — migrations ledger bootstrapped and `0005` applied, creating
  `st_capture_sessions` / `st_capture_markers`.
- **ar-linguistics** — 26 renames plus `NahwRepo`, `BalaghaRepo` and
  `MorphologyRepo` rewritten against the tables that replaced theirs.

## Still open

### 1. core — the ACL backbone is missing (highest priority)

Six tables the **deployed** core worker queries do not exist in `km_core`, so
those paths fail in production today:

`core_resource_grants`, `core_workspace_roles`, `core_workspace_member_roles`,
`core_workspace_plans`, `core_notifications`, `core_srs_registry`

This was left alone deliberately. Creating them empty would flip these code
paths from "throws" to "returns no rows", which in an authorisation path can
silently mean *allow* rather than *deny* — a decision that needs your intent,
not a guess. `workers/core/schema.sql` still carries the intended DDL.

Eleven further tables are referenced only by repo code the deployed worker
never calls: `core_audit_log`, `core_feature_flags`, `core_external_refs`,
`core_review_queue`, `core_resource_policies`, `core_workspace_policies`,
`core_workspace_groups`, `core_workspace_group_members`, `core_podcasts`,
`core_podcast_participants`, `core_talking_points`. The podcast trio looks
superseded by the studio domain (`st_episodes`, `st_participants`,
`st_talking_points`) and is probably deletable.

### 2. ar-linguistics — 17 tables with no D1 home

Wired to routes, so the feature is reachable but the query cannot succeed:

| Table | Note |
|---|---|
| `ar_ling_lane_quality_index`, `ar_ling_lane_patch_log` | Lexicon-repair tooling from migration `0013`. The deployed worker looks for `ar_ling_lexicon_lane_quality` / `ar_ling_lexicon_lane_patch_log` — also absent. Renamed in code, never created. |
| `ar_ling_vocab_depth`, `ar_ling_vocab_illustrations`, `ar_ling_vocab_diagrams` | Word-view layers. Content appears to have moved into `ar_ling_learn_vocab` (`illustration_key`, `diagram_key`) and `ar_ling_root_dna` (`illustrations_json`, `senses_json`), but the JSON shapes need confirming before remapping. These calls are `.catch(() => [])`-guarded, so the word view degrades quietly instead of erroring. |
| `ar_ling_collocations`, `ar_ling_expression_tokens` | The rest of the expression family folded into `ar_ling_root_lemma_tabir` (which carries `surface_ar` / `preposition_ar`); these two have no separate table. |

Unreachable dead code — nothing imports these repos:
`bridge.repo.ts` (`ar_ling_arabic_links`, `ar_ling_content_links`,
`ar_ling_projection_cache`), `al-source.repo.ts` (`ar_ling_tokens`,
`ar_ling_token_lexicon_link`, `ar_ling_sentences`, `ar_ling_evidence_items`),
`disciplinary.repo.ts` (`ar_ling_discipline_containers`,
`ar_ling_discipline_relations`, `ar_ling_discipline_units`).

### 3. quran — 15 refs, all in dead code

`outer-horizon.repo.ts`, `cross-surah.repo.ts` and `material-witness.repo.ts`
are imported by nothing (1,213 lines total). `projection.repo.ts` *is* wired
via `routes/worldview.ts` but queries `qr_diagram_specs`,
`qr_diagram_instances`, `qr_worldview_nodes` and `qr_worldview_edges`, which
live in the worldview domain as `wv_diagram_specs`, `wv_diagram_instances`,
`wv_nodes` and `wv_node_edges`. Per the ownership rules those belong to WV, so
this should go through the `WORLDVIEW` service binding (already declared in
`workers/quran/wrangler.toml`) rather than cross-database SQL.

## Other findings

- **`workers/*/schema.sql` snapshots are stale.** They still describe the
  pre-rename schema. Regenerate from the live database:
  `SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name;`
- **`km_studio` had no `d1_migrations` table**, so `wrangler d1 migrations
  apply` would have re-run `0003` and failed on a duplicate column. The ledger
  is now bootstrapped with `0001`–`0005` recorded.
- **Migrations applied to D1 but absent from this repo**: `km_arabic_linguistic`
  has `0023`–`0061` (39 files, including the `0042`–`0058` rename series) and
  `km_quran` has `0007`–`0009`. D1 stores only migration *names*, so the SQL
  cannot be recovered from the database — it exists only wherever those
  migrations were originally written.
- **iCloud duplicate files** (`… 2.sql`, `… 2.ts`) were removed where they were
  byte-identical and unreferenced. `word_analysis.repo 2.ts` and
  `word_analysis 2.ts` in ar-linguistics were kept: they differ from the
  originals and may hold newer work.
