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

function buildInClause(count: number) {
  return Array.from({ length: count }, () => '?').join(', ');
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
    const sourceIdentifier = normalizeString(url.searchParams.get('source'));
    const unitType = normalizeString(url.searchParams.get('unit_type'));
    const parentId = normalizeString(url.searchParams.get('parent_id'));
    const q = normalizeString(url.searchParams.get('q'));
    const includeItems = url.searchParams.get('include_items') === '1';

    const whereParts: string[] = [];
    const binds: (string | number)[] = [];

    if (sourceIdentifier) {
      whereParts.push('s.identifier = ?');
      binds.push(sourceIdentifier);
    }
    if (unitType) {
      whereParts.push('u.unit_type = ?');
      binds.push(unitType);
    }
    if (parentId) {
      whereParts.push('u.parent_id = ?');
      binds.push(parentId);
    }
    if (q) {
      whereParts.push('(u.title LIKE ? OR u.title_ar LIKE ?)');
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const { results: unitRows = [] } = await ctx.env.DB.prepare(
      `
      SELECT
        u.id,
        u.parent_id,
        u.unit_type,
        u.order_index,
        u.title,
        u.title_ar,
        u.source_id,
        u.start_page,
        u.end_page,
        u.meta_json,
        u.created_at,
        u.updated_at,
        s.identifier AS source_identifier,
        s.title AS source_title
      FROM ar_grammar_units u
      LEFT JOIN ar_sources s ON s.id = u.source_id
      ${whereClause}
      ORDER BY u.order_index ASC, u.title ASC
      `
    ).bind(...binds).all();

    const units = (unitRows as any[]).map((row) => ({
      id: row.id,
      parent_id: row.parent_id,
      unit_type: row.unit_type,
      order_index: row.order_index,
      title: row.title,
      title_ar: row.title_ar,
      source_id: row.source_id,
      source_identifier: row.source_identifier,
      source_title: row.source_title,
      start_page: row.start_page,
      end_page: row.end_page,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    if (!includeItems || units.length === 0) {
      return new Response(JSON.stringify({ ok: true, units, items: [] }), {
        headers: jsonHeaders,
      });
    }

    const unitIds = units.map((u) => u.id);
    const inClause = buildInClause(unitIds.length);

    const { results: itemRows = [] } = await ctx.env.DB.prepare(
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
      WHERE unit_id IN (${inClause})
      ORDER BY order_index ASC, title ASC
      `
    ).bind(...unitIds).all();

    const items = (itemRows as any[]).map((row) => ({
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

    return new Response(JSON.stringify({ ok: true, units, items }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    console.error('grammar units list error', err);
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

    const title = normalizeString(body['title']);
    const titleAr = normalizeString(body['title_ar']);
    const unitType = normalizeString(body['unit_type']);
    const parentId = normalizeString(body['parent_id']);
    const orderIndex = toInt(body['order_index']);
    const sourceIdentifier = normalizeString(body['source_identifier']);
    const sourceIdInput = toInt(body['source_id']);
    const startPage = toInt(body['start_page']);
    const endPage = toInt(body['end_page']);
    const meta =
      body['meta'] && typeof body['meta'] === 'object' && !Array.isArray(body['meta'])
        ? (body['meta'] as Record<string, unknown>)
        : {};

    if (!unitType) {
      return new Response(JSON.stringify({ ok: false, error: 'unit_type is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (!title && !titleAr) {
      return new Response(JSON.stringify({ ok: false, error: 'title or title_ar is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let sourceId = sourceIdInput;
    if (!sourceId && sourceIdentifier) {
      const sourceRow = await ctx.env.DB.prepare(
        `SELECT id FROM ar_sources WHERE identifier = ?1 ORDER BY id DESC LIMIT 1`
      ).bind(sourceIdentifier).first<any>();
      sourceId = sourceRow?.id ?? null;
    }

    const canonicalInput = canonicalize(
      `GRAMUNIT|${sourceIdentifier || sourceId || ''}|${unitType}|${parentId || ''}|${orderIndex ?? ''}|${title || titleAr}`
    );
    const id = await sha256Hex(canonicalInput);

    await ctx.env.DB.prepare(
      `
      INSERT OR IGNORE INTO ar_grammar_units
        (id, parent_id, unit_type, order_index, title, title_ar, source_id, start_page, end_page, meta_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      `
    )
      .bind(
        id,
        parentId || null,
        unitType,
        orderIndex,
        title || null,
        titleAr || null,
        sourceId ?? null,
        startPage,
        endPage,
        Object.keys(meta).length ? JSON.stringify(meta) : null
      )
      .run();

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        u.id,
        u.parent_id,
        u.unit_type,
        u.order_index,
        u.title,
        u.title_ar,
        u.source_id,
        u.start_page,
        u.end_page,
        u.meta_json,
        u.created_at,
        u.updated_at,
        s.identifier AS source_identifier,
        s.title AS source_title
      FROM ar_grammar_units u
      LEFT JOIN ar_sources s ON s.id = u.source_id
      WHERE u.id = ?1
      `
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to create unit.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      parent_id: row.parent_id,
      unit_type: row.unit_type,
      order_index: row.order_index,
      title: row.title,
      title_ar: row.title_ar,
      source_id: row.source_id,
      source_identifier: row.source_identifier,
      source_title: row.source_title,
      start_page: row.start_page,
      end_page: row.end_page,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    console.error('grammar unit create error', err);
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

    const title = normalizeString(body['title']);
    const titleAr = normalizeString(body['title_ar']);
    const unitType = normalizeString(body['unit_type']);
    const parentId = normalizeString(body['parent_id']);
    const orderIndex = toInt(body['order_index']);
    const startPage = toInt(body['start_page']);
    const endPage = toInt(body['end_page']);
    const sourceIdentifier = normalizeString(body['source_identifier']);
    const sourceIdInput = toInt(body['source_id']);
    const meta =
      body['meta'] && typeof body['meta'] === 'object' && !Array.isArray(body['meta'])
        ? (body['meta'] as Record<string, unknown>)
        : null;

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      updateCols.push('title = ?');
      updateBinds.push(title || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'title_ar')) {
      updateCols.push('title_ar = ?');
      updateBinds.push(titleAr || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'unit_type')) {
      updateCols.push('unit_type = ?');
      updateBinds.push(unitType || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'parent_id')) {
      updateCols.push('parent_id = ?');
      updateBinds.push(parentId || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'order_index')) {
      updateCols.push('order_index = ?');
      updateBinds.push(orderIndex);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'start_page')) {
      updateCols.push('start_page = ?');
      updateBinds.push(startPage);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'end_page')) {
      updateCols.push('end_page = ?');
      updateBinds.push(endPage);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'meta')) {
      updateCols.push('meta_json = ?');
      updateBinds.push(meta && Object.keys(meta).length ? JSON.stringify(meta) : null);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'source_id') || Object.prototype.hasOwnProperty.call(body, 'source_identifier')) {
      let sourceId = sourceIdInput;
      if (!sourceId && sourceIdentifier) {
        const sourceRow = await ctx.env.DB.prepare(
          `SELECT id FROM ar_sources WHERE identifier = ?1 ORDER BY id DESC LIMIT 1`
        ).bind(sourceIdentifier).first<any>();
        sourceId = sourceRow?.id ?? null;
      }
      updateCols.push('source_id = ?');
      updateBinds.push(sourceId ?? null);
    }

    if (!updateCols.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    updateCols.push(`updated_at = datetime('now')`);
    const updateSql = `UPDATE ar_grammar_units SET ${updateCols.join(', ')} WHERE id = ?`;
    updateBinds.push(id);

    await ctx.env.DB.prepare(updateSql).bind(...updateBinds).run();

    const row = await ctx.env.DB.prepare(
      `
      SELECT
        u.id,
        u.parent_id,
        u.unit_type,
        u.order_index,
        u.title,
        u.title_ar,
        u.source_id,
        u.start_page,
        u.end_page,
        u.meta_json,
        u.created_at,
        u.updated_at,
        s.identifier AS source_identifier,
        s.title AS source_title
      FROM ar_grammar_units u
      LEFT JOIN ar_sources s ON s.id = u.source_id
      WHERE u.id = ?1
      `
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const result = {
      id: row.id,
      parent_id: row.parent_id,
      unit_type: row.unit_type,
      order_index: row.order_index,
      title: row.title,
      title_ar: row.title_ar,
      source_id: row.source_id,
      source_identifier: row.source_identifier,
      source_title: row.source_title,
      start_page: row.start_page,
      end_page: row.end_page,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    console.error('grammar unit update error', err);
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

    await ctx.env.DB.prepare(`DELETE FROM ar_grammar_units WHERE id = ?1`).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    console.error('grammar unit delete error', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
