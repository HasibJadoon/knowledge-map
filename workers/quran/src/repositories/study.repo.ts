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

// One reading token of an ayah, both script forms, sourced from
// qr_word_occurrences (not from any task_json payload).
export interface AyahWordToken {
  position: number;
  text: string;              // diacritic (harakāt)
  simple?: string;           // non-diacritic (plain)
  char_type: 'word' | 'end';
  lemma?: string;
  root?: string;
  pos?: string;
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
   * Study grid — the lightweight passage LIST: only what the UI needs to pick a
   * passage (range, label, theme, which study layers exist, vocab counts).
   *
   * Lazy by design: it does NOT load the per-passage task trees or parse any
   * task_json. Step availability comes from one cheap GROUP BY over the tasks
   * table, and vocab counts from one aggregate over the word table. The full
   * passage payload is fetched only when a passage (or a step) is opened.
   */
  async grid(surahId: number) {
    const passages = await this._passages(surahId);
    if (!passages.length) return null;

    const [typeFlags, wordCounts] = await Promise.all([
      this._taskTypeFlags(surahId),
      this._wordCounts(surahId, passages),
    ]);

    const units = passages.map(p => {
      const flags = typeFlags.get(p.id) ?? new Set<string>();
      const wc    = wordCounts.get(p.id) ?? { total: 0, nouns: 0, verbs: 0 };
      return {
        passage_id:  p.id,
        passage_no:  p.passage_no,
        ayah_from:   p.ayah_from,
        ayah_to:     p.ayah_to,
        start_ref:   `${p.surah_id}:${p.ayah_from}`,
        end_ref:     `${p.surah_id}:${p.ayah_to}`,
        label:       p.title ?? `Passage ${p.passage_no}`,
        theme:       p.theme ?? null,
        reading:             { has: flags.has('reading')            ? 1 : 0 },
        vocabulary:          { nouns: wc.nouns, verbs: wc.verbs, total: wc.total },
        sentence_structure:  { has: flags.has('sentence_structure') ? 1 : 0 },
        expressions:         { has: flags.has('expressions')        ? 1 : 0 },
        passage_structure:   { has: flags.has('passage_structure')  ? 1 : 0 },
      };
    });

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

  /**
   * Available step types for a passage, in step order. Cheap — derived from the
   * task-type flags query (no task_json). Used by the passage-detail endpoint so
   * picking a passage does not pull the whole task tree.
   */
  async stepTypes(surahId: number, passageNo: number): Promise<string[] | null> {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const flags = await this._taskTypeFlags(surahId);
    return [...(flags.get(passage.id) ?? new Set<string>())]
      .sort((a, b) => (STEP_ORDER[a] ?? 99000) - (STEP_ORDER[b] ?? 99000));
  }

  // ── Lazy per-step loaders ─────────────────────────────────────────────────
  // Each study step loads ONLY its own data, and from the normalized tables —
  // not from task_json. The UI calls these when a step is selected.

  /** Reading step — ayahs in both script forms + word tokens + muṣḥaf meta. */
  async readingStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const ayahs = await this._ayahs(passage);
    return {
      step:       'reading',
      source:     'tables',
      passage_id: passage.id,
      surah:      passage.surah_id,
      ayah_from:  passage.ayah_from,
      ayah_to:    passage.ayah_to,
      ayahs,
    };
  }

  /** Comprehension step — questions straight from qr_study_questions. */
  async comprehensionStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const questions = await query<JsonRecord>(
      this.db,
      `SELECT id, scope_ref, ayah_from, ayah_to, question_type,
              question_en, question_ar, options_json, answer_md,
              difficulty, sort_order
       FROM qr_study_questions
       WHERE surah = ? AND passage_id = ? AND status != 'deleted'
       ORDER BY sort_order, ayah_from, id`,
      [passage.surah_id, passage.id],
    ).catch(() => []);

    return {
      step:       'comprehension',
      source:     'tables',
      passage_id: passage.id,
      questions,
    };
  }

  /**
   * Morphology step — each word rooted in the source books:
   *   • ṣarf  : root, lemma, pos and the features parsed from the QAC tag, plus
   *             the lexicon root key so the per-word Five-Lens lookup resolves.
   *   • iʿrāb : the parse from every iʿrāb book, attributed per author/book
   *             (qr_irab_book_entries linked to the word).
   *   • qirāʾāt / disputed readings : word-scoped qr_ss_scope_reading rows with
   *             their scholar reference.
   *   • tafsīr : the mufassir discussion for the verse (qr_tafsir_entries),
   *             attributed per work, as the deeper discussion layer.
   * All from the tables — no task_json. Lexicon bodies stay lazy (Five-Lens
   * lookup per tapped word over the AR_LINGUISTICS binding).
   */
  async morphologyStep(surahId: number, passageNo: number) {
    const passages = await this._passages(surahId);
    const passage  = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;
    const { surah_id: surah, ayah_from: from, ayah_to: to } = passage;

    const [rows, irabRows, readingRows, tafsirRows, synthRows, synthEvRows] = await Promise.all([
      query<{
        id: string; ayah: number; word_index: number;
        word_text: string; word_text_bare: string | null;
        root: string | null; lemma: string | null;
        pos: string | null; morphology_tag: string | null;
        syntactic_function: string | null;
      }>(
        this.db,
        `SELECT w.id, w.ayah, w.word_index, w.word_text, w.word_text_bare,
                w.root, w.lemma, w.pos, w.morphology_tag, m.syntactic_function
         FROM qr_word_occurrences w
         LEFT JOIN qr_ss_scope_morph_link m ON m.scope_id = w.id
         WHERE w.surah = ? AND w.ayah BETWEEN ? AND ?
         ORDER BY w.ayah, w.word_index`,
        [surah, from, to],
      ).catch(() => []),
      // iʿrāb of each word, attributed per book/author.
      query<{ wid: string; source_slug: string; source_title: string | null;
              role: string | null; text: string | null }>(
        this.db,
        `SELECT e.word_occurrence_id AS wid, e.source_slug, e.source_title,
                e.grammar_role_ar AS role, e.irab_text_ar AS text
         FROM qr_irab_book_entries e
         JOIN qr_word_occurrences w ON w.id = e.word_occurrence_id
         WHERE w.surah = ? AND w.ayah BETWEEN ? AND ? AND e.word_link_status = 'linked'
           AND (e.grammar_role_ar IS NOT NULL OR e.irab_text_ar IS NOT NULL)`,
        [surah, from, to],
      ).catch(() => []),
      // word-scoped qirāʾāt / disputed readings, with scholar reference.
      query<{ wid: string; reading_type: string | null; scholar_ref: string | null;
              text_ar: string | null; is_contested: number | null; is_minority: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, r.reading_type, r.scholar_ref,
                r.reading_text_ar AS text_ar, r.is_contested, r.is_minority
         FROM qr_ss_scope_reading r
         JOIN qr_word_occurrences w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type <> 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),
      // tafsīr discussion for the verse range, attributed per mufassir/work.
      query<{ ayah_from: number; ayah_to: number; scholar_id: string | null;
              work: string | null; text: string | null }>(
        this.db,
        `SELECT t.ayah_from, t.ayah_to, t.scholar_id, wk.title_ar AS work,
                substr(t.content_ar, 1, 700) AS text
         FROM qr_tafsir_entries t
         JOIN qr_scholar_works wk ON wk.id = t.work_id
         WHERE t.surah = ? AND t.ayah_from <= ? AND t.ayah_to >= ?
           AND t.content_ar IS NOT NULL AND TRIM(t.content_ar) <> ''
         ORDER BY t.ayah_from`,
        [surah, to, from],
      ).catch(() => []),
      // The synthesized per-word reading (ingested sources woven into one analysis).
      query<{ wid: string; text: string | null; text_ar: string | null; contested: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, r.reading_text AS text, r.reading_text_ar AS text_ar, r.is_contested AS contested
         FROM qr_ss_scope_reading r
         JOIN qr_word_occurrences w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type = 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),
      // Evidence ingested into each synthesis (ontology + provenance + dispute).
      query<{ wid: string; etype: string | null; provenance: string | null;
              locator: string | null; text_ar: string | null; disputed: number | null }>(
        this.db,
        `SELECT r.scope_id AS wid, ev.evidence_type AS etype, ev.provenance,
                ev.locator, ev.content_text_ar AS text_ar, ev.is_disputed AS disputed
         FROM qr_ss_scope_reading r
         JOIN qr_ss_scope_reading_evidence_link l ON l.reading_id = r.id
         JOIN qr_evidence_items ev ON ev.id = l.evidence_id
         JOIN qr_word_occurrences w ON w.id = r.scope_id
         WHERE r.scope_type = 'word' AND r.reading_type = 'synthesis'
           AND w.surah = ? AND w.ayah BETWEEN ? AND ?`,
        [surah, from, to],
      ).catch(() => []),
    ]);

    const irabByWord = new Map<string, { source: string; book: string | null; role: string | null; text: string | null }[]>();
    for (const e of irabRows) {
      const list = irabByWord.get(e.wid) ?? [];
      list.push({ source: e.source_slug, book: e.source_title ?? IRAB_BOOKS[e.source_slug] ?? null, role: e.role, text: e.text });
      irabByWord.set(e.wid, list);
    }
    const readingsByWord = new Map<string, { type: string | null; scholar: string | null; text_ar: string | null; contested: boolean; minority: boolean }[]>();
    for (const r of readingRows) {
      const list = readingsByWord.get(r.wid) ?? [];
      list.push({ type: r.reading_type, scholar: r.scholar_ref, text_ar: r.text_ar, contested: !!r.is_contested, minority: !!r.is_minority });
      readingsByWord.set(r.wid, list);
    }
    // Ingested evidence per synthesized word, with provenance + dispute status.
    const synthEvByWord = new Map<string, { type: string | null; provenance: string | null; locator: string | null; text_ar: string | null; disputed: boolean }[]>();
    for (const e of synthEvRows) {
      const list = synthEvByWord.get(e.wid) ?? [];
      list.push({ type: e.etype, provenance: e.provenance, locator: e.locator, text_ar: e.text_ar, disputed: !!e.disputed });
      synthEvByWord.set(e.wid, list);
    }
    // The woven per-word synthesis (the headline analysis), with its evidence.
    const synthByWord = new Map<string, { text: string | null; text_ar: string | null; contested: boolean; evidence: { type: string | null; provenance: string | null; locator: string | null; text_ar: string | null; disputed: boolean }[] }>();
    for (const s of synthRows) {
      synthByWord.set(s.wid, { text: s.text, text_ar: s.text_ar, contested: !!s.contested, evidence: synthEvByWord.get(s.wid) ?? [] });
    }

    const items = rows.map(r => {
      const feat  = parseQacTag(r.morphology_tag);
      const group = posGroup(r.pos);
      return {
        word_id:   r.id,
        ayah:      r.ayah,
        position:  r.word_index,
        word:      r.word_text,
        simple:    r.word_text_bare ?? undefined,
        root:      r.root ?? undefined,
        lemma:     r.lemma ?? undefined,
        pos:       r.pos ?? undefined,
        group,
        verb_form: feat.verb_form,
        pattern:   feat.verb_form ? `Form ${feat.verb_form}` : undefined,
        morph_features: feat,
        syntactic_function: r.syntactic_function ?? undefined,
        // Headline: the woven synthesis (ingested lexicon + iʿrāb + tafsīr),
        // with its evidence (provenance + dispute). Null until a word is synthesized.
        synthesis: synthByWord.get(r.id) ?? null,
        // Supporting source-rooted detail, attributed:
        irab:      irabByWord.get(r.id) ?? [],      // per iʿrāb book / author
        readings:  readingsByWord.get(r.id) ?? [],  // qirāʾāt / disputes per scholar
        lexicon_root: r.root ?? null,               // Five-Lens lookup key (lazy)
      };
    });

    // Tafsīr discussion grouped per ayah, attributed per mufassir/work.
    const tafsirByAyah = new Map<number, { work: string | null; scholar: string | null; text: string | null }[]>();
    for (const t of tafsirRows) {
      const lo = Math.max(t.ayah_from, from);
      const hi = Math.min(t.ayah_to, to);
      for (let a = lo; a <= hi; a++) {
        const list = tafsirByAyah.get(a) ?? [];
        list.push({ work: t.work, scholar: t.scholar_id, text: t.text });
        tafsirByAyah.set(a, list);
      }
    }
    const tafsir = [...tafsirByAyah.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ayah, sources]) => ({ ayah, sources }));

    return {
      step:       'morphology',
      source:     'tables',
      passage_id: passage.id,
      surah,
      ayah_from:  from,
      ayah_to:    to,
      nouns:      items.filter(i => i.group === 'noun'),
      verbs:      items.filter(i => i.group === 'verb'),
      particles:  items.filter(i => i.group === 'particle'),
      words:      items,
      tafsir,     // per-ayah mufassir discussion (deeper layer)
    };
  }

  /**
   * Lazy step dispatcher. Returns the step's data sourced from tables when the
   * step has been migrated off task_json (reading, comprehension); otherwise
   * falls back to the task tree so unmigrated steps keep working.
   *   null      → passage not found
   *   undefined → no such step in this passage
   */
  async stepData(
    surahId: number,
    passageNo: number,
    stepType: string,
  ): Promise<unknown> {
    switch (stepType) {
      case 'reading':       return this.readingStep(surahId, passageNo);
      case 'morphology':    return this.morphologyStep(surahId, passageNo);
      case 'comprehension': return this.comprehensionStep(surahId, passageNo);
      default: {
        const task = await this.taskByStepType(surahId, passageNo, stepType);
        if (task === null) return null;
        if (task === undefined) return undefined;
        return { step: stepType, source: 'tasks', task };
      }
    }
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
    const [ayahs, translations, words] = await Promise.all([
      query<{
        surah: number; ayah: number; page: number | null;
        juz: number | null; hizb: number | null; ruku: number | null;
        verse_mark: string | null;
        text_uthmani: string | null; text_clean: string | null; text_bare: string | null;
      }>(
        this.db,
        // Reading text is served from the tables in BOTH forms:
        //   diacritic     → text_uthmani_clean / text_uthmani
        //   non-diacritic → text_bare
        // plus the muṣḥaf metadata (page / juz / hizb / ruku / verse mark).
        `SELECT surah, ayah, page_number AS page, juz, hizb, ruku, verse_mark,
                text_uthmani, text_uthmani_clean AS text_clean, text_bare
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
      // Per-word tokens, both forms, from the word table (no JSON).
      query<{
        ayah: number; position: number;
        text: string; simple: string | null;
        lemma: string | null; root: string | null; pos: string | null;
      }>(
        this.db,
        `SELECT ayah, word_index AS position,
                word_text AS text, word_text_bare AS simple,
                lemma, root, pos
         FROM qr_word_occurrences
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah, word_index`,
        [passage.surah_id, passage.ayah_from, passage.ayah_to],
      ),
    ]);

    const transByAyah = new Map(translations.map(t => [t.ayah, t.text]));

    const wordsByAyah = new Map<number, AyahWordToken[]>();
    for (const w of words) {
      const list = wordsByAyah.get(w.ayah) ?? [];
      list.push({
        position:  w.position,
        text:      w.text,                 // diacritic
        simple:    w.simple ?? undefined,  // non-diacritic
        char_type: 'word',
        lemma:     w.lemma ?? undefined,
        root:      w.root ?? undefined,
        pos:       w.pos ?? undefined,
      });
      wordsByAyah.set(w.ayah, list);
    }

    return ayahs.map(a => {
      const diacritic = a.text_clean ?? a.text_uthmani ?? a.text_bare ?? '';
      return {
        surah:       a.surah,
        ayah:        a.ayah,
        surah_ayah:  `${a.surah}:${a.ayah}`,
        page:        a.page,
        juz:         a.juz,
        hizb:        a.hizb,
        ruku:        a.ruku,
        verse_mark:  a.verse_mark,
        text:        diacritic,                  // diacritic (mushaf) option
        text_simple: a.text_bare ?? undefined,   // non-diacritic option
        text_arabic: diacritic,                  // back-compat alias
        words:       wordsByAyah.get(a.ayah) ?? [],
        translation: transByAyah.get(a.ayah) ?? null,
      };
    });
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

  /**
   * Which task types exist per passage, for the whole surah, in one cheap
   * GROUP BY (no task_json, no per-passage round trips). Used for the grid's
   * "which layers are available" flags.
   */
  private async _taskTypeFlags(surahId: number): Promise<Map<string, Set<string>>> {
    const rows = await query<{ passage_id: string; task_type: string }>(
      this.db,
      `SELECT t.passage_id, t.task_type
       FROM qr_surah_study_tasks t
       JOIN qr_surah_study_passages p ON p.id = t.passage_id
       WHERE p.surah = ?
       GROUP BY t.passage_id, t.task_type`,
      [surahId],
    ).catch(() => []);

    const out = new Map<string, Set<string>>();
    for (const r of rows) {
      let set = out.get(r.passage_id);
      if (!set) { set = new Set<string>(); out.set(r.passage_id, set); }
      set.add(r.task_type);
    }
    return out;
  }

  /**
   * Word counts per passage — vocabulary stats for the grid. Aggregated by ayah
   * in SQL (one row per ayah, not per word), then bucketed into passage ranges.
   */
  private async _wordCounts(
    surahId: number,
    passages: PassageRow[],
  ): Promise<Map<string, { total: number; nouns: number; verbs: number }>> {
    const out = new Map<string, { total: number; nouns: number; verbs: number }>();
    if (!passages.length) return out;

    const rows = await query<{ ayah: number; total: number; nouns: number; verbs: number }>(
      this.db,
      `SELECT ayah,
              COUNT(*) AS total,
              SUM(CASE WHEN LOWER(COALESCE(pos, '')) = 'noun' THEN 1 ELSE 0 END) AS nouns,
              SUM(CASE WHEN LOWER(COALESCE(pos, '')) = 'verb' THEN 1 ELSE 0 END) AS verbs
       FROM qr_word_occurrences
       WHERE surah = ?
       GROUP BY ayah`,
      [surahId],
    ).catch(() => []);

    for (const p of passages) {
      const counts = { total: 0, nouns: 0, verbs: 0 };
      for (const r of rows) {
        if (r.ayah < p.ayah_from || r.ayah > p.ayah_to) continue;
        counts.total += Number(r.total);
        counts.nouns += Number(r.nouns);
        counts.verbs += Number(r.verbs);
      }
      out.set(p.id, counts);
    }
    return out;
  }
}

// ─── Morphology helpers ─────────────────────────────────────────────────────────
// Parse the QAC morphology tag and classify part-of-speech into study groups.

// iʿrāb book slugs → readable book / author labels (for source attribution).
const IRAB_BOOKS: Record<string, string> = {
  qul_irab_muyassar:    'الإعراب الميسر',
  qul_jadwal_irab_quran:'الجدول في إعراب القرآن (صافي)',
  qul_irab_quran_daas:  'إعراب القرآن للدعّاس',
  qul_irab_darwish:     'إعراب القرآن وبيانه (درويش)',
  tibyan_ukbari_irab:   'التبيان في إعراب القرآن (العكبري)',
};

const ROMAN = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']);
const ASPECT: Record<string, string> = { PERF: 'perfect', IMPF: 'imperfect', IMPV: 'imperative' };
const CASE:   Record<string, string> = { NOM: 'nominative', GEN: 'genitive', ACC: 'accusative' };
const GENDER: Record<string, string> = { M: 'masculine', F: 'feminine' };
const NUMBER: Record<string, string> = { S: 'singular', D: 'dual', P: 'plural' };

export interface MorphFeatures {
  aspect?: string;
  verb_form?: string;          // roman numeral, e.g. "VIII"
  grammatical_case?: string;
  gender?: string;
  number_base?: string;
  person?: string;
  raw?: string;
}

/** Parse a QAC pipe tag, e.g. "STEM|POS:V|PERF|(VIII)|LEM:..|ROOT:Ax*|3MP". */
export function parseQacTag(raw: string | null | undefined): MorphFeatures {
  if (!raw) return {};
  const out: MorphFeatures = { raw };
  for (const part of raw.split('|')) {
    const tok = part.trim();
    if (!tok) continue;
    if (ASPECT[tok]) out.aspect = ASPECT[tok];
    else if (CASE[tok]) out.grammatical_case = CASE[tok];
    else if (tok.startsWith('(') && tok.endsWith(')') && ROMAN.has(tok.slice(1, -1))) {
      out.verb_form = tok.slice(1, -1);
    } else {
      // person/gender/number token, e.g. 3MP, MS, MP, F
      const m = /^([123])?([MF])([SDP])?$/.exec(tok);
      if (m) {
        if (m[1]) out.person = m[1];
        out.gender = GENDER[m[2]];
        if (m[3]) out.number_base = NUMBER[m[3]];
      }
    }
  }
  return out;
}

/** Group a QAC part-of-speech code into a study bucket. */
export function posGroup(pos: string | null | undefined): 'noun' | 'verb' | 'particle' {
  const p = (pos ?? '').toUpperCase();
  if (p === 'V') return 'verb';
  if (p === 'N' || p === 'PN' || p === 'ADJ') return 'noun';
  return 'particle';
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
