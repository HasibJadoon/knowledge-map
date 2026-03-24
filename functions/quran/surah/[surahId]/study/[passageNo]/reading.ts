// Reading tab only
// GET /quran/surah/:surahId/study/:passageNo/reading

interface Env { DB: D1Database }

const SQL = `
WITH surah_container AS (
  SELECT id
  FROM ar_containers
  WHERE container_type = 'quran_surah'
    AND CAST(json_extract(meta_json, '$.surah') AS INTEGER) = ?1
  LIMIT 1
),
unit_row AS (
  SELECT u.*
  FROM ar_container_units u
  JOIN surah_container c ON c.id = u.container_id
  WHERE u.order_index = ?2
  LIMIT 1
)
SELECT json_object(
  'unit', (
    SELECT json_object(
      'unit_id',    id,
      'order_index',order_index,
      'ayah_from',  ayah_from,
      'ayah_to',    ayah_to,
      'label',      json_extract(meta_json, '$.label')
    )
    FROM unit_row
  ),
  'ayahs', (
    SELECT json_group_array(
      json_object(
        'ayah',               a.ayah,
        'text',               a.text,
        'text_simple',        a.text_simple,
        'translation_haleem', tr.translation_haleem
      )
    )
    FROM unit_row u
    JOIN ar_quran_ayah a
      ON a.surah = ?1
     AND a.ayah BETWEEN u.ayah_from AND u.ayah_to
    LEFT JOIN ar_quran_translations tr
      ON tr.surah = a.surah AND tr.ayah = a.ayah
    ORDER BY a.ayah
  ),
  'task', (
    SELECT json_object(
      'task_id',   t.task_id,
      'task_type', t.task_type,
      'task_name', t.task_name,
      'status',    t.status,
      'task_json', t.task_json
    )
    FROM unit_row u
    LEFT JOIN ar_container_unit_task t
      ON t.unit_id = u.id
     AND t.parent_task_id IS NULL
    WHERE t.task_type = 'reading'
    LIMIT 1
  )
) AS reading_json
`;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId   = Number(ctx.params['surahId']);
  const passageNo = Number(ctx.params['passageNo']);
  if (!surahId || !passageNo) {
    return Response.json({ ok: false, error: 'Invalid params' }, { status: 400 });
  }
  try {
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo).first<{ reading_json: string }>();
    if (!row?.reading_json) {
      return Response.json({ ok: false, error: 'Passage not found' }, { status: 404 });
    }
    const data = JSON.parse(row.reading_json);
    return Response.json({ ok: true, surahId, passageNo, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
