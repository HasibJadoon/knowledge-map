import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const POS2_VALUES = new Set(['verb', 'noun', 'prep', 'particle']);

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toJsonOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function canonicalize(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildMorphCanonical(parts: {
  pos2: string;
  surfaceNorm: string;
  derivationType: string | null;
  nounNumber: string | null;
  verbForm: string | null;
  derivedFromVerbForm: string | null;
  derivedPattern: string | null;
  transitivity: string | null;
  objCount: number | null;
}) {
  // Only stable code fields are included in canonical hashing.
  return canonicalize(
    [
      'morph',
      'global',
      parts.pos2,
      parts.surfaceNorm,
      parts.nounNumber ?? '',
      parts.derivationType ?? '',
      `form=${parts.verbForm ?? ''}`,
      `from=${parts.derivedFromVerbForm ?? ''}`,
      `pattern=${parts.derivedPattern ?? ''}`,
      `trans=${parts.transitivity ?? ''}`,
      `obj=${parts.objCount ?? ''}`,
    ].join('|')
  );
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function mapMorphRow(row: any) {
  return {
    ar_u_morphology: row.ar_u_morphology,
    canonical_input: row.canonical_input,
    surface_ar: row.surface_ar,
    surface_norm: row.surface_norm,
    pos2: row.pos2,
    derivation_type: row.derivation_type,
    noun_number: row.noun_number,
    verb_form: row.verb_form,
    derived_from_verb_form: row.derived_from_verb_form,
    derived_pattern: row.derived_pattern,
    transitivity: row.transitivity,
    obj_count: row.obj_count,
    tags_ar: parseJson<unknown>(row.tags_ar_json),
    tags_en: parseJson<unknown>(row.tags_en_json),
    notes: row.notes,
    meta: parseJson<unknown>(row.meta_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const id = normalizeString(url.searchParams.get('id'));

    if (id) {
      const row = await ctx.env.DB.prepare(
        `SELECT
          ar_u_morphology,
          canonical_input,
          surface_ar,
          surface_norm,
          pos2,
          derivation_type,
          noun_number,
          verb_form,
          derived_from_verb_form,
          derived_pattern,
          transitivity,
          obj_count,
          tags_ar_json,
          tags_en_json,
          notes,
          meta_json,
          created_at,
          updated_at
        FROM ar_u_morphology
        WHERE ar_u_morphology = ?1`
      ).bind(id).first<any>();

      if (!row) {
        return new Response(JSON.stringify({ ok: false, error: 'Not found.' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, result: mapMorphRow(row) }), {
        headers: jsonHeaders,
      });
    }

    const pos2 = normalizeString(url.searchParams.get('pos2'));
    const derivedPattern = normalizeString(url.searchParams.get('derived_pattern'));
    const verbForm = normalizeString(url.searchParams.get('verb_form'));
    const q = normalizeString(url.searchParams.get('q'));
    const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offsetRaw = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const where: string[] = [];
    const binds: Array<string | number> = [];

    if (pos2) {
      where.push('pos2 = ?');
      binds.push(pos2);
    }
    if (derivedPattern) {
      where.push('derived_pattern = ?');
      binds.push(derivedPattern);
    }
    if (verbForm) {
      where.push('verb_form = ?');
      binds.push(verbForm);
    }
    if (q) {
      where.push('(surface_norm LIKE ? OR surface_ar LIKE ?)');
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await ctx.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ar_u_morphology ${whereSql}`
    ).bind(...binds).first<{ total: number }>();

    const { results = [] } = await ctx.env.DB.prepare(
      `SELECT
        ar_u_morphology,
        canonical_input,
        surface_ar,
        surface_norm,
        pos2,
        derivation_type,
        noun_number,
        verb_form,
        derived_from_verb_form,
        derived_pattern,
        transitivity,
        obj_count,
        tags_ar_json,
        tags_en_json,
        notes,
        meta_json,
        created_at,
        updated_at
      FROM ar_u_morphology
      ${whereSql}
      ORDER BY surface_norm ASC
      LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all<any>();

    return new Response(
      JSON.stringify({
        ok: true,
        total: Number(countRow?.total ?? 0),
        limit,
        offset,
        results: (results as any[]).map(mapMorphRow),
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const body = (await ctx.request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const surfaceAr = normalizeString(body['surface_ar']);
    const surfaceNorm = normalizeString(body['surface_norm']);
    const pos2 = normalizeString(body['pos2']);

    if (!surfaceAr || !surfaceNorm || !pos2) {
      return new Response(JSON.stringify({ ok: false, error: 'surface_ar, surface_norm, pos2 are required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (!POS2_VALUES.has(pos2)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid pos2.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const derivationType = normalizeOptionalString(body['derivation_type']);
    const nounNumber = normalizeOptionalString(body['noun_number']);
    const verbForm = normalizeOptionalString(body['verb_form']);
    const derivedFromVerbForm = normalizeOptionalString(body['derived_from_verb_form']);
    const derivedPattern = normalizeOptionalString(body['derived_pattern']);
    const transitivity = normalizeOptionalString(body['transitivity']);
    const objCount = toInt(body['obj_count']);

    const canonicalInput =
      normalizeOptionalString(body['canonical_input']) ??
      buildMorphCanonical({
        pos2,
        surfaceNorm,
        derivationType,
        nounNumber,
        verbForm,
        derivedFromVerbForm,
        derivedPattern,
        transitivity,
        objCount,
      });

    const id = normalizeOptionalString(body['ar_u_morphology']) ?? (await sha256Hex(canonicalInput));

    await ctx.env.DB.prepare(
      `INSERT INTO ar_u_morphology (
        ar_u_morphology,
        canonical_input,
        surface_ar,
        surface_norm,
        pos2,
        derivation_type,
        noun_number,
        verb_form,
        derived_from_verb_form,
        derived_pattern,
        transitivity,
        obj_count,
        tags_ar_json,
        tags_en_json,
        notes,
        meta_json
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
      ON CONFLICT(ar_u_morphology) DO UPDATE SET
        surface_ar = excluded.surface_ar,
        tags_ar_json = excluded.tags_ar_json,
        tags_en_json = excluded.tags_en_json,
        notes = excluded.notes,
        meta_json = excluded.meta_json,
        updated_at = datetime('now')`
    )
      .bind(
        id,
        canonicalInput,
        surfaceAr,
        surfaceNorm,
        pos2,
        derivationType,
        nounNumber,
        verbForm,
        derivedFromVerbForm,
        derivedPattern,
        transitivity,
        objCount,
        toJsonOrNull(body['tags_ar']),
        toJsonOrNull(body['tags_en']),
        normalizeOptionalString(body['notes']),
        toJsonOrNull(body['meta'])
      )
      .run();

    const row = await ctx.env.DB.prepare(
      `SELECT
        ar_u_morphology,
        canonical_input,
        surface_ar,
        surface_norm,
        pos2,
        derivation_type,
        noun_number,
        verb_form,
        derived_from_verb_form,
        derived_pattern,
        transitivity,
        obj_count,
        tags_ar_json,
        tags_en_json,
        notes,
        meta_json,
        created_at,
        updated_at
      FROM ar_u_morphology
      WHERE ar_u_morphology = ?1`
    ).bind(id).first<any>();

    return new Response(JSON.stringify({ ok: true, result: row ? mapMorphRow(row) : null }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const body = (await ctx.request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const id = normalizeString(body['ar_u_morphology'] ?? body['id']);
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'ar_u_morphology is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const updateCols: string[] = [];
    const binds: Array<string | number | null> = [];

    if (Object.prototype.hasOwnProperty.call(body, 'surface_ar')) {
      updateCols.push('surface_ar = ?');
      binds.push(normalizeOptionalString(body['surface_ar']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'tags_ar')) {
      updateCols.push('tags_ar_json = ?');
      binds.push(toJsonOrNull(body['tags_ar']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'tags_en')) {
      updateCols.push('tags_en_json = ?');
      binds.push(toJsonOrNull(body['tags_en']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      updateCols.push('notes = ?');
      binds.push(normalizeOptionalString(body['notes']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'meta')) {
      updateCols.push('meta_json = ?');
      binds.push(toJsonOrNull(body['meta']));
    }

    if (!updateCols.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No mutable fields provided.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    updateCols.push("updated_at = datetime('now')");
    const sql = `UPDATE ar_u_morphology SET ${updateCols.join(', ')} WHERE ar_u_morphology = ?`;
    binds.push(id);

    const result = await ctx.env.DB.prepare(sql).bind(...binds).run();
    if (!result.success) {
      return new Response(JSON.stringify({ ok: false, error: 'Update failed.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const row = await ctx.env.DB.prepare(
      `SELECT
        ar_u_morphology,
        canonical_input,
        surface_ar,
        surface_norm,
        pos2,
        derivation_type,
        noun_number,
        verb_form,
        derived_from_verb_form,
        derived_pattern,
        transitivity,
        obj_count,
        tags_ar_json,
        tags_en_json,
        notes,
        meta_json,
        created_at,
        updated_at
      FROM ar_u_morphology
      WHERE ar_u_morphology = ?1`
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, result: mapMorphRow(row) }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const id = normalizeString(url.searchParams.get('id'));
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'id is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await ctx.env.DB.prepare(`DELETE FROM ar_u_morphology WHERE ar_u_morphology = ?1`).bind(id).run();
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
