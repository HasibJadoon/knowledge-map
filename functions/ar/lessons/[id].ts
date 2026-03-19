import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
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

function normalizeLessonJson(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  if (Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function toInt(v: unknown, def: number | null = null) {
  if (typeof v !== 'number') return def;
  if (!Number.isFinite(v)) return def;
  return Math.trunc(v);
}

function normLower(v: unknown, def: string) {
  const s = typeof v === 'string' ? v.trim() : '';
  return (s || def).toLowerCase();
}

function normStr(v: unknown) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
}

/* ========================= GET /arabic/lessons/:id ========================= */

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
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT
          id, user_id, title, title_ar, lesson_type, subtype, source, status, difficulty,
          created_at, updated_at, lesson_json
        FROM ar_lessons
        WHERE id = ?1 AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(id, user.id)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const parsed = safeJsonParse((row.lesson_json as string | null) ?? null);

    const headers = { ...jsonHeaders, 'x-hit': 'ID /arabic/lessons/:id' };

    return new Response(
      JSON.stringify({ ok: true, result: { ...row, lesson_json: parsed ?? row.lesson_json } }),
      { headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= PUT /arabic/lessons/:id ========================= */

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Admin role required' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
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
    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: 'Title is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const title_ar = normStr(body?.title_ar);
    const lesson_type = normLower(body?.lesson_type, 'quran');
    const subtype = normStr(body?.subtype);
    const source = normStr(body?.source);
    const status = normLower(body?.status, 'draft');
    const difficulty = toInt(body?.difficulty, null);

    const lessonJsonObj = normalizeLessonJson(body?.lesson_json ?? body?.lessonJson);
    const lesson_json = JSON.stringify(lessonJsonObj ?? {});

    const res = await ctx.env.DB
      .prepare(
        `
        UPDATE ar_lessons
        SET
          title = ?1,
          title_ar = ?2,
          lesson_type = ?3,
          subtype = ?4,
          source = ?5,
          status = ?6,
          difficulty = ?7,
          lesson_json = ?8,
          updated_at = datetime('now')
        WHERE id = ?9 AND user_id = ?10
        RETURNING
          id, user_id, title, title_ar, lesson_type, subtype, source, status, difficulty,
          created_at, updated_at, lesson_json
        `
      )
      .bind(title, title_ar, lesson_type, subtype, source, status, difficulty, lesson_json, id, user.id)
      .first<any>();

    if (!res) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const parsed = safeJsonParse((res.lesson_json as string | null) ?? null);

    return new Response(JSON.stringify({ ok: true, result: { ...res, lesson_json: parsed ?? res.lesson_json } }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= DELETE /arabic/lessons/:id ========================= */

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Admin role required' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const res = await ctx.env.DB
      .prepare(`DELETE FROM ar_lessons WHERE id = ?1 AND user_id = ?2 RETURNING id`)
      .bind(id, user.id)
      .first<{ id: number }>();

    if (!res?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, id: res.id }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
