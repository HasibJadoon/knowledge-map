# iʿrāb display — UI card layout

Reference layout for rendering `qr_iraab_book_display_*` (migration 011) as
modern scholarly study notes. Aimed at Notion/Obsidian/clean-research-card
aesthetics rather than dense classical typesetting. The data layer is fixed;
this doc captures the rendering contract.

## Reading axis

The primary container is **one ayah**. Server returns a `QrIraabAyahDisplayPayload`
(see `workers/quran/src/schemas/iraab-display.schema.ts`). The page renders:

```
┌─ Surah 2, Ayah 3 ──────────────────────────────────────────┐
│  وَالَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ …          │  ← Uthmani text (mushaf font)
│  English translation                                        │
└─────────────────────────────────────────────────────────────┘

┌─ Sources tab strip ─────────────────────────────────────────┐
│  [ج] Al-Jadwal     [د] Al-Darwish     [م] Al-Muyassar       │  ← qr_iraab_book_display_sources badges
└─────────────────────────────────────────────────────────────┘

[ section: Iʿrāb ] [ section: Ṣarf ] [ section: Balāgha ] [ section: Fawāʾid ]
```

Sources strip filters by `source_slug`; section strip filters by `block_subtype`
of `heading` (or by direct block_type filtering for irab_card / sarf_note /
balagha_note / key_insight).

## Block-type → component map

| block_type            | component        | visual                                                                       |
| --------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `heading`             | `SectionHeader`  | small gold rule above an Arabic h2 with English subtitle                     |
| `subheading`          | `SubHeading`     | inline h3, no rule                                                           |
| `irab_card`           | `IrabCard`       | word badge → role/case/mahal chips → Arabic body → grammar tag row           |
| `explanation`         | `ProseBlock`     | rounded card, RTL Arabic body, gray border                                   |
| `arabic_quote`        | `QuoteBlock`     | mushaf-font Arabic, gold left rule, source citation                          |
| `source_quote`        | `QuoteBlock`     | as above but with book chip beside source                                    |
| `sarf_note`           | `NoteCard`       | "ص" badge in muted teal, monospace-flavored body                             |
| `balagha_note`        | `NoteCard`       | "ب" badge in muted purple, lighter body                                      |
| `grammar_note`        | `NoteCard`       | "ن" badge in muted blue                                                      |
| `key_insight`         | `InsightCallout` | left accent, light background tint, bold leading sentence                    |
| `callout`             | `Callout`        | neutral pill icon + body                                                     |
| `warning`             | `Callout`        | amber border + ⚠ icon                                                        |
| `author_note`         | `NoteCard`       | small italic, author byline                                                  |
| `teaching_note`       | `NoteCard`       | dotted border, "Teach" pill                                                  |
| `study_summary`       | `SummaryBlock`   | full-width, dark mode card, bullet list                                      |
| `quran_ref_chip`      | `RefChip`        | inline chip "2:3"                                                            |
| `ayah_link`           | `RefChip`        | inline chip with ayah preview on hover                                       |
| `word_link`           | `WordChip`       | inline chip, monospace word                                                  |
| `root_chip`           | `RootChip`       | three-letter root in monospace, AL ref                                       |
| `lemma_chip`          | `LemmaChip`      | lemma display form                                                           |
| `backlink`            | `LinkRow`        | "↩ Cited by …" row at card bottom                                            |
| `related_note`        | `LinkRow`        | "↗ Related: …"                                                               |
| `same_ayah_link`      | `LinkRow`        | small group "Other books on this ayah"                                       |
| `same_word_link`      | `LinkRow`        | "Other entries on (الذين)"                                                   |
| `same_grammar_link`   | `LinkRow`        | "Other blocks tagged: اسم موصول"                                             |
| `comparison`          | `CompareBlock`   | two-column card, sources side-by-side                                        |
| `disagreement`        | `CompareBlock`   | red accent header "Scholars differ", two-column body                         |
| `raw_source`          | `Collapsible`    | "View original HTML" collapsible, mono RTL                                   |
| `footnote`            | `FootnoteRow`    | rendered from `qr_iraab_book_display_notes`, hover-preview from `*[1]` mark  |
| `tag`                 | `TagPill`        | tiny rounded pill                                                            |
| `review_status_badge` | `StatusPill`     | "AI" / "Reviewed" / "Verified" — driven by `review_status` + `confidence`    |
| `source_badge`        | `SourceBadge`    | book glyph + author short name                                               |

## IrabCard anatomy (the centerpiece)

```
┌──────────────────────────────────────────────────────────┐
│ ⌜ (الذين) ⌟                                  [اسم موصول] │  ← word_text title, primary grammar tag
│ ──────────                                               │
│ اسم موصول مبني على الفتح في محل جر نعت ل (المتقين).      │  ← text_ar
│ (يؤمنون) فعل مضارع مرفوع …                              │
│                                                          │
│ #مبني  #في محل جر  #نعت  #الأفعال الخمسة                 │  ← grammar_tags row
│                                                          │
│ ⓘ ويجوز أن يكون في محلّ رفع خبر لمبتدأ محذوف …          │  ← inline footnote (note_kind=footnote, is_inline=1)
│                                                          │
│ ─                                                        │
│  Al-Jadwal · Maḥmūd Ṣāfī            [AI · needs review] │  ← source byline + review_status badge
└──────────────────────────────────────────────────────────┘
```

Hover/long-press → exposes:
- `same_word_link` row ("Other books on الذين")
- `same_grammar_link` row ("Other blocks tagged: اسم موصول")
- "View original HTML" collapsible (`raw_source` block, served from `raw_text`)

## Visual tokens

```
ColorRole                Light                Dark
─────────────────────────────────────────────────────
canvas                   #FAFAF7              #14110D
card                     #FFFFFF              #1B1814
card-border              #E6E1D4              #2B271F
text-primary             #1A1714              #F0EAD8
text-muted               #6E665A              #8C8472
accent-gold              #C9A227              #E5C247
accent-irab-blue         #4A6E8A              #8FB3D1
accent-sarf-teal         #4B7A75              #8AC9C0
accent-balagha-purple    #6E588E              #B49AD1
accent-insight-amber     #B07A1A              #E5B656
review-ai-yellow         #B8932E              #E5BF55
review-approved-green    #2F6E4F              #8BC2A2
review-rejected-red      #9A4A3F              #D58A7C
```

Typography:
- Arabic body: `"Amiri", "Scheherazade New", serif` at 1.05rem, line-height 2.0
- Arabic mushaf quote: `"KFGQPC Uthman Taha Naskh", "Amiri Quran", serif`
- English: system sans, 0.95rem
- Tags/badges: SF Mono or JetBrains Mono, 0.75rem, letter-spacing 0.04em

## Rendering rules

1. **Render order** = `display_order` ascending, grouped by `block_type='heading'` boundaries.
2. **AI pill** appears whenever `review_status === 'ai_candidate'`. Hide on `approved`/`verified`.
3. **Confidence dot** — only show when `review_status !== 'approved'` to avoid duplication. `low` = dim, `verified` = filled gold.
4. **Empty section** — if a section's only block is its heading, suppress the heading.
5. **Multi-source mode** — when more than one source is selected, group cards by source and stack columns on wide screens, stack vertically on mobile.
6. **Highlights** — `meta.highlights` from the JSON projection are span phrases that the renderer should mark with a subtle gold underline inside `text_ar`.

## Routes (server side)

Add to `workers/quran/src/routes/irab.ts`:

```
GET /qr/iraab/display?surah=N&ayah=M[&source_slug=S]
GET /qr/iraab/display/sources
GET /qr/iraab/display/search?q=…&surah=N         (FTS5)
PATCH /qr/iraab/display/blocks/:id               (review_status + edits)
```

The first endpoint returns a `QrIraabAyahDisplayPayload`. Approval flow writes
to `qr_iraab_book_display_blocks.review_status` and never touches the raw
`qr_irab_*` ingestion tables.
