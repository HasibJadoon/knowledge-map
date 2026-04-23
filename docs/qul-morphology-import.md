## Import Word-Level QUL Morphology

This repository uses the **ar_u_tokens** table as the canonical token layer.  The script at `scripts/import-qul-word-lemmas.py` ingests the QUL (quranic-universal-library) **word-level lemma** dataset, links every record to its root, and stores just the `lemma + pos` identity (per the instructions you provided).

### 1. Download the required datasets

1. Visit the [QUL morphology resource list](https://qul.tarteel.ai/resources/morphology) and sign in.  The **Word lemma** dataset (ID 75, word-by-word) is the primary source; grab its SQLite file and place it somewhere under this repo (for example, `database/ingestion/morphology/sources/qul/word/word-lemma.sqlite`).
2. Download the **Word root** dataset (ID 76, word-by-word).  The script only needs it to map each word location to its root; nothing is inserted from the root file itself.
3. (Optional but strongly recommended) export a mapping of `word_location → part of speech` from the Word POS / Grammar tool.  The script accepts a CSV/JSON `--pos-file` where each row contains `word_location` and `pos`.  Use the QUL concordance/grammar UI or your own export to generate that file so POS labels can be canonicalized.

> **Note:** Direct downloads from QUL require authentication.  If you cannot download automatically, grab the `.sqlite` files through the UI, then keep track of their paths for `--lemmas-db` and `--roots-db`.

### 2. Normalization + canonical identity

The script follows the normalization rules you described:

- **Remove harakat** using a hard-coded pattern that strips all combining marks before hashing.
- **Normalize** letters before hashing:
  - `أ`, `إ`, `آ` → `ا`
  - `ى` → `ي`
  - `ة` → `ه`
  - Collapse whitespace and trim the lemma.
- The normalized lemma becomes `lemma_ar_norm`.  The canonical hash is computed as `sha256(lemma_ar_norm|pos)` when a POS is available; otherwise only `lemma_ar_norm` is hashed, but the script still stores a fallback POS (`noun`).

POS values are normalized into the allowed `ar_u_tokens` set (`verb`, `noun`, `adj`, `particle`, `phrase`).  The raw POS label is preserved under `meta_json.pos_label` so you can revisit it later.  If you want a different canonical mapping, modify the `POS_KEYWORDS` table in the script.

### 3. Linked roots

Each lemma’s `word_location` is joined with the **Word Root** dataset’s `word_roots` table to find the matching `root_id`.  That root’s Arabic form is normalized (spaces/harakat removed) and matched against `ar_u_roots.root`, so we insert the proper `ar_u_root` foreign key and compute a simple root norm (`english|arabic`) for indexing.

If the root is missing (e.g., the dataset does not cover the location), `root_norm` and `ar_u_root` remain `NULL`, but the lemma is still inserted for downstream usage.

### 4. Running the import

```bash
./scripts/import-qul-word-lemmas.py \
  --lemmas-db database/ingestion/morphology/sources/qul/word/word-lemma.sqlite \
  --roots-db database/ingestion/morphology/sources/qul/word/word-root.sqlite \
  [--pos-file database/ingestion/morphology/sources/qul/word/word-pos.csv] \
  --target-db database/d1.db
```

- `--pos-file` is optional; omit it if you haven’t prepared a POS map yet.
- `--dry-run` prints the `INSERT` parameters instead of touching the DB.
- Existing `(lemma_norm, pos)` combinations are skipped to prevent duplicates.
- The script uses `ON CONFLICT` to keep the DB idempotent and to refresh metadata (status + meta_json).

### 5. What is stored in `ar_u_tokens`

Each imported row includes:

- `ar_u_token`: `sha256(lemma_ar_norm|pos)`
- `canonical_input`: the same string that was hashed.
- `lemma_ar`: the original lemma (with tashkeel if it existed).
- `lemma_norm`: the normalized lemma used for deduping.
- `pos`: the canonical POS value (falling back to `noun` when none).
- `root_norm`: `english_trilateral|arabic_trilateral` when available.
- `ar_u_root`: foreign key to the matching root (if found).
- `meta_json`: `{"source":"qul_word_lemma","pos_label":"Original label","word_location":"2:3:5"}`.

### 6. Next steps

1. After tokens are in place, you can apply lexicon-level work (`ar_u_lexicon`) manually or via later scripts.
2. If you later obtain a richer POS/grammar export, rerun the script with a new `--pos-file` to refresh canonical POS values and metadata; unchanged tokens retain their SHA identity.
