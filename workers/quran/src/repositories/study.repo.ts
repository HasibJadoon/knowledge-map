// ─── StudyRepo — Quran study grid and lesson data ──────────────────────────────
// Ports the previous Quran study implementation into the repository pattern.
// All SQL targets the deployed qr_* D1 schema.
//
// Tables: qr_surah_study_passages, qr_surah_study_steps, qr_surah_study_tasks,
//         qr_surah_study_task_json_chunks, qr_word_occurrences, qr_ayah,
//         qr_surahs, qr_translations, qr_translation_sources

import { query } from '../../../shared/src/db';

// ─── types ─────────────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

interface PassageRow {
  id: string;
  surah_id: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  title: string | null;
  theme: string | null;
  status: string;
  name_ar: string | null;   // from qr_surahs join
  name_en: string | null;
}

interface RawTaskRow {
  task_id: string;
  parent_task_id: string | null;
  task_type: string;
  task_key: string | null;
  display_order: number | null;
  status: string | null;
  payload_json: string | null;
  updated_at: string | null;
}

export interface StudyTask {
  task_id: string;
  parent_task_id: string | null;
  task_type: string;
  task_name: string | null;
  display_order: number | null;
  status: string | null;
  task_json: unknown;
  updated_at: string | null;
  children: StudyTask[];
}

// ─── micro-helpers ─────────────────────────────────────────────────────────────

function parseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v ?? null;
  try { return JSON.parse(v); } catch { return v; }
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asRec(v: unknown): JsonRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as JsonRecord) : null;
}

// Task sort order: explicit display_order wins; fall back to known step type order.
const STEP_ORDER: Record<string, number> = {
  reading: 100, morphology: 200, sentence_structure: 300,
  expressions: 400, comprehension: 500, passage_structure: 600,
};

function taskSortKey(t: StudyTask): number {
  return asNum(t.display_order) ?? STEP_ORDER[t.task_type] ?? 99000;
}

function sortTasks(ts: StudyTask[]): StudyTask[] {
  return [...ts].sort((a, b) => taskSortKey(a) - taskSortKey(b) || a.task_id.localeCompare(b.task_id));
}

// ─── StudyRepo ─────────────────────────────────────────────────────────────────

export class StudyRepo {
  constructor(private db: D1Database) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /** All study passages for a surah (ordered). */
  passages(surahId: number): Promise<PassageRow[]> {
    return this._passages(surahId);
  }

  /**
   * Study grid — passage list enriched with vocabulary counts and task-type flags.
   * Used by the study home screen for each surah.
   */
  async grid(surahId: number) {
    const passages = await this._passages(surahId);
    if (!passages.length) return null;

    const wordCounts = await this._wordCounts(surahId, passages);
    const units = await Promise.all(
      passages.map(async p => {
        const tasks     = await this._tasks(p.id);
        const typeCounts = this._typeCounts(tasks);
        const fromMorph = vocabularyFromMorphology(tasks);
        const wc        = wordCounts.get(p.id) ?? { total: 0, nouns: 0, verbs: 0 };
        return {
          passage_id:  p.id,
          passage_no:  p.passage_no,
          ayah_from:   p.ayah_from,
          ayah_to:     p.ayah_to,
          start_ref:   `${p.surah_id}:${p.ayah_from}`,
          end_ref:     `${p.surah_id}:${p.ayah_to}`,
          label:       p.title ?? `Passage ${p.passage_no}`,
          theme:       p.theme ?? null,
          reading:             { has: typeCounts.reading         ? 1 : 0 },
          vocabulary:          {
            nouns: wc.nouns || fromMorph.nouns.length,
            verbs: wc.verbs || fromMorph.verbs.length,
            total: wc.total,
          },
          sentence_structure:  { has: typeCounts.sentence_structure ? 1 : 0 },
          expressions:         { has: typeCounts.expressions        ? 1 : 0 },
          passage_structure:   { has: typeCounts.passage_structure   ? 1 : 0 },
        };
      }),
    );

    return {
      surah: {
        surah_id: surahId,
        name_ar:  passages[0].name_ar ?? null,
        name_en:  passages[0].name_en ?? null,
      },
      units,
    };
  }

  /**
   * Full lesson for a passage: ayahs with translation, task tree,
   * vocabulary, and expressions extracted from task payloads.
   */
  async lesson(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const [tasks, ayahs] = await Promise.all([
      this._tasks(passage.id),
      this._ayahs(passage),
    ]);

    const fromMorph = vocabularyFromMorphology(tasks);
    const vocabulary = (fromMorph.nouns.length || fromMorph.verbs.length)
      ? fromMorph
      : await this._wordsAsVocabulary(passage);

    return {
      passage_id:  passage.id,
      passage_no:  passage.passage_no,
      ayah_from:   passage.ayah_from,
      ayah_to:     passage.ayah_to,
      start_ref:   `${passage.surah_id}:${passage.ayah_from}`,
      end_ref:     `${passage.surah_id}:${passage.ayah_to}`,
      label:       passage.title ?? `Passage ${passage.passage_no}`,
      theme:       passage.theme ?? null,
      ayahs,
      vocabulary,
      expressions: expressionsFromTasks(tasks),
      tasks,
    };
  }

  /**
   * All tasks for a passage as a tree (does not filter by step type).
   * Useful for "all tasks" overview.
   */
  async allTasks(surahId: number, passageNo: number): Promise<StudyTask[] | null> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    return this._tasks(passage.id);
  }

  /**
   * Root task for a specific step type within a passage.
   * Returns null if passage not found; undefined if no task of that type.
   */
  async taskByStepType(
    surahId: number,
    passageNo: number,
    stepType: string,
  ): Promise<StudyTask | null | undefined> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const tasks = await this._tasks(passage.id);
    return tasks.find(t => t.task_type === stepType) ?? undefined;
  }

  // ── Private SQL methods ─────────────────────────────────────────────────────

  private async _passages(surahId: number): Promise<PassageRow[]> {
    const rows = await query<PassageRow>(
      this.db,
      `SELECT p.id, p.surah AS surah_id, p.passage_no, p.ayah_from, p.ayah_to,
              COALESCE(p.title_en, p.label) AS title,
              p.theme, p.status,
              s.name_ar, s.name_en
       FROM qr_surah_study_passages p
       LEFT JOIN qr_surahs s ON s.id = p.surah
       WHERE p.surah = ? AND p.status != 'deleted'
       ORDER BY p.passage_no`,
      [surahId],
    );
    return rows.map(r => ({
      ...r,
      passage_no: Number(r.passage_no),
      ayah_from:  Number(r.ayah_from),
      ayah_to:    Number(r.ayah_to),
      surah_id:   Number(r.surah_id),
    }));
  }

  private async _tasks(passageId: string): Promise<StudyTask[]> {
    const rows = await query<RawTaskRow>(
      this.db,
      `SELECT t.id            AS task_id,
              t.parent_task_id,
              t.task_type,
              t.task_name     AS task_key,
              t.step_no       AS display_order,
              t.status,
              t.task_json     AS payload_json,
              t.updated_at
       FROM qr_surah_study_tasks t
       WHERE t.passage_id = ?
       ORDER BY t.parent_task_id NULLS FIRST, COALESCE(t.step_no, 99999), t.id`,
      [passageId],
    ).catch(() => []);

    // Merge chunked JSON payloads (large task_json split across rows)
    const chunks = await query<{ task_id: string; chunk_index: number; chunk_text: string }>(
      this.db,
      `SELECT task_id, chunk_index, chunk_text
       FROM qr_surah_study_task_json_chunks
       WHERE passage_id = ?
       ORDER BY task_id, chunk_index`,
      [passageId],
    ).catch(() => []);

    if (chunks.length) {
      const byTask = new Map<string, string[]>();
      for (const c of chunks) {
        if (!byTask.has(c.task_id)) byTask.set(c.task_id, []);
        byTask.get(c.task_id)!.push(c.chunk_text);
      }
      for (const row of rows) {
        const parts = byTask.get(row.task_id);
        if (parts?.length) row.payload_json = parts.join('');
      }
    }

    return buildTaskTree(rows);
  }

  private async _ayahs(passage: PassageRow) {
    const [ayahs, translations] = await Promise.all([
      query<{ surah: number; ayah: number; page: number | null; text_arabic: string }>(
        this.db,
        `SELECT surah, ayah, page_number AS page,
                COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_arabic
         FROM qr_ayah
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),
      query<{ ayah: number; text: string }>(
        this.db,
        `SELECT t.ayah, t.translation_text AS text
         FROM qr_translations t
         JOIN qr_translation_sources ts ON ts.id = t.source_id
         WHERE ts.is_default = 1
           AND t.surah = ? AND t.ayah BETWEEN ? AND ?
         ORDER BY t.ayah`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),
    ]);

    const transByAyah = new Map(translations.map(t => [t.ayah, t.text]));
    return ayahs.map(a => ({ ...a, translation: transByAyah.get(a.ayah) ?? null }));
  }

  /** Vocabulary from qr_word_occurrences — fallback when morphology tasks lack payloads. */
  private async _wordsAsVocabulary(passage: PassageRow) {
    const rows = await query<{
      word_id: string; ayah: number; position: number;
      word: string; simple: string | null;
      lemma: string | null; root: string | null; pos: string | null;
    }>(
      this.db,
      `SELECT id            AS word_id,
              ayah,
              word_index    AS position,
              word_text     AS word,
              word_text_bare AS simple,
              lemma,
              root,
              pos
       FROM qr_word_occurrences
       WHERE surah = ? AND ayah BETWEEN ? AND ?
         AND LOWER(COALESCE(pos, '')) IN ('noun', 'verb')
       ORDER BY ayah, word_index`,
      [passage.surah_id, passage.ayah_from, passage.ayah_to],
    );
    return {
      nouns: rows.filter(w => w.pos?.toLowerCase() === 'noun'),
      verbs: rows.filter(w => w.pos?.toLowerCase() === 'verb'),
    };
  }

  /** Word counts per passage — used by grid to show vocabulary stats. */
  private async _wordCounts(
    surahId: number,
    passages: PassageRow[],
  ): Promise<Map<string, { total: number; nouns: number; verbs: number }>> {
    const out = new Map<string, { total: number; nouns: number; verbs: number }>();
    if (!passages.length) return out;

    const words = await query<{ ayah: number; pos: string | null }>(
      this.db,
      `SELECT ayah, pos FROM qr_word_occurrences WHERE surah = ?`,
      [surahId],
    );

    for (const p of passages) {
      const counts = { total: 0, nouns: 0, verbs: 0 };
      for (const w of words) {
        if (w.ayah < p.ayah_from || w.ayah > p.ayah_to) continue;
        counts.total++;
        const pos = w.pos?.toLowerCase();
        if (pos === 'noun') counts.nouns++;
        if (pos === 'verb') counts.verbs++;
      }
      out.set(p.id, counts);
    }
    return out;
  }

  /** Count root tasks by task_type — used to compute grid "has_*" flags. */
  private _typeCounts(tasks: StudyTask[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const t of tasks) counts[t.task_type] = (counts[t.task_type] ?? 0) + 1;
    return counts;
  }
}

// ─── Exported task-tree helpers ─────────────────────────────────────────────────
// These are exported so routes can call them directly if needed.

export function buildTaskTree(rows: RawTaskRow[]): StudyTask[] {
  const byId  = new Map<string, StudyTask>();
  const roots: StudyTask[] = [];

  for (const row of rows) {
    if (!row.task_id) continue;
    byId.set(row.task_id, {
      task_id:       row.task_id,
      parent_task_id: asStr(row.parent_task_id),
      task_type:     String(row.task_type ?? ''),
      task_name:     asStr(row.task_key),
      display_order: asNum(row.display_order),
      status:        asStr(row.status),
      task_json:     parseJson(row.payload_json),
      updated_at:    asStr(row.updated_at),
      children:      [],
    });
  }

  for (const task of byId.values()) {
    if (task.parent_task_id && byId.has(task.parent_task_id)) {
      byId.get(task.parent_task_id)!.children.push(task);
    } else {
      roots.push(task);
    }
  }

  for (const task of byId.values()) {
    if (task.children.length) task.children = sortTasks(task.children);
  }

  return sortTasks(roots);
}

/**
 * Extract vocabulary (nouns + verbs) from morphology task payloads.
 * Preferred over raw qr_word_occurrences when morphology tasks have payloads
 * (richer data: glosses, verb forms, patterns).
 */
export function vocabularyFromMorphology(
  tasks: StudyTask[],
): { nouns: JsonRecord[]; verbs: JsonRecord[] } {
  const morph = tasks.find(t => t.task_type === 'morphology');
  if (!morph) return { nouns: [], verbs: [] };

  const payloads = [morph.task_json, ...(morph.children ?? []).map(c => c.task_json)];
  const items = payloads.flatMap(payload => {
    const rec     = asRec(parseJson(payload));
    const direct  = rec && Array.isArray(rec['items'])             ? rec['items']             : [];
    const lexicon = rec && Array.isArray(rec['lexicon_morphology']) ? rec['lexicon_morphology'] : [];
    return [...direct, ...lexicon].filter(
      (e): e is JsonRecord => !!e && typeof e === 'object' && !Array.isArray(e),
    );
  });

  return {
    nouns: items.filter(i => asStr(i['pos'])?.toLowerCase() === 'noun'),
    verbs: items.filter(i => asStr(i['pos'])?.toLowerCase() === 'verb'),
  };
}

/**
 * Extract expressions list from expression task payloads.
 */
export function expressionsFromTasks(tasks: StudyTask[]): JsonRecord[] {
  const expTask = tasks.find(t => t.task_type === 'expressions');
  if (!expTask) return [];

  const payloads = [expTask.task_json, ...(expTask.children ?? []).map(c => c.task_json)];
  const rows: JsonRecord[] = [];

  for (const payload of payloads) {
    const rec   = asRec(parseJson(payload));
    const items = rec && Array.isArray(rec['u_expressions']) ? rec['u_expressions'] : [];
    for (const item of items) {
      const row = asRec(item);
      if (!row) continue;
      rows.push({
        expression_id:      asStr(row['ar_u_expression']) ?? asStr(row['expression_id']) ?? '',
        ayah:               Number(row['ayah'] ?? 0),
        label:              asStr(row['label']),
        text:               asStr(row['text_ar']) ?? asStr(row['text']),
        expression_type:    asStr(row['expression_type']),
        expression_meaning: asStr(row['expression_meaning']) ?? asStr(row['meaning']),
        gloss:              asStr(row['gloss_primary']) ?? asStr(row['gloss']),
      });
    }
  }

  return rows.sort((a, b) => Number(a.ayah ?? 0) - Number(b.ayah ?? 0));
}
