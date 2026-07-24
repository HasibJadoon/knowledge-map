# km_core Gap Analysis — the Cybernetic Control Plane

> Generated: 2026-07-24
> Scope: `workers/core/` (km-core-worker, DB_CORE / km_core)
> Frame: km_core is the platform's **cybernetic layer** — the control and
> feedback plane that governs every other domain. It owns identity, workspaces,
> policies, roles, grants, auth, plus the sensory/feedback organs (activity
> events, audit log, review queue, notifications). This document maps where that
> control loop is **defined but not closed** — i.e. capabilities that exist in
> the schema and repository layer but are unreachable, broken, or unenforced.

## The cybernetic model of km_core

| Control-system role | km_core surface |
|---|---|
| **Actuators** (change the system) | users, workspaces, members, roles, grants, policies, feature_flags, platform_config |
| **Sensors / feedback** | activity_events, audit_log, notifications, review_queue |
| **Regulator / policy** | resource_policies, resource_grants, workspace_policies, workspace_roles |
| **Identity / boundary** | users, auth_sessions, auth_tokens, external_refs |

A cybernetic system fails not when a part is missing, but when a **loop is
open** — a sensor with no readout, a regulator nothing consults, an actuator no
one can reach. The gaps below are all open loops.

## Layer inventory

25 tables in `km_core`. Coverage by layer:

| Layer | Present |
|---|---|
| Tables | 25 |
| Zod schemas (`src/schemas/`) | 13 |
| Repositories (`src/repositories/`) | 13 (cover ~all tables; some group 2–3 tables per repo) |
| HTTP routes wired in `index.ts` | **8** (auth, oauth, users, workspaces, workspace-roles, activity, grants, srs-registry) |

The repository layer is broad and substantial (~2,400 LOC). The **route layer is
where the loops open**: most repos are not reachable over HTTP, and the one
custom-written route (grants) is broken.

---

## G1 — CRITICAL: the cross-domain access gate (`grants.ts`) is broken

**Severity: critical — the regulator is wired to non-existent controls.**

`workers/core/src/routes/grants.ts` is the endpoint the design intends every
other worker to call to resolve read/write access ("Other workers call
`/core/grants/check` to resolve access"). It queries and inserts columns that
**do not exist** on `core_resource_grants`.

| grants.ts uses | actual column (schema.sql / migration 001) |
|---|---|
| `grantee_ref` | `subject_ref` |
| `permission` | `access_role` |
| — (not set) | `subject_type` NOT NULL |
| — (not set) | `granted_by_ref` **NOT NULL, no default** |

Consequences:

- `GET /core/grants` and `/core/grants/list` → SQLite error *no such column:
  grantee_ref* on every call.
- `POST /core/grants` → `INSERT ... (grantee_ref, permission)` fails (unknown
  columns) and, even with names fixed, violates `NOT NULL` on `granted_by_ref`
  and `subject_type`.

So **no grant can be read or written today**, and any downstream worker relying
on `/core/grants/check` to authorize a cross-domain read is calling a dead
endpoint. This is the single highest-impact gap: the central authorization loop
is open.

Also note: `/core/grants/check` is referenced in comments as the contract but
**is not implemented** — only `/core/grants` (single) and `/core/grants/list`
exist. There is no resolver that walks `resource_policies` → inheritance →
`resource_grants` → expiry/revocation to return an effective decision.

---

## G2 — Seven repositories are fully built but unreachable (no route)

These repos exist, are non-trivial, and are **not wired into `index.ts`**, so
none of their behavior is reachable through the gateway:

| Repo | Tables owned | ~Methods | ~LOC | Effect of the open loop |
|---|---|---|---|---|
| `policy.repo` | core_resource_policies | 4 | 322 | Per-resource visibility / publication / comment / download rules are stored but never served or enforced. |
| `podcast.repo` | core_podcasts, _participants, _talking_points | 6 | 282 | Entire podcast/studio sub-domain is dark. |
| `audit.repo` | core_audit_log, core_feature_flags, core_platform_config | 4 | 271 | No audit read/write API; **feature flags and platform config have no read path** — nothing can gate rollout. |
| `review-queue.repo` | core_review_queue | 3 | 189 | Human-in-the-loop review feedback organ has no inbox endpoint. |
| `workspace-group.repo` | core_workspace_groups, _members | 5 | 171 | Teams/groups (a grant `subject_type`) can't be managed → group-scoped grants can never be populated. |
| `people.repo` | core_people | 3 | 157 | CRM/people layer unreachable. |
| `external-ref.repo` | core_external_refs | 1 | 132 | Legacy→typed-ref resolver (migration continuity) has no lookup endpoint. |

~1,500 LOC of working control-plane logic with no wire to the outside. Each is a
sensor or actuator with no cable to the regulator.

---

## G3 — Wired routes expose only a fraction of their repo surface

Two of the eight wired routes surface a single method and leave the rest of the
repo dark:

- **activity** (`activity.ts`) exposes only
  `GET /core/workspaces/:id/activity`. `activity.repo` also implements
  `notify()` and `markRead()` over `core_notifications` — **the entire
  notification delivery + read-state loop has no route**. Users can be notified
  by code, but nothing can list or acknowledge notifications.
- **srs-registry** (`srs-registry.ts`) exposes registry get/post/delete but
  `srs-registry.repo` also owns `core_workspace_plans` CRUD (create/update/
  list/count) — **workspace study-plan management is unrouted**.

---

## G4 — grants vs policies: split brain, no typed contract

`core_resource_grants` and `core_resource_policies` are two halves of one
authorization model (policy = default posture on a resource; grants = explicit
exceptions with `is_inheritance_break`). Yet:

- `grants` has a hand-written route but **no schema and no repo** (inline SQL,
  untyped, and — per G1 — wrong).
- `policy` has a schema **and** a repo but **no route**.

They are never composed. There is no function that answers *"can subject S
perform action A on resource R?"* by combining the resource's policy,
inheritance chain, active (non-expired, non-revoked) grants, and the caller's
workspace role. This resolver is the core cybernetic decision function and it
does not exist.

---

## G5 — No enforcement point (defined controls nobody consults)

Even where controls are stored correctly (`workspace_policies`,
`workspace_roles.permissions_json`, `resource_policies.visibility_scope`),
nothing in the worker reads them to gate an action. There is:

- no middleware that resolves the caller → workspace membership → role →
  permission set before a mutation,
- no visibility filter applied to list endpoints from
  `resource_policies.visibility_scope`,
- no consult of `workspace_policies.review_required_for_publish` on any publish
  path (and no publish path at all).

The regulator's rules exist as data; no code path is subject to them.

---

## G6 — Auth loop: issuance without lifecycle

Schema models `core_auth_sessions` (with `is_revoked`, `expires_at`,
`last_seen_at`) and `core_auth_tokens` (with `revoked_at`, `scopes_json`,
`used_at`). Confirm against the wired auth/oauth routes whether the worker
actually:

- revokes sessions/tokens (logout, admin kill) — the `is_revoked` /
  `revoked_at` columns imply it should,
- prunes or rejects expired sessions,
- enforces `scopes_json` on token-authenticated calls,
- updates `last_seen_at` / `used_at`.

If any are missing, the identity boundary leaks: credentials that the data model
says can be revoked cannot actually be killed. (Flagged for verification — the
schema strongly implies these paths are expected.)

---

## G7 — Migration co-location & doc drift (hygiene)

- Per CLAUDE.md, "keep domain migrations close to the domain worker."
  `workers/core/migrations/` contains only a `README.md`; the actual DDL lives
  at `database/migrations/km-core/001_core_schema.sql`. The worker-local
  migrations dir is empty of migrations.
- `workers/core/migrations/README.md` lists tables `core_roles` and
  `core_role_grants` that **do not exist** — the real tables are
  `core_workspace_roles` and `core_resource_grants`. Stale.

---

## Priority-ordered remediation

1. **Fix `grants.ts` (G1)** — align to real columns (`subject_ref`,
   `subject_type`, `access_role`, `granted_by_ref`), honor `expires_at` /
   `revoked_at`, and implement the missing `/core/grants/check` resolver. Give
   it a schema + repo like every other domain. *Closes the central loop.*
2. **Build the access-decision resolver (G4/G5)** — one function composing
   policy + inheritance + grants + role, plus a middleware that enforces it. The
   whole point of km_core.
3. **Wire the stranded repos (G2)** — at minimum `policy`, `workspace-group`,
   and `audit` (feature-flags/config), since G1/G5 depend on them; then people,
   review-queue, podcast, external-ref.
4. **Complete partial routes (G3)** — notifications list/read; workspace-plans
   CRUD.
5. **Verify & close auth lifecycle (G6)**.
6. **Fix migration co-location and README drift (G7)**.

## One-line summary

km_core has a well-built **data and repository** layer for a cybernetic control
plane, but the **control loops are open**: its central authorization gate is
broken against its own schema (G1), no code composes policies with grants into a
decision (G4), nothing enforces the controls that do exist (G5), and ~1,500 LOC
of working repositories have no route to the outside world (G2/G3).
