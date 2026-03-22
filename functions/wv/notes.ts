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

    const noteConditions: string[] = ["status != 'archived'"];
    const noteBinds: (string | number)[] = [];
    let noteIdx = 1;

    const highlightConditions: string[] = [];
    const highlightBinds: (string | number)[] = [];
    let highlightIdx = 1;

    if (sourceId) {
      noteConditions.push(`source_id = ?${noteIdx++}`);
      noteBinds.push(sourceId);
      highlightConditions.push(`source_id = ?${highlightIdx++}`);
      highlightBinds.push(sourceId);
    }

    if (sourceUnitId) {
      noteConditions.push(`source_unit_id = ?${noteIdx++}`);
      noteBinds.push(sourceUnitId);
      highlightConditions.push(`source_unit_id = ?${highlightIdx++}`);
      highlightBinds.push(sourceUnitId);
    }

    if (noteKind) {
      noteConditions.push(`note_kind = ?${noteIdx++}`);
      noteBinds.push(noteKind);
    }

    noteBinds.push(limit);
    highlightBinds.push(limit);

    const noteWhere = `WHERE ${noteConditions.join(' AND ')}`;
    const highlightWhere = highlightConditions.length ? `WHERE ${highlightConditions.join(' AND ')}` : '';

    const [notesResult, highlightsResult] = await Promise.all([
      ctx.env.DB.prepare(`
        SELECT id, source_id, source_unit_id, note_kind, title, body_md, excerpt_text, status, created_at
        FROM wv_notes
        ${noteWhere}
        ORDER BY created_at ASC
        LIMIT ?${noteIdx}
      `).bind(...noteBinds).all(),
      ctx.env.DB.prepare(`
        SELECT id, source_id, source_unit_id, locator, anchor_text, selected_text, start_offset, end_offset, color, meta_json, created_at
        FROM wv_highlights
        ${highlightWhere}
        ORDER BY created_at ASC
        LIMIT ?${highlightIdx}
      `).bind(...highlightBinds).all(),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        notes: notesResult.results ?? [],
        highlights: highlightsResult.results ?? [],
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
