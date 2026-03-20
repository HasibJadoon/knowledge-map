// Layer 2 — Full unit (lesson) view
// Returns unit meta, ayah text + translations, tasks, and vocabulary (nouns/verbs).
// Route: GET /quran/lesson/:unitId
// Example: GET /quran/lesson/U:C:QURAN:12:001-007

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const unitId = String(params['unitId'] ?? '').trim();
    if (!unitId) {
      return Response.json({ ok: false, error: 'Missing unitId' }, { status: 400 });
    }

    // Extract surah from unitId pattern U:C:QURAN:{surah}:...
    const surahMatch = unitId.match(/^U:C:QURAN:(\d+):/);
    const surah = surahMatch ? Number(surahMatch[1]) : 0;

    // ── 1. Unit meta ─────────────────────────────────────────────────────────
    const { results: unitRows } = await env.DB.prepare(`
      SELECT
        u.id AS unit_id,
        u.container_id,
        u.unit_type,
        u.order_index,
        u.ayah_from,
        u.ayah_to,
        u.start_ref,
        u.end_ref,
        u.text_cache,
        u.meta_json AS unit_meta_json
      FROM ar_container_units u
      WHERE u.id = ?
      LIMIT 1
    `).bind(unitId).all().catch(() => ({ results: [] }));

    if (!unitRows?.length) {
      return Response.json({ ok: false, error: 'Unit not found' }, { status: 404 });
    }

    const unit = unitRows[0] as Record<string, unknown>;
    const ayahFrom = Number(unit['ayah_from']);
    const ayahTo   = Number(unit['ayah_to']);

    // ── 2. Tasks (reading, sentence_structure, expressions, passage_structure)
    const { results: taskRows } = await env.DB.prepare(`
      SELECT
        t.task_id,
        t.task_type,
        t.task_name,
        t.status,
        t.task_json
      FROM ar_container_unit_task t
      WHERE t.unit_id = ?
      ORDER BY
        CASE t.task_type
          WHEN 'reading'            THEN 1
          WHEN 'morphology'         THEN 2
          WHEN 'sentence_structure' THEN 3
          WHEN 'expressions'        THEN 4
          WHEN 'passage_structure'  THEN 5
          ELSE 99
        END
    `).bind(unitId).all().catch(() => ({ results: [] }));

    // ── 3. Ayah text + translations ──────────────────────────────────────────
    const { results: ayahRows } = await env.DB.prepare(`
      SELECT
        a.surah,
        a.ayah,
        a.surah_ayah,
        a.page,
        a.juz,
        a.text,
        a.text_simple,
        tr.translation_haleem,
        tr.translation_asad,
        tr.translation_sahih
      FROM ar_quran_ayah a
      LEFT JOIN ar_quran_translations tr
        ON tr.surah = a.surah
       AND tr.ayah  = a.ayah
      WHERE a.surah = ?
        AND a.ayah BETWEEN ? AND ?
      ORDER BY a.ayah
    `).bind(surah, ayahFrom, ayahTo).all().catch(() => ({ results: [] }));

    // ── 4. Vocabulary — nouns ────────────────────────────────────────────────
    const { results: nounRows } = await env.DB.prepare(`
      SELECT
        qw.word_id,
        qw.ayah,
        qw.position,
        qw.text,
        qw.simple,
        qw.lemma,
        qw.root,
        qw.class_name
      FROM ar_u_quran_ayah_words qw
      WHERE qw.surah = ?
        AND qw.ayah BETWEEN ? AND ?
        AND lower(qw.class_name) LIKE '%noun%'
      ORDER BY qw.ayah, qw.position
    `).bind(surah, ayahFrom, ayahTo).all().catch(() => ({ results: [] }));

    // ── 5. Vocabulary — verbs ────────────────────────────────────────────────
    const { results: verbRows } = await env.DB.prepare(`
      SELECT
        qw.word_id,
        qw.ayah,
        qw.position,
        qw.text,
        qw.simple,
        qw.lemma,
        qw.root,
        qw.class_name
      FROM ar_u_quran_ayah_words qw
      WHERE qw.surah = ?
        AND qw.ayah BETWEEN ? AND ?
        AND lower(qw.class_name) LIKE '%verb%'
      ORDER BY qw.ayah, qw.position
    `).bind(surah, ayahFrom, ayahTo).all().catch(() => ({ results: [] }));

    return Response.json({
      ok: true,
      unit: {
        unit_id:      unit['unit_id'],
        container_id: unit['container_id'],
        unit_type:    unit['unit_type'],
        order_index:  unit['order_index'],
        ayah_from:    ayahFrom,
        ayah_to:      ayahTo,
        start_ref:    unit['start_ref'],
        end_ref:      unit['end_ref'],
        text_cache:   unit['text_cache'],
        meta_json:    unit['unit_meta_json'],
      },
      ayahs:      ayahRows  ?? [],
      tasks:      taskRows  ?? [],
      vocabulary: {
        nouns: nounRows ?? [],
        verbs: verbRows ?? [],
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
