# Quran Morphology Source Bundle

Source archive:

- `archives/quran-llm-2026-04-23.zip`

Extracted local SQLite inputs:

- `sources/qul/word/word-lemma.sqlite` - tables: `lemma_words`, `lemmas`
- `sources/qul/word/word-root.sqlite` - tables: `root_words`, `roots`
- `sources/qul/word/word-stem.sqlite` - tables: `stem_words`, `stems`
- `sources/qul/ayah/ayah-lemma.sqlite` - table: `lemmas`
- `sources/qul/ayah/ayah-root.sqlite` - table: `roots`
- `sources/qul/ayah/ayah-stem.sqlite` - table: `stems`
- `sources/masaq/masaq.sqlite` - table: `MASAQcsv`

Other source files:

- `sources/qac/quranic-corpus-morphology-0.4.txt`
- `references/links.docx`
- `references/lonqs.docx`

The extracted `.sqlite` files and QAC `.txt` export are ignored by Git as local
ingestion inputs. The archive is kept so the source bundle can be recreated if
needed.
