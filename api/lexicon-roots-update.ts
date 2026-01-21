interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Body = {
  id: number;
  cards: string | unknown[]; // allow string OR array
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    // ---- Read raw body safely (prevents "Unexpected end of JSON input") ----
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

    const id = Number(body?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return Response.json(
        { ok: false, error: 'Expected numeric id' },
        { status: 400 }
      );
    }

    // ---- Normalize cards into a string + validate array ----
    let cardsArray: unknown[];

    if (Array.isArray(body?.cards)) {
      cardsArray = body!.cards;
    } else {
      const cardsStr = String(body?.cards ?? '').trim();
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

    // Store pretty JSON (optional, but nice)
    const cardsToStore = JSON.stringify(cardsArray, null, 2);

    // ---- Update row ----
    const res = await ctx.env.DB
      .prepare(
        `
        UPDATE roots
        SET
          cards_json = ?,
          status = 'PENDING',
          updated_at = datetime('now')
        WHERE id = ?
      `
      )
      .bind(cardsToStore, id)
      .run();

    // @ts-ignore
    const changes = Number(res?.meta?.changes ?? 0);

    if (changes === 0) {
      return Response.json(
        { ok: false, error: 'Row not found or not changed' },
        { status: 404 }
      );
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
};
