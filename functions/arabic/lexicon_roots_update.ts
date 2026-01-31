// functions/lexicon_roots_update.ts
import { requireAuth } from '../_utils/auth';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Body = {
  id: string;
  cards: string | unknown[];
  status?: string;
};

export const onRequestPut: PagesFunction<Env> = async () =>
  Response.json(
    { ok: false, error: 'Root card editing removed' },
    { status: 410 }
  );
