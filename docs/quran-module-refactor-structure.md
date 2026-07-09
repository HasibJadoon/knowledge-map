# Quran Module — Refactor & Naming Proposal (UI-Mirrored Structure)

> Scope: `apps/k-maps/src/app/features/quran/` (Angular web app) only.
> Goal: reorganize the Quran/Surah feature so the **folder tree mirrors the UI
> screen regions the user actually sees**, and every component lives in a
> properly named folder following Angular conventions.
> Status: **Proposal — no files moved.** This is a plan + target tree + migration map.

---

## 1. Executive Summary

The Quran feature works but its folder tree has drifted from the UI. Three
transliterations of the same word are used as folder names (`sura`, `surah`,
`surahs`), two spellings for the same concept (`tafseer`/`tafsir`,
`iraab`/`irab`), a full rich-text document editor is buried inside
`sura/notes/`, the sentence-structure step tree is **duplicated** in two places
with **colliding component selectors**, and 17 morphology components use a
non-Angular `*.block.ts` filename convention.

This proposal reorganizes everything under `features/quran/` into folders that
match the **screens and on-screen regions** of the UI: the page chrome, the
surah hub of action tiles, the reader, the study "scene" with its step rails and
reveal panels, the standalone tool screens, and the worldview surfaces. It also
defines one naming convention and gives a file-by-file migration map plus a
safe, phased execution order.

---

## 2. What the User Sees (UI Screen Inventory)

The folder structure below is derived from these actual screens (routes in
`quran.routes.ts`):

| # | Screen / surface | Route | What renders on screen |
|---|---|---|---|
| 1 | **Quran Landing** | `/quran` | Feature entry / hub |
| 2 | **Researcher workspace** | `/quran` (shell) | A shell with tabbed research tools: Al-Quran reader, Lexicon, Tafsir, Uloom (sciences), Notes |
| 3 | **Surah Index** | `/surahs` | Grid of surah **cards** |
| 4 | **Surah Reader** | `/surahs/:id` | A single surah's text, with an **action-tile bar** to jump to tools |
| 5 | **Passage** | `/surahs/:id/passage/:i` | One passage within a surah |
| 6 | **Study Overview** | `/surahs/:id/study` | Passage list / study entry for a surah |
| 7 | **Study Scene** | `/surahs/:id/study/:passage` | Full-screen "scene": toolbar + **step rails** (Reading, Expressions, Passage Structure, Sentence Structure, Vocabulary) + reveal panel |
| 8 | **Word / Morphology** | `/surahs/:id/study/:p/word/...` | Single-word deep dive built from stackable **morphology blocks** |
| 9 | **Linguistics** | `/surahs/:id/linguistics` | Vocabulary / linguistics view |
| 10 | **Near Synonyms** | `/surahs/:id/near-synonyms` | Near-synonym explorer |
| 11 | **Morphology Grid** | `/surahs/:id/morphology` | Whole-surah morphology grid |
| 12 | **Review** | `/surahs/:id/review` | Review screen |
| 13 | **SRS** | `/surahs/:id/srs` | Spaced-repetition deck |
| 14 | **Surah Notes** | `/surahs/:id/notes` | Rich-text notes editor for a surah |
| 15 | **Worldview** | `/surahs/:id/worldview` | Hub + region screens: Nodes, Sources, Podcasts, Documents, Notes, Links |

Every screen is wrapped by the same **page shell** (`km-quran-page-shell`):
back button + breadcrumb + title, then content. That shell, the surah **cards**,
the **action tiles/bar**, and the reusable **morph-word-card** are the shared
visual building blocks.

---

## 3. Current Problems

**Naming — transliteration drift**

- `sura/` (folder) vs `surah-*` (files/selectors) vs `surahs` (routes). Three
  spellings for one concept, plus three parallel families of legacy redirects
  (`sura/*`, `surah/*`, bare `:surahId/*`).
- `tafseer/` (page) vs `tafsir-display/` (page) vs `tafsir.block` — same word,
  three spellings. Same for `iraab-display/` vs `irab.block` vs
  `iraab-tree-viewer`.

**Naming — non-Angular filenames**

- 17 morphology components are `*.block.ts` / `*.block.html` (e.g.
  `tafsir.block.ts`) though they are real `@Component`s. Angular convention is
  `*.component.ts`.
- Note-editor extensions use `*.extension.ts`; acceptable for TipTap, but they
  sit inside a feature folder they shouldn't.

**Structure — duplication**

- `sura/lesson/steps/sentence-structure/` and
  `sura/study/detail/steps/sentence-structure/` both contain
  `sentence-structure-canvas.component.ts`, `sentence-structure-nav3d.component.ts`,
  and `ss-ui-registry.ts` with the **same selectors** (`km-sentence-structure-canvas`,
  `km-sentence-structure-nav3d`) — a selector collision.
- Two lesson/study systems coexist: `sura/lesson/` (`km-surah-lesson-page` + steps)
  and `sura/study/` (`km-surah-study` + detail + steps). The routes only use
  `sura/study/*`; `sura/lesson/*` appears to be superseded.

**Structure — misplaced concerns**

- A generic rich-text **document editor** lives in `sura/notes/`
  (`km-document-editor`, `km-document-list`, `km-document-toolbar`,
  `km-bubble-menu`, `km-slash-menu`, `km-link-dialog`, style palette, TipTap
  extensions). It duplicates `features/docs/doc-editor/` and is app-wide
  infrastructure, not a surah concern.
- App-generic components (`km-empty-state`, `km-morph-word-card`) live under
  `quran/shared/` but aren't Quran-specific.

**Structure — confusing names / orphans**

- `quran-research/research/quran-research.component` (`km-quran-research`) is a
  near-duplicate name of `quran-researcher-shell` (`km-quran-researcher-shell`).
- Three unrelated "notes" screens: `km-surah-notes`, `km-worldview-notes`,
  `km-notes-page`.
- `sura/surah/surah.component` (`km-surah`) is not referenced by the routes —
  likely dead code (**confirm before removal**).

---

## 4. Proposed Structure (mirrors UI screen regions)

Top level splits the feature into the three things the UI presents: the
**landing** entry, the **researcher** workspace, and everything scoped to a
**surah**. Shared visual primitives (the frame + reusable widgets) sit in
`ui/`. Within `surah/`, each folder is a screen or an on-screen region.

```
features/quran/
├── quran.routes.ts
│
├── ui/                                  # shared visual building blocks (the "chrome" + widgets)
│   ├── page-shell/                      # km-quran-page-shell  (back + breadcrumb + title frame)
│   │   └── quran-page-shell.component.{ts,html,scss}
│   ├── surah-card/                      # km-surah-card        (card in the surah grid)
│   │   └── surah-card.component.{ts,html,scss}
│   ├── action-bar/                      # km-surah-actions     (tile bar on the reader)
│   │   └── surah-action-bar.component.{ts,html,scss}
│   ├── action-tile/                     # km-action-icon-tile  (one tile in the bar)
│   │   └── action-tile.component.{ts,html,scss}
│   └── word-card/                       # km-morph-word-card   (reused across study surfaces)
│       └── morph-word-card.component.{ts,html,scss}
│   # NOTE: empty-state → move OUT to src/app/shared/ui/empty-state (app-generic)
│
├── landing/                             # SCREEN 1 — Quran entry
│   └── quran-landing.component.{ts,html,scss}        # km-quran-landing
│
├── researcher/                          # SCREEN 2 — research workspace (tabbed shell)
│   ├── researcher-shell.component.{ts,html,scss}     # km-quran-researcher-shell
│   ├── al-quran/                        #   tab: reader
│   │   └── al-quran.component.{ts,html}              # km-al-quran
│   ├── lexicon/                         #   tab: lexicon
│   │   ├── lexicon-page.component.{ts,html}          # km-lexicon-page
│   │   ├── lane-table/lane-table.component.{ts,html} # km-lane-table
│   │   ├── lane-display.types.ts
│   │   └── lane-display.utils.ts
│   ├── tafsir/                          #   tab: tafsir  (was "tafseer")
│   │   ├── tafsir-page.component.{ts,html}           # km-tafsir-page
│   │   └── tafsir-display-page.component.{ts,html}   # km-tafsir-display-page
│   ├── iraab/                           #   grammar-parse display  (was "iraab-display")
│   │   └── iraab-display-page.component.ts
│   ├── uloom/                           #   tab: sciences
│   │   └── uloom-page.component.{ts,html}            # km-uloom-page
│   └── notes/                           #   tab: researcher notes
│       └── researcher-notes-page.component.{ts,html} # km-researcher-notes-page (was km-notes-page)
│
└── surah/                               # everything scoped to a single surah
    ├── index/                           # SCREEN 3 — surah grid
    │   └── surah-index.component.{ts,html}           # km-surah-index (was km-quran-surahs)
    ├── reader/                          # SCREEN 4/5 — text + passage
    │   ├── surah-reader.component.{ts,html,scss}     # km-quran-text  → km-surah-reader
    │   └── passage/
    │       └── surah-passage.component.{ts,html,scss}# km-quran-passage → km-surah-passage
    │
    ├── study/                           # SCREENS 6–8 — the study experience
    │   ├── overview/                    #   study overview (passage list)
    │   │   └── study-overview.component.{ts,html,scss}   # km-surah-study
    │   ├── scene/                       #   the full-screen study "scene"
    │   │   ├── study-scene.component.{ts,html,scss}      # km-surah-study-detail
    │   │   └── steps/                   #   the step reveal panels (rails)
    │   │       ├── reading/reading-step.component.{ts,html,scss}
    │   │       ├── expressions/expressions-step.component.{ts,html,scss}
    │   │       ├── passage-structure/passage-structure-step.component.{ts,html,scss}
    │   │       ├── sentence-structure/
    │   │       │   ├── sentence-structure-step.component.ts
    │   │       │   ├── sentence-structure-canvas.component.ts   # single copy
    │   │       │   ├── sentence-structure-nav3d.component.ts    # single copy
    │   │       │   ├── sentence-structure-miro.component.{ts,html}
    │   │       │   └── ss-ui-registry.ts                        # single copy
    │   │       └── vocabulary/vocabulary-step.component.{ts,html}
    │   └── word/                        #   SCREEN 8 — single-word morphology deep dive
    │       ├── morph-word-page.component.{ts,html}   # km-morph-word-page
    │       ├── modals/
    │       │   ├── study-word-modal.component.{ts,html}
    │       │   └── morph-word-modal.component.{ts,html}
    │       ├── host/morph-block-host.component.{ts,html}
    │       ├── parts/
    │       │   ├── morph-hero/…
    │       │   ├── morph-toc-rail/…
    │       │   └── morph-context-switcher/…
    │       ├── blocks/                  #   17 blocks → *.component.ts (was *.block.ts)
    │       │   ├── attestations/attestations-block.component.{ts,html}   # km-mb-attestations
    │       │   ├── balagha/…  constellation/…  derivations/…  development/…
    │       │   ├── iraab/iraab-block.component.{ts,html}                 # was irab.block
    │       │   ├── kindred/…  lexicon/…  master-story/…  metaphor/…
    │       │   ├── occurrences/…  root-dna/…  sarf/…  synthesis/…
    │       │   ├── tafsir/tafsir-block.component.{ts,html}
    │       │   ├── translators/…  usage-map/…
    │       └── support/                 #   non-component helpers for the word view
    │           ├── morph-block-base.directive.ts
    │           ├── morph-block.registry.ts
    │           ├── morph-block.types.ts
    │           ├── morph-rich.ts
    │           └── morph-icons.ts
    │
    ├── linguistics/                     # SCREEN 9
    │   └── surah-linguistics.component.{ts,html,scss}   # km-surah-vocabulary → km-surah-linguistics
    ├── near-synonyms/                   # SCREEN 10
    │   └── surah-near-synonyms.component.{ts,html,scss} # km-surah-near-synonyms
    ├── morphology/                      # SCREEN 11 — whole-surah morphology grid
    │   └── surah-morphology.component.{ts,html}         # km-surah-morphology
    ├── review/                          # SCREEN 12
    │   └── surah-review.component.{ts,html,scss}        # km-surah-review
    ├── srs/                             # SCREEN 13
    │   └── surah-srs.component.{ts,html,scss}           # km-surah-srs
    ├── notes/                           # SCREEN 14 — surah notes screen only
    │   └── surah-notes.component.{ts,html,scss}         # km-surah-notes
    │   # editor internals → move OUT to src/app/shared/doc-editor (see §6)
    │
    └── worldview/                       # SCREEN 15 — hub + region screens
        ├── hub/worldview-hub.component.{ts,html,scss}
        ├── nodes/worldview-nodes.component.{ts,html,scss}
        ├── sources/worldview-sources.component.{ts,html,scss}
        ├── podcasts/worldview-podcasts.component.{ts,html,scss}
        ├── documents/worldview-documents.component.{ts,html,scss}
        ├── notes/worldview-notes.component.{ts,html,scss}
        └── links/worldview-links.component.{ts,html,scss}
```

**Removed / relocated from the tree above**

- `sura/lesson/` (surah-lesson-page + its steps) — superseded by `study/scene/`.
  Confirm unused, then delete. Its unique sentence-structure logic, if any,
  should be reconciled into `study/scene/steps/sentence-structure/` first.
- `sura/lessons/study/` + `sura/lessons/edit/` (`km-lesson-study`,
  `km-lesson-edit`) and `lesson-card/` — a separate "lesson" concept. If still
  routed/used, keep as `surah/lessons/`; if not, remove. **Confirm.**
- `sura/surah/surah.component` (`km-surah`) — orphan; delete after confirmation.
- `quran-research/research/quran-research.component` — near-duplicate of the
  shell; fold in or delete. **Confirm.**
- `quran/shared/empty-state/` → `src/app/shared/ui/empty-state/` (app-generic).
- `sura/notes/` editor internals → `src/app/shared/doc-editor/` (see §6).

---

## 5. Naming Conventions to Adopt

1. **One spelling per concept.** Use `surah` everywhere in folders/selectors and
   `surahs` only in URLs. Use `tafsir` (not `tafseer`) and `iraab` (pick one and
   apply consistently — recommend `iraab`).
2. **Angular filename convention.** Every `@Component` file is
   `<name>.component.ts` (+ `.html`, `.scss`). Rename all `*.block.ts` →
   `<name>-block.component.ts`. Keep the `km-mb-*` selectors (they're fine).
3. **One folder per component.** Each component gets its own folder named after
   it; the folder holds the `.ts/.html/.scss` trio and nothing unrelated.
4. **Selector = purpose.** Rename drifting selectors: `km-quran-text` →
   `km-surah-reader`, `km-quran-surahs` → `km-surah-index`, `km-surah-vocabulary`
   → `km-surah-linguistics`, `km-notes-page` → `km-researcher-notes-page`.
5. **Feature vs app-generic.** Anything not Quran-specific (empty-state, the doc
   editor) lives under `src/app/shared/`, not inside the feature.
6. **Folder name = screen/region.** Top-level folders under `surah/` map 1:1 to
   the screens in §2; nested folders map to on-screen regions (scene → steps →
   word → blocks).

---

## 6. Extract the Document Editor (high value, do first or last, but do it)

`sura/notes/` currently contains a complete generic editor:
`km-document-editor`, `km-document-editor-page`, `km-document-list`,
`km-document-toolbar`, `km-bubble-menu`, `km-slash-menu`, `km-link-dialog`,
`km-document-style-palette`, and `extensions/{callout,slash-command,text-direction}`.
This duplicates `features/docs/doc-editor/`.

Recommendation: move these to `src/app/shared/doc-editor/` (or reuse
`features/docs/doc-editor/`), leaving only `surah-notes.component` in
`surah/notes/` consuming the shared editor. Same treatment applies to
`worldview/notes` and `researcher/notes`, which should all consume one editor
rather than each re-implementing note UI.

---

## 7. Migration Map (old → new)

| Current path | New path | Rename |
|---|---|---|
| `shared/quran-page-shell.component.*` | `ui/page-shell/quran-page-shell.component.*` | — |
| `shared/morph-word-card.component.ts` | `ui/word-card/morph-word-card.component.ts` | — |
| `shared/empty-state/` | `src/app/shared/ui/empty-state/` | leave feature |
| `sura/surah-card/` | `ui/surah-card/` | — |
| `sura/surah-actions/` | `ui/action-bar/` | `surah-action-bar` |
| `sura/action-icon-tile/` | `ui/action-tile/` | `action-tile` |
| `quran-research/quran-landing/` | `landing/` | — |
| `quran-research/quran-researcher-shell/` | `researcher/` (shell at root) | `researcher-shell` |
| `quran-research/research/` | delete / fold in | confirm |
| `quran-research/al-quran/` | `researcher/al-quran/` | — |
| `quran-research/researcher/lexicon/` | `researcher/lexicon/` | — |
| `quran-research/researcher/tafseer/` | `researcher/tafsir/` | `tafsir-page` |
| `quran-research/researcher/tafsir-display/` | `researcher/tafsir/` | — |
| `quran-research/researcher/iraab-display/` | `researcher/iraab/` | — |
| `quran-research/researcher/uloom/` | `researcher/uloom/` | — |
| `quran-research/researcher/notes/` | `researcher/notes/` | `researcher-notes-page` |
| `sura/quran-surahs/` | `surah/index/` | `surah-index` |
| `sura/text/` | `surah/reader/` | `surah-reader` |
| `sura/passage/` | `surah/reader/passage/` | `surah-passage` |
| `sura/study/surah-study.*` | `surah/study/overview/` | `study-overview` |
| `sura/study/detail/surah-study-detail.*` | `surah/study/scene/` | `study-scene` |
| `sura/study/detail/steps/*` | `surah/study/scene/steps/*` | drop `study-` prefix |
| `sura/study/detail/steps/vocabulary/*` | `surah/study/word/*` | regroup |
| `sura/study/detail/steps/vocabulary/blocks/*.block.ts` | `surah/study/word/blocks/*/*-block.component.ts` | `.block`→`.component` |
| `sura/vocabulary/` | `surah/linguistics/` | `surah-linguistics` |
| `sura/near-synonyms/` | `surah/near-synonyms/` | — |
| `sura/morphology/` | `surah/morphology/` | — |
| `sura/review/` | `surah/review/` | — |
| `sura/srs/` | `surah/srs/` | — |
| `sura/notes/surah-notes.*` | `surah/notes/` | — |
| `sura/notes/km-document-*`, `extensions/` | `src/app/shared/doc-editor/` | leave feature |
| `sura/worldview/*` | `surah/worldview/*` | — |
| `sura/lesson/*` | delete (superseded) | confirm |
| `sura/lessons/*`, `sura/lesson-card/` | `surah/lessons/*` or delete | confirm |
| `sura/surah/surah.component` | delete (orphan) | confirm |

---

## 8. Phased Execution Plan (safe, incremental)

Do this in small, independently-verifiable PRs. After each phase run
`npm run build -w apps/k-maps` and click through the affected screens.

1. **Confirm dead code.** Verify `sura/surah/`, `sura/lesson/`,
   `quran-research/research/`, and `sura/lessons/` usage with `rg`. Delete what
   is truly unused. (Smallest, highest-clarity win.)
2. **De-duplicate sentence-structure.** Collapse the two copies into
   `study/scene/steps/sentence-structure/`; remove the colliding selectors.
3. **Rename `*.block.ts` → `*-block.component.ts`** (17 files) and fix the block
   registry references. No folder moves yet.
4. **Fix transliteration** in the researcher tools: `tafseer`→`tafsir`,
   consolidate `tafsir-display`, normalize `iraab`.
5. **Extract the doc editor** from `sura/notes/` to `src/app/shared/doc-editor/`;
   point `surah-notes`, `worldview-notes`, `researcher-notes` at it.
6. **Move the shared UI primitives** into `ui/` (page-shell, cards, action-bar,
   tiles, word-card); move `empty-state` out to app shared.
7. **Rename the top folders** `sura/` → `surah/`, regroup `text`+`passage` under
   `reader/`, `study/detail` → `study/scene`, `study/.../vocabulary` →
   `study/word`. Update `quran.routes.ts` import paths (selectors/URLs already
   canonical, so URLs don't change — only `loadComponent` paths do).
8. **Update selectors** (`km-quran-text`→`km-surah-reader`, etc.) last, as a
   pure find-and-replace once files are settled.

**Guardrails:** the route **URLs already canonicalize to `surahs/*`** and all
legacy redirects stay in place, so this refactor changes import paths, folder
names, and selectors — **not** the user-facing URLs. That keeps every phase
low-risk. Run `git diff --check` before each commit per repo hygiene rules.

---

## 9. Risks & Confirmations Needed

- **Confirm orphans before deleting:** `sura/surah/`, `sura/lesson/`,
  `sura/lessons/`, `quran-research/research/`. A grep sweep across both apps is
  required — some may be referenced by string, template, or the mobile app.
- **Selector collisions** (`km-sentence-structure-*`) must be resolved in the
  same change that de-duplicates, or Angular will error on duplicate declarations
  if both are ever imported together.
- **Block registry coupling:** `morph-block.registry.ts` maps block ids to
  components; renaming block files requires updating it in lockstep.
- **Doc-editor extraction** touches `features/docs/` too — reconcile the two
  editors rather than creating a third copy.
```
