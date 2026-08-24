# km_planner retirement archive

Planning moved to the CYB control loop in `km_core` (`cyb_*`). The
`km-planner-worker`, its app/web surfaces, and the `km_planner` database were
retired on 2026-08-24.

## Why it was safe

Every `pl_*` planning table was **empty** at retirement — 0 plans, 0 tasks,
0 lanes, 0 goals, 0 sessions, 0 packets, 0 review cycles. The model was
designed and never used.

The `cp_*` tables in `km_planner` were the predecessor of the `cyb_*` control
plane and had already been superseded by a much richer implementation in
`km_core`:

| Concept | km_planner (`cp_*`) | km_core (`cyb_*`) |
|---|---:|---:|
| node       | 54 | 1990 |
| build job  | 43 |  445 |
| config     |  6 |   60 |
| tick       |  1 |   48 |
| production |  5 |   12 |
| edge       |  2 |   11 |
| gauge      |  4 |    4 |
| domain     |  8 |    5 |

## What is archived here

| File | Rows | What |
|---|---:|---|
| `sp_planner.json` | 45 | Weekly-sprint items — `week_plan`, `task`, `sprint_review`. The only substantial user content in the database. |
| `pl_capture_notes.json` | 3 | Capture notes, all already `status = retired` and containing test text. |

The `cp_*` rows were not archived: they are control-plane scaffolding that
`cyb_*` supersedes with 10–35x the data, and they hold no user content.

Restoring `sp_planner` means loading `sp_planner.json` into whatever CYB table
takes over weekly sprints — the shape is `id, canonical_input, core_user_ref,
item_type, week_start, period_start, period_end, related_type, related_id,
item_json, status, created_at, updated_at`.
