import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import {
  ensureBrainstormTable,
  fetchOwnedBrainstormRow,
  json,
  mapBrainstormRow,
  nowIso,
  parseBody,
  persistBrainstormTopic,
  readBoolean,
  readParam,
  readTrimmedString,
} from '../../_utils/brainstorm';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    return json({ ok: true, topic: mapBrainstormRow(row) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load brainstorm topic.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const topic = mapBrainstormRow(row);
    const nextTitle = readTrimmedString(body['title']);
    const nextArchived = readBoolean(body['archived']);
    const updatedTopic = {
      ...topic,
      title: nextTitle ?? topic.title,
      archived: nextArchived ?? topic.archived,
      updated_at: nowIso(),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topic: updatedTopic });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update brainstorm topic.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    await ctx.env.DB.prepare(
      'DELETE FROM wv_brainstorm_sessions WHERE id = ?1 AND user_id = ?2'
    ).bind(topicId, user.id).run();

    return json({ ok: true, id: topicId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete brainstorm topic.';
    return json({ ok: false, error: message }, 500);
  }
};
