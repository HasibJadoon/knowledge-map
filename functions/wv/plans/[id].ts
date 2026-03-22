import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const plan = await ctx.env.DB.prepare(
      `SELECT * FROM wv_plan WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!plan) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Plan not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const { results: items } = await ctx.env.DB.prepare(
      `SELECT
         i.*,
         s.title AS source_title,
         u.title AS unit_title
       FROM wv_plan_item i
       LEFT JOIN wv_sources s ON s.id = i.source_id
       LEFT JOIN wv_source_units u ON u.id = i.unit_id
       WHERE i.plan_id = ?1
       ORDER BY i.sort_order ASC, i.id ASC`
    )
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({ ok: true, plan, items: items ?? [] }),
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
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1];

    // PUT /wv/plans/:id/items/:itemId
    if (lastSegment !== id && pathParts.includes('items')) {
      const itemId = lastSegment;

      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const existingItem = await ctx.env.DB.prepare(
        `SELECT id, status FROM wv_plan_item WHERE id = ?1 AND plan_id = ?2`
      )
        .bind(itemId, id)
        .first<{ id: string | number; status: string | null }>();

      if (!existingItem) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Plan item not found' }),
          { status: 404, headers: jsonHeaders }
        );
      }

      const setCols: string[] = [];
      const binds: (string | number | null)[] = [];
      let bindIdx = 1;

      const stringFields = ['source_id', 'unit_id', 'title', 'target_date', 'notes'] as const;
      for (const field of stringFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          setCols.push(`${field} = ?${bindIdx++}`);
          binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'priority') && typeof body.priority === 'number') {
        setCols.push(`priority = ?${bindIdx++}`);
        binds.push(body.priority);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'sort_order') && typeof body.sort_order === 'number') {
        setCols.push(`sort_order = ?${bindIdx++}`);
        binds.push(body.sort_order);
      }

      const newStatus = typeof body?.status === 'string' ? body.status.trim() : null;
      if (newStatus !== null) {
        setCols.push(`status = ?${bindIdx++}`);
        binds.push(newStatus);

        // Set completed_at when status transitions to 'completed'
        if (newStatus === 'completed' && existingItem.status !== 'completed') {
          setCols.push(`completed_at = datetime('now')`);
        } else if (newStatus !== 'completed') {
          setCols.push(`completed_at = NULL`);
        }
      }

      if (!setCols.length) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No fields to update' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      setCols.push(`updated_at = datetime('now')`);
      binds.push(itemId);

      await ctx.env.DB.prepare(
        `UPDATE wv_plan_item SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
      )
        .bind(...binds)
        .run();

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: jsonHeaders }
      );
    }

    // PUT /wv/plans/:id — update plan fields
    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM wv_plan WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Plan not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const setCols: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    const stringFields = ['title', 'description', 'type', 'start_date', 'end_date', 'status', 'workspace_id'] as const;
    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setCols.push(`${field} = ?${bindIdx++}`);
        binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
      }
    }

    if (!setCols.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No fields to update' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    setCols.push(`updated_at = datetime('now')`);
    binds.push(id);

    await ctx.env.DB.prepare(
      `UPDATE wv_plan SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
    )
      .bind(...binds)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
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
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const lastSegment = url.pathname.split('/').at(-1);

    // Verify plan exists
    const plan = await ctx.env.DB.prepare(
      `SELECT id FROM wv_plan WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!plan) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Plan not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // POST /wv/plans/:id/items
    if (lastSegment === 'items') {
      const sourceId = typeof body?.source_id === 'string' ? body.source_id.trim() || null : null;
      const unitId = typeof body?.unit_id === 'string' ? body.unit_id.trim() || null : null;
      const title = typeof body?.title === 'string' ? body.title.trim() || null : null;
      const targetDate = typeof body?.target_date === 'string' ? body.target_date.trim() || null : null;
      const priority = typeof body?.priority === 'number' ? body.priority : null;
      const status = typeof body?.status === 'string' ? body.status.trim() || 'pending' : 'pending';
      const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null;
      const sortOrder = typeof body?.sort_order === 'number' ? body.sort_order : null;

      const result = await ctx.env.DB.prepare(
        `INSERT INTO wv_plan_item (plan_id, source_id, unit_id, title, target_date, priority, status, notes, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))`
      )
        .bind(id, sourceId, unitId, title, targetDate, priority, status, notes, sortOrder)
        .run();

      const itemId = result.meta?.last_row_id ?? null;

      return new Response(
        JSON.stringify({ ok: true, id: itemId }),
        { status: 201, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Unknown sub-resource' }),
      { status: 404, headers: jsonHeaders }
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
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1];

    // DELETE /wv/plans/:id/items/:itemId
    if (lastSegment !== id && pathParts.includes('items')) {
      const itemId = lastSegment;

      const existingItem = await ctx.env.DB.prepare(
        `SELECT id FROM wv_plan_item WHERE id = ?1 AND plan_id = ?2`
      )
        .bind(itemId, id)
        .first();

      if (!existingItem) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Plan item not found' }),
          { status: 404, headers: jsonHeaders }
        );
      }

      await ctx.env.DB.prepare(`DELETE FROM wv_plan_item WHERE id = ?1`)
        .bind(itemId)
        .run();

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: jsonHeaders }
      );
    }

    // DELETE /wv/plans/:id
    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM wv_plan WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Plan not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    await ctx.env.DB.prepare(`DELETE FROM wv_plan WHERE id = ?1`)
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
