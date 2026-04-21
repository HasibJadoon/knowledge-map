// ─── /core/users routes ───────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { validateUserCreate } from '../schemas/user.schema';

export function userRoutes(router: Router<CoreEnv>) {

  // GET /core/users — list users (admin)
  router.get('/core/users', async (req, env) => {
    return paginated(await new UserRepo(env.DB_CORE).list(parsePagination(new URL(req.url))));
  });

  // GET /core/users/:id
  router.get('/core/users/:id', async (_req, env, { id }) => {
    const user = await new UserRepo(env.DB_CORE).findById(id);
    return user ? ok(user) : notFound(`user ${id}`);
  });

  // GET /core/users/by-email?email=...
  router.get('/core/users/by-email', async (req, env) => {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) return badRequest('email param required');
    const user = await new UserRepo(env.DB_CORE).findByEmail(email);
    return user ? ok(user) : notFound(`user ${email}`);
  });

  // POST /core/users — create user (admin)
  router.post('/core/users', async (req, env) => {
    const body   = await req.json();
    const result = validateUserCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new UserRepo(env.DB_CORE).create(result.data));
  });
}
