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

function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    // ---------------- AUTH ----------------
    const user = await requireAuth(ctx as any);
    if (!user) {
      return Response.json(
        { ok: false, error: 'Unauthorized or token expired' },
        { status: 401 }
      );
    }

    // ---------------- BODY ----------------
    const raw = await ctx.request.text();
    if (!raw || !raw.trim()) {
      return Response.json(
        { ok: false, error: 'Empty request body' },
        { status: 400 }
      );
    }

    let body: Partial<Body>;
    try {
      body = JSON.parse(raw) as Partial<Body>;
    } catch {
      return Response.json(
        { ok: false, error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const id = String(body.id ?? '').trim();
    if (!id) {
      return Response.json(
        { ok: false, error: 'Missing id' },
        { status: 400 }
      );
    }

    // ---------------- CARDS ----------------
    let cardsArray: unknown[];

    if (Array.isArray(body.cards)) {
      cardsArray = body.cards;
    } else {
      const cardsStr = String(body.cards ?? '').trim();
      if (!cardsStr) {
        return Response.json(
          { ok: false, error: 'cards is required' },
          { status: 400 }
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(cardsStr);
      } catch {
        return Response.json(
          { ok: false, error: 'cards must be valid JSON (array)' },
          { status: 400 }
        );
      }

      if (!Array.isArray(parsed)) {
        return Response.json(
          { ok: false, error: 'cards JSON must be an array' },
          { status: 400 }
        );
      }

      cardsArray = parsed;
    }

    // ---------------- UPDATE ----------------
    const status = typeof body.status === 'string' ? body.status.trim() : 'Edited';

    const row = await ctx.env.DB
      .prepare(`SELECT meta_json FROM ar_u_roots WHERE ar_u_root = ?`)
      .bind(id)
      .first<{ meta_json: string | null }>();

    if (!row) {
      return Response.json(
        { ok: false, error: 'Row not found' },
        { status: 404 }
      );
    }

    const existingMeta = safeJsonParse<Record<string, unknown>>(row.meta_json) ?? {};
    existingMeta.cards = cardsArray;
    const metaJson = JSON.stringify(existingMeta, null, 2);

    const res = await ctx.env.DB
      .prepare(
        `
        UPDATE ar_u_roots
        SET
          status = ?,
          meta_json = ?,
          updated_at = datetime('now')
        WHERE ar_u_root = ?
      `
      )
      .bind(status, metaJson, id)
      .run();

    // @ts-ignore
    const changes = Number(res?.meta?.changes ?? 0);
    if (changes === 0) {
      return Response.json(
        { ok: false, error: 'Row not found or not changed' },
        { status: 404 }
      );
    }

    // ---------------- SUCCESS ----------------
    return Response.json({
      ok: true,
      message: 'Cards saved successfully',
      id,
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
};
