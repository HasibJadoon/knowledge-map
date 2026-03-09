import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../../../../_utils/auth';
import {
  ensureBrainstormTable,
  fetchBrainstormIdeaAuthor,
  fetchOwnedBrainstormRow,
  findSubtopic,
  json,
  mapBrainstormRow,
  nowIso,
  parseBody,
  persistBrainstormTopic,
  readBoolean,
  readParam,
  readString,
  readStringArray,
  readTrimmedString,
  type BrainstormIdeaDto,
} from '../../../../../../_utils/brainstorm';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
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

    const text = readTrimmedString(body['text']);
    if (!text) {
      return json({ ok: false, error: 'text must be a non-empty string.' }, 400);
    }

    const topic = mapBrainstormRow(row);
    const subtopic = findSubtopic(topic, subtopicId);
    if (!subtopic) {
      return json({ ok: false, error: 'Subtopic not found.' }, 404);
    }

    const timestamp = nowIso();
    const author = await fetchBrainstormIdeaAuthor(ctx.env.DB, user.id);
    const idea: BrainstormIdeaDto = {
      id: crypto.randomUUID(),
      topicId,
      subtopicId,
      text,
      created_at: timestamp,
      updated_at: timestamp,
      highlighted: readBoolean(body['highlighted']) ?? false,
      pinned: readBoolean(body['pinned']) ?? false,
      tags: readStringArray(body['tags']),
      reference: readString(body['reference'])?.trim() ?? '',
      context: readString(body['context'])?.trim() ?? '',
      author,
    };

    const updatedTopic = {
      ...topic,
      updated_at: timestamp,
      subtopics: topic.subtopics.map((entry) => entry.id === subtopicId
        ? {
            ...entry,
            updated_at: timestamp,
            ideas: [idea, ...entry.ideas],
          }
        : entry),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topics: [updatedTopic] }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create brainstorm idea.';
    return json({ ok: false, error: message }, 500);
  }
};
