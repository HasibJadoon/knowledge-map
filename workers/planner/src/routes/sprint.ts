// ─── /planner/* + /week/* routes — weekly-sprint planner ──────────────────────
// The legacy planner API, ported onto the sp_planner item store. Responses are
// returned raw (not enveloped) to match what the planner UIs already expect.

import type { Router } from '../../../shared/src/router';
import { json } from '../../../shared/src/http';
import { badRequest, unauthorized, notFound } from '../../../shared/src/response';
import { typedId } from '../../../shared/src/ulid';
import type { PlannerEnv } from '../env';
import { SprintRepo, type SprintRow } from '../repositories/sprint.repo';
import { actorRef } from '../auth';
import { readJsonObject } from '../../../shared/src/validate';


function parseJson(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toItemRow(row: SprintRow): Record<string, unknown> {
  return {
    id: row.id,
    canonical_input: row.canonical_input,
    user_id: 0,
    item_type: row.item_type,
    week_start: row.week_start,
    period_start: row.period_start,
    period_end: row.period_end,
    related_type: row.related_type,
    related_id: row.related_id,
    item_json: parseJson(row.item_json),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function defaultWeekPlan(weekStart: string, title?: string): Record<string, unknown> {
  return {
    schema_version: 1,
    title: title ?? `Week Sprint — ${weekStart}`,
    fixed_rhythm: { lessons: 2, podcasts: 3 },
    planning_state: { is_planned: false, planned_at: null, defer_until: null },
    time_budget: {
      lesson_min: 120, podcast_min: 135, review_min: 30,
      study_minutes: 120, podcast_minutes: 135, review_minutes: 30,
    },
    intent: 'Learn + produce',
    weekly_goals: [],
    lanes: [
      { key: 'lesson', label: 'Lesson' },
      { key: 'podcast', label: 'Podcast' },
      { key: 'notes', label: 'Notes' },
      { key: 'admin', label: 'Admin' },
    ],
    definition_of_done: [],
    metrics: { tasks_done_target: 5, minutes_target: 285 },
  };
}

async function ensureWeekPlan(
  repo: SprintRepo,
  user: string,
  weekStart: string,
  title?: string,
): Promise<SprintRow> {
  const existing = await repo.weekPlan(user, weekStart);
  if (existing) return existing;
  return repo.insert({
    canonical_input: `WEEK_PLAN|${user}|${weekStart}`,
    core_user_ref: user,
    item_type: 'week_plan',
    week_start: weekStart,
    item_json: JSON.stringify(defaultWeekPlan(weekStart, title)),
  });
}

async function weekResponse(repo: SprintRepo, user: string, weekStart: string): Promise<Response> {
  const planRow = await repo.weekPlan(user, weekStart);
  const taskRows = await repo.tasksForWeek(user, weekStart);
  const reviewRow = await repo.review(user, weekStart);
  const tasks = taskRows.map(toItemRow);

  let done = 0;
  let minutes = 0;
  for (const task of tasks) {
    const item = task['item_json'] as Record<string, unknown>;
    if (item['status'] === 'done') {
      done += 1;
      const actual = item['actual_min'];
      const estimate = item['estimate_min'];
      if (typeof actual === 'number') minutes += actual;
      else if (typeof estimate === 'number') minutes += estimate;
    }
  }

  return json({
    ok: true,
    week_start: weekStart,
    weekPlan: planRow ? toItemRow(planRow) : null,
    tasks,
    review: reviewRow ? toItemRow(reviewRow) : null,
    summary: {
      tasks_done: done,
      tasks_total: tasks.length,
      minutes_spent: minutes,
      inbox_count: 0,
      capture_notes: 0,
      promoted_notes: 0,
    },
  });
}

export function sprintRoutes(router: Router<PlannerEnv>) {

  // GET /planner/week?week_start=YYYY-MM-DD
  router.get('/planner/week', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const weekStart = new URL(req.url).searchParams.get('week_start');
    if (!weekStart) return badRequest('week_start required');
    return weekResponse(new SprintRepo(env.DB_PL), user, weekStart);
  });

  // POST /planner/week — ensure the week plan exists, return the week
  router.post('/planner/week', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const weekStart = typeof body['week_start'] === 'string' ? body['week_start'] : '';
    if (!weekStart) return badRequest('week_start required');
    const repo = new SprintRepo(env.DB_PL);
    await ensureWeekPlan(repo, user, weekStart, typeof body['title'] === 'string' ? body['title'] : undefined);
    return weekResponse(repo, user, weekStart);
  });

  // POST /week/ensure?week_start=YYYY-MM-DD — ensure the week + return it
  router.post('/week/ensure', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const weekStart = new URL(req.url).searchParams.get('week_start')
      ?? (typeof body['week_start'] === 'string' ? body['week_start'] : '');
    if (!weekStart) return badRequest('week_start required');
    const repo = new SprintRepo(env.DB_PL);
    await ensureWeekPlan(repo, user, weekStart);
    return weekResponse(repo, user, weekStart);
  });

  // PUT /week/plan — update the week plan's planning state
  router.put('/week/plan', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const weekStart = typeof body['week_start'] === 'string' ? body['week_start'] : '';
    if (!weekStart) return badRequest('week_start required');
    const repo = new SprintRepo(env.DB_PL);
    const planRow = await ensureWeekPlan(repo, user, weekStart);
    const plan = parseJson(planRow.item_json);
    if (body['planning_state'] && typeof body['planning_state'] === 'object') {
      plan['planning_state'] = {
        ...(plan['planning_state'] as Record<string, unknown> | undefined ?? {}),
        ...(body['planning_state'] as Record<string, unknown>),
      };
    }
    await repo.update(planRow.id, { item_json: JSON.stringify(plan) });
    return weekResponse(repo, user, weekStart);
  });

  // POST /planner/task — create a task under a week
  router.post('/planner/task', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const weekStart = typeof body['week_start'] === 'string' ? body['week_start'] : '';
    if (!weekStart) return badRequest('week_start required');
    if (!body['item_json'] || typeof body['item_json'] !== 'object') {
      return badRequest('item_json required');
    }
    const row = await new SprintRepo(env.DB_PL).insert({
      canonical_input: `TASK|${user}|${typedId('PL')}`,
      core_user_ref: user,
      item_type: 'task',
      week_start: weekStart,
      related_type: typeof body['related_type'] === 'string' ? body['related_type'] : null,
      related_id: typeof body['related_id'] === 'string' ? body['related_id'] : null,
      item_json: JSON.stringify(body['item_json']),
    });
    return json({ ok: true, task: toItemRow(row) });
  });

  // GET /planner/task/:id
  router.get('/planner/task/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const row = await new SprintRepo(env.DB_PL).findById(user, id);
    return row ? json({ ok: true, task: toItemRow(row) }) : notFound(`task ${id}`);
  });

  // PUT /planner/task/:id — replace a task's item_json
  router.put('/planner/task/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const repo = new SprintRepo(env.DB_PL);
    if (!(await repo.findById(user, id))) return notFound(`task ${id}`);
    const fields: { item_json?: string; related_type?: string | null; related_id?: string | null } = {};
    if (body['item_json'] && typeof body['item_json'] === 'object') {
      fields.item_json = JSON.stringify(body['item_json']);
    }
    if ('related_type' in body) {
      fields.related_type = typeof body['related_type'] === 'string' ? body['related_type'] : null;
    }
    if ('related_id' in body) {
      fields.related_id = typeof body['related_id'] === 'string' ? body['related_id'] : null;
    }
    const row = await repo.update(id, fields);
    return row ? json({ ok: true, task: toItemRow(row) }) : notFound(`task ${id}`);
  });

  // POST /planner/task/:id/complete — mark a task done
  router.post('/planner/task/:id/complete', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const repo = new SprintRepo(env.DB_PL);
    const existing = await repo.findById(user, id);
    if (!existing) return notFound(`task ${id}`);
    const item = parseJson(existing.item_json);
    item['status'] = 'done';
    if (typeof body['actual_min'] === 'number') {
      item['actual_min'] = body['actual_min'];
    } else if (typeof item['actual_min'] !== 'number') {
      item['actual_min'] = typeof item['estimate_min'] === 'number' ? item['estimate_min'] : null;
    }
    const row = await repo.update(id, { item_json: JSON.stringify(item) });
    return json({ ok: true, task: row ? toItemRow(row) : null, capture_note: null });
  });

  // GET /planner/review?week_start=YYYY-MM-DD
  router.get('/planner/review', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const weekStart = new URL(req.url).searchParams.get('week_start');
    if (!weekStart) return badRequest('week_start required');
    const row = await new SprintRepo(env.DB_PL).review(user, weekStart);
    return json({ ok: true, review: row ? toItemRow(row) : null });
  });

  // POST /planner/review — upsert the sprint review for a week
  router.post('/planner/review', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJsonObject(req) ?? {};
    const weekStart = typeof body['week_start'] === 'string' ? body['week_start'] : '';
    if (!weekStart) return badRequest('week_start required');
    if (!body['item_json'] || typeof body['item_json'] !== 'object') {
      return badRequest('item_json required');
    }
    const repo = new SprintRepo(env.DB_PL);
    const existing = await repo.review(user, weekStart);
    const itemJson = JSON.stringify(body['item_json']);
    const row = existing
      ? await repo.update(existing.id, { item_json: itemJson })
      : await repo.insert({
          canonical_input: `REVIEW|${user}|${weekStart}`,
          core_user_ref: user,
          item_type: 'sprint_review',
          week_start: weekStart,
          item_json: itemJson,
        });
    return json({ ok: true, review: row ? toItemRow(row) : null });
  });
}
