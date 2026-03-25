// Passage structure tab only
// GET /quran/surah/:surahId/study/:passageNo/passage-structure

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
  'task', (
    SELECT json_object(
      'task_id',   t.task_id,
      'task_type', t.task_type,
      'task_name', t.task_name,
      'step_no',   t.step_no,
      'status',    t.status,
      'task_json', t.task_json,
      'children', json(COALESCE((
        SELECT json_group_array(
          json_object(
            'task_id',        child.task_id,
            'unit_id',        child.unit_id,
            'parent_task_id', child.parent_task_id,
            'task_type',      child.task_type,
            'task_name',      child.task_name,
            'step_no',        child.step_no,
            'status',         child.status,
            'task_json',      child.task_json,
            'updated_at',     child.updated_at
          )
        )
        FROM (
          SELECT c.task_id, c.unit_id, c.parent_task_id, c.task_type, c.task_name, c.step_no, c.status, c.task_json, c.updated_at
          FROM ar_container_unit_task c
          WHERE c.parent_task_id = t.task_id
          ORDER BY COALESCE(c.step_no, 99999), c.task_id
        ) child
      ), '[]'))
    )
    FROM unit_row u
    LEFT JOIN ar_container_unit_task t
      ON t.unit_id = u.id
     AND t.parent_task_id IS NULL
    WHERE t.task_type = 'passage_structure'
    LIMIT 1
  )
) AS passage_structure_json
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
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo, containerId, surahUnitId).first<{ passage_structure_json: string }>();
    if (!row?.passage_structure_json) {
      return Response.json({ ok: false, error: 'Passage not found' }, { status: 404 });
    }
    const data = JSON.parse(row.passage_structure_json);
    return Response.json({ ok: true, surahId, passageNo, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
