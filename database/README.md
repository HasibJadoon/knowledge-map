# Database Assets

This folder holds local database assets, seed data, migration history, and mock data used by the knowledge-map apps and workers.

## Layout

- `data/` - source and generated data used for imports or seed generation.
- `ingestion/` - source, staging, and output folders for active import workflows.
- `migrations/` - service-specific D1 schemas plus `legacy/` one-off migration history.
- `seeds/` - generated seed SQL applied with `wrangler d1 execute`.
- `exports/` - exported CSV/SQL source data.
- `mockups/` - JSON fixtures for app model and UI development.
- `docs/` - parser and data notes that are not executable migrations.
- `scratch/` - temporary working files kept for reference.
- `snapshots/` - small database snapshot notes or placeholders.

The old top-level `schema.sql` has been removed. Current worker schema snapshots live in `workers/*/schema.sql`.
