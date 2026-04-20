import { dbHealth, json, notFound } from '../../shared/src/http';
import type { ContentEnv } from './env';

export default {
  async fetch(request: Request, env: ContentEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        domain: 'content',
        db: 'DB_CM',
        db_ok: await dbHealth(env.DB_CM),
      });
    }

    return notFound('content');
  },
} satisfies ExportedHandler<ContentEnv>;
