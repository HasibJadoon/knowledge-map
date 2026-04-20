import { dbHealth, json, notFound } from '../../shared/src/http';
import type { QuranEnv } from './env';

export default {
  async fetch(request: Request, env: QuranEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'quran',
        db: 'DB_QR',
        db_ok: await dbHealth(env.DB_QR),
      });
    }

    return notFound('quran');
  },
} satisfies ExportedHandler<QuranEnv>;
