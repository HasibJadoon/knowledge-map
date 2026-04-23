# PL Migrations — km_planner

Co-located migration files for the `km_planner` D1 database.
Operational execution only. All resource content is stored as typed refs.

## Apply

```bash
wrangler d1 migrations apply km_planner --remote
wrangler d1 migrations list  km_planner --remote
```

## Run Order (deploy last — PL refs all other modules via typed refs)

| File | Key Tables |
|------|-----------|
| 001_pl_schema.sql | pl_plans, pl_plan_scopes, pl_tasks, pl_task_resources, pl_lanes, pl_review_cycles, pl_review_packets, pl_review_packet_items |

Source: `database/migrations/km-planner/001_pl_schema.sql`
