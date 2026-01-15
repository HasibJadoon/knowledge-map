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

function normalizeExamples(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'string') return value ? [value] : [];
  return value;
}

function normalizeNote(input: any) {
  const noteText = typeof input?.note === 'string' ? input.note.trim() : '';
  const text = noteText || (typeof input?.text === 'string' ? input.text.trim() : '');
  return {
    text_id: typeof input?.text_id === 'string' ? input.text_id.trim() : null,
    text_type: input?.text_type === 'text' ? 'text' : 'quran',
    source: typeof input?.source === 'string' ? input.source.trim() : null,
    label: typeof input?.label === 'string' ? input.label.trim() : null,
    note: text,
    examples: normalizeExamples(input?.examples ?? null),
  };
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
    const lessonId = toInt(url.searchParams.get('lesson_id'), 0);
    if (!lessonId) {
      return new Response(JSON.stringify({ ok: false, error: 'lesson_id is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { results } = await ctx.env.DB.prepare(
      `
      SELECT id, lesson_id, text_id, text_type, source, label, note, examples, created_at, updated_at
      FROM grammar_notes
      WHERE lesson_id = ?1
      ORDER BY id ASC
      `
    )
      .bind(lessonId)
      .all();

    const mapped = (results ?? []).map((row: any) => ({
      ...row,
      examples: row.examples ? JSON.parse(row.examples) : null,
    }));

    return new Response(JSON.stringify({ ok: true, results: mapped }), { headers: jsonHeaders });
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

    const url = new URL(ctx.request.url);
    const lessonId = toInt(url.searchParams.get('lesson_id'), 0);
    if (!lessonId) {
      return new Response(JSON.stringify({ ok: false, error: 'lesson_id is required' }), {
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

    const notesInput = Array.isArray(body?.notes) ? body.notes : [];
    const normalized = notesInput
      .map((note: any) => normalizeNote(note))
      .filter((note: any) => note.note);

    const statements = [];
    statements.push(
      ctx.env.DB.prepare(`DELETE FROM grammar_notes WHERE lesson_id = ?1`).bind(lessonId)
    );

    for (const note of normalized) {
      statements.push(
        ctx.env.DB.prepare(
          `
          INSERT INTO grammar_notes (lesson_id, text_id, text_type, source, label, note, examples)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          `
        ).bind(
          lessonId,
          note.text_id,
          note.text_type,
          note.source,
          note.label,
          note.note,
          note.examples ? JSON.stringify(note.examples) : null
        )
      );
    }

    await ctx.env.DB.batch(statements);

    return new Response(JSON.stringify({ ok: true, count: normalized.length }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
