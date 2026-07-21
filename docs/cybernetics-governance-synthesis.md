# K-Maps as a Control System — Synthesis & Build Plan

> Design session output. Written after direct inspection of the live D1 databases
> (Cloudflare MCP) and the repository. Every number below was re-verified against
> production D1 on the date of writing; every file path was confirmed on disk.
> Where this document corrects the starting brief, the correction is called out inline.

---

## 0. TL;DR (read this first)

1. **The strategic-leverage move is real.** `root_uid` is stamped on **50,306 / 50,306**
   rooted word-occurrences (100% of rooted words), spanning exactly **1,642** roots that
   match `qr_root_registry` 1:1. The ayah↔ayah recurrence graph *can* be generated
   automatically. **But** it must not be materialised as a dense pairwise table (the single
   most common root spans **1,879 ayahs** → ~1.76M pairs for one root, billions overall).
   Build it as an inverted index + rarity-weighted edges.

2. **The cross-domain coupling is real but the brief named the wrong column.**
   `qr_word_occurrences.root_uid` === `ar_ling_roots.id` === `ar_ling_roots.canonical_id`
   (verified identical 26-char hash for ابب/قول/كتب). AL has **no column literally called
   `root_uid`** — the join key is AL's primary key. `ar_ling_roots.frequency_quran` is already
   populated (قول=1722), so the vocabulary curriculum ranking is essentially free.

3. **The biggest finding — the governor already exists, unmigrated.** km_planner contains a
   full **`cp_*` "control-plane"** family (`cp_domain`, `cp_lane`, `cp_node`, `cp_edge`,
   `cp_gauge`, `cp_build_job`, `cp_production`, `cp_srs_card`, `cp_review_event`, `cp_tick_log`,
   `cp_config`) that maps almost 1:1 onto the proposed cybernetic frame. `cp_domain` already
   declares `km_planner` as `role='control'`. **This schema exists only in live D1 — it appears
   in zero migration files, zero worker code, and zero docs.** It is an orphaned, untracked,
   unwired live schema.

4. **Therefore both pending decisions resolve differently than the session leaned:**
   - **Decision A** (where the governance layer lives): **neither km_core nor a new
     km_cybernetics DB — extend the existing `cp_*` family in km_planner.** D1 has no cross-DB
     FK, so km_core's "real FK into review_queue/srs" advantage is illusory.
   - **Decision B** (linker vs spine first): **codify the orphaned spine into a migration first
     (cheap, protects it), then build the recurrence linker (produces real data + the first
     setpoints), then close the loop with a sensor.** The governor has nothing to regulate until
     coverage + setpoints exist.

5. **The loop is open.** There is **no `scheduled()` export or cron trigger anywhere** in
   `workers/`. `cp_tick_log` has exactly 1 row. The sensor that would close the feedback loop
   does not exist yet — it is greenfield.

---

## 1. Current-state map (verified)

### 1.1 Repository architecture

Monorepo at repo root. `AGENTS.md` is a byte-for-byte mirror of `CLAUDE.md`.

**Workers** — Cloudflare Workers, custom `URLPattern`-based router in
`workers/shared/src/router.ts` (no Hono/itty). `km-backend-worker` is the *only* public worker
(`backend.k-maps.com`, `workers_dev=true`); all 8 domain workers are internal
(`workers_dev=false`) and reached via **service bindings**. `workers/backend/src/modules.ts`
holds `MODULE_MAP` (`qr, al, wv, ar, cm, pl, core, st, …`) and path-proxies `/api/<mod>/…`.

| Worker | Name | D1 binding → db | Service bindings |
|---|---|---|---|
| backend | km-backend-worker | — | QURAN, WORLDVIEW, ARABIC, AR_LINGUISTICS, CONTENT, PLANNER, STUDIO, CORE |
| quran | km-quran-worker | DB_QR → km_quran | AR_LINGUISTICS, WORLDVIEW, CONTENT (+R2) |
| ar-linguistics | km-ar-linguistics-worker | DB_AL → km_arabic_linguistic | CONTENT |
| arabic | km-arabic-worker | DB_AR → km_arabic | AR_LINGUISTICS, QURAN, PLANNER |
| worldview | km-worldview-worker | DB_WV → km_worldview | CONTENT, QURAN, CORE |
| content | km-content-worker | DB_CM → km_content | CORE |
| **planner** | **km-planner-worker** | **DB_PL → km_planner** | **QURAN, ARABIC, CORE** |
| core | km-core-worker | DB_CORE → km_core | — |
| studio | km-studio-worker | DB_ST → km_studio | CORE (+Durable Object `EpisodeSession`) |

`workers/shared/src` provides `router.ts`, `db.ts` (all SQL goes through `query/queryOne/execute/executeBatch`), `refs.ts` (`parseTypedRef`/`normalizeDomain` — **defined but never called**; refs are treated as opaque strings), `ulid.ts` (`typedId(module)` → `MODULE:ULID`), `auth.ts` (JWT), `service-client.ts` (`callService`).

**Migrations — two trees.** Canonical service-owned schema in `database/migrations/km-*/NNN_name.sql`
(3-digit); wrangler-applied mirrors in `workers/*/migrations/NNNN_name.sql` (4-digit). Rule from
`docs/quran-morphology-step-process.md`: *mirror DDL to `workers/*/migrations/`, data to
`database/seeds/`.* Two distinct DDL dialects exist:
- **km-core style** (`database/migrations/km-core/001_core_schema.sql`): `id TEXT PRIMARY KEY -- ULID`,
  `datetime('now')` timestamps, enums as comments (**no CHECK**), indexes `idx_core_<abbrev>_<col>`.
- **cp_* style** (live only): `strftime('%Y-%m-%dT%H:%M:%SZ','now')` timestamps, **heavy CHECK
  constraints**, `json_valid()` guards. Any extension of `cp_*` must match *this* dialect.

Migrations are applied directly via wrangler (no `db:migrate` npm script):
`node_modules/.bin/wrangler d1 execute km_planner --file=<path> --remote --config=workers/planner/wrangler.toml`.

### 1.2 Database state vector (re-verified against production D1)

**km_quran** (`8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba`):

| Metric | Value | Note |
|---|---|---|
| `qr_ayah` | 6,236 | full corpus |
| `qr_word_occurrences` | 77,427 | the spine |
| — with `root` / `root_uid` | 50,306 / **50,306** | **100% of rooted words stamped** |
| — distinct `root_uid` | 1,642 | == `qr_root_registry` exactly |
| — with `lemma_ref` | 72,507 | |
| `qr_ss_occ_sentence` | 120 | sentence-structure spine |
| `qr_ss_scope_reading` | 823 | |
| `qr_ss_translation_unit` | 13 | |
| `qr_surah_worldview_profiles` | 1 / 114 | Track-3 coverage ~0.9% |
| `qr_tafsir_entries` | 24,139 | |
| `qr_surah_study_passages` / `_tasks` | 16 / 103 | study pipeline live for a few passages |

**Inter-linking tissue (empty — the core Track-1 gap):**

| Table | Rows | Shape |
|---|---|---|
| `qr_surah_relations` | **0** | `(surah_a, surah_b, relation_type, …)` |
| `qr_quran_bil_quran_relations` | **6** | `(from_surah, from_ayah, to_surah, to_ayah, relation_type, scholar_ref, …)` |
| `qr_surah_structure_links` | **4** | `(surah, from_unit_id, to_unit_id, link_type, …)` |
| `qr_ss_scope_relations` | **9** | `(from_scope_type, from_scope_id, to_scope_type, to_scope_id, relation_type, …)` |

*(Note: these relation tables have **no `status` column** and no `updated_at` — so the standard
staging-first `raw→live` idiom needs a dedicated staging table, not an in-place status flag.)*

**km_arabic_linguistic** (`192f4792-…`): `ar_ling_roots` = **24,528** (full classical inventory,
vs 1,642 Quranic roots), `ar_ling_lexicon_root_entries` = 53,515, `ar_ling_lexicon_quran_refs` =
7,470. `ar_ling_roots` keys: `id` (=`root_uid`), `root_text`, `buckwalter`, `canonical_id`,
`root_normalized`, `frequency_quran` (populated).

**km_core** (`afe84ce7-…`): all four primitives exist but are **empty/near-empty** —
`core_external_refs`=0, `core_activity_events`=1, `core_review_queue`=0, `core_srs_registry`=0.
1 workspace, 10 users. **Correction to brief:** `core_external_refs` is a *legacy→typed-ref
migration map* (`legacy_source, legacy_id, legacy_type, new_module, new_typed_ref,
migration_batch`), **not** a general cross-DB pointer registry. The portable `resource_ref` is a
*string convention* on `core_activity_events` / `core_review_queue.suggestion_ref` /
`core_srs_registry`, not an FK-backed table. `core_review_queue` (`workspace_id` **NOT NULL**,
`source_module`, `suggestion_ref`, `entity_type`, `status` default `'pending'`, `priority` int
default 3) has a repo but **no wired route** in `workers/core/src/index.ts`.

**km_worldview** (`5640655e-…`): structurally very rich (200+ `wv_*` tables) but **content-thin**
(`wv_claims`=5, `wv_traditions`=1, `wv_nodes`=360). Crucially, **`wv_node_quran_links`=150 (live)**
— the Worldview→Qur'an middle-loop tissue already exists; `qr_scope_ref` format is `"30:2-6"`
(surah:ayah-range, matching the planner's `'QR:2:1-286'` convention). `wv_scriptural_corpora`=0
but the table exists — a ready home for the future Torah/Gospel corpora.

**km_planner** (`6a4bd15a-…`): `pl_*` operational tables (`pl_goals`=0, `pl_review_cycles`,
`pl_streaks`, `pl_sessions`) **plus the orphaned `cp_*` control-plane** (§2).

---

## 2. The `cp_*` control-plane — the governor that already exists

This is the pivot of the whole synthesis. km_planner already contains a control-plane whose
tables map onto the cybernetic frame nearly term-for-term. It was created directly in live D1
and is **not in any migration, worker, or doc** (verified: `rg cp_node|cp_domain|…` returns zero
hits across the repo).

| Cybernetic role (from brief) | Existing `cp_*` table | State | Live rows |
|---|---|---|---|
| Domain/plant registry | `cp_domain` (`domain, db_name, db_uuid, role∈content/infra/control, fixed`) | **All 8 DBs registered; km_planner=`control`, km_core=`infra`** | 8 |
| Loop / track | `cp_lane` (`lane∈quran/language/worldview, build_verb, study_verb, unit_kind`) | **The three tracks are first-class** | (3 defined) |
| Setpoint | `cp_node.setpoint_json` (per unit) | present as JSON | — |
| Plant state (build side) | `cp_node.build_state∈empty/seeded/mined/compiled`, `build_pct`, `readiness`, `priority`, `layer∈reading/vocabulary/ss/structure/tafsir/worldview` | **Tracking Surah 44 study today** | 54 |
| Controlled variable (study side) | `cp_node.study_state∈unseen/learning/mastered/taught/published`, `study_pct` | present | 54 |
| Sensor sample | `cp_gauge` (`gauge_kind∈recite/quiz/reflection, score 0-100, srs_card_id`) | present | 4 |
| Reinforcement loop | `cp_srs_card` (SM-2: ease/interval/reps/lapses) + `cp_review_event` (grade 0-5) | present | — |
| Actuator (build) | `cp_build_job` (`op∈mine/promote/compile/link/render/seed, actuator∈claude/human, skill, status, priority`) | present | — |
| Actuator (teach/publish) | `cp_production` (`format∈document/video/episode/podcast/short/film/lesson/teach, target_domain∈doc/studio, state∈planned…published`) | **the autopoiesis actuator** | 5 |
| Graph | `cp_edge` (`kind∈requires/feeds/attaches/produces/rollup`) | present | 2 |
| Tick / sensor run | `cp_tick_log` (`trigger∈cron/chat/code, nodes_touched, jobs_actuated, cards_due`) | **1 row — loop never ticked** | 1 |
| Config | `cp_config` (key/value) | present | — |

Live `cp_node` rows already model the exact frame the brief describes: e.g.
`(quran, passage, QR:SP:44:1-9, layer=vocabulary, build_state=mined, build_pct=33)`,
`(quran, passage, QR:SP:44:1-9, layer=worldview, build_state=empty, build_pct=0)`,
`(ling, root, 24528-kataba, layer=vocabulary, build_pct=90)`,
`(wv, node, wv_node:roman-civic-religion, build_pct=60)`.

### What the proposed six `cyb_*` tables actually add

Overlaying the proposal onto `cp_*`:

| Proposed `cyb_*` | Verdict | Reason |
|---|---|---|
| `cyb_setpoint` | **Already present** as `cp_node.setpoint_json` | optionally normalise into a `cp_setpoint(node_id, metric, target, weight)` table for easier diffing |
| `cyb_state_snapshot` | **Partially present** | `cp_node.build_pct` holds *current* only; `cp_gauge` is study-side per-attempt. **Add** `cp_state_snapshot(node_id, metric, observed, run_id, at)` for a build-side time series |
| `cyb_loop` | **Partially present** as `cp_lane` | lanes ≈ tracks; add `scale∈inner/middle/outer`, `timescale`, `actuator_ref` columns or a thin `cp_loop` registry |
| `cyb_gap` | **Genuinely missing** | the comparator/error output is nowhere stored. **This is the single most valuable table to add.** |
| `cyb_variety` | **Genuinely missing** | Ashby requisite-variety per worldview cell is unmodelled. **Add.** |
| `cyb_controller` | **Genuinely missing** | no homeostat registry (SS linter, translation-decision, etc.). **Add.** |

**Conclusion:** do not create a parallel `cyb_*` namespace. Add the three genuinely-missing
concepts as `cp_gap`, `cp_variety`, `cp_controller` (plus optional `cp_state_snapshot`,
`cp_setpoint`, `cp_loop`), in km_planner, in the `cp_*` CHECK-heavy dialect. This honours
extend-don't-duplicate and keeps the whole governor in the one DB `cp_domain` already calls
`control`.

---

## 3. Gap analysis vs the cybernetic setpoints

| Loop | Setpoint (target) | Observed | Error | Where it shows up |
|---|---|---|---|---|
| **Inner — comprehension** | SS/vocab coverage per studied passage | S44 vocab `build_pct`=33, ss=16; only 16 study passages exist | large | `cp_node` already records it; **no comparator writes the gap** |
| **Middle — integration** (cross-domain) | dense typed-ref tissue QR↔AL↔WV | AL↔QR join key present on 50,306 words but **0 materialised recurrence edges**; WV→QR = 150 links (only source populated) | very large | `qr_*_relations` ≈ empty; `core_external_refs`=0 |
| **Outer — teaching** (highest gain) | published productions closing the autopoietic loop | `cp_production`=5 (planned), 0 published | high | `cp_production.state` never reaches `published` |
| **Requisite variety** (Ashby) | ≥N distinct worldview positions per cell to critique against the Qur'an | `wv_claims`=5, `wv_traditions`=1 | critical | unmodelled — no `cp_variety` |
| **Second-order** (system observes itself) | a sensor tick reads state & writes gaps | `cp_tick_log`=1, no `scheduled()` worker | total | **loop is open** |

The system today is a **plant with rich state and a wired actuator vocabulary, but no closed
sensor→comparator→actuator loop.** The governor's skeleton is in the DB; the muscle (a ticking
sensor) and one nerve (the comparator/gap table) are missing.

---

## 4. Build plan — file-path level

Recommended order: **(0) codify → (1) recurrence linker + curriculum → (2) close the loop.**

### Phase 0 — Codify the orphaned control-plane (protects it; ~half a day)

The `cp_*` schema is live but untracked; a stray `wrangler d1 migrations apply` or a rebuild
could silently drop it. Reverse-engineer it into tracked migrations before touching anything.

1. Dump current DDL (already captured in this doc) into:
   - `database/migrations/km-planner/002_cp_control_plane.sql` — canonical, all existing
     `cp_*` CREATE TABLEs verbatim, wrapped `CREATE TABLE IF NOT EXISTS`.
   - `workers/planner/migrations/0004_cp_control_plane.sql` — mirror.
2. Add the three new governance tables in the same migration (cp_* dialect: `strftime` ISO-Z
   timestamps, CHECK constraints, `json_valid`):
   - `cp_gap(id, node_id REFERENCES cp_node, metric, target REAL, observed REAL, error REAL, weighted_error REAL, weight REAL, status∈open/acknowledged/closed, run_id, computed_at)`
   - `cp_variety(id, scope∈lane/node, scope_ref, dimension, required_min INT, observed_distinct INT, deficit INT, computed_at)`
   - `cp_controller(id, code UNIQUE, kind∈linter/decision/scheduler, scope, binding_ref, enabled INT, note_md)`
   - *(optional now, cheap later)* `cp_state_snapshot(id, node_id, metric, observed REAL, run_id, at)`, `cp_setpoint(id, node_id, metric, target REAL, weight REAL)`.
3. Seed `cp_controller` with the known homeostats: `ss_vocab_linter`, `translation_decision`
   (both already have data homes in `qr_ss_*`).
4. Apply: `node_modules/.bin/wrangler d1 execute km_planner --file=database/migrations/km-planner/002_cp_control_plane.sql --remote --config=workers/planner/wrangler.toml`,
   then verify with a follow-up `SELECT`.

### Phase 1 — Recurrence linker + vocabulary curriculum (the leverage move)

**Do not build a dense pairwise table.** Design:

1. **Inverted index projection** (compact, fast) — new seed/generator
   `scripts/gen-quran-root-recurrence.py`:
   - Read `qr_word_occurrences` grouped by `root_uid` → `{root_uid: [(surah,ayah,count), …]}`.
   - Write `qr_root_ayah_index(root_uid, surah, ayah, occ_count)` (new table via
     `database/migrations/km-quran/019_root_recurrence.sql` + `workers/quran/migrations/00NN_…`,
     mirror seed to `database/seeds/`). This is ~50k rows, not billions.
2. **Rarity-weighted edges** — only materialise ayah↔ayah edges through **discriminating** roots.
   Compute a per-root document frequency (`ayahs` count already sized: top root = 1,879 ayahs).
   Emit an edge only when a shared root's ayah-spread is below a threshold (e.g. ≤ ~120 ayahs,
   tune empirically), weighting by `idf = log(6236 / ayahs_for_root)`. This bounds the graph and
   makes قول/الله (non-discriminating) *not* dominate.
   - Target table: **not** `qr_quran_bil_quran_relations` (that is scholar-curated
     *tafsīr bil-Qur'ān* with `scholar_ref` — auto edges would pollute it). Instead a dedicated
     `qr_ayah_lexical_links(from_surah, from_ayah, to_surah, to_ayah, via_root_uid, weight,
     generator, status)` **with a `status` column** so staging-first works in-table
     (`status='raw'` → human gate → `'live'`).
3. **Curriculum ranking is nearly free.** `ar_ling_roots.frequency_quran` is already populated;
   `qr_root_registry` maps every Quranic `root_uid`. Emit a ranked
   `curriculum` view/seed: roots ordered by `frequency_quran DESC`, each assigned a "first teach"
   passage (min surah:ayah of occurrence). This becomes the Track-1 setpoint feed.
4. **Wire setpoints into the governor:** for each curriculum root, upsert a `cp_node`
   (`domain=ling, target_kind=root, lane=quran, layer=vocabulary`) with `setpoint_json` = target
   coverage; the sensor (Phase 2) will fill `build_pct`.
5. Expose read APIs (optional, follows existing router pattern): `GET /qr/ayah/:s/:a/recurrence`
   and `GET /qr/curriculum/roots` in `workers/quran/src/routes/`.

### Phase 2 — Close the loop: the sensor (greenfield)

No `scheduled()` worker exists. Extend **km-planner-worker** (it owns the control DB and is the
`control` domain) rather than spinning a new worker:

1. `workers/planner/wrangler.toml`: add `[triggers] crons = ["0 * * * *"]` (or nightly) and add
   the missing service bindings so the sensor can read coverage: **AR_LINGUISTICS, WORLDVIEW,
   CONTENT, STUDIO** (planner currently binds only QURAN, ARABIC, CORE).
2. Each domain worker exposes a cheap coverage endpoint returning counts for its `cp_node`
   targets, e.g. `GET /qr/coverage?scope=QR:SP:44:1-9` → `{vocabulary, ss, structure, tafsir,
   worldview}` percentages. Add under each `workers/*/src/routes/coverage.ts`.
3. New `workers/planner/src/index.ts` gains a `scheduled(controller, env, ctx)` export →
   `runTick(env)` in `workers/planner/src/control/sensor.ts`:
   - insert a `cp_tick_log` row (`trigger='cron'`);
   - for each `cp_node`, call the owning domain via service binding, read observed coverage;
   - write `cp_state_snapshot`, update `cp_node.build_pct/study_pct`;
   - diff observed vs `setpoint_json` → upsert `cp_gap` (error, weighted_error);
   - for worldview lanes, compute `cp_variety` (distinct positions per cell) vs required_min;
   - push the top-weighted open gaps into **`core_review_queue`** via the CORE binding
     (`source_module='PL'`, `suggestion_ref=<cp_node ref>`, `entity_type='other'`,
     `priority` from weighted_error, `workspace_id`=the one existing workspace) **and** enqueue
     matching `cp_build_job` rows (`actuator='claude'`, `op='mine'|'compile'`).
4. `workers/planner/src/routes/control.ts` + `workers/planner/src/repositories/cp-*.repo.ts`:
   CRUD/read surface for `cp_node/cp_gap/cp_build_job/cp_production/cp_tick_log` so the frontend
   (and Claude) can see the governor's state and act on the queue.

This makes the loop second-order: `cp_tick_log` records the system observing itself, `cp_gap`
holds the error signal, `cp_build_job`/`cp_production`/`core_review_queue` are the actuators.

---

## 5. Risks & open questions

**Risks**
- **Graph explosion (high).** Naive ayah×ayah materialisation is billions of rows. Mitigated by
  inverted-index + idf-thresholded edges (§4 Phase 1). Must log the chosen threshold and how many
  edges were dropped — silent truncation reads as "complete" when it isn't.
- **Untracked live schema (high).** `cp_*` (and other live-only DDL) can be dropped by a
  `migrations apply`. Phase 0 must precede everything.
- **Polluting curated tables (medium).** Keep auto recurrence out of
  `qr_quran_bil_quran_relations`; use a dedicated `status`-bearing table.
- **Sensor fan-out cost (medium).** A cron reading coverage from 8 domains hourly could be heavy
  on the 2.5GB DBs. Cache coverage counts (the `workers/shared/src/cache.ts` wrapper exists);
  compute deltas, not full scans.
- **`core_review_queue.workspace_id` is NOT NULL** and only one workspace exists — the sensor must
  resolve/seed a control workspace or the inserts fail.
- **Relation tables lack `status`** — staging-first requires either new `status`-bearing tables or
  a separate staging table; do not retrofit prod-write.

**Open questions (need your call)**
1. **Sensor cadence & host:** hourly cron on km-planner-worker as proposed, or a dedicated
   `workers/sensor`? (Recommendation: extend planner.)
2. **Recurrence threshold:** what ayah-spread cutoff / idf floor defines a "meaningful" shared
   root? (Recommendation: start ≤120-ayah roots, tune against S44.)
3. **Curriculum scope:** rank by raw `frequency_quran`, or weight toward the child's syllabus
   (concrete/imageable roots first)?
4. **Normalise setpoints** into `cp_setpoint`, or keep `cp_node.setpoint_json`?
5. **Worldview requisite-variety target:** what `required_min` distinct positions per cell counts
   as "enough variety" to critique against the Qur'an setpoint?

---

## 6. Recommendations on the pending decisions

- **A. Where the governance layer lives → km_planner, extending `cp_*`.** Not km_core, not a new
  km_cybernetics DB. The governor already lives there; `cp_domain` already labels km_planner
  `control`; D1 has no cross-DB FK so km_core's FK rationale doesn't hold. Add only the missing
  `cp_gap` / `cp_variety` / `cp_controller` (+ optional snapshot/setpoint/loop).
- **B. Order → codify (Phase 0) → recurrence linker + curriculum (Phase 1) → sensor (Phase 2).**
  The linker produces the first real Track-1 data and setpoints; the governor cannot regulate an
  empty plant, so the sensor comes after there is coverage and a target to compare against.
  Codifying the orphaned spine is the cheap, mandatory first step.
