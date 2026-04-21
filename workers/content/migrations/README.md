# CM Migrations — km_content

Co-located migration files for the `km_content` D1 database.
All authored artifacts. Access control uses CORE resource_grants — no ACL tables here.

## Apply

```bash
wrangler d1 migrations apply km_content --remote
wrangler d1 migrations list  km_content --remote
```

## Run Order (deploy after CORE — CM references CORE for ACL)

| File | Key Tables |
|------|-----------|
| 001_cm_schema.sql | cm_documents, cm_document_blocks, cm_notes, cm_captures, cm_highlights, cm_sources, cm_source_editions, cm_media, cm_publications |

Source: `Database/migrations/km-content/001_cm_schema.sql`
