# Native iOS App Plan — `kmaps-ios`

> Drafted: 2026-05-15
> Goal: rewrite `apps/app-k-maps` (Ionic/Capacitor) as a native universal Apple app by hard-forking [quran/quran-ios](https://github.com/quran/quran-ios) (QuranEngine, Apache-2.0), keeping its battle-tested Mushaf renderer, and pointing its data layer at our existing Cloudflare Workers + D1 backend.

---

## 1. Decisions captured

| Decision | Choice |
|---|---|
| Target platforms (v1) | iPhone + iPad. Mac deferred. |
| Min iOS | 17 (drop QuranEngine's iOS 15 floor; lets us lean on SwiftUI 5 / Observation) |
| Mushaf page images | Download on first use, cached forever (matches Quran.com pattern) |
| QuranEngine vendoring | Hard fork into `kmaps-ios` |
| Root navigation | **No tab bar.** Home grid of 9 cards → push into each domain. |
| In-domain flow | Mirror the Ionic app's screen flow per domain |
| Backend | Reuse `workers/backend` (no new gateway). Auth via `/api/core/auth/*` |
| Token storage | Keychain (not UserDefaults) |
| Async model | Swift Concurrency (async/await), not Combine |
| UI framework | SwiftUI for new code; keep QuranEngine's UIKit reader behind `UIViewControllerRepresentable` |

---

## 2. Repo layout (new repo: `kmaps-ios`)

```
kmaps-ios/
├── Package.swift                       # umbrella manifest
├── App/                                # iOS app target
│   ├── KMAPSApp.swift                  # @main, root NavigationStack(HomeView)
│   ├── AppDependencies.swift           # composition root (DI container)
│   └── Info.plist
├── QuranEngine/                        # vendored fork (Apache-2.0 NOTICE preserved)
│   ├── Core/  Model/  Data/  Domain/  UI/
│   └── Features/                       # KEPT: Quran*Feature, AyahMenuFeature, ReadingSelectorFeature, SearchFeature, BookmarksFeature, NotesFeature, AudioBannerFeature, ReciterListFeature
│                                       # STRIPPED: AppStructureFeature, HomeFeature, WhatsNewFeature, AppMigrationFeature, OAuthService, mobile-sync-spm
└── KMAPS/
    ├── KMAPSAPIClient/                 # one HTTP client → workers/backend
    ├── KMAPSAuth/                      # /api/core/auth/* + Keychain token store
    ├── RemoteQuranPersistence/         # implements QuranEngine *Persistence protocols against /api/qr
    ├── KMAPSDesign/                    # shared design tokens, card style, fire shader
    ├── HomeFeature/                    # ports apps/app-k-maps home: 9 cards + fire animation
    ├── QuranDomainFeature/             # Quran landing → reader / tafsir / uloom / lexicon / notes
    ├── WorldviewFeature/               # /api/wv  (workers/worldview, DB_WV)
    ├── ArabicFeature/                  # /api/ar  (workers/arabic, DB_AR)
    ├── LexiconFeature/                 # /api/al  (workers/ar-linguistics, DB_AL)
    ├── PlannerFeature/                 # /api/pl  (workers/planner, DB_PL)
    ├── ContentFeature/                 # /api/cm  (workers/content, DB_CM)
    ├── DocsFeature/
    ├── HubFeature/
    ├── WorkspaceFeature/
    └── SRSFeature/
```

Each `KMAPS/*Feature` package is independently buildable and ships a single `RootView` consumed by `HomeView`'s navigation. This mirrors the domain ownership boundaries already enforced in [CLAUDE.md](../CLAUDE.md): one Swift package ↔ one Worker ↔ one D1 database.

---

## 3. Root navigation model (no tabs)

```
NavigationStack
└── HomeView              ← root; LazyVGrid of 9 KMapsCardView
    ├─ push: QuranDomainView          (Quran card)
    │   └─ push: QuranReaderView      (UIViewControllerRepresentable wrapping QuranEngine)
    │   └─ push: TafsirView, UloomView, LexiconRouterView, NotesView
    ├─ push: WorldviewRootView        (WV card) → library / compare / brainstorm / unit-reader / graph
    ├─ push: ArabicRootView           → library / linguistics / domains / review / unit-study / lessons / reaction-studio
    ├─ push: PlannerRootView          → weekly-plan / review / lessons / kanban
    ├─ push: HubRootView
    ├─ push: WorkspaceRootView
    ├─ push: SRSRootView
    ├─ push: ContentRootView
    └─ push: DocsRootView
```

**No `UITabBarController` anywhere.** The Quran reader sits inside the Quran domain, not at the root. Audio mini-player (when active) becomes a SwiftUI `safeAreaInset(edge: .bottom)` on the reader screen, not a global bar.

In-domain flow inside each `*RootView` mirrors the Ionic routes 1:1. Example for Worldview, matching [worldview routes in the Ionic app](../apps/app-k-maps/src/app/features/worldview/):

```
WorldviewRootView (landing: lists library + actions)
├─ WorldviewLibraryView           → /worldview/library (sources/units)
├─ WorldviewCompareView           → /worldview/compare
├─ WorldviewBrainstormView        → /worldview/brainstorm
├─ WorldviewUnitReaderView(id)    → /worldview/unit-reader/:id
└─ WorldviewGraphView             → /worldview/graph
```

---

## 4. The D1 integration seam

QuranEngine reads every byte of Quran content through protocols in `QuranEngine/Data/`. We satisfy those protocols with HTTP clients in `RemoteQuranPersistence`.

| QuranEngine protocol | What it returns | Worker endpoint to expose |
|---|---|---|
| `VerseTextPersistence` | Uthmani text per ayah | `GET /api/qr/text/uthmani?from=&to=` |
| `WordTextPersistence` | Word-by-word text per page | `GET /api/qr/words/page/{n}` |
| `WordFramePersistence` | Word bounding boxes per page | `GET /api/qr/frames/page/{n}` |
| `LinePagePersistence` | Line geometry (non-Madani layouts) | `GET /api/qr/lines/page/{n}` |
| `TranslationPersistence` | Translation text per ayah, per slug | `GET /api/qr/translations/{slug}?from=&to=` |
| `AudioTimingPersistence` | Reciter timing per ayah | `GET /api/qr/audio/timing/{reciter}?from=&to=` |

**Required code change in the fork:** [`Domain/ImageService/Sources/ImageDataService.swift`](https://github.com/quran/quran-ios/blob/main/Domain/ImageService/Sources/ImageDataService.swift) currently takes a `URL` to a SQLite ayah-info file. Refactor its initializer to accept `WordFramePersistence` directly:

```swift
// before
public init(ayahInfoDatabase: URL, imagesURL: URL) { ... }

// after
public init(wordFrames: WordFramePersistence, imagesURL: URL) { ... }
```

`imagesURL` stays — it's already a directory, and our downloader writes to it.

**Caching strategy.** Quran text effectively never changes, so `RemoteQuranPersistence` writes JSON responses to `Caches/kmaps/qr/` keyed by URL. First open of a page = network; every subsequent open = disk. No HTTP cache headers needed; we own both ends.

**Fallback.** If a request fails and there's no cached response, return `EmptyVerseTextPersistence`-style empties so the renderer doesn't crash; surface a "page unavailable" state in the reader chrome.

---

## 5. Mushaf page images

QuranEngine doesn't bundle PNGs in the open-source repo — it expects a downloader. We:

1. Stand up an R2 bucket (or reuse one) hosting `page001.png`…`page604.png` for the QPC V2 layout.
2. Point `BatchDownloader`'s base URL at it (or proxy through `workers/backend` for auth/rate-limiting).
3. On first reader open, download a small window (current page ± 3) eagerly; rest on demand.
4. `imagesURL` = `Caches/kmaps/mushaf/qpc-v2/`.

This matches the Ionic app's current behavior of warming pages 1–3 + Juz 30 + last-read ±3 (see [al-quran.component.ts](../apps/app-k-maps/src/app/features/quran/al-quran/reader/al-quran.component.ts)), translated to native by `BatchDownloader`.

---

## 6. Home view port

The Ionic home ([home.page.ts](../apps/app-k-maps/src/app/core/home/pages/home/home.page.ts)) is the visual anchor users will recognize. Native port:

| Ionic piece | Native equivalent |
|---|---|
| `<ion-content>` + 9 cards | `ScrollView` + `LazyVGrid(columns: adaptive(min: 160))` of `KMapsCardView` |
| GSAP card entrance | `.transition(.scale.combined(with: .opacity))` driven by `withAnimation` on appear |
| Three.js Simplex-noise fire shader | `MTKView` + Metal fragment shader (port the GLSL) wrapped in `UIViewRepresentable` |
| CSS floating particles | `TimelineView(.animation)` + `Canvas` |
| Card hover/shimmer | `.hoverEffect(.lift)` on iPad + `LinearGradient` mask |

Card styling (gradient star logo, glyph per module, "Knowledge Command Center" header) lives in `KMAPSDesign/CardStyle.swift` so all 9 cards share one tokenized style.

---

## 7. Networking layer (`KMAPSAPIClient`)

Single client, mirrors the Ionic [`BackendApiService`](../apps/app-k-maps/src/app/shared/services/backend-api.service.ts) shape so error handling stays consistent across stacks:

```swift
public struct APIEnvelope<T: Decodable>: Decodable {
    public let ok: Bool
    public let data: T?
    public let error: APIError?
}

public actor KMAPSAPIClient {
    public init(baseURL: URL, tokenProvider: () async -> String?) { ... }
    public func get<T: Decodable>(_ path: String, module: APIModule) async throws -> T
    public func post<T: Decodable, B: Encodable>(_ path: String, module: APIModule, body: B) async throws -> T
}

public enum APIModule: String { case qr, wv, ar, al, cm, pl, core }
```

`baseURL` is per-environment (`https://api.kmaps.dev` etc.). `module` enforces the URL prefix, matching the Workers gateway routing. `tokenProvider` is async so it can refresh a stale JWT without blocking the call site.

---

## 8. Auth (`KMAPSAuth`)

- Login screen (email + password) → `POST /api/core/auth/login` → JWT.
- Store in **Keychain** under service `app.kmaps.auth`, account `default`. (Ionic stores in localStorage; Keychain is the native equivalent and survives reinstall via iCloud Keychain if the user opts in.)
- `AuthGuard` equivalent: SwiftUI `@MainActor class AuthState: ObservableObject` exposed as an `EnvironmentObject`. Routes that need auth check `authState.isAuthenticated` and present `LoginView` as a `.sheet` if false.
- Public domains (Quran, Worldview, Docs) skip the gate; protected domains (Arabic, Planner, Content, Hub, Workspace, SRS) trigger it.

---

## 9. Per-domain feature plan

Each section: scope, key screens (mapped to existing Ionic routes), key API endpoints, complexity.

### 9.1 Quran (`QuranDomainFeature`)
- **Landing:** title + last-read pill + actions (Continue, Surah index, Juz index, Bookmarks, Search).
- **Reader:** `QuranReaderView` = `UIViewControllerRepresentable` wrapping QuranEngine's `QuranViewController`.
- **Tafsir / Uloom / Notes / Lexicon tabs:** SwiftUI side screens reachable from the ayah-long-press menu (`AyahMenuFeature`).
- **APIs:** `/api/qr/works`, `/api/qr/tafsir`, `/api/qr/irab/*`, `/api/qr/lexicon/*`, plus the persistence endpoints in §4.
- **Complexity:** medium. The reader is "free" via QuranEngine; integration plumbing is the work.

### 9.2 Worldview (`WorldviewFeature`)
- Screens: library, compare, brainstorm, unit-reader, graph.
- **APIs:** `/api/wv/workflow`, `/api/wv/source` (POST), `/api/wv/unit` (POST), `/api/wv/distill/generate` (POST), `/api/wv/distill/approve` (POST).
- **Graph view:** D3 force graph in Ionic → native `ForceDirectedGraphView` using `Canvas` + a small physics step in a `Task` loop. Acceptable for v1 with ≤500 nodes; switch to Metal if we hit perf issues.
- **Complexity:** medium-hard (graph view).

### 9.3 Arabic (`ArabicFeature`)
- Screens: library, linguistics, domains, review, unit-study (books/media/literature), lessons, reaction-studio.
- **APIs:** `/api/ar/*`.
- **Reaction Studio:** `AVCaptureSession` for video + text overlay. v1 can defer to "view only" mode and ship recording in v1.1.
- **Complexity:** medium overall, hard for reaction-studio.

### 9.4 Lexicon (`LexiconFeature`)
- The unified lexicon dispatcher (Lane, Classical, Mufradat, Scholarship — 11 sources) with **nested classical block rendering**.
- **APIs:** `/api/al/lexicon/*`, `/api/al/lex/v2/*`, `/api/al/scholarship/*`.
- **Nested blocks:** recursive SwiftUI view (`LexiconBlockView` calls itself for child blocks). The Ionic implementation already proves the data shape works.
- **Complexity:** medium. The hard part (data model + parsing) lives in the Workers and is already done.

### 9.5 Planner (`PlannerFeature`)
- Screens: weekly-plan (tabbed), review/:weekStart, lessons, kanban.
- **APIs:** `/api/pl/weekly-plan/*`, `/api/pl/review/*`.
- **Complexity:** easy-medium. Mostly forms and lists.

### 9.6 Docs (`DocsFeature`)
- TipTap rich editor in Ionic. Native swap: **iOS 17 `TextEditor` + `AttributedString`** for v1 (handles bold/italic/lists/links/colors). For full TipTap parity (super/sub, character count, horizontal rules) consider `Runestone` or wrap a TipTap WKWebView as v1.5 fallback.
- **APIs:** `/api/core/notes`, `/api/core/comments`.
- **Complexity:** medium (parity with TipTap is the long pole).

### 9.7 Content / Hub / Workspace / SRS
- Mostly list/detail UIs against `/api/cm/*` and `/api/core/*`. Easy.

---

## 10. Asset & font strategy

| Asset | Source | Native handling |
|---|---|---|
| QPC V2 per-page Quran font (604 woff2) | Currently bundled in Ionic (~98MB) | Ship a `.otf`/`.ttf` per page, **download on first use** to `Caches/kmaps/fonts/qpc-v2/`. Bundle Juz 30 + page 1 only for first-launch UX. Register at runtime with `CTFontManagerRegisterFontsForURL`. |
| Uthmanic Hafs, AmiriQuran, Noto Naskh Arabic | Bundled in Ionic | Bundle in app target (`Info.plist` `UIAppFonts`). ~5MB total, fine. |
| Poppins (latin display) | Bundled in Ionic | Replace with **SF Pro** for native feel. (Optional: bundle Poppins for visual continuity if the user prefers.) |
| Mushaf page PNGs | Downloaded by Ionic from CDN | Same — `BatchDownloader` to R2 origin. |
| `fire.png` texture | `apps/app-k-maps/src/assets/images/fire.png` | Copy into `KMAPSDesign/Resources/`. |
| Mockup JSON (worldview, discourse) | dev-only fixtures | Drop. Native dev uses live `dev.api.kmaps.dev`. |

---

## 11. Things to strip from QuranEngine on first commit

- `Features/AppStructureFeature/` — entire tab scaffolding gone.
- `Features/HomeFeature/` — replaced by `KMAPS/HomeFeature/`.
- `Features/WhatsNewFeature/`, `Features/AppMigrationFeature/` — Quran.com-specific content frameworks.
- `Core/OAuthService/`, `Data/AuthenticationClient/` — Quran.com OAuth; use `KMAPSAuth` instead.
- `Data/SyncedPageBookmarkPersistence/` and `mobile-sync-spm` dep — Quran.com sync. Either drop bookmarks sync entirely in v1 or back it with `/api/core/notes` later.
- `Domain/QuranResources/Databases/quran.ar.uthmani.v2.db` — bundled SQLite. Remove; data comes from `/api/qr/text/uthmani`.

Keep everything else in `Core/`, `Model/`, `Data/` (protocols), `Domain/` (services), `UI/` (NoorUI, NoorFont), and the Quran-related `Features/`.

---

## 12. Phasing & rough timeline

| Phase | Scope | Duration | Exit criterion |
|---|---|---|---|
| 0 | Create `kmaps-ios` repo, vendor QuranEngine fork, strip §11 modules, builds clean for iPhone+iPad | 1–2 days | `xcodebuild` green, app launches to a placeholder root |
| 1 | `KMAPSAPIClient` + `KMAPSAuth` + login flow against staging Workers | 2–3 days | User can log in, JWT lands in Keychain |
| 2 | `RemoteQuranPersistence` + `ImageDataService.init` refactor + R2 image origin + page renders end-to-end from D1 | 1 week | Open page 1, image + word highlights render, all data via D1 |
| 3 | `HomeFeature` (9 cards + fire shader) + `NavigationStack` wiring + empty `*RootView` for each domain | 3–5 days | Home matches Ionic visually; tapping each card pushes a placeholder |
| 4 | `QuranDomainFeature` glue: landing, reader push, ayah menu, search, bookmarks | 3–5 days | Full Quran flow usable |
| 5 | Domain features in priority order: Worldview → Lexicon → Arabic → Planner → Docs → Content → Hub → Workspace → SRS | ongoing, ~1–2 weeks each | Per-domain ship |
| 6 | TestFlight beta → App Store | 1 week | Live on iPhone + iPad |

Phases 0–4 = **MVP** (~3 weeks): visually complete home, working Quran reader on D1, public-domain content browsable. Phase 5 ships incrementally after.

---

## 13. New backend work required

These endpoints don't all exist in `workers/quran` today. Adding them is the only backend work this plan implies:

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/qr/text/uthmani` | confirm/build | per-ayah Uthmani text, range query |
| `GET /api/qr/words/page/{n}` | build | word-by-word text per Madani page |
| `GET /api/qr/frames/page/{n}` | build | word bounding-box rectangles per page |
| `GET /api/qr/lines/page/{n}` | build (later) | only needed if we support non-Madani layouts |
| `GET /api/qr/translations/{slug}` | confirm | range query, paged |
| `GET /api/qr/translations/registry` | build | catalog of available translations (slug, name, language, license) |
| `GET /api/qr/audio/timing/{reciter}` | build | reciter-keyed timing for highlight sync |
| `GET /api/qr/audio/registry` | build | catalog of reciters (slug, name, bitrate, base url) |

All routed through `workers/backend` per the gateway rule in [CLAUDE.md](../CLAUDE.md). Each endpoint reads from `km_quran` via the `DB_QR` binding on `workers/quran`.

---

## 14. Risks & open questions

- **R2 origin for page images.** Need to confirm we have rights to host the QPC V2 page images. Quran.com's are at `static-cdn.tarteel.ai` — verify license before mirroring or use the Tarteel CDN directly.
- **Font licensing.** QPC V2 + Uthmanic Hafs + Amiri all bundled — confirm App Store-safe licenses (Tarteel publishes QPC V2 under a permissive license; Amiri is OFL; Hafs from KSU has its own terms).
- **iOS 17 minimum.** Drops iOS 15/16 users. Ionic app's web nature makes this less of an issue, but worth confirming the user base.
- **Sync/multi-device.** v1 has no cross-device sync for bookmarks/notes/last-read. Acceptable? If not, scope `/api/core/sync` early.
- **Apple review.** Religious content is fine. The download-on-first-use pattern is normal. The only review concern is if total downloaded assets exceed a few hundred MB — be ready to gate large downloads on a Wi-Fi prompt.
- **Reaction Studio (Arabic module).** Video recording is real native work; confirm whether v1 ships record-mode or view-only.

---

## 15. Out of scope for this doc

- Detailed SwiftUI view code.
- Backend endpoint JSON schemas (will be drafted in a follow-up `docs/qr-api-contracts.md` once the user approves this plan).
- CI/CD setup for the new repo (Xcode Cloud vs. GitHub Actions).
- Analytics, crash reporting, Sentry/Crashlytics choice.

---

## 16. Next concrete step

Once this plan is approved, the order of operations is:

1. Draft `docs/qr-api-contracts.md` — JSON shapes for the §4 endpoints, so backend and iOS can build in parallel.
2. Create the `kmaps-ios` GitHub repo, vendor QuranEngine, commit the §11 strip.
3. Spike `RemoteQuranPersistence` against a single endpoint (`/api/qr/words/page/1`) to prove the seam end-to-end before fanning out.
