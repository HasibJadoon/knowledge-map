# tafsir display layer — comprehensive gap report (v2)

End-to-end recon across four layers:
1. **D1 entries** (25,665 rows in `qr_tafsir_entries`, 10 scholars)
2. **On-disk SQLite DBs** (8 files, 6,236 rows each, full-population aggregates +
   3000-sample content analysis per source)
3. **Worker API** (`workers/quran/src/routes/tafsir.ts` + `tafsir.repo.ts` + the
   `workers/backend` composite gateway)
4. **Ionic UI** (`apps/app-k-maps/src/app/features/quran/al-quran/tafseer/`)

---

## A. The full data path today

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                IONIC UI                                     │
│  TafseerPageComponent (single-work view)                                    │
│  • signal<QrScholarWork[]> works                                            │
│  • signal<QrTafsirEntry[]> entries  ← grouped by ayah_from in computed()    │
│  • madhabLabel: sunni→سني, mutazili→معتزلي, …                              │
│  Calls: api.getWorks('tafsir'), api.getTafsirEntries(surah, workId)         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTPS GET {apiBase}/qr/works?work_type=tafsir
                                 │ HTTPS GET {apiBase}/qr/tafsir?surah=N&work_id=W
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND GATEWAY (workers/backend)                     │
│  • /api/qr/* → service-binding fetch into env.QURAN                         │
│  • Composite: /api/quran/:surah/:ayah/sources                               │
│      fan-out → AL bundle + qr/tafsir + qr/translations, returns one payload │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ env.QURAN.fetch(/qr/tafsir?surah=N&ayah=M)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   QURAN WORKER (workers/quran/src/routes/tafsir.ts)         │
│  Routes:                                                                    │
│    GET /qr/scholars       → qr_scholar_profiles + entry counts              │
│    GET /qr/works[?type]   → qr_scholar_works + scholar join + entry counts  │
│    GET /qr/tafsir         → qr_tafsir_entries WHERE surah=… ayah_from<=…    │
│                              ayah_to>=…  + ayah text + scholar/work join    │
│    GET /qr/tafsir/by-ids  → batch fetch by ID                               │
│  Repo (tafsir.repo.ts, 802 lines): entries, scholars, works, paradigms,     │
│    scholar_positions, reception_histories, interpretive_diffs (CRUD)        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ D1 prepare/bind/all
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLOUDFLARE D1 (km_quran)                         │
│  qr_tafsir_entries     ← 25,665 rows, content_ar avg 4-12k, max 42,832     │
│  qr_scholar_profiles   ← 10 scholars, name+kunya+laqab+era+madhab+death_AH  │
│  qr_scholar_works      ← work_type, composition_year, volumes, …            │
│  qr_scholarly_paradigms, qr_scholar_paradigm_links                          │
│  qr_scholar_positions  ← typed stance on specific issues                    │
│  qr_surah_reception_histories  ← per-surah reception trajectory             │
│  qr_interpretive_diffs ← scholar-vs-scholar disagreement records            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key observation about the existing stack:** the worker repo is rich (paradigms,
positions, reception, diffs already modeled), but the UI only consumes the
flat `qr_tafsir_entries` projection. There's a lot of latent value behind the
flat list view.

---

## B. UI's current model — what it asks for, what it gets

`QrTafsirEntry` (TS interface in the UI, served by `/qr/tafsir`):
```ts
{
  id, surah, ayah_from, ayah_to,
  content_ar,                                       // ← the entire 4-42k-char body
  content_en,                                       // ← always null today
  source_page,
  scholar: { name_ar, name_en } | null,
  work:    { title_ar, title_en } | null,
  ayah_text                                         // joined from qr_ayah
}
```

**UI render path** (`tafseer-page.component.ts:62-70`):
```ts
ayahGroups = computed<AyahGroup[]>(() => {
  // Groups entries by ayah_from. Each group has the ayah_text once + a list
  // of entries (typically one per work since UI shows one work at a time).
});
```

So the UI:
- Picks ONE work at a time (`selectedWork`)
- Loads all entries for that work × the chosen surah (up to 300 per page)
- Groups by `ayah_from` (so multi-ayah anchor entries land on their first ayah)
- Renders `content_ar` straight into the DOM (no segmentation, no HTML stripping)
- Translates `madhab` to Arabic for a chip

**Gaps the UI doesn't address (and the display layer should):**
1. Entries up to 42KB get dumped as a single DOM blob → scroll fatigue.
2. HTML embedded in `content_ar` is rendered raw — works for some sources
   (Ālūsī's full `<span class="qpc-hafs">` stack), broken for others
   (Zamakhsharī has no markup, Ṭabarī uses literal `<h3>* *</h3>`).
3. Multi-scholar side-by-side comparison is impossible — UI tied to a single
   `selectedWork`.
4. Search across tafsir is missing (no FTS5).
5. Isnād chains in Ṭabarī (3,024 rows!) and Ibn Kathīr (203 rows) render as
   walls of text. Should be visually structured.
6. Editorial asides `[[…]]` (1,952 rows in Zamakhsharī, 2,288 in Ṭabarī) are
   indistinguishable from body text.
7. Cross-reference chips like `<span class="ayah-tag">[الكافرون:١]</span>`
   (3,670 instances in Ibn ʿĀshūr alone) should be clickable.

---

## C. On-disk findings (full-population aggregates over 49,888 rows)

All 8 DBs share `tafsir(ayah_key, group_ayah_key, from_ayah, to_ayah, ayah_keys, text)`,
each exactly **6,236 rows** (one per ayah; followers are empty stubs pointing to
anchor via `group_ayah_key`).

| source | anchors | followers | multi-ayah anchors | largest group | p50 | p90 | max | char of avg |
|---|---:|---:|---:|---|---:|---:|---:|---|
| Ālūsī | 5,629 | 607 | 463 | 8 ayāt | 3,103 | 11,284 | 97,652 | per-ayah, heavy |
| Ibn ʿĀshūr | 3,923 | 2,313 | 1,224 | 14 ayāt | 2,944 | 11,299 | 63,322 | grouped, heavy |
| Ṭabarī | 3,636 | 2,600 | 1,334 | — | — | — | 87,445 | grouped, isnād |
| Rāzī | 2,969 | 3,267 | 1,440 | 33 ayāt | 0¹ | 12,083 | 92,321 | huge groups, fuṣūl |
| **Zamakhsharī** | 2,978 | 3,258 | 1,409 | 22 ayāt | 0¹ | **2,880** | 29,384 | **3× leaner** |
| Ibn ʿAṭiyya | 1,672 | 4,564 | 1,458 | — | — | 6,200 | 25,478 | tight, Maghribī |
| Ibn Kathīr | 1,911 | 4,325 | 1,421 | — | — | 7,700 | 73,841 | hadith chains |
| **Abū Ḥayyān** | **1,427** | **4,809** | 843 | **49 ayāt** | 0¹ | 12,147 | 61,305 | super-grouped, grammar |

¹ p50=0 means median row is an empty follower stub; per-source these get
filtered out before display.

### Per-source HTML/markup tier

| tier | sources | markup stack |
|---|---|---|
| **A. Full stack** | Ālūsī, Ibn ʿĀshūr, Rāzī | `<div class=ar>`, `<p>`, `<span class="hlt">`, `<span class="qpc-hafs">`, `<span class="ayah-tag">`, `<p class="page-num">` |
| **B. Minimal stack** | Ṭabarī, Ibn Kathīr, Abū Ḥayyān, Ibn ʿAṭiyya | `<div class=ar>`, `<p>`, sometimes `<h3>* *</h3>` divider, `qpc-hafs` may be present |
| **C. No markup** | Zamakhsharī | only `<div class=ar>` + `<p>`. Qurʾān quotes inline plain Arabic |

### Per-source narration pattern

| pattern | Ṭabarī | Ibn Kathīr | Zamakh. | Rāzī | Others |
|---|---:|---:|---:|---:|---:|
| `حدثنا` (haddathana) | **3,024** | 203 | 82 | 0 | 0 |
| `أخبرنا` (akhbarana) | **1,954** | 412 | 61 | 0 | 0 |
| `قال أبو جعفر:` (Ṭabarī self-voice) | **1,776** | 2 | 0 | 0 | 0 |
| `قَوْلُهُ تَعالى:` (verse anchor opener) | 2,699 | 25 | 860 | 2,534 | varies |
| `[[…]]` editorial asides | **2,288** | 1,857 | **1,952** | 6 | 0 |
| `ayah-tag` HTML cross-ref | 0 | 0 | 0 | 2,202 | Ibn ʿĀshūr: 3,670 |

### Per-source unique tells

| source | distinctive marker |
|---|---|
| Ṭabarī | `⁕` (U+2055) **riwāya separator** before each isnād chain. Partial voweling. Bulaq edition style. |
| Ibn Kathīr | `[[المسند (٥/١٣٣)]]` editorial hadith-book volume refs |
| Zamakhsharī | `[[ … (ع)]]` editor-Muʿtazilī rebuttals; `فإن قلت…قلت` dialectical Q&A; no Qurʾān bracket markup |
| Rāzī | `﷽` glyph between sections; numbered `الفَصْلُ الأوَّلُ` / `المَسْألَةُ الأُولى` fuṣūl |
| Abū Ḥayyān | `؎` (U+061E) **poetry marker** for shawāhid; `∗∗∗` hemistich separator; grammar-cataloging openers (`باءُ الجَرِّ تَأْتِي لِمَعانٍ: لِلْإلْصاقِ، …`) |
| Ibn ʿAṭiyya | `(p-٥٨)` Maghribī pagination format; shadda-less `اللهِ` |
| Alūsī | `(البَحْثُ الأوَّلُ)`/`(المَسْألَةُ الثّانِيَةُ)` parenthetical headings; Western page numbers `صفحة 39` |
| Ibn ʿĀshūr | Indic-Arabic page numbers `صفحة ١٣٧`; heaviest `ayah-tag` user |

### Voweling

- Fully voweled: Ālūsī, Ibn ʿĀshūr, Rāzī, Abū Ḥayyān, Ibn Kathīr, Ibn ʿAṭiyya
- Partial: Ṭabarī, Zamakhsharī

### Bracket conventions

- `﴿ … ﴾` ornamental Qurʾān brackets: **6/8 sources** (all except Zamakhsharī
  + occasional plain-paren rows in others). When wrapped in `<span class="qpc-hafs">`
  this is the canonical Qurʾān-text marker.
- `«…»` for hadith quotes: ubiquitous
- `(…)` round parens: section labels (Rāzī, Ālūsī), source-book titles
  (Abū Ḥayyān, Ibn Kathīr), cited lexemes (most)
- `"…"` ASCII quotes in Ṭabarī (Bulaq edition lexemes); `”…“` curly in Ibn ʿĀshūr
- `[…]` for cross-refs: Abū Ḥayyān bare style, Ibn ʿĀshūr / Rāzī wrapped in
  `<span class="ayah-tag">`

---

## D. D1 → disk ingestion ratios (data loss audit)

Disk rows are 6,236 each (incl. empty followers). Ingestion drops follower
stubs AND, in many sources, more rows than that:

| source | disk anchors | D1 entries | ratio | notes |
|---|---:|---:|---:|---|
| Ālūsī | 5,629 | 5,629 | 100% | perfect anchor→entry mapping |
| Ibn ʿĀshūr | 3,923 | 3,923 | 100% | perfect |
| Ṭabarī | 3,636 | 3,636 | 100% | perfect |
| Rāzī | 2,969 | 2,969 | 100% | perfect |
| Zamakhsharī | 2,978 | 2,972 | **99.8%** | 6 anchors missing |
| Ibn ʿAṭiyya | 1,672 | 1,672 | 100% | perfect |
| Ibn Kathīr | 1,911 | 1,911 | 100% | perfect |
| Abū Ḥayyān | 1,427 | 1,427 | 100% | perfect |

So my earlier "23%" worry was wrong — that was vs total disk rows including
empty followers. **Anchor-to-entry ingestion is essentially complete.** The
display layer can trust D1.

The 6 missing Zamakhsharī anchors (~0.2% of his content) are worth tracing
in a follow-up but not blocking.

---

## E. What the existing `qr_tafsir_entries` is missing

The display layer adds value by computing/projecting these — they don't need
to live in the canonical table:

| missing concept | how display layer surfaces it |
|---|---|
| Group span as a queryable key | `ayah_group_key` = `"3:131-133"` computed from `ayah_from`/`ayah_to` ints |
| Per-paragraph segmentation for >5k entries | `paragraph_index` + `block_subtype='paragraph_section'` blocks |
| Isnād chains extracted | `block_type='isnad'` with structured `isnad_chain_json` |
| Voice markers (`قال أبو جعفر:`) | `block_type='voice_marker'` with `speaker` field |
| Poetry quotes (Abū Ḥayyān's `؎`) | `block_type='poetry_quote'` |
| Verse-anchor openers (`قَوْلُهُ تَعالى: ﴿…﴾`) | `block_type='verse_anchor'` |
| Cross-ref chips | `block_type='quran_ref_chip'` + side-table `qr_tafsir_book_display_refs` |
| Editorial asides | `qr_tafsir_book_display_notes` rows, `note_kind='footnote'`, `needs_review` |
| Hadith-book refs (Ibn Kathīr `[[المسند …]]`) | `note_kind='source_citation'`, structured ref |
| FTS5 search across Arabic+English | `qr_tafsir_book_display_blocks_fts` with diacritic-folded `unicode61` |
| Madhab/era chips for source switcher | denormalized on `qr_tafsir_book_display_sources` |
| Long-entry pagination signals | `is_long_form`, `paragraph_count` columns |
| Scholar position cross-links | rows in `qr_tafsir_book_display_links` referencing `qr_scholar_positions.id` |
| Reception trajectory | optional `block_type='reception_note'` projected from `qr_surah_reception_histories` |

---

## F. New API endpoints needed (proposed)

Existing route file `workers/quran/src/routes/tafsir.ts` stays as the canonical
fetch path. Add a sibling `tafsir-display.ts` mirroring `iraab-display.ts`:

```text
GET /qr/tafsir/display?surah=N&ayah=M[&scholar_id=S][&work_id=W]
  → QrTafsirGroupDisplayPayload { ayah_group_key, ayah_keys, sources[],
                                  blocks[], tags[], refs[], links[], notes[] }
  → Resolves the group containing ayah M per scholar; returns blocks for the
    full group. Supports multi-scholar mode (no scholar_id → all scholars).

GET /qr/tafsir/display/sources
  → Display-tier source registry with badges, madhab, era, death_AH

GET /qr/tafsir/display/search?q=…[&surah=N][&scholar_id=S][&block_type=T]
  → FTS5-backed Arabic+English search with snippet() highlighting

GET /qr/tafsir/display/compare?surah=N&ayah=M&scholar_ids=A,B,C
  → Side-by-side payload for ≤4 scholars on one ayah-group
```

Hook into the backend composite at `/api/quran/:surah/:ayah/sources`:
the gateway can additionally fan-out to `/qr/tafsir/display` so the composite
endpoint returns typed UI blocks instead of raw `content_ar` strings.

---

## G. Worker repo richness we get for free

Reading `tafsir.repo.ts` (802 lines), these are already-built canonical layers
that the display blocks should reference (not duplicate):

| table | what it offers | display use |
|---|---|---|
| `qr_scholarly_paradigms` | major theological schools (Ashʿarī, Muʿtazilī, Athari, …) | source madhab chip drilldown |
| `qr_scholar_paradigm_links` | which scholars belong to which paradigm | UI sidebar grouping |
| `qr_scholar_positions` | typed stances on specific issues (e.g. ʿiṣma, ruʾya) | `block_type='scholar_response'` cross-links between blocks |
| `qr_surah_reception_histories` | per-surah reception trajectory | optional `reception_note` block per surah view |
| `qr_interpretive_diffs` | known scholar-vs-scholar disagreements | `block_type='disagreement'` cards |

**Implication:** the display layer's `qr_tafsir_book_display_links` table will
carry typed refs into these canonical layers (e.g. `link_kind='scholar_response'`,
`typed_ref='QR:POSITION:01HX…'`). UI renders the canonical record from
typed ref via existing `/qr/scholars/positions/:id`-style routes.

---

## H. Migration shape — final design

Following the iʿrāb migration 011 pattern. File: `012_tafsir_display_layer.sql`.

**Six tables**, all `JSON`-typed for JSON columns:
1. `qr_tafsir_book_display_sources` — scholar+work display registry
2. `qr_tafsir_book_display_blocks` — typed UI blocks
3. `qr_tafsir_book_display_tags` — normalized tags
4. `qr_tafsir_book_display_refs` — ayah/word/lemma/scholar refs
5. `qr_tafsir_book_display_links` — block↔block edges + cross-domain typed refs
6. `qr_tafsir_book_display_notes` — footnotes / editorial asides / teaching notes

Plus FTS5 `qr_tafsir_book_display_blocks_fts`.

**Block type vocab additions over iʿrāb's set:**
- `tafsir_card` — main passage block
- `paragraph_section` — sub-block of long entries (block_subtype carries `paragraph_index`)
- `isnad` — extracted narration chain with structured `isnad_chain_json`
- `voice_marker` — speaker tag
- `poetry_quote` — shawāhid
- `verse_anchor` — `قَوْلُهُ تَعالى: ﴿ … ﴾` opener
- `scholar_response` — typed link to `qr_scholar_positions` or another block
- `reception_note` — projection from `qr_surah_reception_histories`
- `paradigm_chip` — Muʿtazilī / Ashʿarī etc. badge
- `disagreement` (already in iʿrāb vocab) — sourced from `qr_interpretive_diffs`

**New columns on blocks vs iʿrāb's blocks table:**
- `source_tafsir_entry_id` — FK to `qr_tafsir_entries.id`
- `scholar_id`, `work_id` — FK refs
- `scholar_name_ar`, `scholar_name_en`, `madhab`, `era`, `kalam_school`,
  `death_year_hijri` — **denormalized** for one-shot UI render
- `paragraph_index INTEGER` — for long-entry segmentation
- `markup_tier` — `'full' | 'minimal' | 'none'` so the renderer knows how to
  handle embedded HTML
- `is_long_form INTEGER` — 1 if source entry is >5000 chars
- `paragraph_count INTEGER` — total paragraphs in the source entry (so UI can
  paginate or show "23 paragraphs")

---

## I. Parser strategy — three phases

| phase | input | output |
|---|---|---|
| **A. Card projection** | `qr_tafsir_entries` WHERE entry_type='explanation' | One `tafsir_card` per entry, denormalized with scholar metadata. If `length(content_ar) > 5000`, ALSO emit N `paragraph_section` blocks (one per ~2000-char paragraph split on `</p>` or `\n\n`). |
| **B. Inline pattern extraction** | Same entries, scanned | Auxiliary blocks when patterns match: `isnad` (when `حَدَّثَنَا…عن…قال`), `voice_marker` (`قال أبو جعفر:`), `poetry_quote` (Abū Ḥayyān's `؎` line), `verse_anchor` (`قَوْلُهُ تَعالى: ﴿…﴾`), `quran_ref_chip` (parsed `<span class="ayah-tag">[Surah:ayah]</span>` OR bare `[Surah:ayah]`). |
| **C. Editorial extraction** | Inline `[[…]]` asides | Each aside → footnote note row, `needs_review`. |

Phase A is the must-have. Phases B/C are progressive enrichment — they can be
turned on per-source via a flag (`--extract-isnad`, `--extract-poetry`).

**Bracket regex:** Unicode-aware, accepts `(`, `﴿`, `«`, `"`, `”` as openers
and matching close pairs.

**Idempotency:** same as iʿrāb — every block carries `source_tafsir_entry_id`,
reset rule deletes `review_status='ai_candidate'` only.

---

## J. UI surface — what the new layer enables

| feature | current | with display layer |
|---|---|---|
| Single-work view | ✓ | ✓ (no regression) |
| Multi-scholar side-by-side | ✗ | ✓ (block payload merges sources) |
| Collapsible long entries | ✗ (full dump) | ✓ (paragraph_section blocks) |
| Isnād visual chain | ✗ | ✓ (isnad block with structured chain) |
| Cross-ref clickable chips | ✗ (HTML rendered) | ✓ (parsed into ref rows) |
| FTS5 Arabic search | ✗ | ✓ (`/qr/tafsir/display/search`) |
| Madhab / era filtering | partial (chip only) | ✓ (filter at API) |
| Editorial aside visual treatment | ✗ | ✓ (footnote sidebar) |
| Scholar response cross-links | ✗ | ✓ (link rows into `qr_scholar_positions`) |
| Reception note per surah | ✗ | ✓ (optional `reception_note` block) |

---

## K. Risks / decisions to make

1. **Storage cost**: 25,665 entries × avg 4-12k chars × estimated 5-15 blocks
   per entry after Phase A+B = roughly 200-400k display blocks. Compared to
   the iʿrāb display layer (~147k blocks), tafsir is 1.5-3× the size.
   D1 row write cost is real.
2. **Markup tier handling**: do we strip HTML and re-render? Or pass through
   `markup_tier` and let UI handle? Recommend: store BOTH `text_ar` (stripped)
   AND `raw_text` (verbatim) so renderer can pick.
3. **Zamakhsharī Muʿtazilī flag**: should the source badge prominently say
   "Muʿtazilī" or just "classical"? Doctrinal honesty argues yes — confirm with
   user.
4. **Isnād extraction confidence**: regex-based isnād parsing is brittle (Arabic
   morphology varies). Mark all isnād blocks `review_status='ai_candidate'`
   and `confidence='medium'`. Manual review promotes them.
5. **Tarteel sources**: confirm the 8 on-disk DBs all came from the Tarteel
   pipeline (filename/format suggests yes). If yes, document upstream as
   `Tarteel project — quran.com/tafsir collections`.

---

## L. Implementation order (next steps)

1. Migration `012_tafsir_display_layer.sql` — 6 tables + FTS5 (cost: 1 wrangler
   apply, ~10s)
2. Parser `scripts/tafsir-display-parser.mjs` — three-phase model
3. Per-surah dry-run on Surah 78 (small) for sanity check
4. Add routes: `tafsir-display.ts` with the 4 endpoints above
5. Apply full corpus (background task, similar to iʿrāb parser; 4-8h ETA)
6. Smoke-test via existing UI's `getTafsirEntries` switch to new endpoint
