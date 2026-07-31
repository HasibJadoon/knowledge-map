# Root Coverage — the registry is the checklist

> Last updated: 2026-07-31
> Read before adding a root layer, a carrier table, or anything that answers
> "how complete is this root?"

## The rule

**`ar_ling_reg_sub_layer` defines what "complete" means. Nothing else.**

There is exactly one definition of root completeness, and it lives in the
database as data — not in a doc, not in a hardcoded list in a worker, not in a
stored snapshot column. `GET /al/coverage/root/:root` reads the registry at
request time and counts rows in the carrier tables it names.

Adding a sub-layer, or adding a table to an existing sub-layer's
`tables_json`, makes it appear in coverage with **no code change**. That
property is the whole design; don't break it by special-casing a table in
`coverage.repo.ts`.

## Why it is computed, never stored

`qr_morph_display_root.lens_coverage_json` was a stored coverage snapshot. It
drifted: it reported جمهرة اللغة absent for بين and كتب, and القاموس المحيط
absent for كتب, while `ar_ling_lexicon_block` held 7, 12 and 1 blocks for those
exact cells. A snapshot is only correct on the day it is written.

The whole `qr_morph_display_*` family has since been retired. Linguistic truth
lives in `km_arabic_linguistic`; `km_quran` keeps the corpus, the identity
registry, and the links.

## How a carrier reaches a root

Discovered at runtime from `pragma_table_info`, in this precedence:

| Strategy | Columns | Bound value |
|---|---|---|
| direct | `root_norm`, `root_text`, `root_ar` | root text (Arabic) |
| direct | `root_id`, `used_root_id` | `ar_ling_roots.id` |
| direct | `root_bw` | `ar_ling_roots.buckwalter` |
| lemma | `lemma_id`, `primary_lemma_id` | via `ar_ling_root_lemma.root_id` |
| none | — | reported as `no_carrier`, excluded from the percentage |

The discovered map doubles as an allow-list: a table that isn't in it is never
interpolated into SQL, so a stale registry row cannot reach the query builder.
Root identity is always a bound parameter.

Two sub-layers are legitimately `no_carrier` and should stay that way:
`22-BAB` (global wazn templates keyed on `root_type`, not per-root) and
`50-META` (source and display metadata). Child tables like
`ar_ling_root_lemma_furuq_set_src` are unkeyed too — their parent carries the
root, and the sub-layer still reports `built`.

## Identity keys — the one thing to get right

```
ROOT    ar_ling_roots.id == ar_ling_roots.canonical_id == qr_root_registry.root_uid
        bare 26 chars, no prefix, 1,642 Qurʾānic roots, zero orphans
LEMMA   ar_ling_root_lemma.id   bare
        referenced from QR as qr_lemma.lx_lemma_ref = 'AL:<bare-id>'
WORD    qr_word_occurrence.id   → qr_word_sense_link → ar_ling_root_sense
```

**The `AL:` prefix is a reference-site convention, not a primary key.**
`CLAUDE.md` and `workers/README.md` define `AL:<id>` as how *another domain*
points into AL. Minting it as a PK is what forked `ar_ling_root_lemma` into
4,817 duplicate rows in 2026-07 — the QAC overlay inserted `AL:<id>` twins
instead of updating the bare rows, and all Qurʾānic frequency landed on the
copies while every AL content table kept referencing the originals.

Resolve refs with `localId()` from `workers/shared/src/refs.ts`. Mint keys with
`ulid()`, never `typedId('AL')`. A trigger on `ar_ling_root_lemma` now aborts
inserts with an `AL:`-prefixed id.

## Drift is a standing query, not an audit

| View | Should be |
|---|---|
| `v_registry_dead_refs` | 0 — registry rows naming tables that don't exist |
| `v_id_convention_drift` | 0 — primary keys carrying a cross-domain prefix |
| `v_registry_unmapped` | live tables absent from `ar_ling_reg_table_map` |

Exposed as `GET /al/coverage/drift`, with `clean: true` when the first two are
empty. Check it after any migration that renames or adds tables — the 2026-07
rename left 39 applied migrations without repo files and orphaned every worker
query against the old plural table names, which is how this whole class of
problem stayed invisible for months.

## Endpoints

```
GET /al/coverage/layers        the checklist itself
GET /al/coverage/root/:root    per-sub-layer completeness + summary percentage
GET /al/coverage/drift         registry integrity
```
