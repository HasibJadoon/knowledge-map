import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import {
  asRecord,
  json,
  parseBody,
  readInteger,
  readOptionalString,
  readTrimmed,
} from '../_utils/sprint';

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
  readingMinutes: number | null;
  readingSchema: string | null;
  hasReadingSchema: boolean;
  readingBody: string[];
  readingBlocks: Record<string, unknown>[] | null;
  hasReadingBlocks: boolean;
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
        buildUnitJson(unit, null),
      )
      .run();

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
        buildUnitJson(unit, existing.unit_json),
      )
      .run();

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
): Promise<{ workspaceId: string; groupId: string | null } | null> {
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
  const readingBody = normalizeReadingBody(row?.['readingBody'] ?? row?.['reading_body']);
  const hasReadingSchema = Object.prototype.hasOwnProperty.call(row ?? {}, 'readingSchema')
    || Object.prototype.hasOwnProperty.call(row ?? {}, 'reading_schema');
  const readingSchema = readOptionalString(row?.['readingSchema'] ?? row?.['reading_schema']);
  const hasReadingBlocks = Object.prototype.hasOwnProperty.call(row ?? {}, 'readingBlocks')
    || Object.prototype.hasOwnProperty.call(row ?? {}, 'reading_blocks');
  const readingBlocks = normalizeReadingBlocks(row?.['readingBlocks'] ?? row?.['reading_blocks']);

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
    readingMinutes: Math.max(0, readInteger(row?.['readingMinutes'] ?? row?.['reading_minutes']) ?? estimateReadingMinutes(readingBody)),
    readingSchema,
    hasReadingSchema,
    readingBody,
    readingBlocks,
    hasReadingBlocks,
  };
}

function buildUnitJson(unit: NormalizedUnitInput, existingJson: string | null): string | null {
  const current = parseJsonRecord(existingJson);
  const unitJson: Record<string, unknown> = { ...current };

  if (unit.locatorLabel) {
    unitJson['locatorLabel'] = unit.locatorLabel;
  } else {
    delete unitJson['locatorLabel'];
    delete unitJson['locator_label'];
  }

  if (unit.readingMinutes != null) {
    unitJson['readingMinutes'] = unit.readingMinutes;
  } else {
    delete unitJson['readingMinutes'];
    delete unitJson['reading_minutes'];
  }

  if (unit.hasReadingSchema) {
    if (unit.readingSchema) {
      unitJson['readingSchema'] = unit.readingSchema;
    } else {
      delete unitJson['readingSchema'];
      delete unitJson['reading_schema'];
    }
  }

  if (unit.readingBody.length) {
    unitJson['readingBody'] = unit.readingBody;
  } else {
    delete unitJson['readingBody'];
    delete unitJson['reading_body'];
  }

  if (unit.hasReadingBlocks) {
    if (unit.readingBlocks?.length) {
      unitJson['readingBlocks'] = unit.readingBlocks;
    } else {
      delete unitJson['readingBlocks'];
      delete unitJson['reading_blocks'];
    }
  }

  return Object.keys(unitJson).length ? JSON.stringify(unitJson) : null;
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

function normalizeReadingBody(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => readTrimmed(entry)).filter((entry): entry is string => entry != null);
}

function estimateReadingMinutes(readingBody: string[]): number {
  const wordCount = readingBody
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (!wordCount) {
    return 0;
  }

  return Math.max(1, Math.round(wordCount / 180));
}

function normalizeReadingBlocks(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const blocks = value.filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry),
  );

  return blocks.length ? blocks : null;
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
