# D1 ↔ worker drift report

> Generated 2026-07-25 by comparing every `FROM` / `JOIN` / `INSERT INTO` /
> `UPDATE` in `workers/*/src` against `workers/*/schema.sql`, which is itself
> generated from the **live** Cloudflare D1 databases. D1 is final: code
> follows the database, not the reverse.

## Re-running the audit

`workers/*/schema.sql` is now a faithful dump of each live database, so the
check is local — no Cloudflare round-trip needed. Extract the table names a
worker's SQL touches and subtract the `CREATE TABLE` / `CREATE VIEW` names in
its snapshot. Regenerate a snapshot after applying migrations with:

```sql
SELECT type, name, sql FROM sqlite_master
WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name <> 'd1_migrations'
ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 1 ELSE 2 END, name;
```

Snapshots exclude `d1_migrations` (wrangler's ledger), `_cf_KV`, and FTS5
shadow tables, which their virtual tables recreate automatically.

## Status

| Worker | DB | Live objects | Refs | Unresolved |
|---|---|---:|---:|---:|
| content | km_content | 39 | 27 | **0** |
| planner | km_planner | 35 | 19 | **0** |
| studio | km_studio | 8 | 8 | **0** |
| worldview | km_worldview | 161 | 141 | **0** |
| core | km_core | 93 | 25 | 1 |
| arabic | km_arabic | 26 | 25 | 11 |
| quran | km_quran | 173 | 112 | 16 |
| ar-linguistics | km_arabic_linguistic | 146 | 49 | 18 |

Four workers are fully aligned. Of the 46 remaining references, **31 are in
repositories that nothing imports** — dead code, not live breakage.

## Still open

### core — one table

`core_review_queue` (`repositories/review-queue.repo.ts`, not wired to any
route). Everything else core needs now exists: the ACL backbone
(`core_resource_grants`, `core_workspace_roles`, `core_workspace_member_roles`,
`core_workspace_plans`, `core_resource_policies`, `core_workspace_policies`,
`core_workspace_groups`, `core_workspace_group_members`), plus
`core_notifications`, `core_srs_registry`, `core_audit_log`,
`core_feature_flags` and `core_external_refs`.

### arabic — SRS storage was removed

`ar_learn_srs_deck` / `ar_learn_srs_card` / `ar_learn_srs_review` were created
during this work, then dropped from km_arabic. `d1_migrations` still records
`0001_srs_card_content.sql` as applied, so `wrangler d1 migrations apply` will
**not** recreate them.

This matters because `/ar/srs/*` **is** wired (`srsRoutes` in
`workers/arabic/src/index.ts`) and `srs.repo.ts` queries all three tables, so
the spaced-repetition engine and Anki export have no storage. Either the
tables come back or the routes and repo should go — that is a product call.
Per `docs/quran-morphology-step-process.md` the per-Surah SRS decks feed Anki,
so this is probably not meant to stay dropped.

Dead code in the same worker: `class.repo.ts` (`ar_classes`,
`ar_class_assignments`, `ar_class_enrolments`, `ar_class_resources`,
`ar_assignment_submissions`), `expression.repo.ts` (`ar_expressions`,
`ar_applied_balagha`), `vocabulary.repo.ts` (`ar_vocabulary`) — none imported.
AR does not own vocabulary anyway; that is AL's, via `AL:<id>` refs.

### quran — 15 refs, all in dead code

`outer-horizon.repo.ts`, `cross-surah.repo.ts` and `material-witness.repo.ts`
are imported by nothing (1,213 lines). `projection.repo.ts` *is* wired via
`routes/worldview.ts` but queries `qr_diagram_specs`, `qr_diagram_instances`,
`qr_worldview_nodes`, `qr_worldview_edges` — WV-owned data living in
km_worldview as `wv_diagram_specs`, `wv_diagram_instances`, `wv_nodes`,
`wv_node_edges`. Per the ownership rules this should go through the
`WORLDVIEW` service binding (already declared in `workers/quran/wrangler.toml`)
rather than cross-database SQL.

(`qr_morph_display_` in `routes/study.ts` is a false positive — it appears in
a comment, not in SQL.)

### ar-linguistics — 18 refs

Wired, so the route is reachable but the query cannot succeed:

| Table | Note |
|---|---|
| `ar_ling_lane_quality_index`, `ar_ling_lane_patch_log` | Lexicon-repair tooling from migration `0013`. The deployed worker looks for `ar_ling_lexicon_lane_quality` / `ar_ling_lexicon_lane_patch_log` — also absent. Renamed in code, never created. |
| `ar_ling_vocab_depth`, `ar_ling_vocab_illustrations`, `ar_ling_vocab_diagrams` | Word-view layers. Content moved into `ar_ling_learn_vocab` (`illustration_key`, `diagram_key`, `unique_senses_json`) and `ar_ling_root_dna` (`illustrations_json`, `senses_json`), but the JSON shapes need confirming before remapping. Guarded by `.catch(() => [])`, so the word view degrades quietly rather than erroring. |
| `ar_ling_collocations`, `ar_ling_expression_tokens` | The rest of the expression family folded into `ar_ling_root_lemma_tabir` (which carries `surface_ar` / `preposition_ar`); these two have no separate table. |
| `ar_ling_lexicon_entry_sections_fts` | `routes/lexicon_v2.ts`. The live FTS table is `ar_ling_lexicon_entry_section_fts` (singular). |

Unreachable dead code: `bridge.repo.ts` (`ar_ling_arabic_links`,
`ar_ling_content_links`, `ar_ling_projection_cache`), `al-source.repo.ts`
(`ar_ling_tokens`, `ar_ling_token_lexicon_link`, `ar_ling_sentences`,
`ar_ling_evidence_items`), `disciplinary.repo.ts` (`ar_ling_discipline_*`).

## Duplication: km_core ↔ km_studio

`core_podcasts`, `core_podcast_participants` and `core_talking_points` restate
what studio owns as `st_episodes`, `st_participants` and `st_talking_points`.
The core copies hold **0 rows**; studio holds 8 episodes, 5 participants, 48
talking points and 14 sections. Nothing imports `core/src/repositories/
podcast.repo.ts`, and the deployed core worker never queries those tables.

Per the ownership rules ST owns episodes, sections and talking points, so the
three `core_*` tables and `podcast.repo.ts` / `podcast.schema.ts` look safe to
drop. Left in place — deleting production tables is your call, not a cleanup
I should make unilaterally.

(km_content has no episode tables at all; the overlap is core↔studio only.
`wv_prophetic_episodes` in worldview is a different concept — scriptural
episodes — and is not duplication.)

## Migrations applied to D1 but absent from this repo

`km_arabic_linguistic` has `0023`–`0061` recorded (39 files, including the
`0042`–`0058` rename series); `km_quran` has `0007`–`0009`. D1 stores only
migration *names*, so the SQL cannot be recovered from the database — it
exists only wherever those migrations were originally written.

## Other notes

- `km_studio` had no `d1_migrations` table, so `wrangler d1 migrations apply`
  would have re-run `0003` and failed on a duplicate column. The ledger is now
  bootstrapped with `0001`–`0005` recorded.
- The live databases moved noticeably while this audit ran (km_quran 171 → 194
  tables, km_core 32 → 93 objects), so treat the counts above as a point-in-
  time reading and regenerate the snapshots before relying on them.
- iCloud duplicate files (`… 2.sql`, `… 2.ts`) were removed where they were
  byte-identical and unreferenced. `word_analysis.repo 2.ts` and
  `word_analysis 2.ts` in ar-linguistics were kept: they differ from the
  originals and may hold newer work.
