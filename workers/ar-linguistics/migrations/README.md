# AL Migrations — km_arabic_linguistic

Co-located migration files for the `km_arabic_linguistic` D1 database.
**All tables use the single prefix `ar_ling_*`. There is no `al_*` prefix anywhere.**

## Apply

```bash
wrangler d1 migrations apply km_arabic_linguistic --remote
wrangler d1 migrations list  km_arabic_linguistic --remote
```

## Run Order (deploy this DB first — no dependencies)

| File | Layer | Key Tables |
|------|-------|------------|
| 001_al_schema.sql | 1–10 | ar_ling_roots → ar_ling_lemmas → ar_ling_morphology → ar_ling_nahw_concepts → ar_ling_balagha_concepts → ar_ling_lexicon_entries → ar_ling_senses → ar_ling_expressions → ar_ling_sources → ar_ling_bridges |

Source: `Database/migrations/km-arabic-linguistic/001_al_schema.sql`
