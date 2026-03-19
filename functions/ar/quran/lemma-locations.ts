import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import { canonicalize } from '../../_utils/universal';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function asInteger(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function normalizeTextNorm(value: string) {
  return canonicalize(value)
    .replace(/\s+/g, '_')
    .replace(/[|]/g, '_');
}

function stableLemmaId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  const normalized = hash % 2147483647;
  return Math.max(1, normalized);
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(ctx.request.url);
  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(200, Math.max(25, toInt(url.searchParams.get('pageSize'), 50)));
  let limit = pageSize;
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(500, Math.max(1, toInt(limitParam, pageSize)));
  }

  return new Response(
    JSON.stringify({
      ok: true,
      total: 0,
      page,
      pageSize: limit,
      hasMore: false,
      results: [],
    }),
    { headers: jsonHeaders }
  );
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }
  return new Response(JSON.stringify({ ok: true, results: [] }), { headers: jsonHeaders });
};
