# K-MAPS SRS — Multi-Domain Spaced Repetition Design

> Status: implemented — Phases 1-3 shipped
> Last updated: 2026-05-21
> Scope: cross-domain Anki-style SRS with FSRS scheduling and Anki export
>
> Phase 1 (AR engine + mobile review loop), Phase 2 (CORE enrollment
> registry + Add-to-SRS flow) and Phase 3 (Anki TSV export) are shipped.
> Remaining follow-ups: per-domain "Add to SRS" buttons in the QR reader /
> AL lexicon / WV concept pages (the AddToSrsService is ready to drop in),
> FSRS weight tuning, and `.apkg` export.

## 1. Goals

A single spaced-repetition system that serves every learning domain in
K-MAPS:

- **Quran (QR)** — vocabulary, morphology, difficult-verse translation,
  key theological verses, topic-anchor verses, Quranic verbal idioms &
  expressions.
- **Arabic language (AL/AR)** — poetry lines, literary lines, lexicon
  drills.
- **Worldview (WV)** — thinker quotes, concept definitions.
- **Hadith & Islamic tradition** — hadith texts, fiqh rulings, points of
  wisdom, themed collections. (New content area — see §3.)
- **Brainstorm** — free-form personal cards not tied to canonical data.

Requirements:

- Anki-style cards: an explicit front and back, plus structured extras.
- FSRS scheduling (the existing `ar_srs_*` tables are already FSRS-shaped).
- Export to Anki (TSV first, `.apkg` later).
- Per-user, per-workspace decks.
- One unified review session across decks/domains.

## 2. Architecture

### 2.1 One engine, in AR

`CLAUDE.md` assigns **AR** ownership of "curriculum, lessons, exercises,
SRS, learner workflow". The existing `core_srs_registry` schema already
states: *"Actual card data (stability, difficulty, FSRS state) lives in
AR."* So:

- **AR is the universal SRS engine.** It owns decks, cards, review log,
  and the scheduler — for every domain.
- A card is **not** a duplicate of canonical data. It stores a typed
  `resource_ref` (`QR:…`, `AL:…`, `WV:…`) plus a *rendered snapshot*
  (front/back text) for offline review and Anki export.
- **CORE** owns `core_srs_registry` — the cross-domain index of "user X
  is learning resource Y in module Z". It answers "is this verse already
  in my SRS?" without AR having to scan by resource.

This keeps domain ownership intact: QR/WV/AL still own their canonical
data; AR owns only the *learning state*; CORE owns only the *enrollment
index*.

### 2.2 Why not per-domain SRS tables

Giving QR/WV/etc. their own `*_srs_*` tables would mean 5× the scheduler,
5× the review endpoints, and no unified review session or export. The
current broken `qr_srs_items` is exactly this dead-end and will be
removed (§8).

### 2.3 Component map

```
Mobile  /srs dashboard ─┐
        review session ─┼─► backend gateway ─► AR worker  (km_arabic)
        deck / card UI ─┘                       ├ ar_srs_decks
"Add to SRS" (QR/WV/…) ─────────────────────────┤ ar_srs_cards
                                                ├ ar_srs_reviews
                                                └ FSRS scheduler module
                          CORE worker (km_core)
                          └ core_srs_registry  (enrollment index)
```

## 3. Domain → deck/card taxonomy

Decks carry a `deck_type`; cards carry a `card_template` that picks the
front/back layout. Proposed enums:

| Domain | deck_type | card_template | resource_ref | front → back |
|--------|-----------|---------------|--------------|--------------|
| QR | `vocabulary` | `qr_vocab` | `AL:<lemma>` | word → gloss + root |
| QR | `morphology` | `qr_morph` | `QR:<word>` | surface form → morphology parse |
| QR | `translation` | `qr_translation` | `QR:<surah:ayah>` | Arabic verse → translation |
| QR | `theology` | `qr_theology` | `QR:<surah:ayah>` | prompt → verse + note |
| QR | `topic` | `qr_topic` | `QR:<surah:ayah>` | topic question → verse |
| QR | `idiom` | `qr_idiom` | `AL:<expression>` | idiom → meaning + usage |
| AL/AR | `poetry` | `ar_poetry` | `AL:<line>` | line → completion / meaning |
| AL/AR | `literature` | `ar_literature` | `AL:<line>` | excerpt → source / meaning |
| WV | `quote` | `wv_quote` | `WV:<quote>` | quote → thinker + context |
| WV | `concept` | `wv_concept` | `WV:<concept>` | term → definition |
| Hadith | `hadith` | `hd_hadith` | `WV:<…>` / `other` | hadith → grading + theme |
| Hadith | `fiqh` | `hd_fiqh` | `other` | ruling question → answer |
| any | `brainstorm` | `freeform` | `null` | user front → user back |
| any | `mixed` | (per card) | varies | — |

**Hadith / Islamic tradition** has no worker today. Options, in
preference order:
1. **Phase 2 decision** — treat hadith cards as `module = 'other'` with a
   free-form template and (optionally) a `CM` document ref. No new worker
   needed to start.
2. Later: a dedicated `HD` worker if hadith grows its own corpus.

The design does **not** block on this — hadith cards work as free-form
from day one.

## 4. Data model

### 4.1 Existing AR tables (keep)

`ar_srs_decks`, `ar_srs_cards`, `ar_srs_reviews` already exist with
FSRS-shaped columns (`stability`, `difficulty`, `elapsed_days`,
`scheduled_days`, `reps`, `lapses`, `card_state`).

### 4.2 Required migration — card content columns

`ar_srs_cards` today only has `resource_ref` + `resource_type`. Anki-style
review and export need self-contained content. Migration adds:

```sql
ALTER TABLE ar_srs_cards ADD COLUMN card_template TEXT NOT NULL DEFAULT 'freeform';
ALTER TABLE ar_srs_cards ADD COLUMN front_text    TEXT NOT NULL DEFAULT '';
ALTER TABLE ar_srs_cards ADD COLUMN back_text     TEXT NOT NULL DEFAULT '';
ALTER TABLE ar_srs_cards ADD COLUMN extra_json    TEXT;          -- structured extras
ALTER TABLE ar_srs_cards ADD COLUMN tags          TEXT;          -- space-separated, Anki-style
ALTER TABLE ar_srs_cards ADD COLUMN suspended     INTEGER NOT NULL DEFAULT 0;
```

- `front_text` / `back_text` — the rendered faces. For resource-backed
  cards these are filled in at creation from canonical data (and can be
  re-synced); for `freeform`/brainstorm cards the user types them.
- `extra_json` — template-specific structured fields (audio ref,
  morphology table, example sentences, source citation).
- `tags` — drives filtering and maps directly to Anki tags on export.
- `resource_ref` becomes nullable (already effectively optional for
  free-form cards); the `UNIQUE (deck_id, resource_ref)` constraint stays
  but only meaningfully applies when `resource_ref` is non-null.

### 4.3 CORE registry (already designed)

`core_srs_registry` + `validateSrsCardInput` already exist. Phase 2 wires
its repo into the CORE worker. No schema change needed; `module` enum may
gain `'HD'` if a hadith worker lands later.

## 5. FSRS scheduler

There is **no scheduler today** — `srs.repo.ts` is pure CRUD. Add one
isolated, pure module: `workers/arabic/src/srs/scheduler.ts`.

```
schedule(card, rating, now) → {
  stability, difficulty, scheduled_days,
  elapsed_days, reps, lapses, card_state, next_review_at
}
```

- `rating`: 1 Again · 2 Hard · 3 Good · 4 Easy.
- `card_state`: `new → learning → review`, with `relearning` after a lapse.
- Implement **FSRS-4.5** (the columns are FSRS-native). The algorithm is
  a small set of pure formulas over `stability`/`difficulty`; default
  weights ship as a constant and can be tuned later.
- Pure and unit-testable — no DB access. The route handler calls
  `schedule()`, then `repo.updateCard()` + `repo.logReview()` in sequence.

A simpler **SM-2** fallback is acceptable for Phase 1 if FSRS tuning is
deferred — same interface, same columns, fewer parameters.

## 6. API surface

All under the AR worker (`module = ar`, `publicGet: false` — SRS is
always per-user, auth required). Exposed through the backend gateway at
`/api/ar/srs/*`.

### 6.1 Decks

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/ar/srs/decks` | list the user's decks + due counts |
| POST | `/ar/srs/decks` | create a deck |
| GET | `/ar/srs/decks/:id` | deck detail |
| PATCH | `/ar/srs/decks/:id` | rename / archive |
| GET | `/ar/srs/decks/:id/cards` | all cards in a deck |
| GET | `/ar/srs/decks/:id/due` | due queue for one deck |

### 6.2 Cards & review

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/ar/srs/cards` | create a card |
| PATCH | `/ar/srs/cards/:id` | edit content / suspend |
| DELETE | `/ar/srs/cards/:id` | delete a card |
| POST | `/ar/srs/cards/:id/grade` | grade (rating 1-4) → FSRS reschedule + log |
| GET | `/ar/srs/review` | unified due queue across all decks |
| GET | `/ar/srs/stats` | new / due / learning / review counts |

### 6.3 Export

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/ar/srs/export?deck=:id&format=tsv` | Anki-importable TSV |
| GET | `/ar/srs/export?deck=:id&format=apkg` | `.apkg` (Phase 3) |

### 6.4 CORE registry (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/core/srs/registry?module=QR` | resources the user is learning |
| POST | `/core/srs/registry` | enroll a resource (called by "Add to SRS") |
| DELETE | `/core/srs/registry/:id` | un-enroll |

## 7. Mobile UX

Replace the `/srs` placeholder page with a real feature module.

- **`/srs` — dashboard.** Deck grid; each deck card shows due / new /
  learning counts and a colour by `deck_type`. A "Review all due" button.
- **`/srs/deck/:id` — deck detail.** Card list, due summary, "Start
  review", deck settings.
- **`/srs/review` — review session.** One card at a time: front shown →
  tap to flip → back revealed → `Again / Hard / Good / Easy` buttons →
  `POST grade` → next card. Progress bar; end-of-session summary.
- **Card editor.** Create/edit free-form cards; resource-backed cards are
  created via "Add to SRS" and are read-only content (re-synced from
  source).
- **"Add to SRS"** — Phase 2 — an action in the QR reader, vocabulary
  lists, WV concept pages, etc. Calls `POST /core/srs/registry` +
  `POST /ar/srs/cards`, pre-filling front/back from the resource.

Visual language follows the capture-note cards already shipped (depth,
gradient, stage-coloured accents).

## 8. Cleanup — remove the broken QR SRS

The current `qr_srs_items` path is an orphaned dead-end (the table never
existed in any schema, migration, or the live `km_quran` DB):

- Delete `workers/quran/src/routes/srs.ts`,
  `workers/quran/src/repositories/srs.repo.ts`,
  `workers/quran/src/schemas/srs.schema.ts`; unwire `srsRoutes` from
  `workers/quran/src/index.ts`.
- Remove the mobile `surah-srs` page + its route, and the `srs` action in
  `surah-actions.component.ts` — or, in Phase 2, repoint that action at
  "Add this surah's verses to an SRS deck".

## 9. Phasing

**Phase 1 — engine + review loop. ✅ Shipped.**
- Migration `0001_srs_card_content.sql`: card content columns on
  `ar_srs_cards` (applied to live `km_arabic`).
- `workers/arabic/src/srs/scheduler.ts` — pure SM-2 `schedule()`.
- AR routes: decks, cards, due, `grade`, `review`, `stats`.
- Mobile: `/srs` dashboard + deck detail + review session + card editor.
- Removed the broken `qr_srs_items` code (§8).

**Phase 2 — domain enrollment. ✅ Shipped.**
- `core_srs_registry` repo + `GET/POST/DELETE /core/srs/registry`
  wired into the CORE worker.
- `SrsRegistryService` + a reusable `AddToSrsService` (deck picker →
  create card → register enrollment) on mobile.
- First "Add to SRS" entry point: the capture-note editor.
- Follow-up: per-domain "Add to SRS" buttons in QR/AL/WV item lists —
  `AddToSrsService.addToSrs()` is the drop-in call.

**Phase 3 — export & polish. ✅ Shipped (TSV).**
- `GET /ar/srs/decks/:id/export` returns Anki-importable TSV
  (`#separator:tab`, `#html:true`, tags column). Mobile "Export to
  Anki" hands it to the share sheet (clipboard fallback).
- Follow-up: `.apkg` packaging, shared/public decks, FSRS weight
  tuning.

## 10. Open questions

1. **FSRS vs SM-2 for Phase 1** — FSRS matches the columns but needs
   weight tuning; SM-2 is simpler and ships faster. Recommendation: ship
   SM-2-compatible math behind the `schedule()` interface, upgrade to
   FSRS weights in Phase 3 without a schema change.
2. **Hadith corpus** — free-form cards now; dedicated `HD` worker only if
   a real hadith corpus is imported later.
3. **Card content sync** — when canonical data changes, do resource-backed
   cards re-render their front/back? Proposed: lazy re-sync on next review,
   gated behind a `content_synced_at` check (Phase 2 detail).
4. **`.apkg` generation in a Worker** — it is a zipped SQLite file;
   feasible but heavy. TSV covers 90% of the need; revisit `.apkg` in
   Phase 3.
