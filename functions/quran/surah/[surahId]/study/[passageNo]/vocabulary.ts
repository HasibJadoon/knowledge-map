// Vocabulary tab only
// GET /quran/surah/:surahId/study/:passageNo/vocabulary

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
        'morphology', json_object(
          'verb_form',       m.verb_form,
          'derived_pattern', m.derived_pattern,
          'noun_number',     m.noun_number
        )
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
        'morphology', json_object(
          'verb_form',       m.verb_form,
          'derived_pattern', m.derived_pattern,
          'transitivity',    m.transitivity
        )
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
) AS vocabulary_json
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
    const row = await ctx.env.DB.prepare(SQL).bind(surahId, passageNo, containerId, surahUnitId).first<{ vocabulary_json: string }>();
    if (!row?.vocabulary_json) {
      return Response.json({ ok: false, error: 'Passage not found' }, { status: 404 });
    }
    const data = JSON.parse(row.vocabulary_json);
    return Response.json({ ok: true, surahId, passageNo, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
