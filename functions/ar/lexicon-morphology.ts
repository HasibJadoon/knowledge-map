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

const LINK_ROLE_VALUES = new Set(['primary', 'inflection', 'derived', 'variant']);

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | null {
  const s = normalizeString(value);
  return s ? s : null;
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
    const arULexicon = normalizeString(url.searchParams.get('ar_u_lexicon'));
    const arUMorphology = normalizeString(url.searchParams.get('ar_u_morphology'));
    const linkRole = normalizeString(url.searchParams.get('link_role'));

    const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
    const offsetRaw = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(300, limitRaw)) : 100;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const where: string[] = [];
    const binds: Array<string | number> = [];

    if (arULexicon) {
      where.push('lm.ar_u_lexicon = ?');
      binds.push(arULexicon);
    }
    if (arUMorphology) {
      where.push('lm.ar_u_morphology = ?');
      binds.push(arUMorphology);
    }
    if (linkRole) {
      where.push('lm.link_role = ?');
      binds.push(linkRole);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await ctx.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ar_u_lexicon_morphology lm ${whereSql}`
    ).bind(...binds).first<{ total: number }>();

    const { results = [] } = await ctx.env.DB.prepare(
      `SELECT
        lm.ar_u_lexicon,
        lm.ar_u_morphology,
        lm.link_role,
        lm.created_at,
        m.surface_ar,
        m.surface_norm,
        m.pos2,
        m.derived_pattern,
        m.verb_form
      FROM ar_u_lexicon_morphology lm
      LEFT JOIN ar_u_morphology m ON m.ar_u_morphology = lm.ar_u_morphology
      ${whereSql}
      ORDER BY lm.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all<any>();

    return new Response(
      JSON.stringify({
        ok: true,
        total: Number(countRow?.total ?? 0),
        limit,
        offset,
        results,
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
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

    const arULexicon = normalizeString(body['ar_u_lexicon']);
    const arUMorphology = normalizeString(body['ar_u_morphology']);
    const linkRole = normalizeOptionalString(body['link_role']) ?? 'primary';

    if (!arULexicon || !arUMorphology) {
      return new Response(JSON.stringify({ ok: false, error: 'ar_u_lexicon and ar_u_morphology are required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (!LINK_ROLE_VALUES.has(linkRole)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid link_role.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(
      `INSERT INTO ar_u_lexicon_morphology (
        ar_u_lexicon,
        ar_u_morphology,
        link_role
      ) VALUES (?1, ?2, ?3)
      ON CONFLICT(ar_u_lexicon, ar_u_morphology) DO UPDATE SET
        link_role = excluded.link_role`
    ).bind(arULexicon, arUMorphology, linkRole).run();

    const row = await ctx.env.DB.prepare(
      `SELECT
        ar_u_lexicon,
        ar_u_morphology,
        link_role,
        created_at
      FROM ar_u_lexicon_morphology
      WHERE ar_u_lexicon = ?1 AND ar_u_morphology = ?2`
    ).bind(arULexicon, arUMorphology).first<any>();

    return new Response(JSON.stringify({ ok: true, result: row ?? null }), { headers: jsonHeaders });
  } catch (err: any) {
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

    const arULexicon = normalizeString(body['ar_u_lexicon']);
    const arUMorphology = normalizeString(body['ar_u_morphology']);
    const linkRole = normalizeString(body['link_role']);

    if (!arULexicon || !arUMorphology || !linkRole) {
      return new Response(JSON.stringify({ ok: false, error: 'ar_u_lexicon, ar_u_morphology, link_role are required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (!LINK_ROLE_VALUES.has(linkRole)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid link_role.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(
      `UPDATE ar_u_lexicon_morphology
       SET link_role = ?3
       WHERE ar_u_lexicon = ?1 AND ar_u_morphology = ?2`
    ).bind(arULexicon, arUMorphology, linkRole).run();

    const row = await ctx.env.DB.prepare(
      `SELECT
        ar_u_lexicon,
        ar_u_morphology,
        link_role,
        created_at
      FROM ar_u_lexicon_morphology
      WHERE ar_u_lexicon = ?1 AND ar_u_morphology = ?2`
    ).bind(arULexicon, arUMorphology).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, result: row }), { headers: jsonHeaders });
  } catch (err: any) {
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
    const arULexicon = normalizeString(url.searchParams.get('ar_u_lexicon'));
    const arUMorphology = normalizeString(url.searchParams.get('ar_u_morphology'));

    if (!arULexicon || !arUMorphology) {
      return new Response(JSON.stringify({ ok: false, error: 'ar_u_lexicon and ar_u_morphology are required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(
      `DELETE FROM ar_u_lexicon_morphology
       WHERE ar_u_lexicon = ?1 AND ar_u_morphology = ?2`
    ).bind(arULexicon, arUMorphology).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
