import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import {
  ensureBrainstormTable,
  fetchOwnedBrainstormRow,
  json,
  mapBrainstormRow,
  nowIso,
  parseBody,
  persistBrainstormTopic,
  readParam,
  readTrimmedString,
  type BrainstormSubtopicDto,
} from '../../../../_utils/brainstorm';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
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

    const title = readTrimmedString(body['title']);
    if (!title) {
      return json({ ok: false, error: 'title must be a non-empty string.' }, 400);
    }

    const topic = mapBrainstormRow(row);
    if (topic.archived) {
      return json({ ok: false, error: 'Archived topics cannot be edited.' }, 400);
    }

    const timestamp = nowIso();
    const subtopic: BrainstormSubtopicDto = {
      id: crypto.randomUUID(),
      topicId,
      title,
      created_at: timestamp,
      updated_at: timestamp,
      ideas: [],
    };

    const updatedTopic = {
      ...topic,
      updated_at: timestamp,
      subtopics: [subtopic, ...topic.subtopics],
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topic: updatedTopic }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create brainstorm subtopic.';
    return json({ ok: false, error: message }, 500);
  }
};
