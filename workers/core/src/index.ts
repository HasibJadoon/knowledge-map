import { dbHealth, json, notFound } from '../../shared/src/http';
import type { CoreEnv } from './env';

export default {
  async fetch(request: Request, env: CoreEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'core',
        db: 'DB_CORE',
        db_ok: await dbHealth(env.DB_CORE),
      });
    }

    return notFound('core');
  },
} satisfies ExportedHandler<CoreEnv>;
