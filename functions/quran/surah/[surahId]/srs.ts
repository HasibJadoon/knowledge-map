import { resolveSrsTable } from '../../../_utils/srs';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { params, env } = ctx;
  try {
    const surahId = Number(params['surahId']);
    if (!surahId || surahId < 1 || surahId > 114) {
      return Response.json({ ok: false, error: 'Invalid surah' }, { status: 400 });
    }

    const url = new URL(ctx.request.url);
    const filter = url.searchParams.get('filter') ?? 'due';
    const now = new Date().toISOString();
    const prefix = `${surahId}:`;
    const srsTable = await resolveSrsTable(env.DB);

    let where = `item_key LIKE ?`;
    const binds: unknown[] = [`${prefix}%`];

    if (filter === 'due') {
      where += ` AND status = 'active' AND due_at <= ?`;
      binds.push(now);
    } else if (filter === 'upcoming') {
      where += ` AND status = 'active' AND due_at > ?`;
      binds.push(now);
    } else if (filter === 'suspended') {
      where += ` AND status = 'suspended'`;
    }

    const { results } = await env.DB.prepare(`
      SELECT id, item_type, item_key, card_json, status, due_at,
             last_review_at, interval_days, ease, reps, lapses, last_rating
      FROM ${srsTable}
      WHERE ${where}
      ORDER BY due_at ASC
      LIMIT 100
    `).bind(...binds).all().catch(() => ({ results: [] }));

    return Response.json({
      ok: true, surahId, filter,
      total: results?.length ?? 0,
      items: results ?? [],
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
