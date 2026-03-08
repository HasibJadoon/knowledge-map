import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { json, parseBody, readString, readTrimmed, sha256Hex } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const title = readTrimmed(body['title']) ?? 'Podcast Episode';
    const status = readTrimmed(body['status']) ?? 'draft';
    const relatedType = Object.prototype.hasOwnProperty.call(body, 'related_type')
      ? readTrimmed(body['related_type'])
      : null;
    const relatedId = Object.prototype.hasOwnProperty.call(body, 'related_id')
      ? readTrimmed(body['related_id'])
      : null;
    const refsObject = parseJsonField(body['refs_json']) ?? {};
    const contentObject = parseJsonField(body['content_json']) ?? {};

    const canonicalInput = `PODCAST|manual|user:${user.id}|seed:${crypto.randomUUID()}`;
    const id = await sha256Hex(canonicalInput);

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO wv_content_items (
          id,
          canonical_input,
          user_id,
          title,
          content_type,
          status,
          related_type,
          related_id,
          refs_json,
          content_json,
          created_at,
          updated_at
        ) VALUES (
          ?1, ?2, ?3, ?4, 'podcast_episode', ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now')
        )
        `
      )
      .bind(
        id,
        canonicalInput,
        user.id,
        title,
        status,
        relatedType ?? null,
        relatedId ?? null,
        JSON.stringify(refsObject),
        JSON.stringify(contentObject),
      )
      .run();

    const created = await ctx.env.DB
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
      .bind(id, user.id)
      .first<Record<string, unknown>>();

    if (!created) {
      return json({ ok: false, error: 'Podcast episode was not created.' }, 500);
    }

    return json({ ok: true, item: normalizeRow(created) }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create podcast episode.';
    return json({ ok: false, error: message }, 500);
  }
};
