# QR Migrations — km_quran

Co-located migration files for the `km_quran` D1 database.
Wrangler reads from this directory via `migrations_dir = "migrations"` in `wrangler.toml`.

## Convention

Files are numbered `NNN_description.sql`. Apply in order.

## Apply

```bash
# Apply all pending migrations
wrangler d1 migrations apply km_quran --remote

# Check migration status
wrangler d1 migrations list km_quran --remote
```

## Source

Schema files originate from `database/migrations/km-quran/` in the monorepo root.
Copy new migration files here when promoting them to this worker.

## Migration order

| File | Description |
|------|-------------|
| 001_corpus_base.sql | qr_surahs, qr_ayah, qr_word_occurrences, qr_lemmas, qr_translations, qr_page_layout_lines |
| 002_surah_spine.sql | qr_surah_profiles, qr_surah_passages, qr_surah_openings, qr_surah_closures, qr_surah_structural_pivots |
| 003_meaning_and_reasoning.sql | qr_topic_registry, qr_analysis_claims, qr_arguments, qr_evidence_items |
| 004_sentence_structure.sql | qr_ss_occ_segment, qr_ss_occ_sentence, qr_ss_occ_clause, qr_ss_scope_*, qr_ss_tree_* |
| 005_reception_and_projections.sql | qr_tafsir_entries, qr_scholar_profiles, qr_worldview_nodes, qr_diagram_specs |
