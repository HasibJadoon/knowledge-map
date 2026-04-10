// Layer 1 — Study grid for a surah
// GET /quran/surah/:surahId/study
// Returns surah meta + all passage cards with vocab counts and section flags.

interface Env { DB: D1Database }

const QURAN_CONTAINER_ID = 'C:QURAN';

const SQL = `
WITH quran_container AS (
  SELECT *
  FROM ar_containers
  WHERE id = ?2
  LIMIT 1
),
surah_unit AS (
  SELECT *
  FROM ar_container_units
  WHERE id = ?3
    AND container_id = ?2
    AND unit_type = 'surah'
  LIMIT 1
),
unit_rows AS (
  SELECT
    u.id AS unit_id,
    u.container_id,
    u.order_index,
    u.ayah_from,
    u.ayah_to,
    u.start_ref,
    u.end_ref,
    u.text_cache,
    json_extract(u.meta_json, '$.label') AS label,
    json_extract(u.meta_json, '$.theme') AS theme,
    MAX(CASE WHEN t.task_type = 'reading' THEN 1 ELSE 0 END)            AS has_reading,
    MAX(CASE WHEN t.task_type = 'sentence_structure' THEN 1 ELSE 0 END) AS has_sentence_structure,
    MAX(CASE WHEN t.task_type = 'expressions' THEN 1 ELSE 0 END)        AS has_expressions,
    MAX(CASE WHEN t.task_type = 'passage_structure' THEN 1 ELSE 0 END)  AS has_passage_structure,
    COUNT(DISTINCT CASE
      WHEN lower(ifnull(qw.class_name, '')) LIKE '%noun%' THEN qw.word_id
    END) AS noun_count,
    COUNT(DISTINCT CASE
      WHEN lower(ifnull(qw.class_name, '')) LIKE '%verb%' THEN qw.word_id
    END) AS verb_count,
    COUNT(DISTINCT qw.word_id) AS total_word_count
  FROM surah_unit s
  JOIN ar_container_units u
    ON u.parent_unit_id = s.id
   AND u.unit_type = 'passage'
  LEFT JOIN ar_container_unit_task t
    ON t.unit_id = u.id
   AND t.parent_task_id IS NULL
  LEFT JOIN ar_quran_word_occurrences qw
    ON qw.surah = ?1
   AND qw.ayah BETWEEN u.ayah_from AND u.ayah_to
  GROUP BY
    u.id,
    u.container_id,
    u.order_index,
    u.ayah_from,
    u.ayah_to,
    u.start_ref,
    u.end_ref,
    u.text_cache,
    u.meta_json
)
SELECT json_object(
  'surah', (
    SELECT json_object(
      'container_id', c.id,
      'container_key', c.container_key,
      'surah_unit_id', s.id,
      'title', COALESCE(json_extract(s.meta_json, '$.title'), 'Surah ' || s.surah),
      'surah', s.surah,
      'name_ar', json_extract(s.meta_json, '$.name_ar'),
      'name_en', json_extract(s.meta_json, '$.name_en'),
      'meta_json', s.meta_json
    )
    FROM quran_container c
    JOIN surah_unit s ON 1 = 1
  ),
  'units', (
    SELECT COALESCE(
      json_group_array(
        json_object(
          'unit_id', unit_id,
          'order_index', order_index,
          'ayah_from', ayah_from,
          'ayah_to', ayah_to,
          'start_ref', start_ref,
          'end_ref', end_ref,
          'text_cache', text_cache,
          'label', COALESCE(label, 'Passage ' || order_index),
          'theme', theme,
          'reading', json_object('has', has_reading),
          'vocabulary', json_object(
            'nouns', noun_count,
            'verbs', verb_count,
            'total', total_word_count
          ),
          'sentence_structure', json_object('has', has_sentence_structure),
          'expressions', json_object('has', has_expressions),
          'passage_structure', json_object('has', has_passage_structure)
        )
      ),
      json('[]')
    )
    FROM unit_rows
  )
) AS study_grid_json
`;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId = Number(ctx.params['surahId']);
  if (!surahId || surahId < 1 || surahId > 114) {
    return Response.json({ ok: false, error: 'Invalid surahId' }, { status: 400 });
  }
  try {
    const containerId = QURAN_CONTAINER_ID;
    const surahUnitId = `U:${containerId}:${surahId}`;
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, containerId, surahUnitId).first<{ study_grid_json: string }>();
    if (!row?.study_grid_json) {
      return Response.json({ ok: false, error: 'Surah not found' }, { status: 404 });
    }
    const data = JSON.parse(row.study_grid_json);
    return Response.json({ ok: true, surahId, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
