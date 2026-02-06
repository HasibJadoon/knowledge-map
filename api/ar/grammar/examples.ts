import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function toInt(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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
    const grammarId = normalizeString(url.searchParams.get('grammar_id'));
    const q = normalizeString(url.searchParams.get('q'));
    const exampleType = normalizeString(url.searchParams.get('type'));

    const whereParts: string[] = [`n.note_type = 'grammar_example'`];
    const binds: (string | number)[] = [];

    if (grammarId) {
      whereParts.push('t.target_type = ? AND t.target_id = ?');
      binds.push('grammar', grammarId);
    }
    if (q) {
      whereParts.push('(n.excerpt LIKE ? OR n.commentary LIKE ? OR n.title LIKE ?)');
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (exampleType) {
      whereParts.push(`json_extract(n.extra_json, '$.example_type') = ?`);
      binds.push(exampleType);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const { results = [] } = await ctx.env.DB.prepare(
      `
      SELECT
        n.id,
        n.user_id,
        n.note_type,
        n.title,
        n.excerpt,
        n.commentary,
        n.source_id,
        n.locator,
        n.extra_json,
        n.created_at,
        n.updated_at,
        t.target_id AS grammar_id
      FROM ar_notes n
      LEFT JOIN ar_note_targets t ON t.note_id = n.id AND t.target_type = 'grammar'
      ${whereClause}
      ORDER BY n.id DESC
      `
    ).bind(...binds).all();

    const mapped = (results as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      grammar_id: row.grammar_id,
      title: row.title,
      excerpt: row.excerpt,
      commentary: row.commentary,
      source_id: row.source_id,
      locator: row.locator,
      extra: parseJson<Record<string, unknown>>(row.extra_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return new Response(JSON.stringify({ ok: true, results: mapped }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar examples list error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
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

    const body = (await ctx.request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const grammarId = normalizeString(body['grammar_id']);
    const excerpt = normalizeString(body['excerpt']);
    const commentary = normalizeString(body['commentary']);
    const title = normalizeString(body['title']);
    const locator = normalizeString(body['locator']);
    const sourceId = toInt(body['source_id']);
    const extra =
      body['extra'] && typeof body['extra'] === 'object' && !Array.isArray(body['extra'])
        ? (body['extra'] as Record<string, unknown>)
        : {};

    if (!excerpt) {
      return new Response(JSON.stringify({ ok: false, error: 'excerpt is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const noteStmt = ctx.env.DB.prepare(
      `
      INSERT INTO ar_notes (user_id, note_type, title, excerpt, commentary, source_id, locator, extra_json)
      VALUES (?1, 'grammar_example', ?2, ?3, ?4, ?5, ?6, ?7)
      `
    );

    const noteResult = await noteStmt.bind(
      user.id,
      title || null,
      excerpt,
      commentary || null,
      sourceId ?? null,
      locator || null,
      Object.keys(extra).length ? JSON.stringify(extra) : null
    ).run();

    const noteId = noteResult.meta?.last_row_id;
    if (noteId && grammarId) {
      await ctx.env.DB.prepare(
        `
        INSERT OR REPLACE INTO ar_note_targets (note_id, target_type, target_id, relation, share_scope)
        VALUES (?1, 'grammar', ?2, 'example', 'private')
        `
      ).bind(noteId, grammarId).run();
    }

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        n.id,
        n.user_id,
        n.note_type,
        n.title,
        n.excerpt,
        n.commentary,
        n.source_id,
        n.locator,
        n.extra_json,
        n.created_at,
        n.updated_at,
        t.target_id AS grammar_id
      FROM ar_notes n
      LEFT JOIN ar_note_targets t ON t.note_id = n.id AND t.target_type = 'grammar'
      WHERE n.id = ?1
      `
    ).bind(noteId).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to create example.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      user_id: row.user_id,
      grammar_id: row.grammar_id,
      title: row.title,
      excerpt: row.excerpt,
      commentary: row.commentary,
      source_id: row.source_id,
      locator: row.locator,
      extra: parseJson<Record<string, unknown>>(row.extra_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar example create error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
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

    const body = (await ctx.request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const id = toInt(body['id']);
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const updateCols: string[] = [];
    const updateBinds: (string | number | null)[] = [];

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      updateCols.push('title = ?');
      updateBinds.push(normalizeString(body['title']) || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'excerpt')) {
      updateCols.push('excerpt = ?');
      updateBinds.push(normalizeString(body['excerpt']) || '');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'commentary')) {
      updateCols.push('commentary = ?');
      updateBinds.push(normalizeString(body['commentary']) || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'source_id')) {
      updateCols.push('source_id = ?');
      updateBinds.push(toInt(body['source_id']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'locator')) {
      updateCols.push('locator = ?');
      updateBinds.push(normalizeString(body['locator']) || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'extra')) {
      const extra =
        body['extra'] && typeof body['extra'] === 'object' && !Array.isArray(body['extra'])
          ? (body['extra'] as Record<string, unknown>)
          : {};
      updateCols.push('extra_json = ?');
      updateBinds.push(Object.keys(extra).length ? JSON.stringify(extra) : null);
    }

    if (!updateCols.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    updateCols.push(`updated_at = datetime('now')`);
    updateBinds.push(id);
    await ctx.env.DB.prepare(
      `UPDATE ar_notes SET ${updateCols.join(', ')} WHERE id = ?`
    ).bind(...updateBinds).run();

    const grammarId = normalizeString(body['grammar_id']);
    if (grammarId) {
      await ctx.env.DB.prepare(
        `INSERT OR REPLACE INTO ar_note_targets (note_id, target_type, target_id, relation, share_scope)
         VALUES (?1, 'grammar', ?2, 'example', 'private')`
      ).bind(id, grammarId).run();
    }

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        n.id,
        n.user_id,
        n.note_type,
        n.title,
        n.excerpt,
        n.commentary,
        n.source_id,
        n.locator,
        n.extra_json,
        n.created_at,
        n.updated_at,
        t.target_id AS grammar_id
      FROM ar_notes n
      LEFT JOIN ar_note_targets t ON t.note_id = n.id AND t.target_type = 'grammar'
      WHERE n.id = ?1
      `
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Example not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      user_id: row.user_id,
      grammar_id: row.grammar_id,
      title: row.title,
      excerpt: row.excerpt,
      commentary: row.commentary,
      source_id: row.source_id,
      locator: row.locator,
      extra: parseJson<Record<string, unknown>>(row.extra_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar example update error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
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

    const url = new URL(ctx.request.url);
    const id = toInt(url.searchParams.get('id'));
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(`DELETE FROM ar_notes WHERE id = ?1`).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar example delete error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
