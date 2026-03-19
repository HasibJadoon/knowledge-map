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
      SELECT
        wn.id, wn.title, wn.node_type, wn.text_plain, wn.summary, wn.slug, wn.status,
        COUNT(DISTINCT we.id) as edge_count,
        COUNT(DISTINCT wel.id) as evidence_count,
        COUNT(DISTINCT wql2.id) as quran_link_count
      FROM wv_nodes wn
      JOIN wv_node_quran_links wql ON wql.node_id = wn.id
      LEFT JOIN wv_node_edges we ON (we.from_node_id = wn.id OR we.to_node_id = wn.id)
      LEFT JOIN wv_evidence_links wel ON wel.node_id = wn.id
      LEFT JOIN wv_node_quran_links wql2 ON wql2.node_id = wn.id
      WHERE wql.target_ref LIKE ?
      GROUP BY wn.id
      ORDER BY wn.title ASC
      LIMIT 100
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, nodes: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
