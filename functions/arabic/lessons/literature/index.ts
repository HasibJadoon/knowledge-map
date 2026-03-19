interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'Literature-specific endpoint not implemented yet. Please use /arabic/lessons for now.',
    }),
    { headers: jsonHeaders, status: 501 }
  );
};

export const onRequestPost: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'Literature-specific endpoint not implemented yet. Please use /arabic/lessons for now.',
    }),
    { headers: jsonHeaders, status: 501 }
  );
};
