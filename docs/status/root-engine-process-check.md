# Root Engine — Process Check & km_core Control-Plane Design

> Verification pass ("check the process first") before building the cybernetics
> control plane. Covers: what exists (live D1 vs committed repo), the real
> implemented staging/QA patterns, the 4-corpora mining contract, and the target
> single control plane in `km_core`. Date: 2026-07-21.

## A. Current state — a schema-drift finding ⚠️
The "kroot" engine **exists in live D1 but not in the repo.**

- **Live in `km_arabic_linguistic` (queried, with real run data):**
  `ar_ling_kroot_run_stage` (5-stage gated loop: ENROL→MINE→PROMOTE→STORY→RENDER,
  with `gate`/`iteration`/`coverage_pct`/`feedback_md`), `ar_ling_root_build_jobs`,
  `ar_ling_root_schedule`, `ar_ling_root_build_status`, `ar_ling_reg_build_layer`
  (22 layers), `ar_ling_reg_sub_layer` (24 bands), `ar_ling_reg_table_discipline`,
  `ar_ling_root_article_block`.
- **In the repo:** **none of these have a `CREATE TABLE` migration and there is no
  runner script.** They appear only as an intended contract (this status folder).
  → They were provisioned directly into D1 (wrangler/agent session), so the source
  of truth is the DB, not git. **Fix first: commit real migrations before extending.**

## B. Real, committed patterns to build the engine on
The engine should be modeled on machinery that *is* in the repo:

1. **Import orchestrator (stage→push→validate)** —
   `workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh`:
   `audit → cleanup → schema → stage (→ stage.sqlite) → bundle (01..09.sql) →
   push (wrangler d1 execute → remote) → link → validate`. IDs are stable hashes of
   `(source_slug, root_norm, path)` → **idempotent re-import**.
2. **Claim staging → promotion + QA (the real "stage then push to live")** —
   `database/migrations/km-arabic-linguistics/005_irab_tibyan_staging.sql`:
   - `ar_ling_source_claims` — staging rows with `review_status`
     ('pending'/'approved'/'rejected'/'needs_fix'/'flagged'), `confidence`
     ('high'/'medium'/'low'/'pending'), and **promote pointers**
     `promoted_evidence_id` → `qr_evidence_items`, `promoted_reading_id` → `qr_ss_scope_reading`.
   - `ar_ling_ingestion_runs` — the run/job audit table (`status`
     running/succeeded/failed/partial). **This is the staging+run model to generalize.**
3. **4-corpora read layer** — `workers/ar-linguistics/src/routes/source_rag.ts`
   (`/al/source-rag/bundle`): `chunk_kind IN
   ('lexical_entry','lexical_word_entry','irab','irab_tafsir','semantic','balagha_concept')`.
4. **Review queue** — `ar_ling_near_synonym_review_queue` (`status DEFAULT 'open'`)
   is the existing feedback primitive; the target is one shared queue (see D).
5. **Per-root recipe** — `docs/quran-vocabulary-backbone-plan.md` §5 (10 ordered steps)
   and §8 completion test define what "a root is done" means.

## C. The MINE contract — all 4 corpora (per user spec)
| # | Corpus | Table | Notes |
|---|---|---|---|
| 1 | Lexicons (معاجم) | `ar_ling_lexicon_blocks` (+ `_root_entries`) | 11 books; كتب 9/11 present, 4/11 clean |
| 2 | Ṣarf / naḥw / balāgha | `ar_ling_gram_chunks` (`discipline` SF/NH/BL) | SF 9,056 · NH 8,138 · BL 4,125 |
| 3 | Tafsīr | `qr_tafsir_entries` (in **km_quran**) | reached via `ar_ling_vector_records` refs, not copied |
| 4 | Iʿrāb | `ar_ling_source_chunks` (`chunk_kind='irab'`) | importers in `scripts/irab-ingestion/`; canonical tables in `006_irab_canonical_tables.sql` |

Today MINE stages mostly (1) + some (2). **(3) tafsīr and (4) iʿrāb are not yet wired
into the root build loop** — the primary gap for "all aspects backed."

## D. Target — one cybernetics control plane in `km_core`
`km_core` is already module-neutral and holds the primitives, but has **no engine
tables and both control tables are empty** (`core_review_queue` 0, `core_srs_registry` 0).

| AL-local today (drifted) | → `km_core` control plane (committed) |
|---|---|
| `ar_ling_root_schedule` | `core_build_schedule` (any entity via typed ref) |
| `ar_ling_kroot_run_stage` | `core_build_run` + `core_build_stage` — the gated/iterative/coverage loop, `module`-tagged |
| `ar_ling_root_build_jobs` / `ar_ling_ingestion_runs` | `core_build_job` |
| `ar_ling_reg_build_layer` / `_sub_layer` / `_table_discipline` | `core_layer_registry` (+ discipline→source map) |
| `ar_ling_source_claims` (staging + promote pointers) | pattern reused per domain; control plane stores **state + typed ref only** |
| `ar_ling_near_synonym_review_queue` | reuse **`core_review_queue`** (gate failures land here) |
| — | reuse **`core_activity_events`** (each stage transition = one event) |
| cross-domain pointers | reuse **`core_external_refs`** typed refs (`AL:`/`QR:`) |

**Cybernetics loop** = `core_build_run` drives stages; each stage emits a
`core_activity_events` signal + a `coverage_pct`; a closed `gate` or low coverage
enqueues `core_review_queue`; the loop re-runs (`iteration`) until gate opens →
promote/push. Control lives in km_core; **the actual mining/projection runs in the
domain worker** (AL/QR) via **service bindings** — km_core cannot SQL-join AL/QR
(separate D1s), so it holds orchestration state only.

## E. Gaps & risks
1. **Schema drift** — live engine tables have no migrations (fix before moving).
2. **Runs not tied to a root** — `kroot_run_stage` has no `root_norm`; runs for كتب
   and نزل interleave. Control rows must carry a typed target ref.
3. **Job/status inconsistency** — `build_jobs` (3 rows for كتب) ≠ `build_status` (4/11).
4. **MINE incomplete** — tafsīr + iʿrāb not mined into the loop.
5. **PROMOTE incomplete** — projects only antonyms/dev-stages; not all layers/sub-layers/memlets.
6. **No committed runner** — the loop is executed by hand/skills, not a versioned runner.

## F. Recommended build order
1. **Land migrations** for the engine as `core_build_*` in `km_core` (schema of record),
   plus `core_layer_registry` seeded from the 22 layers / 24 bands.
2. **Backfill** the drifted AL data into the committed tables (or re-home it), tying
   every run to a typed target ref.
3. **Extend MINE** to all 4 corpora (add tafsīr via vector_records + iʿrāb source_chunks).
4. **Extend PROMOTE** to project every registry layer/sub-layer + memlet, using the
   `ar_ling_source_claims` staging→promote+confidence pattern.
5. **Wire the loop**: stage events → `core_activity_events`; gate/coverage failures →
   `core_review_queue`; domain work over **service bindings**.
6. **Runner**: one versioned orchestrator (model on `00_run.sh`) reading
   `core_layer_registry` and driving `core_build_run`.

> Open scope decision: build `core_build_*` **domain-neutral** (roots · āyahs · surahs)
> from the start, vs **roots-only** now and generalize later.
