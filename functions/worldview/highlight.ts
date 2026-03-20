import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { asRecord, json, parseBody, readOptionalString, readTrimmed } from '../_utils/sprint';

interface Env {
  DB: D1Database;
}

type CreateHighlightInput = {
  sourceId: string;
  sourceUnitId: string | null;
  selectedText: string;
  locator: string | null;
  anchorText: string | null;
  startOffset: number | null;
  endOffset: number | null;
  color: string | null;
  metaJson: Record<string, unknown> | null;
};

type UpdateHighlightInput = {
  highlightId: string;
  selectedText: string;
  locator: string | null;
  anchorText: string | null;
  startOffset: number | null;
  endOffset: number | null;
  color: string | null;
  metaJson: Record<string, unknown> | null;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (!(await hasTable(ctx.env.DB, 'wv_highlights')) || !(await hasTable(ctx.env.DB, 'wv_sources'))) {
      return json({ ok: false, error: 'Worldview highlight tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeCreateInput(body);
    if (!input) {
      return json({ ok: false, error: 'A source and selected text are required.' }, 400);
    }

    const scope = await readSourceScope(ctx.env.DB, input.sourceId, user.id);
    if (!scope) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    if (input.sourceUnitId && !(await validateUnit(ctx.env.DB, input.sourceId, input.sourceUnitId))) {
      return json({ ok: false, error: 'Selected source unit was not found in this source.' }, 400);
    }

    const suffix = crypto.randomUUID().slice(0, 8);
    const slug = slugify(input.selectedText, 'highlight');
    const highlightId = `wv_hl_${slug}_${suffix}`;
    const canonicalInput = `wv_highlight:${slug}:${suffix}`;
    const sessionId = await resolveLatestSessionId(ctx.env.DB, input.sourceId, input.sourceUnitId, user.id);

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO wv_highlights (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          source_id,
          source_unit_id,
          session_id,
          locator,
          anchor_text,
          selected_text,
          start_offset,
          end_offset,
          color,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        `
      )
      .bind(
        highlightId,
        canonicalInput,
        scope.workspaceId,
        scope.groupId,
        user.id,
        input.sourceId,
        input.sourceUnitId,
        sessionId,
        input.locator,
        input.anchorText,
        input.selectedText,
        input.startOffset,
        input.endOffset,
        input.color,
        input.metaJson ? JSON.stringify(input.metaJson) : null,
      )
      .run();

    return json({ ok: true, highlight_id: highlightId }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create worldview highlight.';
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

    const input = normalizeUpdateInput(body);
    if (!input) {
      return json({ ok: false, error: 'A highlight id and selected text are required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT id
        FROM wv_highlights
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(input.highlightId, user.id)
      .first<{ id?: string }>();

    if (!existing?.id) {
      return json({ ok: false, error: 'Worldview highlight not found.' }, 404);
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE wv_highlights
        SET
          locator = ?2,
          anchor_text = ?3,
          selected_text = ?4,
          start_offset = ?5,
          end_offset = ?6,
          color = ?7,
          meta_json = ?8
        WHERE id = ?1
          AND user_id = ?9
        `
      )
      .bind(
        input.highlightId,
        input.locator,
        input.anchorText,
        input.selectedText,
        input.startOffset,
        input.endOffset,
        input.color,
        input.metaJson ? JSON.stringify(input.metaJson) : null,
        user.id,
      )
      .run();

    return json({ ok: true, highlight_id: input.highlightId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update worldview highlight.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    const row = asRecord(body);
    const highlightId = readTrimmed(row?.['highlightId'] ?? row?.['highlight_id']);
    if (!highlightId) {
      return json({ ok: false, error: 'A highlight id is required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT id
        FROM wv_highlights
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(highlightId, user.id)
      .first<{ id?: string }>();

    if (!existing?.id) {
      return json({ ok: false, error: 'Worldview highlight not found.' }, 404);
    }

    await ctx.env.DB
      .prepare(
        `
        DELETE FROM wv_highlights
        WHERE id = ?1
          AND user_id = ?2
        `
      )
      .bind(highlightId, user.id)
      .run();

    return json({ ok: true, highlight_id: highlightId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete worldview highlight.';
    return json({ ok: false, error: message }, 500);
  }
};

async function readSourceScope(
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

async function validateUnit(db: D1Database, sourceId: string, unitId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT id
      FROM wv_source_units
      WHERE id = ?1
        AND source_id = ?2
      LIMIT 1
      `
    )
    .bind(unitId, sourceId)
    .first<{ id?: string }>();

  return !!row?.id;
}

async function resolveLatestSessionId(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string | null,
  userId: number,
): Promise<string | null> {
  if (!(await hasTable(db, 'wv_reading_sessions'))) {
    return null;
  }

  const row = await db
    .prepare(
      `
      SELECT id
      FROM wv_reading_sessions
      WHERE source_id = ?1
        AND (?2 IS NULL OR source_unit_id = ?2)
        AND (user_id = ?3 OR user_id IS NULL)
      ORDER BY COALESCE(ended_at, started_at, created_at) DESC
      LIMIT 1
      `
    )
    .bind(sourceId, sourceUnitId, userId)
    .first<{ id?: string }>();

  return readTrimmed(row?.id);
}

function normalizeCreateInput(value: unknown): CreateHighlightInput | null {
  const row = asRecord(value);
  const sourceId = readTrimmed(row?.['sourceId'] ?? row?.['source_id']);
  const selectedText = readTrimmed(row?.['selectedText'] ?? row?.['selected_text']);

  if (!sourceId || !selectedText) {
    return null;
  }

  return {
    sourceId,
    sourceUnitId: readOptionalString(row?.['sourceUnitId'] ?? row?.['source_unit_id']),
    selectedText,
    locator: readOptionalString(row?.['locator']),
    anchorText: readOptionalString(row?.['anchorText'] ?? row?.['anchor_text']) ?? selectedText,
    startOffset: readInteger(row?.['startOffset'] ?? row?.['start_offset']),
    endOffset: readInteger(row?.['endOffset'] ?? row?.['end_offset']),
    color: readOptionalString(row?.['color']) ?? 'yellow',
    metaJson: asRecord(row?.['metaJson'] ?? row?.['meta_json']),
  };
}

function normalizeUpdateInput(value: unknown): UpdateHighlightInput | null {
  const row = asRecord(value);
  const highlightId = readTrimmed(row?.['highlightId'] ?? row?.['highlight_id']);
  const highlight = asRecord(row?.['highlight']) ?? row;
  const selectedText = readTrimmed(highlight?.['selectedText'] ?? highlight?.['selected_text']);

  if (!highlightId || !selectedText) {
    return null;
  }

  return {
    highlightId,
    selectedText,
    locator: readOptionalString(highlight?.['locator']),
    anchorText: readOptionalString(highlight?.['anchorText'] ?? highlight?.['anchor_text']) ?? selectedText,
    startOffset: readInteger(highlight?.['startOffset'] ?? highlight?.['start_offset']),
    endOffset: readInteger(highlight?.['endOffset'] ?? highlight?.['end_offset']),
    color: readOptionalString(highlight?.['color']),
    metaJson: asRecord(highlight?.['metaJson'] ?? highlight?.['meta_json']),
  };
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
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
  const row = await db
    .prepare(
      `
      SELECT 1 AS ok
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<{ ok?: number }>();

  return row?.ok === 1;
}
