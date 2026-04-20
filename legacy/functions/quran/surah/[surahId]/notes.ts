interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }
    const prefix = `${surahId}:`;

    const { results: captureNotes } = await env.DB.prepare(`
      SELECT DISTINCT
        n.id, n.title, n.body_md, n.status, n.created_at,
        nl.target_type, nl.ref, 'capture' as note_source
      FROM ar_capture_notes n
      JOIN note_links nl ON nl.note_id = n.id
      WHERE nl.target_type = 'quran_ayah'
        AND nl.ref LIKE ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    const { results: legacyNotes } = await env.DB.prepare(`
      SELECT DISTINCT
        n.id, n.title, '' as body_md, n.note_type as status, n.created_at,
        nt.target_type, nt.ref, 'legacy' as note_source
      FROM ar_notes n
      JOIN ar_note_targets nt ON nt.note_id = n.id
      WHERE nt.ref LIKE ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).bind(`${prefix}%`).all().catch(() => ({ results: [] }));

    const seen = new Set<string>();
    const notes: unknown[] = [];
    for (const r of [...(captureNotes ?? []), ...(legacyNotes ?? [])]) {
      const row = r as Record<string, unknown>;
      const key = `${row['note_source']}-${row['id']}`;
      if (!seen.has(key)) { seen.add(key); notes.push(row); }
    }

    return Response.json({ ok: true, surahId, total: notes.length, notes });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
