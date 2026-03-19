import { requireAuth } from '../../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type ContainerRequestBody = {
  container_id?: string;
  container_key?: string;
  title?: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  text_cache?: string;
};

function buildContainerId(requestedId: string | undefined, surah: number) {
  if (requestedId && requestedId.trim()) return requestedId.trim();
  return `C:QURAN:${surah}`;
}

function buildPassageUnitId(containerId: string, surah: number, start: number, end: number) {
  return `U:${containerId}:${surah}:${start}-${end}`;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const body = await ctx.request.json<ContainerRequestBody>();
    const surah = Number(body.surah);
    const ayahFrom = Number(body.ayah_from);
    const ayahTo = Number(body.ayah_to);
    if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(ayahFrom) || !Number.isInteger(ayahTo) || ayahFrom < 1 || ayahTo < ayahFrom) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid verse range' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    const containerId = buildContainerId(body.container_id, surah);
    const containerKey = body.container_key?.trim() || 'quran';
    const title = (body.title ?? `Surah ${surah} ${ayahFrom}-${ayahTo}`).toString().trim();
    await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO ar_containers (
          id, container_type, container_key, title, meta_json, created_at
        ) VALUES (?1, 'quran', ?2, ?3, json(?4), datetime('now'))
      `
      )
      .bind(containerId, containerKey, title, JSON.stringify({ source: 'lesson-authoring' }))
      .run();

    const passageId = buildPassageUnitId(containerId, surah, ayahFrom, ayahTo);
    await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO ar_container_units (
          id, container_id, unit_type, order_index, ayah_from, ayah_to,
          start_ref, end_ref, text_cache, meta_json, created_at
        ) VALUES (?1, ?2, 'passage', 1, ?3, ?4, ?5, ?6, ?7, json(?8), datetime('now'))
      `
      )
      .bind(
        passageId,
        containerId,
        ayahFrom,
        ayahTo,
        `${surah}:${ayahFrom}`,
        `${surah}:${ayahTo}`,
        body.text_cache ?? null,
        JSON.stringify({ source: 'lesson-authoring' })
      )
      .run();

    const ayahUnits = [];
    for (let ayah = ayahFrom; ayah <= ayahTo; ayah += 1) {
      const unitId = `U:${containerId}:${surah}:${ayah}`;
      await ctx.env.DB
        .prepare(
          `
          INSERT OR IGNORE INTO ar_container_units (
            id, container_id, unit_type, order_index, ayah_from, ayah_to,
            start_ref, end_ref, text_cache, meta_json, created_at
          ) VALUES (?1, ?2, 'ayah', ?3, ?4, ?5, ?6, ?7, ?8, json(?9), datetime('now'))
        `
        )
        .bind(
          unitId,
          containerId,
          ayah - ayahFrom + 2,
          ayah,
          ayah,
          `${surah}:${ayah}`,
          `${surah}:${ayah}`,
          null,
          JSON.stringify({ source: 'lesson-authoring' })
        )
        .run();
      ayahUnits.push({ unit_id: unitId, ayah, surah });
    }

    const response = {
      ok: true,
      result: {
        container: {
          id: containerId,
          container_type: 'quran',
          container_key: containerKey,
          title,
          meta_json: { source: 'lesson-authoring' },
        },
        units: [
          {
            id: passageId,
            unit_type: 'passage',
            ayah_from: ayahFrom,
            ayah_to: ayahTo,
            start_ref: `${surah}:${ayahFrom}`,
            end_ref: `${surah}:${ayahTo}`,
          },
          ...ayahUnits,
        ],
      },
    };
    return new Response(JSON.stringify(response), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
