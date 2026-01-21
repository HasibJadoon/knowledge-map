import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from './_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
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

    const url = new URL(ctx.request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const lessonTypeParam = (url.searchParams.get('lesson_type') ?? '').trim().toLowerCase();

    const limit = Math.min(200, Math.max(1, toInt(url.searchParams.get('limit'), 50)));
    const offset = Math.max(0, toInt(url.searchParams.get('offset'), 0));

    const selectSql = `
      SELECT id, title, lesson_type, subtype, source, status, created_at, updated_at
      FROM ar_lessons
    `;

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (q) {
      const like = `%${q}%`;
      whereClauses.push('(title LIKE ? OR source LIKE ?)');
      queryParams.push(like, like);
    }

    if (lessonTypeParam === 'quran') {
      whereClauses.push('lesson_type = ?');
      queryParams.push('quran');
    } else if (lessonTypeParam === 'other') {
      whereClauses.push('lesson_type != ?');
      queryParams.push('quran');
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM ar_lessons ${whereClause}`).bind(
      ...queryParams
    );

    const dataStmt = ctx.env.DB.prepare(
      `${selectSql}
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ?
         OFFSET ?`
    );
    const dataParams = [...queryParams, limit, offset];
    dataStmt.bind(...dataParams);

    const countRes = await countStmt.first<{ total: number }>();
    const total = Number(countRes?.total ?? 0);
    const { results } = await dataStmt.all();

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        limit,
        offset,
        results: results ?? [],
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
      INSERT INTO ar_lessons (title, lesson_type, subtype, source, status, lesson_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      RETURNING id, title, lesson_type, subtype, source, status, created_at, updated_at, lesson_json
      `
    )
      .bind(title, lesson_type, subtype, source, status, lesson_json)
      .first<any>();

    const parsed = safeJsonParse(res?.lesson_json ?? null);

    return new Response(
      JSON.stringify({ ok: true, result: { ...res, lesson_json: parsed ?? res?.lesson_json } }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
