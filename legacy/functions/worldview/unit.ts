import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import {
  asRecord,
  json,
  parseBody,
  readInteger,
  readOptionalString,
  readTrimmed,
} from '../_utils/sprint';
import {
  buildChapterDocumentTitle,
  createEmptyWorldviewStudyNoteDocument,
} from './_document-tiptap';

interface Env {
  DB: D1Database;
}

type UnitType = 'chapter' | 'section' | 'heading' | 'scene' | 'timestamp' | 'topic' | 'passage' | 'segment' | 'other';

type NormalizedUnitInput = {
  sourceId: string;
  parentUnitId: string | null;
  unitType: UnitType;
  title: string;
  orderIndex: number | null;
  startRef: string | null;
  endRef: string | null;
  anchorText: string | null;
  summary: string | null;
  locatorLabel: string | null;
};

type UnitScope = {
  workspaceId: string;
  groupId: string | null;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const unit = normalizeUnitInput(body);
    if (!unit) {
      return json({ ok: false, error: 'A source id, title, and valid unit type are required.' }, 400);
    }

    const scope = await readUnitScope(ctx.env.DB, unit.sourceId, user.id);
    if (!scope) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    if (unit.parentUnitId && !(await validateParent(ctx.env.DB, unit.sourceId, unit.parentUnitId, user.id))) {
      return json({ ok: false, error: 'Selected parent unit was not found in this source.' }, 400);
    }

    const orderIndex = unit.orderIndex ?? (await nextOrderIndex(ctx.env.DB, unit.sourceId, unit.parentUnitId));
    const unitSlug = slugify(unit.title, 'unit');
    const suffix = crypto.randomUUID().slice(0, 8);
    const unitId = `wv_unit_${unitSlug}_${suffix}`;
    const canonicalInput = `wv_source_unit:${slugify(unit.sourceId, 'source')}:${unitSlug}:${suffix}`;

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO wv_source_units (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          source_id,
          parent_unit_id,
          unit_type,
          title,
          order_index,
          start_ref,
          end_ref,
          anchor_text,
          summary,
          unit_json,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, NULL)
        `
      )
      .bind(
        unitId,
        canonicalInput,
        scope.workspaceId,
        scope.groupId,
        user.id,
        unit.sourceId,
        unit.parentUnitId,
        unit.unitType,
        unit.title,
        orderIndex,
        unit.startRef,
        unit.endRef,
        unit.anchorText,
        unit.summary,
        buildUnitJson(unit),
      )
      .run();

    if (unit.unitType === 'chapter') {
      await ensureChapterStudyDocument(ctx.env.DB, {
        ...scope,
        userId: user.id,
        sourceId: unit.sourceId,
        sourceUnitId: unitId,
        unitTitle: unit.title,
        unitSummary: unit.summary,
      });
    }

    return json({ ok: true, unit_id: unitId }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create worldview unit.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const unitId = readTrimmed(body['unitId']);
    const unit = normalizeUnitInput(body['unit']);
    if (!unitId || !unit) {
      return json({ ok: false, error: 'A unit id, title, and valid unit type are required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT
          u.id,
          u.source_id,
          u.unit_json,
          u.order_index
        FROM wv_source_units u
        INNER JOIN wv_sources s ON s.id = u.source_id
        WHERE u.id = ?1
          AND s.user_id = ?2
        LIMIT 1
        `
      )
      .bind(unitId, user.id)
      .first<{ id?: string; source_id?: string; unit_json?: string | null; order_index?: number }>();

    if (!existing?.id || !existing.source_id) {
      return json({ ok: false, error: 'Worldview unit not found.' }, 404);
    }

    if (unit.sourceId !== existing.source_id) {
      return json({ ok: false, error: 'Unit source cannot be changed.' }, 400);
    }

    const scope = await readUnitScope(ctx.env.DB, unit.sourceId, user.id);
    if (!scope) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    if (unit.parentUnitId && !(await validateParent(ctx.env.DB, unit.sourceId, unit.parentUnitId, user.id))) {
      return json({ ok: false, error: 'Selected parent unit was not found in this source.' }, 400);
    }

    if (unit.parentUnitId && unit.parentUnitId === unitId) {
      return json({ ok: false, error: 'A unit cannot be its own parent.' }, 400);
    }

    if (unit.parentUnitId && (await createsCycle(ctx.env.DB, unit.parentUnitId, unitId))) {
      return json({ ok: false, error: 'That parent would create a nested cycle.' }, 400);
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE wv_source_units
        SET
          parent_unit_id = ?2,
          unit_type = ?3,
          title = ?4,
          order_index = ?5,
          start_ref = ?6,
          end_ref = ?7,
          anchor_text = ?8,
          summary = ?9,
          unit_json = ?10
        WHERE id = ?1
        `
      )
      .bind(
        unitId,
        unit.parentUnitId,
        unit.unitType,
        unit.title,
        unit.orderIndex ?? readInteger(existing.order_index) ?? (await nextOrderIndex(ctx.env.DB, unit.sourceId, unit.parentUnitId, unitId)),
        unit.startRef,
        unit.endRef,
        unit.anchorText,
        unit.summary,
        buildUnitJson(unit),
      )
      .run();

    if (unit.unitType === 'chapter') {
      await ensureChapterStudyDocument(ctx.env.DB, {
        ...scope,
        userId: user.id,
        sourceId: unit.sourceId,
        sourceUnitId: unitId,
        unitTitle: unit.title,
        unitSummary: unit.summary,
      });
    }

    return json({ ok: true, unit_id: unitId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update worldview unit.';
    return json({ ok: false, error: message }, 500);
  }
};

async function readUnitScope(
  db: D1Database,
  sourceId: string,
  userId: number,
): Promise<UnitScope | null> {
  const row = await db
    .prepare(
      `
      SELECT workspace_id, group_id
      FROM wv_sources
      WHERE id = ?1
        AND user_id = ?2
      LIMIT 1
      `
    )
    .bind(sourceId, userId)
    .first<{ workspace_id?: string; group_id?: string | null }>();

  const workspaceId = readTrimmed(row?.workspace_id);
  if (!workspaceId) {
    return null;
  }

  return {
    workspaceId,
    groupId: readTrimmed(row?.group_id),
  };
}

async function validateParent(db: D1Database, sourceId: string, parentUnitId: string, userId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT u.id
      FROM wv_source_units u
      INNER JOIN wv_sources s ON s.id = u.source_id
      WHERE u.id = ?1
        AND u.source_id = ?2
        AND s.user_id = ?3
      LIMIT 1
      `
    )
    .bind(parentUnitId, sourceId, userId)
    .first<{ id?: string }>();

  return !!row?.id;
}

async function nextOrderIndex(
  db: D1Database,
  sourceId: string,
  parentUnitId: string | null,
  excludeUnitId?: string,
): Promise<number> {
  const row = await db
    .prepare(
      `
      SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order
      FROM wv_source_units
      WHERE source_id = ?1
        AND ifnull(parent_unit_id, '') = ifnull(?2, '')
        AND (?3 IS NULL OR id <> ?3)
      `
    )
    .bind(sourceId, parentUnitId, excludeUnitId ?? null)
    .first<{ next_order?: number }>();

  return Math.max(1, readInteger(row?.next_order) ?? 1);
}

async function createsCycle(db: D1Database, parentUnitId: string, unitId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      WITH RECURSIVE lineage(id, parent_unit_id) AS (
        SELECT id, parent_unit_id
        FROM wv_source_units
        WHERE id = ?1
        UNION ALL
        SELECT u.id, u.parent_unit_id
        FROM wv_source_units u
        INNER JOIN lineage l ON u.id = l.parent_unit_id
      )
      SELECT 1 AS has_cycle
      FROM lineage
      WHERE id = ?2
      LIMIT 1
      `
    )
    .bind(parentUnitId, unitId)
    .first<{ has_cycle?: number }>();

  return row?.has_cycle === 1;
}

function normalizeUnitInput(value: unknown): NormalizedUnitInput | null {
  const row = asRecord(value);
  const sourceId = readTrimmed(row?.['sourceId'] ?? row?.['source_id']);
  const unitType = parseUnitType(row?.['unitType'] ?? row?.['unit_type']);
  const title = readTrimmed(row?.['title']);

  if (!sourceId || !unitType || !title) {
    return null;
  }

  return {
    sourceId,
    parentUnitId: readTrimmed(row?.['parentUnitId'] ?? row?.['parent_unit_id']),
    unitType,
    title,
    orderIndex: readInteger(row?.['orderIndex'] ?? row?.['order_index']),
    startRef: readOptionalString(row?.['startRef'] ?? row?.['start_ref']),
    endRef: readOptionalString(row?.['endRef'] ?? row?.['end_ref']),
    anchorText: readOptionalString(row?.['anchorText'] ?? row?.['anchor_text']),
    summary: readOptionalString(row?.['summary']),
    locatorLabel: readOptionalString(row?.['locatorLabel'] ?? row?.['locator_label']),
  };
}

function buildUnitJson(unit: NormalizedUnitInput): string | null {
  const unitJson: Record<string, unknown> = {};

  if (unit.locatorLabel) {
    unitJson['locatorLabel'] = unit.locatorLabel;
  }

  return Object.keys(unitJson).length ? JSON.stringify(unitJson) : null;
}

async function ensureChapterStudyDocument(
  db: D1Database,
  input: UnitScope & {
    userId: number;
    sourceId: string;
    sourceUnitId: string;
    unitTitle: string;
    unitSummary: string | null;
  },
): Promise<void> {
  const existing = await db
    .prepare(
      `
      SELECT id, title, summary, meta_json
      FROM wv_documents
      WHERE doc_type = 'study_note'
        AND domain = 'worldview'
        AND (
          source_unit_id = ?1
          OR unit_id = ?1
        )
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
      `
    )
    .bind(input.sourceUnitId)
    .first<{ id?: string; title?: string; summary?: string | null; meta_json?: string | null }>();

  const defaultTitle = buildChapterDocumentTitle(input.unitTitle);
  const defaultMeta = JSON.stringify({
    auto_created_from_unit: true,
    source_id: input.sourceId,
    source_unit_id: input.sourceUnitId,
  });

  if (!existing?.id) {
    const docId = `wv_doc_${slugify(input.sourceId, 'source')}_${slugify(input.sourceUnitId, 'unit')}_study`;
    const canonicalInput = `wv_document:worldview:${slugify(input.sourceId, 'source')}:${slugify(input.sourceUnitId, 'unit')}:study_note`;

    await db
      .prepare(
        `
        INSERT OR IGNORE INTO wv_documents (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          doc_type,
          title,
          summary,
          status,
          unit_id,
          domain,
          source_id,
          source_unit_id,
          document_json,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, 'study_note', ?6, ?7, 'active', ?8, 'worldview', ?9, ?10, ?11, ?12)
        `
      )
      .bind(
        docId,
        canonicalInput,
        input.workspaceId,
        input.groupId,
        input.userId,
        defaultTitle,
        input.unitSummary,
        input.sourceUnitId,
        input.sourceId,
        input.sourceUnitId,
        JSON.stringify(createEmptyWorldviewStudyNoteDocument()),
        defaultMeta,
      )
      .run();
    return;
  }

  const metaJson = parseJsonRecord(existing.meta_json);
  const autoCreated = metaJson['auto_created_from_unit'] === true
    || metaJson['auto_created_from_unit'] === 1
    || metaJson['auto_created_from_unit'] === '1';

  await db
    .prepare(
      `
      UPDATE wv_documents
      SET
        title = CASE
          WHEN ?2 = 1 THEN ?3
          ELSE title
        END,
        summary = COALESCE(?4, summary),
        unit_id = ?5,
        source_id = ?6,
        source_unit_id = ?7,
        domain = 'worldview',
        meta_json = COALESCE(
          json_set(
            COALESCE(meta_json, json('{}')),
            '$.source_id', ?6,
            '$.source_unit_id', ?7,
            '$.auto_created_from_unit', COALESCE(json_extract(meta_json, '$.auto_created_from_unit'), true)
          ),
          ?8
        ),
        updated_at = datetime('now')
      WHERE id = ?1
      `
    )
    .bind(
      existing.id,
      autoCreated ? 1 : 0,
      defaultTitle,
      input.unitSummary,
      input.sourceUnitId,
      input.sourceId,
      input.sourceUnitId,
      defaultMeta,
    )
    .run();
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed) ?? {};
  } catch {
    return {};
  }
}

function parseUnitType(value: unknown): UnitType | null {
  switch (value) {
    case 'chapter':
    case 'section':
    case 'heading':
    case 'scene':
    case 'timestamp':
    case 'topic':
    case 'passage':
    case 'segment':
    case 'other':
      return value;
    default:
      return null;
  }
}

function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return normalized || fallback;
}
