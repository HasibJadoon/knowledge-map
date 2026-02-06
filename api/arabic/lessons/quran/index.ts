import { requireAuth } from '../../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function toInt(v: string | null, def: number) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}

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

function normLower(v: unknown, def: string) {
  const s = typeof v === 'string' ? v.trim() : '';
  return (s || def).toLowerCase();
}

function normStr(v: unknown) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
}

/* ========================= GET /arabic/lessons/quran ========================= */

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const q = (url.searchParams.get('q') ?? '').trim();

    const limit = Math.min(200, Math.max(1, toInt(url.searchParams.get('limit'), 50)));
    const offset = Math.max(0, toInt(url.searchParams.get('offset'), 0));

    const where: string[] = [];
    const params: (string | number)[] = [];

    where.push('lesson_type = ?');
    params.push('quran');

    if (q) {
      const like = `%${q}%`;
      where.push('(title LIKE ? OR source LIKE ?)');
      params.push(like, like);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countStmt = ctx.env.DB
      .prepare(`SELECT COUNT(*) AS total FROM ar_lessons ${whereClause}`)
      .bind(...params);

    const dataStmt = ctx.env.DB
      .prepare(
        `
          SELECT
            id,
            title,
            title_ar,
            lesson_type,
            subtype,
            source,
            status,
            difficulty,
            created_at,
            updated_at
          FROM ar_lessons
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ?
          OFFSET ?
        `
      )
      .bind(...params, limit, offset);

    const countRes = (await countStmt.first()) as { total?: number } | null;
    const total = Number(countRes?.total ?? 0);

    const dataRes = (await dataStmt.all()) as { results?: any[] };

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        limit,
        offset,
        results: dataRes?.results ?? [],
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

/* ========================= POST /arabic/lessons/quran ========================= */

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
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
    const lesson_type = 'quran';
    const subtype = normStr(body?.subtype);
    const source = normStr(body?.source);
    const status = normLower(body?.status, 'draft');

    const difficulty =
      typeof body?.difficulty === 'number' && Number.isFinite(body.difficulty)
        ? Math.trunc(body.difficulty)
        : null;

    const lessonJsonObj = normalizeLessonJson(body?.lesson_json ?? body?.lessonJson);
    const lesson_json = JSON.stringify(lessonJsonObj ?? {});

    const row = await ctx.env.DB
      .prepare(
        `
          INSERT INTO ar_lessons
            (user_id, title, title_ar, lesson_type, subtype, source, status, difficulty, lesson_json)
          VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          RETURNING
            id,
            user_id,
            title,
            title_ar,
            lesson_type,
            subtype,
            source,
            status,
            difficulty,
            created_at,
            updated_at,
            lesson_json
        `
      )
      .bind(
        user.id,
        title,
        title_ar,
        lesson_type,
        subtype,
        source,
        status,
        difficulty,
        lesson_json
      )
      .first<any>();

    const parsed = safeJsonParse(row?.lesson_json ?? null);

    return new Response(
      JSON.stringify({
        ok: true,
        result: { ...row, lesson_json: parsed ?? row?.lesson_json },
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
