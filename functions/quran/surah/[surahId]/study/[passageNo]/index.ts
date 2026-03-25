// Layer 2 — Full passage lesson
// GET /quran/surah/:surahId/study/:passageNo
// Returns unit + ayahs + vocabulary (nouns/verbs with morphology) + expressions + tasks.

interface Env { DB: D1Database }

const QURAN_CONTAINER_ID = 'C:QURAN';

const SQL = `
WITH surah_unit AS (
  SELECT *
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
  'lessonId', (
    SELECT l.id
    FROM ar_lessons l
    JOIN unit_row u ON u.id = l.unit_id
    WHERE l.lesson_type = 'quran'
    ORDER BY l.id DESC
    LIMIT 1
  ),
  'unit', (
    SELECT json_object(
      'unit_id',    u.id,
      'order_index',u.order_index,
      'ayah_from',  u.ayah_from,
      'ayah_to',    u.ayah_to,
      'start_ref',  u.start_ref,
      'end_ref',    u.end_ref,
      'text_cache', u.text_cache,
      'label',  json_extract(u.meta_json, '$.label'),
      'theme',  json_extract(u.meta_json, '$.theme')
    )
    FROM unit_row u
  ),
  'ayahs', (
    SELECT json_group_array(
      json_object(
        'ayah',               a.ayah,
        'text',               a.text,
        'text_simple',        a.text_simple,
        'translation_haleem', tr.translation_haleem,
        'translation_asad',   tr.translation_asad,
        'translation_sahih',  tr.translation_sahih
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
  'vocabulary', json_object(
    'nouns', (
      SELECT json_group_array(
        json_object(
          'word_id',    qw.word_id,
          'ayah',       qw.ayah,
          'position',   qw.position,
          'word',       qw.text,
          'simple',     qw.simple,
          'translation',qw.translation,
          'lemma',      qw.lemma,
          'root',       qw.root,
          'gloss',      lx.gloss_primary,
          'meanings',   lx.meanings_json,
          'verb_form',  m.verb_form,
          'pattern',    m.derived_pattern
        )
      )
      FROM unit_row u
      JOIN ar_u_quran_ayah_words qw
        ON qw.surah = ?1
       AND qw.ayah BETWEEN u.ayah_from AND u.ayah_to
      LEFT JOIN ar_u_tokens tok
        ON tok.lemma_norm = lower(trim(coalesce(qw.lemma, qw.simple, qw.text)))
      LEFT JOIN ar_u_lexicon lx ON lx.lemma_norm = tok.lemma_norm
      LEFT JOIN ar_u_lexicon_morphology lm ON lm.ar_u_lexicon = lx.ar_u_lexicon
      LEFT JOIN ar_u_morphology m ON m.ar_u_morphology = lm.ar_u_morphology
      WHERE lower(ifnull(qw.class_name, '')) LIKE '%noun%'
      ORDER BY qw.ayah, qw.position
    ),
    'verbs', (
      SELECT json_group_array(
        json_object(
          'word_id',     qw.word_id,
          'ayah',        qw.ayah,
          'position',    qw.position,
          'word',        qw.text,
          'simple',      qw.simple,
          'translation', qw.translation,
          'lemma',       qw.lemma,
          'root',        qw.root,
          'gloss',       lx.gloss_primary,
          'meanings',    lx.meanings_json,
          'verb_form',   m.verb_form,
          'pattern',     m.derived_pattern,
          'transitivity',m.transitivity
        )
      )
      FROM unit_row u
      JOIN ar_u_quran_ayah_words qw
        ON qw.surah = ?1
       AND qw.ayah BETWEEN u.ayah_from AND u.ayah_to
      LEFT JOIN ar_u_tokens tok
        ON tok.lemma_norm = lower(trim(coalesce(qw.lemma, qw.simple, qw.text)))
      LEFT JOIN ar_u_lexicon lx ON lx.lemma_norm = tok.lemma_norm
      LEFT JOIN ar_u_lexicon_morphology lm ON lm.ar_u_lexicon = lx.ar_u_lexicon
      LEFT JOIN ar_u_morphology m ON m.ar_u_morphology = lm.ar_u_morphology
      WHERE lower(ifnull(qw.class_name, '')) LIKE '%verb%'
      ORDER BY qw.ayah, qw.position
    )
  ),
  'expressions', (
    SELECT json_group_array(
      json_object(
        'expression_id', expr.ar_u_expression,
        'ayah',          expr.ayah,
        'label',         expr.label,
        'text',          expr.text_ar,
        'meaning',       lx.expression_meaning,
        'gloss',         lx.gloss_primary
      )
    )
    FROM unit_row u
    JOIN ar_u_expressions expr
      ON expr.surah = ?1
     AND expr.ayah BETWEEN u.ayah_from AND u.ayah_to
    LEFT JOIN ar_u_lexicon lx ON lx.ar_u_lexicon = expr.ar_u_lexicon
    ORDER BY expr.ayah
  ),
  'tasks', (
    SELECT json_group_array(
      json_object(
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
    )
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
  )
) AS lesson_json
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
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo, containerId, surahUnitId).first<{ lesson_json: string }>();
    if (!row?.lesson_json) {
      return Response.json({ ok: false, error: 'Passage not found' }, { status: 404 });
    }
    const data = JSON.parse(row.lesson_json);
    return Response.json({ ok: true, surahId, passageNo, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
