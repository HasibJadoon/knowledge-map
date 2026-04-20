import { resolveSrsTable } from '../../../_utils/srs';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }
    const prefix = `${surahId}:`;
    const srsTable = await resolveSrsTable(env.DB);

    // SRS items keyed to this surah
    const { results: srsItems } = await env.DB.prepare(`
      SELECT id, item_type, item_key, status, due_at, last_review_at,
             interval_days, ease, reps, lapses, last_rating
      FROM ${srsTable}
      WHERE item_key LIKE ?
      ORDER BY due_at ASC
      LIMIT 50
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    // Lesson progress for this surah
    const { results: progress } = await env.DB.prepare(`
      SELECT lup.lesson_id as id, lup.status, lup.score, lup.completed_at,
             l.title, l.title_ar, l.lesson_type
      FROM ar_lesson_unit_progress lup
      JOIN ar_lessons l ON l.id = lup.lesson_id
      LEFT JOIN ar_container_units cu ON cu.id = lup.unit_id
      WHERE cu.start_ref LIKE ? OR cu.end_ref LIKE ?
      ORDER BY lup.completed_at DESC
      LIMIT 30
    `).bind(`${prefix}%`, `${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({
      ok: true,
      surahId,
      srsItems: srsItems ?? [],
      lessonProgress: progress ?? [],
      total: (srsItems?.length ?? 0) + (progress?.length ?? 0),
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
