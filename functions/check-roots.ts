interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Body = { roots: string[] };

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as Partial<Body>;

  // Validate
  if (!body?.roots || !Array.isArray(body.roots)) {
    return Response.json(
      { ok: false, error: "Expected JSON { roots: string[] }" },
      { status: 400 }
    );
  }

  const normalized = Array.from(
    new Set(
      body.roots
        .map((value) => String(value ?? "").trim())
        .filter((value) => value.length > 0)
    )
  );

  if (unique.length === 0) {
    return Response.json({ existing: [], new: [] });
  }

  if (normalized.length === 0) {
    return Response.json({ existing: [], new: [] });
  }

  const conditions = normalized.map(() => "(root = ? OR root_norm = ?)").join(" OR ");
  const binds = normalized.flatMap((value) => [value, value]);

  const { results } = await ctx.env.DB
    .prepare(
      `
      SELECT root, root_norm
      FROM ar_u_roots
      WHERE ${conditions}
    `
    )
    .bind(...binds)
    .all<{ root: string; root_norm: string }>();

  const existingSet = new Set<string>();
  (results ?? []).forEach((row) => {
    existingSet.add(row.root?.trim() ?? '');
    existingSet.add(row.root_norm?.trim() ?? '');
  });

  const newRoots = normalized.filter((value) => !existingSet.has(value));

  return Response.json({
    existing: Array.from(existingSet).filter((value) => value),
    new: newRoots,
  });
};
