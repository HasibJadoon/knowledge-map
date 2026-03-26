import {
  asRecord,
  computeWeekStartSydney,
  ensureLessonWeeklyTask,
  normalizeIsoDate,
  readString,
} from '../../../../_utils/sprint';
import {
  buildTaskRootId,
  getTaskRootStepNo,
  syncChildTasks,
} from '../_task-children';

interface Env {
  DB: D1Database;
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

const TASK_STEP_ORDER_SQL = `
CASE task_type
  WHEN 'reading' THEN 100
  WHEN 'morphology' THEN 200
  WHEN 'sentence_structure' THEN 300
  WHEN 'expressions' THEN 400
  WHEN 'comprehension' THEN 500
  WHEN 'passage_structure' THEN 600
  WHEN 'grammar_concepts' THEN 700
  WHEN 'worldview' THEN 800
  WHEN 'translation_semantics' THEN 900
  WHEN 'near_synonyms' THEN 1000
  WHEN 'surah_analysis' THEN 1100
  WHEN 'cross_corpus' THEN 1200
  WHEN 'children_lesson' THEN 1300
  ELSE 99000
END
`;

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
        SELECT task_id, unit_id, task_type, task_name, step_no, task_json, status, updated_at
        FROM ar_container_unit_task
        WHERE unit_id = ?1
          AND parent_task_id IS NULL
        ORDER BY COALESCE(step_no, ${TASK_STEP_ORDER_SQL}), task_id
      `
      )
      .bind(unitId)
      .all<any>();

    const childRows = await ctx.env.DB
      .prepare(
        `
        SELECT task_id, unit_id, parent_task_id, task_type, task_name, step_no, task_json, status, updated_at
        FROM ar_container_unit_task
        WHERE unit_id = ?1
          AND parent_task_id IS NOT NULL
        ORDER BY parent_task_id, COALESCE(step_no, ${TASK_STEP_ORDER_SQL}), task_id
      `
      )
      .bind(unitId)
      .all<any>();

    const childrenByParent = new Map<string, any[]>();
    for (const row of childRows?.results ?? []) {
      const parentTaskId = typeof row.parent_task_id === 'string' ? row.parent_task_id : '';
      if (!parentTaskId) continue;
      const group = childrenByParent.get(parentTaskId) ?? [];
      group.push({
        task_id: row.task_id,
        unit_id: row.unit_id,
        parent_task_id: row.parent_task_id,
        task_type: row.task_type,
        task_name: row.task_name,
        step_no: row.step_no,
        task_json: safeJsonParse(row.task_json) ?? {},
        status: row.status,
        updated_at: row.updated_at,
      });
      childrenByParent.set(parentTaskId, group);
    }

    const tasks = (rows?.results ?? []).map((row: any) => ({
      task_id: row.task_id,
      unit_id: row.unit_id,
      task_type: row.task_type,
      task_name: row.task_name,
      step_no: row.step_no,
      task_json: safeJsonParse(row.task_json) ?? {},
      status: row.status,
      updated_at: row.updated_at,
      children: childrenByParent.get(row.task_id) ?? [],
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
    const taskId = buildTaskRootId({
      unitId,
      taskType,
      taskJson: taskJsonForStorage,
    });
    const taskJsonText = JSON.stringify(taskJsonForStorage);
    const stepNo = getTaskRootStepNo(taskType);

    const row = await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_container_unit_task (
          task_id, unit_id, task_type, task_name, step_no, task_json, status
        ) VALUES (?1, ?2, ?3, ?4, ?5, json(?6), ?7)
        ON CONFLICT(task_id)
        DO UPDATE SET
          task_name = excluded.task_name,
          step_no = excluded.step_no,
          task_json = excluded.task_json,
          status = excluded.status,
          deleted_at = NULL
        RETURNING task_id, unit_id, task_type, task_name, step_no, task_json, status, updated_at
      `
      )
      .bind(taskId, unitId, taskType, taskName, stepNo, taskJsonText, status)
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

    const children = await syncChildTasks(ctx.env.DB, {
      unitId,
      parentTaskId: taskId,
      taskType,
      taskName,
      taskJson: taskJsonForStorage,
      status,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          task_id: row.task_id,
          unit_id: row.unit_id,
          task_type: row.task_type,
          task_name: row.task_name,
          step_no: row.step_no,
          task_json: safeJsonParse(row.task_json) ?? taskJson,
          status: row.status,
          updated_at: row.updated_at,
          children: children.map((child) => ({
            task_id: child.taskId,
            parent_task_id: taskId,
            unit_id: unitId,
            task_type: taskType,
            task_name: child.taskName,
            step_no: child.stepNo,
            task_json: child.taskJson,
            status,
          })),
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
