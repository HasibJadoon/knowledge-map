import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../_utils/auth';
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
  JWT_SECRET: string;
}

type SourceType = 'book' | 'article' | 'lecture' | 'podcast' | 'video' | 'story' | 'paper' | 'conversation' | 'document' | 'other';
type UnitType = 'chapter' | 'section' | 'heading' | 'scene' | 'timestamp' | 'topic' | 'passage' | 'segment' | 'other';

type NormalizedSourceInput = {
  sourceType: SourceType;
  title: string;
  subtitle: string | null;
  description: string | null;
  creator: string | null;
  publisher: string | null;
  publicationYear: number | null;
  language: string | null;
  sourceUrl: string | null;
  sourceRef: string | null;
};

type NormalizedUnitInput = {
  clientId: string;
  parentClientId: string | null;
  unitType: UnitType;
  title: string;
  orderIndex: number;
  startRef: string | null;
  endRef: string | null;
  anchorText: string | null;
  summary: string | null;
  locatorLabel: string | null;
  readingMinutes: number | null;
  readingBody: string[];
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (!(await hasTable(ctx.env.DB, 'wv_sources')) || !(await hasTable(ctx.env.DB, 'wv_source_units'))) {
      return json({ ok: false, error: 'Worldview source tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const source = normalizeSourceInput(body['source']);
    if (!source) {
      return json({ ok: false, error: 'A source title and type are required.' }, 400);
    }

    const units = normalizeUnits(body['units']);
    const scope = await resolveWorldviewScope(ctx.env.DB, user.id);
    if (!scope) {
      return json({ ok: false, error: 'Unable to resolve an active worldview workspace.' }, 400);
    }

    const sourceSlug = slugify(source.title, 'source');
    const sourceSuffix = crypto.randomUUID().slice(0, 8);
    const sourceId = `wv_src_${sourceSlug}_${sourceSuffix}`;
    const sourceCanonicalInput = `wv_source:${sourceSlug}:${sourceSuffix}`;
    const sourceJson = JSON.stringify({ progressPercent: 0 });

    const statements = [
      ctx.env.DB
        .prepare(
          `
          INSERT INTO wv_sources (
            id,
            canonical_input,
            workspace_id,
            group_id,
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
            meta_json
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'active', ?16, NULL)
          `
        )
        .bind(
          sourceId,
          sourceCanonicalInput,
          scope.workspaceId,
          scope.groupId,
          user.id,
          source.sourceType,
          source.title,
          source.subtitle,
          source.description,
          source.creator,
          source.publisher,
          source.publicationYear,
          source.language,
          source.sourceUrl,
          source.sourceRef,
          sourceJson,
        ),
    ];

    const unitIdByClientId = new Map<string, string>();
    const unitIds: string[] = [];

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      if (unit.parentClientId && !unitIdByClientId.has(unit.parentClientId)) {
        return json({ ok: false, error: `Unit "${unit.title}" references a parent that has not been created yet.` }, 400);
      }

      const unitSlug = slugify(unit.title || `${unit.unitType}-${index + 1}`, 'unit');
      const unitSuffix = crypto.randomUUID().slice(0, 8);
      const unitId = `wv_unit_${unitSlug}_${unitSuffix}`;
      const unitCanonicalInput = `wv_source_unit:${sourceSlug}:${unitSlug}:${unitSuffix}`;
      const unitJson = buildUnitJson(unit);

      unitIdByClientId.set(unit.clientId, unitId);
      unitIds.push(unitId);

      statements.push(
        ctx.env.DB
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
            unitCanonicalInput,
            scope.workspaceId,
            scope.groupId,
            user.id,
            sourceId,
            unit.parentClientId ? unitIdByClientId.get(unit.parentClientId) ?? null : null,
            unit.unitType,
            unit.title,
            unit.orderIndex,
            unit.startRef,
            unit.endRef,
            unit.anchorText,
            unit.summary,
            unitJson,
          ),
      );
    }

    await ctx.env.DB.batch(statements);
    return json({ ok: true, source_id: sourceId, unit_ids: unitIds }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create worldview source.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const sourceId = readTrimmed(body['sourceId']);
    const source = normalizeSourceInput(body['source']);
    if (!sourceId || !source) {
      return json({ ok: false, error: 'A source id, title, and type are required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT id
        FROM wv_sources
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(sourceId, user.id)
      .first<{ id: string }>();

    if (!existing) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE wv_sources
        SET
          source_type = ?2,
          title = ?3,
          subtitle = ?4,
          description = ?5,
          creator = ?6,
          publisher = ?7,
          publication_year = ?8,
          language = ?9,
          source_url = ?10,
          source_ref = ?11
        WHERE id = ?1
          AND user_id = ?12
        `
      )
      .bind(
        sourceId,
        source.sourceType,
        source.title,
        source.subtitle,
        source.description,
        source.creator,
        source.publisher,
        source.publicationYear,
        source.language,
        source.sourceUrl,
        source.sourceRef,
        user.id,
      )
      .run();

    return json({ ok: true, source_id: sourceId, unit_ids: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update worldview source.';
    return json({ ok: false, error: message }, 500);
  }
};

async function resolveWorldviewScope(
  db: D1Database,
  userId: number,
): Promise<{ workspaceId: string; groupId: string | null } | null> {
  const existingSource = await db
    .prepare(
      `
      SELECT workspace_id, group_id
      FROM wv_sources
      WHERE user_id = ?1
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
      `
    )
    .bind(userId)
    .first<{ workspace_id?: string; group_id?: string | null }>();

  const workspaceId = readTrimmed(existingSource?.workspace_id)
    ?? (
      await db
        .prepare(
          `
          SELECT w.id
          FROM workspaces w
          LEFT JOIN workspace_members wm
            ON wm.workspace_id = w.id
           AND wm.user_id = ?1
           AND wm.status = 'active'
          WHERE w.status = 'active'
            AND (w.owner_user_id = ?1 OR wm.user_id = ?1)
          ORDER BY CASE WHEN w.owner_user_id = ?1 THEN 0 ELSE 1 END, w.created_at ASC
          LIMIT 1
          `
        )
        .bind(userId)
        .first<{ id?: string }>()
    )?.id;

  if (!workspaceId) {
    return null;
  }

  const groupId = readTrimmed(existingSource?.group_id)
    ?? (
      await db
        .prepare(
          `
          SELECT id
          FROM workspace_groups
          WHERE workspace_id = ?1
            AND status = 'active'
          ORDER BY order_index ASC, created_at ASC
          LIMIT 1
          `
        )
        .bind(workspaceId)
        .first<{ id?: string }>()
    )?.id
    ?? null;

  return { workspaceId, groupId };
}

function normalizeSourceInput(value: unknown): NormalizedSourceInput | null {
  const row = asRecord(value);
  const sourceType = parseSourceType(row?.['sourceType'] ?? row?.['source_type']);
  const title = readTrimmed(row?.['title']);
  const publicationYear = readInteger(row?.['publicationYear'] ?? row?.['publication_year']);

  if (!sourceType || !title) {
    return null;
  }

  if (publicationYear !== null && (publicationYear < 1 || publicationYear > 3000)) {
    return null;
  }

  return {
    sourceType,
    title,
    subtitle: readOptionalString(row?.['subtitle']),
    description: readOptionalString(row?.['description']),
    creator: readOptionalString(row?.['creator']),
    publisher: readOptionalString(row?.['publisher']),
    publicationYear,
    language: readOptionalString(row?.['language']),
    sourceUrl: readOptionalString(row?.['sourceUrl'] ?? row?.['source_url']),
    sourceRef: readOptionalString(row?.['sourceRef'] ?? row?.['source_ref']),
  };
}

function normalizeUnits(value: unknown): NormalizedUnitInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeUnitInput(entry, index))
    .filter((entry): entry is NormalizedUnitInput => entry !== null);
}

function normalizeUnitInput(value: unknown, index: number): NormalizedUnitInput | null {
  const row = asRecord(value);
  const unitType = parseUnitType(row?.['unitType'] ?? row?.['unit_type']);
  const title = readTrimmed(row?.['title']);
  const readingBody = normalizeReadingBody(row?.['readingBody'] ?? row?.['reading_body']);
  const hasContent = !!title || !!readTrimmed(row?.['startRef'] ?? row?.['start_ref']) || !!readTrimmed(row?.['summary']) || readingBody.length > 0;

  if (!hasContent) {
    return null;
  }

  if (!unitType || !title) {
    throw new Error('Each unit needs a title and a valid unit type.');
  }

  return {
    clientId: readTrimmed(row?.['clientId'] ?? row?.['client_id']) ?? `unit-${index + 1}`,
    parentClientId: readTrimmed(row?.['parentClientId'] ?? row?.['parent_client_id']),
    unitType,
    title,
    orderIndex: Math.max(0, readInteger(row?.['orderIndex'] ?? row?.['order_index']) ?? index + 1),
    startRef: readOptionalString(row?.['startRef'] ?? row?.['start_ref']),
    endRef: readOptionalString(row?.['endRef'] ?? row?.['end_ref']),
    anchorText: readOptionalString(row?.['anchorText'] ?? row?.['anchor_text']),
    summary: readOptionalString(row?.['summary']),
    locatorLabel: readOptionalString(row?.['locatorLabel'] ?? row?.['locator_label']),
    readingMinutes: Math.max(0, readInteger(row?.['readingMinutes'] ?? row?.['reading_minutes']) ?? estimateReadingMinutes(readingBody)),
    readingBody,
  };
}

function buildUnitJson(unit: NormalizedUnitInput): string | null {
  const unitJson: Record<string, unknown> = {};

  if (unit.locatorLabel) {
    unitJson['locatorLabel'] = unit.locatorLabel;
  }
  if (unit.readingMinutes) {
    unitJson['readingMinutes'] = unit.readingMinutes;
  }
  if (unit.readingBody.length) {
    unitJson['readingBody'] = unit.readingBody;
  }

  return Object.keys(unitJson).length ? JSON.stringify(unitJson) : null;
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

function parseSourceType(value: unknown): SourceType | null {
  switch (value) {
    case 'book':
    case 'article':
    case 'lecture':
    case 'podcast':
    case 'video':
    case 'story':
    case 'paper':
    case 'conversation':
    case 'document':
    case 'other':
      return value;
    default:
      return null;
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
    .first<{ ok?: number }>();

  return result?.ok === 1;
}
