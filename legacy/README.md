# Legacy Runtime

`legacy/functions/` contains the previous Pages Functions implementation.

The public `functions/` tree still exists, but its TypeScript files are
compatibility shims that re-export the matching legacy implementation. This
keeps current routes working while each domain is migrated into `workers/` one
at a time.

Do not add new domain logic here. New work belongs in the appropriate domain
Worker under `workers/`.
