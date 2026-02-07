import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import { canonicalize } from '../../_utils/universal';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function asInteger(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function normalizeTextNorm(value: string) {
  return canonicalize(value)
    .replace(/\s+/g, '_')
    .replace(/[|]/g, '_');
}

function stableLemmaId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  const normalized = hash % 2147483647;
  return Math.max(1, normalized);
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(ctx.request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const lemmaId = toInt(url.searchParams.get('lemma_id'), 0);
  const surah = toInt(url.searchParams.get('surah'), 0);
  const ayah = toInt(url.searchParams.get('ayah'), 0);

  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(200, Math.max(25, toInt(url.searchParams.get('pageSize'), 50)));
  let limit = pageSize;
  let offset = (page - 1) * pageSize;
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(500, Math.max(1, toInt(limitParam, pageSize)));
    offset = Math.max(0, toInt(offsetParam, 0));
  }

  const whereParts: string[] = [];
  const binds: (string | number)[] = [];

  if (lemmaId) {
    whereParts.push('loc.lemma_id = ?');
    binds.push(lemmaId);
  }

  if (surah) {
    whereParts.push('loc.surah = ?');
    binds.push(surah);
  }

  if (ayah) {
    whereParts.push('loc.ayah = ?');
    binds.push(ayah);
  }

  if (q) {
    const like = `%${q}%`;
    whereParts.push('(l.lemma_text LIKE ? OR l.lemma_text_clean LIKE ?)');
    binds.push(like, like);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  try {
    const countStmt = ctx.env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM quran_ayah_lemma_location loc
      LEFT JOIN quran_ayah_lemmas l ON l.lemma_id = loc.lemma_id
      ${whereClause}
    `);
    const countRes = await countStmt.bind(...binds).first();
    const total = Number(countRes?.total ?? 0);

    const dataStmt = ctx.env.DB.prepare(`
      SELECT
        loc.id,
        loc.lemma_id,
        l.lemma_text,
        l.lemma_text_clean,
        loc.word_location,
        loc.surah,
        loc.ayah,
        loc.token_index,
        loc.word_simple,
        loc.word_diacritic,
        loc.ar_u_token,
        loc.ar_token_occ_id
      FROM quran_ayah_lemma_location loc
      LEFT JOIN quran_ayah_lemmas l ON l.lemma_id = loc.lemma_id
      ${whereClause}
      ORDER BY loc.surah ASC, loc.ayah ASC, loc.token_index ASC
      LIMIT ?
      OFFSET ?
    `);

    const { results = [] } = await dataStmt.bind(...binds, limit, offset).all();

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        page,
        pageSize: limit,
        hasMore: offset + (results as any[]).length < total,
        results,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('lemma locations error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load lemma locations' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const entries = Array.isArray(body?.entries) ? body?.entries : [];
  if (!entries.length) {
    return new Response(JSON.stringify({ ok: false, error: 'Entries payload is required.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const results: Array<Record<string, unknown>> = [];

  try {
    for (const entry of entries) {
      const row = asRecord(entry);
      if (!row) continue;

      const id = asInteger(row.id);
      let existing: any = null;
      if (id) {
        existing = await ctx.env.DB
          .prepare(
            `
            SELECT id, lemma_id, word_location, surah, ayah, token_index
            FROM quran_ayah_lemma_location
            WHERE id = ?1
          `
          )
          .bind(id)
          .first();
      }

      const surah = asInteger(row.surah) ?? asInteger(existing?.surah);
      const ayah = asInteger(row.ayah) ?? asInteger(existing?.ayah);
      const tokenIndex = asInteger(row.token_index) ?? asInteger(existing?.token_index);
      if (!surah || !ayah || !tokenIndex) {
        return new Response(JSON.stringify({ ok: false, error: 'surah, ayah, token_index are required.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const lemmaText = asString(row.lemma_text);
      const lemmaTextClean =
        asString(row.lemma_text_clean) ?? (lemmaText ? normalizeTextNorm(lemmaText) : null);

      let lemmaId = asInteger(row.lemma_id) ?? asInteger(existing?.lemma_id);

      if (!lemmaId && lemmaTextClean) {
        const found = await ctx.env.DB
          .prepare(`SELECT lemma_id FROM quran_ayah_lemmas WHERE lemma_text_clean = ?1 LIMIT 1`)
          .bind(lemmaTextClean)
          .first();
        if (found?.lemma_id) {
          lemmaId = Number(found.lemma_id);
        }
      }

      if (!lemmaId && lemmaTextClean) {
        lemmaId = stableLemmaId(lemmaTextClean);
        const conflict = await ctx.env.DB
          .prepare(`SELECT lemma_text_clean FROM quran_ayah_lemmas WHERE lemma_id = ?1 LIMIT 1`)
          .bind(lemmaId)
          .first();
        if (conflict?.lemma_text_clean && conflict.lemma_text_clean !== lemmaTextClean) {
          const maxRow = await ctx.env.DB
            .prepare(`SELECT MAX(lemma_id) AS max_id FROM quran_ayah_lemmas`)
            .first();
          const maxId = Number(maxRow?.max_id ?? 0);
          lemmaId = maxId + 1;
        }
      }

      if (!lemmaId) {
        return new Response(JSON.stringify({ ok: false, error: 'lemma_id or lemma_text is required.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const lemmaExists = await ctx.env.DB
        .prepare(`SELECT lemma_id FROM quran_ayah_lemmas WHERE lemma_id = ?1 LIMIT 1`)
        .bind(lemmaId)
        .first();
      if (!lemmaExists && !lemmaTextClean) {
        return new Response(JSON.stringify({ ok: false, error: `lemma_id ${lemmaId} not found.` }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      if (lemmaTextClean) {
        await ctx.env.DB
          .prepare(
            `
            INSERT INTO quran_ayah_lemmas (
              lemma_id, lemma_text, lemma_text_clean, words_count, uniq_words_count, primary_ar_u_token, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
            ON CONFLICT(lemma_id) DO UPDATE SET
              lemma_text = excluded.lemma_text,
              lemma_text_clean = excluded.lemma_text_clean,
              words_count = excluded.words_count,
              uniq_words_count = excluded.uniq_words_count,
              primary_ar_u_token = excluded.primary_ar_u_token
          `
          )
          .bind(
            lemmaId,
            lemmaText ?? lemmaTextClean,
            lemmaTextClean,
            asInteger(row.words_count),
            asInteger(row.uniq_words_count),
            asString(row.primary_ar_u_token)
          )
          .run();
      }

      const wordLocation =
        asString(row.word_location) ??
        asString(existing?.word_location) ??
        `${surah}:${ayah}:${tokenIndex}`;

      if (id) {
        await ctx.env.DB
          .prepare(
            `
            UPDATE quran_ayah_lemma_location
            SET lemma_id = ?1,
                word_location = ?2,
                surah = ?3,
                ayah = ?4,
                token_index = ?5,
                ar_token_occ_id = ?6,
                ar_u_token = ?7,
                word_simple = ?8,
                word_diacritic = ?9
            WHERE id = ?10
          `
          )
          .bind(
            lemmaId,
            wordLocation,
            surah,
            ayah,
            tokenIndex,
            asString(row.ar_token_occ_id),
            asString(row.ar_u_token),
            asString(row.word_simple),
            asString(row.word_diacritic),
            id
          )
          .run();
      } else {
        await ctx.env.DB
          .prepare(
            `
            INSERT INTO quran_ayah_lemma_location (
              lemma_id, word_location, surah, ayah, token_index,
              ar_token_occ_id, ar_u_token, word_simple, word_diacritic, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
            ON CONFLICT(lemma_id, word_location) DO UPDATE SET
              surah = excluded.surah,
              ayah = excluded.ayah,
              token_index = excluded.token_index,
              ar_token_occ_id = excluded.ar_token_occ_id,
              ar_u_token = excluded.ar_u_token,
              word_simple = excluded.word_simple,
              word_diacritic = excluded.word_diacritic
          `
          )
          .bind(
            lemmaId,
            wordLocation,
            surah,
            ayah,
            tokenIndex,
            asString(row.ar_token_occ_id),
            asString(row.ar_u_token),
            asString(row.word_simple),
            asString(row.word_diacritic)
          )
          .run();
      }

      results.push({
        id: id ?? null,
        lemma_id: lemmaId,
        word_location: wordLocation,
        surah,
        ayah,
        token_index: tokenIndex,
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: jsonHeaders });
  } catch (err) {
    console.error('lemma locations upsert error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to save lemma locations' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
