interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }
    const prefix = `${surahId}:`;

    const { results } = await env.DB.prepare(`
      SELECT DISTINCT
        wno.id, wno.title, wno.note_kind, wno.excerpt_text,
        wno.locator, wno.body_md, wno.status, wno.created_at,
        ws.title as source_title, ws.source_type
      FROM wv_notes wno
      JOIN wv_note_relations wnr ON wnr.note_id = wno.id
      JOIN wv_nodes wn ON wn.id = wnr.target_id
      JOIN wv_node_quran_links wql ON wql.node_id = wn.id
      LEFT JOIN wv_sources ws ON ws.id = wno.source_id
      WHERE wql.target_ref LIKE ?
      ORDER BY wno.created_at DESC
      LIMIT 100
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, notes: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
