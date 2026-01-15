import { requireAuth } from '../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJsonParse(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeLessonJson(input: unknown) {
  if (!input || typeof input !== 'object') return {};
  return input;
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

    const id = Number(ctx.params?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const row = await ctx.env.DB.prepare(
      `
      SELECT id, title, lesson_type, subtype, source, status, created_at, updated_at, lesson_json
      FROM ar_lessons
      WHERE id = ?1
      LIMIT 1
      `
    )
      .bind(id)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const parsed = safeJsonParse(row.lesson_json ?? null);

    return new Response(
      JSON.stringify({ ok: true, result: { ...row, lesson_json: parsed ?? row.lesson_json } }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const lesson_type = typeof body?.lesson_type === 'string' ? body.lesson_type.trim() : 'Quran';
    const subtype = typeof body?.subtype === 'string' ? body.subtype.trim() : null;
    const source = typeof body?.source === 'string' ? body.source.trim() : null;
    const status = typeof body?.status === 'string' ? body.status.trim() : 'draft';

    const lessonJsonObj = normalizeLessonJson(body?.lesson_json ?? body?.lessonJson);
    const lesson_json = JSON.stringify(lessonJsonObj ?? {});

    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: 'Title is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const res = await ctx.env.DB.prepare(
      `
      UPDATE ar_lessons
      SET title = ?1,
          lesson_type = ?2,
          subtype = ?3,
          source = ?4,
          status = ?5,
          lesson_json = ?6,
          updated_at = datetime('now')
      WHERE id = ?7
      RETURNING id, title, lesson_type, subtype, source, status, created_at, updated_at, lesson_json
      `
    )
      .bind(title, lesson_type, subtype, source, status, lesson_json, id)
      .first<any>();

    if (!res) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const parsed = safeJsonParse(res.lesson_json ?? null);

    return new Response(
      JSON.stringify({ ok: true, result: { ...res, lesson_json: parsed ?? res.lesson_json } }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const res = await ctx.env.DB.prepare(
      `DELETE FROM ar_lessons WHERE id = ?1 RETURNING id`
    )
      .bind(id)
      .first<{ id: number }>();

    if (!res?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, id: res.id }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
