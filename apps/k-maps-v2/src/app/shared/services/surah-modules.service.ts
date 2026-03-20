import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  task_type: string;
  task_name?: string;
  status?: string;
  task_json?: string;
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
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  ayahs: AyahVm[];
  vocabulary: { nouns: StudyWordVm[]; verbs: StudyWordVm[] };
  expressions: StudyExpressionVm[];
  tasks: UnitTaskVm[];
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
}

export interface StudyExpressionsResponse {
  ok: boolean;
  surahId: number;
  passageNo: number;
  unit: StudyUnitVm;
  expressions: StudyExpressionVm[];
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

@Injectable({ providedIn: 'root' })
export class SurahModulesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  private url(surahId: number, ...segments: string[]): string {
    return `${this.base}/quran/surah/${surahId}/${segments.join('/')}`;
  }

  // Layer 1 — unit grid for a surah
  getSurahLessonGrid(surahId: number): Observable<UnitGridResponse> {
    return this.http.get<UnitGridResponse>(this.url(surahId, 'lessons'));
  }

  // Layer 2 — full detail for one unit
  getLessonDetail(unitId: string): Observable<LessonDetailResponse> {
    return this.http.get<LessonDetailResponse>(`${this.base}/quran/lesson/${encodeURIComponent(unitId)}`);
  }

  getSurahLessons(surahId: number): Observable<LessonsResponse> {
    return this.http.get<LessonsResponse>(this.url(surahId, 'lessons'));
  }

  getSurahNotes(surahId: number): Observable<NotesResponse> {
    return this.http.get<NotesResponse>(this.url(surahId, 'notes'));
  }

  getSurahVocabulary(surahId: number): Observable<VocabularyResponse> {
    return this.http.get<VocabularyResponse>(this.url(surahId, 'vocabulary'));
  }

  getSurahReview(surahId: number): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(this.url(surahId, 'review'));
  }

  getSurahSrs(surahId: number, filter: 'due' | 'upcoming' | 'all' | 'suspended' = 'due'): Observable<SrsResponse> {
    const params = new HttpParams().set('filter', filter);
    return this.http.get<SrsResponse>(this.url(surahId, 'srs'), { params });
  }

  // ── Worldview ─────────────────────────────────────────────────────

  getWorldviewHub(surahId: number): Observable<WorldviewHubResponse> {
    return this.http.get<WorldviewHubResponse>(this.url(surahId, 'worldview'));
  }

  getWorldviewNodes(surahId: number): Observable<WorldviewNodesResponse> {
    return this.http.get<WorldviewNodesResponse>(this.url(surahId, 'worldview', 'nodes'));
  }

  getWorldviewSources(surahId: number): Observable<WorldviewSourcesResponse> {
    return this.http.get<WorldviewSourcesResponse>(this.url(surahId, 'worldview', 'sources'));
  }

  getWorldviewPodcasts(surahId: number): Observable<WorldviewPodcastsResponse> {
    return this.http.get<WorldviewPodcastsResponse>(this.url(surahId, 'worldview', 'podcasts'));
  }

  getWorldviewDocuments(surahId: number): Observable<WorldviewDocumentsResponse> {
    return this.http.get<WorldviewDocumentsResponse>(this.url(surahId, 'worldview', 'documents'));
  }

  getWorldviewNotes(surahId: number): Observable<WorldviewNotesResponse> {
    return this.http.get<WorldviewNotesResponse>(this.url(surahId, 'worldview', 'notes'));
  }

  getWorldviewLinks(surahId: number): Observable<WorldviewLinksResponse> {
    return this.http.get<WorldviewLinksResponse>(this.url(surahId, 'worldview', 'links'));
  }

  // ── Study API ────────────────────────────────────────────────────────────────

  getStudyGrid(surahId: number): Observable<StudyGridResponse> {
    return this.http.get<StudyGridResponse>(this.url(surahId, 'study'));
  }

  getStudyLesson(surahId: number, passageNo: number): Observable<StudyLessonResponse> {
    return this.http.get<StudyLessonResponse>(this.url(surahId, 'study', String(passageNo)));
  }

  getStudyReading(surahId: number, passageNo: number): Observable<StudyReadingResponse> {
    return this.http.get<StudyReadingResponse>(this.url(surahId, 'study', String(passageNo), 'reading'));
  }

  getStudyVocabulary(surahId: number, passageNo: number): Observable<StudyVocabularyResponse> {
    return this.http.get<StudyVocabularyResponse>(this.url(surahId, 'study', String(passageNo), 'vocabulary'));
  }

  getStudyExpressions(surahId: number, passageNo: number): Observable<StudyExpressionsResponse> {
    return this.http.get<StudyExpressionsResponse>(this.url(surahId, 'study', String(passageNo), 'expressions'));
  }

  getStudySentenceStructure(surahId: number, passageNo: number): Observable<StudyTaskResponse> {
    return this.http.get<StudyTaskResponse>(this.url(surahId, 'study', String(passageNo), 'sentence-structure'));
  }

  getStudyPassageStructure(surahId: number, passageNo: number): Observable<StudyTaskResponse> {
    return this.http.get<StudyTaskResponse>(this.url(surahId, 'study', String(passageNo), 'passage-structure'));
  }

  getStudyTasks(surahId: number, passageNo: number): Observable<StudyTasksResponse> {
    return this.http.get<StudyTasksResponse>(this.url(surahId, 'study', String(passageNo), 'tasks'));
  }
}
