import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';
import {
  insertActivityLog,
  json,
  parseBody,
  parseCaptureBody,
  readInteger,
  readString,
  readTrimmed,
} from '../../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type PromotionTarget = {
  target_type: string;
  target_id: string;
  container_id?: string | null;
  unit_id?: string | null;
  ref?: string | null;
  extra_json?: Record<string, unknown> | null;
};

function readParam(params: Record<string, unknown> | undefined, key: string): string {
  const value = params?.[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toTargets(input: unknown): PromotionTarget[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      const record = asObject(entry);
      const targetType = readTrimmed(record?.['target_type']);
      const targetId = readTrimmed(record?.['target_id']);
      if (!targetType || !targetId) {
        return null;
      }

      return {
        target_type: targetType,
        target_id: targetId,
        container_id: readTrimmed(record?.['container_id']),
        unit_id: readTrimmed(record?.['unit_id']),
        ref: readTrimmed(record?.['ref']),
        extra_json: asObject(record?.['extra_json']),
      };
    })
    .filter((item): item is PromotionTarget => item !== null);
}

function compactExcerpt(text: string, max = 280): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const captureId = readParam(ctx.params, 'id');
    if (!captureId) {
      return json({ ok: false, error: 'Capture note id is required.' }, 400);
    }

    const captureRow = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, status, body_md, title, created_at, updated_at
        FROM ar_capture_notes
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(captureId, user.id)
      .first<Record<string, unknown>>();

    if (!captureRow) {
      return json({ ok: false, error: 'Capture note not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const captureBody = readString(captureRow['body_md']) ?? '';
    const parsedCapture = parseCaptureBody(captureBody);
    const noteType = readTrimmed(body['note_type']) ?? 'reflection';
    const parsedTitle = readTrimmed(body['title']);
    const title = parsedTitle ?? readTrimmed(captureRow['title']) ?? null;
    const excerpt = readTrimmed(body['excerpt']) ?? compactExcerpt(parsedCapture.text, 500);
    if (!excerpt) {
      return json({ ok: false, error: 'Cannot promote an empty capture note.' }, 400);
    }

    const commentary = readString(body['commentary']) ?? parsedCapture.text;
    const sourceId = readInteger(body['source_id']);
    const locator = readTrimmed(body['locator']) ?? parsedCapture.meta?.ref ?? null;
    const extraJson = asObject(body['extra_json']) ?? {
      promoted_from_capture_id: captureId,
      capture_meta: parsedCapture.meta,
    };

    const noteInsert = await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_notes (user_id, note_type, title, excerpt, commentary, source_id, locator, extra_json, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
        `
      )
      .bind(
        user.id,
        noteType,
        title,
        excerpt,
        commentary,
        sourceId,
        locator,
        JSON.stringify(extraJson)
      )
      .run();

    const insertedId = Number(noteInsert.meta?.last_row_id ?? 0);
    if (!Number.isInteger(insertedId) || insertedId <= 0) {
      return json({ ok: false, error: 'Failed to create structured note.' }, 500);
    }

    const targets = toTargets(body['targets']);
    if (targets.length === 0 && parsedCapture.meta?.related_type && parsedCapture.meta?.related_id) {
      targets.push({
        target_type: parsedCapture.meta.related_type,
        target_id: parsedCapture.meta.related_id,
        container_id: parsedCapture.meta.container_id ?? null,
        unit_id: parsedCapture.meta.unit_id ?? null,
        ref: parsedCapture.meta.ref ?? null,
        extra_json: null,
      });
    }

    for (const target of targets) {
      await ctx.env.DB
        .prepare(
          `
          INSERT OR IGNORE INTO ar_note_targets
            (note_id, target_type, target_id, relation, strength, share_scope, edge_note, container_id, unit_id, ref, extra_json, created_at)
          VALUES
            (?1, ?2, ?3, 'about', NULL, 'private', NULL, ?4, ?5, ?6, ?7, datetime('now'))
          `
        )
        .bind(
          insertedId,
          target.target_type,
          target.target_id,
          target.container_id ?? null,
          target.unit_id ?? null,
          target.ref ?? null,
          target.extra_json ? JSON.stringify(target.extra_json) : null
        )
        .run();
    }

    await ctx.env.DB
      .prepare(
        `
        UPDATE ar_capture_notes
        SET status = 'archived',
            updated_at = datetime('now')
        WHERE id = ?1
          AND user_id = ?2
        `
      )
      .bind(captureId, user.id)
      .run();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'capture_note_promote',
      targetType: 'ar_notes',
      targetId: String(insertedId),
      ref: parsedCapture.meta?.week_start ?? null,
      eventJson: {
        capture_note_id: captureId,
        target_count: targets.length,
      },
    });

    const noteRow = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, note_type, title, excerpt, commentary, source_id, locator, extra_json, created_at, updated_at
        FROM ar_notes
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(insertedId, user.id)
      .first<Record<string, unknown>>();

    const targetRows = await ctx.env.DB
      .prepare(
        `
        SELECT note_id, target_type, target_id, relation, container_id, unit_id, ref, extra_json, created_at
        FROM ar_note_targets
        WHERE note_id = ?1
        ORDER BY created_at DESC
        `
      )
      .bind(insertedId)
      .all<Record<string, unknown>>();

    return json({
      ok: true,
      note: noteRow ?? null,
      targets: targetRows.results ?? [],
      capture_note_id: captureId,
      archived: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to promote capture note.';
    return json({ ok: false, error: message }, 500);
  }
};
