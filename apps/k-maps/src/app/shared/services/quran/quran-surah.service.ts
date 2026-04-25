import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackendApiService } from '../backend-api.service';

// ── View models ───────────────────────────────────────────

export interface LessonListItemVm {
  id: string;
  title: string;
  title_ar?: string;
  lesson_type?: string;
  subtype?: string;
  status?: string;
  difficulty?: number;
  ayah_from?: number;
  ayah_to?: number;
  start_ref?: string;
  end_ref?: string;
  unit_type?: string;
}

export interface NoteListItemVm {
  id: string;
  title?: string;
  body_md?: string;
  status?: string;
  note_source: 'capture' | 'legacy';
  target_type?: string;
  ref?: string;
  created_at?: string;
}

export interface WorldviewHubVm {
  surahId: number;
  counts: { nodes: number; sources: number; notes: number; documents: number };
}

export interface WorldviewNodeVm {
  id: string;
  title: string;
  node_type: string;
  text_plain?: string;
  summary?: string;
  slug?: string;
  status?: string;
  edge_count: number;
  evidence_count: number;
  quran_link_count: number;
}

export interface WorldviewSourceVm {
  id: string;
  title: string;
  source_type?: string;
  creator?: string;
  publication_year?: number;
  description?: string;
  status?: string;
  source_url?: string;
  unit_count: number;
  node_count: number;
}

export interface WorldviewNoteVm {
  id: string;
  title?: string;
  note_kind?: string;
  excerpt_text?: string;
  locator?: string;
  body_md?: string;
  status?: string;
  source_title?: string;
  source_type?: string;
  created_at?: string;
}

export interface WorldviewDocumentVm {
  id: string;
  title: string;
  doc_type?: string;
  summary?: string;
  status?: string;
  block_count: number;
  node_count: number;
}

export interface WorldviewPodcastVm {
  id: string;
  title: string;
  content_type: string;
  status?: string;
  related_type?: string;
  related_id?: string;
  content_json?: string;
}

export interface WorldviewLinkVm {
  id: string;
  relation_type: string;
  note?: string;
  from_id: string;
  from_title: string;
  from_type: string;
  to_id: string;
  to_title: string;
  to_type: string;
}

export interface VocabularyLemmaVm {
  lemma_id: string;
  lemma_text?: string;
  lemma_text_clean?: string;
  surface_ar?: string;
  lemma_ar?: string;
  pos?: string;
  root_norm?: string;
  meanings_json?: string;
  ayah?: number;
}

export interface SrsCardVm {
  id: string;
  item_type: string;
  item_key: string;
  card_json?: string;
  status: string;
  due_at?: string;
  last_review_at?: string;
  interval_days?: number;
  ease?: number;
  reps?: number;
  lapses?: number;
  last_rating?: string;
}

export interface ReviewItemVm {
  id?: string;
  item_type: string;
  item_key?: string;
  status?: string;
  due_at?: string;
  title?: string;
  lesson_type?: string;
  score?: number;
  completed_at?: string;
}

// ── Response wrappers ─────────────────────────────────────

// ── Lesson grid (Layer 1) ────────────────────────────────────────────────────

export interface UnitTaskPresence {
  has: boolean;
  count: number;
}

export interface UnitVocabCounts {
  nouns: number;
  verbs: number;
  total_words: number;
}

export interface UnitGridItemVm {
  unit_id: string;
  container_id: string;
  order_index: number;
  ayah_from: number;
  ayah_to: number;
  start_ref: string;
  end_ref: string;
  text_cache?: string;
  unit_label?: string;
  unit_theme?: string;
  reading: UnitTaskPresence;
  vocabulary: UnitVocabCounts;
  sentence_structure: UnitTaskPresence;
  expressions: UnitTaskPresence;
  passage_structure: UnitTaskPresence;
}

export interface UnitGridResponse { ok: boolean; surahId: number; containerId: string; total: number; units: UnitGridItemVm[]; }

// ── Lesson detail (Layer 2) ──────────────────────────────────────────────────

export interface AyahWordToken {
  id?: number;
  position: number;
  verse_key?: string;
  text?: string;        // with diacritics (harakāt)
  simple?: string;      // plain text, no diacritics
  char_type?: string;   // 'word' | 'end'
  translation?: string;
  lemma?: string;
  root?: string;
  class_name?: string;
  line?: number;
  code?: string;
  audio?: string;
}

export interface AyahVm {
  surah: number;
  ayah: number;
  surah_ayah?: string;
  page?: number;
  juz?: number;
  text: string;
  text_simple?: string;
  words?: AyahWordToken[];  // word-by-word tokens from ar_quran_ayah.words
  translation_haleem?: string;
  translation_asad?: string;
  translation_sahih?: string;
}

export interface UnitTaskVm {
  task_id: string;
  unit_id?: string;
  parent_task_id?: string;
  task_type: string;
  task_name?: string;
  step_no?: number;
  status?: string;
  task_json?: unknown;
  updated_at?: string;
  children?: UnitTaskVm[];
}

export interface WordVm {
  word_id: string;
  ayah: number;
  position: number;
  text: string;
  simple?: string;
  lemma?: string;
  root?: string;
  class_name?: string;
}

export interface UnitDetailVm {
  unit_id: string;
  container_id: string;
  unit_type?: string;
  order_index: number;
  ayah_from: number;
  ayah_to: number;
  start_ref: string;
  end_ref: string;
  text_cache?: string;
  meta_json?: string;
}

export interface LessonDetailResponse {
  ok: boolean;
  unit: UnitDetailVm;
  ayahs: AyahVm[];
  tasks: UnitTaskVm[];
  vocabulary: { nouns: WordVm[]; verbs: WordVm[] };
}

// ── Study API (new layer 1 + 2) ───────────────────────────────────────────────

export interface StudySurahMeta {
  container_id: string;
  container_key?: string;
  title?: string;
  surah: number;
  name_ar?: string;
  name_en?: string;
  meta_json?: string;
}

export interface StudyUnitCardVm {
  unit_id: string;
  order_index: number;
  ayah_from: number;
  ayah_to: number;
  start_ref?: string;
  end_ref?: string;
  text_cache?: string;
  label?: string;
  theme?: string;
  reading: { has: number };
  vocabulary: { nouns: number; verbs: number; total: number };
  sentence_structure: { has: number };
  expressions: { has: number };
  passage_structure: { has: number };
}

export interface StudyGridResponse {
  ok: boolean;
  surahId: number;
  surah: StudySurahMeta;
  units: StudyUnitCardVm[];
}

export interface StudyWordVm {
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
  morphology?: { verb_form?: string; derived_pattern?: string; noun_number?: string; transitivity?: string };
}

export interface StudyExpressionVm {
  expression_id: string;
  ayah: number;
  label?: string;
  text?: string;
  sequence_json?: string;
  expression_type?: string;
  expression_text?: string;
  expression_meaning?: string;
  gloss?: string;
  meanings?: string;
  meaning?: string;
}

export interface StudyUnitVm {
  unit_id: string;
  container_id?: string;
  order_index: number;
  ayah_from: number;
  ayah_to: number;
  start_ref?: string;
  end_ref?: string;
  text_cache?: string;
  label?: string;
  theme?: string;
}

export interface StudyLessonResponse {
  ok: boolean;
  lessonId?: number | null;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  ayahs: AyahVm[];
  vocabulary: { nouns: StudyWordVm[]; verbs: StudyWordVm[] };
  expressions: StudyExpressionVm[];
  tasks: UnitTaskVm[];
}

export interface StudyTaskCommitResponse {
  ok: boolean;
  error?: string;
  result?: {
    task_json?: unknown;
    occ_summary?: {
      sentences_upserted?: number;
      grammar_upserted?: number;
    };
  };
}

export interface StudyReadingResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  ayahs: AyahVm[];
  task: UnitTaskVm | null;
}

export interface StudyVocabularyResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  nouns: StudyWordVm[];
  verbs: StudyWordVm[];
  task: UnitTaskVm | null;
}

export type StudyMorphologyResponse = StudyVocabularyResponse;

export interface StudyExpressionsResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  expressions: StudyExpressionVm[];
  task: UnitTaskVm | null;
}

export interface StudyTaskResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  task: UnitTaskVm | null;
}

export interface StudyTasksResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  tasks: UnitTaskVm[];
}

// ── Node-note types ───────────────────────────────────────────────────────────

export interface NodeNotePayload {
  body_md:      string;
  title?:       string;
  note_type?:   string;
  target_type:  string;   // e.g. 'ss_node'
  target_id:    string;   // node id / term_id
  relation?:    string;   // default 'about'
  ref?:         string;   // unit_id:nodeId
  container_id?: string;
  unit_id?:     string;
  edge_note?:   string;
  share_scope?: string;
  // Extra context stored in extra_json for fast access:
  task_id?:     string;
  step_no?:     number;
  node_depth?:  number;
  node_name?:   string;
}

export interface NodeNoteVm {
  id:           number;
  note_type:    string;
  title:        string | null;
  excerpt:      string;
  commentary:   string | null;
  created_at:   string;
  relation:     string;
  ref:          string | null;
  edge_note:    string | null;
  container_id: string | null;
  unit_id:      string | null;
  extra_json:   string | null;
}

export interface NodeNoteCreateResponse { ok: boolean; note_id?: number; created_at?: string; error?: string; }
export interface NodeNotesListResponse  { ok: boolean; notes: NodeNoteVm[]; }

export interface LessonsResponse { ok: boolean; surahId: number; total: number; lessons: LessonListItemVm[]; }
export interface NotesResponse { ok: boolean; surahId: number; total: number; notes: NoteListItemVm[]; }
export interface WorldviewHubResponse { ok: boolean; surahId: number; counts: WorldviewHubVm['counts']; }
export interface WorldviewNodesResponse { ok: boolean; surahId: number; total: number; nodes: WorldviewNodeVm[]; }
export interface WorldviewSourcesResponse { ok: boolean; surahId: number; total: number; sources: WorldviewSourceVm[]; }
export interface WorldviewNotesResponse { ok: boolean; surahId: number; total: number; notes: WorldviewNoteVm[]; }
export interface WorldviewDocumentsResponse { ok: boolean; surahId: number; total: number; documents: WorldviewDocumentVm[]; }
export interface WorldviewPodcastsResponse { ok: boolean; surahId: number; total: number; items: WorldviewPodcastVm[]; }
export interface WorldviewLinksResponse { ok: boolean; surahId: number; total: number; links: WorldviewLinkVm[]; }
export interface VocabularyResponse { ok: boolean; surahId: number; total: number; lemmas: VocabularyLemmaVm[]; lexicon: VocabularyLemmaVm[]; }
export interface ReviewResponse { ok: boolean; surahId: number; srsItems: SrsCardVm[]; lessonProgress: ReviewItemVm[]; total: number; }
export interface SrsResponse { ok: boolean; surahId: number; filter: string; total: number; items: SrsCardVm[]; }

interface WorkerStudySurah {
  container_id?: string;
  container_key?: string;
  title?: string;
  surah?: number;
  surah_id?: number;
  name_ar?: string | null;
  name_en?: string | null;
  meta_json?: string;
}

interface WorkerStudyUnit {
  unit_id?: string;
  passage_id?: string;
  order_index?: number;
  passage_no?: number;
  ayah_from: number;
  ayah_to: number;
  start_ref?: string;
  end_ref?: string;
  text_cache?: string;
  label?: string | null;
  title?: string | null;
  theme?: string | null;
  reading?: { has?: number | boolean };
  vocabulary?: { nouns?: number; verbs?: number; total?: number; total_words?: number };
  sentence_structure?: { has?: number | boolean };
  expressions?: { has?: number | boolean };
  passage_structure?: { has?: number | boolean };
}

interface WorkerStudyGrid {
  surah: WorkerStudySurah;
  units: WorkerStudyUnit[];
}

interface WorkerStudyLesson {
  unit_id?: string;
  passage_id?: string;
  order_index?: number;
  passage_no?: number;
  ayah_from?: number;
  ayah_to?: number;
  start_ref?: string;
  end_ref?: string;
  text_cache?: string;
  label?: string | null;
  title?: string | null;
  theme?: string | null;
  unit?: WorkerStudyUnit;
  ayahs?: Array<Record<string, unknown>>;
  vocabulary?: { nouns?: Array<Record<string, unknown> | StudyWordVm>; verbs?: Array<Record<string, unknown> | StudyWordVm> };
  expressions?: StudyExpressionVm[];
  tasks?: UnitTaskVm[];
}

interface WorkerVocabularyItem {
  lx_lemma_ref?: string | null;
  root_text?: string | null;
  pos_tag?: string | null;
  frequency?: number;
  sample_forms?: string[];
  first_location?: { surah?: number; ayah?: number };
}

interface WorkerVocabularyData {
  surah_id: number;
  total_unique_lemmas: number;
  groups: Record<string, WorkerVocabularyItem[]>;
}

interface WorkerSrsData {
  filter: string;
  items: SrsCardVm[];
  summary?: { total?: number };
}

@Injectable({ providedIn: 'root' })
export class QuranSurahService {
  private readonly api = inject(BackendApiService);

  private legacySurahPath(surahId: number, ...segments: string[]): Array<string | number> {
    return ['quran', 'surah', surahId, ...segments];
  }

  // Layer 1 — unit grid for a surah
  getSurahLessonGrid(surahId: number): Observable<UnitGridResponse> {
    return this.api.getRaw<UnitGridResponse>(this.legacySurahPath(surahId, 'lessons'));
  }

  // Layer 2 — full detail for one unit
  getLessonDetail(unitId: string): Observable<LessonDetailResponse> {
    return this.api.getRaw<LessonDetailResponse>(['quran', 'lesson', unitId]);
  }

  getSurahLessons(surahId: number): Observable<LessonsResponse> {
    return this.api.getRaw<LessonsResponse>(this.legacySurahPath(surahId, 'lessons'));
  }

  getSurahNotes(surahId: number): Observable<NotesResponse> {
    return this.api.getRaw<NotesResponse>(this.legacySurahPath(surahId, 'notes'));
  }

  getSurahVocabulary(surahId: number): Observable<VocabularyResponse> {
    return this.api.getData<WorkerVocabularyData>('qr', ['surahs', surahId, 'vocabulary']).pipe(
      map((data) => this.normalizeVocabulary(surahId, data)),
    );
  }

  getSurahReview(surahId: number): Observable<ReviewResponse> {
    return this.api.getRaw<ReviewResponse>(this.legacySurahPath(surahId, 'review'));
  }

  getSurahSrs(surahId: number, filter: 'due' | 'upcoming' | 'all' | 'suspended' = 'due'): Observable<SrsResponse> {
    const params = new HttpParams()
      .set('filter', filter)
      .set('surah', String(surahId));
    return this.api.getData<WorkerSrsData>('qr', ['srs'], { params }).pipe(
      map((data) => ({
        ok: true,
        surahId,
        filter: data.filter,
        total: data.summary?.total ?? data.items.length,
        items: data.items,
      })),
    );
  }

  // ── Worldview ─────────────────────────────────────────────────────

  getWorldviewHub(surahId: number): Observable<WorldviewHubResponse> {
    return this.api.getData<WorldviewHubResponse>('qr', ['surahs', surahId, 'worldview']);
  }

  getWorldviewNodes(surahId: number): Observable<WorldviewNodesResponse> {
    return this.api.getData<WorldviewNodesResponse>('qr', ['surahs', surahId, 'worldview', 'nodes']);
  }

  getWorldviewSources(surahId: number): Observable<WorldviewSourcesResponse> {
    return this.api.getData<WorldviewSourcesResponse>('qr', ['surahs', surahId, 'worldview', 'sources']);
  }

  getWorldviewPodcasts(surahId: number): Observable<WorldviewPodcastsResponse> {
    return this.api.getData<WorldviewPodcastsResponse>('qr', ['surahs', surahId, 'worldview', 'podcasts']);
  }

  getWorldviewDocuments(surahId: number): Observable<WorldviewDocumentsResponse> {
    return this.api.getData<WorldviewDocumentsResponse>('qr', ['surahs', surahId, 'worldview', 'documents']);
  }

  getWorldviewNotes(surahId: number): Observable<WorldviewNotesResponse> {
    return this.api.getData<WorldviewNotesResponse>('qr', ['surahs', surahId, 'worldview', 'notes']);
  }

  getWorldviewLinks(surahId: number): Observable<WorldviewLinksResponse> {
    return this.api.getData<WorldviewLinksResponse>('qr', ['surahs', surahId, 'worldview', 'links']);
  }

  // ── Study API ────────────────────────────────────────────────────────────────

  getStudyGrid(surahId: number): Observable<StudyGridResponse> {
    return this.api.getData<WorkerStudyGrid>('qr', ['study', 'surahs', surahId]).pipe(
      map((data) => this.normalizeStudyGrid(surahId, data)),
    );
  }

  getStudyLesson(surahId: number, passageNo: number): Observable<StudyLessonResponse> {
    return this.api
      .getData<WorkerStudyLesson>('qr', ['study', 'surahs', surahId, 'passages', passageNo, 'lesson'])
      .pipe(map((data) => this.normalizeStudyLesson(surahId, passageNo, data)));
  }

  getStudyReading(surahId: number, passageNo: number): Observable<StudyReadingResponse> {
    return this.getStudyLesson(surahId, passageNo).pipe(
      map((lesson) => ({
        ok: true,
        surahId,
        passageNo,
        unit: lesson.unit,
        ayahs: lesson.ayahs,
        task: this.findTask(lesson.tasks, 'reading'),
      })),
    );
  }

  getStudyMorphology(surahId: number, passageNo: number): Observable<StudyMorphologyResponse> {
    return this.getStudyLesson(surahId, passageNo).pipe(
      map((lesson) => ({
        ok: true,
        surahId,
        passageNo,
        unit: lesson.unit,
        nouns: lesson.vocabulary.nouns,
        verbs: lesson.vocabulary.verbs,
        task: this.findTask(lesson.tasks, 'morphology'),
      })),
    );
  }

  getStudyVocabulary(surahId: number, passageNo: number): Observable<StudyVocabularyResponse> {
    return this.getStudyMorphology(surahId, passageNo);
  }

  getStudyExpressions(surahId: number, passageNo: number): Observable<StudyExpressionsResponse> {
    return this.getStudyLesson(surahId, passageNo).pipe(
      map((lesson) => ({
        ok: true,
        surahId,
        passageNo,
        unit: lesson.unit,
        expressions: lesson.expressions,
        task: this.findTask(lesson.tasks, 'expressions'),
      })),
    );
  }

  getStudySentenceStructure(surahId: number, passageNo: number): Observable<StudyTaskResponse> {
    return this.getStudyLesson(surahId, passageNo).pipe(
      map((lesson) => ({
        ok: true,
        surahId,
        passageNo,
        unit: lesson.unit,
        task: this.findTask(lesson.tasks, 'sentence_structure'),
      })),
    );
  }

  getStudyPassageStructure(surahId: number, passageNo: number): Observable<StudyTaskResponse> {
    return this.getStudyLesson(surahId, passageNo).pipe(
      map((lesson) => ({
        ok: true,
        surahId,
        passageNo,
        unit: lesson.unit,
        task: this.findTask(lesson.tasks, 'passage_structure'),
      })),
    );
  }

  getStudyTasks(surahId: number, passageNo: number): Observable<StudyTasksResponse> {
    return this.api
      .getData<UnitTaskVm[]>('qr', ['study', 'surahs', surahId, 'passages', passageNo, 'tasks'])
      .pipe(map((tasks) => ({ ok: true, surahId, passageNo, tasks })));
  }

  private normalizeStudyGrid(surahId: number, data: WorkerStudyGrid): StudyGridResponse {
    return {
      ok: true,
      surahId,
      surah: {
        container_id: data.surah.container_id ?? `QR:SURAH:${surahId}`,
        container_key: data.surah.container_key,
        title: data.surah.title ?? data.surah.name_en ?? `Surah ${surahId}`,
        surah: data.surah.surah ?? data.surah.surah_id ?? surahId,
        name_ar: data.surah.name_ar ?? undefined,
        name_en: data.surah.name_en ?? undefined,
        meta_json: data.surah.meta_json,
      },
      units: (data.units ?? []).map((unit) => this.normalizeStudyUnit(surahId, unit)),
    };
  }

  private normalizeStudyLesson(
    surahId: number,
    passageNo: number,
    data: WorkerStudyLesson,
  ): StudyLessonResponse {
    const unitSource = data.unit ?? data;
    const unit: WorkerStudyUnit = {
      unit_id: unitSource.unit_id,
      passage_id: unitSource.passage_id,
      order_index: unitSource.order_index,
      passage_no: unitSource.passage_no ?? data.passage_no ?? passageNo,
      ayah_from: unitSource.ayah_from ?? data.ayah_from ?? 0,
      ayah_to: unitSource.ayah_to ?? data.ayah_to ?? unitSource.ayah_from ?? data.ayah_from ?? 0,
      start_ref: unitSource.start_ref ?? data.start_ref,
      end_ref: unitSource.end_ref ?? data.end_ref,
      text_cache: unitSource.text_cache ?? data.text_cache,
      label: unitSource.label ?? data.label,
      title: unitSource.title ?? data.title,
      theme: unitSource.theme ?? data.theme,
    };
    return {
      ok: true,
      lessonId: null,
      surahId,
      passageNo,
      unit: this.normalizeStudyUnit(surahId, unit),
      ayahs: (data.ayahs ?? []).map((ayah) => this.normalizeStudyAyah(surahId, ayah)),
      vocabulary: {
        nouns: (data.vocabulary?.nouns ?? []).map((word) => this.normalizeStudyWord(word, 'noun')),
        verbs: (data.vocabulary?.verbs ?? []).map((word) => this.normalizeStudyWord(word, 'verb')),
      },
      expressions: data.expressions ?? [],
      tasks: data.tasks ?? [],
    };
  }

  private normalizeStudyUnit(surahId: number, unit: WorkerStudyUnit): StudyUnitCardVm & StudyUnitVm {
    const orderIndex = unit.order_index ?? unit.passage_no ?? 0;
    return {
      unit_id: unit.unit_id ?? unit.passage_id ?? `QR:SURAH:${surahId}:PASSAGE:${orderIndex}`,
      container_id: `QR:SURAH:${surahId}`,
      order_index: orderIndex,
      ayah_from: Number(unit.ayah_from ?? 0),
      ayah_to: Number(unit.ayah_to ?? unit.ayah_from ?? 0),
      start_ref: unit.start_ref ?? `${surahId}:${unit.ayah_from}`,
      end_ref: unit.end_ref ?? `${surahId}:${unit.ayah_to}`,
      text_cache: unit.text_cache,
      label: unit.label ?? unit.title ?? undefined,
      theme: unit.theme ?? undefined,
      reading: { has: unit.reading?.has ? 1 : 0 },
      vocabulary: {
        nouns: unit.vocabulary?.nouns ?? 0,
        verbs: unit.vocabulary?.verbs ?? 0,
        total: unit.vocabulary?.total ?? unit.vocabulary?.total_words ?? 0,
      },
      sentence_structure: { has: unit.sentence_structure?.has ? 1 : 0 },
      expressions: { has: unit.expressions?.has ? 1 : 0 },
      passage_structure: { has: unit.passage_structure?.has ? 1 : 0 },
    };
  }

  private normalizeStudyAyah(surahId: number, raw: Record<string, unknown>): AyahVm {
    const ayah = Number(raw['ayah'] ?? 0);
    const text =
      this.asString(raw['text']) ??
      this.asString(raw['text_arabic']) ??
      this.asString(raw['text_uthmani_clean']) ??
      this.asString(raw['text_uthmani']) ??
      '';
    return {
      surah: Number(raw['surah'] ?? surahId),
      ayah,
      surah_ayah: this.asString(raw['surah_ayah']) ?? `${surahId}:${ayah}`,
      page: this.asOptionalNumber(raw['page'] ?? raw['page_number']),
      juz: this.asOptionalNumber(raw['juz']),
      text,
      text_simple:
        this.asString(raw['text_simple']) ??
        this.asString(raw['text_bare']) ??
        this.asString(raw['text_clean']) ??
        undefined,
      words: Array.isArray(raw['words']) ? raw['words'] as AyahWordToken[] : undefined,
      translation_haleem:
        this.asString(raw['translation_haleem']) ??
        this.asString(raw['translation']) ??
        undefined,
      translation_asad: this.asString(raw['translation_asad']) ?? undefined,
      translation_sahih: this.asString(raw['translation_sahih']) ?? undefined,
    };
  }

  private normalizeStudyWord(raw: Record<string, unknown> | StudyWordVm, pos: 'noun' | 'verb'): StudyWordVm {
    const record = raw as Record<string, unknown>;
    const existingWord = this.asString(record['word']);
    const translation = this.asRecord(record['translation']);
    const morphology = this.asRecord(record['morphology']);
    const morphFeatures = this.asRecord(record['morph_features']);
    const morphologyFeatures = this.asRecord(morphology?.['morph_features']);
    const surfaceAnalysis = this.asRecord(morphFeatures?.['surface_analysis']) ?? this.asRecord(morphologyFeatures?.['surface_analysis']);

    const word =
      existingWord ??
      this.asString(record['surface_ar']) ??
      this.asString(record['lemma_ar']) ??
      this.asString(record['text']) ??
      '';

    return {
      word_id:
        this.asString(record['word_id']) ??
        this.asString(record['ar_token_occ_id']) ??
        this.asString(record['word_location']) ??
        `${this.asOptionalNumber(record['ayah']) ?? 0}:${this.asOptionalNumber(record['token_index'] ?? record['position']) ?? 0}:${pos}`,
      ayah: this.asOptionalNumber(record['ayah']) ?? 0,
      position: this.asOptionalNumber(record['position'] ?? record['token_index'] ?? record['word_index']) ?? 0,
      word,
      simple: this.asString(record['simple']) ?? this.asString(record['surface_norm']) ?? this.asString(record['word_text_bare']) ?? undefined,
      translation:
        this.asString(record['translation']) ??
        this.asString(translation?.['primary']) ??
        undefined,
      lemma: this.asString(record['lemma']) ?? this.asString(record['lemma_ar']) ?? undefined,
      root: this.asString(record['root']) ?? this.asString(record['root_norm']) ?? undefined,
      gloss:
        this.asString(record['gloss']) ??
        this.asString(translation?.['primary']) ??
        this.firstString(record['meanings']) ??
        undefined,
      meanings: this.asString(record['meanings']) ?? this.firstString(record['meanings']) ?? undefined,
      verb_form:
        this.asString(record['verb_form']) ??
        this.asString(morphFeatures?.['form_number']) ??
        this.asString(morphologyFeatures?.['form_number']) ??
        undefined,
      pattern: this.asString(record['pattern']) ?? this.asString(record['morph_pattern']) ?? undefined,
      transitivity:
        this.asString(record['transitivity']) ??
        this.asString(morphFeatures?.['transitivity']) ??
        this.asString(morphologyFeatures?.['transitivity']) ??
        undefined,
      morphology: {
        verb_form:
          this.asString(record['verb_form']) ??
          this.asString(morphFeatures?.['form_number']) ??
          this.asString(morphologyFeatures?.['form_number']) ??
          undefined,
        derived_pattern: this.asString(record['pattern']) ?? this.asString(record['morph_pattern']) ?? undefined,
        noun_number:
          this.asString(surfaceAnalysis?.['number']) ??
          this.asString(morphFeatures?.['number_base']) ??
          this.asString(morphologyFeatures?.['number_base']) ??
          undefined,
        transitivity:
          this.asString(record['transitivity']) ??
          this.asString(morphFeatures?.['transitivity']) ??
          this.asString(morphologyFeatures?.['transitivity']) ??
          undefined,
      },
    };
  }

  private normalizeVocabulary(surahId: number, data: WorkerVocabularyData): VocabularyResponse {
    const items = Object.values(data.groups ?? {})
      .flat()
      .map((item, index) => ({
        lemma_id: item.lx_lemma_ref ?? `${surahId}:${item.first_location?.ayah ?? index}:${index}`,
        lemma_text: item.sample_forms?.[0],
        lemma_text_clean: item.sample_forms?.[0],
        surface_ar: item.sample_forms?.[0],
        lemma_ar: item.sample_forms?.[0],
        pos: item.pos_tag ?? undefined,
        root_norm: item.root_text ?? undefined,
        meanings_json: undefined,
        ayah: item.first_location?.ayah,
      }));

    return {
      ok: true,
      surahId,
      total: data.total_unique_lemmas ?? items.length,
      lemmas: items,
      lexicon: items,
    };
  }

  private findTask(tasks: UnitTaskVm[], taskType: string): UnitTaskVm | null {
    return tasks.find((task) => task.task_type === taskType) ?? null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private firstString(value: unknown): string | null {
    if (!Array.isArray(value)) return null;
    const first = value.find((entry) => typeof entry === 'string' && entry.trim());
    return typeof first === 'string' ? first.trim() : null;
  }

  private asOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  // ── Node notes ──────────────────────────────────────────────────────────────

  createNodeNote(payload: NodeNotePayload): Observable<NodeNoteCreateResponse> {
    return this.api.postRaw<NodeNoteCreateResponse>(
      ['ar', 'quran', 'node-notes'],
      payload,
    );
  }

  getNodeNotes(
    targetType: string,
    targetId: string,
    taskId?: string,
  ): Observable<NodeNotesListResponse> {
    let params = new HttpParams()
      .set('target_type', targetType)
      .set('target_id',   targetId);
    if (taskId) params = params.set('task_id', taskId);
    return this.api.getRaw<NodeNotesListResponse>(['ar', 'quran', 'node-notes'], { params });
  }

  commitLessonTask(
    lessonId: number,
    payload: {
      task_type: 'sentence_structure' | 'morphology' | 'expressions';
      task_json: unknown;
      container_id?: string | null;
      unit_id?: string | null;
    },
  ): Observable<StudyTaskCommitResponse> {
    return this.api.putRaw<StudyTaskCommitResponse>(
      ['ar', 'quran', 'lessons', lessonId, 'tasks', 'commit'],
      payload,
    );
  }

  // ── Patch task tree (lightweight — updates only task_json.tree) ──────────────

  patchTaskTree(
    taskId:     string,
    tree:       unknown,
    termColors?: Record<string, string>,
  ): Observable<{ ok: boolean; task_id?: string; error?: string }> {
    const body: Record<string, unknown> = { task_id: taskId, tree };
    if (termColors) body['term_colors'] = termColors;
    return this.api.putRaw<{ ok: boolean; task_id?: string; error?: string }>(
      ['ar', 'quran', 'patch-task-tree'],
      body,
    );
  }

  // ── Near synonyms by surah ───────────────────────────────────────────────────

  getNearSynonymsBySurah(surahId: number): Observable<NearSynonymsBySurahVm> {
    return this.api.getData<NearSynonymsBySurahVm>('al', ['near-synonyms', 'by-surah', surahId]);
  }

  updateNearSynonymSet(
    setId: string,
    payload: NearSynonymSetPatchVm,
  ): Observable<NearSynonymSetVm> {
    return this.api.patchData<NearSynonymSetVm>('al', ['near-synonyms', setId], payload);
  }
}

// ── Near-synonym view models ──────────────────────────────────────────────────

export interface NearSynonymMemberVm {
  id: string;
  arabic_display: string | null;
  nuance_note: string | null;
  nuance_note_ur: string | null;
  basic_gloss: string | null;
  basic_gloss_ur: string | null;
  contrast_note: string | null;
  contrast_note_ur: string | null;
  usage_rule_ur: string | null;
  quran_usage_pattern_ur: string | null;
  confidence: string;
  sort_order: number;
}

export interface NearSynonymSetVm {
  id: string;
  set_name: string;
  canonical_ar: string | null;
  canonical_en: string | null;
  canonical_ur: string | null;
  semantic_domain_id: string | null;
  pos_hint: string | null;
  description_md: string;
  members: NearSynonymMemberVm[];
}

export interface NearSynonymsBySurahVm {
  surah: number;
  sets: NearSynonymSetVm[];
}

export interface NearSynonymMemberPatchVm {
  id: string;
  arabic_display?: string | null;
  basic_gloss?: string | null;
  basic_gloss_ur?: string | null;
  nuance_note?: string | null;
  nuance_note_ur?: string | null;
  contrast_note?: string | null;
  contrast_note_ur?: string | null;
  usage_rule_ur?: string | null;
  quran_usage_pattern_ur?: string | null;
}

export interface NearSynonymSetPatchVm {
  set_name?: string | null;
  canonical_en?: string | null;
  canonical_ar?: string | null;
  canonical_ur?: string | null;
  description_md?: string | null;
  pos_hint?: string | null;
  members?: NearSynonymMemberPatchVm[];
}
