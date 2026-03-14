const { test, expect } = require('playwright/test');

const fakeToken = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 })).toString('base64url'),
  'signature',
].join('.');

test('planner shows native bottom tabs', async ({ page }) => {
  await page.route('**/api/planner/week**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        week_start: '2026-03-09',
        weekPlan: {
          id: 'week-2026-03-09',
          canonical_input: 'week|2026-03-09',
          user_id: 1,
          item_type: 'week_plan',
          week_start: '2026-03-09',
          period_start: null,
          period_end: null,
          related_type: null,
          related_id: null,
          item_json: {
            schema_version: 1,
            title: 'Week Sprint',
            fixed_rhythm: { lessons: 2, podcasts: 3 },
            planning_state: { is_planned: false, planned_at: null, defer_until: null },
            time_budget: {
              lesson_min: 120,
              podcast_min: 135,
              review_min: 30,
              study_minutes: 120,
              podcast_minutes: 135,
              review_minutes: 30,
            },
            intent: 'Learn + produce',
            weekly_goals: [],
            lanes: [
              { key: 'lesson', label: 'Lesson' },
              { key: 'podcast', label: 'Podcast' },
            ],
            definition_of_done: [],
            metrics: { tasks_done_target: 5, minutes_target: 285 },
          },
          status: 'active',
          created_at: '2026-03-09T00:00:00Z',
          updated_at: null,
        },
        tasks: [],
        review: null,
        summary: {
          tasks_done: 0,
          tasks_total: 0,
          minutes_spent: 0,
          inbox_count: 0,
          capture_notes: 0,
          promoted_notes: 0,
        },
      }),
    });
  });

  await page.route('**/api/week/ensure**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        week_start: '2026-03-09',
        tasks: [],
        review: null,
        summary: {
          tasks_done: 0,
          tasks_total: 0,
          minutes_spent: 0,
          inbox_count: 0,
          capture_notes: 0,
          promoted_notes: 0,
        },
      }),
    });
  });

  await page.addInitScript((token) => {
    window.localStorage.setItem('auth_token', token);
  }, fakeToken);

  await page.goto('http://localhost:4300/planner', { waitUntil: 'networkidle' });

  const tabBar = page.locator('ion-footer ion-tab-bar');
  await expect(tabBar).toBeVisible();
  await expect(page.locator('ion-footer ion-tab-button ion-label').filter({ hasText: 'Week' })).toBeVisible();
  await expect(page.locator('ion-footer ion-tab-button ion-label').filter({ hasText: 'Kanban' })).toBeVisible();
  await expect(page.locator('ion-footer ion-tab-button ion-label').filter({ hasText: 'Inbox' })).toBeVisible();

  await page.screenshot({ path: 'tmp/planner-tabs-check.png', fullPage: true });
});
