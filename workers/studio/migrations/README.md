# ST Migrations — km_studio

Co-located migration files for the `km_studio` D1 database.
Episode Studio: build podcast / tutorial / talking-head / conversation
episodes from reusable templates, then run live synced sessions.

## One-time setup

```bash
wrangler d1 create km_studio
# copy the printed database_id into workers/studio/wrangler.toml
```

## Apply

```bash
wrangler d1 migrations apply km_studio --remote --config workers/studio/wrangler.toml
wrangler d1 migrations list  km_studio --remote --config workers/studio/wrangler.toml
```

## Run Order

| File | Key Tables |
|------|-----------|
| 0001_st_studio.sql | st_templates, st_episodes, st_participants, st_sections, st_talking_points (+ 5 built-in templates) |
