import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';
import {
  CaptureNoteMeta,
  composeCaptureBody,
  computeWeekStartSydney,
  insertActivityLog,
  json,
  mapWeeklyTaskToPlannerTaskRow,
  normalizeTaskJson,
  parseBody,
  parseJsonObject,
  plannerPriorityToWeeklyPriority,
  plannerStatusToWeeklyKanban,
  plannerStatusToWeeklyStatus,
  readInteger,
  readString,
  readTrimmed,
} from '../../../_utils/sprint';

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

function firstLinkContext(taskJson: Record<string, unknown>): {
  container_id?: string;
  unit_id?: string;
  ref?: string;
} {
  if (!Array.isArray(taskJson['links'])) {
    return {};
  }
  const first = taskJson['links'][0];
  if (typeof first !== 'object' || first === null || Array.isArray(first)) {
    return {};
  }
  const record = first as Record<string, unknown>;
  return {
    container_id: typeof record['container_id'] === 'string' ? record['container_id'] : undefined,
    unit_id: typeof record['unit_id'] === 'string' ? record['unit_id'] : undefined,
    ref: typeof record['ref'] === 'string' ? record['ref'] : undefined,
  };
}

function deriveRelatedTarget(row: Record<string, unknown>, taskId: number): {
  relatedType: string;
  relatedId: string;
} {
  const lessonId = readInteger(row['ar_lesson_id']);
  if (lessonId !== null) {
    return {
      relatedType: 'ar_lesson',
      relatedId: String(lessonId),
    };
  }

  const contentId = readTrimmed(row['wv_content_item_id']);
  if (contentId) {
    return {
      relatedType: 'wv_content_item',
      relatedId: contentId,
    };
  }

  const claimId = readTrimmed(row['wv_claim_id']);
  if (claimId) {
    return {
      relatedType: 'wv_claim',
      relatedId: claimId,
    };
  }

  return {
    relatedType: 'sp_weekly_tasks',
    relatedId: String(taskId),
  };
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
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
    const actualMin = readInteger(body?.['actual_min']);
    const existingJson = parseJsonObject(existingRaw['task_json']) ?? {};
    const nextJson = normalizeTaskJson(
      {
        ...existingJson,
        status: 'done',
        actual_min: actualMin ?? existingJson['actual_min'] ?? null,
      },
      typeof existingJson['title'] === 'string' ? existingJson['title'] : 'Task'
    );

    const persisted = {
      ...existingJson,
      ...nextJson,
    };

    await ctx.env.DB
      .prepare(
        `
        UPDATE sp_weekly_tasks
        SET title = ?1,
            kanban_state = ?2,
            status = ?3,
            priority = ?4,
            order_index = ?5,
            task_json = ?6,
            updated_at = datetime('now')
        WHERE id = ?7
          AND user_id = ?8
        `
      )
      .bind(
        nextJson.title,
        plannerStatusToWeeklyKanban(nextJson.status),
        plannerStatusToWeeklyStatus(nextJson.status),
        plannerPriorityToWeeklyPriority(nextJson.priority),
        nextJson.order_index ?? 0,
        JSON.stringify(persisted),
        taskId,
        user.id
      )
      .run();

    const weekStart = readString(existingRaw['week_start']) ?? computeWeekStartSydney();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'planner_task_complete',
      targetType: 'sp_weekly_tasks',
      targetId: String(taskId),
      ref: weekStart,
      eventJson: {
        status: 'done',
        actual_min: nextJson.actual_min,
      },
    });

    const captureFlag = Boolean(
      body?.['create_capture_note'] ?? nextJson.capture_on_done.create_capture_note
    );

    let captureNote: Record<string, unknown> | null = null;
    if (captureFlag) {
      const link = firstLinkContext(nextJson as unknown as Record<string, unknown>);
      const related = deriveRelatedTarget(existingRaw, taskId);
      const meta: CaptureNoteMeta = {
        schema_version: 1,
        kind: 'capture',
        week_start: weekStart,
        source: 'weekly',
        related_type: related.relatedType,
        related_id: related.relatedId,
        container_id: link.container_id,
        unit_id: link.unit_id,
        ref: link.ref,
        task_type: 'task',
      };

      const template = nextJson.capture_on_done.template;
      const captureText = `${nextJson.title}\n\n${template}`;
      const noteId = crypto.randomUUID();
      const bodyMd = composeCaptureBody(meta, captureText);
      const noteTitle = `Done: ${nextJson.title}`;

      await ctx.env.DB
        .prepare(
          `
          INSERT INTO ar_capture_notes (id, user_id, status, body_md, title, created_at, updated_at)
          VALUES (?1, ?2, 'inbox', ?3, ?4, datetime('now'), datetime('now'))
          `
        )
        .bind(noteId, user.id, bodyMd, noteTitle)
        .run();

      captureNote = {
        id: noteId,
        user_id: user.id,
        status: 'inbox',
        body_md: bodyMd,
        title: noteTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await insertActivityLog({
        db: ctx.env.DB,
        userId: user.id,
        eventType: 'capture_note_create',
        targetType: 'ar_capture_notes',
        targetId: noteId,
        ref: weekStart,
        eventJson: {
          source: 'weekly',
          task_id: taskId,
        },
      });
    }

    const updatedRaw = await loadWeeklyTask(ctx.env.DB, taskId, user.id);
    const updated = updatedRaw ? mapWeeklyTaskToPlannerTaskRow(updatedRaw) : null;
    if (!updated) {
      return json({ ok: false, error: 'Task not found after completion.' }, 404);
    }

    return json({
      ok: true,
      task: updated,
      capture_note: captureNote,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete task.';
    return json({ ok: false, error: message }, 500);
  }
};
