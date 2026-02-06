import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const allowedPosFilters = new Set(['verb', 'noun', 'adj', 'particle', 'phrase']);

type TokenRow = {
  id: string;
  canonical_input: string;
  lemma_ar: string;
  lemma_norm: string;
  pos: string;
  root_norm: string | null;
  ar_u_root: string | null;
  root: string | null;
  root_latn: string | null;
  root_meta_json: string | null;
  meta_json: string | null;
};

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const safeToken = (row: TokenRow) => ({
  id: row.id,
  canonical_input: row.canonical_input,
  lemma_ar: row.lemma_ar,
  lemma_norm: row.lemma_norm,
  pos: row.pos,
  root_norm: row.root_norm,
  ar_u_root: row.ar_u_root,
  root: row.root,
  root_latn: row.root_latn,
  meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
  root_meta: parseJson<Record<string, unknown>>(row.root_meta_json) ?? {},
});

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(ctx.request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const posParam = (url.searchParams.get('pos') ?? '').trim().toLowerCase();
  const hasPos = Boolean(posParam && allowedPosFilters.has(posParam));

  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(200, Math.max(25, toInt(url.searchParams.get('pageSize'), 100)));
  let limit = pageSize;
  let offset = (page - 1) * pageSize;
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(200, Math.max(1, toInt(limitParam, pageSize)));
    offset = Math.max(0, toInt(offsetParam, 0));
  }

  const whereParts: string[] = [];
  const bindValues: (string | number)[] = [];

  if (hasPos) {
    whereParts.push('t.pos = ?');
    bindValues.push(posParam);
  }

  if (q) {
    const like = `%${q}%`;
    whereParts.push(
      '(t.lemma_ar LIKE ? OR t.lemma_norm LIKE ? OR t.root_norm LIKE ? OR t.canonical_input LIKE ? OR r.root LIKE ?)'
    );
    bindValues.push(like, like, like, like, like);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const selectSql = `
    SELECT
      t.ar_u_token AS id,
      t.canonical_input,
      t.lemma_ar,
      t.lemma_norm,
      t.pos,
      t.root_norm,
      t.ar_u_root,
      r.root,
      r.root_latn,
      r.meta_json AS root_meta_json,
      t.meta_json
    FROM ar_u_tokens t
    LEFT JOIN ar_u_roots r ON r.ar_u_root = t.ar_u_root
  `;

  try {
    const totalStmt = ctx.env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM ar_u_tokens t
      LEFT JOIN ar_u_roots r ON r.ar_u_root = t.ar_u_root
      ${whereClause}
    `);

    const totalRes = await totalStmt.bind(...bindValues).first();
    const total = totalRes?.total ?? 0;

    const dataStmt = ctx.env.DB.prepare(`${selectSql} ${whereClause} ORDER BY t.lemma_ar ASC LIMIT ? OFFSET ?`);
    const dataBinds = [...bindValues, limit, offset];
    const { results = [] } = await dataStmt.bind(...dataBinds).all();
    const rows = (results as TokenRow[]).map(safeToken);

    return new Response(JSON.stringify({
      ok: true,
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total,
      results: rows,
    }), { headers: jsonHeaders });
  } catch (err) {
    console.error('token list error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load tokens' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const id = String(body['id'] ?? '').trim();
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'Token id is required.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const lemmaAr = String(body['lemma_ar'] ?? '').trim();
  const lemmaNorm = String(body['lemma_norm'] ?? '').trim();
  const pos = String(body['pos'] ?? '').trim().toLowerCase();
  if (!lemmaAr || !lemmaNorm || !pos) {
    return new Response(JSON.stringify({ ok: false, error: 'lemma_ar, lemma_norm, and pos are required.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  if (!allowedPosFilters.has(pos)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid POS value.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const rootNormRaw = body['root_norm'];
  const rootNorm =
    rootNormRaw === null || rootNormRaw === undefined
      ? null
      : String(rootNormRaw).trim() || null;

  const arURootRaw = body['ar_u_root'];
  const arURoot =
    arURootRaw === null || arURootRaw === undefined
      ? null
      : String(arURootRaw).trim() || null;

  const metaProvided = Object.prototype.hasOwnProperty.call(body, 'meta');
  let metaJson: string | null | undefined = undefined;
  if (metaProvided) {
    const metaValue = body['meta'];
    if (metaValue === null) {
      metaJson = null;
    } else if (typeof metaValue === 'object' && !Array.isArray(metaValue)) {
      metaJson = JSON.stringify(metaValue);
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'meta must be a JSON object.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
  }

  try {
    const existing = await ctx.env.DB.prepare(
      `SELECT ar_u_token AS id FROM ar_u_tokens WHERE ar_u_token = ?`
    ).bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Token not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (arURoot) {
      const rootExists = await ctx.env.DB.prepare(
        `SELECT ar_u_root FROM ar_u_roots WHERE ar_u_root = ?`
      ).bind(arURoot).first();
      if (!rootExists) {
        return new Response(JSON.stringify({ ok: false, error: 'Root id not found.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
    }

    const updateCols: string[] = [];
    const updateBinds: (string | number | null)[] = [];
    updateCols.push('lemma_ar = ?');
    updateBinds.push(lemmaAr);
    updateCols.push('lemma_norm = ?');
    updateBinds.push(lemmaNorm);
    updateCols.push('pos = ?');
    updateBinds.push(pos);
    updateCols.push('root_norm = ?');
    updateBinds.push(rootNorm);
    updateCols.push('ar_u_root = ?');
    updateBinds.push(arURoot);
    if (metaProvided) {
      updateCols.push('meta_json = ?');
      updateBinds.push(metaJson ?? null);
    }
    updateCols.push(`updated_at = datetime('now')`);

    const updateSql = `UPDATE ar_u_tokens SET ${updateCols.join(', ')} WHERE ar_u_token = ?`;
    updateBinds.push(id);
    await ctx.env.DB.prepare(updateSql).bind(...updateBinds).run();

    const refreshed = await ctx.env.DB.prepare(`
      SELECT
        t.ar_u_token AS id,
        t.canonical_input,
        t.lemma_ar,
        t.lemma_norm,
        t.pos,
        t.root_norm,
        t.ar_u_root,
        r.root,
        r.root_latn,
        r.meta_json AS root_meta_json,
        t.meta_json
      FROM ar_u_tokens t
      LEFT JOIN ar_u_roots r ON r.ar_u_root = t.ar_u_root
      WHERE t.ar_u_token = ?
    `).bind(id).first<TokenRow>();

    if (!refreshed) {
      return new Response(JSON.stringify({ ok: false, error: 'Token not found after update.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, result: safeToken(refreshed) }), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error('token update error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to update token.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
