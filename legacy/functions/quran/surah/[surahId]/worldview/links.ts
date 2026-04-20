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
        we.id, we.relation_type, we.note,
        fn.id as from_id, fn.title as from_title, fn.node_type as from_type,
        tn.id as to_id, tn.title as to_title, tn.node_type as to_type
      FROM wv_node_edges we
      JOIN wv_nodes fn ON fn.id = we.from_node_id
      JOIN wv_nodes tn ON tn.id = we.to_node_id
      LEFT JOIN wv_node_quran_links wql_f ON wql_f.node_id = fn.id
      LEFT JOIN wv_node_quran_links wql_t ON wql_t.node_id = tn.id
      WHERE (wql_f.target_ref LIKE ? OR wql_t.target_ref LIKE ?)
      ORDER BY we.relation_type ASC
      LIMIT 100
    `).bind(`${prefix}%`, `${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, links: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
