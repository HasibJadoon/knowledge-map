import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const VALID_KINDS = new Set(['quote', 'summary', 'reflection', 'question', 'claim_seed', 'insight', 'observation', 'reference', 'todo', 'idea']);

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    let body: any;
    try { body = await ctx.request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders }); }

    const sourceId = (body?.source_id ?? '').trim();
    const sourceUnitId = (body?.source_unit_id ?? '').trim() || null;
    const workspaceId = (body?.workspace_id ?? 'ws_user_1').trim();
    const notes: any[] = Array.isArray(body?.notes) ? body.notes : [];

    if (!sourceId) return new Response(JSON.stringify({ ok: false, error: 'source_id required' }), { status: 400, headers: jsonHeaders });
    if (notes.length === 0) return new Response(JSON.stringify({ ok: false, error: 'notes array required' }), { status: 400, headers: jsonHeaders });
    if (notes.length > 100) return new Response(JSON.stringify({ ok: false, error: 'max 100 notes per bulk insert' }), { status: 400, headers: jsonHeaders });

    const inserts: Promise<any>[] = notes.map((n: any, i: number) => {
      const bodyMd = (n?.body_md ?? n?.body ?? '').trim();
      if (!bodyMd) return Promise.resolve(null);

      // 'highlight' maps to 'quote' for DB compatibility
      let kind = (n?.note_kind ?? n?.kind ?? 'quote').trim();
      if (kind === 'highlight') kind = 'quote';
      if (!VALID_KINDS.has(kind)) kind = 'quote';

      const excerptText = (n?.excerpt_text ?? n?.excerpt ?? '').trim() || null;
      const title = (n?.title ?? '').trim() || null;
      const ts = Date.now() + i;
      const hash = Math.random().toString(36).slice(2, 6);
      const id = `note-${ts}-${hash}`;
      const canonical = `note:${sourceId}:${kind}:${ts}`;

      return ctx.env.DB.prepare(`
        INSERT OR IGNORE INTO wv_notes
          (id, canonical_input, workspace_id, source_id, source_unit_id, note_kind, title, body_md, excerpt_text, status, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', datetime('now'))
      `).bind(id, canonical, workspaceId, sourceId, sourceUnitId, kind, title, bodyMd, excerptText).run();
    });

    await Promise.all(inserts);
    return new Response(JSON.stringify({ ok: true, inserted: notes.length }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};
