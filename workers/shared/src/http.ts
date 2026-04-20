export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function notFound(domain: string): Response {
  return json(
    {
      ok: false,
      error: {
        code: 'not_found',
        message: `${domain} route not found`,
      },
    },
    { status: 404 },
  );
}

export async function dbHealth(db: D1Database): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  return row?.ok === 1;
}
