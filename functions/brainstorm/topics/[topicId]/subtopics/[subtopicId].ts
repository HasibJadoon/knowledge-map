import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../../_utils/auth';
import {
  ensureBrainstormTable,
  fetchOwnedBrainstormRow,
  findSubtopic,
  json,
  mapBrainstormRow,
  nowIso,
  parseBody,
  persistBrainstormTopic,
  readParam,
  readTrimmedString,
} from '../../../../_utils/brainstorm';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const subtopicId = readParam(ctx.params, 'subtopicId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const topic = mapBrainstormRow(row);
    const subtopic = findSubtopic(topic, subtopicId);
    if (!subtopic) {
      return json({ ok: false, error: 'Subtopic not found.' }, 404);
    }

    const nextTitle = readTrimmedString(body['title']);
    if (!nextTitle) {
      return json({ ok: false, error: 'title must be a non-empty string.' }, 400);
    }

    const timestamp = nowIso();
    const updatedTopic = {
      ...topic,
      updated_at: timestamp,
      subtopics: topic.subtopics.map((entry) => entry.id === subtopicId
        ? {
            ...entry,
            title: nextTitle,
            updated_at: timestamp,
          }
        : entry),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topic: updatedTopic });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update brainstorm subtopic.';
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
    const subtopicId = readParam(ctx.params, 'subtopicId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const topic = mapBrainstormRow(row);
    if (!findSubtopic(topic, subtopicId)) {
      return json({ ok: false, error: 'Subtopic not found.' }, 404);
    }

    const updatedTopic = {
      ...topic,
      updated_at: nowIso(),
      subtopics: topic.subtopics.filter((entry) => entry.id !== subtopicId),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topic: updatedTopic });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete brainstorm subtopic.';
    return json({ ok: false, error: message }, 500);
  }
};
