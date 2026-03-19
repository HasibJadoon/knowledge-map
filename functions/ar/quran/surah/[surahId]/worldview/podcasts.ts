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
        wci.id, wci.title, wci.content_type, wci.status,
        wci.related_type, wci.related_id, wci.content_json
      FROM wv_content_items wci
      JOIN wv_node_content_links wncl ON wncl.content_id = wci.id
      JOIN wv_nodes wn ON wn.id = wncl.node_id
      JOIN wv_node_quran_links wql ON wql.node_id = wn.id
      WHERE wql.target_ref LIKE ?
      ORDER BY wci.title ASC
      LIMIT 100
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, items: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
