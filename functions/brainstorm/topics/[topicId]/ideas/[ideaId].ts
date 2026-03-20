import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import {
  applyIdeaUpdate,
  ensureBrainstormTable,
  fetchOwnedBrainstormRow,
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
}

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const ideaId = readParam(ctx.params, 'ideaId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const sourceTopic = mapBrainstormRow(row);
    const sourceIdea = sourceTopic.ideas.find((idea) => idea.id === ideaId) ?? null;
    if (!sourceIdea) {
      return json({ ok: false, error: 'Idea not found.' }, 404);
    }

    const timestamp = nowIso();
    const targetTopicId = readTrimmedString(body['topicId']) ?? sourceTopic.id;
    const updatedIdea = applyIdeaUpdate(sourceIdea, body, timestamp);
    if (!updatedIdea) {
      return json({ ok: false, error: 'Idea text cannot be empty.' }, 400);
    }

    if (targetTopicId === sourceTopic.id) {
      const updatedTopic = {
        ...sourceTopic,
        updated_at: timestamp,
        ideas: sourceTopic.ideas.map((idea) => idea.id === ideaId ? updatedIdea : idea),
      };

      await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
      return json({ ok: true, topics: [updatedTopic] });
    }

    const targetRow = await fetchOwnedBrainstormRow(ctx.env.DB, targetTopicId, user.id);
    if (!targetRow) {
      return json({ ok: false, error: 'Target topic not found.' }, 404);
    }

    const targetTopic = mapBrainstormRow(targetRow);
    if (targetTopic.archived) {
      return json({ ok: false, error: 'Target topic is archived.' }, 400);
    }

    const movedIdea = {
      ...updatedIdea,
      topicId: targetTopicId,
      updated_at: timestamp,
    };

    const nextSourceTopic = {
      ...sourceTopic,
      updated_at: timestamp,
      ideas: sourceTopic.ideas.filter((idea) => idea.id !== ideaId),
    };

    const nextTargetTopic = {
      ...targetTopic,
      updated_at: timestamp,
      ideas: [movedIdea, ...targetTopic.ideas],
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, nextSourceTopic);
    await persistBrainstormTopic(ctx.env.DB, targetRow, user.id, nextTargetTopic);

    return json({ ok: true, topics: [nextSourceTopic, nextTargetTopic] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update brainstorm idea.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await ensureBrainstormTable(ctx.env.DB);
    const topicId = readParam(ctx.params, 'topicId');
    const ideaId = readParam(ctx.params, 'ideaId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const topic = mapBrainstormRow(row);
    if (!topic.ideas.some((idea) => idea.id === ideaId)) {
      return json({ ok: false, error: 'Idea not found.' }, 404);
    }

    const updatedTopic = {
      ...topic,
      updated_at: nowIso(),
      ideas: topic.ideas.filter((idea) => idea.id !== ideaId),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topics: [updatedTopic] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete brainstorm idea.';
    return json({ ok: false, error: message }, 500);
  }
};
