# Test Coverage Analysis

## Summary

The codebase has critically low test coverage across all three major areas: the Cloudflare Workers API backend, the `app-k-maps` Ionic/Angular mobile app, and the `k-maps` Angular web dashboard. Of approximately 1,864 source files, only ~56 test files exist, yielding roughly **3% overall coverage**.

| Area | Source Files | Test Files | Coverage |
|------|-------------|-----------|---------|
| `api/` | ~155 | 0 | **0%** |
| `apps/app-k-maps` | ~282 | 7 | ~2.5% |
| `apps/k-maps` | ~1,427 | 48 | ~3.4% |

---

## Proposed Improvements (Prioritised)

### 1. API JWT & Auth Utilities — `api/_utils/jwt.ts` + `api/_utils/auth.ts`

**Why:** These are security-critical files. `jwt.ts` implements custom HS256 signing/verification using the Web Crypto API. `auth.ts` wraps it with Bearer-token extraction and expiry checking. A bug here compromises every authenticated endpoint. The code is pure TypeScript with no external dependencies, making it the easiest part of the API to unit test.

**What to test:**
- `signToken` produces a valid three-part JWT
- `verifyToken` returns the payload for a validly signed token
- `verifyToken` returns `null` for a tampered signature
- `verifyToken` returns `null` for a malformed token (missing parts, bad base64)
- `requireAuth` returns `null` when no `Authorization` header is present
- `requireAuth` returns `null` for an expired token (`exp` in the past)
- `requireAuth` returns `null` when `sub` is not a number
- `requireAuth` returns the correct `{ id, role }` for a valid token

---

### 2. `KmapsWorkflowService` — `apps/app-k-maps/src/app/shared/services/kmaps-workflow.service.ts`

**Why:** This is the central state-management service for the entire app. It owns notes, sources, units, concepts, claims, and content items. It has rich query logic (filtering, sorting, hierarchical unit scope resolution) and write operations that mutate multiple signals at once. Bugs here corrupt the core data model.

**What to test:**
- `getUnitsForSource` returns units sorted by `orderIndex` and filters by `sourceId`
- `getContributorsForSource` sorts primary contributors first, then by `orderIndex`
- `getNotesForContext` filters correctly by source and optional unit, sorted by date descending
- `getNotesForUnitScope` includes child units recursively (tests the BFS in `resolveUnitScopeIds`)
- `addNote` inserts the note, creates source/unit context links, and bumps the source timestamp
- `updateNote` mutates only the target note and bumps the source timestamp; returns `null` for unknown ID
- `deleteNote` removes the note and its associated links; returns `false` for unknown ID
- `createConceptAndLink` creates a new concept and links notes; deduplicates when a concept with the same label already exists
- `createClaimFromNotes` builds a claim and syncs note-links; derives `sourceId`/`sourceUnitId` from the first note
- `getConceptSuggestions` ranks already-linked concepts first, then filters by query string
- `getPublicationMetaForSource` / `getDescriptiveMetaForSource` aggregate the correct fields and deduplicate entries

---

### 3. `WvNodesService` — `apps/app-k-maps/src/app/shared/services/wv-nodes.service.ts`

**Why:** This service manages AI-generated insight suggestions and user decisions during the distillation workflow. The `saveDecision` method coordinates suggestion status changes, decision upserts, and graph-node persistence — all in one transaction-like operation. `ensureSuggestions` has idempotency logic that must be verified.

**What to test:**
- `getSuggestionsForBatch` returns only suggestions belonging to the given batch
- `getDecisionForSuggestion` returns the correct decision or `null`
- `hydrateBatch` replaces existing entries for the batch while keeping entries from other batches
- `upsertSuggestion` replaces an existing suggestion with the same ID, prepends if new
- `upsertDecision` is a no-op for `null`; replaces an existing decision for the same suggestion
- `ensureSuggestions` is idempotent — calling it twice with the same batch returns the same set
- `ensureSuggestions` returns three suggestions (concept, claim, output) for a batch with selected items
- `saveDecision` returns `null` when the suggestion does not exist
- `saveDecision` creates the correct decision shape and updates the suggestion status to `'approved'` or `'rejected'`
- `buildSuggestions` (indirectly via `ensureSuggestions`) prefers `claim_seed` notes for claim title and `highlight` notes for evidence

---

### 4. `WvDistillService` — `apps/app-k-maps/src/app/shared/services/wv-distill.service.ts`

**Why:** Only one test exists (`ensureDraftBatch` when the latest batch is completed). The service has several other meaningful states and entry points that are completely uncovered.

**What to add:**
- `ensureDraftBatch` when no batches exist at all (should create a new draft)
- `ensureDraftBatch` when a draft already exists (should return the existing draft, not create a new one)
- `getBatchForUnit` returns the latest batch for the unit ID
- `hydrateBatch` replaces items for the given batch without affecting other batches
- Batch status transitions (draft → completed) reflected correctly after `hydrateBatch`

---

### 5. API Route Handlers — `api/api/`, `api/worldview/`, `api/notes/`

**Why:** Every HTTP endpoint is completely untested. The handlers contain branching logic (auth checks, input validation, DB queries) that is invisible at runtime until something goes wrong.

**Approach:** Use the [Cloudflare Workers test utilities](https://developers.cloudflare.com/workers/testing/vitest-integration/) (Vitest + `@cloudflare/vitest-pool-workers`) to create lightweight integration tests for each route family.

**Priority routes to test first:**
- `requireAuth` rejection paths (401 on all protected routes with missing/bad token)
- A representative read route (e.g., `GET /worldview/sources`) — returns 200 with correct shape, returns 401 without auth
- A representative write route (e.g., `POST /worldview/sources`) — validates body, persists correctly, returns 400 on bad input
- Notes CRUD endpoints — create, read, update, delete flow

---

### 6. Angular Shared Components — `apps/app-k-maps/src/app/shared/components/`

**Why:** The three shared components (`app-add-button`, `icon-tabs`, `native-searchbar`) have zero tests. These are reused across the feature modules; a regression in any of them can silently break multiple pages.

**What to test:**
- `app-add-button`: emits the expected event on click; respects a disabled input
- `icon-tabs`: renders the correct number of tabs; emits the selected tab index on change
- `native-searchbar`: debounces input and emits the search value; clears correctly

---

### 7. `KmapsWorkflowService.reload()` — API Integration Path

**Why:** The constructor calls `reload()` which fetches from `WorldviewApiService`. Currently no test covers the failure path (`catch` block) or the happy-path hydration of all six signals. A broken API response silently leaves the app with stale seed data.

**What to test:**
- On success: all six state signals (`people`, `sources`, `sourcePeople`, `sourceDetails`, `units`, `notes`) are updated with the API response
- On failure: signals retain their initial seed values; a `console.error` is called

---

## Tooling Recommendations

### API (currently no test infra)
Set up [Vitest](https://vitest.dev/) with `@cloudflare/vitest-pool-workers` to run tests in a Workers-compatible runtime:

```
pnpm add -D vitest @cloudflare/vitest-pool-workers
```

Add a `vitest.config.ts` in `api/` and a `test/` directory alongside the source files.

### Angular Apps (Karma + Jasmine already configured)
No new tooling is needed. The existing Karma/Jasmine setup works. To run:

```bash
# app-k-maps
cd apps/app-k-maps && npx ng test --watch=false --code-coverage

# k-maps
cd apps/k-maps && npx ng test --watch=false --code-coverage
```

Coverage reports are written to `./coverage/`. Enabling the `lcov` reporter additionally makes them importable into tools like Codecov or SonarQube.

---

## Recommended Starting Order

1. **`api/_utils/jwt.ts` + `auth.ts`** — highest security impact, easiest to test (pure functions, no Angular DI)
2. **`KmapsWorkflowService`** — highest business-logic impact in the frontend
3. **`WvDistillService`** additional cases — minimal incremental setup cost
4. **`WvNodesService`** — tight coupling with `KmapsWorkflowService` makes it the natural next step
5. **Shared components** — quick wins, builds confidence in the test setup
6. **API route handlers** — requires new Vitest infrastructure, highest payoff once set up
