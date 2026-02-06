import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type GrammarRow = {
  ar_u_grammar: string;
  canonical_input: string;
  grammar_id: string;
  category: string | null;
  title: string | null;
  title_ar: string | null;
  definition: string | null;
  definition_ar: string | null;
  meta_json: string | null;
};

type GrammarRelationRow = {
  id: string;
  parent_ar_u_grammar: string;
  child_ar_u_grammar: string;
  relation_type: string;
  order_index: number | null;
  meta_json: string | null;
};

const encoder = new TextEncoder();

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function canonicalize(input: string) {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function sha256Hex(input: string) {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const { results: conceptRows = [] } = await ctx.env.DB.prepare(
      `SELECT
        ar_u_grammar,
        canonical_input,
        grammar_id,
        category,
        title,
        title_ar,
        definition,
        definition_ar,
        meta_json
      FROM ar_u_grammar
      ORDER BY category, title`
    ).all();

    const { results: relationRows = [] } = await ctx.env.DB.prepare(
      `SELECT
        id,
        parent_ar_u_grammar,
        child_ar_u_grammar,
        relation_type,
        order_index,
        meta_json
      FROM ar_u_grammar_relations
      ORDER BY order_index ASC`
    ).all();

    const concepts = (conceptRows as GrammarRow[]).map((row) => ({
      ar_u_grammar: row.ar_u_grammar,
      canonical_input: row.canonical_input,
      grammar_id: row.grammar_id,
      category: row.category,
      title: row.title,
      title_ar: row.title_ar,
      definition: row.definition,
      definition_ar: row.definition_ar,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
    }));

    const relations = (relationRows as GrammarRelationRow[]).map((row) => ({
      id: row.id,
      parent_ar_u_grammar: row.parent_ar_u_grammar,
      child_ar_u_grammar: row.child_ar_u_grammar,
      relation_type: row.relation_type,
      order_index: row.order_index,
      meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
    }));

    return new Response(JSON.stringify({ ok: true, concepts, relations }), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error('grammar concepts error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load grammar concepts.' }), {
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
    body = null;
  }

  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const title = normalizeString(body['title']);
  const titleAr = normalizeString(body['title_ar']);
  const category = normalizeString(body['category']);
  const definition = normalizeString(body['definition']);
  const definitionAr = normalizeString(body['definition_ar']);
  const parentId = normalizeString(body['parent_id']);
  const relationType = normalizeString(body['relation_type']) || 'is_a';
  const tagsRaw = body['tags'];
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => normalizeString(t)).filter(Boolean)
    : [];
  const metaInput = body['meta'];
  const meta =
    metaInput && typeof metaInput === 'object' && !Array.isArray(metaInput)
      ? (metaInput as Record<string, unknown>)
      : {};

  const normalizedTitle = title || titleAr;
  if (!normalizedTitle) {
    return new Response(JSON.stringify({ ok: false, error: 'title or title_ar is required.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const canonicalInput = canonicalize([
    normalizedTitle,
    titleAr,
    category,
    definition,
    definitionAr,
  ].filter(Boolean).join(' | '));

  if (!canonicalInput) {
    return new Response(JSON.stringify({ ok: false, error: 'Unable to build canonical input.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const arUGrammar = await sha256Hex(canonicalInput);
  const requestedGrammarId = normalizeString(body['grammar_id']);
  let grammarId = requestedGrammarId || slugify(normalizedTitle);
  if (!grammarId) {
    grammarId = `grammar-${arUGrammar.slice(0, 8)}`;
  }

  try {
    const existingGrammarId = await ctx.env.DB.prepare(
      `SELECT grammar_id FROM ar_u_grammar WHERE grammar_id = ?1`
    ).bind(grammarId).first();
    if (existingGrammarId) {
      grammarId = `${grammarId}-${arUGrammar.slice(0, 4)}`;
    }

    const finalMeta = { ...meta } as Record<string, unknown>;
    if (tags.length) {
      finalMeta['tags'] = tags;
    }

    await ctx.env.DB.prepare(
      `INSERT OR IGNORE INTO ar_u_grammar
        (ar_u_grammar, canonical_input, grammar_id, category, title, title_ar, definition, definition_ar, meta_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
    )
      .bind(
        arUGrammar,
        canonicalInput,
        grammarId,
        category || null,
        title || null,
        titleAr || null,
        definition || null,
        definitionAr || null,
        Object.keys(finalMeta).length ? JSON.stringify(finalMeta) : null
      )
      .run();

    if (parentId) {
      const relationId = await sha256Hex(`REL|${parentId}|${arUGrammar}|${relationType}`);
      await ctx.env.DB.prepare(
        `INSERT OR REPLACE INTO ar_u_grammar_relations
          (id, parent_ar_u_grammar, child_ar_u_grammar, relation_type, order_index)
         VALUES (?1, ?2, ?3, ?4, NULL)`
      )
        .bind(relationId, parentId, arUGrammar, relationType)
        .run();
    }

    const row = await ctx.env.DB.prepare(
      `SELECT ar_u_grammar, canonical_input, grammar_id, category, title, title_ar, definition, definition_ar, meta_json
       FROM ar_u_grammar WHERE ar_u_grammar = ?1`
    ).bind(arUGrammar).first<GrammarRow>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to create grammar concept.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      result: {
        ar_u_grammar: row.ar_u_grammar,
        canonical_input: row.canonical_input,
        grammar_id: row.grammar_id,
        category: row.category,
        title: row.title,
        title_ar: row.title_ar,
        definition: row.definition,
        definition_ar: row.definition_ar,
        meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      }
    }), { headers: jsonHeaders });
  } catch (err) {
    console.error('grammar concept create error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to create grammar concept.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
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
    body = null;
  }

  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const id = normalizeString(body['id']);
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const existing = await ctx.env.DB.prepare(
      `SELECT meta_json FROM ar_u_grammar WHERE ar_u_grammar = ?1`
    ).bind(id).first<GrammarRow>();

    if (!existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Concept not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const updateCols: string[] = [];
    const updateBinds: (string | null)[] = [];
    const fields: Array<['title' | 'title_ar' | 'category' | 'definition' | 'definition_ar', string]> = [
      ['title', normalizeString(body['title'])],
      ['title_ar', normalizeString(body['title_ar'])],
      ['category', normalizeString(body['category'])],
      ['definition', normalizeString(body['definition'])],
      ['definition_ar', normalizeString(body['definition_ar'])],
    ];

    for (const [col, value] of fields) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        updateCols.push(`${col} = ?`);
        updateBinds.push(value || null);
      }
    }

    const tagsRaw = body['tags'];
    const metaInput = body['meta'];
    if (
      Object.prototype.hasOwnProperty.call(body, 'tags') ||
      Object.prototype.hasOwnProperty.call(body, 'meta')
    ) {
      const meta =
        metaInput && typeof metaInput === 'object' && !Array.isArray(metaInput)
          ? (metaInput as Record<string, unknown>)
          : (parseJson<Record<string, unknown>>(existing.meta_json) ?? {});

      if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
        meta['tags'] = Array.isArray(tagsRaw)
          ? tagsRaw.map((t) => normalizeString(t)).filter(Boolean)
          : [];
      }

      updateCols.push('meta_json = ?');
      updateBinds.push(Object.keys(meta).length ? JSON.stringify(meta) : null);
    }

    if (!updateCols.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    updateCols.push(`updated_at = datetime('now')`);
    const updateSql = `UPDATE ar_u_grammar SET ${updateCols.join(', ')} WHERE ar_u_grammar = ?`;
    updateBinds.push(id);

    await ctx.env.DB.prepare(updateSql).bind(...updateBinds).run();

    const row = await ctx.env.DB.prepare(
      `SELECT ar_u_grammar, canonical_input, grammar_id, category, title, title_ar, definition, definition_ar, meta_json
       FROM ar_u_grammar WHERE ar_u_grammar = ?1`
    ).bind(id).first<GrammarRow>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Concept not found after update.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      result: {
        ar_u_grammar: row.ar_u_grammar,
        canonical_input: row.canonical_input,
        grammar_id: row.grammar_id,
        category: row.category,
        title: row.title,
        title_ar: row.title_ar,
        definition: row.definition,
        definition_ar: row.definition_ar,
        meta: parseJson<Record<string, unknown>>(row.meta_json) ?? {},
      }
    }), { headers: jsonHeaders });
  } catch (err) {
    console.error('grammar concept update error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to update grammar concept.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
