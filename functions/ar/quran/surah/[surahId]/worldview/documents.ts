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
        wd.id, wd.title, wd.doc_type, wd.summary, wd.status,
        COUNT(DISTINCT wb.id) as block_count,
        COUNT(DISTINCT wbl.node_id) as node_count
      FROM wv_documents wd
      JOIN wv_document_blocks wb ON wb.document_id = wd.id
      JOIN wv_block_node_links wbl ON wbl.block_id = wb.id
      JOIN wv_nodes wn ON wn.id = wbl.node_id
      JOIN wv_node_quran_links wql ON wql.node_id = wn.id
      WHERE wql.target_ref LIKE ?
      GROUP BY wd.id
      ORDER BY wd.title ASC
      LIMIT 100
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    return Response.json({ ok: true, surahId, total: results?.length ?? 0, documents: results ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
