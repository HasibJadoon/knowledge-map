# CORE Migrations — km_core

Co-located migration files for the `km_core` D1 database.
Deploy CORE second (after AL) — it has no domain dependencies.

## Apply

```bash
wrangler d1 migrations apply km_core --remote
wrangler d1 migrations list  km_core --remote

# Set the JWT secret
wrangler secret put JWT_SECRET --name km-core-worker
```

## Migration order

| File | Key Tables |
|------|-----------|
| 001_core_schema.sql | core_users, core_workspaces, core_workspace_members, core_roles, core_role_grants, core_resource_policies, core_resource_grants, core_external_refs |

Source: `Database/migrations/km-core/001_core_schema.sql`
