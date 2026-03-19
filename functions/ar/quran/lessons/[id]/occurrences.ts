const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: false, error: 'Occurrence layer removed.' }), {
    status: 410,
    headers: jsonHeaders,
  });
};
