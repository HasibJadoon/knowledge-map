# iʿrāb display layer — deep gap report

Based on real D1 data (25,725 chunks · 124,774 entries · 6 sources) and the
five on-disk source SQLite DBs in `km_arabic_linguistic/ingestion/Irrab/`.
This report rewrites the design assumptions behind the initial `qr_iraab_*`
migration (011). Every gap below is grounded in a query or a sampled row.

## TL;DR
1. **Re-parse from chunks is the wrong path.** `qr_irab_book_entries` already
   contains 124,774 word-level entries with `target_text_ar`, `grammar_role_ar`,
   `grammar_case_ar`, `mahal_ar`, `irab_text_ar`, and `alternative_json` —
   structurally cleaner than re-extracting from HTML.
2. **Two bracket styles, both used.** `(word)` (Al-Jadwal, Darwish) **and**
   `﴿word﴾` ornamental Qur'anic brackets (Muyassar, Daas). The original
   parser handled only the first → 9,869 chunks worth of targets silently
   missed.
3. **Groups are real and substantial.** Darwish: 85% of chunks span multiple
   ayāt; Daas: 32%; Tibyan: 14%. The TEXT `ayah_keys` column ("2:1,2:2,…") is
   the canonical source.
4. **Integer columns are unreliable.** Al-Jadwal has `ayah_from=NULL` AND
   `ayah_to=NULL` for **all 7000 chunks**. Must drive group logic from the
   TEXT columns.
5. **`dep_graph` chunks are SVG pointers, not text.** 2,369 chunks have
   `content_format='svg_ref'` with `clean_text` = JSON blob to R2.
6. **A 6th section kind exists.** Darwish uses `language` (vocabulary /
   etymology) — 867 chunks. Not in the original 4-section vocab.
7. **Major data loss on Darwish ingest.** Source DB has 6,236 rows, only 1,387
   anchor groups reached D1 (4,849 follower stubs correctly dropped). Net: 78%
   of source rows are stubs, fine — but the resulting 1,387 anchors expand to
   ~4.5 ayāt each, so group rendering is essential.
8. **All 124k entries are review-pending.** `word_link_status='pending'` for
   every row; zero linked to `qr_word_occurrences`. The display layer is the
   reviewer's UI, not a passive viewer.

---

## 1. Per-source profile (D1)

| source_slug              | chunks | distinct ayah_keys | distinct groups | entries | text bracket | section kinds in chunks       |
| ------------------------ | -----: | -----------------: | --------------: | ------: | ------------ | ----------------------------- |
| `qul_jadwal_irab_quran`  | 7,000  | 3,216              | 3,216           | 36,180  | `(word)`     | irab, sarf, balagha, fawaid   |
| `qul_irab_muyassar`      | 6,236  | 6,236              | 6,236           | 20,348  | `﴿word﴾`     | irab (only)                   |
| `qul_irab_quran_daas`    | 3,633  | 3,633              | 3,633           | 59,160  | `﴿word﴾`     | irab (only)                   |
| `qul_irab_darwish`       | 3,586  | 1,387              | 1,387           | 3,351   | `(word)`     | language, irab, sarf, balagha |
| `tibyan_ukbari_irab`     | 2,901  | 2,901              | 2,901           | 5,735   | `(word)`     | irab (only) — sparse roles    |
| `qul_dep_graphs`         | 2,369  | 2,369              | 2,369           |  —      | n/a (SVG)    | dep_graph                     |
| **TOTAL**                | **25,725** | —              | —               | **124,774** | —        | —                             |

Notes:
- "distinct ayah_keys == distinct groups" everywhere because D1 stores only
  **anchor rows** (follower stubs are filtered during import). The grouping is
  in the `ayah_keys` TEXT field, not in distinct row counts.
- Daas has 59,160 entries from 3,633 chunks → **avg 16.3 word entries per chunk**.
  This is by far the most granular source, and the strongest candidate for an
  entry-driven UI.

## 2. The two bracket conventions

```text
Al-Jadwal:  (الذين) اسم موصول مبني على الفتح في محل جر نعت ل (المتقين) .
Darwish:    (الم) كلمة أريد لفظها دون معناها في محل رفع خبر لمبتدأ محذوف...
Muyassar:   ﴿الذين﴾: اسم موصول في محل جر صفة للمتقين.
Daas:       ﴿وَالْعادِياتِ﴾ جار ومجرور متعلقان بفعل قسم محذوف
```

`﴿` = U+FD3F (ornate left parenthesis), `﴾` = U+FD3E (ornate right). Used
specifically to mark Qur'an quotations. The original parser's regex
`^\s*\(([^)]+)\)\s*` matches zero Muyassar/Daas targets.

**Fix**: parser must accept either style with `[\(﴿]([^\)﴾]+)[\)﴾]`.

Also visible above: Muyassar uses **harakat-stripped** target words (الذين),
Daas uses **fully voweled** (وَالْعادِياتِ), Al-Jadwal mostly unvoweled, Darwish
sometimes voweled inside the body. Tag normalization needs both forms.

## 3. Group semantics — what's actually stored

On-disk pattern (every iʿrāb DB, identical `tafsir(ayah_key, group_ayah_key,
from_ayah, to_ayah, ayah_keys, text)` schema):

```text
ayah_key  group_ayah_key  from_ayah  to_ayah  ayah_keys              text
3:131     3:131           3:131      3:133    3:131,3:132,3:133      <full iʿrāb HTML>     ← ANCHOR
3:132     3:131           (empty)    (empty)  (empty)                (empty)               ← FOLLOWER STUB
3:133     3:131           (empty)    (empty)  (empty)                (empty)               ← FOLLOWER STUB
```

Importers correctly drop follower stubs. Anchors land in D1 with:
- TEXT cols populated: `from_ayah`, `to_ayah`, `ayah_keys` ✓
- INTEGER cols: populated for Darwish/Daas/Tibyan, **NULL for Al-Jadwal/Muyassar**.

Canonical group key form should be: `"3:131-3:133"` (single-ayah groups
collapse to `"3:131"`). Computed from `from_ayah` + `to_ayah` if `from != to`,
else just `ayah_key`. **Never trust integer cols for span detection.**

| field         | reliability for group span                                     |
| ------------- | -------------------------------------------------------------- |
| `ayah_keys`   | ★★★★★ — 100% populated, canonical comma-separated list         |
| `from_ayah`/`to_ayah` (TEXT) | ★★★★★ — 100% populated                          |
| `ayah_from`/`ayah_to` (INT)  | ★★★ — al-jadwal=NULL, muyassar=single-only      |
| `group_ayah_key`             | ★★ — equals `ayah_key` post-import (anchors only) |

## 4. `dep_graph` content shape

```json
{"r2_key":"dep-graphs/3/3:131.svg","svg_bytes":13276,"source_db":"ayah-dependency-graphs.db"}
```

Stored in `clean_text` as JSON. `raw_html`/`raw_text` are NULL. The actual SVG
is in Cloudflare R2 (bucket inferred from worker bindings — needs verification).

**Implication**: display layer needs a `dependency_graph` block_type with a
column for the R2 key + size, and a route that streams the SVG.

## 5. Section kinds — actual distribution (from query 02)

| section_kind | content_format | rows   |
| ------------ | -------------- | -----: |
| irab         | text           | 14,155 |
| irab         | html           |  3,211 |
| dep_graph    | svg_ref        |  2,369 |
| sarf         | html           |  1,849 |
| fawaid       | html           |    976 |
| balagha      | html           |    964 |
| **language** | **text**       |    **867** |
| balagha      | text           |    766 |
| fawaid       | text           |    568 |

Two surprises:
- `language` is real and meaningful (Darwish-specific) — vocabulary, etymology,
  voweling notes. Not represented in the original SECTION_TO_BLOCK map.
- Same `section_kind` exists in both `text` and `html` content_format — the
  parser must branch on format, not only on section.

## 6. The entries-vs-chunks projection question

The `qr_irab_book_entries` table is dramatically richer than I assumed during
the first migration. Sample for Surah 2:3:

```
qul_irab_muyassar | target=(الذين) | role=في محل جر | case=NULL  | mahal=في محل جر
qul_irab_muyassar | target=(يؤمنون) | role=صلة الموصول | case=مرفوع | mahal=في محل رفع
qul_jadwal_irab_quran | target=(الذين) | role=في محل جر | case=مبني | mahal=في محل جر
  alt: [{"note":"ويجوز أن يكون في محلّ رفع خبر لمبتدأ محذوف..."}]
```

For an `irab_card` block, the entries table provides:
- `target_text_ar` → card title / word badge
- `grammar_role_ar` → primary role chip ("جار ومجرور", "صلة الموصول")
- `grammar_case_ar` → case chip (مرفوع/منصوب/مجرور/مبني)
- `mahal_ar` → maḥall chip
- `irab_text_ar` → card body
- `alternative_json` → footnote notes (one per alternative)
- `inline_note_ar` → secondary inline footnote
- `source_quote_ar` → for source_quote sub-block

**Population per source:**

| source                  | entries | has_target | has_role | has_case | has_mahal | has_alts | has_inline_note |
| ----------------------- | ------: | ---------: | -------: | -------: | --------: | -------: | --------------: |
| qul_irab_quran_daas     | 59,160  |     100%   |   76%    |   17%    |   13%     |    0%    |        0%       |
| qul_jadwal_irab_quran   | 36,180  |     100%   |   95%    |   25%    |   73%     |    9%    |        8%       |
| qul_irab_muyassar       | 20,348  |     100%   |   92%    |   61%    |   41%     |    0%    |        0%       |
| tibyan_ukbari_irab      |  5,735  |     100%   |   46%    |    4%    |    0%     |    0%    |        0%       |
| qul_irab_darwish        |  3,351  |     100%   |   94%    |   45%    |   30%     |    0%    |        0%       |

Conclusion: **always project `irab_card` blocks from `qr_irab_book_entries`**.
The chunk-based regex parser is for everything else (section headings, sarf,
balagha, fawaid, language, dep_graph). This is far more accurate than
re-parsing the same HTML my colleagues' importers already parsed.

## 7. Data quality issues I should NOT fix in this layer

- `ayah_from`/`ayah_to` NULL for Al-Jadwal chunks (importer bug).
- Tibyan source DB not on disk (came in via a different ingestion path).
- 124,774 entries with `word_link_status='pending'` — that's the analysis
  layer's job, not display layer.
- Daas's low `has_case` (17%) and Tibyan's `has_mahal=0%` — they just don't
  emit those fields in the source text. Display gracefully degrades.

Flag these in a separate ingestion-quality ticket. The display layer must
**tolerate** them, not patch them.

## 8. Schema changes (additive to 011)

```sql
-- Add to qr_iraab_book_display_blocks:
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN ayah_key TEXT;
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN ayah_group_key TEXT;       -- "2:1-5" canonical, "2:3" for singletons
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN ayah_keys_json TEXT;       -- ["2:1","2:2","2:3","2:4","2:5"]
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN is_grouped INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN source_entry_id TEXT;      -- → qr_irab_book_entries.id when projected from entries
ALTER TABLE qr_iraab_book_display_blocks ADD COLUMN external_resource_json TEXT; -- {"r2_key":"…","kind":"svg","bytes":N}

CREATE INDEX idx_iraab_block_group ON qr_iraab_book_display_blocks (ayah_group_key);
CREATE INDEX idx_iraab_block_entry ON qr_iraab_book_display_blocks (source_entry_id);

-- Same group cols on refs + notes for filter performance:
ALTER TABLE qr_iraab_book_display_refs  ADD COLUMN ayah_group_key TEXT;
ALTER TABLE qr_iraab_book_display_notes ADD COLUMN ayah_group_key TEXT;
CREATE INDEX idx_iraab_ref_group ON qr_iraab_book_display_refs (ayah_group_key);
CREATE INDEX idx_iraab_note_group ON qr_iraab_book_display_notes (ayah_group_key);
```

Add to `block_type` vocab: `dependency_graph`, `language_note`.
Add to `scope_type` vocab: `ayah_group` (alias of `ayah_range`).

## 9. Parser rewrite (three phases)

| phase | input                                | output blocks                                                 |
| ----- | ------------------------------------ | ------------------------------------------------------------- |
| A     | `qr_irab_book_entries`               | one `irab_card` per entry. alternatives → footnote notes.     |
| B     | `qr_irab_source_chunks` WHERE section_kind IN ('sarf','balagha','fawaid','language') | section heading + per-paragraph note blocks (`sarf_note`, `balagha_note`, `key_insight`, `language_note`). |
| C     | `qr_irab_source_chunks` WHERE content_format='svg_ref' | one `dependency_graph` block with `external_resource_json`.   |
| (drop) | `qr_irab_source_chunks` WHERE section_kind='irab' | redundant with Phase A; only emit a section heading.        |

Phase A makes the parser linear and exhaustive; Phase B/C cover the
non-word-level content the entries table doesn't capture.

Bracket regex must be Unicode-aware:
```js
const TARGET_RE = /^\s*[\(\u{FD3F}]([^\)\u{FD3E}]+)[\)\u{FD3E}]\s*/u;
```

Group fields computed once per chunk/entry:
```js
const keys = String(row.ayah_keys || row.ayah_key).split(',').map(s => s.trim()).filter(Boolean);
const ayahGroupKey = keys.length > 1 ? `${keys[0]}-${keys[keys.length - 1].split(':')[1]}` : keys[0];
const isGrouped = keys.length > 1 ? 1 : 0;
```

## 10. UI rendering implications

- **Routing by group, not ayah**: `GET /qr/iraab/display?surah=2&ayah=3` should
  resolve to the group spanning 2:3 (per source) and return all blocks for
  that group. UI shows the group header "2:1-5" and renders blocks for the
  whole span.
- **Source switcher reveals different granularities**: Daas gives ~16 cards
  per ayah; Tibyan ~2. UI should not assume parity across sources.
- **`dependency_graph` block** renders inline SVG (proxied through the worker
  → R2). Treat it as a media block, separate from text cards.
- **Voweling preference**: track per-user — some readers want fully voweled
  Daas targets, others prefer Muyassar's stripped form. Store the raw form
  on the block; normalize for tag matching only.

---

## What's in `database/scratch/iraab-analysis/`

| file                            | what it contains                                        |
| ------------------------------- | ------------------------------------------------------- |
| `01-by-source.json`             | chunks/distinct/group counts per source                 |
| `02-section-format.json`        | section_kind × content_format distribution              |
| `03-chunks-5000.json`           | (skipped — superseded by 01/02/03 + content samples)    |
| `04-content-samples.json`       | full content for 30 chunks across all sources / ayāt    |
| `05-entries-by-source.json`     | entries population + grammar field coverage per source  |
| `GAP-REPORT.md`                 | this file                                               |

These can stay in `scratch/` per the CLAUDE.md convention (temporary working
files kept for reference).
