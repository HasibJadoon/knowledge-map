# Root-Layer Backlink Audit — Roam-style "back link to each resource"

> Generated: 2026-07-24 · DB: `km_arabic_linguistic` (192f4792…) · Worked root: **بين** (b-y-n)
> Goal (user): every **root layer** must carry a Roam-research-style **back link
> to the source resource**, so a reader can click any claim and *read the exact
> context* — and, bidirectionally, any source resource can show its **linked
> references** (which layers cite it). Traced from the root **control/grounding
> layer** down through **all presentation layers**.

## TL;DR

For بين a backlink chain **exists but breaks at the last hop, and is one-way**:

```
presentation layers ──► grounding layer ──► source book ──✗──► source RESOURCE (block)
 (beat/story/senses/     (root_stage:         (source_slug,        (ar_ling_lexicon_blocks
  dna/dev_stages)         quote+page+slug)     → reader OK)          blk_mfr2_*  — NEVER linked)
     typed ref                dangling native_id (0 matches)          no reverse index
   SYN:STG:byn:…
```

Three structural gaps block a true Roam model:

1. **Last-hop break** — no layer resolves to a specific readable resource
   (`ar_ling_lexicon_blocks.id`). `root_stage.source_native_id` for بين
   (`re_mfr_6401dfb6ff09bfea`) matches **0** rows in both `lexicon_blocks` and
   `lexicon_root_entries`. Best case a reader opens the whole book/root entry,
   not the passage that grounds the claim.
2. **One-directional** — resources have **no linked-references back-index**. A
   block cannot answer "which senses/beats/DNA cite me." (`ar_ling_lexicon_block_links`
   exists for block→block/quran/url, but nothing writes layer→block citations.)
3. **No uniform contract** — every layer encodes provenance differently:
   `provenance_json` slug arrays, `source_ref` typed refs (`SYN:STG:…`) or free
   text or null, dangling `source_native_id`. No single resolvable
   `resource_ref` across layers.

## Method

Layer = any table that renders in a root's word/article/story view and holds a
`root_norm`. For each, checked (a) presence of a source-pointer column and
(b) live row-level coverage for بين, then tested whether the pointer **resolves**
to a readable resource.

## The resource tier (what a backlink should target)

Fully source-anchored, readable, reader-deep-linkable via `/al/lex/v2/read/<slug>/:root`:

| Resource table | بين rows | Anchor |
|---|---:|---|
| `ar_ling_lexicon_blocks` (paragraph/tree blocks) | **191** | `id` (`blk_mfr2_h`…), `source_slug`, `root_entry_id`, `printed_page` |
| `ar_ling_lexicon_root_entries` (per-dict entry) | **12** | `source_slug` (100%), `source_chunk_id` **0%** |
| `ar_ling_root_scholarship` | 1 | `source_id` (100%) |
| `ar_ling_lexicon_quran_refs` | 0 | (none seeded for بين) |

These are the "pages" a backlink must point at. Note `source_chunk_id` is **0%**
even on the entry layer — the chunk-level anchor is unpopulated everywhere.

## Backlink status per root layer (بين)

Tier: **STRONG** = resolves to a specific resource · **CHAIN** = resolves to the
grounding layer, which then dead-ends · **BOOK** = book-level slug only · **NONE**.

| Layer | بين rows | Backlink field | Resolves to | Tier |
|---|---:|---|---|---|
| `ar_ling_root_stage` (grounding/control) | **112** | `source_slug`+`source_native_id`+`page_no`+`quote_ar` | book ✓; **resource ✗ (native_id dangling, 0 matches)** | BOOK |
| `ar_ling_root_senses` | 12 | `provenance_json` (slug array) | book(s) ✓; resource ✗ | BOOK |
| `ar_ling_root_sense_axes` | 3 | `basis_json` (**0/3 populated**) + synthetic slug | — | NONE |
| `ar_ling_root_dna` | 1 | `provenance_json` | book(s) ✓; resource ✗ | BOOK |
| `ar_ling_root_development_stages` | 4 | `source_ref` | grounding layer ✓→dead-ends | CHAIN |
| `ar_ling_root_composition` | 1 | — | — | NONE |
| `ar_ling_root_movement` | 8 | — (structural) | — | NONE |
| `ar_ling_root_beat` | 15 | `source_ref` = `SYN:STG:byn:12-ASL:maqayis` | `root_stage` ✓→dead-ends | CHAIN |
| `ar_ling_root_story` | 6 | `source_ref` = `SYN:STG:byn:26-ATTEST:taj:1` | `root_stage` ✓→dead-ends | CHAIN |
| `ar_ling_root_article` / `_article_block` | 0 / 0 | `sources_json` / **none** | — | (not seeded for بين) |

Observations for بين:
- The **grounding layer is well-populated** (112 claims, 88 with a `source_native_id`,
  76 with a page, each with a verbatim `quote_ar`) — the raw provenance is *there*.
- The **synthesis layers backlink correctly to the grounding layer** via typed
  `SYN:STG:byn:<band>-<claim>:<source>` refs — a real internal Roam edge.
- But the grounding layer's onward edge to the **actual resource block is
  dangling**, so the whole chain cannot reach a readable passage. And every edge
  is forward-only.

## What "Roam-style backlink to each resource" requires

Roam's model = (1) a reference is a first-class link to a page/block, and
(2) every page shows its **Linked References**. To get there here:

1. **Uniform forward ref → resource.** Give every layer a resolvable
   `resource_ref` (or `block_id` FK → `ar_ling_lexicon_blocks.id`). Backfill it
   by repairing `root_stage.source_native_id` to a live block id (join on
   `source_slug` + `root_norm` + `printed_page` + quote match), then propagate to
   synthesis layers through the existing `SYN:STG:…` chain.
2. **Reverse index (Linked References).** One `ar_ling_root_layer_citations`
   table — `(from_layer, from_id, to_resource_ref, relation)` — or reuse
   `ar_ling_lexicon_block_links` with `link_kind='cited_by_layer'`. This is what
   powers a block's "referenced by 7 senses / 3 beats" panel.
3. **Fix the dead anchors on the resource tier.** Populate `source_chunk_id`
   (0% on 53,515 entries) / `book_page_id` (≈10% on 1M blocks) so deep-linking to
   a passage — not just a book — actually works.
4. **One contract, not five.** Deprecate ad-hoc `provenance_json` slug arrays,
   free-text `source_ref`, and dangling `source_native_id` in favor of the
   `resource_ref` + citation-index pair, keeping the human-readable quote for display.

## Priority

1. Repair `root_stage → lexicon_blocks` resolution for بين (pilot); verify the
   88 native_ids can be re-pointed to real block ids.
2. Add the reverse citation index + a resolver endpoint
   (`/al/root/:root/backlinks`, `/al/resource/:block/referenced-by`).
3. Backfill `resource_ref` across synthesis layers via the `SYN:STG:…` chain.
4. Populate `source_chunk_id` / `book_page_id` so "read the context" lands on a
   passage.
5. Roll بين's pattern out to the rest of the root corpus.

## Implemented — بين pilot (2026-07-24)

The spine is built and backfilled for بين. Migration
`workers/ar-linguistics/migrations/0023_citation_spine.sql` creates one edge
table `ar_ling_citations` whose target is a **typed resource ref** (not an FK),
so it spans domains: `ALB:`<block> · `ALE:`<entry> · `ALS:`<scholarship> ·
`SRC:`<source> · `ALGEN:`<synthesis> · `AREX:`<expression> · `QRT:`<tafsir> ·
`QR:`<S:A> · `SS:`<node>.

**Corpus run (all 6 roots with layer data — بين نزل نذر ليل برك كتب):
527 citations, 0 dangling / 0 malformed, 80.8% resolving to a specific block.**
Block-level targets, since *all sources have block/chunk representations*:
`ALB:` `ar_ling_lexicon_blocks` (dictionaries), `ALG:` `ar_ling_gram_chunks`
(grammar/ṣarf works — Sībawayh, Rāḍī, Ibn Jinnī…). Tafsīr/iʿrāb works keep
`SRC:` because their blocks live in the QR database (resolved once the QR
mirror lands); internal projections keep `ALGEN:`. Final mix: lexicon_block
416 · gram_chunk 10 · source 45 · synthesis 35 · lexicon_entry 21. Full,
idempotent backfill: `database/seeds/backfill-citations.sql`.

Backfill (three-tier resolution, all resolvable + reverse-indexed):

- `root_stage` (112 claims) → `ALB` where a diacritic-normalised quote↔block
  match exists (20 precise), else `ALE` book+root+page (51), else `SRC` for
  un-ingested classical works (19), else `ALGEN` for internal projections (22).
- Synthesis layers inherit their grounding resource: `root_beat`/`root_story`/
  `root_dev_stage` via the existing `SYN:STG:…` chain (21 edges);
  `root_sense`/`root_dna` via each `provenance_json` slug → that dictionary's
  entry (64 edges).
- **197 citations total for بين.** Reverse index verified: e.g.
  `ALB:blk_mqy2_p1` (a Maqāyīs paragraph) is *referenced-by* `root_stage`,
  `root_beat`, and `root_story` — the "Linked References" panel.

Endpoints (`workers/ar-linguistics/src/routes/citations.ts`):
`GET /al/citations/:root` (forward, grouped by layer) ·
`GET /al/citations/:root/resources` (distinct resources + ref counts) ·
`GET /al/referenced-by?ref=<typed ref>` (reverse).

### Rollout to "everything" (SS · expressions · memlets · tafsīr)

Same table, new `from_layer` / `to_kind` values — no schema change:

- **Expressions** — `from_layer='expression'`, resolve `ar_ling_expressions.qr_refs_json`
  → `QR:<S:A>` (āyah) and primary lemma → `ALE`.
- **Memlet panels** — `from_layer='memlet'`; each panel already maps to a table
  (senses/ṣarf/constellation/hook) → cite that panel's underlying resource so a
  Memlet card shows "read the source."
- **Tafsīr** — `from_layer='tafsir_use'`, `to_ref='QRT:'<id>` /
  `QR:<S:A>`; the tafsīr rows live in QR, so QR gets a mirror `qr_citations`
  table with the same shape, and the backend gateway UNIONs AL + QR
  "referenced-by" over service bindings.
- **Sentence structure (SS / iʿrāb)** — `from_layer='ss'`; SS nodes (QR) cite
  `AL:` grammar/balāgha rows and `QR:<S:A>`; again a `qr_citations` mirror +
  gateway aggregation, since SS is QR-owned.

Next: repair remaining dangling `root_stage.source_native_id` corpus-wide, then
template this backfill per root.

## Coverage note / caveat

This is row-level for بين plus structural for the layer set. Numbers are live
prod counts (2026-07-24). The committed `workers/ar-linguistics/schema.sql` is
**missing most of these tables** (the whole `ar_ling_root_*` synthesis family and
the `ar_ling_lexicon_block*` family exist only in prod) — a schema-drift issue to
fix alongside, so this model is reviewable from the repo.
