# K-MAPS Domain Workers

Seven independent Cloudflare Workers — one per domain, one D1 database each.

## Architecture

```
UI (Angular) / API Compatibility Layer (functions/)
         │
         │  service binding / HTTP
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Domain Workers                              │
│                                                                 │
│  km-quran-worker     →  DB_QR  (km_quran)          qr_*        │
│  km-ar-linguistics   →  DB_AL  (km_arabic_linguistic) ar_ling_*│
│  km-arabic-worker    →  DB_AR  (km_arabic)          ar_*       │
│  km-worldview-worker →  DB_WV  (km_worldview)       wv_*       │
│  km-content-worker   →  DB_CM  (km_content)         cm_*       │
│  km-planner-worker   →  DB_PL  (km_planner)         pl_*       │
│  km-core-worker      →  DB_CORE (km_core)           core_*     │
└─────────────────────────────────────────────────────────────────┘
```

## Hard Rules

1. **One D1 binding per Worker** — each Worker binds ONLY its own database.
2. **Cross-domain = service bindings** — use Fetcher, never bind another DB.
3. **AL is the Arabic backbone** — QR and AR never duplicate roots/lemmas/sarf/nahw/balagha; they reference AL via `AL:ULID` typed refs.
4. **No LX database** — `LX:...` typed refs resolve to `DB_AL` (legacy compat).
5. **CORE owns ACL** — CM and other workers call CORE for resource grants; they never build their own access control tables.
6. **PL stores typed refs, not content** — pl_tasks.resource_ref points to `QR:`, `AR:`, etc. Planner never duplicates canonical content.

## Acceptance Checks (before marking a domain migration complete)

```bash
# 1. Worker binds exactly one D1
rg "DB_" workers/<domain>/wrangler.toml

# 2. No other domain's DB binding in worker source
rg "DB_QR|DB_AL|DB_AR|DB_WV|DB_CM|DB_PL|DB_CORE" workers/<domain>/src/ | grep -v "DB_<own>"

# 3. Health check passes
wrangler dev workers/<domain> --port 8080
curl http://localhost:8080/health
```

## Per-Domain Structure

Every worker follows this layout:

```
workers/<domain>/
├── wrangler.toml             ← One D1 binding + service bindings + migrations_dir
├── migrations/
│   └── README.md             ← Migration files co-located here
└── src/
    ├── env.ts                ← <Domain>Env interface (owned DB + Fetcher bindings)
    ├── index.ts              ← Router.handle() entry point
    ├── routes/               ← One file per resource group (thin HTTP layer)
    │   ├── resource-a.ts     ← imports Router, calls repo methods, returns ok()/paginated()
    │   └── resource-b.ts
    ├── repositories/         ← All SQL lives here (one file per table group)
    │   ├── resource-a.repo.ts ← query/queryOne/execute/paginate from shared/db
    │   └── resource-b.repo.ts
    ├── schemas/              ← TypeScript types + lightweight validators
    │   └── resource-a.schema.ts
    └── clients/              ← Typed service binding wrappers (one per dependency)
        └── <dep>.client.ts
```

## Shared Utilities (workers/shared/src/)

| File | Purpose |
|------|---------|
| `types.ts` | `ApiResponse`, `ApiError`, `PaginatedResponse`, `AuthContext`, `DomainCode` |
| `http.ts` | `json()`, `dbHealth()`, `CORS_HEADERS` |
| `db.ts` | `query()`, `queryOne()`, `execute()`, `executeBatch()`, `paginate()`, `exists()` |
| `response.ts` | `ok()`, `created()`, `noContent()`, `paginated()`, `err()`, `notFound()`, `unauthorized()`, `forbidden()`, `badRequest()`, `conflict()`, `internalError()` |
| `router.ts` | `Router<Env>` — URLPattern dispatcher with CORS + error boundary |
| `auth.ts` | `verifyJwt()`, `extractBearerToken()`, `authenticate()`, `requireAuth()`, `requireAdmin()` |
| `ulid.ts` | `ulid()`, `typedId(module)`, `isUlid()`, `isTypedRef()` |
| `validate.ts` | `parseBody()`, `parsePagination()`, `parseIntParam()`, `requireParam()` |
| `refs.ts` | `parseTypedRef()`, `normalizeDomain()` |
| `service-client.ts` | `callService()` — typed Fetcher wrapper |

## Response Envelope

All workers return one of:

```typescript
// Success (single)
{ ok: true, data: T }

// Success (paginated)
{ ok: true, data: T[], meta: { total, page, per_page, has_more } }

// Error
{ ok: false, error: { code: string, message: string, details?: unknown } }
```

## Cross-Module Typed References

```
QR:01HW3XXXXXXXXXXXXXXXXXXX   ← Quran entity
AL:01HY2XXXXXXXXXXXXXXXXXXX   ← Arabic Linguistic entity (also: LX: for legacy)
AR:01HZ1XXXXXXXXXXXXXXXXXXX   ← Arabic learning entity
WV:01JA3XXXXXXXXXXXXXXXXXXX   ← Worldview entity
CM:01JB4XXXXXXXXXXXXXXXXXXX   ← Content entity
PL:01JC5XXXXXXXXXXXXXXXXXXX   ← Planner entity
CORE:01JD6XXXXXXXXXXXXXXXXXXX ← Core entity (user, workspace, role, grant)

# Quran scope shorthand
QR:2:255          ← surah 2, ayah 255
QR:2:255-257      ← surah 2, ayah range
QR:36             ← entire surah 36
```

## Migration Strategy

```bash
# Provision databases (one-time, order matters)
wrangler d1 create km_arabic_linguistic
wrangler d1 create km_core
wrangler d1 create km_quran
wrangler d1 create km_arabic
wrangler d1 create km_worldview
wrangler d1 create km_content
wrangler d1 create km_planner

# Apply schemas (from co-located migrations/ dirs)
wrangler d1 migrations apply km_arabic_linguistic --remote
wrangler d1 migrations apply km_core             --remote
wrangler d1 migrations apply km_quran            --remote
wrangler d1 migrations apply km_arabic           --remote
wrangler d1 migrations apply km_worldview        --remote
wrangler d1 migrations apply km_content          --remote
wrangler d1 migrations apply km_planner          --remote
```

## Migration Flow (ongoing)

1. Keep the public route in `functions/`.
2. Move the real implementation into the matching domain Worker.
3. Make the compatibility route call the domain Worker via service binding.
4. Verify the public response JSON stays compatible.
5. Run acceptance checks.
6. Repeat one domain at a time.
