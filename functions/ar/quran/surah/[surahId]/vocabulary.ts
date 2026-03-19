interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }

    // Primary: quran_ayah_lemmas joined with location table
    const { results: lemmas } = await env.DB.prepare(`
      SELECT DISTINCT
        ql.lemma_id, ql.lemma_text, ql.lemma_text_clean,
        qll.surah, qll.ayah, qll.token_index
      FROM quran_ayah_lemmas ql
      JOIN quran_ayah_lemma_location qll ON qll.lemma_id = ql.lemma_id
      WHERE qll.surah = ?
      ORDER BY qll.ayah ASC, qll.token_index ASC
      LIMIT 500
    `).bind(surahId).all().catch(() => ({ results: [] }));

    // Secondary: ar_u_tokens for surface/lemma forms
    const { results: lexicon } = await env.DB.prepare(`
      SELECT DISTINCT
        t.lemma_id, t.surface_form as surface_ar, t.lemma_form as lemma_ar,
        t.pos, t.root as root_norm, t.surah, t.ayah
      FROM ar_u_tokens t
      WHERE t.surah = ?
      ORDER BY t.ayah ASC, t.token_index ASC
      LIMIT 500
    `).bind(surahId).all().catch(() => ({ results: [] }));

    return Response.json({
      ok: true,
      surahId,
      total: (lemmas?.length ?? 0),
      lemmas: lemmas ?? [],
      lexicon: lexicon ?? [],
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
