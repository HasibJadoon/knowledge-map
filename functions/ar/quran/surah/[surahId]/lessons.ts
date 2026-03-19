interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }
    const prefix = `${surahId}:`;

    const { results: direct } = await env.DB.prepare(`
      SELECT DISTINCT
        l.id, l.title, l.title_ar, l.lesson_type, l.subtype,
        l.status, l.difficulty,
        cu.ayah_from, cu.ayah_to, cu.start_ref, cu.end_ref, cu.unit_type
      FROM ar_lessons l
      LEFT JOIN ar_container_units cu ON cu.id = l.unit_id
      WHERE l.status IN ('published', 'review')
        AND (cu.start_ref LIKE ? OR cu.end_ref LIKE ?)
      ORDER BY cu.ayah_from ASC, l.title ASC
      LIMIT 100
    `).bind(`${prefix}%`, `${prefix}%`).all().catch(() => ({ results: [] }));

    const { results: linked } = await env.DB.prepare(`
      SELECT DISTINCT
        l.id, l.title, l.title_ar, l.lesson_type, l.subtype,
        l.status, l.difficulty,
        cu.ayah_from, cu.ayah_to, cu.start_ref, cu.end_ref, cu.unit_type
      FROM ar_lessons l
      JOIN ar_lesson_unit_link lul ON lul.lesson_id = l.id
      LEFT JOIN ar_container_units cu ON cu.id = lul.unit_id
      WHERE l.status IN ('published', 'review')
        AND (cu.start_ref LIKE ? OR cu.end_ref LIKE ?)
      ORDER BY cu.ayah_from ASC, l.title ASC
      LIMIT 100
    `).bind(`${prefix}%`, `${prefix}%`).all().catch(() => ({ results: [] }));

    const seen = new Set<string>();
    const lessons: unknown[] = [];
    for (const r of [...(direct ?? []), ...(linked ?? [])]) {
      const row = r as Record<string, unknown>;
      if (!seen.has(String(row['id']))) {
        seen.add(String(row['id']));
        lessons.push(row);
      }
    }

    return Response.json({ ok: true, surahId, total: lessons.length, lessons });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
