interface Env {
  DB: D1Database;
}

const QURAN_CONTAINER_TYPE = 'quran';
const QURAN_ID_NAMESPACE = 'QURAN';
const QURAN_CONTAINER_ID = `C:${QURAN_ID_NAMESPACE}`;

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

function buildContainerId() {
  return QURAN_CONTAINER_ID;
}

function buildSurahUnitId(surah: number) {
  return `U:${QURAN_CONTAINER_ID}:${surah}`;
}

function buildPassageUnitId(surah: number, start: number, end: number) {
  return `${buildSurahUnitId(surah)}:${start}-${end}`;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
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
    const containerId = buildContainerId();
    const containerKey = body.container_key?.trim() || 'quran';
    const surahMeta = await ctx.env.DB
      .prepare(
        `
        SELECT name_ar, name_en, ayah_count
        FROM ar_quran_surahs
        WHERE surah = ?1
        LIMIT 1
      `
      )
      .bind(surah)
      .first<{ name_ar: string | null; name_en: string | null; ayah_count: number | null }>();
    const surahNameAr = surahMeta?.name_ar?.trim() || null;
    const surahNameEn = surahMeta?.name_en?.trim() || null;
    const surahAyahCount =
      typeof surahMeta?.ayah_count === 'number' && Number.isFinite(surahMeta.ayah_count)
        ? Math.trunc(surahMeta.ayah_count)
        : ayahTo;
    const surahUnitId = buildSurahUnitId(surah);
    const surahTitle = (body.title ?? surahNameEn ?? `Surah ${surah}`).toString().trim();
    await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO ar_containers (
          id, container_type, container_key, title, meta_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, json(?5), datetime('now'))
      `
      )
      .bind(containerId, QURAN_CONTAINER_TYPE, containerKey, 'Quran', JSON.stringify({ source: 'lesson-authoring' }))
      .run();

    await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO ar_container_units (
          id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
          start_ref, end_ref, text_cache, meta_json, created_at, surah, surah_ref
        ) VALUES (?1, ?2, NULL, 'surah', ?3, 1, ?4, ?5, ?6, NULL, json(?7), datetime('now'), ?8, ?9)
      `
      )
      .bind(
        surahUnitId,
        containerId,
        surah,
        surahAyahCount,
        `${surah}:1`,
        `${surah}:${surahAyahCount}`,
        JSON.stringify({
          source: 'lesson-authoring',
          title: surahTitle,
          name_ar: surahNameAr,
          name_en: surahNameEn,
          surah,
        }),
        surah,
        `${surah}`
      )
      .run();

    const passageId = buildPassageUnitId(surah, ayahFrom, ayahTo);
    const existingPassage = await ctx.env.DB
      .prepare(`SELECT order_index FROM ar_container_units WHERE id = ?1 LIMIT 1`)
      .bind(passageId)
      .first<{ order_index: number | null }>();
    const passageOrderRow = await ctx.env.DB
      .prepare(
        `
        SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order_index
        FROM ar_container_units
        WHERE container_id = ?1
          AND parent_unit_id = ?2
          AND unit_type = 'passage'
      `
      )
      .bind(containerId, surahUnitId)
      .first<{ next_order_index: number | null }>();
    const passageOrderIndex =
      typeof existingPassage?.order_index === 'number' && Number.isFinite(existingPassage.order_index)
        ? Math.trunc(existingPassage.order_index)
        : Math.max(1, Math.trunc(passageOrderRow?.next_order_index ?? 1));
    await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO ar_container_units (
          id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
          start_ref, end_ref, text_cache, meta_json, created_at, surah, surah_ref
        ) VALUES (?1, ?2, ?3, 'passage', ?4, ?5, ?6, ?7, ?8, ?9, json(?10), datetime('now'), ?11, ?12)
      `
      )
      .bind(
        passageId,
        containerId,
        surahUnitId,
        passageOrderIndex,
        ayahFrom,
        ayahTo,
        `${surah}:${ayahFrom}`,
        `${surah}:${ayahTo}`,
        body.text_cache ?? null,
        JSON.stringify({ source: 'lesson-authoring' }),
        surah,
        `${surah}:${ayahFrom}-${ayahTo}`
      )
      .run();

    const response = {
      ok: true,
      result: {
        container: {
          id: containerId,
          container_type: QURAN_CONTAINER_TYPE,
          container_key: containerKey,
          title: 'Quran',
          meta_json: { source: 'lesson-authoring' },
        },
        units: [
          {
            id: surahUnitId,
            unit_type: 'surah',
            ayah_from: 1,
            ayah_to: surahAyahCount,
            start_ref: `${surah}:1`,
            end_ref: `${surah}:${surahAyahCount}`,
          },
          {
            id: passageId,
            parent_unit_id: surahUnitId,
            unit_type: 'passage',
            ayah_from: ayahFrom,
            ayah_to: ayahTo,
            start_ref: `${surah}:${ayahFrom}`,
            end_ref: `${surah}:${ayahTo}`,
          },
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
