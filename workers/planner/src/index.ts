import { dbHealth, json, notFound } from '../../shared/src/http';
import type { PlannerEnv } from './env';

export default {
  async fetch(request: Request, env: PlannerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'planner',
        db: 'DB_PL',
        db_ok: await dbHealth(env.DB_PL),
      });
    }

    return notFound('planner');
  },
} satisfies ExportedHandler<PlannerEnv>;
