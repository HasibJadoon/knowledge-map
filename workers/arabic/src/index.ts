import { dbHealth, json, notFound } from '../../shared/src/http';
import type { ArabicEnv } from './env';

export default {
  async fetch(request: Request, env: ArabicEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'arabic',
        db: 'DB_AR',
        db_ok: await dbHealth(env.DB_AR),
      });
    }

    return notFound('arabic');
  },
} satisfies ExportedHandler<ArabicEnv>;
