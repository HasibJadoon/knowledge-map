# WV Migrations — km_worldview

Co-located migration files for the `km_worldview` D1 database.
10-layer civilizational reasoning engine. Deploy after QR, AL, and CM.

## Apply

```bash
wrangler d1 migrations apply km_worldview --remote
wrangler d1 migrations list  km_worldview --remote
```

## Run Order

| File | Layers | Key Tables |
|------|--------|-----------|
| 001_wv_schema.sql | L1–L10 | wv_traditions, wv_thinkers, wv_sources, wv_source_units, wv_nodes, wv_node_edges, wv_brainstorms, wv_comparisons, wv_comparison_columns, wv_comparison_cells, wv_distill_batches, wv_insight_suggestions, wv_insight_decisions |

Source: `database/migrations/km-worldview/001_wv_schema.sql`
