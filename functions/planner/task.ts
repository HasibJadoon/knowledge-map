import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  computeWeekStartSydney,
  createDefaultTaskJson,
  ensureWeeklyPlanExists,
  insertActivityLog,
  json,
  mapWeeklyTaskToPlannerTaskRow,
  normalizeIsoDate,
  normalizeTaskJson,
  parseBody,
  parseJsonObject,
  PlannerTaskJson,
  plannerPriorityToWeeklyPriority,
  plannerStatusToWeeklyKanban,
  plannerStatusToWeeklyStatus,
  readInteger,
  readString,
  readTrimmed,
  sha256Hex,
} from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function parseTaskInput(body: Record<string, unknown>) {
  const itemJsonInput = parseJsonObject(body['item_json']);
  if (itemJsonInput) {
    const normalized = normalizeTaskJson(itemJsonInput, readTrimmed(itemJsonInput['title']) ?? 'New task');
    return normalized;
  }

  const fallback = createDefaultTaskJson(readTrimmed(body['title']) ?? 'New task');
  const merged = {
    ...fallback,
    lane: readTrimmed(body['lane']) ?? fallback.lane,
    priority: readTrimmed(body['priority']) ?? fallback.priority,
    status: readTrimmed(body['status']) ?? fallback.status,
    estimate_min: readInteger(body['estimate_min']) ?? fallback.estimate_min,
    note: readString(body['note']) ?? fallback.note,
  };
  return normalizeTaskJson(merged, fallback.title);
}

function resolveTaskType(relatedType: string | null): string {
  if (relatedType === 'ar_lesson') {
    return 'lesson_unit_task';
  }
  if (relatedType === 'wv_content_item') {
    return 'podcast';
  }
  if (relatedType === 'wv_claim') {
    return 'worldview';
  }
  return 'planner_task';
}

async function readLatestTaskRow(
  db: D1Database,
  userId: number,
  weekStart: string
): Promise<Record<string, unknown> | null> {
  return db
    .prepare(
      `
      SELECT *
      FROM sp_weekly_tasks
      WHERE user_id = ?1
        AND week_start = ?2
      ORDER BY id DESC
      LIMIT 1
      `
    )
    .bind(userId, weekStart)
    .first<Record<string, unknown>>();
}

async function ensurePodcastEpisodeForTask(args: {
  db: D1Database;
  userId: number;
  weekStart: string;
  taskId: string;
  title: string;
  taskJson: PlannerTaskJson;
  existingId?: string | null;
}): Promise<string> {
  const canonicalInput =
    args.existingId ? null : `PODCAST|task|user:${args.userId}|week:${args.weekStart}|task:${args.taskId}`;
  const episodeId = args.existingId ?? (await sha256Hex(canonicalInput as string));

  const contentJson = {
    schema_version: 1,
    source: 'task',
    week_start: args.weekStart,
    task_id: args.taskId,
    topic: args.taskJson.assignment.topic,
    episode_no: args.taskJson.assignment.episode_no,
    recording_at: args.taskJson.assignment.recording_at,
    outline: [],
    script: '',
    checklist: [],
  };

  await args.db
    .prepare(
      `
      INSERT OR IGNORE INTO wv_content_items
        (id, canonical_input, user_id, title, content_type, status, related_type, related_id, refs_json, content_json, created_at, updated_at)
      VALUES
        (?1, ?2, ?3, ?4, 'podcast_episode', 'draft', 'sp_weekly_tasks', ?5, json('{}'), ?6, datetime('now'), datetime('now'))
      `
    )
    .bind(
      episodeId,
      canonicalInput ?? `PODCAST|task|user:${args.userId}|week:${args.weekStart}|task:${args.taskId}`,
      args.userId,
      args.title,
      args.taskId,
      JSON.stringify(contentJson)
    )
    .run();

  await args.db
    .prepare(
      `
      UPDATE wv_content_items
      SET title = ?1,
          content_json = ?2,
          updated_at = datetime('now')
      WHERE id = ?3
        AND user_id = ?4
      `
    )
    .bind(args.title, JSON.stringify(contentJson), episodeId, args.userId)
    .run();

  return episodeId;
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

    const weekRaw = readString(body['week_start']);
    const weekDate = normalizeIsoDate(weekRaw);
    if (weekRaw !== null && !weekDate) {
      return json({ ok: false, error: 'week_start must be YYYY-MM-DD.' }, 400);
    }

    const weekStart = computeWeekStartSydney(weekDate);
    const relatedType = readTrimmed(body['related_type']);
    const relatedId = readTrimmed(body['related_id']);
    const taskJson = parseTaskInput(body);
    const title = taskJson.title.trim() || 'New task';

    const taskType = readTrimmed(body['task_type']) ?? resolveTaskType(relatedType);
    const taskStatus = plannerStatusToWeeklyStatus(taskJson.status);
    const kanbanState = plannerStatusToWeeklyKanban(taskJson.status);
    const taskPriority = plannerPriorityToWeeklyPriority(taskJson.priority);

    const arLessonId = relatedType === 'ar_lesson' ? readInteger(relatedId) : null;
    const wvClaimId = relatedType === 'wv_claim' ? relatedId : null;
    const wvContentItemId = relatedType === 'wv_content_item' ? relatedId : null;

    await ensureWeeklyPlanExists({
      db: ctx.env.DB,
      userId: user.id,
      weekStart,
    });

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO sp_weekly_tasks
          (user_id, week_start, title, task_type, kanban_state, status, priority, points, due_date, order_index, task_json, ar_lesson_id, wv_claim_id, wv_content_item_id, created_at, updated_at)
        VALUES
          (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, NULL, ?8, ?9, ?10, ?11, ?12, datetime('now'), datetime('now'))
        `
      )
      .bind(
        user.id,
        weekStart,
        title,
        taskType,
        kanbanState,
        taskStatus,
        taskPriority,
        taskJson.order_index ?? Date.now(),
        JSON.stringify(taskJson),
        arLessonId,
        wvClaimId,
        wvContentItemId
      )
      .run();

    const rowRaw = await readLatestTaskRow(ctx.env.DB, user.id, weekStart);
    const createdRow = rowRaw ? mapWeeklyTaskToPlannerTaskRow(rowRaw) : null;
    if (!createdRow) {
      return json({ ok: false, error: 'Failed to create task.' }, 500);
    }

    let row = createdRow;
    if ((taskJson.assignment.kind === 'podcast' || taskJson.lane === 'podcast') && !row.related_id) {
      const topicLabel = taskJson.assignment.topic ?? taskJson.title;
      const titleForEpisode = taskJson.assignment.episode_no
        ? `Episode ${taskJson.assignment.episode_no} — ${topicLabel}`
        : topicLabel;
      const podcastId = await ensurePodcastEpisodeForTask({
        db: ctx.env.DB,
        userId: user.id,
        weekStart,
        taskId: row.id,
        title: titleForEpisode,
        taskJson,
      });

      await ctx.env.DB
        .prepare(
          `
          UPDATE sp_weekly_tasks
          SET wv_content_item_id = ?1,
              updated_at = datetime('now')
          WHERE id = ?2
            AND user_id = ?3
          `
        )
        .bind(podcastId, Number(row.id), user.id)
        .run();

      const refreshedRaw = await ctx.env.DB
        .prepare(
          `
          SELECT *
          FROM sp_weekly_tasks
          WHERE id = ?1
            AND user_id = ?2
          LIMIT 1
          `
        )
        .bind(Number(row.id), user.id)
        .first<Record<string, unknown>>();
      const refreshed = refreshedRaw ? mapWeeklyTaskToPlannerTaskRow(refreshedRaw) : null;
      if (refreshed) {
        row = refreshed;
      }
    }

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'planner_task_create',
      targetType: 'sp_weekly_tasks',
      targetId: row.id,
      ref: weekStart,
      eventJson: {
        title: taskJson.title,
        lane: taskJson.lane,
        status: taskJson.status,
      },
    });

    return json(
      {
        ok: true,
        task: row,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create task.';
    return json({ ok: false, error: message }, 500);
  }
};
