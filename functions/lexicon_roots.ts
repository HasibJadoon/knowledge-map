interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

function toInt(v: string | null, def: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);

    const q = (url.searchParams.get("q") ?? "").trim();

    // Pagination inputs:
    // Option A: page/pageSize (nice for UI)
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSizeRaw = toInt(url.searchParams.get("pageSize"), 100);

    // clamp pageSize to avoid abuse
    const pageSize = Math.min(500, Math.max(1, pageSizeRaw));

    // Option B: offset/limit (works too). If provided, it overrides page/pageSize.
    const offsetParam = url.searchParams.get("offset");
    const limitParam = url.searchParams.get("limit");

    let limit = pageSize;
    let offset = (page - 1) * pageSize;

    if (offsetParam !== null || limitParam !== null) {
      limit = Math.min(500, Math.max(1, toInt(limitParam, 100)));
      offset = Math.max(0, toInt(offsetParam, 0));
    }

    // Count query
    let countStmt;
    let dataStmt;

    const selectSql = `
      SELECT
        id,
        root,
        family,
        cards,
        status,
        difficulty,
        frequency,
        create_date,
        update_date,
        extract_date
      FROM roots
    `;

    if (q) {
      const like = `%${q}%`;

      countStmt = ctx.env.DB.prepare(
        `
          SELECT COUNT(*) AS total
          FROM roots
          WHERE root LIKE ?1 OR family LIKE ?2
        `
      ).bind(like, like);

      dataStmt = ctx.env.DB.prepare(
        `
          ${selectSql}
          WHERE root LIKE ?1 OR family LIKE ?2
          ORDER BY root ASC, family ASC
          LIMIT ?3 OFFSET ?4
        `
      ).bind(like, like, limit, offset);
    } else {
      countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM roots`);

      dataStmt = ctx.env.DB.prepare(
        `
          ${selectSql}
          ORDER BY root ASC, family ASC
          LIMIT ?1 OFFSET ?2
        `
      ).bind(limit, offset);
    }

    const countRes = await countStmt.first<{ total: number }>();
    const total = Number(countRes?.total ?? 0);

    const { results } = await dataStmt.all();

    const returned = (results ?? []).length;
    const nextOffset = offset + returned;
    const hasMore = nextOffset < total;

    // If the caller used offset/limit → return offset/limit metadata.
    // Otherwise → return page/pageSize metadata.
    const usingOffsetMode = offsetParam !== null || limitParam !== null;

    const meta = usingOffsetMode
      ? {
          mode: "offset",
          q,
          limit,
          offset,
          nextOffset: hasMore ? nextOffset : null,
        }
      : {
          mode: "page",
          q,
          page,
          pageSize,
          pages: Math.max(1, Math.ceil(total / pageSize)),
        };

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        hasMore,
        ...meta,
        results: results ?? [],
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
