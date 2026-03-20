import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
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
  readString,
  readStringArray,
  readTrimmedString,
  type BrainstormIdeaDto,
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

    const text = readTrimmedString(body['text']);
    if (!text) {
      return json({ ok: false, error: 'text must be a non-empty string.' }, 400);
    }

    const topic = mapBrainstormRow(row);
    const timestamp = nowIso();
    const idea: BrainstormIdeaDto = {
      id: crypto.randomUUID(),
      topicId,
      text,
      created_at: timestamp,
      updated_at: timestamp,
      highlighted: readBoolean(body['highlighted']) ?? false,
      pinned: readBoolean(body['pinned']) ?? false,
      tags: readStringArray(body['tags']),
      reference: readString(body['reference'])?.trim() ?? '',
      context: readString(body['context'])?.trim() ?? '',
    };

    const updatedTopic = {
      ...topic,
      updated_at: timestamp,
      ideas: [idea, ...topic.ideas],
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topics: [updatedTopic] }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create brainstorm idea.';
    return json({ ok: false, error: message }, 500);
  }
};
