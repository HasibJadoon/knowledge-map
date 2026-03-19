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

const encoder = new TextEncoder();

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

function canonicalize(input: string) {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256Hex(input: string) {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
    const unitId = normalizeString(url.searchParams.get('unit_id'));
    if (!unitId) {
      return new Response(JSON.stringify({ ok: false, error: 'unit_id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { results = [] } = await ctx.env.DB.prepare(
      `
      SELECT
        id,
        unit_id,
        item_type,
        title,
        content,
        content_ar,
        order_index,
        meta_json,
        created_at,
        updated_at
      FROM ar_grammar_unit_items
      WHERE unit_id = ?1
      ORDER BY order_index ASC, title ASC
      `
    ).bind(unitId).all();

    const items = (results as any[]).map((row) => ({
      id: row.id,
      unit_id: row.unit_id,
      item_type: row.item_type,
      title: row.title,
      content: row.content,
      content_ar: row.content_ar,
      order_index: row.order_index,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return new Response(JSON.stringify({ ok: true, results: items }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar unit items list error', err);
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

    const unitId = normalizeString(body['unit_id']);
    const itemType = normalizeString(body['item_type']) || 'lesson';
    const title = normalizeString(body['title']);
    const content = normalizeString(body['content']);
    const contentAr = normalizeString(body['content_ar']);
    const orderIndex = toInt(body['order_index']);
    const meta =
      body['meta'] && typeof body['meta'] === 'object' && !Array.isArray(body['meta'])
        ? (body['meta'] as Record<string, unknown>)
        : {};

    if (!unitId) {
      return new Response(JSON.stringify({ ok: false, error: 'unit_id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (!content && !title) {
      return new Response(JSON.stringify({ ok: false, error: 'content or title is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const canonicalInput = canonicalize(
      `GRAMITEM|${unitId}|${itemType}|${orderIndex ?? ''}|${title || content.slice(0, 40)}`
    );
    const id = await sha256Hex(canonicalInput);

    await ctx.env.DB.prepare(
      `
      INSERT OR IGNORE INTO ar_grammar_unit_items
        (id, unit_id, item_type, title, content, content_ar, order_index, meta_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `
    )
      .bind(
        id,
        unitId,
        itemType,
        title || null,
        content || '',
        contentAr || null,
        orderIndex,
        Object.keys(meta).length ? JSON.stringify(meta) : null
      )
      .run();

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        id,
        unit_id,
        item_type,
        title,
        content,
        content_ar,
        order_index,
        meta_json,
        created_at,
        updated_at
      FROM ar_grammar_unit_items
      WHERE id = ?1
      `
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to create item.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      unit_id: row.unit_id,
      item_type: row.item_type,
      title: row.title,
      content: row.content,
      content_ar: row.content_ar,
      order_index: row.order_index,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar unit item create error', err);
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

    const id = normalizeString(body['id']);
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const updateCols: string[] = [];
    const updateBinds: (string | number | null)[] = [];

    const unitId = normalizeString(body['unit_id']);
    const itemType = normalizeString(body['item_type']);
    const title = normalizeString(body['title']);
    const content = normalizeString(body['content']);
    const contentAr = normalizeString(body['content_ar']);
    const orderIndex = toInt(body['order_index']);
    const meta =
      body['meta'] && typeof body['meta'] === 'object' && !Array.isArray(body['meta'])
        ? (body['meta'] as Record<string, unknown>)
        : null;

    if (Object.prototype.hasOwnProperty.call(body, 'unit_id')) {
      updateCols.push('unit_id = ?');
      updateBinds.push(unitId || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'item_type')) {
      updateCols.push('item_type = ?');
      updateBinds.push(itemType || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      updateCols.push('title = ?');
      updateBinds.push(title || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'content')) {
      updateCols.push('content = ?');
      updateBinds.push(content || '');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'content_ar')) {
      updateCols.push('content_ar = ?');
      updateBinds.push(contentAr || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'order_index')) {
      updateCols.push('order_index = ?');
      updateBinds.push(orderIndex);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'meta')) {
      updateCols.push('meta_json = ?');
      updateBinds.push(meta && Object.keys(meta).length ? JSON.stringify(meta) : null);
    }

    if (!updateCols.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    updateCols.push(`updated_at = datetime('now')`);
    const updateSql = `UPDATE ar_grammar_unit_items SET ${updateCols.join(', ')} WHERE id = ?`;
    updateBinds.push(id);

    await ctx.env.DB.prepare(updateSql).bind(...updateBinds).run();

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        id,
        unit_id,
        item_type,
        title,
        content,
        content_ar,
        order_index,
        meta_json,
        created_at,
        updated_at
      FROM ar_grammar_unit_items
      WHERE id = ?1
      `
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Item not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      unit_id: row.unit_id,
      item_type: row.item_type,
      title: row.title,
      content: row.content,
      content_ar: row.content_ar,
      order_index: row.order_index,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar unit item update error', err);
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
    const id = normalizeString(url.searchParams.get('id'));
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(`DELETE FROM ar_grammar_unit_items WHERE id = ?1`).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar unit item delete error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
