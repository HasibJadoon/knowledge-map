import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import {
  ensureBrainstormTable,
  insertBrainstormTopic,
  json,
  listOwnedBrainstormRows,
  mapBrainstormRow,
  nowIso,
  parseBody,
  readTrimmedString,
  type BrainstormTopicDto,
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
    const url = new URL(ctx.request.url);
    const includeArchived = url.searchParams.get('include_archived') === 'true';
    const topics = (await listOwnedBrainstormRows(ctx.env.DB, user.id))
      .map(mapBrainstormRow)
      .filter((topic) => includeArchived || !topic.archived);

    return json({ ok: true, topics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load brainstorm topics.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const title = readTrimmedString(body['title']);
    if (!title) {
      return json({ ok: false, error: 'title must be a non-empty string.' }, 400);
    }

    const timestamp = nowIso();
    const topic: BrainstormTopicDto = {
      id: crypto.randomUUID(),
      title,
      created_at: timestamp,
      updated_at: timestamp,
      archived: false,
      subtopics: [],
    };

    await insertBrainstormTopic(ctx.env.DB, user.id, topic);
    return json({ ok: true, topic }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create brainstorm topic.';
    return json({ ok: false, error: message }, 500);
  }
};
