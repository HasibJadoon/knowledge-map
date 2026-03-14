import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../_utils/auth';
import { json } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type Row = Record<string, unknown>;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const db = ctx.env.DB;
    if (!(await hasTable(db, 'wv_sources'))) {
      return json(emptyWorkflowResponse());
    }

    const sources = await listSources(db, user.id);
    if (!sources.length) {
      return json(emptyWorkflowResponse());
    }

    const [units, people, sourcePeople, sourceDetails, notes] = await Promise.all([
      listUnits(db, user.id),
      listPeople(db, user.id),
      listSourcePeople(db, user.id),
      listSourceDetails(db, user.id),
      listNotes(db, user.id),
    ]);

    return json({
      ok: true,
      sources,
      units,
      people,
      source_people: sourcePeople,
      source_details: sourceDetails,
      notes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load worldview workflow.';
    return json({ ok: false, error: message }, 500);
  }
};

async function listSources(db: D1Database, userId: number): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        canonical_input,
        user_id,
        source_type,
        title,
        subtitle,
        description,
        creator,
        publisher,
        publication_year,
        language,
        source_url,
        source_ref,
        status,
        source_json,
        meta_json,
        created_at,
        updated_at
      FROM wv_sources
      WHERE user_id = ?1 OR user_id IS NULL
      ORDER BY COALESCE(updated_at, created_at) DESC, title ASC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function listUnits(db: D1Database, userId: number): Promise<Row[]> {
  if (!(await hasTable(db, 'wv_source_units'))) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT
        u.id,
        u.canonical_input,
        u.source_id,
        u.parent_unit_id,
        u.unit_type,
        u.title,
        u.order_index,
        u.start_ref,
        u.end_ref,
        u.anchor_text,
        u.summary,
        u.unit_json,
        u.meta_json,
        u.created_at,
        u.updated_at
      FROM wv_source_units u
      INNER JOIN wv_sources s ON s.id = u.source_id
      WHERE s.user_id = ?1 OR s.user_id IS NULL
      ORDER BY u.source_id ASC, u.order_index ASC, u.created_at ASC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function listPeople(db: D1Database, userId: number): Promise<Row[]> {
  if (!(await hasTable(db, 'wv_people')) || !(await hasTable(db, 'wv_source_people'))) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT DISTINCT
        p.id,
        p.canonical_input,
        p.display_name,
        p.sort_name,
        p.person_type,
        p.bio_short,
        p.website_url,
        p.meta_json,
        p.created_at,
        p.updated_at
      FROM wv_people p
      INNER JOIN wv_source_people sp ON sp.person_id = p.id
      INNER JOIN wv_sources s ON s.id = sp.source_id
      WHERE s.user_id = ?1 OR s.user_id IS NULL
      ORDER BY p.display_name ASC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function listSourcePeople(db: D1Database, userId: number): Promise<Row[]> {
  if (!(await hasTable(db, 'wv_source_people'))) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT
        sp.id,
        sp.canonical_input,
        sp.source_id,
        sp.person_id,
        sp.role,
        sp.order_index,
        sp.is_primary,
        sp.note,
        sp.created_at,
        sp.updated_at
      FROM wv_source_people sp
      INNER JOIN wv_sources s ON s.id = sp.source_id
      WHERE s.user_id = ?1 OR s.user_id IS NULL
      ORDER BY sp.source_id ASC, sp.order_index ASC, sp.created_at ASC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function listSourceDetails(db: D1Database, userId: number): Promise<Row[]> {
  if (!(await hasTable(db, 'wv_source_details'))) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT
        sd.id,
        sd.canonical_input,
        sd.source_id,
        sd.detail_key,
        sd.detail_value,
        sd.order_index,
        sd.created_at,
        sd.updated_at
      FROM wv_source_details sd
      INNER JOIN wv_sources s ON s.id = sd.source_id
      WHERE s.user_id = ?1 OR s.user_id IS NULL
      ORDER BY sd.source_id ASC, sd.order_index ASC, sd.created_at ASC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function listNotes(db: D1Database, userId: number): Promise<Row[]> {
  if (!(await hasTable(db, 'wv_notes'))) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT
        n.id,
        n.canonical_input,
        n.user_id,
        n.source_id,
        n.source_unit_id,
        n.note_kind,
        n.title,
        n.body_md,
        n.excerpt_text,
        n.locator,
        n.status,
        n.note_json,
        n.meta_json,
        n.created_at,
        n.updated_at
      FROM wv_notes n
      INNER JOIN wv_sources s ON s.id = n.source_id
      WHERE (n.user_id = ?1 OR n.user_id IS NULL)
        AND (s.user_id = ?1 OR s.user_id IS NULL)
      ORDER BY COALESCE(n.updated_at, n.created_at) DESC, n.id DESC
      `
    )
    .bind(userId)
    .all<Row>();

  return result.results ?? [];
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
  const result = await db
    .prepare(
      `
      SELECT 1 AS ok
      FROM sqlite_master
      WHERE type = 'table' AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<{ ok: number }>();

  return !!result?.ok;
}

function emptyWorkflowResponse() {
  return {
    ok: true,
    sources: [],
    units: [],
    people: [],
    source_people: [],
    source_details: [],
    notes: [],
  };
}
