import { requireAuth } from '../../../../_utils/auth';
import {
  asRecord,
  computeWeekStartSydney,
  ensureLessonWeeklyTask,
  normalizeIsoDate,
  readString,
} from '../../../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const TASK_LABELS: Record<string, string> = {
  reading: 'Reading',
  sentence_structure: 'Sentence Structure',
  morphology: 'Morphology',
  grammar_concepts: 'Grammar Concepts',
  expressions: 'Expressions',
  comprehension: 'Comprehension',
  passage_structure: 'Passage Structure',
};

const TASK_TYPES = new Set(Object.keys(TASK_LABELS));

function safeJsonParse(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeTaskJson(input: unknown): Record<string, unknown> | unknown[] | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown> | unknown[];
}

/* ========================= GET /arabic/lessons/quran/:id/tasks ========================= */

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const lessonRow = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, container_id, unit_id
        FROM ar_lessons
        WHERE id = ?1 AND user_id = ?2 AND lesson_type = 'quran'
        LIMIT 1
      `
      )
      .bind(id, user.id)
      .first<any>();

    if (!lessonRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const unitId = lessonRow.unit_id ?? null;
    if (!unitId) {
      return new Response(JSON.stringify({ ok: true, result: { tasks: [] } }), { headers: jsonHeaders });
    }

    const rows = await ctx.env.DB
      .prepare(
        `
        SELECT task_id, unit_id, task_type, task_name, task_json, status, updated_at
        FROM ar_container_unit_task
        WHERE unit_id = ?1
        ORDER BY task_type
      `
      )
      .bind(unitId)
      .all<any>();

    const tasks = (rows?.results ?? []).map((row: any) => ({
      task_id: row.task_id,
      unit_id: row.unit_id,
      task_type: row.task_type,
      task_name: row.task_name,
      task_json: safeJsonParse(row.task_json) ?? {},
      status: row.status,
      updated_at: row.updated_at,
    }));

    return new Response(JSON.stringify({ ok: true, result: { tasks } }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= PUT /arabic/lessons/quran/:id/tasks ========================= */

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Admin role required' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const taskType = typeof body?.task_type === 'string' ? body.task_type.trim() : '';
    if (!TASK_TYPES.has(taskType)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid task_type' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const taskJson = normalizeTaskJson(body?.task_json);
    if (!taskJson) {
      return new Response(JSON.stringify({ ok: false, error: 'task_json must be an object or array' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const taskNameInput = typeof body?.task_name === 'string' ? body.task_name.trim() : '';
    const taskName = taskNameInput || TASK_LABELS[taskType] || taskType;
    const statusInput = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : 'draft';
    const status = ['draft', 'review', 'approved', 'published'].includes(statusInput) ? statusInput : 'draft';

    const lessonRow = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, container_id, unit_id
        FROM ar_lessons
        WHERE id = ?1 AND user_id = ?2 AND lesson_type = 'quran'
        LIMIT 1
      `
      )
      .bind(id, user.id)
      .first<any>();

    if (!lessonRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const unitId = lessonRow.unit_id ?? null;
    if (!unitId) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit missing' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const taskId = `UT:${unitId}:${taskType}`;
    const taskRecord = asRecord(taskJson);
    const weekStart = computeWeekStartSydney(normalizeIsoDate(readString(taskRecord?.['week_start'])));
    const taskJsonForStorage = taskRecord
      ? {
          ...taskRecord,
          auto_weekly: true,
          user_id: user.id,
          week_start: weekStart,
          ar_lesson_id: id,
        }
      : taskJson;
    const taskJsonText = JSON.stringify(taskJsonForStorage);

    const row = await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_container_unit_task (
          task_id, unit_id, task_type, task_name, task_json, status
        ) VALUES (?1, ?2, ?3, ?4, json(?5), ?6)
        ON CONFLICT(unit_id, task_type)
        DO UPDATE SET
          task_name = excluded.task_name,
          task_json = excluded.task_json,
          status = excluded.status
        RETURNING task_id, unit_id, task_type, task_name, task_json, status, updated_at
      `
      )
      .bind(taskId, unitId, taskType, taskName, taskJsonText, status)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to save task' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const storedTaskJson = safeJsonParse(row.task_json) ?? taskJsonForStorage;
    const storedTaskRecord = asRecord(storedTaskJson);
    await ensureLessonWeeklyTask({
      db: ctx.env.DB,
      userId: user.id,
      lessonId: id,
      taskId,
      taskName,
      taskType,
      unitId,
      taskJson: storedTaskJson,
      linkContext: {
        containerId: lessonRow.container_id ?? null,
        unitId,
        ref: readString(storedTaskRecord?.['ref']),
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          task_id: row.task_id,
          unit_id: row.unit_id,
          task_type: row.task_type,
          task_name: row.task_name,
          task_json: safeJsonParse(row.task_json) ?? taskJson,
          status: row.status,
          updated_at: row.updated_at,
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
