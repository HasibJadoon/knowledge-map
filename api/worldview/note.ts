import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../_utils/auth';
import { asRecord, json, parseBody, readOptionalString, readTrimmed } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type NoteKind =
  | 'quote'
  | 'summary'
  | 'reflection'
  | 'question'
  | 'claim_seed'
  | 'insight'
  | 'observation'
  | 'reference'
  | 'todo'
  | 'idea';

type CreateNoteInput = {
  sourceId: string;
  sourceUnitId: string | null;
  noteKind: NoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
  locator: string | null;
  highlightId: string | null;
};

type UpdateNoteInput = {
  noteId: string;
  noteKind: NoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
  locator: string | null;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (!(await hasTable(ctx.env.DB, 'wv_notes')) || !(await hasTable(ctx.env.DB, 'wv_sources'))) {
      return json({ ok: false, error: 'Worldview note tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeCreateInput(body);
    if (!input) {
      return json({ ok: false, error: 'A source, note type, and note body are required.' }, 400);
    }

    const scope = await readSourceScope(ctx.env.DB, input.sourceId, user.id);
    if (!scope) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    if (input.sourceUnitId && !(await validateUnit(ctx.env.DB, input.sourceId, input.sourceUnitId))) {
      return json({ ok: false, error: 'Selected source unit was not found in this source.' }, 400);
    }

    if (input.highlightId && !(await validateHighlight(ctx.env.DB, input.highlightId, input.sourceId, user.id))) {
      return json({ ok: false, error: 'Selected highlight was not found in this source.' }, 400);
    }

    const suffix = crypto.randomUUID().slice(0, 8);
    const slug = slugify(input.title || input.bodyMd, 'note');
    const noteId = `wv_note_${slug}_${suffix}`;
    const canonicalInput = `wv_note:${slug}:${suffix}`;
    const sessionId = await resolveLatestSessionId(ctx.env.DB, input.sourceId, input.sourceUnitId, user.id);

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO wv_notes (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          source_id,
          source_unit_id,
          session_id,
          highlight_id,
          note_kind,
          title,
          body_md,
          excerpt_text,
          locator,
          status,
          note_json,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 'active', NULL, NULL)
        `
      )
      .bind(
        noteId,
        canonicalInput,
        scope.workspaceId,
        scope.groupId,
        user.id,
        input.sourceId,
        input.sourceUnitId,
        sessionId,
        input.highlightId,
        input.noteKind,
        input.title,
        input.bodyMd,
        input.excerptText,
        input.locator,
      )
      .run();

    return json({ ok: true, note_id: noteId }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create worldview note.';
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

    const input = normalizeUpdateInput(body);
    if (!input) {
      return json({ ok: false, error: 'A note id, note type, and note body are required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT id
        FROM wv_notes
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(input.noteId, user.id)
      .first<{ id?: string }>();

    if (!existing?.id) {
      return json({ ok: false, error: 'Worldview note not found.' }, 404);
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE wv_notes
        SET
          note_kind = ?2,
          title = ?3,
          body_md = ?4,
          excerpt_text = ?5,
          locator = ?6
        WHERE id = ?1
          AND user_id = ?7
        `
      )
      .bind(
        input.noteId,
        input.noteKind,
        input.title,
        input.bodyMd,
        input.excerptText,
        input.locator,
        user.id,
      )
      .run();

    return json({ ok: true, note_id: input.noteId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update worldview note.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    const row = asRecord(body);
    const noteId = readTrimmed(row?.['noteId'] ?? row?.['note_id']);
    if (!noteId) {
      return json({ ok: false, error: 'A note id is required.' }, 400);
    }

    const existing = await ctx.env.DB
      .prepare(
        `
        SELECT id
        FROM wv_notes
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(noteId, user.id)
      .first<{ id?: string }>();

    if (!existing?.id) {
      return json({ ok: false, error: 'Worldview note not found.' }, 404);
    }

    await ctx.env.DB
      .prepare(
        `
        DELETE FROM wv_notes
        WHERE id = ?1
          AND user_id = ?2
        `
      )
      .bind(noteId, user.id)
      .run();

    return json({ ok: true, note_id: noteId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete worldview note.';
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

async function validateHighlight(db: D1Database, highlightId: string, sourceId: string, userId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT h.id
      FROM wv_highlights h
      INNER JOIN wv_sources s ON s.id = h.source_id
      WHERE h.id = ?1
        AND h.source_id = ?2
        AND (h.user_id = ?3 OR h.user_id IS NULL)
        AND (s.user_id = ?3 OR s.user_id IS NULL)
      LIMIT 1
      `
    )
    .bind(highlightId, sourceId, userId)
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

function normalizeCreateInput(value: unknown): CreateNoteInput | null {
  const row = asRecord(value);
  const sourceId = readTrimmed(row?.['sourceId'] ?? row?.['source_id']);
  const noteKind = parseNoteKind(row?.['noteKind'] ?? row?.['note_kind']);
  const bodyMd = readTrimmed(row?.['bodyMd'] ?? row?.['body_md']);

  if (!sourceId || !noteKind || !bodyMd) {
    return null;
  }

  return {
    sourceId,
    sourceUnitId: readOptionalString(row?.['sourceUnitId'] ?? row?.['source_unit_id']),
    noteKind,
    title: readOptionalString(row?.['title']),
    bodyMd,
    excerptText: readOptionalString(row?.['excerptText'] ?? row?.['excerpt_text']),
    locator: readOptionalString(row?.['locator']),
    highlightId: readOptionalString(row?.['highlightId'] ?? row?.['highlight_id']),
  };
}

function normalizeUpdateInput(value: unknown): UpdateNoteInput | null {
  const row = asRecord(value);
  const noteId = readTrimmed(row?.['noteId'] ?? row?.['note_id']);
  const note = asRecord(row?.['note']) ?? row;
  const noteKind = parseNoteKind(note?.['noteKind'] ?? note?.['note_kind']);
  const bodyMd = readTrimmed(note?.['bodyMd'] ?? note?.['body_md']);

  if (!noteId || !noteKind || !bodyMd) {
    return null;
  }

  return {
    noteId,
    noteKind,
    title: readOptionalString(note?.['title']),
    bodyMd,
    excerptText: readOptionalString(note?.['excerptText'] ?? note?.['excerpt_text']),
    locator: readOptionalString(note?.['locator']),
  };
}

function parseNoteKind(value: unknown): NoteKind | null {
  switch (value) {
    case 'quote':
    case 'summary':
    case 'reflection':
    case 'question':
    case 'claim_seed':
    case 'insight':
    case 'observation':
    case 'reference':
    case 'todo':
    case 'idea':
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
