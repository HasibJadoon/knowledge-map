import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { resolveSrsTable } from '../_utils/srs';

interface Env {
  DB: D1Database;
}

type SrsFilter = 'due' | 'upcoming' | 'all' | 'suspended';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const surahExpr = `
  CASE
    WHEN INSTR(item_key, ':') > 0
      THEN CAST(SUBSTR(item_key, 1, INSTR(item_key, ':') - 1) AS INTEGER)
    ELSE NULL
  END
`;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const filter = normalizeFilter(url.searchParams.get('filter'));
    const surahId = normalizeSurahId(url.searchParams.get('surah_id'));
    const limit = normalizeLimit(url.searchParams.get('limit'));
    const now = new Date().toISOString();
    const srsTable = await resolveSrsTable(ctx.env.DB);

    const scopeWhere = [`status != 'archived'`];
    const scopeBinds: Array<string | number> = [];

    if (surahId) {
      scopeWhere.push(`${surahExpr} = ?`);
      scopeBinds.push(surahId);
    }

    const filterWhere = [...scopeWhere];
    const filterBinds = [...scopeBinds];

    if (filter === 'due') {
      filterWhere.push(`status = 'active'`);
      filterWhere.push(`due_at IS NOT NULL`);
      filterWhere.push(`due_at <= ?`);
      filterBinds.push(now);
    } else if (filter === 'upcoming') {
      filterWhere.push(`status = 'active'`);
      filterWhere.push(`(due_at IS NULL OR due_at > ?)`);
      filterBinds.push(now);
    } else if (filter === 'suspended') {
      filterWhere.push(`status = 'suspended'`);
    }

    const itemsStmt = ctx.env.DB.prepare(`
      SELECT
        id,
        item_type,
        item_key,
        card_json,
        json_extract(card_json, '$.deck_id') AS deck_id,
        status,
        due_at,
        last_review_at,
        interval_days,
        ease,
        reps,
        lapses,
        again_count,
        hard_count,
        good_count,
        easy_count,
        last_rating,
        created_at,
        updated_at,
        ${surahExpr} AS surah_id
      FROM ${srsTable}
      WHERE ${filterWhere.join(' AND ')}
      ORDER BY
        CASE
          WHEN due_at IS NULL THEN 1
          ELSE 0
        END,
        due_at ASC,
        id ASC
      LIMIT ?
    `).bind(...filterBinds, limit);

    const summaryStmt = ctx.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' AND due_at IS NOT NULL AND due_at <= ? THEN 1 ELSE 0 END) AS due,
        SUM(CASE WHEN status = 'active' AND (due_at IS NULL OR due_at > ?) THEN 1 ELSE 0 END) AS upcoming,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended,
        COUNT(*) AS total
      FROM ${srsTable}
      WHERE ${scopeWhere.join(' AND ')}
    `).bind(now, now, ...scopeBinds);

    const [{ results }, summary] = await Promise.all([
      itemsStmt.all().catch(() => ({ results: [] })),
      summaryStmt.first<{ due: number | null; upcoming: number | null; suspended: number | null; total: number | null }>(),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        filter,
        total: results?.length ?? 0,
        items: results ?? [],
        summary: {
          due: Number(summary?.due ?? 0),
          upcoming: Number(summary?.upcoming ?? 0),
          suspended: Number(summary?.suspended ?? 0),
          total: Number(summary?.total ?? 0),
        },
      }),
      { headers: jsonHeaders },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders },
    );
  }
};

function normalizeFilter(raw: string | null): SrsFilter {
  if (raw === 'due' || raw === 'upcoming' || raw === 'all' || raw === 'suspended') {
    return raw;
  }
  return 'due';
}

function normalizeSurahId(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const surahId = Number(raw);
  return Number.isInteger(surahId) && surahId > 0 && surahId <= 114 ? surahId : null;
}

function normalizeLimit(raw: string | null): number {
  const value = Number(raw ?? 80);
  if (!Number.isFinite(value)) {
    return 80;
  }
  return Math.max(1, Math.min(Math.floor(value), 250));
}
