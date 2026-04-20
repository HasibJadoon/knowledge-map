interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Body = {
  id: number;
  cards: string | unknown[]; // allow string OR array
};

export const onRequestPut: PagesFunction<Env> = async () =>
  Response.json(
    { ok: false, error: 'Root card editing removed' },
    { status: 410 }
  );
