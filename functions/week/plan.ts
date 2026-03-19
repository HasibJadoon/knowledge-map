import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  AnchorKey,
  asRecord,
  computeWeekStartSydney,
  ensurePodcastEpisodeForAnchor,
  ensureWeekAnchors,
  insertActivityLog,
  json,
  normalizeIsoDate,
  normalizeTaskJson,
  normalizeWeekPlanJson,
  parseBody,
  parseJsonObject,
  plannerPriorityToWeeklyPriority,
  plannerStatusToWeeklyKanban,
  plannerStatusToWeeklyStatus,
  readInteger,
  readString,
  readTrimmed,
} from '../_utils/sprint';
import { loadWeekData } from './ensure';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function asAnchorKey(value: string | null): AnchorKey | null {
  if (
    value === 'lesson_1' ||
    value === 'lesson_2' ||
    value === 'podcast_1' ||
    value === 'podcast_2' ||
    value === 'podcast_3'
  ) {
    return value;
  }
  return null;
}

function defaultDeferUntilLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T18:00:00`;
}

function buildPodcastTitle(topic: string | null, episodeNo: number | null, fallback: string): string {
  const safeTopic = (topic ?? '').trim() || fallback;
  if (episodeNo && episodeNo > 0) {
    return `Episode ${episodeNo} — ${safeTopic}`;
  }
  return safeTopic;
}

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const requestedWeek = normalizeIsoDate(readString(body['week_start']));
    const weekStart = computeWeekStartSydney(requestedWeek);

    await ensureWeekAnchors({
      db: ctx.env.DB,
      userId: user.id,
      weekStart,
    });

    const weekRow = await ctx.env.DB
      .prepare(
        `
        SELECT week_json
        FROM sp_weekly_plans
        WHERE user_id = ?1
          AND week_start = ?2
        LIMIT 1
        `
      )
      .bind(user.id, weekStart)
      .first<Record<string, unknown>>();

    if (!weekRow) {
      return json({ ok: false, error: 'Week plan not found.' }, 404);
    }

    const normalizedWeek = normalizeWeekPlanJson(parseJsonObject(weekRow['week_json']), weekStart);
    const planningPayload = asRecord(body['planning_state']);
    const markLater = Boolean(body['later_today']) || planningPayload?.['is_planned'] === false;

    normalizedWeek.planning_state = {
      is_planned: markLater ? false : true,
      planned_at: markLater ? null : new Date().toISOString(),
      defer_until: markLater
        ? (readTrimmed(planningPayload?.['defer_until']) ?? defaultDeferUntilLocalIso())
        : null,
    };

    await ctx.env.DB
      .prepare(
        `
        UPDATE sp_weekly_plans
        SET week_json = ?1,
            updated_at = datetime('now')
        WHERE user_id = ?2
          AND week_start = ?3
        `
      )
      .bind(JSON.stringify(normalizedWeek), user.id, weekStart)
      .run();

    const assignmentPayload = asRecord(body['assignments']) ?? {};
    const tasks = await ctx.env.DB
      .prepare(
        `
        SELECT *
        FROM sp_weekly_tasks
        WHERE user_id = ?1
          AND week_start = ?2
        ORDER BY order_index ASC, id ASC
        `
      )
      .bind(user.id, weekStart)
      .all<Record<string, unknown>>();

    for (const row of tasks.results ?? []) {
      const rowId = readInteger(row['id']);
      if (rowId === null) {
        continue;
      }

      const taskJson = normalizeTaskJson(parseJsonObject(row['task_json']) ?? {}, readTrimmed(row['title']) ?? 'Task');
      const anchorKey = asAnchorKey(taskJson.meta.anchor_key);
      if (!anchorKey) {
        continue;
      }

      const anchorPatch = asRecord(assignmentPayload[anchorKey]);
      if (!anchorPatch) {
        continue;
      }

      const existingLessonId = readInteger(row['ar_lesson_id']);
      const existingPodcastId = readTrimmed(row['wv_content_item_id']);
      let relatedType = existingLessonId !== null ? 'ar_lesson' : existingPodcastId ? 'wv_content_item' : null;
      let relatedId = existingLessonId !== null ? String(existingLessonId) : existingPodcastId ?? null;
      let nextTitle = taskJson.title;

      if (anchorKey.startsWith('lesson_')) {
        const lessonId = readInteger(anchorPatch['ar_lesson_id']);
        const unitId = readTrimmed(anchorPatch['unit_id']);
        taskJson.assignment = {
          ...taskJson.assignment,
          kind: 'lesson',
          ar_lesson_id: lessonId,
          unit_id: unitId,
        };
        if (lessonId !== null) {
          relatedType = 'ar_lesson';
          relatedId = String(lessonId);
        }
      }

      if (anchorKey.startsWith('podcast_')) {
        const topic = readTrimmed(anchorPatch['topic']) ?? taskJson.assignment.topic;
        const episodeNo = readInteger(anchorPatch['episode_no']) ?? taskJson.assignment.episode_no;
        const recordingAt = readTrimmed(anchorPatch['recording_at']) ?? taskJson.assignment.recording_at;
        taskJson.assignment = {
          ...taskJson.assignment,
          kind: 'podcast',
          topic,
          episode_no: episodeNo,
          recording_at: recordingAt,
        };

        nextTitle = buildPodcastTitle(topic, episodeNo, taskJson.title);
        taskJson.title = nextTitle;

        const podcastId = await ensurePodcastEpisodeForAnchor({
          db: ctx.env.DB,
          userId: user.id,
          weekStart,
          anchorKey,
          title: nextTitle,
          assignment: taskJson.assignment,
        });

        if (podcastId) {
          relatedType = 'wv_content_item';
          relatedId = podcastId;
        }
      }

      await ctx.env.DB
        .prepare(
          `
          UPDATE sp_weekly_tasks
          SET title = ?1,
              kanban_state = ?2,
              status = ?3,
              priority = ?4,
              task_json = ?5,
              ar_lesson_id = ?6,
              wv_content_item_id = ?7,
              updated_at = datetime('now')
          WHERE id = ?8
            AND user_id = ?9
          `
        )
        .bind(
          nextTitle,
          plannerStatusToWeeklyKanban(taskJson.status),
          plannerStatusToWeeklyStatus(taskJson.status),
          plannerPriorityToWeeklyPriority(taskJson.priority),
          JSON.stringify(taskJson),
          relatedType === 'ar_lesson' ? readInteger(relatedId) : null,
          relatedType === 'wv_content_item' ? relatedId : null,
          rowId,
          user.id
        )
        .run();
    }

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'planner_week_plan',
      targetType: 'sp_weekly_plans',
      targetId: `${weekStart}:${user.id}`,
      ref: weekStart,
      eventJson: {
        is_planned: normalizedWeek.planning_state.is_planned,
      },
    });

    const payload = await loadWeekData(ctx.env.DB, user.id, weekStart);
    return json({
      ok: true,
      week_start: weekStart,
      ...payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update week planning.';
    return json({ ok: false, error: message }, 500);
  }
};
