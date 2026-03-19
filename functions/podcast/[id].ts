import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { insertActivityLog, json, parseBody, readString, readTrimmed } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

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

function parseJsonField(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeRow(row: Record<string, unknown>) {
  return {
    id: readString(row['id']) ?? '',
    canonical_input: readString(row['canonical_input']) ?? '',
    user_id: Number(row['user_id'] ?? 0),
    title: readString(row['title']) ?? '',
    content_type: readString(row['content_type']) ?? '',
    status: readString(row['status']) ?? 'draft',
    related_type: readString(row['related_type']),
    related_id: readString(row['related_id']),
    refs_json: parseJsonField(row['refs_json']) ?? {},
    content_json: parseJsonField(row['content_json']) ?? {},
    created_at: readString(row['created_at']) ?? '',
    updated_at: readString(row['updated_at']) ?? '',
  };
}

async function fetchOwnedPodcast(db: D1Database, userId: number, id: string) {
  return db
    .prepare(
      `
      SELECT id, canonical_input, user_id, title, content_type, status, related_type, related_id, refs_json, content_json, created_at, updated_at
      FROM wv_content_items
      WHERE id = ?1
        AND user_id = ?2
        AND content_type = 'podcast_episode'
      LIMIT 1
      `
    )
    .bind(id, userId)
    .first<Record<string, unknown>>();
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const podcastId = readParam(ctx.params, 'id');
    if (!podcastId) {
      return json({ ok: false, error: 'Podcast id is required.' }, 400);
    }

    const row = await fetchOwnedPodcast(ctx.env.DB, user.id, podcastId);
    if (!row) {
      return json({ ok: false, error: 'Podcast episode not found.' }, 404);
    }

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'podcast_open',
      targetType: 'wv_content_item',
      targetId: podcastId,
    });

    return json({
      ok: true,
      item: normalizeRow(row),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load podcast episode.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const podcastId = readParam(ctx.params, 'id');
    if (!podcastId) {
      return json({ ok: false, error: 'Podcast id is required.' }, 400);
    }

    const existing = await fetchOwnedPodcast(ctx.env.DB, user.id, podcastId);
    if (!existing) {
      return json({ ok: false, error: 'Podcast episode not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const title = readTrimmed(body['title']) ?? readString(existing['title']) ?? 'Podcast Episode';
    const status = readTrimmed(body['status']) ?? readString(existing['status']) ?? 'draft';
    const relatedType = Object.prototype.hasOwnProperty.call(body, 'related_type')
      ? readTrimmed(body['related_type'])
      : readString(existing['related_type']);
    const relatedId = Object.prototype.hasOwnProperty.call(body, 'related_id')
      ? readTrimmed(body['related_id'])
      : readString(existing['related_id']);

    const refsObject = parseJsonField(body['refs_json']) ?? parseJsonField(existing['refs_json']) ?? {};
    const contentObject =
      parseJsonField(body['content_json']) ?? parseJsonField(existing['content_json']) ?? {};

    await ctx.env.DB
      .prepare(
        `
        UPDATE wv_content_items
        SET title = ?1,
            status = ?2,
            related_type = ?3,
            related_id = ?4,
            refs_json = ?5,
            content_json = ?6,
            updated_at = datetime('now')
        WHERE id = ?7
          AND user_id = ?8
          AND content_type = 'podcast_episode'
        `
      )
      .bind(
        title,
        status,
        relatedType ?? null,
        relatedId ?? null,
        JSON.stringify(refsObject),
        JSON.stringify(contentObject),
        podcastId,
        user.id
      )
      .run();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'podcast_update',
      targetType: 'wv_content_item',
      targetId: podcastId,
      eventJson: {
        status,
        title,
      },
    });

    const updated = await fetchOwnedPodcast(ctx.env.DB, user.id, podcastId);
    if (!updated) {
      return json({ ok: false, error: 'Podcast episode not found after update.' }, 404);
    }

    return json({
      ok: true,
      item: normalizeRow(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save podcast episode.';
    return json({ ok: false, error: message }, 500);
  }
};
