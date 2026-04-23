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

---

## Ingestion Run — 2026-04-23

**Script:** `scripts/ingest-morphology.py`

**Sources consolidated:**

| Source | File | Rows |
|--------|------|------|
| QUL word-root | `sources/qul/word/word-root.sqlite` | 1,642 roots / 50,298 word→root links |
| QUL word-lemma | `sources/qul/word/word-lemma.sqlite` | 4,817 lemmas / 72,510 word→lemma links |
| QUL word-stem | `sources/qul/word/word-stem.sqlite` | 12,113 stems / 77,427 word positions |
| MASAQ | `sources/masaq/masaq.sqlite` | 157,853 segments → 77,411 full-word texts |
| QAC | `sources/qac/quranic-corpus-morphology-0.4.txt` | 128,276 segments → 77,429 STEM entries |

**Outputs generated:**

| Seed file | Target table | DB | Rows |
|-----------|-------------|-----|------|
| `seed-al-roots.sql` | `ar_ling_roots` | km_arabic_linguistics | 1,642 |
| `seed-al-lemmas.sql` | `ar_ling_lemmas` | km_arabic_linguistics | 4,817 |
| `seed-qr-word-occurrences.sql` | `qr_word_occurrences` | km_quran | 77,427 |
| `backfill-qr-word-occurrences-morphology-tag-json.sql` | `qr_word_occurrences.morphology_tag_json` JSON column | km_quran | 77,424 |
| `seed-qr-lemmas.sql` | `qr_lemmas` | km_quran | 4,817 |
| `seed-qr-lemma-occurrences.sql` | `qr_lemma_occurrences` | km_quran | 72,507 |

**Data provenance per column:**

- `qr_word_occurrences.word_text` — MASAQ `Word` column (full word with diacritics, incl. attached particles); falls back to QUL stem text (22 words)
- `qr_word_occurrences.root` — QUL `arabic_trilateral` (spaces stripped); QAC Buckwalter conversion fallback
- `qr_word_occurrences.lemma` — QUL `lemmas.text`; QAC Buckwalter conversion fallback
- `qr_word_occurrences.pos / morphology_tag` — QAC TAG + FEATURES columns (3 words missing)
- `qr_word_occurrences.morphology_tag_json` — SQLite/D1 `JSON` column with a `json_valid()` check; structured companion to `morphology_tag`, including QAC source, raw STEM tag, parsed stem features, and all QAC word segments (prefix/stem/suffix where present)
- `ar_ling_roots.weak_pattern` — computed from root letter composition (mithal/ajwaf/naqis/mudha'af/mahmuz/sound)
- `ar_ling_lemmas.root_id` — voted from word-position cross-reference (QUL root_words ∩ lemma_words); NULL for 177 particle/pronoun lemmas with no trilateral root

**FK integrity:** 0 missing root_ids in ar_ling_lemmas (177 intentionally NULL for particles).

**Deploy commands:**

```bash
# km_arabic_linguistics
wrangler d1 execute km_arabic_linguistics \
  --file=database/seeds/seed-al-roots.sql --remote \
  --config workers/ar-linguistics/wrangler.toml

wrangler d1 execute km_arabic_linguistics \
  --file=database/seeds/seed-al-lemmas.sql --remote \
  --config workers/ar-linguistics/wrangler.toml

# km_quran
wrangler d1 execute km_quran \
  --file=database/migrations/km-quran/008_word_occurrence_morphology_tag_json.sql --remote \
  --config workers/quran/wrangler.toml

wrangler d1 execute km_quran \
  --file=database/migrations/km-quran/009_word_occurrence_morphology_tag_json_type.sql --remote \
  --config workers/quran/wrangler.toml

wrangler d1 execute km_quran \
  --file=database/seeds/seed-qr-word-occurrences.sql --remote \
  --config workers/quran/wrangler.toml

wrangler d1 execute km_quran \
  --file=database/seeds/backfill-qr-word-occurrences-morphology-tag-json.sql --remote \
  --config workers/quran/wrangler.toml

wrangler d1 execute km_quran \
  --file=database/seeds/seed-qr-lemmas.sql --remote \
  --config workers/quran/wrangler.toml

wrangler d1 execute km_quran \
  --file=database/seeds/seed-qr-lemma-occurrences.sql --remote \
  --config workers/quran/wrangler.toml
```

**Order matters:** roots before lemmas (FK). word-occurrences before lemma-occurrences (FK).
