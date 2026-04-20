import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import {
  applyIdeaUpdate,
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
} from '../../../../../../_utils/brainstorm';

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
    const subtopicId = readParam(ctx.params, 'subtopicId');
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
    const sourceSubtopic = findSubtopic(sourceTopic, subtopicId);
    const sourceIdea = sourceSubtopic?.ideas.find((idea) => idea.id === ideaId) ?? null;
    if (!sourceSubtopic || !sourceIdea) {
      return json({ ok: false, error: 'Idea not found.' }, 404);
    }

    const timestamp = nowIso();
    const targetTopicId = readTrimmedString(body['topicId']) ?? sourceTopic.id;
    const targetSubtopicId = readTrimmedString(body['subtopicId']) ?? sourceSubtopic.id;
    const updatedIdea = applyIdeaUpdate(sourceIdea, body, timestamp);
    if (!updatedIdea) {
      return json({ ok: false, error: 'Idea text cannot be empty.' }, 400);
    }

    if (targetTopicId === sourceTopic.id) {
      const targetSubtopic = findSubtopic(sourceTopic, targetSubtopicId);
      if (!targetSubtopic) {
        return json({ ok: false, error: 'Target subtopic not found.' }, 404);
      }

      const movedIdea = {
        ...updatedIdea,
        topicId: targetTopicId,
        subtopicId: targetSubtopicId,
        updated_at: timestamp,
      };

      const updatedTopic = {
        ...sourceTopic,
        updated_at: timestamp,
        subtopics: sourceTopic.subtopics.map((entry) => {
          if (entry.id === sourceSubtopic.id && entry.id === targetSubtopicId) {
            return {
              ...entry,
              updated_at: timestamp,
              ideas: entry.ideas.map((idea) => idea.id === ideaId ? movedIdea : idea),
            };
          }

          if (entry.id === sourceSubtopic.id) {
            return {
              ...entry,
              updated_at: timestamp,
              ideas: entry.ideas.filter((idea) => idea.id !== ideaId),
            };
          }

          if (entry.id === targetSubtopicId) {
            return {
              ...entry,
              updated_at: timestamp,
              ideas: [movedIdea, ...entry.ideas],
            };
          }

          return entry;
        }),
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

    const targetSubtopic = findSubtopic(targetTopic, targetSubtopicId);
    if (!targetSubtopic) {
      return json({ ok: false, error: 'Target subtopic not found.' }, 404);
    }

    const movedIdea = {
      ...updatedIdea,
      topicId: targetTopicId,
      subtopicId: targetSubtopicId,
      updated_at: timestamp,
    };

    const nextSourceTopic = {
      ...sourceTopic,
      updated_at: timestamp,
      subtopics: sourceTopic.subtopics.map((entry) => entry.id === sourceSubtopic.id
        ? {
            ...entry,
            updated_at: timestamp,
            ideas: entry.ideas.filter((idea) => idea.id !== ideaId),
          }
        : entry),
    };

    const nextTargetTopic = {
      ...targetTopic,
      updated_at: timestamp,
      subtopics: targetTopic.subtopics.map((entry) => entry.id === targetSubtopicId
        ? {
            ...entry,
            updated_at: timestamp,
            ideas: [movedIdea, ...entry.ideas],
          }
        : entry),
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
    const subtopicId = readParam(ctx.params, 'subtopicId');
    const ideaId = readParam(ctx.params, 'ideaId');
    const row = await fetchOwnedBrainstormRow(ctx.env.DB, topicId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Topic not found.' }, 404);
    }

    const topic = mapBrainstormRow(row);
    const subtopic = findSubtopic(topic, subtopicId);
    if (!subtopic || !subtopic.ideas.some((idea) => idea.id === ideaId)) {
      return json({ ok: false, error: 'Idea not found.' }, 404);
    }

    const timestamp = nowIso();
    const updatedTopic = {
      ...topic,
      updated_at: timestamp,
      subtopics: topic.subtopics.map((entry) => entry.id === subtopicId
        ? {
            ...entry,
            updated_at: timestamp,
            ideas: entry.ideas.filter((idea) => idea.id !== ideaId),
          }
        : entry),
    };

    await persistBrainstormTopic(ctx.env.DB, row, user.id, updatedTopic);
    return json({ ok: true, topics: [updatedTopic] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete brainstorm idea.';
    return json({ ok: false, error: message }, 500);
  }
};
