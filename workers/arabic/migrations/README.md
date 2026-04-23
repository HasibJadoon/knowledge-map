# AR Migrations — km_arabic

Co-located migration files for the `km_arabic` D1 database.
**All tables use prefix `ar_*`. Linguistic truth uses `AL:ULID` typed refs — never duplicated here.**

## Apply

```bash
wrangler d1 migrations apply km_arabic --remote
wrangler d1 migrations list  km_arabic --remote
```

## Run Order (deploy after AL — AR references AL via typed refs)

| File | Key Tables |
|------|-----------|
| 001_ar_schema.sql | ar_containers, ar_vocabulary (lx_lemma_ref → AL), ar_grammar (lx_nahw_ref → AL), ar_applied_balagha (lx_balagha_ref → AL), ar_classes, ar_lessons, ar_exercises, ar_srs_cards |

Source: `database/migrations/km-arabic/001_ar_schema.sql`
