import { dbHealth, json, notFound } from '../../shared/src/http';
import type { WorldviewEnv } from './env';

export default {
  async fetch(request: Request, env: WorldviewEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'worldview',
        db: 'DB_WV',
        db_ok: await dbHealth(env.DB_WV),
      });
    }

    return notFound('worldview');
  },
} satisfies ExportedHandler<WorldviewEnv>;
