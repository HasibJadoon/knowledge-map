import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const h = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .map((entry) => readOptionalString(entry))
    .filter((entry): entry is string => entry != null);
}

function readObjectArray(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry),
  );
}

// GET /worldview/units/:id  — single unit with full reading body + child units
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const [unitRow, childrenRes] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT u.id, u.source_id, u.parent_unit_id, u.unit_type, u.title,
                u.order_index, u.start_ref, u.end_ref, u.anchor_text, u.summary,
                u.unit_json, u.meta_json,
                s.title AS source_title, s.source_type, s.creator
         FROM wv_source_units u
         LEFT JOIN wv_sources s ON s.id = u.source_id
         WHERE u.id = ?1`
      ).bind(id).first<any>(),
      ctx.env.DB.prepare(
        `SELECT id, unit_type, title, order_index, start_ref, end_ref, anchor_text, summary
         FROM wv_source_units
         WHERE parent_unit_id = ?1
         ORDER BY order_index ASC`
      ).bind(id).all(),
    ]);

    if (!unitRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: h });
    }

    const unitJson = safeJson(unitRow.unit_json) as Record<string, unknown> | null;
    const metaJson = safeJson(unitRow.meta_json) as Record<string, unknown> | null;
    const locatorLabel =
      readOptionalString(unitJson?.['locatorLabel']) ||
      readOptionalString(unitJson?.['locator_label']) ||
      readOptionalString(metaJson?.['locatorLabel']) ||
      readOptionalString(metaJson?.['locator_label']);
    const readingMinutes = readInteger(unitJson?.['readingMinutes']) ?? readInteger(unitJson?.['reading_minutes']);
    const readingSchema =
      readOptionalString(unitJson?.['readingSchema']) || readOptionalString(unitJson?.['reading_schema']);
    const readingBody = readStringArray(unitJson?.['readingBody']) ?? readStringArray(unitJson?.['reading_body']);
    const readingBlocks =
      readObjectArray(unitJson?.['readingBlocks']) ?? readObjectArray(unitJson?.['reading_blocks']);
    const result = {
      ...unitRow,
      locatorLabel,
      readingMinutes,
      readingSchema,
      readingBody,
      readingBlocks,
      unit_json: undefined,
      meta: metaJson,
      meta_json: undefined,
      children: childrenRes.results ?? [],
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
