import { requireAuth } from '../../../../_utils/auth';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type TokenPayload = {
  surface: string;
  lexicon_id?: string;
  pos_index: number;
  translation?: string | null;
  ar_u_token?: string;
  ar_u_root?: string;
  token_occ_id?: string;
};

type SpanPayload = {
  text: string;
  start_index: number;
  end_index: number;
  token_u_ids: string[];
  ar_u_span?: string;
  grammar_ids?: string[];
  note?: string | null;
};

type SentencePayload = {
  text: string;
  translation?: string | null;
  tokens: TokenPayload[];
  spans?: SpanPayload[];
  grammar_ids?: string[];
  ar_u_sentence?: string;
};

type OccurrenceRequest = {
  lesson_id: number;
  container_id: string;
  unit_id: string;
  sentence: SentencePayload;
};

async function hash(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureUniversalToken(db: D1Database, surface: string) {
    const canonical = `token|ar|${surface.trim()}`;
    const ar_u_token = await hash(canonical);
  await db
    .prepare(
      `
      INSERT OR IGNORE INTO ar_u_tokens (
        ar_u_token, canonical_input, lemma_ar, lemma_norm, pos, features_json, meta_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
    `
    )
    .bind(ar_u_token, canonical, surface, surface, 'noun', null, JSON.stringify({ source: 'lesson-authoring' }))
    .run();
  return ar_u_token;
}

async function ensureUniversalSpan(db: D1Database, text: string, tokenIds: string[]) {
    const canonical = `span|ar|${text.trim()}|tokens:${tokenIds.join(',')}`;
    const ar_u_span = await hash(canonical);
  await db
    .prepare(
      `
      INSERT OR IGNORE INTO ar_u_spans (
        ar_u_span, canonical_input, span_type, token_ids_csv, meta_json, created_at
      ) VALUES (?1, ?2, 'phrase', ?3, json(?4), datetime('now'))
    `
    )
    .bind(ar_u_span, canonical, tokenIds.join(','), JSON.stringify({ source: 'lesson-authoring' }))
    .run();
  return ar_u_span;
}

async function ensureUniversalSentence(db: D1Database, text: string, tokenIds: string[]) {
    const canonical = `sentence|ar|${text.trim()}|tokens:${tokenIds.join(',')}`;
    const ar_u_sentence = await hash(canonical);
  await db
    .prepare(
      `
      INSERT OR IGNORE INTO ar_u_sentences (
        ar_u_sentence, canonical_input, sentence_kind, sequence_json, text_ar, meta_json, created_at
      ) VALUES (?1, ?2, 'nominal', json(?3), ?4, json(?5), datetime('now'))
    `
    )
    .bind(
      ar_u_sentence,
      canonical,
      JSON.stringify({ tokens: tokenIds }),
      text,
      JSON.stringify({ source: 'lesson-authoring' })
    )
    .run();
  return ar_u_sentence;
}

async function insertOccurrenceToken(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string,
  token: TokenPayload,
  ar_u_token: string
) {
  const tokenOccId =
    token.token_occ_id ?? (await hash(`occ_token|${containerId}|${unitId}|${token.pos_index}|${token.surface}`));
  await db
    .prepare(
      `
      INSERT OR REPLACE INTO ar_occ_token (
        ar_token_occ_id, user_id, container_id, unit_id, pos_index,
        surface_ar, norm_ar, lemma_ar, pos, ar_u_token, ar_u_root,
        features_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, datetime('now'))
    `
    )
    .bind(
      tokenOccId,
      userId,
      containerId,
      unitId,
      token.pos_index,
      token.surface,
      token.surface,
      token.surface,
      'noun',
      ar_u_token,
      token.ar_u_root ?? null,
      null
    )
    .run();
  return tokenOccId;
}

async function insertTokenLexiconLink(db: D1Database, tokenOccId: string, lexiconId: string) {
  await db
    .prepare(
      `
      INSERT OR IGNORE INTO ar_token_lexicon_link (
        ar_token_occ_id, ar_u_lexicon, created_at
      ) VALUES (?1, ?2, datetime('now'))
    `
    )
    .bind(tokenOccId, lexiconId)
    .run();
}

async function insertOccurrenceSpan(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string,
  span: SpanPayload,
  ar_u_span: string
) {
  const spanOccId = await hash(`occ_span|${containerId}|${unitId}|${span.start_index}-${span.end_index}|${span.text}`);
  await db
    .prepare(
      `
      INSERT OR REPLACE INTO ar_occ_span (
        ar_span_occ_id, user_id, container_id, unit_id, start_index, end_index,
        text_cache, ar_u_span, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
    `
    )
    .bind(
      spanOccId,
      userId,
      containerId,
      unitId,
      span.start_index,
      span.end_index,
      span.text,
      ar_u_span
    )
    .run();
  return spanOccId;
}

async function insertOccurrenceSentence(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string,
  sentence: SentencePayload,
  ar_u_sentence: string
) {
  const sentenceOccId = await hash(`occ_sentence|${containerId}|${unitId}|${sentence.text}`);
  await db
    .prepare(
      `
      INSERT OR REPLACE INTO ar_occ_sentence (
        ar_sentence_occ_id, user_id, container_id, unit_id, sentence_order,
        text_ar, translation, ar_u_sentence, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
    `
    )
    .bind(
      sentenceOccId,
      userId,
      containerId,
      unitId,
      1,
      sentence.text,
      sentence.translation ?? null,
      ar_u_sentence
    )
    .run();
  return sentenceOccId;
}

async function insertGrammarLink(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string,
  targetType: string,
  targetId: string,
  grammarId: string,
  note?: string | null
) {
  const linkId = hash(`${targetType}|${targetId}|${grammarId}`);
  await db
    .prepare(
      `
      INSERT OR REPLACE INTO ar_occ_grammar (
        id, user_id, container_id, unit_id, ar_u_grammar,
        target_type, target_id, note, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
    `
    )
    .bind(linkId, userId, containerId, unitId, grammarId, targetType, targetId, note ?? null)
    .run();
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }
    const lessonId = Number(ctx.params?.id);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid lesson id' }), { status: 400, headers: jsonHeaders });
    }
    const body = (await ctx.request.json()) as OccurrenceRequest;
    if (!body.container_id || !body.unit_id || !body.sentence) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing payload fields' }), { status: 400, headers: jsonHeaders });
    }
    const sentence = body.sentence;

    const containerRow = await ctx.env.DB
      .prepare('SELECT id FROM ar_containers WHERE id = ?1')
      .bind(body.container_id)
      .first<any>();
    if (!containerRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Container not found' }), { status: 404, headers: jsonHeaders });
    }

    const unitRow = await ctx.env.DB
      .prepare('SELECT id FROM ar_container_units WHERE id = ?1 AND container_id = ?2')
      .bind(body.unit_id, body.container_id)
      .first<any>();
    if (!unitRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: jsonHeaders });
    }

    const tokenIds: string[] = [];
    const tokenOccIds: string[] = [];
    for (const token of sentence.tokens) {
      const ar_u_token = token.ar_u_token ?? (await ensureUniversalToken(ctx.env.DB, token.surface));
      const occId = await insertOccurrenceToken(ctx.env.DB, user.id, body.container_id, body.unit_id, token, ar_u_token);
      tokenIds.push(ar_u_token);
      tokenOccIds.push(occId);
      if (token.lexicon_id) {
        await insertTokenLexiconLink(ctx.env.DB, occId, token.lexicon_id);
      }
      if (sentence.grammar_ids?.length) {
        for (const grammarId of sentence.grammar_ids) {
          await insertGrammarLink(ctx.env.DB, user.id, body.container_id, body.unit_id, 'occ_token', occId, grammarId);
        }
      }
    }

    const spanOccIds: string[] = [];
    if (sentence.spans) {
      for (const span of sentence.spans) {
        const ar_u_span = span.ar_u_span ?? (await ensureUniversalSpan(ctx.env.DB, span.text, span.token_u_ids));
        const spanOccId = await insertOccurrenceSpan(ctx.env.DB, user.id, body.container_id, body.unit_id, span, ar_u_span);
        spanOccIds.push(spanOccId);
        if (span.grammar_ids?.length) {
          for (const grammarId of span.grammar_ids) {
            await insertGrammarLink(ctx.env.DB, user.id, body.container_id, body.unit_id, 'occ_span', spanOccId, grammarId, span.note);
          }
        }
      }
    }

    const ar_u_sentence = sentence.ar_u_sentence ?? (await ensureUniversalSentence(ctx.env.DB, sentence.text, tokenIds));
    const sentenceOccId = await insertOccurrenceSentence(ctx.env.DB, user.id, body.container_id, body.unit_id, sentence, ar_u_sentence);
    if (sentence.grammar_ids?.length) {
      for (const grammarId of sentence.grammar_ids) {
        await insertGrammarLink(ctx.env.DB, user.id, body.container_id, body.unit_id, 'occ_sentence', sentenceOccId, grammarId);
      }
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE ar_lessons
        SET container_id = ?1, unit_id = ?2, updated_at = datetime('now')
        WHERE id = ?3
      `
      )
      .bind(body.container_id, body.unit_id, lessonId)
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          sentence_occ_id: sentenceOccId,
          token_occ_ids: tokenOccIds,
          span_occ_ids: spanOccIds,
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
