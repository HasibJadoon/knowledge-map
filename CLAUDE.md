# K-MAPS Project Guide

> Last updated: 2026-04-23
> Read this at the start of each coding session. This file describes the current repo shape only.

## Current Shape

K-MAPS is an Islamic knowledge platform with Angular apps, Cloudflare Workers, and Cloudflare D1 databases.

Active top-level areas:

- `apps/k-maps/` - Angular web app.
- `apps/app-k-maps/` - Ionic/Angular app.
- `workers/` - all backend runtime code.
- `database/` - curated database assets, migrations, seeds, and ingestion inputs.
- `docs/` - architecture and workflow notes.
- `scripts/` - local generators, importers, and utility scripts.
- `resources/` - source learning and lexicon resources.

## Apps

The apps are kept as-is unless the user explicitly asks for app work.

Common commands:

```bash
npm run build -w apps/k-maps
npm run build -w apps/app-k-maps
npm run deploy:pages
npm run deploy:ionic
```

Angular conventions:

- Standalone components.
- Prefer Angular signals for local state.
- Keep route-level features lazy-loaded.
- Keep shared model and service code in existing app folders.
- Do not move app files during database or worker cleanup tasks.

## Workers

All backend code lives under `workers/`.

The public API entrypoint is:

- `workers/backend/` - `km-backend-worker`

Domain workers:

- `workers/quran/` - `km-quran-worker`, binding `DB_QR`, database `km_quran`
- `workers/ar-linguistics/` - `km-ar-linguistics-worker`, binding `DB_AL`, database `km_arabic_linguistic`
- `workers/arabic/` - `km-arabic-worker`, binding `DB_AR`, database `km_arabic`
- `workers/worldview/` - `km-worldview-worker`, binding `DB_WV`, database `km_worldview`
- `workers/content/` - `km-content-worker`, binding `DB_CM`, database `km_content`
- `workers/planner/` - `km-planner-worker`, binding `DB_PL`, database `km_planner`
- `workers/core/` - `km-core-worker`, binding `DB_CORE`, database `km_core`

Worker rules:

- Each domain worker owns exactly one D1 database.
- Cross-domain calls use Worker service bindings, not cross-database SQL.
- `workers/backend` is the only public gateway.
- Internal domain workers should stay `workers_dev = false`.
- Worker schema snapshots live at `workers/*/schema.sql`.
- Worker migrations live at `workers/*/migrations/`.

Common commands:

```bash
npm run dev:api
wrangler dev --config workers/backend/wrangler.toml --port 8788
wrangler deploy --config workers/backend/wrangler.toml
wrangler deploy --config workers/quran/wrangler.toml
```

## Domain Ownership

Hard ownership boundaries:

- QR owns Quran corpus, Quran structure, Quran claims, tafsir, reception, and Quran analysis.
- AL owns Arabic linguistic truth: roots, lemmas, morphology, syntax, balagha, lexicon, expressions.
- AR owns Arabic learning: curriculum, lessons, exercises, SRS, learner workflow.
- WV owns worldview reasoning: traditions, thinkers, claims, institutions, events, diagrams.
- CM owns authored content: documents, notes, captures, sources, media, publications.
- PL owns operational planning: plans, tasks, lanes, reviews, packets.
- CORE owns identity, workspaces, policies, roles, grants, and auth.

Typed references are the cross-domain contract:

```text
QR:<id>
AL:<id>
AR:<id>
WV:<id>
CM:<id>
PL:<id>
CORE:<id>
```

Do not duplicate canonical data across domains. Store typed references instead.

## Database Folder

`database/` is organized as:

- `database/data/` - curated source and generated data.
- `database/ingestion/` - raw source, staging, and output folders for imports.
- `database/migrations/` - service-specific D1 schema history.
- `database/seeds/` - generated seed SQL for `wrangler d1 execute`.
- `database/exports/` - exported CSV or SQL source data.
- `database/mockups/` - JSON fixtures for app and UI development.
- `database/docs/` - parser and data notes.
- `database/scratch/` - temporary working files kept for reference.
- `database/snapshots/` - small snapshot notes or placeholders.

Current migration folders:

```text
database/migrations/km-arabic/
database/migrations/km-arabic-linguistic/
database/migrations/km-arabic-linguistics/
database/migrations/km-content/
database/migrations/km-core/
database/migrations/km-lexicon/
database/migrations/km-planner/
database/migrations/km-quran/
database/migrations/km-worldview/
```

Generated seed files belong in `database/seeds/`, not directly in `database/migrations/`.

## Ingestion

Use `database/ingestion/` for files being prepared for D1 import.

Root ingestion:

- Raw roots: `database/ingestion/roots/sources/tarteel-ai/`
- Intermediate files: `database/ingestion/roots/staging/`
- Generated SQL/JSON: `database/ingestion/roots/outputs/`

Morphology ingestion:

- Raw archive: `database/ingestion/morphology/archives/quran-llm-2026-04-23.zip`
- Manifest: `database/ingestion/morphology/MANIFEST.md`
- QUL word sources: `database/ingestion/morphology/sources/qul/word/`
- QUL ayah sources: `database/ingestion/morphology/sources/qul/ayah/`
- QAC export: `database/ingestion/morphology/sources/qac/`
- MASAQ source: `database/ingestion/morphology/sources/masaq/`
- Intermediate files: `database/ingestion/morphology/staging/`
- Generated SQL/JSON: `database/ingestion/morphology/outputs/`

`.sqlite`, `.db`, and QAC source `.txt` files are local ingestion inputs and are ignored by Git. Keep manifests and raw archives when useful for reproducibility.

## D1 Notes

- Cloudflare D1 is SQLite-compatible but not identical to local SQLite.
- Foreign key declarations document intent; do not rely on runtime enforcement.
- Add explicit indexes for production query paths.
- Keep domain migrations close to the domain worker when possible.
- Use `workers/*/schema.sql` as current schema snapshots.

Useful commands:

```bash
wrangler d1 migrations apply km_quran --remote --config workers/quran/wrangler.toml
wrangler d1 execute km_quran --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Scripts

Important current generators/importers:

- `scripts/seed-docs.mjs` writes docs seed SQL into `database/seeds/`.
- `scripts/gen-quran-text-seed.js` writes Quran seed SQL into `database/seeds/`.
- `scripts/seed-ar-quran-synonyms.mjs` writes synonym seed SQL into `database/seeds/`.
- `scripts/export_quran_words_by_ayah.py` writes `database/seeds/seed-ar_quran_ayah_words.sql`.
- `scripts/import-tarteel-roots.py` reads roots from `database/ingestion/roots/sources/tarteel-ai/allroots.sql`.
- `scripts/regenerate_ar_u_roots_sql.py` writes root output to `database/ingestion/roots/outputs/roots-only.sql`.

Keep generated SQL out of service migration folders unless it is a true schema/data migration.

## Development Hygiene

- Use `rg` for searches.
- Do not touch unrelated app files during backend/database cleanup.
- Do not restore or delete user-local changes unless explicitly asked.
- Avoid committing ignored local source databases.
- Before committing cleanup work, run:

```bash
git diff --check
```

## Deployment

GitHub Actions:

- `.github/workflows/deploy-workers.yml` deploys domain workers and the backend worker.
- `.github/workflows/cloudflare-pages.yml` deploys `apps/k-maps`.
- `.github/workflows/cloudflare-pages-ionic.yml` deploys `apps/app-k-maps`.

Manual commands:

```bash
npm run deploy:pages
npm run deploy:ionic
wrangler deploy --config workers/backend/wrangler.toml
```

## Qurʾān Vocabulary / Morphology Study Step

For any work on the Surah → Passage → **Morphology** study step (vocabulary
backbone, Membean-style Memlet word view, or the per-Surah **SRS decks** at
`/srs` that feed Anki), read **`docs/quran-morphology-step-process.md`** first.
It is the canonical process memory: key tables across QR/AL/AR, the card
taxonomy, the Memlet→table mapping, the per-passage pipeline, and conventions.

## Current Priority

The repo is now worker-first and database assets are organized. New backend work should target `workers/`. New data import work should target `database/ingestion/`, then emit outputs to `database/seeds/` or the correct worker/domain migration path depending on whether the result is seed data or schema/data migration.
