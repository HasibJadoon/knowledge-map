// All tasks for a passage
// GET /quran/surah/:surahId/study/:passageNo/tasks

interface Env { DB: D1Database }

const QURAN_CONTAINER_ID = 'C:QURAN';

const SQL = `
WITH surah_unit AS (
  SELECT id
  FROM ar_container_units
  WHERE id = ?4
    AND container_id = ?3
    AND unit_type = 'surah'
  LIMIT 1
),
unit_row AS (
  SELECT u.*
  FROM ar_container_units u
  JOIN surah_unit s ON s.id = u.parent_unit_id
  WHERE u.unit_type = 'passage'
    AND u.order_index = ?2
  LIMIT 1
)
SELECT json_group_array(
  json_object(
    'task_id',   t.task_id,
    'parent_task_id', t.parent_task_id,
    'task_type', t.task_type,
    'task_name', t.task_name,
    'step_no',   t.step_no,
    'status',    t.status,
    'task_json', json(COALESCE(t.task_json, 'null'))
  )
) AS tasks_json
FROM unit_row u
LEFT JOIN ar_container_unit_task t
  ON t.unit_id = u.id
 AND t.parent_task_id IS NULL
ORDER BY COALESCE(
  t.step_no,
  CASE t.task_type
    WHEN 'reading'            THEN 100
    WHEN 'morphology'         THEN 200
    WHEN 'sentence_structure' THEN 300
    WHEN 'expressions'        THEN 400
    WHEN 'comprehension'      THEN 500
    WHEN 'passage_structure'  THEN 600
    ELSE 99000
  END
), t.task_id
`;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId   = Number(ctx.params['surahId']);
  const passageNo = Number(ctx.params['passageNo']);
  if (!surahId || !passageNo) {
    return Response.json({ ok: false, error: 'Invalid params' }, { status: 400 });
  }
  try {
    const containerId = QURAN_CONTAINER_ID;
    const surahUnitId = `U:${containerId}:${surahId}`;
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo, containerId, surahUnitId).first<{ tasks_json: string }>();
    if (!row?.tasks_json) {
      return Response.json({ ok: true, surahId, passageNo, tasks: [] });
    }
    const tasks = JSON.parse(row.tasks_json);
    return Response.json({ ok: true, surahId, passageNo, tasks });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
