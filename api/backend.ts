// functions/api/vocab.ts
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, request }) => {
  const url = new URL(request.url);
  const root   = url.searchParams.get("root");
  const q      = url.searchParams.get("q");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const where: string[] = [];
  const params: unknown[] = [];
  if (root) where.push("root = ?"), params.push(root);
  if (q)    where.push("(lemma LIKE ? OR meanings LIKE ?)"), params.push(`%${q}%`, `%${q}%`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await env.DB.prepare(`
    SELECT id, root, lemma, pos, meanings, tags, deck, notes,
           json_extract(data_json,'$.front') AS front, updated_at
    FROM vocab
    ${whereSql}
    ORDER BY datetime(updated_at) DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  const total = await env.DB.prepare(`SELECT COUNT(*) AS c FROM vocab ${whereSql}`)
    .bind(...params).first<{ c:number }>();

  return Response.json({ total: total?.c ?? 0, limit, offset, rows: rows.results ?? [] },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
};
