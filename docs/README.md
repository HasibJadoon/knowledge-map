# Docs Workflow

Markdown files that describe internal docs should live under `docs/wiki/`. Each file is keyed by slug (`quran-token-backbone.md` → `slug: "quran-token-backbone"`) and can optionally start with a small YAML front matter block:

```
---
title: Qur'an Token Backbone
status: published
tags: quran, tokens
---
```

Only `title`, `status`, and `tags` are parsed by the seeding script; the rest of the file is treated as the `body_md` source. Keep the body in Markdown so the UI can render it via `marked`.

To sync Markdown sources with the Cloudflare D1 `docs` table, run the seed helper:

```
node scripts/seed-docs.mjs
```

That script rewrites `database/migrations/seed-docs.sql` with `INSERT ... ON CONFLICT` statements that push every `docs/wiki/*.md` file into the `docs` table. After running the script, push the SQL to remote with:

```
npx wrangler d1 execute DB --remote --file database/migrations/seed-docs.sql
```

Repeat the script after every Markdown update before syncing the SQL file.
