import { requireAuth } from './_utils/auth';

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

function normalizeLessonJson(input: unknown) {
  // keep it safe but don’t crash
  if (!input || typeof input !== 'object') return {};
  return input as Record<string, unknown>;
}

interface ArLessonListItem {
  id: number;
  title: string;
  lesson_type: string;
  subtype: string | null;
  source: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface CountResult {
  total: number;
}

/* ========================= GET /ar_lessons ========================= */

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
    const queryParams: (string | number)[] = [];

    if (q) {
      const like = `%${q}%`;
      whereClauses.push('(title LIKE ? OR source LIKE ?)');
      queryParams.push(like, like);
    }

    if (lessonTypeParam === 'quran') {
      whereClauses.push('lesson_type = ?');
      queryParams.push('quran');
    } else if (lessonTypeParam === 'other') {
      // include NULL and anything not 'quran'
      whereClauses.push("(lesson_type IS NULL OR lesson_type != 'quran')");
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = ctx.env.DB
      .prepare(`SELECT COUNT(*) AS total FROM ar_lessons ${whereClause}`)
      .bind(...queryParams);

    const dataStmt = ctx.env.DB
      .prepare(
        `${selectSql}
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ?
         OFFSET ?`
      )
      .bind(...queryParams, limit, offset);

    const countRes = (await countStmt.first()) as CountResult | null;
    const total = Number(countRes?.total ?? 0);

    const dataAll = (await dataStmt.all()) as { results?: ArLessonListItem[] };
    const results = dataAll?.results ?? [];

    return new Response(JSON.stringify({ ok: true, total, limit, offset, results }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= POST /ar_lessons ========================= */

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
    const title_ar = typeof body?.title_ar === 'string' ? body.title_ar.trim() : null;

    // keep DB consistent: lowercase 'quran'
    const lesson_type_raw = typeof body?.lesson_type === 'string' ? body.lesson_type.trim() : 'quran';
    const lesson_type = lesson_type_raw.toLowerCase();

    const subtype = typeof body?.subtype === 'string' ? body.subtype.trim() : null;
    const source = typeof body?.source === 'string' ? body.source.trim() : null;
    const status = typeof body?.status === 'string' ? body.status.trim() : 'draft';
    const difficulty =
      typeof body?.difficulty === 'number' && Number.isFinite(body.difficulty) ? body.difficulty : null;

    const lessonJsonObj = normalizeLessonJson(body?.lesson_json ?? body?.lessonJson);
    const lesson_json = JSON.stringify(lessonJsonObj ?? {});

    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: 'Title is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // NOTE: include columns that exist in your DB schema (you showed title_ar + difficulty exist)
    const inserted = await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_lessons (title, title_ar, lesson_type, subtype, status, difficulty, source, lesson_json)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        RETURNING id, title, title_ar, lesson_type, subtype, status, difficulty, source, created_at, updated_at, lesson_json
        `
      )
      .bind(title, title_ar, lesson_type, subtype, status, difficulty, source, lesson_json)
      .first();

    const row = inserted as Record<string, any> | null;

    const parsed = safeJsonParse((row?.lesson_json as string | null) ?? null);

    return new Response(JSON.stringify({ ok: true, result: { ...row, lesson_json: parsed ?? row?.lesson_json } }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
