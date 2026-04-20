interface Env { DB: D1Database; }

const count = (r: unknown[] | undefined) =>
  Number((r?.[0] as Record<string, unknown>)?.['count'] ?? 0);

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }
    const prefix = `${surahId}:`;

    const [{ results: nc }, { results: sc }, { results: ntc }, { results: dc }] =
      await Promise.all([
        env.DB.prepare(`
          SELECT COUNT(DISTINCT wn.id) as count
          FROM wv_nodes wn
          JOIN wv_node_quran_links wql ON wql.node_id = wn.id
          WHERE wql.target_ref LIKE ?
        `).bind(`${prefix}%`).all().catch(() => ({ results: [] })),

        env.DB.prepare(`
          SELECT COUNT(DISTINCT ws.id) as count
          FROM wv_sources ws
          JOIN wv_evidence_links wel ON wel.source_id = ws.id
          JOIN wv_nodes wn ON wn.id = wel.node_id
          JOIN wv_node_quran_links wql ON wql.node_id = wn.id
          WHERE wql.target_ref LIKE ?
        `).bind(`${prefix}%`).all().catch(() => ({ results: [] })),

        env.DB.prepare(`
          SELECT COUNT(DISTINCT wno.id) as count
          FROM wv_notes wno
          JOIN wv_note_relations wnr ON wnr.note_id = wno.id
          JOIN wv_nodes wn ON wn.id = wnr.target_id
          JOIN wv_node_quran_links wql ON wql.node_id = wn.id
          WHERE wql.target_ref LIKE ?
        `).bind(`${prefix}%`).all().catch(() => ({ results: [] })),

        env.DB.prepare(`
          SELECT COUNT(DISTINCT wd.id) as count
          FROM wv_documents wd
          JOIN wv_document_blocks wb ON wb.document_id = wd.id
          JOIN wv_block_node_links wbl ON wbl.block_id = wb.id
          JOIN wv_nodes wn ON wn.id = wbl.node_id
          JOIN wv_node_quran_links wql ON wql.node_id = wn.id
          WHERE wql.target_ref LIKE ?
        `).bind(`${prefix}%`).all().catch(() => ({ results: [] })),
      ]);

    return Response.json({
      ok: true,
      surahId,
      counts: {
        nodes: count(nc),
        sources: count(sc),
        notes: count(ntc),
        documents: count(dc),
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
