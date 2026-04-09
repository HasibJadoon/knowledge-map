import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── View Models ───────────────────────────────────────────

export interface StudySurahMeta {
  name_ar: string;
  name_en: string;
}

export interface StudyUnitVocabulary {
  total: number | null;
  nouns: number | null;
  verbs: number | null;
}

export interface StudyUnitTaskPresence {
  has: boolean;
}

export interface StudyUnitCardVm {
  unit_id: string;
  order_index: number;
  ayah_from?: number;
  ayah_to?: number;
  start_ref?: string;
  label?: string;
  theme?: string;
  vocabulary: StudyUnitVocabulary;
  reading: StudyUnitTaskPresence;
  sentence_structure: StudyUnitTaskPresence;
  expressions: StudyUnitTaskPresence;
  passage_structure: StudyUnitTaskPresence;
}

export interface StudyGridResponse {
  surah: StudySurahMeta;
  units: StudyUnitCardVm[];
}

export interface VocabularyLemmaVm {
  lemma_id: string;
  lemma_text?: string;
  lemma_text_clean?: string;
  surface_ar?: string;
  root_norm?: string;
  pos?: string;
  meanings_json?: string;
}

export interface VocabularyResponse {
  lexicon?: VocabularyLemmaVm[];
  lemmas: VocabularyLemmaVm[];
}

export interface SrsCardVm {
  id: string;
  item_type: string;
  item_key: string;
  due_at?: string;
  reps?: number;
  ease?: number;
  interval_days?: number;
  last_rating?: string;
}

export interface ReviewItemVm {
  id: string;
  lesson_type: string;
  title: string;
  score?: number;
  status: string;
}

export interface ReviewResponse {
  srsItems?: SrsCardVm[];
  lessonProgress?: ReviewItemVm[];
}

export interface SrsResponse {
  items: SrsCardVm[];
}

export interface WorldviewHubResponse {
  counts: { nodes: number; sources: number; notes: number; documents: number };
}

export interface WorldviewNodeVm {
  id: string;
  title: string;
  node_type: string;
  text_plain?: string;
  summary?: string;
  status?: string;
  edge_count: number;
  evidence_count: number;
  quran_link_count: number;
}

export interface WorldviewNodesResponse {
  nodes: WorldviewNodeVm[];
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

export interface WorldviewSourcesResponse {
  sources: WorldviewSourceVm[];
}

export interface WorldviewPodcastVm {
  id: string;
  title: string;
  content_type: string;
  status?: string;
}

export interface WorldviewPodcastsResponse {
  podcasts: WorldviewPodcastVm[];
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

export interface WorldviewDocumentsResponse {
  documents: WorldviewDocumentVm[];
}

export interface WorldviewNoteVm {
  id: string;
  title?: string;
  note_kind?: string;
  excerpt_text?: string;
  body_md?: string;
  status?: string;
  source_title?: string;
  created_at?: string;
}

export interface WorldviewNotesResponse {
  notes: WorldviewNoteVm[];
}

export interface WorldviewLinkVm {
  id: string;
  relation_type: string;
  target_title?: string;
  target_type?: string;
  note?: string;
}

export interface WorldviewLinksResponse {
  links: WorldviewLinkVm[];
}

// ── Passage Study Lesson ──────────────────────────────────

export interface StudyAyahVm {
  ayah: number;
  text: string;
  text_simple?: string;
  translation_haleem?: string;
  translation_asad?: string;
  translation_sahih?: string;
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
}

export interface StudyExpressionVm {
  expression_id: string;
  ayah: number;
  label?: string;
  text?: string;
  meaning?: string;
  gloss?: string;
}

export interface StudyTaskVm {
  task_id: string;
  task_type: string;
  task_name?: string;
  step_no?: number;
  status?: string;
  task_json?: string;
  children?: StudyTaskVm[];
}

export interface StudyUnitMeta {
  unit_id: string;
  order_index: number;
  ayah_from?: number;
  ayah_to?: number;
  start_ref?: string;
  end_ref?: string;
  text_cache?: string;
  label?: string;
  theme?: string;
}

export interface StudyLessonResponse {
  ok: boolean;
  unit: StudyUnitMeta;
  ayahs: StudyAyahVm[];
  vocabulary: {
    nouns: StudyWordVm[];
    verbs: StudyWordVm[];
  };
  expressions: StudyExpressionVm[];
  tasks: StudyTaskVm[];
}

@Injectable({ providedIn: 'root' })
export class SurahModulesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  private url(surahId: number, ...segments: string[]): string {
    return `${this.base}/quran/surah/${surahId}/${segments.join('/')}`;
  }

  getStudyGrid(surahId: number): Observable<StudyGridResponse> {
    return this.http.get<StudyGridResponse>(this.url(surahId, 'study'));
  }

  getStudyLesson(surahId: number, passageNo: number): Observable<StudyLessonResponse> {
    return this.http.get<StudyLessonResponse>(this.url(surahId, 'study', String(passageNo)));
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
}
