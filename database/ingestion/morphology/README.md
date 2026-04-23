# Morphology Ingestion

## Layout

- `archives/` - raw downloaded bundles, kept before extraction.
- `references/` - source notes and links that explain where datasets came from.
- `sources/qul/word/` - QUL word-level SQLite sources:
  - `word-lemma.sqlite`
  - `word-root.sqlite`
  - `word-stem.sqlite`
- `sources/qul/ayah/` - QUL ayah-level SQLite sources:
  - `ayah-lemma.sqlite`
  - `ayah-root.sqlite`
  - `ayah-stem.sqlite`
- `sources/qac/` - Quranic Arabic Corpus morphology text exports.
- `sources/masaq/` - MASAQ SQLite source database.
- `staging/` - intermediate normalized files.
- `outputs/` - generated SQL/JSON outputs ready for D1 imports.

The extracted `.sqlite` files and QAC `.txt` export are local ingestion inputs
and are ignored by Git. Keep the original downloaded archive in `archives/` so
the source bundle can be re-extracted if needed.
