# Lexicon Entry Embeddings

Level 1 vector layer:

`km_ar_lexicon_entries_v1 = one vector per ar_ling_lexicon_entries row`

SQL is canonical. Qdrant is only the semantic retrieval index.

## Config

Environment variables:

- `MODE=reset|resume|validate`
- `D1_DATABASE_NAME=km_arabic_linguistic`
- `WRANGLER_CWD=workers/ar-linguistics`
- `QDRANT_URL=http://localhost:6333`
- `QDRANT_API_KEY=` optional
- `QDRANT_COLLECTION=km_ar_lexicon_entries_v1`
- `EMBEDDING_PROVIDER=ollama`
- `EMBEDDING_URL=http://localhost:11434`
- `EMBEDDING_MODEL=bge-m3:latest`
- `EMBEDDING_DIMENSION=1024`
- `BATCH_SIZE=100`
- `MAX_RETRIES=3`
- `LIMIT=` optional smoke-test cap

## Run

Validate only:

```bash
MODE=validate node scripts/lexicon-entry-embeddings/run.mjs
```

Clean first run:

```bash
MODE=reset BATCH_SIZE=100 node scripts/lexicon-entry-embeddings/run.mjs
```

Resume:

```bash
MODE=resume BATCH_SIZE=100 node scripts/lexicon-entry-embeddings/run.mjs
```

Smoke test:

```bash
MODE=reset LIMIT=200 BATCH_SIZE=100 node scripts/lexicon-entry-embeddings/run.mjs
```

## Point IDs

Qdrant accepts unsigned integers or UUIDs as point ids. The SQL entry ids are
stable but are not valid Qdrant point-id strings because they contain prefixes
and separators. The pipeline therefore derives a deterministic UUID from each
`ar_ling_lexicon_entries.id`.

This is stable and idempotent:

- same SQL entry id
- same Qdrant point id
- reruns upsert the same point
- no duplicate vectors

The original SQL id is always stored as payload `entry_id` and in
`ar_ling_lexicon_entry_embeddings.entry_id`.

## Final Target

Expected successful final state:

```text
SQL entries: 80,759
Qdrant points: 80,759
Tracking rows: 80,759
Failed: 0
```
