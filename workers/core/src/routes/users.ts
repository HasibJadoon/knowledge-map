// ─── /core/users routes ───────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { requireAdmin } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { validateUserCreate, validateUserPatch } from '../schemas/user.schema';
import { hashPassword } from '../password';

export function userRoutes(router: Router<CoreEnv>) {

  // GET /core/users — list users (admin only)
  router.get('/core/users', async (req, env) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return paginated(await new UserRepo(env.DB_CORE).list(parsePagination(new URL(req.url))));
  });

  // GET /core/users/by-email?email=... — registered before :id so it is reachable
  router.get('/core/users/by-email', async (req, env) => {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) return badRequest('email param required');
    const user = await new UserRepo(env.DB_CORE).findByEmail(email);
    return user ? ok(user) : notFound(`user ${email}`);
  });

  // GET /core/users/:id
  router.get('/core/users/:id', async (_req, env, { id }) => {
    const user = await new UserRepo(env.DB_CORE).findById(id);
    return user ? ok(user) : notFound(`user ${id}`);
  });

  // POST /core/users — create a user (admin only)
  router.post('/core/users', async (req, env) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const result = validateUserCreate(body);
    if ('error' in result) return badRequest(result.error);

    const userRepo = new UserRepo(env.DB_CORE);
    const user = await userRepo.create(result.data);
    if (result.data.password) {
      await new AuthRepo(env.DB_CORE).setPassword(user.id, await hashPassword(result.data.password));
      // An admin-chosen password is temporary — force a change on first login.
      await userRepo.setMustChangePassword(user.id, true);
    }
    return created(user);
  });

  // PATCH /core/users/:id — update role / status / display name (admin only)
  router.patch('/core/users/:id', async (req, env, { id }) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const result = validateUserPatch(body);
    if ('error' in result) return badRequest(result.error);
    const user = await new UserRepo(env.DB_CORE).update(id, result.data);
    return user ? ok(user) : notFound(`user ${id}`);
  });

  // POST /core/users/:id/password — set or reset a user's password (admin only)
  router.post('/core/users/:id/password', async (req, env, { id }) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const password = (body as Record<string, unknown>)?.['password'];
    if (typeof password !== 'string' || password.length < 6) {
      return badRequest('password must be at least 6 characters');
    }
    const userRepo = new UserRepo(env.DB_CORE);
    const user = await userRepo.findById(id);
    if (!user) return notFound(`user ${id}`);
    await new AuthRepo(env.DB_CORE).setPassword(id, await hashPassword(password));
    // An admin-set password is temporary — force a change on next login.
    await userRepo.setMustChangePassword(id, true);
    return ok({ ok: true });
  });
}
