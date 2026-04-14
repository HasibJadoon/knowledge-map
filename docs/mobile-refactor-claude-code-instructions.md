# K-MAPS Mobile App — Deep Refactor Instructions for Claude Code

> **Target app**: `apps/app-k-maps` (Ionic Angular mobile)
> **Desktop source of truth**: `apps/k-maps-v2` architecture as defined in `CLAUDE.md`
> **Date created**: 2026-04-14
> **Instruction type**: Step-by-step, production-grade, safe refactor

---

## CRITICAL RULES BEFORE YOU START

Read every rule below before touching a single file.

1. **The app is already working.** Never break working functionality. Every change must be safe and traceable.
2. **CLAUDE.md is the architectural bible.** All structural decisions must align with the definitions in `CLAUDE.md`.
3. **Desktop app (`k-maps-v2`) is the naming and structure reference.** Even though `apps/k-maps-v2` is still in development, its intended architecture (documented in `CLAUDE.md`) is the target.
4. **Do not rewrite logic.** Move, rename, and reorganize. Rewrite only what is structurally wrong.
5. **Trace every import before deleting.** Never delete a file without verifying nothing imports it.
6. **Update every import after every move.** If you move a file, find all importers and update their paths immediately — in the same step.
7. **Do not migrate NgModules to standalone components in bulk.** This is not part of this refactor scope. Respect existing module boundaries.
8. **Preserve all auth logic, interceptors, guards, and HTTP services.** These are production-critical.
9. **GSAP animations, Three.js fire shader, and all home page logic must be preserved exactly.**
10. **After each phase, do a sanity check.** Verify imports are clean, no orphan references remain.

---

## CONTEXT: WHAT EXISTS NOW (AUDIT SUMMARY)

### Mobile App Location
```
apps/app-k-maps/src/app/
```

### Current Routing Entry Point
```
app-routing.module.ts   ← NgModule-based router (keep as-is for now)
Default redirect: '' → /home   ← CORRECT, preserve this
```

### Current Feature Tree (Actual)
```
features/
├── home/                     ← KEEP — has Three.js fire + GSAP entrance
├── arabic/
│   ├── lessons/              ← KEEP — has sub-study pages
│   │   └── arabic-lessons/   ← DUPLICATE NESTED FOLDER — DELETE
│   ├── roots/
│   │   └── arabic-roots/     ← DUPLICATE NESTED FOLDER — DELETE
│   ├── lexicon/
│   │   └── arabic-lexicon/   ← DUPLICATE NESTED FOLDER — DELETE
│   ├── tokens/
│   │   └── arabic-tokens/    ← DUPLICATE NESTED FOLDER — DELETE
│   └── memory/
│       └── arabic-memory/    ← DUPLICATE NESTED FOLDER — DELETE
├── quran/
│   ├── pages/
│   │   ├── browse-page/      ← KEEP
│   │   ├── text-page/        ← KEEP
│   │   ├── reader-page/      ← KEEP
│   │   ├── passage-page/     ← KEEP
│   │   ├── passage-study-page/ ← KEEP
│   │   ├── surah-study-page/ ← KEEP
│   │   ├── surah-notes-page/ ← KEEP
│   │   ├── surah-vocabulary-page/ ← KEEP
│   │   ├── surah-review-page/ ← KEEP
│   │   ├── surah-srs-page/   ← KEEP
│   │   ├── worldview-hub-page/    ← MISPLACED — belongs in worldview/ (see Phase 4)
│   │   ├── worldview-nodes-page/  ← MISPLACED — belongs in worldview/
│   │   ├── worldview-sources-page/ ← MISPLACED — belongs in worldview/
│   │   ├── worldview-podcasts-page/ ← MISPLACED — belongs in worldview/
│   │   ├── worldview-documents-page/ ← MISPLACED — belongs in worldview/
│   │   ├── worldview-notes-page/  ← MISPLACED — belongs in worldview/
│   │   └── worldview-links-page/  ← MISPLACED — belongs in worldview/
│   └── components/
│       └── quran-page-renderer/ ← KEEP
├── worldview/
│   ├── worldview/            ← DUPLICATE NESTED FOLDER — FLATTEN
│   │   ├── worldview.page.ts
│   │   ├── data/kmaps-workflow.data.ts
│   │   └── models/wv-workspace.models.ts
│   └── worldview.routes.ts
├── planner/
│   ├── components/           ← KEEP
│   ├── weekly-plan/          ← KEEP
│   └── sprint-review/        ← RENAME → review/ (align with desktop)
├── hub/                      ← STUB — needs expansion (Phase 6)
│   └── hub.routes.ts
├── workspace/                ← STUB — needs expansion (Phase 7)
│   └── workspace.routes.ts
├── content/                  ← KEEP AS-IS
│   └── content.routes.ts
├── srs/                      ← KEEP (shared SRS system in CLAUDE.md)
│   └── srs.routes.ts
├── docs/                     ← DELETE — not in desktop architecture
│   ├── docs-list/
│   └── docs.routes.ts
└── arabic-reaction/          ← DELETE — not in desktop architecture
    └── arabic-reaction.routes.ts
```

### Current Shared Tree (Actual)
```
shared/
├── models/
│   ├── arabic/               ← KEEP (sub-folder)
│   ├── arabic-lesson.model.ts ← DUPLICATE (already in arabic/) — DELETE root-level copy
│   ├── brainstorm-session.model.ts ← OLD MODEL — phase out in Phase 8
│   ├── concept.model.ts       ← review relevance
│   ├── content-item.model.ts  ← KEEP
│   ├── content-library-link.model.ts ← KEEP
│   ├── cross-reference.model.ts ← review relevance
│   ├── discourse-edge.model.ts ← review relevance
│   ├── grammatical-concept.model.ts ← KEEP
│   ├── lexicon-entry.model.ts ← KEEP
│   ├── library-entry.model.ts ← review relevance
│   ├── quran-reader.model.ts  ← KEEP
│   ├── quran-relation.model.ts ← DUPLICATE (also in arabic/) — check which is canonical
│   ├── root.model.ts          ← KEEP
│   ├── sprint-review.model.ts ← RENAME → planner.model.ts or planner-review.model.ts
│   ├── token.model.ts         ← KEEP
│   ├── user-activity-log.model.ts ← KEEP
│   ├── user-state.model.ts    ← KEEP
│   ├── user.model.ts          ← KEEP
│   ├── worldview-claim.model.ts ← OLD MODEL — phase out in Phase 8
│   ├── worldview-lesson.model.ts ← OLD MODEL — phase out in Phase 8
│   └── worldview-lesson-worldview.model.ts ← OLD MODEL — phase out in Phase 8
├── services/                 ← KEEP all, clean file list (Phase 5)
├── components/               ← KEEP
│   ├── app-add-button/
│   ├── icon-tabs/
│   ├── native-searchbar/
│   └── bottom-tab-bar/
├── directives/               ← KEEP
│   └── long-press.directive.ts
├── targeting/                ← MOVE → shared/components/targeted-notes-panel/
│   └── targeted-notes-panel/
├── focus-utils.ts            ← KEEP
├── overlay-classes.ts        ← KEEP
└── notes.models.ts           ← MOVE → shared/models/notes.model.ts
```

---

## TARGET STRUCTURE (After Refactor)

```
apps/app-k-maps/src/app/
├── core/
│   ├── auth/
│   │   ├── auth.guard.ts
│   │   ├── auth.interceptor.ts
│   │   └── auth.utils.ts
│   └── login/
│       ├── login.module.ts
│       ├── login-routing.module.ts
│       ├── login.page.ts
│       └── login.page.scss
├── features/
│   ├── home/
│   │   ├── home.page.ts
│   │   └── home.page.scss
│   ├── hub/
│   │   ├── hub.routes.ts
│   │   └── hub-home/
│   │       └── hub-home.page.ts
│   ├── quran/
│   │   ├── quran.routes.ts              ← (create if missing, extract from app-routing)
│   │   ├── pages/
│   │   │   ├── browse-page/
│   │   │   ├── text-page/
│   │   │   ├── reader-page/
│   │   │   ├── passage-page/
│   │   │   ├── passage-study-page/
│   │   │   ├── surah-study-page/
│   │   │   ├── surah-notes-page/
│   │   │   ├── surah-vocabulary-page/
│   │   │   ├── surah-review-page/
│   │   │   └── surah-srs-page/
│   │   └── components/
│   │       └── quran-page-renderer/
│   ├── arabic/
│   │   ├── arabic.routes.ts             ← (create if missing, extract from app-routing)
│   │   ├── lessons/
│   │   │   ├── arabic-lessons.module.ts
│   │   │   ├── arabic-lessons-routing.module.ts
│   │   │   ├── arabic-lessons.page.ts
│   │   │   ├── arabic-lessons.page.scss
│   │   │   └── ar-lesson-study/         ← stays as sub-page
│   │   │   └── ar-quran-study/          ← stays as sub-page
│   │   ├── roots/
│   │   │   ├── arabic-roots.module.ts
│   │   │   ├── arabic-roots-routing.module.ts
│   │   │   ├── arabic-roots.page.ts
│   │   │   ├── arabic-roots.page.scss
│   │   │   └── root-cards/
│   │   ├── vocabulary/                  ← RENAMED from lexicon/
│   │   │   ├── arabic-vocabulary.module.ts   ← RENAMED from arabic-lexicon.module.ts
│   │   │   ├── arabic-vocabulary-routing.module.ts
│   │   │   ├── arabic-vocabulary.page.ts     ← RENAMED
│   │   │   └── arabic-vocabulary.page.scss
│   │   ├── tokens/
│   │   │   ├── arabic-tokens.module.ts
│   │   │   ├── arabic-tokens-routing.module.ts
│   │   │   ├── arabic-tokens.page.ts
│   │   │   └── arabic-tokens.page.scss
│   │   └── memory/
│   │       ├── arabic-memory.module.ts
│   │       ├── arabic-memory-routing.module.ts
│   │       ├── arabic-memory.page.ts
│   │       └── arabic-memory.page.scss
│   ├── worldview/
│   │   ├── worldview.routes.ts          ← flatten (remove duplicate worldview/ sub-folder)
│   │   ├── worldview.page.ts            ← promoted from worldview/worldview/
│   │   ├── worldview.page.scss
│   │   ├── data/
│   │   │   └── kmaps-workflow.data.ts
│   │   ├── models/
│   │   │   └── wv-workspace.models.ts
│   │   └── quran-context/               ← NEW: Quran-scoped worldview pages (moved from quran/pages/)
│   │       ├── worldview-hub-page/
│   │       ├── worldview-nodes-page/
│   │       ├── worldview-sources-page/
│   │       ├── worldview-podcasts-page/
│   │       ├── worldview-documents-page/
│   │       ├── worldview-notes-page/
│   │       └── worldview-links-page/
│   ├── workspace/
│   │   └── workspace.routes.ts
│   ├── planner/
│   │   ├── components/
│   │   │   ├── planner-page-header/
│   │   │   └── planner-tab-bar/
│   │   ├── weekly-plan/
│   │   └── review/                      ← RENAMED from sprint-review/
│   │       ├── review.page.ts           ← RENAMED from sprint-review.page.ts
│   │       └── review.page.scss
│   ├── content/
│   │   └── content.routes.ts
│   └── srs/
│       └── srs.routes.ts
├── shared/
│   ├── components/
│   │   ├── app-add-button/
│   │   ├── icon-tabs/
│   │   ├── native-searchbar/
│   │   ├── bottom-tab-bar/
│   │   └── targeted-notes-panel/        ← MOVED from shared/targeting/
│   ├── directives/
│   │   └── long-press.directive.ts
│   ├── models/
│   │   ├── arabic/
│   │   │   ├── arabic-lesson.model.ts
│   │   │   ├── quran-lesson.model.ts
│   │   │   └── quran-relation.model.ts
│   │   ├── aui-enums.model.ts
│   │   ├── content-item.model.ts
│   │   ├── content-library-link.model.ts
│   │   ├── grammatical-concept.model.ts
│   │   ├── lexicon-entry.model.ts
│   │   ├── notes.model.ts               ← RENAMED from notes.models.ts
│   │   ├── quran-reader.model.ts
│   │   ├── root.model.ts
│   │   ├── token.model.ts
│   │   ├── user-activity-log.model.ts
│   │   ├── user-state.model.ts
│   │   └── user.model.ts
│   ├── services/
│   │   └── (all existing services, preserved)
│   ├── focus-utils.ts
│   └── overlay-classes.ts
└── app-routing.module.ts  ← keep as-is (do NOT migrate to standalone routes yet)
```

---

## PHASE 1 — Eliminate Duplicate Nested Folders in arabic/

**Problem**: Each Arabic sub-feature has an extra nested folder with the same name:
- `arabic/lessons/arabic-lessons/` inside `arabic/lessons/`
- `arabic/roots/arabic-roots/` inside `arabic/roots/`
- `arabic/lexicon/arabic-lexicon/` inside `arabic/lexicon/`
- `arabic/tokens/arabic-tokens/` inside `arabic/tokens/`
- `arabic/memory/arabic-memory/` inside `arabic/memory/`

These nested duplicates are structural clutter. The top-level folder IS the feature. The inner copy is wrong.

### Steps

**1.1** For `features/arabic/lessons/arabic-lessons/`:
- Read `features/arabic/lessons/arabic-lessons/arabic-lessons.page.ts`
- Read `features/arabic/lessons/arabic-lessons.page.ts`
- Compare — if the nested copy is identical or older, it is the duplicate
- Check if anything imports from the nested path `arabic/lessons/arabic-lessons/arabic-lessons.page`
- If nothing imports it, delete `features/arabic/lessons/arabic-lessons/` entirely
- If something imports it, update those imports to point to the parent-level file, then delete

**1.2** Repeat the same process for:
- `features/arabic/roots/arabic-roots/`
- `features/arabic/lexicon/arabic-lexicon/`
- `features/arabic/tokens/arabic-tokens/`
- `features/arabic/memory/arabic-memory/`

**1.3** After deletions, run a grep across all `.ts` files in `apps/app-k-maps/src` for any remaining import paths that reference the deleted nested paths. Fix any found.

**Verification**: No folder should be named the same as its direct parent folder.

---

## PHASE 2 — Rename arabic/lexicon/ → arabic/vocabulary/

**Why**: The CLAUDE.md schema uses `ar_vocab` for vocabulary. The desktop feature aligns with `vocabulary/`. The name `lexicon/` is a legacy naming. Rename for alignment.

### Steps

**2.1** Rename folder: `features/arabic/lexicon/` → `features/arabic/vocabulary/`

**2.2** Rename files inside:
- `arabic-lexicon.module.ts` → `arabic-vocabulary.module.ts`
- `arabic-lexicon-routing.module.ts` → `arabic-vocabulary-routing.module.ts`
- `arabic-lexicon.page.ts` → `arabic-vocabulary.page.ts`
- `arabic-lexicon.page.scss` → `arabic-vocabulary.page.scss`

**2.3** Inside `arabic-vocabulary.module.ts`: update all internal references from `ArabicLexicon*` → `ArabicVocabulary*` (class names, selectors, declared components).

**2.4** Inside `arabic-vocabulary-routing.module.ts`: update component references.

**2.5** Inside `arabic-vocabulary.page.ts`: update the `@Component` selector from `app-arabic-lexicon` → `app-arabic-vocabulary`.

**2.6** In `app-routing.module.ts`: find the route that loads `ArabicLexiconModule` or the lexicon route path. Update:
- Path: if it was `arabic/lexicon`, update to `arabic/vocabulary`
- Import path: update to new file location
- Module name: update to `ArabicVocabularyModule`

**2.7** In `features/home/home.page.ts`: find the navigation card that routes to `/arabic/lexicon`. Update route to `/arabic/vocabulary`. Update card label to `Vocabulary` if it still says `Lexicon`.

**2.8** Grep for any remaining `arabic-lexicon` string in `.ts`, `.html`, `.scss` files. Fix each occurrence.

**Verification**: No file or import should reference `arabic-lexicon` or `arabicLexicon` after this phase.

---

## PHASE 3 — Rename planner/sprint-review/ → planner/review/

**Why**: Desktop planner uses `/planner` and the review sub-feature in CLAUDE.md is aligned with the Planner system, not called "sprint-review". Aligning to `review/` removes the legacy sprint naming.

### Steps

**3.1** Rename folder: `features/planner/sprint-review/` → `features/planner/review/`

**3.2** Rename files inside:
- `sprint-review.page.ts` → `review.page.ts`
- `sprint-review.page.scss` → `review.page.scss`

**3.3** Inside `review.page.ts`: update the `@Component` class name from `SprintReviewPage` → `ReviewPage`. Update selector if present.

**3.4** In `app-routing.module.ts`: find the route `review/:weekStart`. Update:
- The `loadComponent` import path to point to the new `review.page.ts` location

**3.5** In `shared/models/sprint-review.model.ts`: rename to `shared/models/planner-review.model.ts`. Update the interface/class names from `SprintReview*` → `PlannerReview*` (or keep `Review*`).

**3.6** Find all files that import `sprint-review.model`. Update import paths and type names.

**3.7** Grep for `sprint-review` across all `.ts`, `.html`, `.scss` files. Fix all remaining references.

**Verification**: No file, folder, or import should contain `sprint-review` after this phase.

---

## PHASE 4 — Flatten worldview/ Nested Folder + Relocate Quran-Context Worldview Pages

### Part A: Flatten the worldview/worldview/ duplicate

**Problem**: `features/worldview/worldview/worldview.page.ts` is nested inside its own parent, creating `worldview/worldview/`.

**4.1** Read `features/worldview/worldview/worldview.page.ts` fully.
**4.2** Read `features/worldview/worldview.routes.ts` to understand how `WorldviewPage` is imported.
**4.3** Move `worldview.page.ts` and `worldview.page.scss` up one level to `features/worldview/`.
**4.4** Move `features/worldview/worldview/data/kmaps-workflow.data.ts` → `features/worldview/data/kmaps-workflow.data.ts`
**4.5** Move `features/worldview/worldview/models/wv-workspace.models.ts` → `features/worldview/models/wv-workspace.models.ts`
**4.6** Delete the now-empty `features/worldview/worldview/` folder.
**4.7** In `worldview.routes.ts`: update the import path for `WorldviewPage` to `./worldview.page`.
**4.8** Update any other imports of `kmaps-workflow.data` or `wv-workspace.models` to new paths.

### Part B: Relocate Quran-Context Worldview Pages

**Problem**: The following pages are inside `quran/pages/` but are worldview-scoped pages rendered within a Quran surah context. They must move to `worldview/quran-context/` for structural alignment.

Pages to move:
- `quran/pages/worldview-hub-page/`
- `quran/pages/worldview-nodes-page/`
- `quran/pages/worldview-sources-page/`
- `quran/pages/worldview-podcasts-page/`
- `quran/pages/worldview-documents-page/`
- `quran/pages/worldview-notes-page/`
- `quran/pages/worldview-links-page/`

**4.9** Create directory: `features/worldview/quran-context/`

**4.10** For each worldview page listed above:
- Read the `.ts` file fully
- Move the entire folder to `features/worldview/quran-context/`
- Update the `@Component` `templateUrl` / `styleUrls` paths if they are relative (they will break after moving)

**4.11** In `app-routing.module.ts`: these pages are registered as children of `/quran/surah/:surahId/worldview/`. Their routes are paths like `nodes`, `sources`, `podcasts`, `documents`, `notes`, `links`. Update the `loadComponent` import paths for each of these routes to point to their new location under `worldview/quran-context/`.

**4.12** Grep for any other import of these moved components. Update all found imports.

**Verification**: `quran/pages/` should contain only Quran-reader pages (browse, text, reader, passage, surah-study, etc.). No worldview-* folders should remain in `quran/pages/`.

---

## PHASE 5 — Clean shared/models/ and shared/targeting/

### Part A: Remove duplicate and legacy models

**5.1** Read `shared/models/arabic-lesson.model.ts` (root-level) and `shared/models/arabic/arabic-lesson.model.ts`. Compare them. If they are the same or the root-level one is older/shorter, delete the root-level duplicate. Update any imports that referenced the root-level path to use `shared/models/arabic/arabic-lesson.model.ts`.

**5.2** Read `shared/models/quran-relation.model.ts` (root-level) and `shared/models/arabic/quran-relation.model.ts`. Same comparison. If root-level is duplicate, delete and update imports.

**5.3** Check `shared/models/brainstorm-session.model.ts`:
- Grep for all imports of this model across the codebase
- If no active page/component imports it, delete it
- If it IS imported somewhere active, keep it but add a comment: `// TODO: migrate to wv_brainstorm schema (see CLAUDE.md §7)`

**5.4** Check `shared/models/worldview-claim.model.ts`, `worldview-lesson.model.ts`, `worldview-lesson-worldview.model.ts`:
- Same process: grep for imports
- If nothing active imports them, delete all three
- If something imports them, keep with TODO comment

**5.5** Check `shared/models/concept.model.ts`, `cross-reference.model.ts`, `discourse-edge.model.ts`, `library-entry.model.ts`:
- Grep for each in the codebase
- If nothing active imports them, delete
- If imported, keep with TODO comment

**5.6** Rename `shared/notes.models.ts` → `shared/models/notes.model.ts` (singular, inside models/ folder where it belongs). Update all imports.

### Part B: Move targeted-notes-panel out of targeting/

**5.7** Move `shared/targeting/targeted-notes-panel/` → `shared/components/targeted-notes-panel/`
**5.8** Delete the now-empty `shared/targeting/` folder.
**5.9** Update all imports of `targeted-notes-panel.component` to the new path.

**Verification**: `shared/models/` should contain only models that are actively imported or intentionally kept with TODO markers. `shared/targeting/` should no longer exist.

---

## PHASE 6 — Delete Obsolete Features: docs/ and arabic-reaction/

### docs/ feature

**6.1** Read `features/docs/docs.routes.ts` fully.
**6.2** Read `features/docs/docs-list/docs-list.page.ts` fully.
**6.3** Grep across all files for any imports from `features/docs/` or references to `DocsListPage`, `docs.routes`.
**6.4** In `app-routing.module.ts`: find the route that loads `docs.routes` or the `docs` path. Remove that route entry entirely.
**6.5** In `features/home/home.page.ts`: find the navigation card for `Docs`. Remove it from the module cards array. Remove its route (`/docs`) and icon from the list. Update the home page card grid accordingly.
**6.6** Delete `features/docs/` folder entirely.

### arabic-reaction/ feature

**7.1** Read `features/arabic-reaction/arabic-reaction.routes.ts` fully.
**7.2** Grep across all files for imports from `features/arabic-reaction/` or references to its components.
**7.3** In `app-routing.module.ts`: find the route that loads `arabic-reaction.routes`. Remove it.
**7.4** In `features/home/home.page.ts`: find the navigation card for `Reaction` (or `Arabic Reaction`). Remove it from the module cards array.
**7.5** Delete `features/arabic-reaction/` folder entirely.

**Post-deletion verification**: After removing both features, grep for `docs` and `arabic-reaction` paths across all route files and home page navigation arrays. Confirm zero matches.

---

## PHASE 7 — Clean app-routing.module.ts

**7.1** Open `app-routing.module.ts`.

**7.2** Remove the two deleted route entries:
- The route that was loading `docs` feature
- The route that was loading `arabic-reaction` feature

**7.3** Update the Arabic vocabulary route:
- Find the route for `arabic/lexicon` (or however it is named)
- Change the path from `lexicon` to `vocabulary`
- Update the module import to `ArabicVocabularyModule` from the new path

**7.4** Verify the worldview sub-routes under `quran/surah/:surahId/worldview/` now correctly point to `worldview/quran-context/*` pages (done in Phase 4, verify here).

**7.5** Verify the review route still resolves correctly after Phase 3 rename (path `review/:weekStart` pointing to the new `review.page.ts`).

**7.6** Verify the default redirect `'' → /home` is present and is the first route in the array.

**7.7** After all changes, read the entire routing file and validate:
- No route points to a deleted file
- No route points to an old renamed path
- All `loadComponent` and `loadChildren` paths resolve to existing files
- Home is the default

---

## PHASE 8 — Add Missing Desktop Features (Stubs for Hub and Workspace)

**Context from CLAUDE.md**: Hub is the platform CMS — a 3-column layout (sidebar | table | right panel) for all data management. Workspace is the collaborative study group system. Both currently exist as stubs in the mobile app. This phase adds clean, mobile-first implementations.

### Hub Feature Expansion

**8.1** Read `features/hub/hub.routes.ts`. It currently loads only `hub-home`.

**8.2** Create `features/hub/hub-home/hub-home.page.ts` if it does not exist. It must be a standalone IonicModule component with:
- An `IonHeader` with title `Hub`
- An `IonContent` grid of section cards matching the desktop hub sections from CLAUDE.md §8:
  - Quran (surahs, passages)
  - Arabic (vocabulary, grammar, lessons)
  - Worldview (sources, people, worldviews, topics)
  - Workspace (workspaces, members, plans, sessions)
- Use GSAP card entrance animation: `gsap.fromTo('.hub-card', { opacity:0, y:20 }, { opacity:1, y:0, duration:0.4, stagger:0.04, ease:'power2.out' })`
- Style using `--km-surface`, `--km-gold`, `--km-text` CSS variables from the existing design system

**8.3** Create `features/hub/hub-home/hub-home.page.scss` using `--km-*` CSS variables. Ionic grid layout, card-per-section style.

**8.4** `hub.routes.ts` must export `HUB_ROUTES` with the hub-home as default child.

### Workspace Feature Expansion

**8.5** Read `features/workspace/workspace.routes.ts`.

**8.6** Create `features/workspace/workspace-home/workspace-home.page.ts` if it does not exist. Standalone Ionic component showing:
- List of workspaces (empty state with `+` button if none)
- Card per workspace: title, type badge, member count
- Connects to `WorkspaceService` (create or use existing service from `shared/services/`)

**8.7** Update `workspace.routes.ts` to include `workspace-home` as default child.

---

## PHASE 9 — Home Page Navigation Card Cleanup

After deleting `docs` and `arabic-reaction`, and renaming `lexicon` to `vocabulary`, the home page module cards need updating.

**9.1** Open `features/home/home.page.ts`.

**9.2** Find the `modules` or `cards` array. The current 10-item list likely includes cards for Docs and Reaction. After Phase 6, these should be removed.

**9.3** The final home page card list must reflect exactly the desktop app's feature set:
1. **Quran** — route `/quran`
2. **Arabic** — route `/arabic`
3. **Worldview** — route `/worldview`
4. **Planner** — route `/planner`
5. **Hub** — route `/hub`
6. **Workspace** — route `/workspace`
7. **Content** — route `/content`
8. **SRS** — route `/srs`

**9.4** For the Arabic vocabulary route change: if any navigation in the home page passes through `/arabic/lexicon`, update to `/arabic/vocabulary`.

**9.5** Preserve all Three.js fire shader logic, GSAP stagger entrance, and ResizeObserver logic exactly. Only touch the card data array. Nothing else.

---

## PHASE 10 — Final Audit and Verification

### 10.1 Import health check
Run a grep for every file path that was moved, renamed, or deleted:
```
grep -r "arabic-lexicon" apps/app-k-maps/src --include="*.ts"
grep -r "sprint-review" apps/app-k-maps/src --include="*.ts"
grep -r "worldview/worldview" apps/app-k-maps/src --include="*.ts"
grep -r "targeting/targeted-notes" apps/app-k-maps/src --include="*.ts"
grep -r "docs.routes" apps/app-k-maps/src --include="*.ts"
grep -r "arabic-reaction" apps/app-k-maps/src --include="*.ts"
grep -r "notes\.models" apps/app-k-maps/src --include="*.ts"
grep -r "arabic/lessons/arabic-lessons/" apps/app-k-maps/src --include="*.ts"
grep -r "arabic/roots/arabic-roots/" apps/app-k-maps/src --include="*.ts"
grep -r "arabic/lexicon/arabic-lexicon/" apps/app-k-maps/src --include="*.ts"
grep -r "arabic/tokens/arabic-tokens/" apps/app-k-maps/src --include="*.ts"
grep -r "arabic/memory/arabic-memory/" apps/app-k-maps/src --include="*.ts"
```
Every grep result must return zero matches. If any are found, trace and fix before proceeding.

### 10.2 Route integrity check
Read `app-routing.module.ts` fully. For every `loadComponent` and `loadChildren` path, verify the target file exists at that path.

### 10.3 Model reference check
Grep for models that were deleted (brainstorm-session, worldview-claim, worldview-lesson, worldview-lesson-worldview, concept, cross-reference, discourse-edge, library-entry). Confirm nothing active imports them.

### 10.4 Feature folder sanity check
Verify `features/` contains exactly:
- home/
- hub/
- quran/
- arabic/
- worldview/
- workspace/
- planner/
- content/
- srs/

No other top-level folders under `features/`.

### 10.5 Shared folder sanity check
Verify `shared/` contains exactly:
- components/
- directives/
- models/
- services/
- focus-utils.ts
- overlay-classes.ts

No other top-level items (no `targeting/`).

### 10.6 Build validation
Run:
```bash
cd apps/app-k-maps && npx ng build --configuration=development
```
The build must complete with zero errors. TypeScript compilation errors are blockers. Fix all before declaring the refactor complete.

---

## DELIVERABLES SUMMARY

When the refactor is complete, produce a summary report:

### Deleted
- `features/docs/` — not part of desktop architecture
- `features/arabic-reaction/` — not part of desktop architecture
- `features/arabic/lessons/arabic-lessons/` — duplicate nested folder
- `features/arabic/roots/arabic-roots/` — duplicate nested folder
- `features/arabic/lexicon/arabic-lexicon/` — duplicate nested folder
- `features/arabic/tokens/arabic-tokens/` — duplicate nested folder
- `features/arabic/memory/arabic-memory/` — duplicate nested folder
- `features/worldview/worldview/` — flattened (contents moved up one level)
- `shared/targeting/` — moved to shared/components/
- Root-level `shared/models/arabic-lesson.model.ts` — duplicate of arabic/ sub-folder version
- Root-level `shared/models/quran-relation.model.ts` — duplicate of arabic/ sub-folder version
- Legacy worldview models (if unused): brainstorm-session, worldview-claim, worldview-lesson, worldview-lesson-worldview
- Orphaned models (if unused): concept, cross-reference, discourse-edge, library-entry

### Renamed
- `features/arabic/lexicon/` → `features/arabic/vocabulary/`
- All files within lexicon/ renamed from `arabic-lexicon.*` to `arabic-vocabulary.*`
- `features/planner/sprint-review/` → `features/planner/review/`
- `sprint-review.page.ts` → `review.page.ts`
- `shared/models/sprint-review.model.ts` → `shared/models/planner-review.model.ts`
- `shared/notes.models.ts` → `shared/models/notes.model.ts`

### Moved
- `features/worldview/worldview/worldview.page.ts` → `features/worldview/worldview.page.ts`
- `features/worldview/worldview/data/` → `features/worldview/data/`
- `features/worldview/worldview/models/` → `features/worldview/models/`
- `features/quran/pages/worldview-*-page/` (7 pages) → `features/worldview/quran-context/`
- `shared/targeting/targeted-notes-panel/` → `shared/components/targeted-notes-panel/`

### Added
- `features/hub/hub-home/hub-home.page.ts` — hub shell page with section cards
- `features/hub/hub-home/hub-home.page.scss`
- `features/workspace/workspace-home/workspace-home.page.ts` — workspace list page
- `features/worldview/quran-context/` directory

### Preserved Intentionally
- `core/auth/` — production auth logic, untouched
- `core/login/` — production login flow, untouched
- `app-routing.module.ts` — kept as NgModule (NOT migrated to standalone routes)
- `app.module.ts` — kept as root NgModule
- `features/home/home.page.ts` — Three.js fire shader and GSAP animations fully preserved
- All `shared/services/` — all backend API services preserved
- All Quran reader pages in `quran/pages/` (non-worldview pages)
- `features/srs/` — shared SRS system, preserved
- `features/content/` — preserved as-is
- All font assets in `src/assets/fonts/`
- All environment files
- All Capacitor config

---

## NOTES FOR CLAUDE CODE

- Work phase by phase. Complete each phase fully before starting the next.
- After Phase 1–5 (structural cleanup), do a mini-verification before Phase 6–8.
- Never use `git rm` without tracing imports first. Use grep.
- If a file cannot be safely deleted (imports found), do NOT delete it. Mark it with a `// TODO: remove after migration` comment and leave it in place.
- The app must be buildable after every phase. Do not leave it in a broken state between phases.
- CLAUDE.md §7 (Full Database Schema) and §8 (Angular Feature Architecture) are the canonical references for all feature and naming decisions.
- When in doubt, preserve over delete.
