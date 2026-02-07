import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  QuranLessonCommitRequest,
  QuranLessonCommitStep,
  QuranLessonService,
} from '../../../../../shared/services/quran-lesson.service';
import { PageHeaderService } from '../../../../../shared/services/page-header.service';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import {
  QuranLesson,
  QuranLessonAyahUnit,
  QuranLessonComprehensionQuestion,
  QuranLessonLemmaLocation,
  QuranLessonMcq,
  QuranLessonSpanV2,
  QuranLessonTokenV2,
  QuranLessonUnit,
} from '../../../../../shared/models/arabic/quran-lesson.model';

import {
  BuilderTab,
  BuilderTabId,
  BuilderTabState,
  ValidationItem,
  VerseSelection,
} from './components/lesson-builder.types';
import { LessonBuilderHeaderComponent } from './components/lesson-builder-header.component';
import { LessonBuilderTabsComponent } from './components/lesson-builder-tabs.component';
import { DirtyStateBarComponent } from './components/dirty-state-bar.component';
import { TabLockBannerComponent } from './components/tab-lock-banner.component';
import { LessonMetaFormComponent } from './components/lesson-meta-form.component';
import { VerseRangePickerComponent } from './components/verse-range-picker.component';
import { SelectionSummaryCardComponent } from './components/selection-summary-card.component';
import { VersePreviewListComponent } from './components/verse-preview-list.component';
import { ContainerBuilderFormComponent } from './components/container-builder-form.component';
import { CreateContainerButtonRowComponent } from './components/create-container-button-row.component';
import { PassageUnitBuilderComponent } from './components/passage-unit-builder.component';
import { BulkActionsComponent } from './components/bulk-actions.component';
import { VerseUnitsTableComponent } from './components/verse-units-table.component';
import { LessonUnitLinkPanelComponent } from './components/lesson-unit-link-panel.component';
import { UnitNavigatorComponent } from './components/unit-navigator.component';
import { CenterWorkspaceOutletComponent } from './components/center-workspace-outlet.component';
import { ContextRightPaneComponent } from './components/context-right-pane.component';
import { OccTokenGridComponent } from './components/occ-token-grid.component';
import { LemmaLocationPanelComponent } from './components/lemma-location-panel.component';
import { GrammarLinkPanelComponent } from './components/grammar-link-panel.component';
import { SentenceSegmentationCanvasComponent } from './components/sentence-segmentation-canvas.component';
import { SentenceListComponent } from './components/sentence-list.component';
import { SentenceUpsertActionsComponent } from './components/sentence-upsert-actions.component';
import { SpanBuilderComponent } from './components/span-builder.component';
import { GrammarMatrixComponent } from './components/grammar-matrix.component';
import { SentenceTreeCanvasComponent } from './components/sentence-tree-canvas.component';
import { McqEditorComponent } from './components/mcq-editor.component';
import { ReflectiveQuestionsComponent } from './components/reflective-questions.component';
import { AnalyticalQuestionsComponent } from './components/analytical-questions.component';
import { LessonValidationChecklistComponent } from './components/lesson-validation-checklist.component';
import { RawJsonEditorComponent } from './components/raw-json-editor.component';

type GrammarTargetType = 'token' | 'span' | 'sentence';

type GrammarLinkStore = {
  token: Record<string, string[]>;
  span: Record<string, string[]>;
  sentence: Record<string, string[]>;
};

type SentenceTreeNode = {
  id: string;
  label: string;
  type: 'clause' | 'phrase' | 'span_ref' | 'token_group';
  tokenRange?: string;
};

type SentenceTreeEdge = {
  from: string;
  to: string;
  label?: string;
};

type SentenceTreeState = {
  nodes: SentenceTreeNode[];
  edges: SentenceTreeEdge[];
};

type SaveStatusTone = 'info' | 'success' | 'error';
type DraftCommitStep = 'meta' | 'units' | 'sentences' | 'comprehension' | 'notes';

const BUILDER_TABS: BuilderTab[] = [
  { id: 'meta', label: 'Lesson Info', intent: 'Create lesson envelope first' },
  { id: 'verses', label: 'Select Verses', intent: 'Pick surah + ayah range and preview' },
  { id: 'container', label: 'Create Container + Passage Unit', intent: 'Build lesson container foundation' },
  { id: 'units', label: 'Attach Verse Units', intent: 'Ensure every verse unit is linked' },
  { id: 'tokens', label: 'Tokens + Lemmas', intent: 'Fix token alignment and lemma locations' },
  { id: 'spans', label: 'Spans / Expressions', intent: 'Build span layer from tokens' },
  { id: 'sentences', label: 'Sentences Builder', intent: 'Create occurrence sentences from token ranges' },
  { id: 'grammar', label: 'Grammar Concepts', intent: 'Link grammar to token/span/sentence targets' },
  { id: 'tree', label: 'Sentence Tree', intent: 'Build clause graph per sentence occurrence' },
  { id: 'content', label: 'MCQs + Questions', intent: 'Author lesson overlays' },
  { id: 'review', label: 'Validate + Publish', intent: 'Run checks before publish' },
  { id: 'dev', label: 'Raw JSON / Tools', intent: 'Use low-level JSON and debug helpers' },
];

const DRAFT_KEY_PREFIX = 'km:quran-lesson-builder:draft';
const DRAFT_ID_KEY_PREFIX = 'km:quran-lesson-builder:draft-id';

const DRAFT_COMMIT_STEP_BY_TAB: Partial<Record<BuilderTabId, DraftCommitStep>> = {
  meta: 'meta',
  units: 'units',
  sentences: 'sentences',
  content: 'comprehension',
  review: 'notes',
};

const LEGACY_COMMIT_STEP_BY_TAB: Partial<Record<BuilderTabId, QuranLessonCommitStep>> = {
  container: 'container',
  tokens: 'tokens',
  spans: 'spans',
  grammar: 'grammar',
};

type LocalDraftSnapshot = {
  savedAt: string;
  activeTabId: BuilderTabId;
  lesson: QuranLesson;
  verseSelection: VerseSelection;
  containerForm: {
    title: string;
    surah: number;
    ayahFrom: number;
    ayahTo: number;
    containerId: string;
    unitId: string;
  };
  sentenceForm: {
    text: string;
    translation: string;
    tokens: string;
    spans: string;
    grammarIds: string;
  };
  draftId?: string | null;
  draftVersion?: number | null;
};

@Component({
  selector: 'app-quran-lesson-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LessonBuilderHeaderComponent,
    LessonBuilderTabsComponent,
    DirtyStateBarComponent,
    TabLockBannerComponent,
    LessonMetaFormComponent,
    VerseRangePickerComponent,
    SelectionSummaryCardComponent,
    VersePreviewListComponent,
    ContainerBuilderFormComponent,
    CreateContainerButtonRowComponent,
    PassageUnitBuilderComponent,
    BulkActionsComponent,
    VerseUnitsTableComponent,
    LessonUnitLinkPanelComponent,
    UnitNavigatorComponent,
    CenterWorkspaceOutletComponent,
    ContextRightPaneComponent,
    OccTokenGridComponent,
    LemmaLocationPanelComponent,
    GrammarLinkPanelComponent,
    SentenceSegmentationCanvasComponent,
    SentenceListComponent,
    SentenceUpsertActionsComponent,
    SpanBuilderComponent,
    GrammarMatrixComponent,
    SentenceTreeCanvasComponent,
    McqEditorComponent,
    ReflectiveQuestionsComponent,
    AnalyticalQuestionsComponent,
    LessonValidationChecklistComponent,
    RawJsonEditorComponent,
  ],
  templateUrl: './quran-lesson-editor.component.html',
  styleUrls: ['./quran-lesson-editor.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class QuranLessonEditorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(QuranLessonService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly quranData = inject(QuranDataService);
  private readonly arabicDiacriticsRe = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

  readonly tabs: BuilderTab[] = BUILDER_TABS;
  readonly surahOptions = Array.from({ length: 114 }, (_, index) => index + 1);
  readonly grammarConcepts = ['اسم', 'فعل', 'حرف'];
  private readonly grammarConceptLegacyMap: Record<string, string> = {
    ism: 'اسم',
    fi_l: 'فعل',
    harf: 'حرف',
  };

  lesson: QuranLesson | null = null;
  activeTabId: BuilderTabId = 'meta';
  lessonJson = '';
  isSaving = false;
  isNewLesson = false;
  draftId: string | null = null;
  draftVersion: number | null = null;
  draftStatus: string | null = null;

  verseSelection: VerseSelection = {
    surah: 1,
    ayahFrom: 1,
    ayahTo: 7,
  };

  containerForm = {
    title: '',
    surah: 1,
    ayahFrom: 1,
    ayahTo: 7,
    containerId: '',
    unitId: '',
  };

  sentenceForm = {
    text: '',
    translation: '',
    tokens: '',
    spans: '',
    grammarIds: '',
  };

  grammarFocusType: GrammarTargetType = 'token';
  selectedGrammarTargetId: Record<GrammarTargetType, string> = {
    token: '',
    span: '',
    sentence: '',
  };
  grammarLinks: GrammarLinkStore = {
    token: {},
    span: {},
    sentence: {},
  };

  sentenceTrees: Record<string, SentenceTreeState> = {};
  selectedSentenceIdForTree = '';
  selectedVerseUnitId = '';

  occurrenceFeedback: string | null = null;
  saveStatusMessage: string | null = null;
  saveStatusTone: SaveStatusTone = 'info';
  metaComprehensionJson = '{}';
  metaNotesJson = '[]';
  metaJsonError: string | null = null;
  jsonError = '';
  lookupTokensLoading = false;
  lookupSplitAffixes = true;
  isNormalizing = false;

  async ngOnInit() {
    this.pageHeaderService.clearTabs();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const parsedId = Number(idParam);
      if (!Number.isNaN(parsedId)) {
        await this.loadLesson(parsedId);
        return;
      }
    }
    await this.initializeNewLesson();
  }

  ngOnDestroy() {
    this.pageHeaderService.clearTabs();
  }

  get activeTabIndex() {
    return this.tabs.findIndex((tab) => tab.id === this.activeTabId);
  }

  get activeTabIntent() {
    return this.tabs[this.activeTabIndex]?.intent ?? '';
  }

  get canGoPrevTab() {
    return this.activeTabIndex > 0;
  }

  get canGoNextTab() {
    return this.activeTabIndex >= 0 && this.activeTabIndex < this.tabs.length - 1;
  }

  get lockedTabs(): Partial<Record<BuilderTabId, string>> {
    const hasVerses = this.safeArabicVerses.length > 0;
    const hasPassage = this.safeUnits.some((unit) => unit.unit_type === 'passage');
    const hasAyahUnits = this.safeUnits.some((unit) => unit.unit_type === 'ayah');
    const hasTokens = this.safeTokens.length > 0;
    const hasSpans = this.safeSpans.length > 0;
    const hasSentences = this.safeSentences.length > 0;

    const locks: Partial<Record<BuilderTabId, string>> = {};

    if (!hasVerses) {
      locks.container = 'Select verses first in the Select Verses tab.';
      locks.units = 'Select verses first in the Select Verses tab.';
      locks.tokens = 'Select verses and attach units first.';
      locks.spans = 'Select verses and attach units first.';
      locks.sentences = 'Select verses and attach units first.';
      locks.grammar = 'Build token/span/sentence layers first.';
      locks.tree = 'Build sentences first.';
    }

    if (hasVerses && !hasPassage) {
      locks.units = 'Create passage unit first in the Container tab.';
    }

    if (hasVerses && !hasAyahUnits) {
      locks.tokens = 'Attach verse units first in the Units tab.';
      locks.spans = 'Attach verse units first in the Units tab.';
      locks.sentences = 'Attach verse units first in the Units tab.';
      locks.grammar = 'Attach verse units first, then create data layers.';
      locks.tree = 'Attach verse units first, then create sentences.';
    }

    if (!hasTokens) {
      locks.spans = locks.spans ?? 'Create tokens first.';
      locks.sentences = locks.sentences ?? 'Create tokens first.';
    }

    if (!hasTokens && !hasSpans && !hasSentences) {
      locks.grammar = locks.grammar ?? 'Create token/span/sentence targets first.';
    }

    if (!hasSentences) {
      locks.tree = locks.tree ?? 'Create sentences first.';
    }

    return locks;
  }

  get activeTabLockMessage() {
    return this.lockedTabs[this.activeTabId] ?? '';
  }

  selectTab(tabId: BuilderTabId) {
    if (this.lockedTabs[tabId]) return;
    this.activeTabId = tabId;
    this.scrollEditorIntoView();
  }

  goPrevTab() {
    for (let index = this.activeTabIndex - 1; index >= 0; index -= 1) {
      const tabId = this.tabs[index].id;
      if (!this.lockedTabs[tabId]) {
        this.activeTabId = tabId;
        this.scrollEditorIntoView();
        return;
      }
    }
  }

  goNextTab() {
    for (let index = this.activeTabIndex + 1; index < this.tabs.length; index += 1) {
      const tabId = this.tabs[index].id;
      if (!this.lockedTabs[tabId]) {
        this.activeTabId = tabId;
        this.scrollEditorIntoView();
        return;
      }
    }
  }

  async save() {
    if (!this.lesson) return;
    this.isSaving = true;
    this.normalizeBeforeSave();
    this.saveDraftLocal();
    this.setSaveStatus('Saving draft locally...', 'info');

    try {
      await this.ensureDraftInitialized();
      await this.persistDraftToServer();

      const saveResult = await this.saveCurrentStep(this.activeTabId);
      this.occurrenceFeedback = saveResult.message;
      this.setSaveStatus(saveResult.message, saveResult.tone);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      this.occurrenceFeedback = `Save failed: ${message}`;
      this.setSaveStatus(`Save failed: ${message}`, 'error');
    } finally {
      this.isSaving = false;
    }
  }

  async normalizeLessonIds() {
    if (!this.lesson || this.isNormalizing) return;
    this.isNormalizing = true;
    this.setSaveStatus('Normalizing lesson IDs...', 'info');
    try {
      this.applyIdNormalization();
      this.normalizeBeforeSave();
      await this.ensureDraftInitialized();
      await this.persistDraftToServer();
      const lessonId = this.getLessonId();
      if (lessonId) {
        await firstValueFrom(this.service.updateLesson(lessonId, this.lesson));
      }
      this.setSaveStatus('Normalized and synced to server.', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Normalization failed';
      this.setSaveStatus(`Normalization failed: ${message}`, 'error');
    } finally {
      this.isNormalizing = false;
    }
  }

  back() {
    if (this.isNewLesson) {
      this.router.navigate(['/arabic/quran/lessons']);
      return;
    }
    this.router.navigate(['../view'], { relativeTo: this.route });
  }

  openView() {
    if (!this.lesson?.id || this.isNewLesson) return;
    this.navigateToView(this.lesson.id);
  }

  applyFullJson(_payload?: string) {
    if (!this.lessonJson.trim()) return;
    try {
      const parsed = JSON.parse(this.lessonJson) as QuranLesson;
      parsed.id = parsed.id || this.lesson?.id || 'new';
      parsed.lesson_type = 'quran';
      this.lesson = parsed;
      this.ensureDefaults();
      this.syncMetaJsonInputs();
      this.onLessonEdited();
      this.jsonError = '';
    } catch (error: unknown) {
      this.jsonError = error instanceof Error ? error.message : 'Invalid JSON';
    }
  }

  onLessonEdited() {
    if (!this.lesson) return;
    this.syncBuilderExtrasToLesson();
    this.lessonJson = JSON.stringify(this.lesson, null, 2);
    this.saveDraftLocal();
  }

  onMetaComprehensionJsonChange(value: string) {
    this.metaComprehensionJson = value;
    if (!this.lesson) return;
    try {
      const parsed = JSON.parse(value || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Comprehension must be a JSON object.');
      }
      this.lesson.comprehension = parsed as QuranLesson['comprehension'];
      this.metaJsonError = null;
      this.onLessonEdited();
    } catch (error: unknown) {
      this.metaJsonError = error instanceof Error ? error.message : 'Invalid comprehension JSON.';
    }
  }

  onMetaNotesJsonChange(value: string) {
    this.metaNotesJson = value;
    if (!this.lesson) return;
    try {
      const parsed = JSON.parse(value || '[]');
      const lessonAny = this.lesson as unknown as Record<string, unknown>;
      lessonAny['notes'] = parsed;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.lesson._notes = parsed as Record<string, string | null>;
      }
      this.metaJsonError = null;
      this.onLessonEdited();
    } catch (error: unknown) {
      this.metaJsonError = error instanceof Error ? error.message : 'Invalid notes JSON.';
    }
  }

  get safeReference(): NonNullable<QuranLesson['reference']> {
    if (!this.lesson) return {} as NonNullable<QuranLesson['reference']>;
    this.lesson.reference = this.lesson.reference ?? {};
    return this.lesson.reference;
  }

  get safeArabicVerses(): QuranLessonAyahUnit[] {
    if (!this.lesson) return [];
    if (!this.lesson.text) {
      this.lesson.text = { arabic_full: [], mode: 'original' };
    }
    if (!Array.isArray(this.lesson.text.arabic_full)) {
      this.lesson.text.arabic_full = [];
    }
    return this.lesson.text.arabic_full;
  }

  get safeSentences(): QuranLesson['sentences'] {
    if (!this.lesson) return [];
    if (!Array.isArray(this.lesson.sentences)) {
      this.lesson.sentences = [];
    }
    return this.lesson.sentences;
  }

  get safeUnits(): QuranLessonUnit[] {
    if (!this.lesson) return [];
    if (!Array.isArray(this.lesson.units)) {
      this.lesson.units = [];
    }
    return this.lesson.units;
  }

  get safeTokens(): QuranLessonTokenV2[] {
    const analysis = this.ensureAnalysis();
    if (!Array.isArray(analysis.tokens)) {
      analysis.tokens = [];
    }
    return analysis.tokens;
  }

  get safeSpans(): QuranLessonSpanV2[] {
    const analysis = this.ensureAnalysis();
    if (!Array.isArray(analysis.spans)) {
      analysis.spans = [];
    }
    return analysis.spans;
  }

  get safeMcqQuestions(): QuranLessonMcq[] {
    const comprehension = this.ensureComprehension();
    const mcqs = comprehension.mcqs;
    if (Array.isArray(mcqs)) {
      return mcqs;
    }
    if (!mcqs || typeof mcqs !== 'object') {
      comprehension.mcqs = [];
      return [];
    }

    const typed = mcqs as {
      text?: QuranLessonMcq[];
      vocabulary?: QuranLessonMcq[];
      grammar?: QuranLessonMcq[];
    };
    const flat = [
      ...(Array.isArray(typed.text) ? typed.text : []),
      ...(Array.isArray(typed.vocabulary) ? typed.vocabulary : []),
      ...(Array.isArray(typed.grammar) ? typed.grammar : []),
    ];
    comprehension.mcqs = flat;
    return flat;
  }

  get reflectiveQuestions(): QuranLessonComprehensionQuestion[] {
    const comprehension = this.ensureComprehension();
    if (!Array.isArray(comprehension.reflective)) {
      comprehension.reflective = [];
    }
    return comprehension.reflective;
  }

  get analyticalQuestions(): QuranLessonComprehensionQuestion[] {
    const comprehension = this.ensureComprehension();
    if (!Array.isArray(comprehension.analytical)) {
      comprehension.analytical = [];
    }
    return comprehension.analytical;
  }

  get selectedVerse() {
    const verses = this.safeArabicVerses;
    if (!verses.length) return null;
    const selected = verses.find((verse) => verse.unit_id === this.selectedVerseUnitId);
    return selected ?? verses[0];
  }

  get selectedVerseNavItems() {
    return this.safeArabicVerses.map((verse) => ({
      unit_id: verse.unit_id,
      surah: verse.surah,
      ayah: verse.ayah,
    }));
  }

  get selectedVerseLemmas() {
    const verse = this.selectedVerse;
    if (!verse) return [];
    return this.getVerseLemmas(verse);
  }

  get selectedVerseTokens() {
    const unitId = this.selectedVerse?.unit_id;
    if (!unitId) return [];
    return this.safeTokens.filter((token) => token.unit_id === unitId);
  }

  get canLookupTokens() {
    return !!this.selectedVerse && !this.lookupTokensLoading;
  }

  get selectedVerseSentences() {
    const unitId = this.selectedVerse?.unit_id;
    if (!unitId) return [];
    return this.safeSentences.filter((sentence) => sentence.unit_id === unitId);
  }

  get selectedVerseSpans() {
    const unitId = this.selectedVerse?.unit_id;
    if (!unitId) return [];
    return this.safeSpans.filter((span) => span.unit_id === unitId);
  }

  get proposedContainerId() {
    return this.composeContainerId(this.verseSelection.surah);
  }

  get proposedPassageUnitId() {
    return this.composePassageUnitId(
      this.verseSelection.surah,
      this.verseSelection.ayahFrom,
      this.verseSelection.ayahTo
    );
  }

  get verseAyahNumbers() {
    return this.buildAyahRange(this.verseSelection.ayahFrom, this.verseSelection.ayahTo);
  }

  get verseUnitRows() {
    return this.verseAyahNumbers.map((ayah) => {
      const linkedUnit = this.safeUnits.find(
        (unit) =>
          unit.unit_type === 'ayah' &&
          unit.ayah_from === ayah &&
          unit.ayah_to === ayah &&
          (unit.start_ref ?? '').startsWith(`Q:${this.verseSelection.surah}:`)
      );
      return {
        surah: this.verseSelection.surah,
        ayah,
        unitId: linkedUnit?.id ?? this.composeAyahUnitId(this.verseSelection.surah, ayah),
        exists: !!linkedUnit,
        orderIndex: linkedUnit?.order_index ?? null,
      };
    });
  }

  get tokenGrammarTargets() {
    return this.selectedVerseTokens.map((token, index) => ({
      id: token.token_occ_id,
      label: `${index + 1}. ${token.surface_ar || token.lemma_ar || token.token_occ_id}`,
    }));
  }

  get spanGrammarTargets() {
    return this.selectedVerseSpans.map((span, index) => ({
      id: span.span_occ_id,
      label: `${index + 1}. ${span.text_cache || span.u_span_id || span.span_occ_id}`,
    }));
  }

  get sentenceGrammarTargets() {
    return this.selectedVerseSentences.map((sentence, index) => ({
      id: sentence.sentence_id,
      label: `${index + 1}. ${sentence.arabic || sentence.text.arabic || sentence.sentence_id}`,
    }));
  }

  get grammarMatrixRows() {
    const concepts = new Set<string>();
    for (const map of [this.grammarLinks.token, this.grammarLinks.span, this.grammarLinks.sentence]) {
      for (const links of Object.values(map)) {
        for (const concept of links) {
          concepts.add(concept);
        }
      }
    }

    return Array.from(concepts)
      .sort((a, b) => a.localeCompare(b))
      .map((concept) => ({
        concept,
        tokenCount: this.countConceptLinks(this.grammarLinks.token, concept),
        spanCount: this.countConceptLinks(this.grammarLinks.span, concept),
        sentenceCount: this.countConceptLinks(this.grammarLinks.sentence, concept),
      }));
  }

  get treeSentenceTargets() {
    return this.selectedVerseSentences.map((sentence, index) => ({
      id: sentence.sentence_id,
      label: `Sentence ${index + 1} (#${sentence.sentence_order ?? '-'})`,
    }));
  }

  get activeSentenceTree(): SentenceTreeState | null {
    const sentenceId = this.selectedSentenceIdForTree;
    if (!sentenceId) return null;
    return this.ensureTree(sentenceId);
  }

  get tabCompletion(): Record<BuilderTabId, boolean> {
    const health = this.getWorkflowHealth();
    const hasPublishedStatus = (this.lesson?.status ?? '').toLowerCase() === 'published';
    return {
      meta: health.titleOk,
      verses: health.versesOk,
      container: health.passageOk,
      units: health.unitsOk,
      tokens: health.tokensOk,
      spans: health.spansOk,
      sentences: health.sentencesOk,
      grammar: health.grammarOk,
      tree: health.treeOk,
      content: health.contentOk,
      review: hasPublishedStatus || this.reviewItems.every((item) => item.ok),
      dev: !!this.lessonJson.trim(),
    };
  }

  get tabStatuses(): Partial<Record<BuilderTabId, BuilderTabState>> {
    const completion = this.tabCompletion;
    const locks = this.lockedTabs;
    const statuses: Partial<Record<BuilderTabId, BuilderTabState>> = {};

    let previousStepReady = true;
    for (const tab of this.tabs) {
      const tabId = tab.id;
      if (locks[tabId]) {
        statuses[tabId] = 'locked';
        continue;
      }
      if (tabId === this.activeTabId) {
        statuses[tabId] = 'active';
      } else if (completion[tabId]) {
        statuses[tabId] = 'done';
      } else if (tabId === 'review' && this.hasCoreProgress() && !this.canPublish) {
        statuses[tabId] = 'error';
      } else {
        statuses[tabId] = previousStepReady ? 'ready' : 'todo';
      }
      previousStepReady = previousStepReady && completion[tabId];
    }

    return statuses;
  }

  get reviewItems(): ValidationItem[] {
    const health = this.getWorkflowHealth();

    return [
      {
        key: 'meta',
        label: 'Lesson metadata',
        ok: health.titleOk,
        detail: health.titleOk ? 'Title is set.' : 'Missing title.',
      },
      {
        key: 'verses',
        label: 'Verse selection',
        ok: health.versesOk,
        detail: health.versesOk ? `${this.safeArabicVerses.length} verses selected.` : 'No verses selected.',
      },
      {
        key: 'passage',
        label: 'Passage unit',
        ok: health.passageOk,
        detail: health.passageOk ? 'Passage unit exists.' : 'Create passage unit in Container tab.',
      },
      {
        key: 'units',
        label: 'Verse units attached',
        ok: health.unitsOk,
        detail: health.unitsOk ? 'All verse units attached.' : `${health.unitCount}/${this.verseUnitRows.length} attached.`,
      },
      {
        key: 'tokens',
        label: 'Token layer',
        ok: health.tokensOk,
        detail: health.tokensOk ? `${this.safeTokens.length} tokens present.` : 'No tokens yet.',
      },
      {
        key: 'spans',
        label: 'Span layer',
        ok: health.spansOk,
        detail: health.spansOk ? `${this.safeSpans.length} spans present.` : 'No spans yet.',
      },
      {
        key: 'sentences',
        label: 'Sentence layer',
        ok: health.sentencesOk,
        detail: health.sentencesOk ? `${this.safeSentences.length} sentences present.` : 'No sentences yet.',
      },
      {
        key: 'grammar',
        label: 'Grammar links',
        ok: health.grammarOk,
        detail: health.grammarOk ? 'Grammar links exist.' : 'No grammar links yet.',
      },
      {
        key: 'tree',
        label: 'Sentence trees',
        ok: health.treeOk,
        detail: health.treeOk ? 'Tree data exists.' : 'No sentence tree yet.',
      },
    ];
  }

  get completionPercent() {
    const items = this.reviewItems;
    const okCount = items.filter((item) => item.ok).length;
    return items.length ? Math.round((okCount / items.length) * 100) : 0;
  }

  get canPublish() {
    return this.reviewItems.every((item) => item.ok);
  }

  private hasCoreProgress() {
    return (
      !!this.lesson?.title?.trim() ||
      this.safeArabicVerses.length > 0 ||
      this.safeUnits.length > 0 ||
      this.safeTokens.length > 0 ||
      this.safeSentences.length > 0
    );
  }

  private scrollEditorIntoView() {
    const doc = (globalThis as any)?.document as Document | undefined;
    const panel = doc?.querySelector('.builder-panel');
    if (!panel || typeof (panel as any).scrollIntoView !== 'function') return;
    (panel as any).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private getWorkflowHealth() {
    const unitCount = this.verseUnitRows.filter((row) => row.exists).length;
    const contentOk =
      this.safeMcqQuestions.length > 0 || this.reflectiveQuestions.length > 0 || this.analyticalQuestions.length > 0;

    return {
      titleOk: !!this.lesson?.title?.trim(),
      versesOk: this.safeArabicVerses.length > 0,
      passageOk: this.safeUnits.some((unit) => unit.unit_type === 'passage'),
      unitsOk: this.verseUnitRows.length > 0 && unitCount === this.verseUnitRows.length,
      unitCount,
      tokensOk: this.safeTokens.length > 0,
      spansOk: this.safeSpans.length > 0,
      sentencesOk: this.safeSentences.length > 0,
      grammarOk:
        Object.keys(this.grammarLinks.token).length +
          Object.keys(this.grammarLinks.span).length +
          Object.keys(this.grammarLinks.sentence).length >
        0,
      treeOk: Object.keys(this.sentenceTrees).length > 0,
      contentOk,
    };
  }

  async publishDraft() {
    if (!this.lesson) return;
    if (!this.draftId || this.draftVersion == null) {
      this.occurrenceFeedback = 'Draft is not initialized yet.';
      this.setSaveStatus('Draft is not initialized yet.', 'error');
      return;
    }
    this.isSaving = true;
    this.setSaveStatus('Publishing draft...', 'info');
    try {
      const response = await firstValueFrom(
        this.service.publishDraft(this.draftId, { draft_version: this.draftVersion })
      );
      this.lesson.status = response.status ?? 'published';
      this.occurrenceFeedback = 'Lesson published.';
      this.setSaveStatus('Lesson published.', 'success');
      this.onLessonEdited();
    } catch (error: unknown) {
      const message = this.readCommitError(error);
      this.occurrenceFeedback = `Publish failed: ${message}`;
      this.setSaveStatus(`Publish failed: ${message}`, 'error');
    } finally {
      this.isSaving = false;
    }
  }

  applyVerseSelection() {
    if (!this.lesson) return;

    const surah = this.clampNumber(this.verseSelection.surah, 1, 114, 1);
    const ayahFrom = this.clampNumber(this.verseSelection.ayahFrom, 1, 286, 1);
    const ayahTo = this.clampNumber(this.verseSelection.ayahTo, ayahFrom, 286, ayahFrom);

    this.verseSelection = { surah, ayahFrom, ayahTo };
    this.containerForm.surah = surah;
    this.containerForm.ayahFrom = ayahFrom;
    this.containerForm.ayahTo = ayahTo;

    const existingByAyah = new Map<number, QuranLessonAyahUnit>();
    for (const verse of this.safeArabicVerses) {
      if (verse.surah === surah) {
        existingByAyah.set(verse.ayah, verse);
      }
    }

    const nextVerses = this.buildAyahRange(ayahFrom, ayahTo).map((ayah) => {
      const existing = existingByAyah.get(ayah);
      if (existing) {
        existing.unit_id = existing.unit_id || this.composeAyahUnitId(surah, ayah);
        existing.surah = surah;
        existing.ayah = ayah;
        return existing;
      }
      return {
        unit_id: this.composeAyahUnitId(surah, ayah),
        unit_type: 'ayah',
        arabic: '',
        translation: null,
        surah,
        ayah,
        notes: null,
        lemmas: [],
      } satisfies QuranLessonAyahUnit;
    });

    this.lesson.text.arabic_full = nextVerses;
    this.safeReference.surah = surah;
    this.safeReference.ayah_from = ayahFrom;
    this.safeReference.ayah_to = ayahTo;
    this.safeReference.ref_label = this.safeReference.ref_label || `Surah ${surah}:${ayahFrom}-${ayahTo}`;

    this.selectedVerseUnitId = nextVerses[0]?.unit_id ?? '';
    this.syncContextSelections();
    this.onLessonEdited();
  }

  selectVerse(unitId: string) {
    this.selectedVerseUnitId = unitId;
    this.syncContextSelections();
  }

  createPassageUnitDraft() {
    if (!this.lesson) return;

    const unitId = this.composePassageUnitId(
      this.verseSelection.surah,
      this.verseSelection.ayahFrom,
      this.verseSelection.ayahTo
    );
    const startRef = `Q:${this.verseSelection.surah}:${this.verseSelection.ayahFrom}`;
    const endRef = `Q:${this.verseSelection.surah}:${this.verseSelection.ayahTo}`;

    const existing = this.safeUnits.find((unit) => unit.id === unitId || unit.unit_type === 'passage');
    if (existing) {
      existing.id = unitId;
      existing.unit_type = 'passage';
      existing.ayah_from = this.verseSelection.ayahFrom;
      existing.ayah_to = this.verseSelection.ayahTo;
      existing.start_ref = startRef;
      existing.end_ref = endRef;
      existing.text_cache = this.safeArabicVerses.map((verse) => verse.arabic).filter(Boolean).join(' ');
    } else {
      this.safeUnits.push({
        id: unitId,
        unit_type: 'passage',
        order_index: 0,
        ayah_from: this.verseSelection.ayahFrom,
        ayah_to: this.verseSelection.ayahTo,
        start_ref: startRef,
        end_ref: endRef,
        text_cache: this.safeArabicVerses.map((verse) => verse.arabic).filter(Boolean).join(' '),
        meta_json: null,
      });
    }

    this.containerForm.unitId = unitId;
    this.onLessonEdited();
  }

  attachVerseUnit(ayah: number) {
    if (!this.lesson) return;

    const unitId = this.composeAyahUnitId(this.verseSelection.surah, ayah);
    const startRef = `Q:${this.verseSelection.surah}:${ayah}`;

    const existing = this.safeUnits.find(
      (unit) => unit.unit_type === 'ayah' && unit.ayah_from === ayah && unit.ayah_to === ayah
    );

    if (existing) {
      existing.id = unitId;
      existing.start_ref = startRef;
      existing.end_ref = startRef;
      existing.order_index = ayah - this.verseSelection.ayahFrom + 1;
    } else {
      this.safeUnits.push({
        id: unitId,
        unit_type: 'ayah',
        order_index: ayah - this.verseSelection.ayahFrom + 1,
        ayah_from: ayah,
        ayah_to: ayah,
        start_ref: startRef,
        end_ref: startRef,
        text_cache: this.safeArabicVerses.find((verse) => verse.ayah === ayah)?.arabic ?? '',
        meta_json: null,
      });
    }

    const verse = this.safeArabicVerses.find((entry) => entry.surah === this.verseSelection.surah && entry.ayah === ayah);
    if (verse) {
      verse.unit_id = unitId;
    }

    this.onLessonEdited();
  }

  attachAllVerseUnits() {
    for (const ayah of this.verseAyahNumbers) {
      this.attachVerseUnit(ayah);
    }
    this.fixVerseUnitOrder();
  }

  fixVerseUnitOrder() {
    const ayahUnits = this.safeUnits
      .filter((unit) => unit.unit_type === 'ayah' && unit.ayah_from != null)
      .sort((a, b) => Number(a.ayah_from ?? 0) - Number(b.ayah_from ?? 0));
    ayahUnits.forEach((unit, index) => {
      unit.order_index = index + 1;
    });
    this.onLessonEdited();
  }

  removeLessonUnit(unitId: string) {
    const index = this.safeUnits.findIndex((unit) => unit.id === unitId);
    if (index < 0) return;
    this.safeUnits.splice(index, 1);
    this.onLessonEdited();
  }

  addLemmaToSelectedVerse() {
    const verse = this.selectedVerse;
    if (!verse) return;
    this.addLemma(verse);
  }

  removeSelectedVerseLemma(index: number) {
    const verse = this.selectedVerse;
    if (!verse) return;
    this.removeLemma(verse, index);
  }

  addLemma(verse: QuranLessonAyahUnit) {
    const lemmas = this.getVerseLemmas(verse);
    lemmas.push({
      lemma_id: 0,
      lemma_text: '',
      lemma_text_clean: '',
      words_count: null,
      uniq_words_count: null,
      word_location: '',
      token_index: 0,
      ar_token_occ_id: null,
      ar_u_token: null,
      word_simple: null,
      word_diacritic: null,
    });
    this.onLessonEdited();
  }

  removeLemma(verse: QuranLessonAyahUnit, index: number) {
    const lemmas = this.getVerseLemmas(verse);
    lemmas.splice(index, 1);
    this.onLessonEdited();
  }

  addTokenForSelectedVerse() {
    const unitId = this.selectedVerse?.unit_id ?? null;
    const currentCount = this.selectedVerseTokens.length;
    this.safeTokens.push({
      token_occ_id: crypto.randomUUID(),
      u_token_id: '',
      u_root_id: null,
      container_id: this.containerForm.containerId || '',
      unit_id: unitId,
      pos_index: currentCount,
      surface_ar: '',
      norm_ar: null,
      lemma_ar: null,
      pos: null,
      features: null,
    });
    this.syncContextSelections();
    this.onLessonEdited();
  }

  removeTokenById(tokenOccId: string) {
    const index = this.safeTokens.findIndex((token) => token.token_occ_id === tokenOccId);
    if (index < 0) return;
    this.safeTokens.splice(index, 1);
    this.removeGrammarTarget('token', tokenOccId);
    this.syncContextSelections();
    this.onLessonEdited();
  }

  async lookupTokensAndLemmas() {
    const verse = this.selectedVerse;
    if (!verse) {
      this.setSaveStatus('Select a verse first.', 'error');
      return;
    }

    const unitId = verse.unit_id || this.composeAyahUnitId(verse.surah, verse.ayah);
    const existingTokens = this.safeTokens.filter((token) => token.unit_id === unitId);
    if (existingTokens.length) {
      this.setSaveStatus('Replacing existing tokens for this verse…', 'info');
      const tokensToRemove = new Set(existingTokens.map((token) => token.token_occ_id));
      for (let index = this.safeTokens.length - 1; index >= 0; index -= 1) {
        if (tokensToRemove.has(this.safeTokens[index]?.token_occ_id)) {
          this.safeTokens.splice(index, 1);
        }
      }
      for (const tokenId of tokensToRemove) {
        this.removeGrammarTarget('token', tokenId);
      }
    }

    this.lookupTokensLoading = true;
    this.setSaveStatus('Looking up tokens + lemmas…', 'info');

    try {
      if (!this.containerForm.containerId) {
        this.containerForm.containerId = this.composeContainerId(verse.surah);
      }
      if (!verse.unit_id) {
        verse.unit_id = unitId;
      }
      if (!this.containerForm.unitId) {
        this.containerForm.unitId = unitId;
      }

      const response = await this.quranData.listLemmaLocations({
        surah: verse.surah,
        ayah: verse.ayah,
        pageSize: 500,
      });

      const rows = (response.results ?? []).filter((row) => Number.isFinite(row.token_index));
      if (!rows.length) {
        this.setSaveStatus('No lemma locations found for this verse.', 'error');
        return;
      }

      const sorted = [...rows].sort((a, b) => (a.token_index ?? 0) - (b.token_index ?? 0));
      const containerId = this.containerForm.containerId || this.composeContainerId(verse.surah);

      const { lemmas, tokens } = this.buildLookupTokensAndLemmas(sorted, verse, unitId, containerId);
      verse.lemmas = lemmas;

      this.safeTokens.push(...tokens);
      for (const token of tokens) {
        this.autoAssignTokenGrammarConcept(token);
      }
      this.syncContextSelections();
      this.onLessonEdited();
      this.setSaveStatus(`Loaded ${tokens.length} tokens for ${verse.surah}:${verse.ayah}.`, 'success');
    } catch (error: any) {
      console.error('token lookup error', error);
      this.setSaveStatus(error?.message ?? 'Failed to lookup tokens.', 'error');
    } finally {
      this.lookupTokensLoading = false;
    }
  }

  private buildLookupTokensAndLemmas(
    rows: Array<{
      lemma_id?: number | null;
      lemma_text?: string | null;
      lemma_text_clean?: string | null;
      words_count?: number | null;
      uniq_words_count?: number | null;
      word_location?: string | null;
      token_index?: number | null;
      ar_token_occ_id?: string | null;
      ar_u_token?: string | null;
      word_simple?: string | null;
      word_diacritic?: string | null;
    }>,
    verse: QuranLessonAyahUnit,
    unitId: string,
    containerId: string
  ) {
    const lemmas: QuranLessonLemmaLocation[] = [];
    const tokens: QuranLessonTokenV2[] = [];
    let tokenIndex = 1;

    for (const row of rows) {
      const segments = this.lookupSplitAffixes
        ? this.splitWordSegments(row.word_simple ?? '', row.word_diacritic ?? row.word_simple ?? '')
        : [
            {
              kind: 'stem' as const,
              simple: row.word_simple ?? this.stripArabicDiacritics(row.word_diacritic ?? ''),
              surface: row.word_diacritic ?? row.word_simple ?? '',
            },
          ];

      for (const segment of segments) {
        const isStem = segment.kind === 'stem';
        const { pos, features } = this.getSegmentPosAndFeatures(segment);
        const lemmaId = isStem && Number.isFinite(row.lemma_id) && (row.lemma_id ?? 0) > 0 ? row.lemma_id : 0;
        const lemmaText = isStem
          ? row.lemma_text ?? segment.simple
          : segment.simple;
        const lemmaClean = isStem
          ? row.lemma_text_clean ?? segment.simple
          : segment.simple;

        lemmas.push({
          lemma_id: lemmaId ?? 0,
          lemma_text: lemmaText ?? '',
          lemma_text_clean: lemmaClean ?? '',
          words_count: isStem ? row.words_count ?? null : null,
          uniq_words_count: isStem ? row.uniq_words_count ?? null : null,
          word_location: `${verse.surah}:${verse.ayah}:${tokenIndex}`,
          token_index: tokenIndex,
          ar_token_occ_id: isStem ? row.ar_token_occ_id ?? null : null,
          ar_u_token: isStem ? row.ar_u_token ?? null : null,
          word_simple: segment.simple || null,
          word_diacritic: segment.surface || null,
        });

        const token: QuranLessonTokenV2 = {
          token_occ_id: isStem && row.ar_token_occ_id ? row.ar_token_occ_id : crypto.randomUUID(),
          u_token_id: isStem ? row.ar_u_token ?? '' : '',
          u_root_id: null,
          container_id: containerId,
          unit_id: unitId,
          pos_index: tokenIndex,
          surface_ar: segment.surface ?? '',
          norm_ar: segment.simple ?? null,
          lemma_ar: lemmaText ?? segment.simple ?? null,
          pos,
          features,
        };

        const defaults = this.deriveTokenDefaults(token);
        if (!token.pos && defaults.pos) {
          token.pos = defaults.pos;
        }
        if (!token.features && defaults.features) {
          token.features = defaults.features;
        }

        tokens.push(token);

        tokenIndex += 1;
      }
    }

    return { lemmas, tokens };
  }

  private stripArabicDiacritics(text: string) {
    return String(text ?? '').normalize('NFKC').replace(this.arabicDiacriticsRe, '').trim();
  }

  private isArabicDiacritic(char: string) {
    return /[\u064B-\u065F\u0670\u06D6-\u06ED]/.test(char);
  }

  private deriveTokenDefaults(token: QuranLessonTokenV2) {
    const surface = token.surface_ar ?? '';
    const lemma = token.lemma_ar ?? '';
    const norm = token.norm_ar ?? this.stripArabicDiacritics(surface);
    const normalized = norm || this.stripArabicDiacritics(surface);

    const tanweenMap: Record<string, string> = {
      '\u064B': 'fathatan',
      '\u064C': 'dammatan',
      '\u064D': 'kasratan',
    };
    const tanweenStatusMap: Record<string, string> = {
      fathatan: 'منصوب',
      dammatan: 'مرفوع',
      kasratan: 'مجرور',
    };
    let tanween: string | null = null;
    for (const [mark, label] of Object.entries(tanweenMap)) {
      if (surface.includes(mark)) {
        tanween = label;
        break;
      }
    }

    const particleMap: Record<string, string> = {
      و: 'عطف',
      ف: 'عطف',
      س: 'استقبال',
      ب: 'جر',
      ك: 'جر',
      ل: 'جر',
      إلى: 'جر',
      على: 'جر',
      من: 'جر',
      في: 'جر',
      عن: 'جر',
      حتى: 'جر',
      إن: 'إنَّ',
      إِن: 'إنَّ',
      أن: 'أنْ',
      لن: 'نفي',
      لم: 'نفي',
      لا: 'نفي',
      ما: 'نفي',
      يا: 'نداء',
      قد: 'تحقيق',
    };

    const pronouns = new Set(['ي', 'ك', 'ه', 'ها', 'هم', 'هن', 'نا', 'كما', 'كم', 'كن', 'هما']);
    const features: Record<string, unknown> = {};
    let pos: string | null = token.pos ?? null;

    const particleType = particleMap[normalized] ?? particleMap[surface];
    if (particleType || pronouns.has(normalized)) {
      pos = pos ?? 'particle';
      if (particleType) {
        features['particle_type'] = particleType;
      }
      if (pronouns.has(normalized)) {
        features['particle_type'] = 'ضمير';
        features['pronoun'] = normalized;
      }
    }

    if (!pos) {
      if (normalized.startsWith('ال') || lemma.startsWith('ال')) {
        pos = 'noun';
        features['type'] = 'معرفة';
      }
      if (tanween) {
        pos = 'noun';
        features['status'] = tanweenStatusMap[tanween] ?? null;
        if (!features['type']) {
          features['type'] = 'نكرة';
        }
      }
    }

    return { pos, features: Object.keys(features).length ? features : null };
  }

  private getPosFeatureTemplate(pos: string) {
    switch (pos) {
      case 'verb':
        return { tense: null, mood: null };
      case 'noun':
        return { status: null, number: null, gender: null, type: null };
      case 'adj':
        return { status: null, number: null, gender: null, type: null };
      case 'particle':
        return { particle_type: null };
      case 'phrase':
        return { role: null };
      default:
        return {};
    }
  }

  private splitArabicSegments(text: string) {
    const raw = String(text ?? '');
    if (!raw) return [];
    const segments: string[] = [];
    let current = '';
    for (const char of raw) {
      if (this.isArabicDiacritic(char)) {
        current += char;
        continue;
      }
      if (current) segments.push(current);
      current = char;
    }
    if (current) segments.push(current);
    return segments;
  }

  private splitWordSegments(wordSimple: string, wordDiacritic: string) {
    const simple = wordSimple || this.stripArabicDiacritics(wordDiacritic);
    const surface = wordDiacritic || wordSimple || '';
    if (!simple || simple.length <= 1) {
      return [{ kind: 'stem' as const, simple, surface }];
    }

    const prefixLetters = new Set(['و', 'ف', 'ب', 'ك', 'ل', 'س']);
    const suffixes = ['كما', 'هما', 'كم', 'كن', 'هم', 'هن', 'ها', 'ه', 'ك', 'ي', 'نا'];

    const letters = Array.from(simple);
    let prefixCount = 0;
    while (letters.length - prefixCount > 1 && prefixLetters.has(letters[prefixCount])) {
      prefixCount += 1;
    }

    let suffixMatch = '';
    for (const suffix of suffixes) {
      if (simple.endsWith(suffix) && simple.length > suffix.length) {
        suffixMatch = suffix;
        break;
      }
    }
    const tanweenAtEnd = /[ًٌٍ][اى]?$/u.test(surface);
    if (suffixMatch === 'نا' && tanweenAtEnd) {
      suffixMatch = '';
    }
    let suffixCount = suffixMatch ? Array.from(suffixMatch).length : 0;
    const minStemLength = letters.length > 2 ? 2 : 1;
    if (suffixCount && letters.length - prefixCount - suffixCount < minStemLength) {
      suffixCount = Math.max(1, letters.length - prefixCount - minStemLength);
    }

    if (!prefixCount && !suffixCount) {
      return [{ kind: 'stem' as const, simple, surface }];
    }

    const baseSegments = this.splitArabicSegments(surface);
    const segments = baseSegments.length === letters.length ? baseSegments : letters;
    if (prefixCount + suffixCount >= segments.length) {
      if (prefixCount && suffixCount && prefixCount + suffixCount === segments.length) {
        const results: Array<{ kind: 'prefix' | 'stem' | 'suffix'; simple: string; surface: string }> = [];
        for (let i = 0; i < prefixCount; i += 1) {
          results.push({
            kind: 'prefix',
            simple: letters[i],
            surface: segments[i] ?? letters[i],
          });
        }
        const suffixSurface = segments.slice(segments.length - suffixCount).join('') || suffixMatch;
        results.push({
          kind: 'suffix',
          simple: suffixMatch || letters.slice(segments.length - suffixCount).join(''),
          surface: suffixMatch && suffixCount < Array.from(suffixMatch).length ? suffixMatch : suffixSurface,
        });
        return results;
      }
      return [{ kind: 'stem' as const, simple, surface }];
    }

    const results: Array<{ kind: 'prefix' | 'stem' | 'suffix'; simple: string; surface: string }> = [];

    for (let i = 0; i < prefixCount; i += 1) {
      results.push({
        kind: 'prefix',
        simple: letters[i],
        surface: segments[i] ?? letters[i],
      });
    }

    const stemStart = prefixCount;
    const stemEnd = segments.length - suffixCount;
    const stemSimple = letters.slice(stemStart, stemEnd).join('');
    const stemSurface = segments.slice(stemStart, stemEnd).join('');
    if (stemSimple) {
      results.push({
        kind: 'stem',
        simple: stemSimple,
        surface: stemSurface || stemSimple,
      });
    }

    if (suffixCount) {
      const suffixSurface = segments.slice(segments.length - suffixCount).join('') || suffixMatch;
      results.push({
        kind: 'suffix',
        simple: suffixMatch,
        surface: suffixMatch && suffixCount < Array.from(suffixMatch).length ? suffixMatch : suffixSurface,
      });
    }

    return results.length ? results : [{ kind: 'stem' as const, simple, surface }];
  }

  private getSegmentPosAndFeatures(segment: { kind: 'prefix' | 'stem' | 'suffix'; simple: string }) {
    if (segment.kind === 'stem') {
      return { pos: null, features: null };
    }

    const simple = segment.simple;
    const features: Record<string, unknown> = {};

    if (segment.kind === 'prefix') {
      const particleType =
        simple === 'و'
          ? 'عطف'
          : simple === 'ف'
            ? 'عطف'
            : simple === 'س'
              ? 'استقبال'
              : simple === 'ب' || simple === 'ك' || simple === 'ل'
                ? 'جر'
                : null;
      if (particleType) {
        features['particle_type'] = particleType;
      }
      return { pos: 'particle', features: Object.keys(features).length ? features : null };
    }

    if (segment.kind === 'suffix') {
      features['particle_type'] = 'ضمير';
      return { pos: 'particle', features };
    }

    return { pos: null, features: null };
  }

  addSentenceForSelectedVerse() {
    const unitId = this.selectedVerse?.unit_id ?? '';
    const order = this.selectedVerseSentences.length + 1;
    const sentenceId = crypto.randomUUID();

    this.safeSentences.push({
      sentence_id: sentenceId,
      unit_id: unitId,
      sentence_order: order,
      text: {
        arabic: '',
        translation: null,
      },
      arabic: '',
      translation: null,
      roots: [],
    });

    this.selectedSentenceIdForTree = sentenceId;
    this.ensureTree(sentenceId);
    this.syncContextSelections();
    this.onLessonEdited();
  }

  removeSentenceById(sentenceId: string) {
    const index = this.safeSentences.findIndex((sentence) => sentence.sentence_id === sentenceId);
    if (index < 0) return;
    this.safeSentences.splice(index, 1);
    delete this.sentenceTrees[sentenceId];
    this.removeGrammarTarget('sentence', sentenceId);
    this.syncContextSelections();
    this.onLessonEdited();
  }

  addSpanForSelectedVerse() {
    const spanId = crypto.randomUUID();
    this.safeSpans.push({
      span_occ_id: spanId,
      u_span_id: '',
      container_id: this.containerForm.containerId || '',
      unit_id: this.selectedVerse?.unit_id ?? null,
      start_index: 0,
      end_index: 0,
      text_cache: '',
      span_type: 'phrase',
      span_kind: null,
      token_ids: [],
      meta: null,
    });
    this.syncContextSelections();
    this.onLessonEdited();
  }

  removeSpanById(spanOccId: string) {
    const index = this.safeSpans.findIndex((span) => span.span_occ_id === spanOccId);
    if (index < 0) return;
    this.safeSpans.splice(index, 1);
    this.removeGrammarTarget('span', spanOccId);
    this.syncContextSelections();
    this.onLessonEdited();
  }

  onSpanTokenIdsInput(span: QuranLessonSpanV2, value: string) {
    span.token_ids = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    this.onLessonEdited();
  }

  onTokenFeaturesInput(event: { token: QuranLessonTokenV2; value: string }) {
    const trimmed = event.value.trim();
    if (!trimmed) {
      event.token.features = null;
      this.onLessonEdited();
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      event.token.features = parsed && typeof parsed === 'object' ? parsed : null;
      this.onLessonEdited();
    } catch {
      // Keep previous valid value.
    }
  }

  autoBuildTokenFeatures(token: QuranLessonTokenV2) {
    if (!token) return;
    const defaults = this.deriveTokenDefaults(token);
    if (!token.pos && defaults.pos) {
      token.pos = defaults.pos;
    }
    const existing = this.asRecord(token.features ?? null);
    const existingKeys = existing ? Object.keys(existing) : [];
    if (!existingKeys.length) {
      if (defaults.features) {
        token.features = defaults.features;
      } else if (token.pos) {
        token.features = this.getPosFeatureTemplate(token.pos);
      }
    } else if (defaults.features && existing) {
      token.features = { ...defaults.features, ...existing };
    }
    this.autoAssignTokenGrammarConcept(token);
    this.onLessonEdited();
  }

  private autoAssignTokenGrammarConcept(token: QuranLessonTokenV2) {
    const tokenId = token.token_occ_id;
    if (!tokenId) return;

    const concept = this.mapPosToGrammarConcept(token.pos);
    const map = this.grammarLinks.token;
    const existing = map[tokenId] ?? [];
    const coreConcepts = new Set([
      ...this.grammarConcepts,
      ...Object.keys(this.grammarConceptLegacyMap),
    ]);

    if (!concept) {
      const trimmed = existing.filter((item) => !coreConcepts.has(item));
      if (trimmed.length) {
        map[tokenId] = trimmed;
      } else {
        delete map[tokenId];
      }
      return;
    }

    const normalizedExisting = existing.map((item) => this.normalizeGrammarConcept(item));
    const cleaned = normalizedExisting.filter((item) => !coreConcepts.has(item) || item === concept);
    if (!cleaned.includes(concept)) {
      cleaned.push(concept);
    }
    map[tokenId] = cleaned;
  }

  private mapPosToGrammarConcept(pos: string | null | undefined) {
    if (!pos) return null;
    if (pos === 'verb') return 'فعل';
    if (pos === 'particle') return 'حرف';
    if (pos === 'noun' || pos === 'adj') return 'اسم';
    return null;
  }

  private normalizeGrammarConcept(concept: string) {
    return this.grammarConceptLegacyMap[concept] ?? concept;
  }

  onGrammarTargetChange(targetType: GrammarTargetType, targetId: string) {
    this.selectedGrammarTargetId[targetType] = targetId;
  }

  addGrammarLink(targetType: GrammarTargetType, event: { targetId: string; concept: string }) {
    const targetId = event.targetId.trim();
    const concept = event.concept.trim();
    if (!targetId || !concept) return;

    const map = this.grammarLinks[targetType];
    const list = map[targetId] ?? [];
    if (!list.includes(concept)) {
      map[targetId] = [...list, concept];
      this.onLessonEdited();
    }
  }

  removeGrammarLink(targetType: GrammarTargetType, event: { targetId: string; concept: string }) {
    const targetId = event.targetId.trim();
    const concept = event.concept.trim();
    if (!targetId || !concept) return;

    const map = this.grammarLinks[targetType];
    const list = map[targetId] ?? [];
    map[targetId] = list.filter((item) => item !== concept);
    if (!map[targetId].length) {
      delete map[targetId];
    }
    this.onLessonEdited();
  }

  selectGrammarFocus(targetType: GrammarTargetType) {
    this.grammarFocusType = targetType;
  }

  selectTreeSentence(sentenceId: string) {
    this.selectedSentenceIdForTree = sentenceId;
    this.ensureTree(sentenceId);
  }

  addTreeNode() {
    if (!this.selectedSentenceIdForTree) return;
    const tree = this.ensureTree(this.selectedSentenceIdForTree);
    const index = tree.nodes.length + 1;
    tree.nodes.push({
      id: `N${index}`,
      label: `Node ${index}`,
      type: 'clause',
      tokenRange: '',
    });
    this.onLessonEdited();
  }

  removeTreeNode(nodeId: string) {
    if (!this.selectedSentenceIdForTree) return;
    const tree = this.ensureTree(this.selectedSentenceIdForTree);
    tree.nodes = tree.nodes.filter((node) => node.id !== nodeId);
    tree.edges = tree.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
    this.onLessonEdited();
  }

  addTreeEdge() {
    if (!this.selectedSentenceIdForTree) return;
    const tree = this.ensureTree(this.selectedSentenceIdForTree);
    tree.edges.push({ from: '', to: '', label: '' });
    this.onLessonEdited();
  }

  removeTreeEdge(index: number) {
    if (!this.selectedSentenceIdForTree) return;
    const tree = this.ensureTree(this.selectedSentenceIdForTree);
    if (index < 0 || index >= tree.edges.length) return;
    tree.edges.splice(index, 1);
    this.onLessonEdited();
  }

  onTreeChanged() {
    this.onLessonEdited();
  }

  addMcqQuestion() {
    this.safeMcqQuestions.push({
      mcq_id: crypto.randomUUID(),
      question: '',
      options: [
        { option: '', is_correct: false },
        { option: '', is_correct: false },
      ],
    });
    this.onLessonEdited();
  }

  removeMcqQuestion(index: number) {
    this.safeMcqQuestions.splice(index, 1);
    this.onLessonEdited();
  }

  addMcqOption(question: QuranLessonMcq) {
    question.options.push({ option: '', is_correct: false });
    this.onLessonEdited();
  }

  removeMcqOption(payload: { question: QuranLessonMcq; index: number }) {
    payload.question.options.splice(payload.index, 1);
    this.onLessonEdited();
  }

  addReflectiveQuestion() {
    this.reflectiveQuestions.push(this.buildBlankQuestion());
    this.onLessonEdited();
  }

  removeReflectiveQuestion(index: number) {
    this.reflectiveQuestions.splice(index, 1);
    this.onLessonEdited();
  }

  addAnalyticalQuestion() {
    this.analyticalQuestions.push(this.buildBlankQuestion());
    this.onLessonEdited();
  }

  removeAnalyticalQuestion(index: number) {
    this.analyticalQuestions.splice(index, 1);
    this.onLessonEdited();
  }

  createContainer() {
    const payload = {
      title:
        this.containerForm.title ||
        `Surah ${this.containerForm.surah} (${this.containerForm.ayahFrom}-${this.containerForm.ayahTo})`,
      surah: Math.max(1, this.containerForm.surah),
      ayah_from: Math.max(1, this.containerForm.ayahFrom),
      ayah_to: Math.max(this.containerForm.ayahTo, this.containerForm.ayahFrom),
      container_id: this.containerForm.containerId || this.proposedContainerId,
    };

    this.service.createContainer(payload).subscribe({
      next: (res) => {
        if (res.ok) {
          this.occurrenceFeedback = 'Container + units created';
          this.containerForm.containerId = res.result?.container?.id || payload.container_id;
          const passage = (res.result?.units ?? []).find(
            (unit: { unit_type?: string; id?: string }) => unit.unit_type === 'passage'
          );
          this.containerForm.unitId = passage?.id ?? this.proposedPassageUnitId;
          this.onLessonEdited();
        }
      },
      error: () => {
        this.occurrenceFeedback = 'Failed to create container';
      },
    });
  }

  linkLessonContainer() {
    if (!this.lesson) return;
    this.lesson.reference = this.lesson.reference ?? {};
    this.onLessonEdited();
  }

  submitOccurrence() {
    if (!this.lesson || !this.containerForm.containerId || !this.containerForm.unitId) {
      this.occurrenceFeedback = 'Complete container + passage unit first.';
      return;
    }

    const tokens = this.sentenceForm.tokens
      .split(',')
      .map((text) => text.trim())
      .filter(Boolean)
      .map((tokenText, index) => {
        const [surface, lexiconId] = tokenText.split('|').map((part) => part.trim());
        return {
          surface,
          lexicon_id: lexiconId || undefined,
          pos_index: index,
        };
      });

    const spans = this.sentenceForm.spans
      .split(';')
      .map((text) => text.trim())
      .filter(Boolean)
      .map((entry) => {
        const [spanText, range] = entry.split('|');
        const [start = '0', end = '0'] = (range ?? '').split('-');
        return {
          text: spanText?.trim() ?? '',
          start_index: Number(start) || 0,
          end_index: Number(end) || 0,
          token_u_ids: [],
        };
      });

    const payload = {
      lesson_id: Number(this.lesson.id) || 0,
      container_id: this.containerForm.containerId,
      unit_id: this.containerForm.unitId,
      sentence: {
        text: this.sentenceForm.text,
        translation: this.sentenceForm.translation || null,
        tokens,
        spans,
        grammar_ids: this.sentenceForm.grammarIds
          .split(',')
          .map((grammarId) => grammarId.trim())
          .filter(Boolean),
      },
    };

    this.service.addOccurrences(this.lesson.id, payload).subscribe({
      next: () => {
        this.occurrenceFeedback = 'Occurrence saved';
      },
      error: () => {
        this.occurrenceFeedback = 'Failed to save occurrence';
      },
    });
  }

  private async saveCurrentStep(tabId: BuilderTabId): Promise<{
    message: string;
    tone: SaveStatusTone;
  }> {
    const draftStep = DRAFT_COMMIT_STEP_BY_TAB[tabId];
    if (draftStep) {
      const eligibility = this.getDraftStepEligibility(draftStep);
      if (!eligibility.ok) {
        return {
          message: `Saved locally. ${eligibility.reason}`,
          tone: 'success',
        };
      }

      if (!this.draftId || this.draftVersion == null) {
        return {
          message: 'Saved locally. Draft is not initialized.',
          tone: 'error',
        };
      }

      try {
        this.setSaveStatus(`Saving '${draftStep}' draft step to backend...`, 'info');
        const response = await firstValueFrom(
          this.service.commitDraft(this.draftId, {
            step: draftStep,
            draft_version: this.draftVersion,
          })
        );

        if (response.lesson_id && this.isNewLesson) {
          this.finishLessonCreation(response.lesson_id);
        }

        const tableCount = Object.keys(response.result_counts ?? {}).length;
        return {
          message: tableCount
            ? `Saved successfully. '${draftStep}' committed (${tableCount} table updates).`
            : `Saved successfully. '${draftStep}' committed.`,
          tone: 'success',
        };
      } catch (error: unknown) {
        return {
          message: `Saved locally. ${this.readCommitError(error)}`,
          tone: 'error',
        };
      }
    }

    const legacyStep = LEGACY_COMMIT_STEP_BY_TAB[tabId];
    if (!legacyStep) {
      return {
        message: 'Saved locally. This tab does not commit server rows.',
        tone: 'success',
      };
    }

    const lessonId = this.getLessonId();
    if (!lessonId) {
      return {
        message: 'Saved locally. Create lesson row first.',
        tone: 'success',
      };
    }

    const eligibility = this.getStepSaveEligibility(legacyStep);
    if (!eligibility.ok) {
      return {
        message: `Saved locally. ${eligibility.reason}`,
        tone: 'success',
      };
    }

    let response:
      | { ok: boolean; result: { container_id?: string | null; unit_id?: string | null; counts?: Record<string, number> } }
      | null = null;

    try {
      this.setSaveStatus(`Saving '${legacyStep}' step to backend via API...`, 'info');
      const commitPayload = this.buildCommitPayload(legacyStep);
      response = await firstValueFrom(this.service.commitStep(lessonId, commitPayload));
    } catch (error: unknown) {
      return {
        message: `Saved locally. ${this.readCommitError(error)}`,
        tone: 'error',
      };
    }

    if (!response?.ok) {
      return {
        message: 'Saved locally. Server step commit failed.',
        tone: 'error',
      };
    }

    if (response.result?.container_id) {
      this.containerForm.containerId = response.result.container_id;
    }
    if (response.result?.unit_id) {
      this.containerForm.unitId = response.result.unit_id;
    }

    const tableCount = Object.keys(response.result?.counts ?? {}).length;
    return {
      message: tableCount
        ? `Saved successfully. '${legacyStep}' committed (${tableCount} table updates).`
        : `Saved successfully. '${legacyStep}' committed.`,
      tone: 'success',
    };
  }

  private readCommitError(error: unknown) {
    const typed = error as {
      error?: unknown;
      message?: string;
      status?: number;
      statusText?: string;
    };
    const body = this.asRecord(typed?.error);
    const bodyMessage = body && typeof body['error'] === 'string' ? body['error'] : null;
    if (bodyMessage) return bodyMessage;
    if (typed?.message) return typed.message;
    if (typed?.status && typed?.statusText) return `HTTP ${typed.status}: ${typed.statusText}`;
    return 'Server step commit failed.';
  }

  private getDraftStepEligibility(step: DraftCommitStep) {
    if (!this.lesson) {
      return { ok: false, reason: 'Lesson is not initialized.' };
    }

    switch (step) {
      case 'meta':
        return this.lesson.title.trim()
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Meta step requires title.' };
      case 'units': {
        const containerId = this.getCommitContainerId();
        if (!containerId) return { ok: false, reason: 'Units step requires container id.' };
        const hasUnits = this.safeUnits.length > 0;
        if (!hasUnits) return { ok: false, reason: 'Add at least one unit first.' };
        const invalidAyahUnit = this.safeUnits.find(
          (unit) =>
            unit.unit_type === 'ayah' &&
            (unit.ayah_from == null || unit.ayah_to == null)
        );
        if (invalidAyahUnit) {
          return { ok: false, reason: `Ayah unit '${invalidAyahUnit.id ?? 'unknown'}' is missing ayah range.` };
        }
        return { ok: true, reason: '' };
      }
      case 'sentences': {
        const containerId = this.getCommitContainerId();
        if (!containerId) return { ok: false, reason: 'Sentences step requires container id.' };
        return this.safeSentences.length
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one sentence first.' };
      }
      case 'comprehension': {
        const hasContent =
          this.safeMcqQuestions.length > 0 ||
          this.reflectiveQuestions.length > 0 ||
          this.analyticalQuestions.length > 0;
        return hasContent
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one comprehension item first.' };
      }
      case 'notes': {
        const lessonAny = this.lesson as unknown as Record<string, unknown>;
        const notesValue = lessonAny['notes'] ?? this.lesson._notes ?? [];
        const hasNotes = Array.isArray(notesValue) ? notesValue.length > 0 : !!notesValue;
        return hasNotes
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one note first.' };
      }
    }
  }

  private getStepSaveEligibility(step: QuranLessonCommitStep) {
    if (!this.lesson) {
      return { ok: false, reason: 'Lesson is not initialized.' };
    }

    const containerId = this.getCommitContainerId();

    switch (step) {
      case 'meta':
        return this.lesson.title.trim()
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Meta step requires title.' };
      case 'container': {
        const containerKey = this.getCommitContainerKey();
        return containerKey
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Container step requires container key.' };
      }
      case 'units': {
        if (!containerId) return { ok: false, reason: 'Units step requires container id.' };
        const hasUnits = this.safeUnits.length > 0;
        if (!hasUnits) return { ok: false, reason: 'Add at least one unit first.' };
        const invalidAyahUnit = this.safeUnits.find(
          (unit) =>
            unit.unit_type === 'ayah' &&
            (unit.ayah_from == null || unit.ayah_to == null)
        );
        if (invalidAyahUnit) {
          return { ok: false, reason: `Ayah unit '${invalidAyahUnit.id ?? 'unknown'}' is missing ayah range.` };
        }
        return { ok: true, reason: '' };
      }
      case 'tokens':
        if (!containerId) return { ok: false, reason: 'Tokens step requires container id.' };
        return this.safeTokens.length
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one token first.' };
      case 'spans':
        if (!containerId) return { ok: false, reason: 'Spans step requires container id.' };
        return this.safeSpans.length
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one span first.' };
      case 'grammar': {
        if (!containerId) return { ok: false, reason: 'Grammar step requires container id.' };
        const linkCount =
          Object.keys(this.grammarLinks.token).length +
          Object.keys(this.grammarLinks.span).length +
          Object.keys(this.grammarLinks.sentence).length;
        return linkCount
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one grammar link first.' };
      }
      case 'sentences':
        if (!containerId) return { ok: false, reason: 'Sentences step requires container id.' };
        return this.safeSentences.length
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one sentence first.' };
      case 'lemmas':
        return this.safeArabicVerses.some((verse) => (verse.lemmas ?? []).length > 0)
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'Add at least one lemma location first.' };
      case 'expressions':
      case 'links':
        return { ok: false, reason: 'This step is not wired to UI yet.' };
    }
  }

  private buildCommitPayload(step: QuranLessonCommitStep): QuranLessonCommitRequest {
    const containerId = this.getCommitContainerId();
    const unitId = this.getCommitUnitId();

    switch (step) {
      case 'meta':
        return {
          step,
          payload: {
            title: this.lesson?.title ?? '',
            title_ar: this.lesson?.title_ar ?? null,
            lesson_type: this.lesson?.lesson_type ?? 'quran',
            subtype: this.lesson?.subtype ?? null,
            source: this.lesson?.source ?? null,
            status: this.lesson?.status ?? 'draft',
            difficulty: this.lesson?.difficulty ?? null,
            lesson_json: this.lesson ?? {},
          },
        };
      case 'container':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            container: {
              id: containerId,
              container_type: 'quran',
              container_key: this.getCommitContainerKey(),
              title:
                this.containerForm.title.trim() ||
                `Surah ${this.verseSelection.surah} (${this.verseSelection.ayahFrom}-${this.verseSelection.ayahTo})`,
              meta_json: {
                source: 'lesson-builder',
                lesson_id: this.lesson?.id ?? null,
              },
            },
          },
        };
      case 'units':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            units: this.safeUnits.map((unit) => ({
              id: unit.id ?? null,
              unit_type: unit.unit_type ?? null,
              order_index: unit.order_index ?? 0,
              ayah_from: unit.ayah_from ?? null,
              ayah_to: unit.ayah_to ?? null,
              start_ref: unit.start_ref ?? null,
              end_ref: unit.end_ref ?? null,
              text_cache: unit.text_cache ?? null,
              meta_json: unit.meta_json ?? null,
            })),
          },
        };
      case 'tokens':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            roots: this.buildTokenRootPayload(),
            u_tokens: this.buildUniversalTokenPayload(),
            occ_tokens: this.safeTokens.map((token) => ({
              ar_token_occ_id: token.token_occ_id,
              container_id: token.container_id || containerId || '',
              unit_id: token.unit_id ?? unitId ?? null,
              pos_index: token.pos_index,
              surface_ar: token.surface_ar,
              norm_ar: token.norm_ar ?? null,
              lemma_ar: token.lemma_ar ?? null,
              pos: token.pos ?? 'noun',
              ar_u_token: token.u_token_id || null,
              ar_u_root: token.u_root_id ?? null,
              features_json: token.features ?? null,
            })),
            lemmas: this.buildLemmaCommitPayload(),
          },
        };
      case 'spans':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            u_spans: this.safeSpans.map((span) => ({
              ar_u_span: span.u_span_id || null,
              span_type: span.span_type ?? 'phrase',
              token_u_ids: span.token_ids,
              meta_json: span.meta ?? null,
            })),
            occ_spans: this.safeSpans.map((span) => ({
              ar_span_occ_id: span.span_occ_id,
              container_id: span.container_id || containerId || '',
              unit_id: span.unit_id ?? unitId ?? null,
              start_index: span.start_index,
              end_index: span.end_index,
              text_cache: span.text_cache ?? null,
              ar_u_span: span.u_span_id || null,
              token_u_ids: span.token_ids,
              span_type: span.span_type ?? 'phrase',
              meta_json: span.meta ?? null,
            })),
          },
        };
      case 'grammar':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            u_grammar: this.buildGrammarUniversalPayload(),
            occ_grammar: this.buildGrammarOccurrencePayload(containerId, unitId),
          },
        };
      case 'sentences':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {
            u_sentences: this.safeSentences.map((sentence) => ({
              ar_u_sentence: null,
              sentence_kind: 'nominal',
              sequence: [],
              text_ar: sentence.arabic ?? sentence.text.arabic ?? '',
              meta_json: null,
            })),
            occ_sentences: this.safeSentences.map((sentence) => ({
              ar_sentence_occ_id: sentence.sentence_id,
              container_id: containerId,
              unit_id: sentence.unit_id ?? unitId ?? null,
              sentence_order: sentence.sentence_order ?? 1,
              text_ar: sentence.arabic ?? sentence.text.arabic ?? '',
              translation: sentence.translation ?? sentence.text.translation ?? null,
              notes: sentence.notes ?? null,
              ar_u_sentence: null,
              sentence_kind: 'nominal',
              sequence: [],
            })),
          },
        };
      case 'lemmas':
        return {
          step,
          payload: {
            lemmas: this.buildLemmaCommitPayload(),
          },
        };
      case 'expressions':
      case 'links':
        return {
          step,
          container_id: containerId,
          unit_id: unitId,
          payload: {},
        };
    }
  }

  private buildTokenRootPayload() {
    const seen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    for (const token of this.safeTokens) {
      if (!token.u_root_id) continue;
      if (seen.has(token.u_root_id)) continue;
      seen.add(token.u_root_id);
      rows.push({
        ar_u_root: token.u_root_id,
        root: token.u_root_id,
        root_norm: token.u_root_id,
        status: 'active',
      });
    }
    return rows;
  }

  private buildUniversalTokenPayload() {
    const seen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    for (const token of this.safeTokens) {
      const key = token.u_token_id || `${token.lemma_ar ?? token.surface_ar}|${token.pos ?? 'noun'}|${token.u_root_id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        ar_u_token: token.u_token_id || null,
        lemma_ar: token.lemma_ar ?? token.surface_ar,
        lemma_norm: token.norm_ar ?? token.lemma_ar ?? token.surface_ar,
        pos: token.pos ?? 'noun',
        ar_u_root: token.u_root_id ?? null,
        root_norm: token.u_root_id ?? null,
        features_json: token.features ?? null,
      });
    }
    return rows;
  }

  private buildLemmaCommitPayload() {
    const rows: Array<Record<string, unknown>> = [];
    for (const verse of this.safeArabicVerses) {
      const lemmas = Array.isArray(verse.lemmas) ? verse.lemmas : [];
      for (const lemma of lemmas) {
        const lemmaId = Number.isFinite(lemma.lemma_id) && lemma.lemma_id > 0 ? lemma.lemma_id : 0;
        rows.push({
          lemma_id: lemmaId,
          lemma_text: lemma.lemma_text,
          lemma_text_clean: lemma.lemma_text_clean,
          words_count: lemma.words_count ?? null,
          uniq_words_count: lemma.uniq_words_count ?? null,
          primary_ar_u_token: lemma.ar_u_token ?? null,
          locations: [
            {
              word_location: lemma.word_location,
              surah: verse.surah,
              ayah: verse.ayah,
              token_index: lemma.token_index,
              ar_token_occ_id: lemma.ar_token_occ_id ?? null,
              ar_u_token: lemma.ar_u_token ?? null,
              word_simple: lemma.word_simple ?? null,
              word_diacritic: lemma.word_diacritic ?? null,
            },
          ],
        });
      }
    }
    return rows;
  }

  private buildGrammarUniversalPayload() {
    const concepts = new Set<string>();
    for (const map of [this.grammarLinks.token, this.grammarLinks.span, this.grammarLinks.sentence]) {
      for (const list of Object.values(map)) {
        for (const concept of list) {
          const normalized = concept.trim();
          if (normalized) concepts.add(normalized);
        }
      }
    }
    return Array.from(concepts).map((concept) => ({
      grammar_id: concept,
      category: 'builder',
      title: concept,
      title_ar: null,
      definition: null,
      definition_ar: null,
      meta_json: { source: 'builder' },
    }));
  }

  private buildGrammarOccurrencePayload(containerId: string | null, unitId: string | null) {
    const rows: Array<Record<string, unknown>> = [];
    const pushRows = (
      targetType: 'token_occ' | 'span_occ' | 'sentence_occ',
      map: Record<string, string[]>
    ) => {
      for (const [targetId, concepts] of Object.entries(map)) {
        for (const concept of concepts) {
          rows.push({
            id: `${targetType}|${targetId}|${concept}`,
            container_id: containerId,
            unit_id: unitId,
            target_type: targetType,
            target_id: targetId,
            grammar_id: concept,
            note: null,
            meta_json: { source: 'builder' },
          });
        }
      }
    };
    pushRows('token_occ', this.grammarLinks.token);
    pushRows('span_occ', this.grammarLinks.span);
    pushRows('sentence_occ', this.grammarLinks.sentence);
    return rows;
  }

  private getCommitContainerId() {
    return this.containerForm.containerId || this.proposedContainerId;
  }

  private getCommitContainerKey() {
    return `quran-${this.verseSelection.surah}`;
  }

  private getCommitUnitId() {
    return this.containerForm.unitId || this.selectedVerse?.unit_id || null;
  }

  private getLessonId() {
    const raw = this.lesson?.id ?? '';
    const parsed = Number.parseInt(String(raw), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private getDraftKey(lessonKey?: string) {
    const key = lessonKey ?? (this.isNewLesson ? 'new' : String(this.lesson?.id ?? 'new'));
    return `${DRAFT_KEY_PREFIX}:${key}`;
  }

  private getDraftIdKey(lessonKey?: string) {
    const key = lessonKey ?? (this.isNewLesson ? 'new' : String(this.lesson?.id ?? 'new'));
    return `${DRAFT_ID_KEY_PREFIX}:${key}`;
  }

  private setSaveStatus(message: string, tone: SaveStatusTone) {
    this.saveStatusMessage = message;
    this.saveStatusTone = tone;
  }

  private saveDraftLocal() {
    const storage = globalThis.localStorage;
    if (!storage || !this.lesson) return;

    const snapshot: LocalDraftSnapshot = {
      savedAt: new Date().toISOString(),
      activeTabId: this.activeTabId,
      lesson: this.lesson,
      verseSelection: this.verseSelection,
      containerForm: this.containerForm,
      sentenceForm: this.sentenceForm,
      draftId: this.draftId,
      draftVersion: this.draftVersion,
    };
    storage.setItem(this.getDraftKey(), JSON.stringify(snapshot));
  }

  private restoreDraft(lessonKey: string) {
    const storage = globalThis.localStorage;
    if (!storage) return false;

    const raw = storage.getItem(this.getDraftKey(lessonKey));
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as LocalDraftSnapshot;
      if (!parsed || !parsed.lesson) return false;
      this.lesson = parsed.lesson;
      this.activeTabId = parsed.activeTabId ?? this.activeTabId;
      this.verseSelection = parsed.verseSelection ?? this.verseSelection;
      this.containerForm = parsed.containerForm ?? this.containerForm;
      this.sentenceForm = parsed.sentenceForm ?? this.sentenceForm;
      this.draftId = parsed.draftId ?? this.draftId;
      this.draftVersion = parsed.draftVersion ?? this.draftVersion;
      return true;
    } catch {
      return false;
    }
  }

  private clearDraftForLesson(lessonKey: string) {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.removeItem(this.getDraftKey(lessonKey));
    storage.removeItem(this.getDraftIdKey(lessonKey));
  }

  private async loadLesson(id: number) {
    try {
      const lesson = await firstValueFrom(this.service.getLesson(id));
      this.isNewLesson = false;
      this.lesson = lesson;
      this.restoreDraft(String(id));
      this.ensureDefaults();
      await this.initializeDraftForLesson();
      this.onLessonEdited();
    } catch (error: unknown) {
      this.occurrenceFeedback = `Failed to load lesson: ${this.readCommitError(error)}`;
    }
  }

  private async initializeNewLesson() {
    this.isNewLesson = true;
    this.lesson = this.buildBlankLesson();
    this.restoreDraft('new');
    this.ensureDefaults();
    await this.initializeDraftForLesson();
    this.onLessonEdited();
  }

  private ensureDefaults() {
    if (!this.lesson) return;
    this.lesson.lesson_type = 'quran';
    this.lesson.status = this.lesson.status || 'draft';
    this.lesson.source = this.lesson.source == null ? '' : String(this.lesson.source);
    this.lesson.reference = this.lesson.reference ?? {};
    this.lesson.comprehension = this.lesson.comprehension ?? {};
    this.lesson.text = this.lesson.text ?? { arabic_full: [], mode: 'original' };
    this.lesson.text.arabic_full = Array.isArray(this.lesson.text.arabic_full)
      ? this.lesson.text.arabic_full
      : [];
    this.lesson.sentences = Array.isArray(this.lesson.sentences) ? this.lesson.sentences : [];
    this.lesson.units = Array.isArray(this.lesson.units) ? this.lesson.units : [];

    for (const verse of this.lesson.text.arabic_full) {
      verse.unit_id = verse.unit_id || this.composeAyahUnitId(verse.surah, verse.ayah);
      verse.lemmas = Array.isArray(verse.lemmas) ? verse.lemmas : [];
    }

    this.ensureAnalysis();
    this.ensureComprehension();
    this.syncMetaJsonInputs();
    this.loadBuilderExtrasFromLesson();
    this.syncSelectionFromLesson();
    this.syncContextSelections();
  }

  private async initializeDraftForLesson() {
    if (!this.lesson) return;

    const lessonKey = this.isNewLesson ? 'new' : String(this.lesson.id ?? 'new');
    const storage = globalThis.localStorage;
    const storedDraftId = storage?.getItem(this.getDraftIdKey(lessonKey)) ?? null;

    if (storedDraftId) {
      try {
        const draft = await firstValueFrom(this.service.getDraft(storedDraftId));
        this.applyDraftState(draft.draft_id, draft.draft_version, draft.status ?? null);
        if (draft.draft_json) {
          this.applyDraftJson(draft.draft_json);
        }
        return;
      } catch {
        storage?.removeItem(this.getDraftIdKey(lessonKey));
      }
    }

    const payload = {
      lesson_id: this.isNewLesson ? null : this.getLessonId(),
      subtype: this.lesson.subtype ?? null,
      source: this.lesson.source ?? null,
      initial_reference: this.buildDraftReference(),
      active_step: this.activeTabId,
    };

    const created = await firstValueFrom(this.service.createDraft(payload));
    this.applyDraftState(created.draft_id, created.draft_version, created.status ?? null);
    storage?.setItem(this.getDraftIdKey(lessonKey), created.draft_id);

    if (created.draft_json && this.isNewLesson) {
      this.applyDraftJson(created.draft_json);
    } else {
      await this.persistDraftToServer();
    }
  }

  private applyDraftState(draftId: string, draftVersion: number, status: string | null) {
    this.draftId = draftId;
    this.draftVersion = draftVersion;
    this.draftStatus = status;
  }

  private buildDraftReference() {
    const reference = this.safeReference ?? {};
    return {
      container_id: this.containerForm.containerId || this.proposedContainerId,
      unit_id: this.containerForm.unitId || this.proposedPassageUnitId,
      surah: reference.surah ?? this.verseSelection.surah,
      ayah_from: reference.ayah_from ?? this.verseSelection.ayahFrom,
      ayah_to: reference.ayah_to ?? this.verseSelection.ayahTo,
      ref_label: reference.ref_label ?? null,
    };
  }

  private buildDraftJson() {
    if (!this.lesson) return {};
    const lessonAny = this.lesson as unknown as Record<string, unknown>;
    const notesValue = lessonAny['notes'] ?? this.lesson._notes ?? [];

    return {
      schema_version: 1,
      meta: {
        title: this.lesson.title ?? '',
        title_ar: this.lesson.title_ar ?? null,
        lesson_type: this.lesson.lesson_type ?? 'quran',
        subtype: this.lesson.subtype ?? null,
        difficulty: this.lesson.difficulty ?? null,
        source: this.lesson.source ?? null,
      },
      reference: this.buildDraftReference(),
      units: this.safeUnits,
      sentences: this.safeSentences,
      comprehension: this.lesson.comprehension ?? {},
      notes: notesValue ?? [],
      text: this.lesson.text ?? null,
      analysis: this.lesson.analysis ?? null,
      builder_extras: lessonAny['builder_extras'] ?? null,
    };
  }

  private applyDraftJson(draftJson: Record<string, unknown>) {
    if (!this.lesson) return;

    const meta = this.asRecord(draftJson['meta']) ?? {};
    const reference = this.asRecord(draftJson['reference']) ?? {};
    const lessonAny = this.lesson as unknown as Record<string, unknown>;

    this.lesson.title = String(meta['title'] ?? this.lesson.title ?? '');
    this.lesson.title_ar = (meta['title_ar'] as string | null) ?? this.lesson.title_ar ?? '';
    this.lesson.lesson_type = 'quran';
    this.lesson.subtype = (meta['subtype'] as string) ?? this.lesson.subtype ?? '';
    this.lesson.difficulty = (meta['difficulty'] as number | null) ?? this.lesson.difficulty ?? 1;
    this.lesson.source = (meta['source'] as string | null) ?? this.lesson.source ?? '';

    this.lesson.reference = { ...this.lesson.reference, ...reference };
    if (Array.isArray(draftJson['units'])) {
      this.lesson.units = draftJson['units'] as QuranLessonUnit[];
    }
    if (Array.isArray(draftJson['sentences'])) {
      this.lesson.sentences = draftJson['sentences'] as QuranLesson['sentences'];
    }
    if (draftJson['comprehension'] && typeof draftJson['comprehension'] === 'object') {
      this.lesson.comprehension = draftJson['comprehension'] as QuranLesson['comprehension'];
    }
    if (draftJson['notes'] !== undefined) {
      lessonAny['notes'] = draftJson['notes'];
    }
    if (draftJson['text']) {
      this.lesson.text = draftJson['text'] as QuranLesson['text'];
    }
    if (draftJson['analysis']) {
      this.lesson.analysis = draftJson['analysis'] as QuranLesson['analysis'];
    }
    if (draftJson['builder_extras']) {
      lessonAny['builder_extras'] = draftJson['builder_extras'];
    }

    this.ensureDefaults();
    this.onLessonEdited();
  }

  private async ensureDraftInitialized() {
    if (this.draftId) return;
    await this.initializeDraftForLesson();
  }

  private async persistDraftToServer() {
    if (!this.draftId) return;
    const draftJson = this.buildDraftJson();
    const response = await firstValueFrom(
      this.service.updateDraft(this.draftId, {
        draft_json: draftJson,
        active_step: this.activeTabId,
      })
    );
    if (response?.draft_version != null) {
      this.draftVersion = response.draft_version;
    }
  }

  private finishLessonCreation(lessonId: number) {
    if (!this.lesson) return;
    this.lesson.id = String(lessonId);
    this.isNewLesson = false;
    const storage = globalThis.localStorage;
    if (storage) {
      storage.removeItem(this.getDraftIdKey('new'));
      storage.setItem(this.getDraftIdKey(String(lessonId)), this.draftId ?? '');
    }
    this.router.navigate(['/arabic/quran/lessons', lessonId, 'edit'], { replaceUrl: true });
  }

  private syncMetaJsonInputs() {
    if (!this.lesson) return;
    this.metaComprehensionJson = JSON.stringify(this.lesson.comprehension ?? {}, null, 2);
    const lessonAny = this.lesson as unknown as Record<string, unknown>;
    const notesValue = lessonAny['notes'] ?? this.lesson._notes ?? [];
    this.metaNotesJson = JSON.stringify(notesValue, null, 2);
    this.metaJsonError = null;
  }

  private ensureAnalysis() {
    if (!this.lesson) {
      return { tokens: [], spans: [], vocab: { verbs: [], nouns: [], spans: [] } };
    }
    if (!this.lesson.analysis) {
      this.lesson.analysis = {
        tokens: [],
        spans: [],
        vocab: { verbs: [], nouns: [], spans: [] },
      };
    }
    if (!Array.isArray(this.lesson.analysis.tokens)) this.lesson.analysis.tokens = [];
    if (!Array.isArray(this.lesson.analysis.spans)) this.lesson.analysis.spans = [];
    if (!this.lesson.analysis.vocab) {
      this.lesson.analysis.vocab = { verbs: [], nouns: [], spans: [] };
    }
    if (!Array.isArray(this.lesson.analysis.vocab.verbs)) this.lesson.analysis.vocab.verbs = [];
    if (!Array.isArray(this.lesson.analysis.vocab.nouns)) this.lesson.analysis.vocab.nouns = [];
    if (!Array.isArray(this.lesson.analysis.vocab.spans)) this.lesson.analysis.vocab.spans = [];
    return this.lesson.analysis;
  }

  private ensureComprehension() {
    if (!this.lesson) {
      return { reflective: [], analytical: [], mcqs: [] };
    }
    if (!this.lesson.comprehension) {
      this.lesson.comprehension = { reflective: [], analytical: [], mcqs: [] };
    }
    return this.lesson.comprehension;
  }

  private getVerseLemmas(verse: QuranLessonAyahUnit): QuranLessonLemmaLocation[] {
    if (!Array.isArray(verse.lemmas)) {
      verse.lemmas = [];
    }
    return verse.lemmas;
  }

  private applyIdNormalization() {
    if (!this.lesson) return;

    const { surah, ayahFrom, ayahTo } = this.resolveNormalizationBounds();
    const containerId = this.composeContainerId(surah);
    const passageUnitId = this.composePassageUnitId(surah, ayahFrom, ayahTo);

    this.verseSelection = { surah, ayahFrom, ayahTo };
    this.containerForm = {
      ...this.containerForm,
      surah,
      ayahFrom,
      ayahTo,
      containerId,
      unitId: passageUnitId,
    };

    const reference = this.safeReference;
    reference.container_id = containerId;
    reference.unit_id = passageUnitId;
    reference.surah = surah;
    reference.ayah_from = ayahFrom;
    reference.ayah_to = ayahTo;
    reference.ref_label = reference.ref_label || `Surah ${surah}:${ayahFrom}-${ayahTo}`;

    const verseAyahs: number[] = [];
    for (const [index, verse] of this.safeArabicVerses.entries()) {
      const parsed = this.parseAyahRange(verse.unit_id);
      const ayahCandidate =
        Number.isFinite(verse.ayah) && verse.ayah > 0
          ? verse.ayah
          : parsed?.ayahFrom ?? ayahFrom + index;
      const ayah = this.clampNumber(ayahCandidate, 1, 286, ayahFrom);
      verse.surah = surah;
      verse.ayah = ayah;
      verse.unit_type = 'ayah';
      verse.unit_id = this.composeAyahUnitId(surah, ayah);
      verseAyahs.push(ayah);

      const lemmas = this.getVerseLemmas(verse).map((lemma, lemmaIndex) => {
        const parsedIndex = this.parseWordLocationIndex(lemma.word_location);
        const tokenIndexRaw = lemma.token_index;
        const tokenIndex =
          Number.isFinite(tokenIndexRaw) && tokenIndexRaw > 0
            ? tokenIndexRaw
            : parsedIndex ?? lemmaIndex + 1;
        const wordLocation =
          lemma.word_location || (tokenIndex ? `${surah}:${ayah}:${tokenIndex}` : lemma.word_location);
        return {
          ...lemma,
          token_index: tokenIndex,
          word_location: wordLocation ?? lemma.word_location,
        };
      });
      verse.lemmas = lemmas;
    }

    const ayahNumbers = verseAyahs.length
      ? Array.from(new Set(verseAyahs)).sort((a, b) => a - b)
      : this.buildAyahRange(ayahFrom, ayahTo);

    this.normalizeUnitsForRange(surah, ayahFrom, ayahTo, ayahNumbers);

    for (const sentence of this.safeSentences) {
      const rawUnitId = sentence.unit_id || sentence.ref?.unit_id || '';
      const parsed = this.parseAyahRange(rawUnitId);
      if (!parsed) continue;
      const normalizedSurah = this.clampNumber(parsed.surah, 1, 114, surah);
      const from = this.clampNumber(parsed.ayahFrom, 1, 286, ayahFrom);
      const to = this.clampNumber(parsed.ayahTo, from, 286, from);
      const normalizedUnitId =
        from === to
          ? this.composeAyahUnitId(normalizedSurah, from)
          : this.composePassageUnitId(normalizedSurah, from, to);
      sentence.unit_id = normalizedUnitId;
      sentence.ref = sentence.ref ?? {};
      sentence.ref.unit_id = normalizedUnitId;
      sentence.ref.surah = normalizedSurah;
      sentence.ref.ayah_from = from;
      sentence.ref.ayah_to = to;
    }

    for (const token of this.safeTokens) {
      token.container_id = containerId;
      const parsed = this.parseAyahRange(token.unit_id);
      if (parsed) {
        const normalizedSurah = this.clampNumber(parsed.surah, 1, 114, surah);
        const from = this.clampNumber(parsed.ayahFrom, 1, 286, ayahFrom);
        token.unit_id = this.composeAyahUnitId(normalizedSurah, from);
      }
    }

    for (const span of this.safeSpans) {
      span.container_id = containerId;
      const parsed = this.parseAyahRange(span.unit_id);
      if (parsed) {
        const normalizedSurah = this.clampNumber(parsed.surah, 1, 114, surah);
        const from = this.clampNumber(parsed.ayahFrom, 1, 286, ayahFrom);
        span.unit_id = this.composeAyahUnitId(normalizedSurah, from);
      }
    }

    this.normalizeLinkedUnitsInComprehension(surah);

    if (!this.safeArabicVerses.some((verse) => verse.unit_id === this.selectedVerseUnitId)) {
      this.selectedVerseUnitId = this.safeArabicVerses[0]?.unit_id ?? '';
    }
    this.syncContextSelections();
  }

  private normalizeBeforeSave() {
    if (!this.lesson) return;

    this.lesson.reference = this.lesson.reference ?? {};
    this.lesson.reference.surah = this.clampNumber(this.lesson.reference.surah, 1, 114, this.verseSelection.surah);
    this.lesson.reference.ayah_from = this.clampNumber(
      this.lesson.reference.ayah_from,
      1,
      286,
      this.verseSelection.ayahFrom
    );
    this.lesson.reference.ayah_to = this.clampNumber(
      this.lesson.reference.ayah_to,
      this.lesson.reference.ayah_from,
      286,
      this.verseSelection.ayahTo
    );

    if (this.lesson.difficulty != null) {
      const parsedDifficulty = Number(this.lesson.difficulty);
      this.lesson.difficulty = Number.isFinite(parsedDifficulty)
        ? Math.max(1, Math.trunc(parsedDifficulty))
        : undefined;
    }

    for (const verse of this.safeArabicVerses) {
      verse.surah = this.clampNumber(verse.surah, 1, 114, this.verseSelection.surah);
      verse.ayah = this.clampNumber(verse.ayah, 1, 286, 1);
      verse.unit_id = verse.unit_id || this.composeAyahUnitId(verse.surah, verse.ayah);
      verse.lemmas = this.getVerseLemmas(verse).map((lemma) => ({
        ...lemma,
        token_index: this.clampNumber(lemma.token_index, 0, 999, 0),
        words_count: lemma.words_count == null ? null : this.clampNumber(lemma.words_count, 0, 999, 0),
        uniq_words_count:
          lemma.uniq_words_count == null ? null : this.clampNumber(lemma.uniq_words_count, 0, 999, 0),
      }));
    }

    for (const sentence of this.safeSentences) {
      sentence.text = sentence.text ?? { arabic: '', translation: null };
      sentence.text.arabic = sentence.arabic ?? sentence.text.arabic ?? '';
      sentence.text.translation = sentence.translation ?? sentence.text.translation ?? null;
      sentence.arabic = sentence.text.arabic;
      sentence.translation = sentence.text.translation;
    }

    for (const token of this.safeTokens) {
      token.pos_index = this.clampNumber(token.pos_index, 0, 999, 0);
    }

    for (const span of this.safeSpans) {
      span.start_index = this.clampNumber(span.start_index, 0, 999, 0);
      span.end_index = this.clampNumber(span.end_index, span.start_index, 999, span.start_index);
      span.token_ids = Array.isArray(span.token_ids) ? span.token_ids : [];
    }

    this.fixVerseUnitOrder();
    this.onLessonEdited();
  }

  private resolveNormalizationBounds() {
    const reference = this.safeReference;
    const fallbackSurah = this.clampNumber(
      reference.surah ?? this.verseSelection.surah ?? this.safeArabicVerses[0]?.surah ?? 1,
      1,
      114,
      1
    );

    const verseAyahs = this.safeArabicVerses
      .filter((verse) => verse.surah === fallbackSurah && Number.isFinite(verse.ayah))
      .map((verse) => verse.ayah);

    const minAyah = verseAyahs.length
      ? Math.min(...verseAyahs)
      : this.clampNumber(reference.ayah_from ?? this.verseSelection.ayahFrom, 1, 286, this.verseSelection.ayahFrom);
    const maxAyah = verseAyahs.length
      ? Math.max(...verseAyahs)
      : this.clampNumber(reference.ayah_to ?? this.verseSelection.ayahTo, minAyah, 286, this.verseSelection.ayahTo);

    const ayahFrom = this.clampNumber(reference.ayah_from ?? minAyah, 1, 286, minAyah);
    const ayahTo = this.clampNumber(reference.ayah_to ?? maxAyah, ayahFrom, 286, maxAyah);

    return { surah: fallbackSurah, ayahFrom, ayahTo };
  }

  private normalizeUnitsForRange(surah: number, ayahFrom: number, ayahTo: number, ayahNumbers: number[]) {
    const passageUnitId = this.composePassageUnitId(surah, ayahFrom, ayahTo);
    const passageStartRef = `Q:${surah}:${ayahFrom}`;
    const passageEndRef = `Q:${surah}:${ayahTo}`;
    const passageText = this.safeArabicVerses.map((verse) => verse.arabic).filter(Boolean).join(' ').trim();

    let passageUnit = this.safeUnits.find((unit) => unit.unit_type === 'passage');
    if (!passageUnit) {
      passageUnit = {
        id: passageUnitId,
        unit_type: 'passage',
        order_index: 0,
        ayah_from: ayahFrom,
        ayah_to: ayahTo,
        start_ref: passageStartRef,
        end_ref: passageEndRef,
        text_cache: passageText || null,
        meta_json: null,
      };
      this.safeUnits.unshift(passageUnit);
    } else {
      passageUnit.id = passageUnitId;
      passageUnit.unit_type = 'passage';
      passageUnit.ayah_from = ayahFrom;
      passageUnit.ayah_to = ayahTo;
      passageUnit.start_ref = passageStartRef;
      passageUnit.end_ref = passageEndRef;
      passageUnit.text_cache = passageText || passageUnit.text_cache || null;
    }

    const ayahUnitsByAyah = new Map<number, QuranLessonUnit>();
    for (const unit of this.safeUnits) {
      if (unit.unit_type !== 'ayah') continue;
      const ayah = this.resolveAyahFromUnit(unit, surah);
      if (!ayah) continue;
      unit.ayah_from = ayah;
      unit.ayah_to = ayah;
      unit.id = this.composeAyahUnitId(surah, ayah);
      unit.start_ref = `Q:${surah}:${ayah}`;
      unit.end_ref = `Q:${surah}:${ayah}`;
      ayahUnitsByAyah.set(ayah, unit);
    }

    for (const ayah of ayahNumbers) {
      if (ayahUnitsByAyah.has(ayah)) continue;
      this.safeUnits.push({
        id: this.composeAyahUnitId(surah, ayah),
        unit_type: 'ayah',
        order_index: ayah - ayahFrom + 1,
        ayah_from: ayah,
        ayah_to: ayah,
        start_ref: `Q:${surah}:${ayah}`,
        end_ref: `Q:${surah}:${ayah}`,
        text_cache: this.safeArabicVerses.find((verse) => verse.ayah === ayah)?.arabic ?? null,
        meta_json: null,
      });
    }
  }

  private resolveAyahFromUnit(unit: QuranLessonUnit, fallbackSurah: number) {
    if (Number.isFinite(unit.ayah_from)) {
      return this.clampNumber(unit.ayah_from, 1, 286, 1);
    }
    if (Number.isFinite(unit.ayah_to)) {
      return this.clampNumber(unit.ayah_to, 1, 286, 1);
    }
    const parsed = this.parseAyahRange(unit.id || unit.start_ref || unit.end_ref || '');
    if (!parsed) return null;
    const ayah = this.clampNumber(parsed.ayahFrom, 1, 286, 1);
    return ayah;
  }

  private normalizeLinkedUnitsInComprehension(surah: number) {
    const comprehension = this.ensureComprehension();
    const normalizeList = (input?: string[]) => {
      if (!Array.isArray(input)) return input;
      const normalized = input
        .map((value) => this.normalizeUnitIdValue(value, surah))
        .filter((value): value is string => !!value);
      return Array.from(new Set(normalized));
    };

    for (const question of comprehension.reflective ?? []) {
      question.linked_unit_ids = normalizeList(question.linked_unit_ids) ?? question.linked_unit_ids;
    }
    for (const question of comprehension.analytical ?? []) {
      question.linked_unit_ids = normalizeList(question.linked_unit_ids) ?? question.linked_unit_ids;
    }
    for (const mcq of this.safeMcqQuestions) {
      mcq.linked_unit_ids = normalizeList(mcq.linked_unit_ids) ?? mcq.linked_unit_ids;
    }
  }

  private normalizeUnitIdValue(value: string | null | undefined, fallbackSurah: number) {
    if (!value) return null;
    const parsed = this.parseAyahRange(value);
    if (!parsed) return String(value);
    const surah = this.clampNumber(parsed.surah, 1, 114, fallbackSurah);
    const from = this.clampNumber(parsed.ayahFrom, 1, 286, 1);
    const to = this.clampNumber(parsed.ayahTo, from, 286, from);
    return from === to ? this.composeAyahUnitId(surah, from) : this.composePassageUnitId(surah, from, to);
  }

  private parseAyahRange(value: string | null | undefined) {
    if (!value) return null;
    const match = String(value).match(/(\d{1,3})\s*[:._-]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/);
    if (!match) return null;
    const surah = Number(match[1]);
    const ayahFrom = Number(match[2]);
    const ayahTo = match[3] ? Number(match[3]) : ayahFrom;
    if (!Number.isFinite(surah) || !Number.isFinite(ayahFrom)) return null;
    return { surah, ayahFrom, ayahTo };
  }

  private parseWordLocationIndex(value: string | null | undefined) {
    if (!value) return null;
    const match = String(value).match(/(\d{1,3})\s*[:._-]\s*(\d{1,3})\s*[:._-]\s*(\d{1,3})/);
    if (!match) return null;
    const tokenIndex = Number(match[3]);
    return Number.isFinite(tokenIndex) ? tokenIndex : null;
  }

  private syncSelectionFromLesson() {
    const verses = this.safeArabicVerses;
    if (!verses.length) {
      const surahFromRef = this.clampNumber(this.safeReference.surah, 1, 114, 1);
      const ayahFromRef = this.clampNumber(this.safeReference.ayah_from, 1, 286, 1);
      const ayahToRef = this.clampNumber(this.safeReference.ayah_to, ayahFromRef, 286, 7);
      this.verseSelection = { surah: surahFromRef, ayahFrom: ayahFromRef, ayahTo: ayahToRef };
      this.containerForm.surah = surahFromRef;
      this.containerForm.ayahFrom = ayahFromRef;
      this.containerForm.ayahTo = ayahToRef;
      return;
    }

    const sorted = [...verses].sort((a, b) => a.ayah - b.ayah);
    const surah = this.clampNumber(sorted[0]?.surah, 1, 114, 1);
    const sameSurah = sorted.filter((verse) => verse.surah === surah);
    const ayahFrom = Math.min(...sameSurah.map((verse) => verse.ayah));
    const ayahTo = Math.max(...sameSurah.map((verse) => verse.ayah));

    this.verseSelection = { surah, ayahFrom, ayahTo };
    this.containerForm.surah = surah;
    this.containerForm.ayahFrom = ayahFrom;
    this.containerForm.ayahTo = ayahTo;
    this.selectedVerseUnitId = sorted[0]?.unit_id ?? '';

    if (!this.containerForm.containerId) {
      this.containerForm.containerId = this.composeContainerId(surah);
    }
    if (!this.containerForm.unitId) {
      this.containerForm.unitId = this.composePassageUnitId(surah, ayahFrom, ayahTo);
    }
  }

  private syncContextSelections() {
    const firstTokenId = this.selectedVerseTokens[0]?.token_occ_id ?? '';
    const firstSpanId = this.selectedVerseSpans[0]?.span_occ_id ?? '';
    const firstSentenceId = this.selectedVerseSentences[0]?.sentence_id ?? '';

    if (!this.selectedGrammarTargetId.token || !this.grammarLinks.token[this.selectedGrammarTargetId.token]) {
      this.selectedGrammarTargetId.token = firstTokenId;
    }
    if (!this.selectedGrammarTargetId.span || !this.grammarLinks.span[this.selectedGrammarTargetId.span]) {
      this.selectedGrammarTargetId.span = firstSpanId;
    }
    if (!this.selectedGrammarTargetId.sentence || !this.grammarLinks.sentence[this.selectedGrammarTargetId.sentence]) {
      this.selectedGrammarTargetId.sentence = firstSentenceId;
    }

    if (!this.selectedSentenceIdForTree || !this.selectedVerseSentences.some((s) => s.sentence_id === this.selectedSentenceIdForTree)) {
      this.selectedSentenceIdForTree = firstSentenceId;
      if (this.selectedSentenceIdForTree) {
        this.ensureTree(this.selectedSentenceIdForTree);
      }
    }
  }

  private removeGrammarTarget(targetType: GrammarTargetType, targetId: string) {
    delete this.grammarLinks[targetType][targetId];
  }

  private countConceptLinks(map: Record<string, string[]>, concept: string) {
    return Object.values(map).reduce((count, links) => count + (links.includes(concept) ? 1 : 0), 0);
  }

  private ensureTree(sentenceId: string): SentenceTreeState {
    if (!this.sentenceTrees[sentenceId]) {
      this.sentenceTrees[sentenceId] = { nodes: [], edges: [] };
    }
    return this.sentenceTrees[sentenceId];
  }

  private syncBuilderExtrasToLesson() {
    if (!this.lesson) return;
    const lessonAny = this.lesson as unknown as Record<string, unknown>;
    lessonAny['builder_extras'] = {
      grammar_links: this.grammarLinks,
      sentence_trees: this.sentenceTrees,
    };
  }

  private loadBuilderExtrasFromLesson() {
    if (!this.lesson) return;
    const lessonAny = this.lesson as unknown as Record<string, unknown>;
    const extras = this.asRecord(lessonAny['builder_extras']);
    if (!extras) return;

    const rawGrammar = this.asRecord(extras['grammar_links']);
    if (rawGrammar) {
      this.grammarLinks.token = this.asLinkMap(rawGrammar['token']);
      this.grammarLinks.span = this.asLinkMap(rawGrammar['span']);
      this.grammarLinks.sentence = this.asLinkMap(rawGrammar['sentence']);
    }

    const rawTrees = this.asRecord(extras['sentence_trees']);
    if (rawTrees) {
      const treeMap: Record<string, SentenceTreeState> = {};
      for (const [sentenceId, value] of Object.entries(rawTrees)) {
        const tree = this.asRecord(value);
        if (!tree) continue;
        const nodesRaw = Array.isArray(tree['nodes']) ? tree['nodes'] : [];
        const edgesRaw = Array.isArray(tree['edges']) ? tree['edges'] : [];

        treeMap[sentenceId] = {
          nodes: nodesRaw
            .map((node) => this.asRecord(node))
            .filter((node): node is Record<string, unknown> => !!node)
            .map((node) => ({
              id: String(node['id'] ?? ''),
              label: String(node['label'] ?? ''),
              type: (node['type'] as SentenceTreeNode['type']) || 'clause',
              tokenRange: node['tokenRange'] == null ? '' : String(node['tokenRange']),
            })),
          edges: edgesRaw
            .map((edge) => this.asRecord(edge))
            .filter((edge): edge is Record<string, unknown> => !!edge)
            .map((edge) => ({
              from: String(edge['from'] ?? ''),
              to: String(edge['to'] ?? ''),
              label: edge['label'] == null ? '' : String(edge['label']),
            })),
        };
      }
      this.sentenceTrees = treeMap;
    }
  }

  private asLinkMap(value: unknown) {
    const map = this.asRecord(value);
    if (!map) return {};

    const result: Record<string, string[]> = {};
    for (const [targetId, links] of Object.entries(map)) {
      if (Array.isArray(links)) {
        result[targetId] = links
          .map((entry) => this.normalizeGrammarConcept(String(entry)))
          .filter(Boolean);
      }
    }
    return result;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private buildAyahRange(from: number, to: number) {
    const start = Math.max(1, Math.min(from, to));
    const end = Math.max(start, Math.max(from, to));
    return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
  }

  private composeContainerId(surah: number) {
    return `C:QURAN:${surah}`;
  }

  private composePassageUnitId(surah: number, ayahFrom: number, ayahTo: number) {
    return `U:C:QURAN:${surah}:${ayahFrom}-${ayahTo}`;
  }

  private composeAyahUnitId(surah: number, ayah: number) {
    return `U:C:QURAN:${surah}:${ayah}`;
  }

  private clampNumber(
    value: string | number | null | undefined,
    min: number,
    max: number,
    fallback: number
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  private buildBlankLesson(): QuranLesson {
    return {
      id: 'new',
      title: '',
      title_ar: '',
      source: '',
      lesson_type: 'quran',
      subtype: '',
      status: 'draft',
      difficulty: 1,
      reference: {},
      text: {
        arabic_full: [],
        mode: 'original',
      },
      sentences: [],
      units: [],
      comprehension: {
        reflective: [],
        analytical: [],
        mcqs: [],
      },
      analysis: {
        tokens: [],
        spans: [],
        vocab: { verbs: [], nouns: [], spans: [] },
      },
    };
  }

  private buildCreatePayload(): Omit<QuranLesson, 'id'> {
    if (!this.lesson) {
      const blank = this.buildBlankLesson();
      const { id, ...rest } = blank;
      return rest;
    }
    const { id, ...rest } = this.lesson;
    return rest;
  }

  private navigateToView(lessonId: string) {
    if (!lessonId) return;
    this.router.navigate(['/arabic/quran/lessons', lessonId, 'view']);
  }

  private buildBlankQuestion(): QuranLessonComprehensionQuestion {
    return {
      question_id: crypto.randomUUID(),
      question: '',
      answer_hint: '',
    };
  }

}
