interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type RootFamily = { root: string; family: string };
type Body = { roots: RootFamily[] };

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as Partial<Body>;

  // Validate
  if (!body?.roots || !Array.isArray(body.roots)) {
    return Response.json(
      { ok: false, error: "Expected JSON { roots: { root: string; family: string }[] }" },
      { status: 400 }
    );
  }

  // Normalize + de-dupe by (root|family)
  const normalized: RootFamily[] = body.roots
    .map((x: any) => ({
      root: String(x?.root ?? "").trim(),
      family: String(x?.family ?? "").trim(),
    }))
    .filter((x) => x.root && x.family);

  const uniqMap = new Map<string, RootFamily>();
  for (const rf of normalized) {
    uniqMap.set(`${rf.root}||${rf.family}`, rf);
  }
  const unique = Array.from(uniqMap.values());

  if (unique.length === 0) {
    return Response.json({ existing: [], new: [] });
  }

  // Query each pair by looking up the family stored in meta_json
  const conditions = unique
    .map(() => "(root = ? AND json_extract(meta_json, '$.family') = ?)")
    .join(" OR ");
  const sql = `
    SELECT root, json_extract(meta_json, '$.family') AS family
    FROM ar_u_roots
    WHERE ${conditions}
  `;

  const binds: string[] = [];
  for (const rf of unique) {
    binds.push(rf.root, rf.family);
  }

  const { results } = await ctx.env.DB.prepare(sql).bind(...binds).all<RootFamily>();

  const existing = (results ?? [])
    .map((r) => ({ root: r.root, family: (r.family ?? '').trim() }))
    .filter((r) => r.family);

  const existingSet = new Set(existing.map((r) => `${r.root}||${r.family}`));
  const newRoots = unique.filter((r) => !existingSet.has(`${r.root}||${r.family}`));

  return Response.json({ existing, new: newRoots });
};
