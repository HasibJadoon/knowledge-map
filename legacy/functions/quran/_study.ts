import type { D1Database } from '@cloudflare/workers-types';

export interface QuranStudyEnv {
  DB_QR?: D1Database;
}

type JsonRecord = Record<string, unknown>;

interface PassageRow extends JsonRecord {
  id: string;
  surah: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  public_unit_id: string;
  public_surah_unit_id?: string | null;
  legacy_container_id?: string | null;
  legacy_lesson_id?: number | null;
  label?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  subtitle?: string | null;
  theme?: string | null;
  start_ref?: string | null;
  end_ref?: string | null;
  text_cache?: string | null;
  meta_json?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
}

interface UnitTaskVm {
  task_id: string;
  unit_id?: string;
  parent_task_id?: string | null;
  task_type: string;
  task_name?: string | null;
  step_no?: number | null;
  status?: string | null;
  task_json?: unknown;
  updated_at?: string | null;
  children?: UnitTaskVm[];
}

interface StudyWordVm {
  word_id: string;
  ayah: number;
  position: number;
  word: string;
  simple?: string;
  translation?: string;
  lemma?: string;
  root?: string;
  gloss?: string;
  meanings?: string;
  verb_form?: string;
  pattern?: string;
  transitivity?: string;
  morphology?: {
    verb_form?: string;
    derived_pattern?: string;
    noun_number?: string;
    transitivity?: string;
  };
}

const QURAN_CONTAINER_ID = 'C:QURAN';

const TASK_ORDER: Record<string, number> = {
  reading: 100,
  morphology: 200,
  sentence_structure: 300,
  expressions: 400,
  comprehension: 500,
  passage_structure: 600,
};

export function parsePositiveInt(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function getQrDb(env: QuranStudyEnv): D1Database | null {
  return env.DB_QR ?? null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseMeta(value: unknown): JsonRecord {
  const parsed = parseJson(value);
  return asRecord(parsed) ?? {};
}

function taskOrder(task: UnitTaskVm): number {
  return asNumber(task.step_no) ?? TASK_ORDER[task.task_type] ?? 99000;
}

function sortTasks<T extends UnitTaskVm>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => taskOrder(a) - taskOrder(b) || a.task_id.localeCompare(b.task_id));
}

function unitFromPassage(p: PassageRow) {
  return {
    unit_id: p.public_unit_id,
    container_id: p.legacy_container_id ?? QURAN_CONTAINER_ID,
    order_index: p.passage_no,
    ayah_from: p.ayah_from,
    ayah_to: p.ayah_to,
    start_ref: p.start_ref ?? `${p.surah}:${p.ayah_from}`,
    end_ref: p.end_ref ?? `${p.surah}:${p.ayah_to}`,
    text_cache: p.text_cache ?? undefined,
    label: p.label ?? `Passage ${p.passage_no}`,
    theme: p.theme ?? undefined,
  };
}

function surahMetaFromPassage(surahId: number, passage?: PassageRow | null) {
  const meta = parseMeta(passage?.meta_json);
  const nameAr = asString(passage?.name_ar) ?? asString(meta['name_ar']);
  const nameEn = asString(passage?.name_en) ?? asString(meta['name_en']);
  return {
    container_id: QURAN_CONTAINER_ID,
    container_key: 'quran',
    surah_unit_id: `U:${QURAN_CONTAINER_ID}:${surahId}`,
    title: asString(meta['title']) ?? (nameEn ? `Surah ${nameEn}` : `Surah ${surahId}`),
    surah: surahId,
    name_ar: nameAr ?? undefined,
    name_en: nameEn ?? undefined,
    meta_json: passage?.meta_json ?? undefined,
  };
}

async function allRows<T extends JsonRecord>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = binds.length ? await stmt.bind(...binds).all<T>() : await stmt.all<T>();
  return (result.results ?? []) as T[];
}

async function loadQrPassages(db: D1Database, surahId: number): Promise<PassageRow[]> {
  const rows = await allRows<PassageRow>(db, `
    SELECT
      p.*,
      s.name_ar,
      s.name_en
    FROM qr_surah_study_passages p
    LEFT JOIN qr_surahs s ON s.id = p.surah
    WHERE p.surah = ?1
      AND p.status != 'deleted'
    ORDER BY p.passage_no
  `, surahId);
  return rows.map((row) => ({
    ...row,
    passage_no: Number(row.passage_no),
    ayah_from: Number(row.ayah_from),
    ayah_to: Number(row.ayah_to),
    surah: Number(row.surah),
  }));
}

async function loadQrTasks(db: D1Database, passage: PassageRow): Promise<UnitTaskVm[]> {
  const rows = await allRows<JsonRecord>(db, `
    SELECT
      task_id,
      unit_id,
      parent_task_id,
      task_type,
      task_name,
      step_no,
      status,
      task_json,
      updated_at
    FROM qr_vw_surah_study_tasks_compat
    WHERE passage_id = ?1
    ORDER BY COALESCE(step_no, 99999), task_id
  `, passage.id);

  const chunks = await allRows<JsonRecord>(db, `
    SELECT task_id, chunk_index, chunk_text
    FROM qr_surah_study_task_json_chunks
    WHERE passage_id = ?1
    ORDER BY task_id, chunk_index
  `, passage.id).catch(() => []);

  if (chunks.length) {
    const byTask = new Map<string, string[]>();
    for (const chunk of chunks) {
      const taskId = asString(chunk.task_id);
      if (!taskId) continue;
      const existing = byTask.get(taskId) ?? [];
      existing.push(String(chunk.chunk_text ?? ''));
      byTask.set(taskId, existing);
    }
    for (const row of rows) {
      const taskId = asString(row.task_id);
      const parts = taskId ? byTask.get(taskId) : null;
      if (parts?.length) row.task_json = parts.join('');
    }
  }

  return buildTaskTree(rows);
}

function buildTaskTree(rows: JsonRecord[]): UnitTaskVm[] {
  const byId = new Map<string, UnitTaskVm>();
  const roots: UnitTaskVm[] = [];

  for (const row of rows) {
    const taskId = String(row.task_id ?? '');
    if (!taskId) continue;
    byId.set(taskId, {
      task_id: taskId,
      unit_id: asString(row.unit_id) ?? undefined,
      parent_task_id: asString(row.parent_task_id),
      task_type: String(row.task_type ?? ''),
      task_name: asString(row.task_name),
      step_no: asNumber(row.step_no),
      status: asString(row.status),
      task_json: parseJson(row.task_json),
      updated_at: asString(row.updated_at),
      children: [],
    });
  }

  for (const task of byId.values()) {
    if (task.parent_task_id && byId.has(task.parent_task_id)) {
      byId.get(task.parent_task_id)?.children?.push(task);
    } else {
      roots.push(task);
    }
  }

  for (const task of byId.values()) {
    task.children = task.children?.length ? sortTasks(task.children) : [];
  }

  return sortTasks(roots);
}

async function loadQrAyahs(db: D1Database, passage: PassageRow): Promise<JsonRecord[]> {
  return allRows<JsonRecord>(db, `
    SELECT
      a.surah,
      a.ayah,
      a.page_number AS page,
      a.text_uthmani AS text,
      a.text_bare AS text_simple,
      MAX(CASE WHEN ts.source_code = 'haleem' THEN tr.translation_text END) AS translation_haleem,
      MAX(CASE WHEN ts.source_code = 'asad' THEN tr.translation_text END) AS translation_asad,
      MAX(CASE WHEN ts.source_code = 'sahih_intl' THEN tr.translation_text END) AS translation_sahih
    FROM qr_ayah a
    LEFT JOIN qr_translations tr
      ON tr.surah = a.surah AND tr.ayah = a.ayah
    LEFT JOIN qr_translation_sources ts
      ON ts.id = tr.source_id
    WHERE a.surah = ?1
      AND a.ayah BETWEEN ?2 AND ?3
    GROUP BY a.surah, a.ayah, a.page_number, a.text_uthmani, a.text_bare
    ORDER BY a.ayah
  `, passage.surah, passage.ayah_from, passage.ayah_to);
}

async function loadQrWordCounts(db: D1Database, passages: PassageRow[]): Promise<Map<string, { total: number; nouns: number; verbs: number }>> {
  const out = new Map<string, { total: number; nouns: number; verbs: number }>();
  if (!passages.length) return out;
  const surahId = passages[0].surah;
  const words = await allRows<JsonRecord>(db, `
    SELECT ayah, pos
    FROM qr_word_occurrences
    WHERE surah = ?1
  `, surahId);

  for (const passage of passages) {
    const counts = { total: 0, nouns: 0, verbs: 0 };
    for (const word of words) {
      const ayah = Number(word.ayah);
      if (ayah < passage.ayah_from || ayah > passage.ayah_to) continue;
      counts.total += 1;
      const pos = asString(word.pos)?.toLowerCase();
      if (pos === 'noun') counts.nouns += 1;
      if (pos === 'verb') counts.verbs += 1;
    }
    out.set(passage.id, counts);
  }
  return out;
}

async function loadQrVocabulary(db: D1Database, passage: PassageRow): Promise<{ nouns: StudyWordVm[]; verbs: StudyWordVm[] }> {
  const rows = await allRows<JsonRecord>(db, `
    SELECT
      id AS word_id,
      ayah,
      word_index AS position,
      word_text AS word,
      word_text_bare AS simple,
      lemma,
      root,
      pos
    FROM qr_word_occurrences
    WHERE surah = ?1
      AND ayah BETWEEN ?2 AND ?3
      AND lower(COALESCE(pos, '')) IN ('noun', 'verb')
    ORDER BY ayah, word_index
  `, passage.surah, passage.ayah_from, passage.ayah_to);

  const words = rows.map((row): StudyWordVm & { pos?: string } => ({
    word_id: String(row.word_id ?? ''),
    ayah: Number(row.ayah ?? 0),
    position: Number(row.position ?? 0),
    word: String(row.word ?? ''),
    simple: asString(row.simple) ?? undefined,
    lemma: asString(row.lemma) ?? undefined,
    root: asString(row.root) ?? undefined,
    pos: asString(row.pos)?.toLowerCase(),
  }));

  return {
    nouns: words.filter((word) => word.pos === 'noun'),
    verbs: words.filter((word) => word.pos === 'verb'),
  };
}

function vocabularyFromMorphology(tasks: UnitTaskVm[]): { nouns: StudyWordVm[]; verbs: StudyWordVm[] } {
  const morphology = tasks.find((task) => task.task_type === 'morphology');
  if (!morphology) return { nouns: [], verbs: [] };

  const payloads = [morphology.task_json, ...(morphology.children ?? []).map((task) => task.task_json)];
  const items = payloads.flatMap((payload) => {
    const record = asRecord(parseJson(payload));
    const direct = record && Array.isArray(record['items']) ? record['items'] : [];
    const lexicon = record && Array.isArray(record['lexicon_morphology']) ? record['lexicon_morphology'] : [];
    return [...direct, ...lexicon].filter((entry): entry is JsonRecord => !!entry && typeof entry === 'object' && !Array.isArray(entry));
  });

  const toWord = (item: JsonRecord, pos: 'noun' | 'verb'): StudyWordVm => {
    const translation = asRecord(item['translation']);
    const morphFeatures = asRecord(item['morph_features']);
    const morphology = asRecord(item['morphology']);
    const nestedFeatures = asRecord(morphology?.['morph_features']);
    const surfaceAnalysis = asRecord(morphFeatures?.['surface_analysis']) ?? asRecord(nestedFeatures?.['surface_analysis']);
    const meanings = Array.isArray(item['meanings'])
      ? item['meanings'].find((entry) => typeof entry === 'string' && entry.trim())
      : item['meanings'];
    return {
      word_id: asString(item['ar_token_occ_id'])
        ?? asString(item['word_location'])
        ?? asString(item['word_id'])
        ?? `${item['surah'] ?? 0}:${item['ayah'] ?? 0}:${item['token_index'] ?? 0}:${pos}`,
      ayah: Number(item['ayah'] ?? 0),
      position: Number(item['token_index'] ?? item['position'] ?? 0),
      word: asString(item['surface_ar']) ?? asString(item['word']) ?? asString(item['text']) ?? asString(item['lemma_ar']) ?? '',
      simple: asString(item['surface_norm']) ?? asString(item['simple']) ?? undefined,
      translation: asString(translation?.['primary']) ?? asString(item['translation']) ?? asString(item['meaning']) ?? undefined,
      lemma: asString(item['lemma_ar']) ?? asString(item['lemma']) ?? undefined,
      root: asString(item['root_norm']) ?? asString(item['root']) ?? undefined,
      gloss: asString(translation?.['primary']) ?? asString(meanings) ?? asString(item['gloss']) ?? undefined,
      meanings: asString(meanings) ?? undefined,
      verb_form: asString(morphFeatures?.['form_number']) ?? asString(nestedFeatures?.['form_number']) ?? asString(item['verb_form']) ?? undefined,
      pattern: asString(item['morph_pattern']) ?? asString(item['pattern']) ?? undefined,
      transitivity: asString(morphFeatures?.['transitivity']) ?? asString(nestedFeatures?.['transitivity']) ?? asString(item['transitivity']) ?? undefined,
      morphology: {
        verb_form: asString(morphFeatures?.['form_number']) ?? asString(nestedFeatures?.['form_number']) ?? undefined,
        derived_pattern: asString(item['morph_pattern']) ?? asString(item['pattern']) ?? undefined,
        noun_number: asString(surfaceAnalysis?.['number']) ?? asString(morphFeatures?.['number_base']) ?? asString(nestedFeatures?.['number_base']) ?? undefined,
        transitivity: asString(morphFeatures?.['transitivity']) ?? asString(nestedFeatures?.['transitivity']) ?? undefined,
      },
    };
  };

  return {
    nouns: items
      .filter((item) => asString(item['pos'])?.toLowerCase() === 'noun')
      .map((item) => toWord(item, 'noun')),
    verbs: items
      .filter((item) => asString(item['pos'])?.toLowerCase() === 'verb')
      .map((item) => toWord(item, 'verb')),
  };
}

function expressionsFromTasks(tasks: UnitTaskVm[]): JsonRecord[] {
  const expressions = tasks.find((task) => task.task_type === 'expressions');
  if (!expressions) return [];

  const payloads = [expressions.task_json, ...(expressions.children ?? []).map((task) => task.task_json)];
  const rows: JsonRecord[] = [];
  for (const payload of payloads) {
    const record = asRecord(parseJson(payload));
    const items = record && Array.isArray(record['u_expressions']) ? record['u_expressions'] : [];
    for (const item of items) {
      const row = asRecord(item);
      if (!row) continue;
      rows.push({
        expression_id: asString(row['ar_u_expression']) ?? asString(row['expression_id']) ?? '',
        ayah: Number(row['ayah'] ?? 0),
        label: asString(row['label']) ?? undefined,
        text: asString(row['text_ar']) ?? asString(row['text']) ?? undefined,
        sequence_json: typeof row['sequence_json'] === 'string' ? row['sequence_json'] : undefined,
        expression_type: asString(row['expression_type']) ?? undefined,
        expression_text: asString(row['expression_text']) ?? undefined,
        expression_meaning: asString(row['expression_meaning']) ?? asString(row['meaning']) ?? undefined,
        gloss: asString(row['gloss_primary']) ?? asString(row['gloss']) ?? undefined,
        meanings: typeof row['meanings_json'] === 'string' ? row['meanings_json'] : undefined,
        meaning: asString(row['expression_meaning']) ?? asString(row['meaning']) ?? undefined,
      });
    }
  }
  return rows.sort((a, b) => Number(a.ayah ?? 0) - Number(b.ayah ?? 0));
}

function rootTaskCounts(tasks: UnitTaskVm[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const task of tasks) counts[task.task_type] = (counts[task.task_type] ?? 0) + 1;
  return counts;
}

export async function loadStudyGrid(env: QuranStudyEnv, surahId: number) {
  const qr = getQrDb(env);
  if (!qr) return null;

  const passages = await loadQrPassages(qr, surahId);
  if (!passages.length) return null;

  const wordCounts = await loadQrWordCounts(qr, passages);
  const units = [];
  for (const passage of passages) {
    const tasks = await loadQrTasks(qr, passage);
    const counts = rootTaskCounts(tasks);
    const morphology = vocabularyFromMorphology(tasks);
    const wc = wordCounts.get(passage.id) ?? { total: 0, nouns: 0, verbs: 0 };
    units.push({
      ...unitFromPassage(passage),
      reading: { has: counts.reading ? 1 : 0 },
      vocabulary: {
        nouns: wc.nouns || morphology.nouns.length,
        verbs: wc.verbs || morphology.verbs.length,
        total: wc.total,
      },
      sentence_structure: { has: counts.sentence_structure ? 1 : 0 },
      expressions: { has: counts.expressions ? 1 : 0 },
      passage_structure: { has: counts.passage_structure ? 1 : 0 },
    });
  }

  return { surah: surahMetaFromPassage(surahId, passages[0]), units };
}

export async function loadStudyLesson(env: QuranStudyEnv, surahId: number, passageNo: number) {
  const qr = getQrDb(env);
  if (!qr) return null;

  const passage = (await loadQrPassages(qr, surahId)).find((row) => row.passage_no === passageNo);
  if (!passage) return null;

  const tasks = await loadQrTasks(qr, passage);
  const ayahs = await loadQrAyahs(qr, passage);
  const fromMorphology = vocabularyFromMorphology(tasks);
  const fromQrWords = fromMorphology.nouns.length || fromMorphology.verbs.length
    ? { nouns: [], verbs: [] }
    : await loadQrVocabulary(qr, passage);

  return {
    lessonId: passage.legacy_lesson_id ?? null,
    unit: unitFromPassage(passage),
    ayahs,
    vocabulary: {
      nouns: fromMorphology.nouns.length ? fromMorphology.nouns : fromQrWords.nouns,
      verbs: fromMorphology.verbs.length ? fromMorphology.verbs : fromQrWords.verbs,
    },
    expressions: expressionsFromTasks(tasks),
    tasks,
  };
}

export function findRootTask(tasks: UnitTaskVm[], taskType: string): UnitTaskVm | null {
  return tasks.find((task) => task.task_type === taskType) ?? null;
}

export function stripChildren(tasks: UnitTaskVm[]): UnitTaskVm[] {
  return tasks.map((task) => {
    const { children: _children, ...rest } = task;
    return rest;
  });
}
