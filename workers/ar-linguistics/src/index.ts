import { dbHealth, json, notFound } from '../../shared/src/http';
import type { ArLinguisticsEnv } from './env';

export default {
  async fetch(request: Request, env: ArLinguisticsEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'ar-linguistics',
        db: 'DB_AL',
        db_ok: await dbHealth(env.DB_AL),
      });
    }

    return notFound('ar-linguistics');
  },
} satisfies ExportedHandler<ArLinguisticsEnv>;
