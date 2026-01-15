interface Env {
  DB: D1Database;
}

function getBearer(req: Request) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const token = getBearer(ctx.request);
  if (!token) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await ctx.env.DB
    .prepare(`UPDATE users SET token = NULL, token_expires_at = NULL WHERE token = ?`)
    .bind(token)
    .run();

  return Response.json({ ok: true });
};
