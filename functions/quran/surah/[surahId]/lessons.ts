// Layer 1 — Surah lesson grid
// Returns one row per ar_container_unit for the surah with task presence/counts
// and vocabulary word counts (nouns, verbs) from ar_u_quran_ayah_words.

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }

    const containerId = `C:QURAN:${surahId}`;

    const { results } = await env.DB.prepare(`
      SELECT
        u.id                                                              AS unit_id,
        u.container_id,
        u.order_index,
        u.ayah_from,
        u.ayah_to,
        u.start_ref,
        u.end_ref,
        u.text_cache,
        json_extract(u.meta_json, '$.label')                             AS unit_label,
        json_extract(u.meta_json, '$.theme')                             AS unit_theme,

        MAX(CASE WHEN t.task_type = 'reading'            THEN 1 ELSE 0 END) AS has_reading,
        MAX(CASE WHEN t.task_type = 'sentence_structure' THEN 1 ELSE 0 END) AS has_sentence_structure,
        MAX(CASE WHEN t.task_type = 'expressions'        THEN 1 ELSE 0 END) AS has_expressions,
        MAX(CASE WHEN t.task_type = 'passage_structure'  THEN 1 ELSE 0 END) AS has_passage_structure,

        SUM(CASE WHEN t.task_type = 'reading'            THEN 1 ELSE 0 END) AS reading_task_count,
        SUM(CASE WHEN t.task_type = 'sentence_structure' THEN 1 ELSE 0 END) AS sentence_structure_task_count,
        SUM(CASE WHEN t.task_type = 'expressions'        THEN 1 ELSE 0 END) AS expressions_task_count,
        SUM(CASE WHEN t.task_type = 'passage_structure'  THEN 1 ELSE 0 END) AS passage_structure_task_count,

        COUNT(DISTINCT qw.word_id)                                                                   AS total_words,
        COUNT(DISTINCT CASE WHEN lower(qw.class_name) LIKE '%noun%' THEN qw.word_id END)             AS noun_count,
        COUNT(DISTINCT CASE WHEN lower(qw.class_name) LIKE '%verb%' THEN qw.word_id END)             AS verb_count

      FROM ar_container_units u
      LEFT JOIN ar_container_unit_task t
        ON t.unit_id = u.id
      LEFT JOIN ar_u_quran_ayah_words qw
        ON qw.surah = ?
       AND qw.ayah BETWEEN u.ayah_from AND u.ayah_to
      WHERE u.container_id = ?
      GROUP BY
        u.id, u.container_id, u.order_index,
        u.ayah_from, u.ayah_to, u.start_ref, u.end_ref,
        u.text_cache, u.meta_json
      ORDER BY u.order_index
    `).bind(surahId, containerId).all().catch(() => ({ results: [] }));

    // Shape each row into the UI structure
    const units = (results ?? []).map((r: Record<string, unknown>) => ({
      unit_id:    r['unit_id'],
      container_id: r['container_id'],
      order_index:  r['order_index'],
      ayah_from:    r['ayah_from'],
      ayah_to:      r['ayah_to'],
      start_ref:    r['start_ref'],
      end_ref:      r['end_ref'],
      text_cache:   r['text_cache'],
      unit_label:   r['unit_label'],
      unit_theme:   r['unit_theme'],
      reading:            { has: !!r['has_reading'],            count: r['reading_task_count'] ?? 0 },
      vocabulary:         { nouns: r['noun_count'] ?? 0,        verbs: r['verb_count'] ?? 0, total_words: r['total_words'] ?? 0 },
      sentence_structure: { has: !!r['has_sentence_structure'], count: r['sentence_structure_task_count'] ?? 0 },
      expressions:        { has: !!r['has_expressions'],        count: r['expressions_task_count'] ?? 0 },
      passage_structure:  { has: !!r['has_passage_structure'],  count: r['passage_structure_task_count'] ?? 0 },
    }));

    return Response.json({ ok: true, surahId, containerId, total: units.length, units });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
