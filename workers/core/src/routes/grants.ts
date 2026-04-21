// ─── /core/grants routes — resource access policy ────────────────────────────
// core_resource_grants: typed-ref-scoped access records
// Other workers call /core/grants/check to resolve read/write access.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

interface ResourceGrant {
  id: string;
  resource_ref: string;   // typed ref (QR:, WV:, CM:, ...)
  grantee_ref: string;    // CORE:ULID (user or workspace)
  permission: string;     // 'read' | 'write' | 'admin'
  granted_at: string;
}

export function grantRoutes(router: Router<CoreEnv>) {

  // GET /core/grants?resource=QR:ULID&grantee=CORE:ULID — check a single grant
  router.get('/core/grants', async (req, env) => {
    const url      = new URL(req.url);
    const resource = url.searchParams.get('resource');
    const grantee  = url.searchParams.get('grantee');
    if (!resource || !grantee) return badRequest('resource and grantee params required');

    const grant = await queryOne<ResourceGrant>(
      env.DB_CORE,
      `SELECT id, resource_ref, grantee_ref, permission, granted_at
       FROM core_resource_grants
       WHERE resource_ref = ? AND grantee_ref = ?
       LIMIT 1`,
      [resource, grantee],
    );
    return ok({ granted: !!grant, grant });
  });

  // GET /core/grants/list?grantee=CORE:ULID — all grants for a user/workspace
  router.get('/core/grants/list', async (req, env) => {
    const url     = new URL(req.url);
    const grantee = url.searchParams.get('grantee');
    if (!grantee) return badRequest('grantee param required');

    const grants = await query<ResourceGrant>(
      env.DB_CORE,
      `SELECT id, resource_ref, grantee_ref, permission, granted_at
       FROM core_resource_grants
       WHERE grantee_ref = ?
       ORDER BY resource_ref`,
      [grantee],
    );
    return ok(grants);
  });

  // POST /core/grants — issue a grant (admin only)
  router.post('/core/grants', async (req, env) => {
    const body = await req.json() as Record<string, unknown>;
    const { resource_ref, grantee_ref, permission } = body;
    if (!resource_ref || !grantee_ref || !permission)
      return badRequest('resource_ref, grantee_ref, permission required');

    const { typedId } = await import('../../../shared/src/ulid');
    const { execute }  = await import('../../../shared/src/db');
    const id  = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      env.DB_CORE,
      `INSERT OR REPLACE INTO core_resource_grants
         (id, resource_ref, grantee_ref, permission, granted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, resource_ref, grantee_ref, permission, now],
    );
    return ok({ id, resource_ref, grantee_ref, permission, granted_at: now });
  });
}
