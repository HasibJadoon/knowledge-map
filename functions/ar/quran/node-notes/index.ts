// ─────────────────────────────────────────────────────────────────────────────
//  /ar/quran/node-notes
//  Create and read notes attached to sentence-structure tree nodes.
//  Stores into ar_notes (header) + ar_note_targets (polymorphic link).
//
//  extra_json shape stored in ar_note_targets:
//  {
//    task_id:     string   — e.g. "UT:QURAN:SS:300"
//    step_no:     number   — task step_no
//    node_depth:  number   — tree depth of the node
//    node_name:   string   — Arabic text of the node
//  }
// ─────────────────────────────────────────────────────────────────────────────

interface Env { DB: D1Database; }

const HEADERS: HeadersInit = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function resp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback;
}

// ── GET ?target_type=ss_node&target_id=<id>[&task_id=UT:QURAN:SS:300] ────────
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url        = new URL(ctx.request.url);
    const targetType = url.searchParams.get('target_type')?.trim() ?? '';
    const targetId   = url.searchParams.get('target_id')?.trim()   ?? '';
    const taskId     = url.searchParams.get('task_id')?.trim()      ?? '';

    if (!targetType || !targetId)
      return resp({ ok: false, error: 'target_type and target_id are required' }, 400);

    // Optionally filter by task_id stored inside extra_json
    const taskFilter = taskId
      ? `AND json_extract(nt.extra_json, '$.task_id') = ?3`
      : '';

    const { results } = await ctx.env.DB.prepare(`
      SELECT
        n.id, n.note_type, n.title, n.excerpt, n.commentary, n.created_at,
        nt.relation, nt.ref, nt.edge_note,
        nt.container_id, nt.unit_id, nt.extra_json
      FROM ar_notes n
      JOIN ar_note_targets nt ON nt.note_id = n.id
      WHERE nt.target_type = ?1
        AND nt.target_id   = ?2
        ${taskFilter}
      ORDER BY n.created_at DESC
      LIMIT 100
    `).bind(...([targetType, targetId, ...(taskId ? [taskId] : [])])).all();

    return resp({ ok: true, notes: results ?? [] });
  } catch (e: any) {
    return resp({ ok: false, error: e?.message ?? String(e) }, 500);
  }
};

// ── POST — create note + target ───────────────────────────────────────────────
// Required body fields:
//   body_md      — note text (stored as ar_notes.excerpt)
//   target_type  — e.g. 'ss_node'
//   target_id    — e.g. node id or term_id
//
// Optional body fields (stored in ar_note_targets):
//   title, note_type, relation, ref,
//   container_id, unit_id, edge_note, share_scope,
//
// Extra context (stored in ar_note_targets.extra_json for fast access):
//   task_id    — full task ID  e.g. "UT:QURAN:SS:300"
//   step_no    — task step number
//   node_depth — depth of node in tree
//   node_name  — Arabic name of the node
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return resp({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const excerpt     = str(body['body_md'] ?? body['excerpt']);
  const title       = body['title']       ? str(body['title'])       : null;
  const noteType    = str(body['note_type'], 'observation');
  const targetType  = str(body['target_type']);
  const targetId    = str(body['target_id']);
  const relation    = str(body['relation'], 'about');
  const ref         = body['ref']          ? str(body['ref'])          : null;
  const containerId = body['container_id'] ? str(body['container_id']) : null;
  const unitId      = body['unit_id']      ? str(body['unit_id'])      : null;
  const edgeNote    = body['edge_note']    ? str(body['edge_note'])    : null;
  const shareScope  = str(body['share_scope'], 'private');

  // Extra identifiers → extra_json
  const extra: Record<string, unknown> = {};
  if (body['task_id'])    extra['task_id']    = str(body['task_id']);
  if (body['step_no'] != null) extra['step_no'] = Number(body['step_no']);
  if (body['node_depth'] != null) extra['node_depth'] = Number(body['node_depth']);
  if (body['node_name'])  extra['node_name']  = str(body['node_name']);
  const extraJson = Object.keys(extra).length ? JSON.stringify(extra) : null;

  if (!excerpt || !targetType || !targetId)
    return resp({ ok: false, error: 'body_md, target_type, and target_id are required' }, 400);

  try {
    // 1. Insert the note header
    const noteRow = await ctx.env.DB.prepare(`
      INSERT INTO ar_notes (note_type, title, excerpt, created_at)
      VALUES (?1, ?2, ?3, datetime('now'))
      RETURNING id, created_at
    `).bind(noteType, title, excerpt)
      .first<{ id: number; created_at: string }>();

    if (!noteRow?.id)
      return resp({ ok: false, error: 'Note insert failed — check ar_notes schema' }, 500);

    // 2. Insert the target link (upsert on conflict)
    await ctx.env.DB.prepare(`
      INSERT INTO ar_note_targets
        (note_id, target_type, target_id,
         relation, share_scope, ref,
         container_id, unit_id, edge_note, extra_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT (note_id, target_type, target_id) DO UPDATE SET
        relation     = excluded.relation,
        share_scope  = excluded.share_scope,
        ref          = excluded.ref,
        container_id = excluded.container_id,
        unit_id      = excluded.unit_id,
        edge_note    = excluded.edge_note,
        extra_json   = excluded.extra_json
    `).bind(
      noteRow.id, targetType, targetId,
      relation, shareScope, ref,
      containerId, unitId, edgeNote, extraJson,
    ).run();

    return resp({ ok: true, note_id: noteRow.id, created_at: noteRow.created_at });
  } catch (e: any) {
    return resp({ ok: false, error: e?.message ?? String(e) }, 500);
  }
};

// ── CORS preflight ────────────────────────────────────────────────────────────
export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin':  '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });
