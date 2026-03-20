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
        ws.id, ws.title, ws.source_type, ws.creator, ws.publication_year,
        ws.description, ws.status, ws.source_url,
        COUNT(DISTINCT wsu.id) as unit_count,
        COUNT(DISTINCT wel2.node_id) as node_count
      FROM wv_sources ws
      JOIN wv_evidence_links wel ON wel.source_id = ws.id
      JOIN wv_nodes wn ON wn.id = wel.node_id
      JOIN wv_node_quran_links wql ON wql.node_id = wn.id
      LEFT JOIN wv_source_units wsu ON wsu.source_id = ws.id
      LEFT JOIN wv_evidence_links wel2 ON wel2.source_id = ws.id
      WHERE wql.target_ref LIKE ?
      GROUP BY ws.id
      ORDER BY ws.title ASC
      LIMIT 100
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, sources: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
