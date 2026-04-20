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
        t.unit_id,
        t.task_type,
        t.task_name,
        t.step_no,
        t.status,
        t.task_json,
        t.updated_at
      FROM ar_container_unit_task t
      WHERE t.unit_id = ?
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
    `).bind(unitId).all().catch(() => ({ results: [] }));

    const { results: childTaskRows } = await env.DB.prepare(`
      SELECT
        t.task_id,
        t.unit_id,
        t.parent_task_id,
        t.task_type,
        t.task_name,
        t.step_no,
        t.status,
        t.task_json,
        t.updated_at
      FROM ar_container_unit_task t
      WHERE t.unit_id = ?
        AND t.parent_task_id IS NOT NULL
      ORDER BY t.parent_task_id, COALESCE(t.step_no, 99999), t.task_id
    `).bind(unitId).all().catch(() => ({ results: [] }));

    const childrenByParent = new Map<string, Record<string, unknown>[]>();
    for (const raw of childTaskRows ?? []) {
      const row = raw as Record<string, unknown>;
      const parentTaskId = String(row['parent_task_id'] ?? '').trim();
      if (!parentTaskId) continue;
      const group = childrenByParent.get(parentTaskId) ?? [];
      group.push({
        task_id: row['task_id'],
        unit_id: row['unit_id'],
        parent_task_id: row['parent_task_id'],
        task_type: row['task_type'],
        task_name: row['task_name'],
        step_no: row['step_no'],
        status: row['status'],
        task_json: row['task_json'],
        updated_at: row['updated_at'],
      });
      childrenByParent.set(parentTaskId, group);
    }

    const tasks = (taskRows ?? []).map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        task_id: row['task_id'],
        unit_id: row['unit_id'],
        task_type: row['task_type'],
        task_name: row['task_name'],
        step_no: row['step_no'],
        status: row['status'],
        task_json: row['task_json'],
        updated_at: row['updated_at'],
        children: childrenByParent.get(String(row['task_id'] ?? '')) ?? [],
      };
    });

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
      FROM ar_quran_word_occurrences qw
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
      FROM ar_quran_word_occurrences qw
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
      tasks,
      vocabulary: {
        nouns: nounRows ?? [],
        verbs: verbRows ?? [],
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
