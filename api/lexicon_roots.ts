import { requireAuth } from './_utils/auth';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseArrayField(value: unknown): unknown[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseObjectField(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function generateSearchKeys(
  root: string,
  family: string,
  rootLatn?: string | null,
  rootNorm?: string | null,
  alt?: unknown[]
): string {
  const parts = [
    root,
    family,
    rootLatn ?? '',
    rootNorm ?? '',
    ...(alt ?? []).map((item) => String(item ?? '')),
  ]
    .map((part) => part.toLowerCase().trim())
    .filter((part) => part.length > 0);
  return parts.join(' ');
}

function toInt(v: string | null, def: number) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    // =====================================================
    // AUTH (JWT)
    // =====================================================
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const q = (url.searchParams.get('q') ?? '').trim();

    // ---------------- pagination ----------------
    const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
    const pageSizeRaw = toInt(url.searchParams.get('pageSize'), 100);
    const pageSize = Math.min(500, Math.max(1, pageSizeRaw));

    const offsetParam = url.searchParams.get('offset');
    const limitParam = url.searchParams.get('limit');

    let limit = pageSize;
    let offset = (page - 1) * pageSize;

    if (offsetParam !== null || limitParam !== null) {
      limit = Math.min(500, Math.max(1, toInt(limitParam, 100)));
      offset = Math.max(0, toInt(offsetParam, 0));
    }

    // ---------------- SQL ----------------
    let countStmt;
    let dataStmt;

    const selectSql = `
      SELECT
        id,
        root,
        family,
        root_latn,
        root_norm,
        alt_latn_json,
        romanization_sources_json,
        search_keys_norm,
        cards_json AS cards,
        status,
        difficulty,
        frequency,
        created_at,
        updated_at,
        extracted_at
      FROM roots
    `;

    if (q) {
      const like = `%${q}%`;

      countStmt = ctx.env.DB.prepare(
        `
          SELECT COUNT(*) AS total
          FROM roots
          WHERE root LIKE ?1 OR family LIKE ?1 OR search_keys_norm LIKE ?1
        `
      ).bind(like);

      dataStmt = ctx.env.DB.prepare(
        `
          ${selectSql}
          WHERE root LIKE ?1 OR family LIKE ?1 OR search_keys_norm LIKE ?1
          ORDER BY root ASC, family ASC
          LIMIT ?2 OFFSET ?3
        `
      ).bind(like, limit, offset);
    } else {
      countStmt = ctx.env.DB.prepare(
        `SELECT COUNT(*) AS total FROM roots`
      );

      dataStmt = ctx.env.DB.prepare(
        `
          ${selectSql}
          ORDER BY root ASC, family ASC
          LIMIT ?1 OFFSET ?2
        `
      ).bind(limit, offset);
    }

    const countRes = await countStmt.first<{ total: number }>();
    const total = Number(countRes?.total ?? 0);

    const { results } = await dataStmt.all();

    const rows = (results ?? []).map((row) => ({
      ...row,
      alt_latn_json: safeJsonParse<string[]>(row.alt_latn_json),
      romanization_sources_json: safeJsonParse<Record<string, unknown>>(row.romanization_sources_json),
    }));

    const returned = rows.length;
    const nextOffset = offset + returned;
    const hasMore = nextOffset < total;

    const usingOffsetMode = offsetParam !== null || limitParam !== null;

    const meta = usingOffsetMode
      ? {
          mode: 'offset',
          q,
          limit,
          offset,
          nextOffset: hasMore ? nextOffset : null,
        }
      : {
          mode: 'page',
          q,
          page,
          pageSize,
          pages: Math.max(1, Math.ceil(total / pageSize)),
        };

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        hasMore,
        ...meta,
        results: rows,
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
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: jsonHeaders }
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

    const root = typeof body?.root === 'string' ? body.root.trim() : '';
    const family = typeof body?.family === 'string' ? body.family.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim() : 'active';
    const frequency = typeof body?.frequency === 'string' ? body.frequency.trim() : null;
    const difficulty = body?.difficulty === null || body?.difficulty === undefined
      ? null
      : Number(body.difficulty);

    if (!root || !family) {
      return new Response(
        JSON.stringify({ ok: false, error: 'root and family are required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (difficulty !== null && !Number.isFinite(difficulty)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'difficulty must be a number' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const cardsJson = JSON.stringify(cards, null, 2);

    const rootLatn = typeof body?.root_latn === 'string' ? body.root_latn.trim() : null;
    const rootNorm = typeof body?.root_norm === 'string' ? body.root_norm.trim() : null;
    const altLatn = parseArrayField(body?.alt_latn_json);
    const romanizationSources = parseObjectField(body?.romanization_sources_json);
    const altLatnJson = altLatn && altLatn.length ? JSON.stringify(altLatn, null, 2) : null;
    const romanizationSourcesJson =
      romanizationSources && Object.keys(romanizationSources).length
        ? JSON.stringify(romanizationSources, null, 2)
        : null;
    const searchKeysCandidate =
      typeof body?.search_keys_norm === 'string' ? body.search_keys_norm.trim() : '';
    const searchKeys =
      searchKeysCandidate ||
      generateSearchKeys(root, family, rootLatn, rootNorm, altLatn);

    const res = await ctx.env.DB
      .prepare(
        `
        INSERT INTO roots (
          root,
          family,
          root_latn,
          root_norm,
          alt_latn_json,
          romanization_sources_json,
          cards_json,
          search_keys_norm,
          status,
          difficulty,
          frequency,
          created_at,
          updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, datetime('now'), datetime('now'))
      `
      )
      .bind(
        root,
        family,
        rootLatn,
        rootNorm,
        altLatnJson,
        romanizationSourcesJson,
        cardsJson,
        searchKeys,
        status,
        difficulty,
        frequency
      )
      .run();

    // @ts-ignore
    const id = Number(res?.meta?.last_row_id ?? 0);

    return new Response(
      JSON.stringify({ ok: true, id }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const status = msg.includes('UNIQUE') ? 409 : 500;
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status, headers: jsonHeaders }
    );
  }
};
