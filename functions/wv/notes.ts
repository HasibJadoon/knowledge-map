import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const sourceId = url.searchParams.get('source_id') ?? '';
    const sourceUnitId = url.searchParams.get('source_unit_id') ?? '';
    const noteKind = url.searchParams.get('note_kind') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);

    const conditions: string[] = ["status != 'archived'"];
    const binds: (string | number)[] = [];
    let idx = 1;

    if (sourceId) { conditions.push(`source_id = ?${idx++}`); binds.push(sourceId); }
    if (sourceUnitId) { conditions.push(`source_unit_id = ?${idx++}`); binds.push(sourceUnitId); }
    if (noteKind) { conditions.push(`note_kind = ?${idx++}`); binds.push(noteKind); }
    binds.push(limit);

    const where = `WHERE ${conditions.join(' AND ')}`;

    const { results } = await ctx.env.DB.prepare(`
      SELECT id, source_id, source_unit_id, note_kind, title, body_md, excerpt_text, status, created_at
      FROM wv_notes
      ${where}
      ORDER BY created_at ASC
      LIMIT ?${idx}
    `).bind(...binds).all();

    return new Response(
      JSON.stringify({ ok: true, notes: results ?? [] }),
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
    let body: any;
    try { body = await ctx.request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders }); }

    const sourceId = (body?.source_id ?? '').trim();
    const bodyMd = (body?.body_md ?? '').trim();
    if (!sourceId) return new Response(JSON.stringify({ ok: false, error: 'source_id required' }), { status: 400, headers: jsonHeaders });
    if (!bodyMd) return new Response(JSON.stringify({ ok: false, error: 'body_md required' }), { status: 400, headers: jsonHeaders });

    const sourceUnitId = (body?.source_unit_id ?? '').trim() || null;
    const noteKind = (body?.note_kind ?? 'highlight').trim();
    const title = (body?.title ?? '').trim() || null;
    const excerptText = (body?.excerpt_text ?? '').trim() || null;

    const ts = Date.now();
    const hash = Math.random().toString(36).slice(2, 8);
    const id = `note-${ts}-${hash}`;
    const canonical = `note:${sourceId}:${noteKind}:${ts}`;

    const workspaceId = (body?.workspace_id ?? 'ws_user_1').trim();
    // Map 'highlight' → 'quote' to match DB CHECK constraint
    const dbKind = noteKind === 'highlight' ? 'quote' : noteKind;

    await ctx.env.DB.prepare(`
      INSERT INTO wv_notes
        (id, canonical_input, workspace_id, source_id, source_unit_id, note_kind, title, body_md, excerpt_text, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', datetime('now'))
    `).bind(id, canonical, workspaceId, sourceId, sourceUnitId, dbKind, title, bodyMd, excerptText).run();

    return new Response(JSON.stringify({ ok: true, id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
