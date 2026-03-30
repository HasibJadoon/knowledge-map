import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const h = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT 1 AS ok
      FROM sqlite_master
      WHERE type = 'table' AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<{ ok: number }>();

  return !!row?.ok;
}

// GET /worldview/sources — list all sources
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const db = ctx.env.DB;
    const url    = new URL(ctx.request.url);
    const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')  ?? 100)));
    const offset = Math.max(0,               Number(url.searchParams.get('offset') ?? 0));
    const type   = (url.searchParams.get('type') ?? '').trim();
    const domain = (url.searchParams.get('domain') ?? '').trim();
    const q      = (url.searchParams.get('q') ?? '').trim();

    const where: string[] = ["status != 'archived'"];
    const binds: unknown[] = [];

    if (type) {
      where.push(`source_type = ?${binds.length + 1}`);
      binds.push(type);
    }
    if (domain) {
      where.push(`source_domain = ?${binds.length + 1}`);
      binds.push(domain);
    }
    if (q) {
      where.push(`(title LIKE ?${binds.length + 1} OR creator LIKE ?${binds.length + 2})`);
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const [hasSourcePeople, hasPeople, countRow, dataRes] = await Promise.all([
      hasTable(db, 'wv_source_people'),
      hasTable(db, 'wv_people'),
      db.prepare(`SELECT COUNT(*) AS n FROM wv_sources ${whereClause}`)
        .bind(...binds).first<{ n: number }>(),
      db.prepare(
        `SELECT s.id, s.source_type, s.title, s.subtitle, s.creator, s.publisher,
                s.publication_year, s.language, s.source_url, s.source_domain,
                s.source_language, s.era_ce, s.status, s.created_at,
                s.meta_json,
                COALESCE(unit_counts.unit_count, 0) AS unit_count
         FROM wv_sources s
         LEFT JOIN (
           SELECT source_id, COUNT(*) AS unit_count
           FROM wv_source_units
           GROUP BY source_id
         ) unit_counts ON unit_counts.source_id = s.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
      ).bind(...binds, limit, offset).all(),
    ]);

    const sourceIds = (dataRes.results ?? []).map((row: any) => row.id).filter(Boolean);
    const peopleBySourceId = new Map<string, { people_count: number; people_names: string[] }>();

    if (hasSourcePeople && hasPeople && sourceIds.length) {
      const placeholders = sourceIds.map((_, index) => `?${index + 1}`).join(', ');
      const peopleRes = await db
        .prepare(
          `
          SELECT
            sp.source_id,
            p.display_name,
            sp.is_primary,
            sp.order_index
          FROM wv_source_people sp
          INNER JOIN wv_people p ON p.id = sp.person_id
          WHERE sp.source_id IN (${placeholders})
          ORDER BY sp.source_id ASC, sp.is_primary DESC, sp.order_index ASC, p.display_name ASC
          `
        )
        .bind(...sourceIds)
        .all();

      for (const row of peopleRes.results ?? []) {
        const sourceId = String((row as any).source_id ?? '');
        if (!sourceId) continue;

        const current = peopleBySourceId.get(sourceId) ?? { people_count: 0, people_names: [] };
        const displayName = String((row as any).display_name ?? '').trim();
        if (displayName && !current.people_names.includes(displayName)) {
          current.people_names.push(displayName);
          current.people_count += 1;
        }
        peopleBySourceId.set(sourceId, current);
      }
    }

    const total   = Number(countRow?.n ?? 0);
    const results = (dataRes.results ?? []).map((r: any) => ({
      ...r,
      meta: safeJson(r.meta_json),
      meta_json: undefined,
      people_count: peopleBySourceId.get(r.id)?.people_count ?? 0,
      people_names: peopleBySourceId.get(r.id)?.people_names ?? [],
    }));

    return new Response(JSON.stringify({
      ok: true, total, limit, offset,
      hasMore: offset + results.length < total,
      results,
    }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
