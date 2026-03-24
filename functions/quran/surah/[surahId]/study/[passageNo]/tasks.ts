// All tasks for a passage
// GET /quran/surah/:surahId/study/:passageNo/tasks

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
SELECT json_group_array(
  json_object(
    'task_id',   t.task_id,
    'task_type', t.task_type,
    'task_name', t.task_name,
    'status',    t.status,
    'task_json', t.task_json
  )
) AS tasks_json
FROM unit_row u
LEFT JOIN ar_container_unit_task t
  ON t.unit_id = u.id
 AND t.parent_task_id IS NULL
ORDER BY CASE t.task_type
  WHEN 'reading'            THEN 1
  WHEN 'sentence_structure' THEN 2
  WHEN 'expressions'        THEN 3
  WHEN 'passage_structure'  THEN 4
  ELSE 99
END
`;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId   = Number(ctx.params['surahId']);
  const passageNo = Number(ctx.params['passageNo']);
  if (!surahId || !passageNo) {
    return Response.json({ ok: false, error: 'Invalid params' }, { status: 400 });
  }
  try {
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo).first<{ tasks_json: string }>();
    if (!row?.tasks_json) {
      return Response.json({ ok: true, surahId, passageNo, tasks: [] });
    }
    const tasks = JSON.parse(row.tasks_json);
    return Response.json({ ok: true, surahId, passageNo, tasks });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
