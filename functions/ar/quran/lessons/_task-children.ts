type JsonLike = Record<string, unknown> | unknown[];

const QURAN_CONTAINER_TYPE = 'quran';
const QURAN_ID_NAMESPACE = 'QURAN';
const QURAN_ID_NAMESPACE_BY_CONTAINER_TYPE: Record<string, string> = {
  [QURAN_CONTAINER_TYPE]: QURAN_ID_NAMESPACE,
};

export interface ChildTaskSeed {
  taskId: string;
  taskName: string;
  taskJson: JsonLike;
  stepNo: number;
}

const TASK_STEP_BASES: Record<string, number> = {
  reading: 100,
  morphology: 200,
  sentence_structure: 300,
  expressions: 400,
  comprehension: 500,
  passage_structure: 600,
  grammar_concepts: 700,
  worldview: 800,
  translation_semantics: 900,
  near_synonyms: 1000,
  surah_analysis: 1100,
  cross_corpus: 1200,
  children_lesson: 1300,
};

const TASK_ID_SEGMENTS: Record<string, string> = {
  reading: 'RDG',
  sentence_structure: 'SS',
  morphology: 'MOR',
  expressions: 'EXP',
  comprehension: 'CMP',
  passage_structure: 'PS',
  grammar_concepts: 'GRAM',
  worldview: 'WV',
  translation_semantics: 'TS',
  near_synonyms: 'NS',
  surah_analysis: 'SA',
  cross_corpus: 'CC',
  children_lesson: 'CL',
};

const PASSAGE_CHILD_TASK_TYPES = new Set([
  'reading',
  'morphology',
  'expressions',
  'comprehension',
  'passage_structure',
]);

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function readNestedString(source: Record<string, unknown> | null, ...path: string[]): string | null {
  let current: unknown = source;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[key];
  }
  return asString(current);
}

function parseVerseRange(raw: string | null): { ayahFrom: number | null; ayahTo: number | null } {
  if (!raw) return { ayahFrom: null, ayahTo: null };
  const match = raw.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) return { ayahFrom: null, ayahTo: null };
  const ayahFrom = Number(match[1]);
  const ayahTo = match[2] ? Number(match[2]) : ayahFrom;
  if (!Number.isFinite(ayahFrom) || !Number.isFinite(ayahTo)) {
    return { ayahFrom: null, ayahTo: null };
  }
  return { ayahFrom, ayahTo };
}

function resolvePassageScope(taskJson: JsonLike): { surah: number | null; ayahFrom: number | null; ayahTo: number | null } {
  const record = asRecord(taskJson);
  if (!record) return { surah: null, ayahFrom: null, ayahTo: null };

  const meta = asRecord(record['meta']);
  const scope = asRecord(record['scope']);
  const ref = asRecord(scope?.['ref']);
  const range = parseVerseRange(asString(ref?.['verses']));

  const surah =
    asInteger(record['surah'])
    ?? asInteger(meta?.['surah'])
    ?? asInteger(ref?.['surah']);
  const ayahFrom =
    asInteger(record['ayah_from'])
    ?? asInteger(meta?.['ayah'])
    ?? range.ayahFrom;
  const ayahTo =
    asInteger(record['ayah_to'])
    ?? asInteger(meta?.['ayah'])
    ?? range.ayahTo
    ?? ayahFrom;

  return { surah, ayahFrom, ayahTo };
}

function formatPassageRange(ayahFrom: number, ayahTo: number): string {
  return ayahFrom === ayahTo ? `${ayahFrom}` : `${ayahFrom}-${ayahTo}`;
}

function resolveQuranIdNamespace(containerType = QURAN_CONTAINER_TYPE): string {
  return QURAN_ID_NAMESPACE_BY_CONTAINER_TYPE[containerType] ?? QURAN_ID_NAMESPACE;
}

function resolveTaskIdScope(unitId: string, taskJson: JsonLike): string {
  const scope = resolvePassageScope(taskJson);
  if (scope.surah && scope.ayahFrom && scope.ayahTo) {
    return `C:${resolveQuranIdNamespace()}:${scope.surah}:${formatPassageRange(scope.ayahFrom, scope.ayahTo)}`;
  }

  const parts = unitId.split(':');
  if (parts.length >= 5 && parts[0] === 'U' && parts[1] === 'C' && parts[2] === QURAN_ID_NAMESPACE) {
    const surah = asInteger(parts[3]);
    const range = parseVerseRange(parts[parts.length - 1] ?? null);
    if (surah && range.ayahFrom && range.ayahTo) {
      return `C:${resolveQuranIdNamespace()}:${surah}:${formatPassageRange(range.ayahFrom, range.ayahTo)}`;
    }
  }

  return unitId.startsWith('U:') ? unitId.slice(2) : unitId;
}

function buildPassageChildName(taskName: string, taskJson: JsonLike): string {
  const scope = resolvePassageScope(taskJson);
  if (scope.surah && scope.ayahFrom && scope.ayahTo) {
    const ref = scope.ayahFrom === scope.ayahTo
      ? `${scope.surah}:${scope.ayahFrom}`
      : `${scope.surah}:${scope.ayahFrom}-${scope.ayahTo}`;
    return `${taskName} • ${ref}`;
  }
  return `${taskName} Child`;
}

function getTaskIdSegment(taskType: string): string {
  return TASK_ID_SEGMENTS[taskType] ?? taskType.toUpperCase();
}

function formatTaskIdStepNo(stepNo: number): string {
  return String(Math.max(0, stepNo));
}

export function buildTaskRootId(args: {
  unitId: string;
  taskType: string;
  taskJson: JsonLike;
}): string {
  return `UT:${resolveTaskIdScope(args.unitId, args.taskJson)}:${getTaskIdSegment(args.taskType)}:${formatTaskIdStepNo(getTaskRootStepNo(args.taskType))}`;
}

function buildTaskChildId(args: {
  unitId: string;
  taskType: string;
  taskJson: JsonLike;
  index: number;
}): string {
  return `UT:${resolveTaskIdScope(args.unitId, args.taskJson)}:${getTaskIdSegment(args.taskType)}:${formatTaskIdStepNo(getTaskChildStepNo(args.taskType, args.index))}`;
}

function buildSentenceChildName(taskName: string, item: Record<string, unknown>, index: number): string {
  const meta = asRecord(item['meta']);
  const sentenceRef = asString(meta?.['sentence_ref']) ?? asString(item['sentence_ref']);
  const sentenceNo = asInteger(item['sentence_no']) ?? asInteger(item['sentence_order']) ?? index + 1;
  if (sentenceRef) {
    return `${taskName} • ${sentenceRef} • Sent ${sentenceNo}`;
  }
  return `${taskName} • Sent ${sentenceNo}`;
}

export function getTaskStepBase(taskType: string): number {
  return TASK_STEP_BASES[taskType] ?? 99000;
}

export function getTaskRootStepNo(taskType: string): number {
  return getTaskStepBase(taskType);
}

export function getTaskChildStepNo(taskType: string, index: number): number {
  return getTaskStepBase(taskType) + index;
}

export function buildChildTaskSeeds(args: {
  unitId: string;
  taskType: string;
  taskName: string;
  taskJson: JsonLike;
}): ChildTaskSeed[] {
  const { unitId, taskType, taskName, taskJson } = args;

  if (taskType === 'sentence_structure') {
    const record = asRecord(taskJson);
    if (!record) return [];

    const items = asArray(record['items']);
    if (items.length) {
      const seeds: ChildTaskSeed[] = [];
      items.forEach((rawItem, index) => {
        const item = asRecord(rawItem);
        if (!item) return;
        seeds.push({
          taskId: buildTaskChildId({
            unitId,
            taskType,
            taskJson,
            index: index + 1,
          }),
          taskName: buildSentenceChildName(taskName, item, index),
          taskJson: item,
          stepNo: getTaskChildStepNo(taskType, index + 1),
        });
      });
      return seeds;
    }

    const singleSentence = asRecord(taskJson);
    if (!singleSentence) return [];
    return [
      {
        taskId: buildTaskChildId({
          unitId,
          taskType,
          taskJson,
          index: 1,
        }),
        taskName: buildSentenceChildName(taskName, singleSentence, 0),
        taskJson,
        stepNo: getTaskChildStepNo(taskType, 1),
      },
    ];
  }

  if (!PASSAGE_CHILD_TASK_TYPES.has(taskType)) {
    return [];
  }

  return [
    {
      taskId: buildTaskChildId({
        unitId,
        taskType,
        taskJson,
        index: 1,
      }),
      taskName: buildPassageChildName(taskName, taskJson),
      taskJson,
      stepNo: getTaskChildStepNo(taskType, 1),
    },
  ];
}

export async function syncChildTasks(
  db: D1Database,
  args: {
    unitId: string;
    parentTaskId: string;
    taskType: string;
    taskName: string;
    taskJson: JsonLike;
    status: string;
  },
): Promise<ChildTaskSeed[]> {
  const seeds = buildChildTaskSeeds(args);

  for (const seed of seeds) {
    await db
      .prepare(
        `
        INSERT INTO ar_container_unit_task (
          task_id, unit_id, parent_task_id, task_type, task_name, step_no, task_json, status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, json(?7), ?8)
        ON CONFLICT(task_id)
        DO UPDATE SET
          parent_task_id = excluded.parent_task_id,
          task_type = excluded.task_type,
          task_name = excluded.task_name,
          step_no = excluded.step_no,
          task_json = excluded.task_json,
          status = excluded.status,
          deleted_at = NULL
      `
      )
      .bind(
        seed.taskId,
        args.unitId,
        args.parentTaskId,
        args.taskType,
        seed.taskName,
        seed.stepNo,
        JSON.stringify(seed.taskJson),
        args.status,
      )
      .run();
  }

  if (seeds.length) {
    const placeholders = seeds.map(() => '?').join(', ');
    await db
      .prepare(
        `
        DELETE FROM ar_container_unit_task
        WHERE unit_id = ?1
          AND parent_task_id = ?2
          AND task_id NOT IN (${placeholders})
      `
      )
      .bind(args.unitId, args.parentTaskId, ...seeds.map((seed) => seed.taskId))
      .run();
  } else {
    await db
      .prepare(
        `
        DELETE FROM ar_container_unit_task
        WHERE unit_id = ?1
          AND parent_task_id = ?2
      `
      )
      .bind(args.unitId, args.parentTaskId)
      .run();
  }

  return seeds;
}
