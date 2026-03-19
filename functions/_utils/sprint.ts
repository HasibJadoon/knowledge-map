import type { D1Database } from '@cloudflare/workers-types';

export type PlannerLane = 'lesson' | 'podcast' | 'notes' | 'admin';
export type PlannerPriority = 'P1' | 'P2' | 'P3';
export type PlannerTaskStatus = 'planned' | 'doing' | 'done' | 'blocked' | 'skipped' | 'todo';
export type FocusMode = 'planning' | 'studying' | 'producing' | 'reviewing';
export type CaptureSource = 'weekly' | 'lesson' | 'podcast';
export type AnchorKey = 'lesson_1' | 'lesson_2' | 'podcast_1' | 'podcast_2' | 'podcast_3';

const JSON_HEADERS: HeadersInit = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const META_PREFIX = '<!--meta:';
const META_RE = /^\s*<!--meta:(\{[\s\S]*?\})-->\s*/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const sydneyDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Australia/Sydney',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface CaptureNoteMeta {
  schema_version: 1;
  kind: 'capture';
  week_start: string;
  source: CaptureSource;
  related_type?: string;
  related_id?: string;
  container_id?: string;
  unit_id?: string;
  ref?: string;
  task_type?: string;
}

export interface ParsedCaptureBody {
  meta: CaptureNoteMeta | null;
  text: string;
}

export interface PlannerWeekPlanJson {
  schema_version: 1;
  title: string;
  fixed_rhythm: {
    lessons: number;
    podcasts: number;
  };
  planning_state: {
    is_planned: boolean;
    planned_at: string | null;
    defer_until: string | null;
  };
  time_budget: {
    lesson_min: number;
    podcast_min: number;
    review_min: number;
    study_minutes: number;
    podcast_minutes: number;
    review_minutes: number;
  };
  intent: string;
  weekly_goals: Array<{ id: string; label: string; done: boolean }>;
  lanes: Array<{ key: PlannerLane; label: string }>;
  definition_of_done: string[];
  metrics: {
    tasks_done_target: number;
    minutes_target: number;
  };
}

export interface PlannerTaskJson {
  schema_version: 1;
  lane: PlannerLane;
  anchor: boolean;
  title: string;
  priority: PlannerPriority;
  status: PlannerTaskStatus;
  estimate_min: number;
  actual_min: number | null;
  assignment: {
    kind: 'lesson' | 'podcast' | 'none';
    ar_lesson_id: number | null;
    unit_id: string | null;
    topic: string | null;
    episode_no: number | null;
    recording_at: string | null;
  };
  tags: string[];
  checklist: Array<{ id: string; label: string; done: boolean }>;
  note: string;
  links: Array<{
    kind: string;
    container_id?: string;
    unit_id?: string;
    ref?: string;
  }>;
  capture_on_done: {
    create_capture_note: boolean;
    template: string;
  };
  meta: {
    anchor_key: AnchorKey | null;
    week_start: string | null;
  };
  order_index?: number;
}

export interface SprintReviewJson {
  schema_version: 1;
  title: string;
  outcomes: Array<{ label: string; status: 'partial' | 'done' | 'missed' }>;
  metrics: {
    tasks_done: number;
    tasks_total: number;
    minutes_spent: number;
    capture_notes: number;
    promoted_notes: number;
  };
  what_worked: string[];
  what_blocked: string[];
  carry_over_task_ids: string[];
  next_week_focus: string[];
}

export interface PlannerRow {
  id: string;
  canonical_input: string;
  user_id: number;
  item_type: 'week_plan' | 'task' | 'sprint_review';
  week_start: string | null;
  period_start: string | null;
  period_end: string | null;
  related_type: string | null;
  related_id: string | null;
  item_json: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface PlannerTaskApiRow {
  id: string;
  canonical_input: string;
  user_id: number;
  item_type: 'task';
  week_start: string;
  period_start: null;
  period_end: null;
  related_type: string | null;
  related_id: string | null;
  item_json: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string | null;
}

type WeeklyKanbanState = 'backlog' | 'planned' | 'doing' | 'blocked' | 'done';
type WeeklyTaskStatus = 'planned' | 'active' | 'done' | 'skipped' | 'blocked';

export type AnchorDefinition = {
  key: AnchorKey;
  lane: Extract<PlannerLane, 'lesson' | 'podcast'>;
  title: string;
  estimateMin: number;
  priority: PlannerPriority;
  assignmentKind: 'lesson' | 'podcast';
};

export const WEEKLY_ANCHOR_DEFINITIONS: ReadonlyArray<AnchorDefinition> = [
  {
    key: 'lesson_1',
    lane: 'lesson',
    title: 'Lesson Session 1 (with kid)',
    estimateMin: 60,
    priority: 'P1',
    assignmentKind: 'lesson',
  },
  {
    key: 'lesson_2',
    lane: 'lesson',
    title: 'Lesson Session 2 (with kid)',
    estimateMin: 60,
    priority: 'P1',
    assignmentKind: 'lesson',
  },
  {
    key: 'podcast_1',
    lane: 'podcast',
    title: 'Podcast Session 1 (with friend)',
    estimateMin: 45,
    priority: 'P2',
    assignmentKind: 'podcast',
  },
  {
    key: 'podcast_2',
    lane: 'podcast',
    title: 'Podcast Session 2 (with friend)',
    estimateMin: 45,
    priority: 'P2',
    assignmentKind: 'podcast',
  },
  {
    key: 'podcast_3',
    lane: 'podcast',
    title: 'Podcast Session 3 (with friend)',
    estimateMin: 45,
    priority: 'P2',
    assignmentKind: 'podcast',
  },
];

export interface WeeklySprintTaskLinkContext {
  containerId?: string | null;
  unitId: string;
  ref?: string | null;
}

export interface EnsureLessonWeeklyTaskArgs {
  db: D1Database;
  userId: number;
  lessonId: number;
  taskId: string;
  taskName: string;
  taskType: string;
  unitId: string;
  taskJson: unknown;
  linkContext?: WeeklySprintTaskLinkContext;
}

type JsonObject = Record<string, unknown>;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function parseBody(request: { json: () => Promise<unknown> }): Promise<JsonObject | null> {
  const payload = (await request.json().catch(() => null)) as unknown;
  return asRecord(payload);
}

export function asRecord(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return readString(value);
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function readInteger(value: unknown): number | null {
  const numberValue = readNumber(value);
  if (numberValue === null) {
    return null;
  }
  return Number.isInteger(numberValue) ? numberValue : Math.trunc(numberValue);
}

export function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isoDateFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sydneyDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const parts = sydneyDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '');
  const weekdayToken = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';
  const weekday = WEEKDAY_INDEX[weekdayToken] ?? 1;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error('Unable to resolve Australia/Sydney date parts.');
  }

  return {
    year,
    month,
    day,
    weekday,
  };
}

function coerceDateInput(input?: string | Date | number | null): Date {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    return new Date(input);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (ISO_DATE_RE.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00Z`);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function computeWeekStartSydney(input?: string | Date | number | null): string {
  const date = coerceDateInput(input);
  const parts = sydneyDateParts(date);
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const daysFromMonday = (parts.weekday + 6) % 7;
  anchor.setUTCDate(anchor.getUTCDate() - daysFromMonday);
  return isoDateFromDate(anchor);
}

export function addDays(isoDate: string, dayDelta: number): string {
  const normalized = normalizeIsoDate(isoDate);
  if (!normalized) {
    throw new Error('Invalid ISO date.');
  }
  const value = new Date(`${normalized}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + dayDelta);
  return isoDateFromDate(value);
}

export function parseJsonObject(value: unknown): JsonObject | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(value);
}

export function toJsonText(value: unknown): string {
  return JSON.stringify(value);
}

export async function sha256Hex(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(digest))
    .map((chunk) => chunk.toString(16).padStart(2, '0'))
    .join('');
}

export function createDefaultWeekPlanJson(weekStart: string, title?: string | null): PlannerWeekPlanJson {
  const lessonMin = 120;
  const podcastMin = 135;
  const reviewMin = 30;
  return {
    schema_version: 1,
    title: title?.trim() || `Week Sprint — ${weekStart}`,
    fixed_rhythm: {
      lessons: 2,
      podcasts: 3,
    },
    planning_state: {
      is_planned: false,
      planned_at: null,
      defer_until: null,
    },
    time_budget: {
      lesson_min: lessonMin,
      podcast_min: podcastMin,
      review_min: reviewMin,
      study_minutes: lessonMin,
      podcast_minutes: podcastMin,
      review_minutes: reviewMin,
    },
    intent: 'Learn + produce',
    weekly_goals: [
      { id: 'g1', label: 'Finish Lesson: Quran study focus', done: false },
    ],
    lanes: [
      { key: 'lesson', label: 'Lesson' },
      { key: 'podcast', label: 'Podcast' },
      { key: 'notes', label: 'Notes' },
      { key: 'admin', label: 'Admin' },
    ],
    definition_of_done: [
      'Lesson tasks marked done',
      'Key notes captured + promoted',
      'Podcast outline + recording draft stored',
    ],
    metrics: { tasks_done_target: 5, minutes_target: lessonMin + podcastMin + reviewMin },
  };
}

export function normalizeWeekPlanJson(
  input: unknown,
  weekStart: string,
  title?: string | null
): PlannerWeekPlanJson {
  const fallback = createDefaultWeekPlanJson(weekStart, title);
  const record = asRecord(input);
  if (!record) {
    return fallback;
  }

  const mergedTitle = readTrimmed(record['title']) ?? fallback.title;
  const mergedIntent = readTrimmed(record['intent']) ?? fallback.intent;
  const goals = Array.isArray(record['weekly_goals']) ? record['weekly_goals'] : fallback.weekly_goals;
  const lanes = Array.isArray(record['lanes']) ? record['lanes'] : fallback.lanes;
  const definitionOfDone = Array.isArray(record['definition_of_done'])
    ? record['definition_of_done'].filter((item): item is string => typeof item === 'string')
    : fallback.definition_of_done;
  const timeBudgetSource = asRecord(record['time_budget']);
  const fixedRhythmSource = asRecord(record['fixed_rhythm']);
  const planningStateSource = asRecord(record['planning_state']);
  const metricsSource = asRecord(record['metrics']);

  const lessonMin =
    readInteger(timeBudgetSource?.['lesson_min']) ??
    readInteger(timeBudgetSource?.['study_minutes']) ??
    fallback.time_budget.lesson_min;
  const podcastMin =
    readInteger(timeBudgetSource?.['podcast_min']) ??
    readInteger(timeBudgetSource?.['podcast_minutes']) ??
    fallback.time_budget.podcast_min;
  const reviewMin =
    readInteger(timeBudgetSource?.['review_min']) ??
    readInteger(timeBudgetSource?.['review_minutes']) ??
    fallback.time_budget.review_min;

  const plannedAt = readTrimmed(planningStateSource?.['planned_at']);
  const deferUntil = readTrimmed(planningStateSource?.['defer_until']);

  return {
    schema_version: 1,
    title: mergedTitle,
    fixed_rhythm: {
      lessons: readInteger(fixedRhythmSource?.['lessons']) ?? fallback.fixed_rhythm.lessons,
      podcasts: readInteger(fixedRhythmSource?.['podcasts']) ?? fallback.fixed_rhythm.podcasts,
    },
    planning_state: {
      is_planned: Boolean(planningStateSource?.['is_planned']),
      planned_at: plannedAt ?? null,
      defer_until: deferUntil ?? null,
    },
    time_budget: {
      lesson_min: lessonMin,
      podcast_min: podcastMin,
      review_min: reviewMin,
      study_minutes: lessonMin,
      podcast_minutes: podcastMin,
      review_minutes: reviewMin,
    },
    intent: mergedIntent,
    weekly_goals: goals
      .map((goal, index) => {
        const goalRecord = asRecord(goal);
        if (!goalRecord) {
          return null;
        }
        const label = readTrimmed(goalRecord['label']);
        if (!label) {
          return null;
        }
        return {
          id: readTrimmed(goalRecord['id']) ?? `g${index + 1}`,
          label,
          done: Boolean(goalRecord['done']),
        };
      })
      .filter((goal): goal is { id: string; label: string; done: boolean } => goal !== null),
    lanes: lanes
      .map((lane) => {
        const laneRecord = asRecord(lane);
        if (!laneRecord) {
          return null;
        }
        const key = readTrimmed(laneRecord['key']);
        const label = readTrimmed(laneRecord['label']);
        if (!key || !label || !isLane(key)) {
          return null;
        }
        return {
          key,
          label,
        };
      })
      .filter((lane): lane is { key: PlannerLane; label: string } => lane !== null),
    definition_of_done: definitionOfDone.length > 0 ? definitionOfDone : fallback.definition_of_done,
    metrics: {
      tasks_done_target:
        readInteger(metricsSource?.['tasks_done_target']) ?? fallback.metrics.tasks_done_target,
      minutes_target:
        readInteger(metricsSource?.['minutes_target']) ??
        lessonMin + podcastMin + reviewMin,
    },
  };
}

export function createDefaultTaskJson(title = 'New task'): PlannerTaskJson {
  return {
    schema_version: 1,
    lane: 'lesson',
    anchor: false,
    title,
    priority: 'P2',
    status: 'planned',
    estimate_min: 30,
    actual_min: null,
    assignment: {
      kind: 'none',
      ar_lesson_id: null,
      unit_id: null,
      topic: null,
      episode_no: null,
      recording_at: null,
    },
    tags: [],
    checklist: [],
    note: '',
    links: [],
    capture_on_done: {
      create_capture_note: true,
      template: 'What did I learn? What confused me? One next step.',
    },
    meta: {
      anchor_key: null,
      week_start: computeWeekStartSydney(),
    },
    order_index: Date.now(),
  };
}

function normalizeTaskStatus(raw: unknown, fallback: PlannerTaskStatus): PlannerTaskStatus {
  const status = readTrimmed(raw)?.toLowerCase();
  switch (status) {
    case 'planned':
    case 'todo':
      return 'planned';
    case 'doing':
      return 'doing';
    case 'done':
      return 'done';
    case 'blocked':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    default:
      return fallback === 'todo' ? 'planned' : fallback;
  }
}

function normalizeAnchorKey(raw: unknown): AnchorKey | null {
  const value = readTrimmed(raw);
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

export function normalizeTaskJson(input: unknown, titleFallback = 'New task'): PlannerTaskJson {
  const fallback = createDefaultTaskJson(titleFallback);
  const record = asRecord(input);
  if (!record) {
    return fallback;
  }

  const lane = readTrimmed(record['lane']);
  const priority = readTrimmed(record['priority']);
  const assignment = asRecord(record['assignment']);
  const meta = asRecord(record['meta']);
  const captureConfig = asRecord(record['capture_on_done']);

  return {
    schema_version: 1,
    lane: lane && isLane(lane) ? lane : fallback.lane,
    anchor: Boolean(record['anchor']),
    title: readTrimmed(record['title']) ?? fallback.title,
    priority: priority && isPriority(priority) ? priority : fallback.priority,
    status: normalizeTaskStatus(record['status'], fallback.status),
    estimate_min: readInteger(record['estimate_min']) ?? fallback.estimate_min,
    actual_min: readNumber(record['actual_min']),
    assignment: {
      kind: (() => {
        const kind = readTrimmed(assignment?.['kind']);
        if (kind === 'lesson' || kind === 'podcast' || kind === 'none') {
          return kind;
        }
        return fallback.assignment.kind;
      })(),
      ar_lesson_id: readInteger(assignment?.['ar_lesson_id']),
      unit_id: readTrimmed(assignment?.['unit_id']),
      topic: readTrimmed(assignment?.['topic']),
      episode_no: readInteger(assignment?.['episode_no']),
      recording_at: readTrimmed(assignment?.['recording_at']),
    },
    tags: Array.isArray(record['tags'])
      ? record['tags'].filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [],
    checklist: Array.isArray(record['checklist'])
      ? record['checklist']
          .map((item, index) => {
            const itemRecord = asRecord(item);
            const label = readTrimmed(itemRecord?.['label']);
            if (!label) {
              return null;
            }
            return {
              id: readTrimmed(itemRecord?.['id']) ?? `c${index + 1}`,
              label,
              done: Boolean(itemRecord?.['done']),
            };
          })
          .filter((item): item is { id: string; label: string; done: boolean } => item !== null)
      : [],
    note: readString(record['note']) ?? '',
    links: (() => {
      if (!Array.isArray(record['links'])) {
        return [] as Array<{ kind: string; container_id?: string; unit_id?: string; ref?: string }>;
      }

      const output: Array<{ kind: string; container_id?: string; unit_id?: string; ref?: string }> = [];
      for (const entry of record['links']) {
        const linkRecord = asRecord(entry);
        const kind = readTrimmed(linkRecord?.['kind']);
        if (!kind) {
          continue;
        }
        const nextLink: { kind: string; container_id?: string; unit_id?: string; ref?: string } = { kind };
        const containerId = readTrimmed(linkRecord?.['container_id']);
        const unitId = readTrimmed(linkRecord?.['unit_id']);
        const ref = readTrimmed(linkRecord?.['ref']);
        if (containerId) nextLink.container_id = containerId;
        if (unitId) nextLink.unit_id = unitId;
        if (ref) nextLink.ref = ref;
        output.push(nextLink);
      }
      return output;
    })(),
    capture_on_done: {
      create_capture_note: Boolean(
        captureConfig?.['create_capture_note'] ?? fallback.capture_on_done.create_capture_note
      ),
      template: readTrimmed(captureConfig?.['template']) ?? fallback.capture_on_done.template,
    },
    meta: {
      anchor_key: normalizeAnchorKey(meta?.['anchor_key']),
      week_start: normalizeIsoDate(readString(meta?.['week_start'])) ?? fallback.meta.week_start,
    },
    order_index: readInteger(record['order_index']) ?? fallback.order_index,
  };
}

export function createDefaultSprintReviewJson(weekStart: string): SprintReviewJson {
  return {
    schema_version: 1,
    title: `Sprint Review — Week of ${weekStart}`,
    outcomes: [],
    metrics: {
      tasks_done: 0,
      tasks_total: 0,
      minutes_spent: 0,
      capture_notes: 0,
      promoted_notes: 0,
    },
    what_worked: [],
    what_blocked: [],
    carry_over_task_ids: [],
    next_week_focus: [],
  };
}

export function normalizeSprintReviewJson(input: unknown, weekStart: string): SprintReviewJson {
  const fallback = createDefaultSprintReviewJson(weekStart);
  const record = asRecord(input);
  if (!record) {
    return fallback;
  }

  const metrics = asRecord(record['metrics']);
  return {
    schema_version: 1,
    title: readTrimmed(record['title']) ?? fallback.title,
    outcomes: Array.isArray(record['outcomes'])
      ? record['outcomes']
          .map((outcome) => {
            const item = asRecord(outcome);
            const label = readTrimmed(item?.['label']);
            const status = readTrimmed(item?.['status']);
            if (!label || !status || !isReviewOutcomeStatus(status)) {
              return null;
            }
            return { label, status };
          })
          .filter((outcome): outcome is { label: string; status: 'partial' | 'done' | 'missed' } => outcome !== null)
      : [],
    metrics: {
      tasks_done: readInteger(metrics?.['tasks_done']) ?? fallback.metrics.tasks_done,
      tasks_total: readInteger(metrics?.['tasks_total']) ?? fallback.metrics.tasks_total,
      minutes_spent: readInteger(metrics?.['minutes_spent']) ?? fallback.metrics.minutes_spent,
      capture_notes: readInteger(metrics?.['capture_notes']) ?? fallback.metrics.capture_notes,
      promoted_notes: readInteger(metrics?.['promoted_notes']) ?? fallback.metrics.promoted_notes,
    },
    what_worked: toStringArray(record['what_worked']),
    what_blocked: toStringArray(record['what_blocked']),
    carry_over_task_ids: toStringArray(record['carry_over_task_ids']),
    next_week_focus: toStringArray(record['next_week_focus']),
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

export function composeCaptureBody(meta: CaptureNoteMeta, text: string): string {
  const sanitizedText = text.replace(/^\s+/, '');
  return `${META_PREFIX}${JSON.stringify(meta)}-->\n${sanitizedText}`;
}

export function parseCaptureBody(bodyMarkdown: string): ParsedCaptureBody {
  const content = bodyMarkdown ?? '';
  const match = content.match(META_RE);
  if (!match) {
    return {
      meta: null,
      text: content.trim(),
    };
  }

  const metaRaw = match[1];
  const rest = content.slice(match[0].length).trim();
  try {
    const parsed = JSON.parse(metaRaw) as unknown;
    const record = asRecord(parsed);
    if (!record) {
      return { meta: null, text: rest };
    }
    const weekStart = normalizeIsoDate(readString(record['week_start']));
    const source = readTrimmed(record['source']);
    if (!weekStart || !source || !isCaptureSource(source)) {
      return { meta: null, text: rest };
    }
    return {
      meta: {
        schema_version: 1,
        kind: 'capture',
        week_start: weekStart,
        source,
        related_type: readTrimmed(record['related_type']) ?? undefined,
        related_id: readTrimmed(record['related_id']) ?? undefined,
        container_id: readTrimmed(record['container_id']) ?? undefined,
        unit_id: readTrimmed(record['unit_id']) ?? undefined,
        ref: readTrimmed(record['ref']) ?? undefined,
        task_type: readTrimmed(record['task_type']) ?? undefined,
      },
      text: rest,
    };
  } catch {
    return {
      meta: null,
      text: rest,
    };
  }
}

export function buildTaskCanonicalInput(args: {
  userId: number;
  weekStart: string;
  title: string;
  nonce: string;
}): string {
  return `PLANNER|task|user:${args.userId}|week:${args.weekStart}|title:${args.title}|nonce:${args.nonce}`;
}

export function buildWeekCanonicalInput(userId: number, weekStart: string): string {
  return `PLANNER|week_plan|user:${userId}|week:${weekStart}`;
}

export function buildReviewCanonicalInput(userId: number, weekStart: string): string {
  return `PLANNER|sprint_review|user:${userId}|week:${weekStart}`;
}

export function plannerPriorityToWeeklyPriority(priority: PlannerPriority): number {
  switch (priority) {
    case 'P1':
      return 1;
    case 'P2':
      return 3;
    case 'P3':
    default:
      return 5;
  }
}

export function weeklyPriorityToPlannerPriority(value: unknown): PlannerPriority {
  const priority = readInteger(value) ?? 3;
  if (priority <= 2) {
    return 'P1';
  }
  if (priority <= 4) {
    return 'P2';
  }
  return 'P3';
}

export function plannerStatusToWeeklyKanban(status: PlannerTaskStatus): WeeklyKanbanState {
  switch (status) {
    case 'doing':
      return 'doing';
    case 'done':
      return 'done';
    case 'blocked':
      return 'blocked';
    case 'skipped':
      return 'blocked';
    case 'planned':
    case 'todo':
    default:
      return 'backlog';
  }
}

export function plannerStatusToWeeklyStatus(status: PlannerTaskStatus): WeeklyTaskStatus {
  switch (status) {
    case 'doing':
      return 'active';
    case 'done':
      return 'done';
    case 'blocked':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    case 'planned':
    case 'todo':
    default:
      return 'planned';
  }
}

export function weeklyToPlannerStatus(
  weeklyStatus: string | null | undefined,
  kanbanState: string | null | undefined
): PlannerTaskStatus {
  const status = (weeklyStatus ?? '').trim().toLowerCase();
  const kanban = (kanbanState ?? '').trim().toLowerCase();

  if (status === 'done' || kanban === 'done') {
    return 'done';
  }
  if (status === 'blocked' || status === 'skipped' || kanban === 'blocked') {
    return 'blocked';
  }
  if (status === 'active' || kanban === 'doing') {
    return 'doing';
  }
  return 'planned';
}

function deriveTaskTitle(raw: Record<string, unknown>, fallback = 'Task'): string {
  const explicit = readTrimmed(raw['title']);
  if (explicit) {
    return explicit;
  }
  const fromJson = readTrimmed(asRecord(parseJsonObject(raw['task_json']))?.['title']);
  return fromJson ?? fallback;
}

export function mapWeeklyTaskToPlannerTaskRow(raw: Record<string, unknown>): PlannerTaskApiRow | null {
  const id = readInteger(raw['id']);
  const userId = readInteger(raw['user_id']);
  const weekStart = normalizeIsoDate(readString(raw['week_start']));
  const createdAt = readString(raw['created_at']);
  if (id === null || userId === null || !weekStart || !createdAt) {
    return null;
  }

  const storedTaskJson = parseJsonObject(raw['task_json']) ?? {};
  const title = deriveTaskTitle(raw, 'Task');
  const normalized = normalizeTaskJson(
    {
      ...storedTaskJson,
      title,
      priority:
        readTrimmed(asRecord(storedTaskJson)?.['priority']) ??
        weeklyPriorityToPlannerPriority(raw['priority']),
      status:
        readTrimmed(asRecord(storedTaskJson)?.['status']) ??
        weeklyToPlannerStatus(readString(raw['status']), readString(raw['kanban_state'])),
    },
    title
  );

  const relatedLessonId = readInteger(raw['ar_lesson_id']);
  const relatedContentId = readTrimmed(raw['wv_content_item_id']);
  const relatedClaimId = readTrimmed(raw['wv_claim_id']);

  let relatedType: string | null = null;
  let relatedId: string | null = null;

  if (relatedLessonId !== null) {
    relatedType = 'ar_lesson';
    relatedId = String(relatedLessonId);
  } else if (relatedContentId) {
    relatedType = 'wv_content_item';
    relatedId = relatedContentId;
  } else if (relatedClaimId) {
    relatedType = 'wv_claim';
    relatedId = relatedClaimId;
  }

  const sourceTaskId = readTrimmed(raw['source_task_id']);
  const canonicalInput = sourceTaskId
    ? `SP_WEEKLY_TASK|source:${sourceTaskId}|week:${weekStart}`
    : `SP_WEEKLY_TASK|id:${id}`;

  return {
    id: String(id),
    canonical_input: canonicalInput,
    user_id: userId,
    item_type: 'task',
    week_start: weekStart,
    period_start: null,
    period_end: null,
    related_type: relatedType,
    related_id: relatedId,
    item_json: normalized as unknown as Record<string, unknown>,
    status: readTrimmed(raw['status']) ?? 'planned',
    created_at: createdAt,
    updated_at: readString(raw['updated_at']),
  };
}

async function weeklySprintTablesExist(db: D1Database): Promise<boolean> {
  const weeklyPlans = await db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'sp_weekly_plans'
      LIMIT 1
      `
    )
    .first<Record<string, unknown>>();
  const weeklyTasks = await db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'sp_weekly_tasks'
      LIMIT 1
      `
    )
    .first<Record<string, unknown>>();
  return Boolean(weeklyPlans && weeklyTasks);
}

async function weeklyTasksHasSourceTaskIdColumn(db: D1Database): Promise<boolean> {
  const info = await db
    .prepare(
      `
      PRAGMA table_info(sp_weekly_tasks)
      `
    )
    .all<Record<string, unknown>>();

  for (const row of info.results ?? []) {
    if (readTrimmed(row['name']) === 'source_task_id') {
      return true;
    }
  }
  return false;
}

export async function ensureWeeklyPlanExists(args: {
  db: D1Database;
  userId: number;
  weekStart: string;
  title?: string | null;
}): Promise<void> {
  const normalized = normalizeIsoDate(args.weekStart);
  const weekStart = computeWeekStartSydney(normalized ?? args.weekStart);
  const weekJson = createDefaultWeekPlanJson(weekStart, args.title);

  await args.db
    .prepare(
      `
      INSERT OR IGNORE INTO sp_weekly_plans
        (week_start, user_id, notes, planned_count, done_count, week_json, created_at, updated_at)
      VALUES
        (?1, ?2, NULL, 0, 0, ?3, datetime('now'), datetime('now'))
      `
    )
    .bind(weekStart, args.userId, JSON.stringify(weekJson))
    .run();
}

function anchorOrderIndex(anchorKey: AnchorKey): number {
  const index = WEEKLY_ANCHOR_DEFINITIONS.findIndex((item) => item.key === anchorKey);
  return index >= 0 ? (index + 1) * 100 : 900;
}

function createAnchorTaskJson(args: {
  weekStart: string;
  anchor: AnchorDefinition;
  title?: string;
  assignment?: Partial<PlannerTaskJson['assignment']> | null;
}): PlannerTaskJson {
  const base = createDefaultTaskJson(args.title ?? args.anchor.title);
  const assignmentBase: PlannerTaskJson['assignment'] =
    args.anchor.assignmentKind === 'lesson'
      ? {
          kind: 'lesson',
          ar_lesson_id: null,
          unit_id: null,
          topic: null,
          episode_no: null,
          recording_at: null,
        }
      : {
          kind: 'podcast',
          ar_lesson_id: null,
          unit_id: null,
          topic: `Topic ${args.anchor.key.endsWith('_1') ? '1' : args.anchor.key.endsWith('_2') ? '2' : '3'}`,
          episode_no: Number(args.anchor.key.split('_')[1]),
          recording_at: null,
        };

  return normalizeTaskJson(
    {
      ...base,
      lane: args.anchor.lane,
      anchor: true,
      title: readTrimmed(args.title) ?? args.anchor.title,
      priority: args.anchor.priority,
      status: 'planned',
      estimate_min: args.anchor.estimateMin,
      assignment: {
        ...assignmentBase,
        ...(args.assignment ?? {}),
      },
      tags: Array.from(new Set([...(base.tags ?? []), 'anchor', args.anchor.lane])),
      meta: {
        anchor_key: args.anchor.key,
        week_start: args.weekStart,
      },
      order_index: anchorOrderIndex(args.anchor.key),
    },
    args.anchor.title
  );
}

function createPodcastContentJson(args: {
  weekStart: string;
  anchorKey: AnchorKey;
  title: string;
  assignment: PlannerTaskJson['assignment'];
}): Record<string, unknown> {
  return {
    schema_version: 1,
    source: 'weekly_anchor',
    week_start: args.weekStart,
    anchor_key: args.anchorKey,
    episode_no: args.assignment.episode_no,
    topic: args.assignment.topic,
    recording_at: args.assignment.recording_at,
    outline: [],
    script: '',
    checklist: [],
  };
}

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<Record<string, unknown>>();
  return Boolean(row);
}

function podcastCanonicalInput(userId: number, weekStart: string, anchorKey: AnchorKey): string {
  return `PODCAST|anchor|user:${userId}|week:${weekStart}|key:${anchorKey}`;
}

export async function ensurePodcastEpisodeForAnchor(args: {
  db: D1Database;
  userId: number;
  weekStart: string;
  anchorKey: AnchorKey;
  title: string;
  assignment: PlannerTaskJson['assignment'];
}): Promise<string | null> {
  if (!(await hasTable(args.db, 'wv_content_items'))) {
    return null;
  }

  const canonicalInput = podcastCanonicalInput(args.userId, args.weekStart, args.anchorKey);
  const id = await sha256Hex(canonicalInput);
  const contentJson = createPodcastContentJson({
    weekStart: args.weekStart,
    anchorKey: args.anchorKey,
    title: args.title,
    assignment: args.assignment,
  });

  await args.db
    .prepare(
      `
      INSERT OR IGNORE INTO wv_content_items
        (id, canonical_input, user_id, title, content_type, status, related_type, related_id, refs_json, content_json, created_at, updated_at)
      VALUES
        (?1, ?2, ?3, ?4, 'podcast_episode', 'draft', 'sp_weekly_plans', ?5, json('{}'), ?6, datetime('now'), datetime('now'))
      `
    )
    .bind(
      id,
      canonicalInput,
      args.userId,
      args.title,
      `${args.weekStart}:${args.anchorKey}`,
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
    .bind(args.title, JSON.stringify(contentJson), id, args.userId)
    .run();

  return id;
}

export async function ensureWeekAnchors(args: {
  db: D1Database;
  userId: number;
  weekStart: string;
}): Promise<void> {
  if (!(await weeklySprintTablesExist(args.db))) {
    return;
  }

  await ensureWeeklyPlanExists({
    db: args.db,
    userId: args.userId,
    weekStart: args.weekStart,
  });

  const taskRows = await args.db
    .prepare(
      `
      SELECT id, task_json, wv_content_item_id
      FROM sp_weekly_tasks
      WHERE user_id = ?1
        AND week_start = ?2
      `
    )
    .bind(args.userId, args.weekStart)
    .all<Record<string, unknown>>();

  const existingByAnchor = new Map<AnchorKey, Record<string, unknown>>();
  const hasSourceTaskIdColumn = await weeklyTasksHasSourceTaskIdColumn(args.db);
  for (const row of taskRows.results ?? []) {
    const taskJson = normalizeTaskJson(parseJsonObject(row['task_json']) ?? {}, 'Task');
    const key = taskJson.meta.anchor_key;
    if (!key) {
      continue;
    }
    existingByAnchor.set(key, row);
  }

  for (const anchor of WEEKLY_ANCHOR_DEFINITIONS) {
    const existing = existingByAnchor.get(anchor.key);
    if (existing) {
      if (anchor.lane === 'podcast' && !readTrimmed(existing['wv_content_item_id'])) {
        const currentJson = normalizeTaskJson(parseJsonObject(existing['task_json']) ?? {}, anchor.title);
        const existingId = readInteger(existing['id']);
        if (existingId === null) {
          continue;
        }
        const podcastId = await ensurePodcastEpisodeForAnchor({
          db: args.db,
          userId: args.userId,
          weekStart: args.weekStart,
          anchorKey: anchor.key,
          title: currentJson.title,
          assignment: currentJson.assignment,
        });
        if (podcastId) {
          await args.db
            .prepare(
              `
              UPDATE sp_weekly_tasks
              SET wv_content_item_id = ?1,
                  task_json = ?2,
                  updated_at = datetime('now')
              WHERE id = ?3
                AND user_id = ?4
              `
            )
            .bind(podcastId, JSON.stringify(currentJson), existingId, args.userId)
            .run();
        }
      }
      continue;
    }

    const itemJson = createAnchorTaskJson({
      weekStart: args.weekStart,
      anchor,
    });
    let podcastContentId: string | null = null;
    if (anchor.lane === 'podcast') {
      const podcastId = await ensurePodcastEpisodeForAnchor({
        db: args.db,
        userId: args.userId,
        weekStart: args.weekStart,
        anchorKey: anchor.key,
        title: itemJson.title,
        assignment: itemJson.assignment,
      });
      podcastContentId = podcastId;
    }

    if (hasSourceTaskIdColumn) {
      await args.db
        .prepare(
          `
          INSERT INTO sp_weekly_tasks
            (user_id, week_start, title, task_type, kanban_state, status, priority, points, due_date, order_index, task_json, ar_lesson_id, wv_claim_id, wv_content_item_id, source_task_id, created_at, updated_at)
          VALUES
            (?1, ?2, ?3, ?4, 'backlog', 'planned', ?5, NULL, NULL, ?6, ?7, NULL, NULL, ?8, ?9, datetime('now'), datetime('now'))
          `
        )
        .bind(
          args.userId,
          args.weekStart,
          itemJson.title,
          anchor.lane === 'lesson' ? 'lesson_unit_task' : 'podcast',
          plannerPriorityToWeeklyPriority(itemJson.priority),
          itemJson.order_index ?? anchorOrderIndex(anchor.key),
          JSON.stringify(itemJson),
          podcastContentId,
          `ANCHOR:${anchor.key}:${args.weekStart}`
        )
        .run();
    } else {
      await args.db
        .prepare(
          `
          INSERT INTO sp_weekly_tasks
            (user_id, week_start, title, task_type, kanban_state, status, priority, points, due_date, order_index, task_json, ar_lesson_id, wv_claim_id, wv_content_item_id, created_at, updated_at)
          VALUES
            (?1, ?2, ?3, ?4, 'backlog', 'planned', ?5, NULL, NULL, ?6, ?7, NULL, NULL, ?8, datetime('now'), datetime('now'))
          `
        )
        .bind(
          args.userId,
          args.weekStart,
          itemJson.title,
          anchor.lane === 'lesson' ? 'lesson_unit_task' : 'podcast',
          plannerPriorityToWeeklyPriority(itemJson.priority),
          itemJson.order_index ?? anchorOrderIndex(anchor.key),
          JSON.stringify(itemJson),
          podcastContentId
        )
        .run();
    }
  }
}

function coerceWeeklyPriority(input: unknown, fallback: PlannerPriority): number {
  if (typeof input === 'string') {
    const normalized = input.trim().toUpperCase();
    if (normalized === 'P1' || normalized === 'P2' || normalized === 'P3') {
      return plannerPriorityToWeeklyPriority(normalized);
    }
  }
  const numeric = readInteger(input);
  if (numeric !== null) {
    return Math.max(1, Math.min(5, numeric));
  }
  return plannerPriorityToWeeklyPriority(fallback);
}

function buildLessonPlannerTaskJson(args: {
  title: string;
  taskType: string;
  rawTaskJson: Record<string, unknown> | null;
  linkContext?: WeeklySprintTaskLinkContext;
}): PlannerTaskJson {
  const links: Array<{ kind: string; container_id?: string; unit_id?: string; ref?: string }> = [];
  if (args.linkContext?.unitId) {
    links.push({
      kind: 'unit',
      container_id: args.linkContext.containerId ?? undefined,
      unit_id: args.linkContext.unitId,
      ref: args.linkContext.ref ?? undefined,
    });
  }
  if (args.linkContext?.ref) {
    links.push({
      kind: 'ayah',
      ref: args.linkContext.ref,
    });
  }

  const source = args.rawTaskJson ?? {};
  const merged = normalizeTaskJson(
    {
      ...source,
      lane: 'lesson',
      title: readTrimmed(source['title']) ?? args.title,
      status:
        (readTrimmed(source['status']) &&
        isTaskStatus(readTrimmed(source['status']) as PlannerTaskStatus)
          ? readTrimmed(source['status'])
          : 'planned') ?? 'planned',
      priority:
        (readTrimmed(source['priority']) &&
        isPriority(readTrimmed(source['priority']) as PlannerPriority)
          ? readTrimmed(source['priority'])
          : 'P2') ?? 'P2',
      links: links.length ? links : source['links'],
      note: readString(source['note']) ?? '',
      capture_on_done: asRecord(source['capture_on_done']) ?? {
        create_capture_note: true,
        template: 'What did I learn? What confused me? One next step.',
      },
    },
    args.title
  );

  return {
    ...merged,
    tags: Array.from(new Set([...(merged.tags ?? []), 'lesson', args.taskType])),
  };
}

export async function ensureLessonWeeklyTask(args: EnsureLessonWeeklyTaskArgs): Promise<void> {
  if (!(await weeklySprintTablesExist(args.db))) {
    return;
  }

  const record = asRecord(args.taskJson);
  const requestedWeekStart = normalizeIsoDate(readString(record?.['week_start']));
  const weekStart = computeWeekStartSydney(requestedWeekStart);
  const plannerTask = buildLessonPlannerTaskJson({
    title: args.taskName,
    taskType: args.taskType,
    rawTaskJson: record,
    linkContext: args.linkContext,
  });

  const priority = coerceWeeklyPriority(record?.['priority'], plannerTask.priority);
  const dueDate = normalizeIsoDate(readString(record?.['due_date']));
  const points = readNumber(record?.['points']);
  const orderIndex = readInteger(record?.['order_index']) ?? readInteger(plannerTask.order_index) ?? 0;
  const sourceJson = {
    ...plannerTask,
    source_meta: {
      source: 'ar_container_unit_task',
      task_id: args.taskId,
      unit_id: args.unitId,
      task_type: args.taskType,
      lesson_id: args.lessonId,
      container_id: args.linkContext?.containerId ?? null,
      ref: args.linkContext?.ref ?? null,
      raw_task_json: args.taskJson,
    },
  };

  await ensureWeeklyPlanExists({
    db: args.db,
    userId: args.userId,
    weekStart,
  });

  const hasSourceTaskIdColumn = await weeklyTasksHasSourceTaskIdColumn(args.db);
  if (hasSourceTaskIdColumn) {
    await args.db
      .prepare(
        `
        INSERT OR IGNORE INTO sp_weekly_tasks (
          user_id,
          week_start,
          title,
          task_type,
          kanban_state,
          status,
          priority,
          points,
          due_date,
          order_index,
          task_json,
          ar_lesson_id,
          source_task_id,
          created_at,
          updated_at
        ) VALUES (
          ?1, ?2, ?3, 'lesson_unit_task', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, datetime('now'), datetime('now')
        )
        `
      )
      .bind(
        args.userId,
        weekStart,
        plannerTask.title,
        plannerStatusToWeeklyKanban(plannerTask.status),
        plannerStatusToWeeklyStatus(plannerTask.status),
        priority,
        points,
        dueDate,
        orderIndex,
        JSON.stringify(sourceJson),
        args.lessonId,
        args.taskId
      )
      .run();
  } else {
    await args.db
      .prepare(
        `
        INSERT OR IGNORE INTO sp_weekly_tasks (
          user_id,
          week_start,
          title,
          task_type,
          kanban_state,
          status,
          priority,
          points,
          due_date,
          order_index,
          task_json,
          ar_lesson_id,
          created_at,
          updated_at
        ) VALUES (
          ?1, ?2, ?3, 'lesson_unit_task', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, datetime('now'), datetime('now')
        )
        `
      )
      .bind(
        args.userId,
        weekStart,
        plannerTask.title,
        plannerStatusToWeeklyKanban(plannerTask.status),
        plannerStatusToWeeklyStatus(plannerTask.status),
        priority,
        points,
        dueDate,
        orderIndex,
        JSON.stringify(sourceJson),
        args.lessonId
      )
      .run();
  }
}

export async function insertActivityLog(args: {
  db: D1Database;
  userId: number;
  eventType: string;
  targetType?: string | null;
  targetId?: string | null;
  ref?: string | null;
  note?: string | null;
  eventJson?: unknown;
}): Promise<void> {
  await args.db
    .prepare(
      `
      INSERT INTO user_activity_logs (user_id, event_type, target_type, target_id, ref, note, event_json, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
      `
    )
    .bind(
      args.userId,
      args.eventType,
      args.targetType ?? null,
      args.targetId ?? null,
      args.ref ?? null,
      args.note ?? null,
      args.eventJson === undefined ? null : JSON.stringify(args.eventJson)
    )
    .run();
}

export function mapPlannerRow(raw: Record<string, unknown>): PlannerRow | null {
  const id = readTrimmed(raw['id']);
  const canonicalInput = readTrimmed(raw['canonical_input']);
  const userId = readInteger(raw['user_id']);
  const itemType = readTrimmed(raw['item_type']);
  const itemJson = readString(raw['item_json']);
  const status = readTrimmed(raw['status']);
  const createdAt = readString(raw['created_at']);
  if (
    !id ||
    !canonicalInput ||
    userId === null ||
    !itemType ||
    !isPlannerItemType(itemType) ||
    itemJson === null ||
    !status ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    canonical_input: canonicalInput,
    user_id: userId,
    item_type: itemType,
    week_start: readString(raw['week_start']),
    period_start: readString(raw['period_start']),
    period_end: readString(raw['period_end']),
    related_type: readString(raw['related_type']),
    related_id: readString(raw['related_id']),
    item_json: itemJson,
    status,
    created_at: createdAt,
    updated_at: readString(raw['updated_at']),
  };
}

export function isLane(value: string): value is PlannerLane {
  return value === 'lesson' || value === 'podcast' || value === 'notes' || value === 'admin';
}

export function isPriority(value: string): value is PlannerPriority {
  return value === 'P1' || value === 'P2' || value === 'P3';
}

export function isTaskStatus(value: string): value is PlannerTaskStatus {
  return (
    value === 'planned' ||
    value === 'todo' ||
    value === 'doing' ||
    value === 'done' ||
    value === 'blocked' ||
    value === 'skipped'
  );
}

export function isCaptureSource(value: string): value is CaptureSource {
  return value === 'weekly' || value === 'lesson' || value === 'podcast';
}

export function isPlannerItemType(
  value: string
): value is 'week_plan' | 'task' | 'sprint_review' {
  return value === 'week_plan' || value === 'task' || value === 'sprint_review';
}

export function isReviewOutcomeStatus(value: string): value is 'partial' | 'done' | 'missed' {
  return value === 'partial' || value === 'done' || value === 'missed';
}
