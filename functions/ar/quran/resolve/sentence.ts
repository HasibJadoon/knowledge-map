import { requireAuth } from '../../../_utils/auth';
import { canonicalize, upsertArUSentence } from '../../../_utils/universal';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type ResolveSentenceBody = {
  text_ar?: string;
  source?: {
    container_id?: string;
    ayah?: number | null;
  };
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    let body: ResolveSentenceBody;
    try {
      body = await ctx.request.json<ResolveSentenceBody>();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const textAr = typeof body.text_ar === 'string' ? body.text_ar.trim() : '';
    if (!textAr) {
      return new Response(JSON.stringify({ ok: false, error: 'text_ar is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const textNorm = canonicalize(textAr);
    const meta = {
      source: 'lesson-authoring',
      container_id: body.source?.container_id ?? null,
      ayah: body.source?.ayah ?? null,
    };

    const resolved = await upsertArUSentence(
      { DB: ctx.env.DB },
      {
        kind: 'surface',
        sequence: [textNorm],
        textAr,
        meta,
      }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          ar_u_sentence: resolved.ar_u_sentence,
          text_ar: textAr,
          text_norm: textNorm,
          canonical_input: resolved.canonical_input,
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
