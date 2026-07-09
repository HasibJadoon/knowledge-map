# Quran Module Refactor — Execution Plan

> Companion to `quran-module-refactor-structure.md` (the proposal).
> That doc holds the target tree and naming rules; this doc is the **verified,
> ordered execution plan**. All "confirm before acting" items from proposal §9
> were verified against the code on 2026-07-09 (results in §1 below).
> Scope: `apps/k-maps/src/app/features/quran/` (242 files). One external
> touchpoint only: `app.routes.ts:32` lazy-loads `quran.routes.ts` — nothing
> else in the app imports from the feature, and no SCSS file in the feature
> uses `@use`/`@import`. The refactor is fully internal.

---

## 1. Verification Results (grep sweep, 2026-07-09)

Every open question in the proposal has an answer now:

| Item | Proposal said | Verified result | Action |
|---|---|---|---|
| `sura/surah/surah.component` | "likely dead — confirm" | **Dead.** No import, no `<km-surah>` usage anywhere | Delete |
| `sura/lesson/` (singular) | "appears superseded — confirm" | **Dead.** Zero references outside itself; not routed. The study copy of `sentence-structure-canvas` is *newer* (Apr 22 vs Apr 21), so nothing to reconcile | Delete whole folder |
| `quran-research/research/` | "near-duplicate — confirm" | **Dead.** `QuranResearchComponent` referenced nowhere | Delete |
| `sura/lesson-card/` | "keep or remove — confirm" | **Dead.** `km-lesson-card` / `LessonCardComponent` referenced nowhere | Delete |
| `sura/lessons/` (plural) | "if routed, keep" | **Routed** (`lessons/:lessonId/study`, `lessons/:lessonId/edit`) but **no UI links to those URLs** (no routerLink/navigate; only backend API paths mention "lessons"). Reachable by typed URL only | Keep + move to `surah/lessons/` (default). Flag for a later keep/kill decision — see §2 |
| `tafsir-display/`, `iraab-display/` | assumed live, to be merged into `researcher/tafsir\|iraab` | **Both orphaned** — not in `quran.routes.ts`, referenced by nothing. (New finding, not in the proposal) | Move into `researcher/tafsir/` + `researcher/iraab/` but flag: wire a route or delete — see §2 |
| Sentence-structure selector collision | must fix | Confirmed: the two copies are exactly `sura/lesson/steps/…` vs `sura/study/detail/steps/…` | **Deleting `sura/lesson/` resolves the collision** — no separate de-dup phase needed |
| Doc editor duplication | reconcile with `features/docs/doc-editor` | Confirmed: `features/docs/doc-editor/` is the richer editor (block-handle, blocks, bubble-menu, slash-menu, highlight-toolbar, tiptap-extensions). `sura/notes/` has its own smaller copy + 3 extensions (callout, slash-command, text-direction) | Canonicalize on `features/docs/doc-editor`; see Phase 5 |
| `empty-state`, `morph-word-card` | move `empty-state` out to app shared | **Neither is used outside the quran feature** | Deviation from proposal: keep both inside `quran/ui/`. Move out later only if a second feature adopts them |

**⚠️ Blocking environment issue found:** 4 source files are iCloud-evicted
("dataless" flag) and hang on read. They must be materialized before any
phase touches them (Phase 0):

- `features/quran/quran-research/researcher/iraab-display/iraab-display-page.component.ts`
- `features/quran/quran-research/researcher/tafsir-display/tafsir-display-page.component.html`
- `features/quran/sura/lesson-card/lesson-card.component.ts`
- `features/docs/doc-editor/highlight-toolbar/highlight-toolbar.component.ts`

---

## 2. Open Decisions (defaults chosen; override any time before the relevant phase)

1. **Lessons feature** (`sura/lessons/` + `lessons/:id/study|edit` routes).
   Routed but unreachable from any UI link — its entry card (`lesson-card`)
   is already dead. **Default: keep and move to `surah/lessons/`** (Phase 6).
   If you decide it's vestigial, delete folder + 2 routes in Phase 1 instead.
2. **`tafsir-display` / `iraab-display` pages.** Orphaned today, but the D1
   display tables they render exist and are actively maintained. **Default:
   move them under `researcher/tafsir/` and `researcher/iraab/` unrouted**
   (Phase 4) and wire routes as separate feature work. Alternative: delete.
3. **`empty-state` placement.** Default: stays at `quran/ui/empty-state/`
   (contra proposal §4) since nothing else uses it.

---

## 3. Phase Plan

Rules for every phase:

- One phase = one commit (or one small PR). Never mix phases.
- After each phase: `npm run build -w apps/k-maps`, click through the screens
  listed in the phase, then `git diff --check` before committing.
- Folder moves use `git mv` so history follows.
- Route **URLs never change** except the `tafseer`→`tafsir` URL in Phase 3
  (which keeps a redirect). Only `loadComponent` import paths change.

### Phase 0 — Pre-flight (no code changes) — ✅ EXECUTED 2026-07-09

> **Outcome differed from the written steps.** The iCloud copy's sync container
> was wedged (stalled daemon, 42k evicted files, conflicted `.angular` cache
> record); downloads would not flow. Instead of fighting it, the refactor now
> runs in a **fresh clone at `~/dev/knowledge-map`** (outside iCloud), branch
> `refactor/quran-structure`. The iCloud working tree's uncommitted work
> (folderized morph word-view, registry/types/icons edits, fonts, docs) was
> diffed file-by-file against the clone and ported as commit `d394edd3a`.
> Baseline `npm run build -w apps/k-maps` passes (8.6s). Ionic app confirmed
> decoupled (its `features/quran` is its own folder). Remaining loose end:
> untracked QPC font glyphs + worker SQL imports are still evicted in the
> iCloud copy only — recover them there before deleting that copy.


1. Materialize the 4 dataless files: `brctl download <path>` for each (or
   open them once in Finder/editor); verify with
   `ls -lO <file>` — the `dataless` flag must be gone. Nothing downstream
   works until this is done: recursive grep/build hangs on these files.
2. Confirm clean tree; branch: `git checkout -b refactor/quran-structure`.
3. Baseline: `npm run build -w apps/k-maps` must pass before anything moves.
4. Sanity grep in the Ionic app: `grep -rn "features/quran" apps/app-k-maps/src`
   — expected empty (apps don't share code), but per repo rules confirm before
   deleting anything.

### Phase 1 — Delete confirmed dead code

Smallest, highest-clarity win; also removes the selector collision.

Delete:
- `features/quran/sura/surah/` (3 files)
- `features/quran/sura/lesson/` (entire folder incl. all `steps/`)
- `features/quran/sura/lesson-card/`
- `features/quran/quran-research/research/`

No route changes needed — none of these are routed.
Verify: build passes; `/quran`, `/quran/surahs/1`, `/quran/surahs/1/study/1`
all render; grep confirms no dangling imports:
`grep -rn "sura/lesson/\|sura/surah/\|lesson-card\|research/quran-research" apps/k-maps/src --include='*.ts'` → empty.

### Phase 2 — Rename morphology blocks to Angular convention (no moves)

- Rename 17 files `sura/study/detail/steps/vocabulary/blocks/*/*.block.ts`
  → `*-block.component.ts` (and paired `.html` where present).
- Rename folder `blocks/irab/` → `blocks/iraab/` and `irab.block.ts` →
  `iraab-block.component.ts` (one spelling: `iraab`).
- Update `morph-block.registry.ts` imports **in the same commit** — the
  registry maps block ids to components and is the single coupling point.
- Keep all `km-mb-*` selectors and block ids unchanged (block ids are data
  contracts with `qr_morph_display_blocks` — do not touch).

Verify: build; open a word page
(`/quran/surahs/*/study/*/word/*/*`) and confirm every block type renders
(كتاب is a fully-authored word to test with).

### Phase 3 — Transliteration fixes in the researcher area

- `quran-research/researcher/tafseer/` → rename folder + files to `tafsir/`,
  `TafseerPageComponent` → `TafsirPageComponent`.
- Route: change path `'tafseer'` → `'tafsir'`, add
  `{ path: 'tafseer', redirectTo: 'tafsir' }` (only user-facing URL change in
  the whole refactor, protected by redirect).
- Verify: build; `/quran/tafsir` renders; `/quran/tafseer` redirects.

### Phase 4 — Regroup the researcher tools

- `quran-research/researcher/tafsir-display/` → `researcher/tafsir/`
  (sits beside `tafsir-page`); `researcher/iraab-display/` →
  `researcher/iraab/`. Both stay unrouted (decision §2.2).
- `quran-research/quran-landing/` → `landing/`
- `quran-research/quran-researcher-shell/` → `researcher/` (shell at root)
- `quran-research/al-quran/` → `researcher/al-quran/`
- `quran-research/researcher/{lexicon,uloom,notes}` → `researcher/{lexicon,uloom,notes}`
- `notes-page.component` → `researcher-notes-page.component`
  (`km-notes-page` → `km-researcher-notes-page`).
- Delete the now-empty `quran-research/` folder; update `quran.routes.ts` paths.

Verify: build; `/quran` landing, and each researcher tab (al-quran, lexicon,
tafsir, uloom, notes).

### Phase 5 — Doc-editor reconciliation (riskiest phase — isolate it)

Canonical editor = `features/docs/doc-editor/`. Do **not** create a third copy.

1. Diff capability: list what `sura/notes/` has that docs' editor lacks
   (candidates: `callout`, `slash-command`, `text-direction` extensions,
   `km-document-style-palette`). Port the missing pieces into
   `features/docs/doc-editor/tiptap-extensions/` (or its existing folders).
2. If the editor is genuinely app-wide (used by quran notes + worldview notes
   + researcher notes + docs), move `features/docs/doc-editor/` →
   `src/app/shared/doc-editor/` and leave a re-export or update docs imports.
   If only docs + quran use it, importing from `features/docs/` is acceptable
   for now — decide by grep at execution time.
3. Point `surah-notes.component` at the shared editor; delete the editor
   internals from `sura/notes/` (`km-document-*`, `km-bubble-menu`,
   `km-slash-menu`, `km-link-dialog`, style palette, `extensions/`).
4. Repeat the "consume, don't re-implement" step for `worldview/notes` and
   `researcher/notes` **only if** they embed their own editor copies — check
   first; if they already just render lists/text, leave them.

Verify: build; create/edit a note in `/quran/surahs/:id/notes`, in the docs
feature, and in worldview notes; confirm callouts, slash menu, and RTL text
direction still work in all three. This phase touches the kmaps doc-space
architecture — keep the single-central-document-space contract intact.

### Phase 6 — Structural moves (the big rename)

All `git mv`, then fix `quran.routes.ts` import paths. URLs unchanged.

- `shared/quran-page-shell.component.*` → `ui/page-shell/`
- `shared/morph-word-card.component.ts` → `ui/word-card/`
- `shared/empty-state/` → `ui/empty-state/` (stays in feature, §2.3)
- `sura/surah-card/` → `ui/surah-card/`
- `sura/surah-actions/` → `ui/action-bar/` (file → `surah-action-bar.component.*`)
- `sura/action-icon-tile/` → `ui/action-tile/` (file → `action-tile.component.*`)
- `sura/quran-surahs/` → `surah/index/` (file → `surah-index.component.*`)
- `sura/text/` → `surah/reader/` (file → `surah-reader.component.*`)
- `sura/passage/` → `surah/reader/passage/` (file → `surah-passage.component.*`)
- `sura/study/surah-study.*` → `surah/study/overview/study-overview.component.*`
- `sura/study/detail/surah-study-detail.*` → `surah/study/scene/study-scene.component.*`
- `sura/study/detail/steps/{reading,expressions,passage-structure,sentence-structure}` →
  `surah/study/scene/steps/…` (drop the `study-` filename prefix)
- `sura/study/detail/steps/vocabulary/` → `surah/study/word/` with the §4
  proposal layout: `morph-word-page` at root, `modals/`, `host/`, `parts/`,
  `blocks/`, `support/` (registry, types, base directive, `morph-rich`,
  `morph-icons`)
- `sura/vocabulary/` → `surah/linguistics/` (file → `surah-linguistics.component.*`)
- `sura/{near-synonyms,morphology,review,srs}/` → `surah/{…}/` unchanged
- `sura/notes/` (post-Phase-5 it only holds `surah-notes.*`) → `surah/notes/`
- `sura/worldview/*` → `surah/worldview/*` unchanged
- `sura/lessons/` → `surah/lessons/` (per §2.1 default)
- Delete the now-empty `sura/` folder.

Every route in `quran.routes.ts` needs its import path updated (≈29
`loadComponent` lines); the legacy `sura/*`, `surah/*`, `:surahId` URL
redirects stay exactly as they are.

Verify: build; click through **all 15 screens** in proposal §2. This is the
phase where a missed import shows up — the compiler catches `.ts` paths, so
a green build + landing/reader/study/word/worldview click-through is
sufficient.

### Phase 7 — Selector + class renames (pure find-and-replace, last)

- `km-quran-text` → `km-surah-reader` (`QuranTextComponent` → `SurahReaderComponent`)
- `km-quran-passage` → `km-surah-passage`
- `km-quran-surahs` → `km-surah-index` (`QuranSurahsComponent` → `SurahIndexComponent`)
- `km-surah-vocabulary` → `km-surah-linguistics`
- `km-surah-study` → `km-study-overview`, `km-surah-study-detail` → `km-study-scene`
- `km-surah-actions` → `km-surah-action-bar`, `km-action-icon-tile` → `km-action-tile`

Grep each old selector across `apps/k-maps/src` (templates included) before
and after; count must go to zero. Verify: build + spot-check reader, index,
study screens.

### Phase 8 — Docs & memory

- Update `docs/quran-module-refactor-structure.md` status line from
  "Proposal" to "Executed <date>", noting the deviations (§1/§2 of this doc).
- Update `docs/quran-morphology-step-process.md` if it references old paths.
- `grep -rn "sura/" apps/k-maps/src --include='*.ts'` → only legacy URL
  redirect strings in `quran.routes.ts` should remain.

---

## 4. Risk Register

| Risk | Mitigation |
|---|---|
| iCloud-evicted files hang tooling / get moved as empty | Phase 0 materializes them first; verify `dataless` flag cleared |
| `morph-block.registry.ts` drifts from renamed block files | Phase 2 renames files + registry in one commit; word page click-through with a fully-authored word (كتاب) |
| Doc-editor merge breaks notes in another surface | Phase 5 is its own PR; test all three note surfaces + docs feature; port extensions before deleting the quran copy |
| Deep-linked old URLs break | URLs don't change (except `tafseer`→`tafsir`, which gets a redirect); legacy redirect table untouched |
| Hidden template-string component usage escapes grep | Angular standalone components are always imported by path — the compiler catches every miss at build time |
| Mobile app coupling | Verified: `apps/app-k-maps` shares no code with `apps/k-maps` features; Phase 0 re-confirms with grep |
