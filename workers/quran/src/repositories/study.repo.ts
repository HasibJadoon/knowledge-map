// ─── StudyRepo — Quran study grid and lesson data ──────────────────────────────
// Ports the previous Quran study implementation into the repository pattern.
// All SQL targets the deployed qr_* D1 schema.
//
// Tables: qr_surah_study_passages, qr_surah_study_steps, qr_surah_study_tasks,
//         qr_surah_study_task_json_chunks, qr_word_occurrences, qr_ayah,
//         qr_surahs, qr_translations, qr_translation_sources

import { query } from '../../../shared/src/db';
import { parseQacMorphology, posGroup, QacMorphology } from '../lib/qac-morph';

// ─── types ─────────────────────────────────────────────────────────────────────

export interface TermRef { key: string; label_ar: string | null; color: string | null; }

export interface WordSegment {
  index: number;
  text: string;
  type: string | null;
  term: TermRef | null;
}

export interface WordIrab {
  position: string | null;
  position_ar: string | null;
  sign: string | null;
  sign_ar: string | null;
  syntactic_function: string | null;
  is_disputed: boolean;
  dispute_note: string | null;
  sources: string[];
  term: TermRef | null;
}

export interface WordCard {
  word_id: string;
  sml_id: string | null;
  surah: number;
  ayah: number;
  word_index: number;
  surface_ar: string;
  surface_bare: string | null;
  lemma_ar: string | null;
  root: string | null;
  pos: string | null;
  group: 'noun' | 'verb' | 'other';
  qac: QacMorphology;
  irab: WordIrab | null;
  segments: WordSegment[];
  lemma_stats: { total_occurrences: number; lx_lemma_ref: string | null } | null;
}

export interface PassageMorphology {
  surah: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  label: string | null;
  words: WordCard[];
  roots: string[];
}

interface WordOccRow {
  id: string; surah: number; ayah: number; word_index: number;
  word_text: string; word_text_bare: string | null;
  root: string | null; lemma: string | null; pos: string | null;
  morphology_tag_json: string | null;
}
interface SmlRow {
  id: string; scope_id: string; lx_morph_ref: string | null;
  irab_position: string | null; irab_sign: string | null; syntactic_function: string | null;
  is_disputed: number | null; dispute_note: string | null; note_md: string | null;
}
interface SegRow {
  word_occurrence_id: string; segment_index: number; segment_text: string; segment_type: string | null;
}

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

// iʿrāb position / sign Arabic labels (values seen in qr_ss_scope_morph_link)
const IRAB_POS_AR: Record<string, string> = {
  rafa: 'رفع', raf: 'رفع', nasb: 'نصب', jarr: 'جرّ', jarr_qasam: 'جرّ', jazm: 'جزم',
  mabni: 'مبنيّ', mabni_mahall: 'مبنيّ في محلّ',
};
const IRAB_SIGN_AR: Record<string, string> = {
  damma: 'ضمّة', fatha: 'فتحة', kasra: 'كسرة', sukun: 'سكون', ya: 'الياء', waw: 'الواو',
  alif: 'الألف', thubut_nun: 'ثبوت النون', hadhf_nun: 'حذف النون', muqaddara: 'مقدّرة',
};

/** lx_morph_ref "AL:nahw:naat" / "AL:sarf:x" → term_key "naat". */
function stripTermPrefix(ref: string | null): string | null {
  if (!ref) return null;
  return ref.replace(/^AL:(nahw|sarf):/i, '');
}

function termOf(map: Map<string, TermRef>, key: string | null): TermRef | null {
  if (!key) return null;
  return map.get(key) ?? null;
}

/** parse note_md {"sources":[...]} into a string[] */
function sourcesFromNote(note: string | null): string[] {
  const rec = asRec(parseJson(note));
  const arr = rec && Array.isArray(rec['sources']) ? rec['sources'] : [];
  return arr.filter((s): s is string => typeof s === 'string');
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

  // ── Morphology / vocabulary (from the relational tables) ────────────────────

  /**
   * Full per-word morphology for a passage, built from qr_word_occurrences (QAC)
   * + qr_ss_scope_morph_link (iʿrāb) × qr_ss_term (labels) + qr_ss_occ_segment.
   * Every word emits a card, so this works for any surah (SML/segments fill in
   * where present). Returns the distinct root list for AL enrichment.
   */
  async passageMorphology(surahId: number, passageNo: number): Promise<PassageMorphology | null> {
    const passages = await this._passages(surahId);
    const passage = passages.find(p => p.passage_no === passageNo);
    if (!passage) return null;

    const cards = await this._buildWordCards(surahId, passage.ayah_from, passage.ayah_to);
    const roots = [...new Set(cards.map(c => c.root).filter((r): r is string => !!r))];

    return {
      surah: surahId,
      passage_no: passage.passage_no,
      ayah_from: passage.ayah_from,
      ayah_to: passage.ayah_to,
      label: passage.title ?? null,
      words: cards,
      roots,
    };
  }

  /** Single word card by word-occurrence id (word-hash) — for the detail modal. */
  async wordById(wordId: string): Promise<WordCard | null> {
    const rows = await query<WordOccRow>(
      this.db,
      `SELECT id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag_json
       FROM qr_word_occurrences WHERE id = ?`,
      [wordId],
    ).catch(() => []);
    if (!rows.length) return null;
    const cards = await this._buildWordCards(rows[0].surah, rows[0].ayah, rows[0].ayah, wordId);
    return cards.find(c => c.word_id === wordId) ?? cards[0] ?? null;
  }

  /** Ayah text + default translation for the modal's context line. */
  async ayahContext(surah: number, ayah: number): Promise<{ ayah: number; text: string | null; translation: string | null }> {
    const [a] = await query<{ text: string | null }>(
      this.db,
      `SELECT COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text
       FROM qr_ayah WHERE surah = ? AND ayah = ? LIMIT 1`,
      [surah, ayah],
    ).catch(() => [] as { text: string | null }[]);
    const [t] = await query<{ text: string | null }>(
      this.db,
      `SELECT tr.translation_text AS text
       FROM qr_translations tr JOIN qr_translation_sources ts ON ts.id = tr.source_id
       WHERE ts.is_default = 1 AND tr.surah = ? AND tr.ayah = ? LIMIT 1`,
      [surah, ayah],
    ).catch(() => [] as { text: string | null }[]);
    return { ayah, text: a?.text ?? null, translation: t?.text ?? null };
  }

  /** Tafsīr snippets covering a single ayah (for the word modal). */
  async tafsirForAyah(surah: number, ayah: number): Promise<{ scholar_id: string; snippet: string }[]> {
    const rows = await query<{ scholar_id: string; content_ar: string | null }>(
      this.db,
      `SELECT scholar_id, substr(content_ar, 1, 600) AS content_ar
       FROM qr_tafsir_entries
       WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?
       ORDER BY scholar_id`,
      [surah, ayah, ayah],
    ).catch(() => []);
    return rows
      .filter(r => !!r.content_ar)
      .map(r => ({ scholar_id: r.scholar_id, snippet: (r.content_ar ?? '').trim() }));
  }

  private async _buildWordCards(
    surahId: number,
    ayahFrom: number,
    ayahTo: number,
    onlyWordId?: string,
  ): Promise<WordCard[]> {
    const [words, terms, sml, segs, lemmas] = await Promise.all([
      query<WordOccRow>(
        this.db,
        `SELECT id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag_json
         FROM qr_word_occurrences
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY ayah, word_index`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => [] as WordOccRow[]),
      query<{ term_key: string; label_ar: string | null; color: string | null }>(
        this.db,
        `SELECT term_key, label_ar, color FROM qr_ss_term`,
      ).catch(() => []),
      query<SmlRow>(
        this.db,
        `SELECT id, scope_id, lx_morph_ref, irab_position, irab_sign, syntactic_function,
                is_disputed, dispute_note, note_md
         FROM qr_ss_scope_morph_link WHERE id LIKE ?`,
        [`QR:SML:${surahId}:%`],
      ).catch(() => []),
      query<SegRow>(
        this.db,
        `SELECT word_occurrence_id, segment_index, segment_text, segment_type
         FROM qr_ss_occ_segment
         WHERE surah = ? AND ayah BETWEEN ? AND ?
         ORDER BY word_occurrence_id, segment_index`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => []),
      query<{ word_occurrence_id: string; total_occurrences: number; lx_lemma_ref: string | null }>(
        this.db,
        `SELECT lo.word_occurrence_id, l.total_occurrences, l.lx_lemma_ref
         FROM qr_lemma_occurrences lo JOIN qr_lemmas l ON l.id = lo.lemma_id
         WHERE lo.surah = ? AND lo.ayah BETWEEN ? AND ?`,
        [surahId, ayahFrom, ayahTo],
      ).catch(() => []),
    ]);

    const termMap = new Map<string, TermRef>(
      terms.map(t => [t.term_key, { key: t.term_key, label_ar: t.label_ar, color: t.color }]),
    );
    const smlByScope = new Map<string, SmlRow>(sml.map(r => [r.scope_id, r]));
    const segsByWord = new Map<string, SegRow[]>();
    for (const s of segs) {
      if (!segsByWord.has(s.word_occurrence_id)) segsByWord.set(s.word_occurrence_id, []);
      segsByWord.get(s.word_occurrence_id)!.push(s);
    }
    const lemmaByWord = new Map(lemmas.map(l => [l.word_occurrence_id, l]));

    const source = onlyWordId ? words.filter(w => w.id === onlyWordId) : words;

    return source.map((w): WordCard => {
      const qac = parseQacMorphology(w.morphology_tag_json);
      const smlRow = smlByScope.get(w.id) ?? null;
      const irab: WordIrab | null = smlRow
        ? {
            position: smlRow.irab_position,
            position_ar: smlRow.irab_position ? (IRAB_POS_AR[smlRow.irab_position] ?? null) : null,
            sign: smlRow.irab_sign,
            sign_ar: smlRow.irab_sign ? (IRAB_SIGN_AR[smlRow.irab_sign] ?? null) : null,
            syntactic_function: smlRow.syntactic_function,
            is_disputed: !!smlRow.is_disputed,
            dispute_note: smlRow.dispute_note,
            sources: sourcesFromNote(smlRow.note_md),
            term: termOf(termMap, stripTermPrefix(smlRow.lx_morph_ref) ?? smlRow.syntactic_function),
          }
        : null;
      const segments: WordSegment[] = (segsByWord.get(w.id) ?? []).map(s => ({
        index: Number(s.segment_index),
        text: s.segment_text,
        type: s.segment_type,
        term: termOf(termMap, s.segment_type),
      }));
      const ls = lemmaByWord.get(w.id);
      return {
        word_id: w.id,
        sml_id: smlRow?.id ?? null,
        surah: Number(w.surah),
        ayah: Number(w.ayah),
        word_index: Number(w.word_index),
        surface_ar: w.word_text,
        surface_bare: w.word_text_bare,
        lemma_ar: w.lemma,
        root: w.root,
        pos: w.pos,
        group: posGroup(w.pos),
        qac,
        irab,
        segments,
        lemma_stats: ls ? { total_occurrences: Number(ls.total_occurrences), lx_lemma_ref: ls.lx_lemma_ref } : null,
      };
    });
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
       ORDER BY ayah, word_index`,
      [passage.surah_id, passage.ayah_from, passage.ayah_to],
    );
    // pos is QAC (N/V/PN/ADJ) or lowercase (noun/verb) in curated rows — map both.
    return {
      nouns: rows.filter(w => posGroup(w.pos) === 'noun'),
      verbs: rows.filter(w => posGroup(w.pos) === 'verb'),
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
        const g = posGroup(w.pos);
        if (g === 'noun') counts.nouns++;
        if (g === 'verb') counts.verbs++;
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
