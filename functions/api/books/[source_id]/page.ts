import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';
import { fetchSinglePage, jsonHeaders, resolveSource, toIntOrNull } from '../_shared';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const sourceId = String(ctx.params?.source_id ?? '').trim();
    if (!sourceId) {
      return new Response(JSON.stringify({ ok: false, error: 'source_id is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const pageNo = toIntOrNull(url.searchParams.get('page'));
    if (pageNo === null || pageNo < 1) {
      return new Response(JSON.stringify({ ok: false, error: 'page must be a positive integer' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const source = await resolveSource(ctx.env.DB, sourceId);
    if (!source) {
      return new Response(JSON.stringify({ ok: false, error: 'Source not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const payload = await fetchSinglePage(ctx.env.DB, source.ar_u_source, pageNo);
    if (!payload.page) {
      return new Response(JSON.stringify({ ok: false, error: 'Page not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        source_id: source.source_code,
        start: pageNo,
        limit: 1,
        pages: [payload.page],
        has_more: payload.has_more,
        next_start: payload.next_start,
      }),
      { headers: jsonHeaders }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to load page.',
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }
};
