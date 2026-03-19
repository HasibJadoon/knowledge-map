import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import {
  AnchorKey,
  computeWeekStartSydney,
  ensurePodcastEpisodeForAnchor,
  insertActivityLog,
  json,
  mapWeeklyTaskToPlannerTaskRow,
  normalizeIsoDate,
  normalizeTaskJson,
  parseBody,
  parseJsonObject,
  plannerPriorityToWeeklyPriority,
  plannerStatusToWeeklyKanban,
  plannerStatusToWeeklyStatus,
  readInteger,
  readNumber,
  sha256Hex,
  readString,
  readTrimmed,
} from '../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function readParam(params: Record<string, unknown> | undefined, key: string): string {
  const value = params?.[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
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

function mergeTaskPatch(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  const keys: Array<keyof typeof next> = [
    'lane',
    'title',
    'priority',
    'status',
    'estimate_min',
    'actual_min',
    'tags',
    'checklist',
    'note',
    'links',
    'capture_on_done',
    'order_index',
  ];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      next[key] = patch[key];
    }
  }

  return next;
}

function deriveRelationFromWeeklyTask(row: Record<string, unknown>): {
  relatedType: string | null;
  relatedId: string | null;
} {
  const lessonId = readInteger(row['ar_lesson_id']);
  if (lessonId !== null) {
    return { relatedType: 'ar_lesson', relatedId: String(lessonId) };
  }

  const contentId = readTrimmed(row['wv_content_item_id']);
  if (contentId) {
    return { relatedType: 'wv_content_item', relatedId: contentId };
  }

  const claimId = readTrimmed(row['wv_claim_id']);
  if (claimId) {
    return { relatedType: 'wv_claim', relatedId: claimId };
  }

  return { relatedType: null, relatedId: null };
}

async function loadWeeklyTask(
  db: D1Database,
  taskId: number,
  userId: number
): Promise<Record<string, unknown> | null> {
  return db
    .prepare(
      `
      SELECT *
      FROM sp_weekly_tasks
      WHERE id = ?1
        AND user_id = ?2
      LIMIT 1
      `
    )
    .bind(taskId, userId)
    .first<Record<string, unknown>>();
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const taskIdText = readParam(ctx.params, 'id');
    const taskId = Number(taskIdText);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return json({ ok: false, error: 'Task id is required.' }, 400);
    }

    const rowRaw = await loadWeeklyTask(ctx.env.DB, taskId, user.id);
    const row = rowRaw ? mapWeeklyTaskToPlannerTaskRow(rowRaw) : null;
    if (!row) {
      return json({ ok: false, error: 'Task not found.' }, 404);
    }

    return json({
      ok: true,
      task: row,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load task.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const taskIdText = readParam(ctx.params, 'id');
    const taskId = Number(taskIdText);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return json({ ok: false, error: 'Task id is required.' }, 400);
    }

    const existingRaw = await loadWeeklyTask(ctx.env.DB, taskId, user.id);
    if (!existingRaw) {
      return json({ ok: false, error: 'Task not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const existingRow = mapWeeklyTaskToPlannerTaskRow(existingRaw);
    if (!existingRow) {
      return json({ ok: false, error: 'Task payload is invalid.' }, 500);
    }

    const existingJson = parseJsonObject(existingRaw['task_json']) ?? {};
    const existingTaskJson = normalizeTaskJson(existingJson, readTrimmed(existingJson['title']) ?? 'Task');
    const incomingItemJson = parseJsonObject(body['item_json']);
    let mergedJson = incomingItemJson
      ? normalizeTaskJson(incomingItemJson, readTrimmed(incomingItemJson['title']) ?? 'Task')
      : normalizeTaskJson(mergeTaskPatch(existingJson, body), readTrimmed(existingJson['title']) ?? 'Task');

    // Anchor tasks keep their lane and anchor metadata stable.
    if (existingTaskJson.anchor) {
      mergedJson = {
        ...mergedJson,
        lane: existingTaskJson.lane,
        anchor: true,
        meta: {
          anchor_key: existingTaskJson.meta.anchor_key,
          week_start: existingTaskJson.meta.week_start,
        },
      };
    }

    const derivedRelation = deriveRelationFromWeeklyTask(existingRaw);
    let relatedType = Object.prototype.hasOwnProperty.call(body, 'related_type')
      ? readTrimmed(body['related_type'])
      : derivedRelation.relatedType;
    let relatedId = Object.prototype.hasOwnProperty.call(body, 'related_id')
      ? readTrimmed(body['related_id'])
      : derivedRelation.relatedId;

    const effectiveWeekStart =
      normalizeIsoDate(existingRow.week_start) ??
      normalizeIsoDate(mergedJson.meta.week_start) ??
      computeWeekStartSydney();

    if (mergedJson.assignment.kind === 'lesson' && mergedJson.assignment.ar_lesson_id) {
      relatedType = 'ar_lesson';
      relatedId = String(mergedJson.assignment.ar_lesson_id);
    }

    if (mergedJson.assignment.kind === 'podcast' || mergedJson.lane === 'podcast') {
      const anchorKey = asAnchorKey(mergedJson.meta.anchor_key);
      let podcastId = relatedType === 'wv_content_item' ? relatedId : null;
      const topicLabel = mergedJson.assignment.topic ?? mergedJson.title;
      const episodeNo = mergedJson.assignment.episode_no ?? null;
      const podcastTitle = episodeNo ? `Episode ${episodeNo} — ${topicLabel}` : topicLabel;

      if (anchorKey) {
        podcastId = await ensurePodcastEpisodeForAnchor({
          db: ctx.env.DB,
          userId: user.id,
          weekStart: effectiveWeekStart,
          anchorKey,
          title: podcastTitle,
          assignment: mergedJson.assignment,
        });
      } else {
        const canonicalInput =
          podcastId
            ? null
            : `PODCAST|task|user:${user.id}|week:${effectiveWeekStart}|task:${taskId}`;
        const episodeId = podcastId ?? (await sha256Hex(canonicalInput as string));
        const contentJson = {
          schema_version: 1,
          source: 'task',
          week_start: effectiveWeekStart,
          task_id: String(taskId),
          topic: mergedJson.assignment.topic,
          episode_no: mergedJson.assignment.episode_no,
          recording_at: mergedJson.assignment.recording_at,
          outline: [],
          script: '',
          checklist: [],
        };

        await ctx.env.DB
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
            canonicalInput ?? `PODCAST|task|user:${user.id}|week:${effectiveWeekStart}|task:${taskId}`,
            user.id,
            podcastTitle,
            String(taskId),
            JSON.stringify(contentJson)
          )
          .run();

        await ctx.env.DB
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
          .bind(podcastTitle, JSON.stringify(contentJson), episodeId, user.id)
          .run();

        podcastId = episodeId;
      }

      if (podcastId) {
        relatedType = 'wv_content_item';
        relatedId = podcastId;
      }
    }

    const arLessonId = relatedType === 'ar_lesson' ? readInteger(relatedId) : null;
    const wvClaimId = relatedType === 'wv_claim' ? relatedId : null;
    const wvContentItemId = relatedType === 'wv_content_item' ? relatedId : null;

    const taskType = readTrimmed(body['task_type']) ?? readTrimmed(existingRaw['task_type']) ?? 'planner_task';
    const persisted: Record<string, unknown> = {
      ...existingJson,
      ...(mergedJson as unknown as Record<string, unknown>),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'due_date')) {
      persisted['due_date'] = normalizeIsoDate(readString(body['due_date']));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'points')) {
      persisted['points'] = readNumber(body['points']);
    }

    const dueDate = normalizeIsoDate(readString(persisted['due_date']));
    const points = readNumber(persisted['points']);

    await ctx.env.DB
      .prepare(
        `
        UPDATE sp_weekly_tasks
        SET title = ?1,
            task_type = ?2,
            kanban_state = ?3,
            status = ?4,
            priority = ?5,
            points = ?6,
            due_date = ?7,
            order_index = ?8,
            task_json = ?9,
            ar_lesson_id = ?10,
            wv_claim_id = ?11,
            wv_content_item_id = ?12,
            updated_at = datetime('now')
        WHERE id = ?13
          AND user_id = ?14
        `
      )
      .bind(
        mergedJson.title,
        taskType,
        plannerStatusToWeeklyKanban(mergedJson.status),
        plannerStatusToWeeklyStatus(mergedJson.status),
        plannerPriorityToWeeklyPriority(mergedJson.priority),
        points,
        dueDate,
        mergedJson.order_index ?? 0,
        JSON.stringify(persisted),
        arLessonId,
        wvClaimId,
        wvContentItemId,
        taskId,
        user.id
      )
      .run();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'planner_task_update',
      targetType: 'sp_weekly_tasks',
      targetId: String(taskId),
      ref: existingRow.week_start,
      eventJson: {
        lane: mergedJson.lane,
        status: mergedJson.status,
        priority: mergedJson.priority,
      },
    });

    const updatedRaw = await loadWeeklyTask(ctx.env.DB, taskId, user.id);
    const updated = updatedRaw ? mapWeeklyTaskToPlannerTaskRow(updatedRaw) : null;
    if (!updated) {
      return json({ ok: false, error: 'Task not found after update.' }, 404);
    }

    return json({
      ok: true,
      task: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update task.';
    return json({ ok: false, error: message }, 500);
  }
};
