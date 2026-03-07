import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { IconDirective } from '@coreui/icons-angular';
import { Subscription } from 'rxjs';

import { TargetedNotesPanelComponent } from '../../../../../notes-targeted/targeted-notes-panel/targeted-notes-panel.component';
import {
  TargetRef,
  makeTaskItemTarget,
  makeTaskTarget,
  makeWordTarget,
} from '../../../../../notes-targeted/targeting.models';
import {
  AppFontSizeControlsComponent,
  AppPillsComponent,
  type AppPillItem,
  type AppTabItem,
} from '../../../../../shared/components';
import { LessonCaptureBarComponent } from '../../../../sprint/components/lesson-capture-bar/lesson-capture-bar.component';
import { QuranAyah } from '../../../../../shared/models/arabic/quran-data.model';
import { PageHeaderTabsConfig } from '../../../../../shared/models/core/page-header.model';
import { PageHeaderService } from '../../../../../shared/services/page-header.service';
import {
  type QuranSentenceStructureSegment,
  type QuranSentenceStructureSentence,
  type QuranSentenceStructureSummary,
  QuranWordInspectorComponent,
  type QuranWordInspectorSelection,
} from '../../shared';
import { QuranLessonEditorFacade } from '../edit-new/facade/editor.facade';
import { EditorState, SentenceSubTab, TaskTab, TaskType } from '../edit-new/models/editor.types';
import { selectSelectedAyahs, selectSelectedRangeLabelShort } from '../edit-new/state/editor.selectors';

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_SCRIPT_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

const LEGACY_STUDY_TAB_MAP: Record<string, TaskType> = {
  study: 'reading',
  reading: 'reading',
  memory: 'sentence_structure',
  sentences: 'sentence_structure',
  grammar: 'sentence_structure',
  mcq: 'comprehension',
  passage: 'passage_structure',
};

const STUDY_TASK_TAB_ORDER: Array<'lesson' | TaskType> = [
  'lesson',
  'reading',
  'morphology',
  'sentence_structure',
  'expressions',
  'comprehension',
  'passage_structure',
];

const TASK_NOTES_TYPES = new Set<TaskType>([
  'morphology',
  'sentence_structure',
  'comprehension',
  'passage_structure',
]);

const SENTENCE_SUB_TABS: AppTabItem[] = [
  { id: 'verses', label: 'Verses' },
  { id: 'items', label: 'Items' },
  { id: 'json', label: 'JSON' },
];

const COMPREHENSION_GROUP_ORDER = [
  'comprehension',
  'reflective',
  'analytical',
  'morphological',
  'grammatical',
] as const;

type ReadingWordToken = {
  text: string;
  location: string;
  surah: number;
  ayah: number;
  tokenIndex: number;
};

type StudyWordLocationParts = {
  surah: number | null;
  ayah: number | null;
  tokenIndex: number | null;
};

type MorphologyDialogContextAyah = {
  surah: number;
  ayah: number;
  words: string[];
  translation: string;
  isFocus: boolean;
};

type PassageAccent = 'blue' | 'green' | 'orange' | 'violet' | 'gray';
type PassageRenderer = 'keyvalue' | 'clusters' | 'chiasm' | 'timeline';

type PassageKeyValueRow = {
  key: string;
  text: string;
  chips: string[];
};

type PassageCluster = {
  title: string;
  items: string[];
  accent: PassageAccent;
};

type PassageChiasmModel = {
  outerTop: string;
  outerBottom: string;
  innerLeft: string;
  innerRight: string;
  axis: string;
  interpretation: string;
};

type PassageTimelineStep = {
  id: string;
  title: string;
  text: string;
};

type PassageTextSegment = {
  text: string;
  isArabic: boolean;
};

type PassageSectionCard = {
  id: string;
  key: string;
  title: string;
  badge: string;
  renderer: PassageRenderer;
  accent: PassageAccent;
  iconName: string;
  summary: string;
  keyValueRows: PassageKeyValueRow[];
  clusters: PassageCluster[];
  chiasm: PassageChiasmModel | null;
  timeline: PassageTimelineStep[];
};

type ComprehensionQuestionGroup = {
  id: string;
  key: string;
  title: string;
  accent: PassageAccent;
  questions: string[];
};

type ExpressionSequenceToken = {
  text: string;
  type: string;
};

type ExpressionSource = {
  author: string;
  work: string;
};

type ExpressionStudyCard = {
  id: string;
  label: string;
  textAr: string;
  canonical: string;
  reference: string;
  category: string;
  status: string;
  lemma: string;
  accent: PassageAccent;
  sequence: ExpressionSequenceToken[];
  sources: ExpressionSource[];
};

@Component({
  selector: 'app-quran-lesson-study',
  standalone: true,
  imports: [
    CommonModule,
    IconDirective,
    TargetedNotesPanelComponent,
    AppPillsComponent,
    AppFontSizeControlsComponent,
    LessonCaptureBarComponent,
    QuranWordInspectorComponent,
  ],
  templateUrl: './quran-lesson-study.component.html',
  providers: [QuranLessonEditorFacade],
})
export class QuranLessonStudyComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(QuranLessonEditorFacade);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly subs = new Subscription();

  private facadeReady = false;
  private fontRem = 1.35;
  private readonly minFontRem = 1;
  private readonly maxFontRem = 9.6;

  ready = false;
  studyActiveTaskTab: 'lesson' | TaskType = 'lesson';
  selectedReadingWord: QuranWordInspectorSelection | null = null;
  morphologyDialogWord: QuranWordInspectorSelection | null = null;
  dialogViewMode: 'context' | 'analysis' = 'context';
  showDialogTranslation = true;
  showMorphologyWordNotesModal = false;
  taskNotesModalTarget: TargetRef | null = null;
  taskNotesModalTitle = 'Notes';
  activeSentenceNoteKey = '';
  activeSentenceNoteTarget: TargetRef | null = null;
  activeComprehensionNoteKey = '';
  activeComprehensionNoteTarget: TargetRef | null = null;
  private readonly collapsedPassageSectionIds = new Set<string>();
  private passageSectionsCacheKey = '';
  private passageSectionsCache: PassageSectionCard[] = [];
  private comprehensionGroupsCacheKey = '';
  private comprehensionGroupsCache: ComprehensionQuestionGroup[] = [];
  private expressionCardsCacheKey = '';
  private expressionCardsCache: ExpressionStudyCard[] = [];
  private readonly expandedSentenceSectionKeys = new Set<string>();

  get state(): EditorState {
    return this.facade.state;
  }

  get lessonTitle() {
    return this.state.lessonTitleEn || (this.state.lessonId ? `Lesson #${this.state.lessonId}` : 'Quran Lesson');
  }

  get lessonSubtitle() {
    const surah = this.state.selectedSurah;
    const start = this.state.rangeStart;
    const end = this.state.rangeEnd ?? start;

    if (!surah || start == null || end == null) {
      return 'Reference not available yet.';
    }

    return start === end
      ? `Surah ${surah}, Ayah ${start}`
      : `Surah ${surah}, Ayah ${start}-${end}`;
  }

  get activeTaskTab(): TaskTab | null {
    if (this.studyActiveTaskTab === 'lesson') return null;
    return this.state.taskTabs.find((tab) => tab.type === this.studyActiveTaskTab) ?? null;
  }

  get sentenceTabs(): AppTabItem[] {
    return SENTENCE_SUB_TABS;
  }

  get sentencePrimaryIds(): string[] {
    return SENTENCE_SUB_TABS.map((tab) => tab.id);
  }

  get selectedAyahs() {
    return selectSelectedAyahs(this.state);
  }

  get sentenceAyahsForStudy() {
    const selected = new Set(this.state.sentenceAyahSelections);
    if (!selected.size) return this.selectedAyahs;
    return this.selectedAyahs.filter((ayah) => selected.has(ayah.ayah));
  }

  get rangeLabelShort() {
    return selectSelectedRangeLabelShort(this.state);
  }

  get arabicFontSize(): string {
    return `${this.fontRem.toFixed(2)}rem`;
  }

  get studyUiFontScale(): string {
    const baseFontRem = 1.35;
    return (this.fontRem / baseFontRem).toFixed(3);
  }

  get readingTextNonDiacritic(): string {
    return this.getReadingSourceAyahs()
      .map((ayah) => this.resolveReadingAyahText(ayah))
      .filter((text) => Boolean(text))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  get readingAyahWordGroups(): Array<{ ayah: number; words: ReadingWordToken[] }> {
    return this.getReadingSourceAyahs()
      .map((ayah) => {
        const words = this.splitWords(this.resolveReadingAyahText(ayah)).map((word, index) => ({
          text: word,
          location: `${ayah.surah}:${ayah.ayah}:${index + 1}`,
          surah: ayah.surah,
          ayah: ayah.ayah,
          tokenIndex: index + 1,
        }));
        return { ayah: ayah.ayah, words };
      })
      .filter((group) => group.words.length > 0);
  }

  get readingTaskPayload(): Record<string, unknown> {
    const readingTask = this.state.taskTabs.find((entry) => entry.type === 'reading');
    return this.parseTaskJsonObject(readingTask?.json ?? '');
  }

  get morphologyTaskPayload(): Record<string, unknown> {
    const morphologyTask = this.state.taskTabs.find((entry) => entry.type === 'morphology');
    return this.parseTaskJsonObject(morphologyTask?.json ?? '');
  }

  get lexiconMorphologyItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    return this.objectArray(payload['lexicon_morphology']);
  }

  get morphologyEvidenceItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    return this.objectArray(payload['lexicon_evidence']);
  }

  get morphologyItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    const fromItems = this.objectArray(payload['items']);
    if (fromItems.length) return fromItems;
    return this.lexiconMorphologyItems;
  }

  get nounMorphologyItems(): Array<Record<string, unknown>> {
    return this.morphologyItems.filter((item) => this.morphologyPos(item) === 'noun');
  }

  get verbMorphologyItems(): Array<Record<string, unknown>> {
    return this.morphologyItems.filter((item) => this.morphologyPos(item) === 'verb');
  }

  get nounMorphologyPills(): AppPillItem[] {
    return this.toMorphologyPills(this.nounMorphologyItems, 'noun');
  }

  get verbMorphologyPills(): AppPillItem[] {
    return this.toMorphologyPills(this.verbMorphologyItems, 'verb');
  }

  get readingInspectorSurahName(): string {
    if (!this.selectedReadingWord) return '';
    return this.resolveSurahName(this.selectedReadingWord.surah ?? null);
  }

  get morphologyDialogSurahName(): string {
    if (!this.morphologyDialogWord) return '';
    return this.resolveSurahName(this.morphologyDialogWord.surah ?? null);
  }

  get morphologyDialogReference(): string {
    if (!this.morphologyDialogWord) return '—';
    const parsed = this.morphologyDialogLocationParts;
    if (parsed.surah == null || parsed.ayah == null) {
      const direct = this.morphologyDialogWord.location?.trim();
      return direct || '—';
    }
    if (parsed.tokenIndex == null) return `${parsed.surah}:${parsed.ayah}`;
    return `${parsed.surah}:${parsed.ayah}:${parsed.tokenIndex}`;
  }

  get morphologyDialogContextBar(): string {
    const parts: string[] = [];
    const surah = this.morphologyDialogSurahName;
    if (surah) parts.push(`Surah ${surah}`);

    const range = this.dialogRangeCompact;
    if (range) parts.push(range);

    const narrativeLabel = this.dialogNarrativeLabel;
    if (narrativeLabel) parts.push(narrativeLabel);

    return parts.join(' | ');
  }

  get morphologyDialogContextAyahs(): MorphologyDialogContextAyah[] {
    if (!this.morphologyDialogWord) return [];
    const parsed = this.morphologyDialogLocationParts;
    const sameSurah = this.selectedAyahs.filter((entry) => parsed.surah == null || entry.surah === parsed.surah);
    let windowAyahs = sameSurah;

    if (parsed.ayah != null) {
      const centerIndex = sameSurah.findIndex((entry) => entry.ayah === parsed.ayah);
      if (centerIndex >= 0) {
        const start = Math.max(0, centerIndex - 1);
        const end = Math.min(sameSurah.length, centerIndex + 2);
        windowAyahs = sameSurah.slice(start, end);
      } else {
        windowAyahs = sameSurah.filter((entry) => entry.ayah === parsed.ayah);
      }
    }

    if (!windowAyahs.length && parsed.surah != null && parsed.ayah != null) {
      const fallback = this.selectedAyahs.find((entry) => entry.surah === parsed.surah && entry.ayah === parsed.ayah);
      if (fallback) windowAyahs = [fallback];
    }

    return windowAyahs.map((ayah) => ({
      surah: ayah.surah,
      ayah: ayah.ayah,
      words: this.splitWords(this.resolveReadingAyahText(ayah)),
      translation: this.ayahTranslationText(ayah),
      isFocus: parsed.surah === ayah.surah && parsed.ayah === ayah.ayah,
    }));
  }

  get lessonHeading(): string {
    const payload = this.getPassageStructurePayload();
    return this.pickFirst(payload, ['heading', 'title', 'study_heading', 'lesson_heading']) || this.lessonTitle;
  }

  get lessonDetail(): string {
    const payload = this.getPassageStructurePayload();
    return this.pickFirst(payload, ['detail', 'description', 'summary', 'overview']) || 'No lesson detail available yet.';
  }

  get episodeIntro(): string {
    const payload = this.getPassageStructurePayload();
    return this.pickFirst(payload, ['episode_intro', 'episodeIntro', 'intro']) || 'Not provided';
  }

  get sceneDetail(): string {
    const payload = this.getPassageStructurePayload();
    return this.pickFirst(payload, ['scene', 'scene_intro', 'scene_detail']) || 'Not provided';
  }

  get sceneAesthetic(): string {
    const payload = this.getPassageStructurePayload();
    return this.pickFirst(payload, ['scene_aesthetic', 'aesthetic', 'style', 'tone']) || 'Not provided';
  }

  get passageHeaderTitle(): string {
    const payload = this.getPassageStructurePayload();
    const analysis = this.recordFromUnknown(payload['analysis']);
    const heading = this.pickFirst(analysis ?? payload, ['passage_title', 'title', 'heading', 'study_heading']);
    if (heading) return heading;

    const surahNo = this.numberFromUnknown(this.state.selectedSurah);
    const surahName = this.resolveSurahName(surahNo);
    const ref = this.passageReferenceBadge;
    if (surahName && ref) return `Surah ${surahName} ${ref}`;
    if (surahName) return `Surah ${surahName}`;
    if (ref) return `Surah Yusuf ${ref}`;
    return this.lessonTitle || 'Passage Structure';
  }

  get passageHeaderSubtitle(): string {
    const payload = this.getPassageStructurePayload();
    const analysis = this.recordFromUnknown(payload['analysis']);
    const subtitle = this.pickFirst(analysis ?? payload, ['subtitle', 'description', 'summary', 'overview']);
    if (subtitle) return subtitle;
    return 'Structured cognitive map of discourse, conflict, providence, and narrative flow.';
  }

  get passageReferenceBadge(): string {
    const payload = this.getPassageStructurePayload();
    const scope = this.recordFromUnknown(payload['scope']);
    const ref = this.recordFromUnknown(scope?.['ref']);

    const surah = this.numberFromUnknown(ref?.['surah']) ?? this.numberFromUnknown(this.state.selectedSurah);
    let verses = this.textFromUnknown(ref?.['verses']).replace(/\s+/g, '');
    if (!verses) {
      const start = this.state.rangeStart;
      const end = this.state.rangeEnd ?? start;
      if (start != null && end != null) {
        verses = start === end ? `${start}` : `${start}-${end}`;
      }
    }

    if (verses) {
      verses = verses.replace(/-/g, '–');
    }

    if (surah != null && verses) return `${surah}:${verses}`;
    if (surah != null) return String(surah);
    return this.rangeLabelShort || '—';
  }

  get passageStructureSections(): PassageSectionCard[] {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'passage_structure');
    const cacheKey = tab?.json?.trim() ?? '';
    if (cacheKey === this.passageSectionsCacheKey) {
      return this.passageSectionsCache;
    }

    const sections = this.buildPassageSections(this.getPassageStructurePayload());
    this.passageSectionsCacheKey = cacheKey;
    this.passageSectionsCache = sections;
    this.pruneCollapsedPassageSections(sections);
    return sections;
  }

  get areAllPassageSectionsCollapsed(): boolean {
    const sections = this.passageStructureSections;
    return sections.length > 0 && this.collapsedPassageSectionIds.size >= sections.length;
  }

  get hasCollapsedPassageSections(): boolean {
    return this.collapsedPassageSectionIds.size > 0;
  }

  get comprehensionQuestionGroups(): ComprehensionQuestionGroup[] {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'comprehension');
    const cacheKey = tab?.json?.trim() ?? '';
    if (cacheKey === this.comprehensionGroupsCacheKey) {
      return this.comprehensionGroupsCache;
    }

    const groups = this.buildComprehensionQuestionGroups(this.parseTaskJsonUnknown(cacheKey));
    this.comprehensionGroupsCacheKey = cacheKey;
    this.comprehensionGroupsCache = groups;
    return groups;
  }

  get comprehensionQuestionTotal(): number {
    return this.comprehensionQuestionGroups.reduce((total, group) => total + group.questions.length, 0);
  }

  get expressionStudyCards(): ExpressionStudyCard[] {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'expressions');
    const cacheKey = tab?.json?.trim() ?? '';
    if (cacheKey === this.expressionCardsCacheKey) {
      return this.expressionCardsCache;
    }

    const cards = this.buildExpressionStudyCards(this.parseTaskJsonUnknown(cacheKey));
    this.expressionCardsCacheKey = cacheKey;
    this.expressionCardsCache = cards;
    return cards;
  }

  get sentenceStructureSentences(): QuranSentenceStructureSentence[] {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'sentence_structure');
    if (!tab?.json?.trim()) return [];
    try {
      const parsed = JSON.parse(tab.json) as Record<string, unknown>;
      const items = Array.isArray(parsed['items']) ? parsed['items'] : [];
      return items
        .map((item, index) => this.toSentenceStructureSentence(item, index))
        .filter((item): item is QuranSentenceStructureSentence => item != null)
        .sort((a, b) => a.sentence_order - b.sentence_order);
    } catch {
      return [];
    }
  }

  get sentenceTaskJson(): string {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'sentence_structure');
    return this.formatJson(tab?.json ?? '');
  }

  get studyUnitId(): string {
    const unit = (this.state.passageUnitId ?? '').trim();
    if (unit) return unit;
    return (this.state.lessonId ?? '').trim();
  }

  get studyRangeRef(): string {
    const compact = this.passageReferenceBadge.trim();
    if (compact && compact !== '—') return compact;
    return this.rangeLabelShort || this.lessonSubtitle;
  }

  taskTarget(taskType: TaskType): TargetRef | null {
    if (!TASK_NOTES_TYPES.has(taskType)) {
      return null;
    }

    const unitId = this.studyUnitId;
    if (!unitId) return null;

    const rangeRef = this.studyRangeRef.trim();
    const refText = rangeRef ? `${rangeRef} • ${taskType}` : taskType;

    try {
      return makeTaskTarget(unitId, taskType, refText);
    } catch {
      return null;
    }
  }

  sentenceItemTarget(sentence: QuranSentenceStructureSentence): TargetRef | null {
    const unitId = this.studyUnitId;
    if (!unitId) return null;

    const order = Math.max(1, Math.trunc(sentence.sentence_order || 1));
    const itemKey = `sent_${order}`;
    const refText = `${this.studyRangeRef} • Sentence #${order}`;

    try {
      return makeTaskItemTarget(unitId, 'sentence_structure', itemKey, refText);
    } catch {
      return null;
    }
  }

  toggleSentenceItemNotes(sentence: QuranSentenceStructureSentence): void {
    const order = Math.max(1, Math.trunc(sentence.sentence_order || 1));
    const nextKey = `sent_${order}`;

    if (this.activeSentenceNoteKey === nextKey) {
      this.activeSentenceNoteKey = '';
      this.activeSentenceNoteTarget = null;
      return;
    }

    this.activeSentenceNoteKey = nextKey;
    this.activeSentenceNoteTarget = this.sentenceItemTarget(sentence);
  }

  toggleTaskNotesModal(taskType: TaskType): void {
    const target = this.taskTarget(taskType);
    if (!target) {
      this.closeTaskNotesModal();
      return;
    }

    if (
      this.taskNotesModalTarget &&
      this.taskNotesModalTarget.target_type === target.target_type &&
      this.taskNotesModalTarget.target_id === target.target_id
    ) {
      this.closeTaskNotesModal();
      return;
    }

    this.taskNotesModalTarget = target;
    this.taskNotesModalTitle = `${this.toTitle(taskType)} Notes`;
  }

  isTaskNotesModalOpen(taskType: TaskType): boolean {
    const target = this.taskTarget(taskType);
    if (!target || !this.taskNotesModalTarget) return false;
    return (
      this.taskNotesModalTarget.target_type === target.target_type &&
      this.taskNotesModalTarget.target_id === target.target_id
    );
  }

  closeTaskNotesModal(): void {
    this.taskNotesModalTarget = null;
    this.taskNotesModalTitle = 'Notes';
  }

  sentenceVisualReference(sentence: QuranSentenceStructureSentence, sentenceIndex: number): string {
    const ayah = this.sentenceAyahsForStudy[sentenceIndex] ?? null;
    const surahNo = ayah?.surah ?? this.numberFromUnknown(this.state.selectedSurah);
    const ayahNo = ayah?.ayah ?? Math.max(1, Math.trunc(sentence.sentence_order || sentenceIndex + 1));
    const surahName = this.resolveSurahName(surahNo);

    if (surahName && surahNo != null) return `${surahName} ${surahNo}:${ayahNo}`;
    if (surahNo != null) return `Surah ${surahNo}:${ayahNo}`;
    return `Sentence #${Math.max(1, Math.trunc(sentence.sentence_order || sentenceIndex + 1))}`;
  }

  toggleSentenceSection(sentence: QuranSentenceStructureSentence, section: 'main' | 'expansion'): void {
    const key = this.sentenceSectionKey(sentence, section);
    if (this.expandedSentenceSectionKeys.has(key)) {
      this.expandedSentenceSectionKeys.delete(key);
      return;
    }
    this.expandedSentenceSectionKeys.add(key);
  }

  isSentenceSectionExpanded(sentence: QuranSentenceStructureSentence, section: 'main' | 'expansion'): boolean {
    return this.expandedSentenceSectionKeys.has(this.sentenceSectionKey(sentence, section));
  }

  private sentenceSectionKey(sentence: QuranSentenceStructureSentence, section: 'main' | 'expansion'): string {
    const order = Math.max(1, Math.trunc(sentence.sentence_order || 1));
    return `${order}:${section}`;
  }

  sentenceSegmentLabel(component: string): string {
    const normalized = this.textFromUnknown(component)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return 'Component';
    return normalized.toUpperCase();
  }

  sentenceSegmentDescription(segment: QuranSentenceStructureSegment): string {
    const role = this.textFromUnknown(segment.role).trim();
    if (role) return role;

    const pattern = this.textFromUnknown(segment.pattern).trim();
    if (pattern) return pattern;

    const grammar = Array.isArray(segment.grammar)
      ? segment.grammar.map((entry) => this.textFromUnknown(entry).trim()).filter(Boolean)
      : [];
    if (grammar.length) return grammar.join(' • ');

    return 'Structured sentence component.';
  }

  sentenceSegmentDescriptionIsArabic(segment: QuranSentenceStructureSegment): boolean {
    const description = this.sentenceSegmentDescription(segment);
    return ARABIC_SCRIPT_CHAR_RE.test(description);
  }

  sentenceSegmentTags(segment: QuranSentenceStructureSegment): string[] {
    const out = new Set<string>();

    const pattern = this.textFromUnknown(segment.pattern).trim();
    if (pattern) out.add(pattern);

    for (const item of segment.grammar ?? []) {
      const value = this.textFromUnknown(item).trim();
      if (value) out.add(value);
      if (out.size >= 4) break;
    }

    return Array.from(out);
  }

  sentenceSegmentTone(segment: QuranSentenceStructureSegment, segmentIndex: number, isExpansion = false): string {
    const component = this.textFromUnknown(segment.component).toLowerCase();
    if (component.includes('main')) return 'gold';
    if (component.includes('cause') || component.includes('reason')) return 'amber';
    if (component.includes('clarif') || component.includes('explain') || component.includes('detail')) return 'cyan';
    if (component.includes('before') || component.includes('prior') || component.includes('state')) return 'rose';
    if (component.includes('result') || component.includes('effect')) return 'mint';
    if (component.includes('coordination') || component.includes('link')) return 'amber';
    if (component.includes('preposition') || component.includes('attachment')) return 'cyan';
    return isExpansion ? 'slate' : segmentIndex === 0 ? 'gold' : 'slate';
  }

  comprehensionQuestionKey(groupIndex: number, questionIndex: number): string {
    return `q_${this.comprehensionQuestionOrdinal(groupIndex, questionIndex)}`;
  }

  comprehensionQuestionTarget(groupIndex: number, questionIndex: number): TargetRef | null {
    const unitId = this.studyUnitId;
    if (!unitId) return null;

    const ordinal = this.comprehensionQuestionOrdinal(groupIndex, questionIndex);
    const itemKey = `q_${ordinal}`;
    const refText = `${this.studyRangeRef} • Q#${ordinal}`;

    try {
      return makeTaskItemTarget(unitId, 'comprehension', itemKey, refText);
    } catch {
      return null;
    }
  }

  toggleComprehensionItemNotes(groupIndex: number, questionIndex: number): void {
    const key = this.comprehensionQuestionKey(groupIndex, questionIndex);

    if (this.activeComprehensionNoteKey === key) {
      this.activeComprehensionNoteKey = '';
      this.activeComprehensionNoteTarget = null;
      return;
    }

    this.activeComprehensionNoteKey = key;
    this.activeComprehensionNoteTarget = this.comprehensionQuestionTarget(groupIndex, questionIndex);
  }

  get morphologyWordTarget(): TargetRef | null {
    const parts = this.morphologyDialogLocationParts;
    if (parts.surah == null || parts.ayah == null || parts.tokenIndex == null) {
      return null;
    }

    try {
      return makeWordTarget(parts.surah, parts.ayah, parts.tokenIndex);
    } catch {
      return null;
    }
  }

  toggleMorphologyWordNotesModal(): void {
    if (!this.morphologyWordTarget) {
      this.showMorphologyWordNotesModal = false;
      return;
    }

    this.showMorphologyWordNotesModal = !this.showMorphologyWordNotesModal;
  }

  closeMorphologyWordNotesModal(): void {
    this.showMorphologyWordNotesModal = false;
  }

  ngOnInit() {
    const stored = this.readStoredFontSize();
    if (stored != null) {
      this.fontRem = stored;
    }

    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        if (!this.facadeReady) return;
        this.applyRouteParams(params);
      })
    );

    void this.facade
      .init()
      .then(() => {
        this.facadeReady = true;
        this.applyRouteParams(this.route.snapshot.queryParamMap);
        this.syncPageHeaderTabs();
      })
      .catch(() => {
        // state.statusMessage is set by facade
      })
      .finally(() => {
        this.ready = true;
      });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.pageHeader.clearTabs();
    this.facade.destroy();
  }

  onSentenceTabChange(tab: AppTabItem) {
    const sub = tab.id as SentenceSubTab;
    if (!this.isSentenceSubTab(sub)) return;
    this.facade.selectSentenceSubTab(sub, false);
    this.syncQueryParams({ sub });
  }

  passageSectionDomId(id: string): string {
    const safe = id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    return `kmap-section-${safe || 'unknown'}`;
  }

  isPassageSectionCollapsed(id: string): boolean {
    return this.collapsedPassageSectionIds.has(id);
  }

  togglePassageSection(id: string): void {
    if (this.collapsedPassageSectionIds.has(id)) {
      this.collapsedPassageSectionIds.delete(id);
      return;
    }
    this.collapsedPassageSectionIds.add(id);
  }

  collapseAllPassageSections(): void {
    for (const section of this.passageStructureSections) {
      this.collapsedPassageSectionIds.add(section.id);
    }
  }

  expandAllPassageSections(): void {
    this.collapsedPassageSectionIds.clear();
  }

  scrollToPassageSection(sectionId: string): void {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(this.passageSectionDomId(sectionId));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }

  selectReadingWord(token: ReadingWordToken) {
    const location = token.location.trim();
    if (!location) return;
    if (this.selectedReadingWord?.location === location) {
      this.selectedReadingWord = null;
      return;
    }
    this.selectedReadingWord = {
      text: token.text,
      location,
      surah: token.surah,
      ayah: token.ayah,
      tokenIndex: token.tokenIndex,
    };
  }

  onReadingWordKeydown(event: KeyboardEvent, token: ReadingWordToken) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectReadingWord(token);
  }

  isReadingWordSelected(location: string): boolean {
    return this.selectedReadingWord?.location === location;
  }

  clearReadingWordSelection() {
    this.selectedReadingWord = null;
  }

  onMorphologyPillSelect(pill: AppPillItem) {
    const item = this.findMorphologyItemByPill(pill);
    if (!item) return;
    const selection = this.buildMorphologySelection(item);
    if (!selection) return;
    this.morphologyDialogWord = selection;
  }

  closeMorphologyWordDialog() {
    this.morphologyDialogWord = null;
    this.showMorphologyWordNotesModal = false;
  }

  setDialogViewMode(mode: 'context' | 'analysis') {
    this.dialogViewMode = mode;
  }

  toggleDialogTranslation() {
    this.showDialogTranslation = !this.showDialogTranslation;
  }

  increaseFont() {
    this.fontRem = Math.min(this.fontRem + 0.1, this.maxFontRem);
    this.persistFontSize();
  }

  decreaseFont() {
    this.fontRem = Math.max(this.fontRem - 0.1, this.minFontRem);
    this.persistFontSize();
  }

  resetFont() {
    this.fontRem = 1.35;
    this.persistFontSize();
  }

  formatJson(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'No task data available.';
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }

  isDialogTokenSelected(surah: number, ayah: number, tokenIndex: number): boolean {
    const parsed = this.morphologyDialogLocationParts;
    if (parsed.surah == null || parsed.ayah == null || parsed.tokenIndex == null) return false;
    return parsed.surah === surah && parsed.ayah === ayah && parsed.tokenIndex === tokenIndex;
  }

  dialogTokenPos(surah: number, ayah: number, tokenIndex: number): string {
    const record = this.findMorphologyRecordByLocation(surah, ayah, tokenIndex);
    if (!record) return '';
    const pos = this.firstText(record, ['pos', 'pos2']).toLowerCase();
    if (pos === 'noun') return 'N';
    if (pos === 'verb') return 'V';
    if (pos === 'adj') return 'Adj';
    if (pos === 'prep') return 'P';
    if (pos === 'pron') return 'Pr';
    return pos ? pos.slice(0, 3) : '';
  }

  dialogTokenHint(surah: number, ayah: number, tokenIndex: number, fallbackText: string): string {
    const record = this.findMorphologyRecordByLocation(surah, ayah, tokenIndex);
    if (!record) return fallbackText;

    const root = this.firstText(record, ['root_norm', 'root']);
    const form = this.firstText(record, ['verb_form', 'derived_pattern', 'morph_pattern']);
    const meaning = this.translationPrimaryFromRecord(record);
    const pos = this.firstText(record, ['pos', 'pos2']);

    const details: string[] = [];
    if (root) details.push(`Root: ${root}`);
    if (form) details.push(`Form: ${form}`);
    if (pos) details.push(`POS: ${pos}`);
    if (meaning) details.push(`Meaning: ${meaning}`);
    return details.length ? details.join(' | ') : fallbackText;
  }

  toArabicIndicDigits(value: number): string {
    return String(Math.max(0, Math.trunc(value)))
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0) - 48;
        if (code < 0 || code > 9) return ch;
        return ARABIC_INDIC_DIGITS[code];
      })
      .join('');
  }

  toPassageTextSegments(value: string): PassageTextSegment[] {
    if (!value) return [];
    const parts = value.split(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/);
    const segments: PassageTextSegment[] = [];
    for (const part of parts) {
      if (!part) continue;
      segments.push({
        text: part,
        isArabic: ARABIC_SCRIPT_CHAR_RE.test(part),
      });
    }
    return segments;
  }

  morphologyRef(item: Record<string, unknown>): string {
    const location = this.textFromUnknown(item['word_location']);
    if (location) return location;

    const surah = this.numberFromUnknown(item['surah']);
    const ayah = this.numberFromUnknown(item['ayah']);
    const token = this.numberFromUnknown(item['token_index']);
    if (surah != null && ayah != null && token != null) return `${surah}:${ayah}:${token}`;
    if (surah != null && ayah != null) return `${surah}:${ayah}`;
    return '—';
  }

  morphologyWord(item: Record<string, unknown>): string {
    const raw = this.firstText(item, ['surface_ar', 'word', 'text']);
    if (!raw) return '—';
    return this.normalizeMorphologyDisplayText(raw);
  }

  morphologyRoot(item: Record<string, unknown>): string {
    const raw = this.firstText(item, ['root_norm']);
    if (!raw) return '';
    return this.normalizeMorphologyDisplayText(raw);
  }

  private applyRouteParams(params: ParamMap) {
    let task: TaskType | null = null;

    const requestedTask = params.get('task');
    if (requestedTask === 'grammar_concepts') {
      task = 'sentence_structure';
    } else if (requestedTask && this.isTaskType(requestedTask)) {
      task = requestedTask;
    } else {
      const legacyTab = params.get('tab');
      if (legacyTab && LEGACY_STUDY_TAB_MAP[legacyTab]) {
        task = LEGACY_STUDY_TAB_MAP[legacyTab];
      }
    }

    if (task) {
      this.studyActiveTaskTab = task;
      this.facade.selectTaskTab(task, false);
    } else {
      this.studyActiveTaskTab = 'lesson';
    }
    this.closeTaskNotesModal();

    if (this.studyActiveTaskTab !== 'reading') {
      this.clearReadingWordSelection();
    }
    if (this.studyActiveTaskTab !== 'morphology') {
      this.closeMorphologyWordDialog();
    }
    if (this.studyActiveTaskTab !== 'sentence_structure') {
      this.activeSentenceNoteKey = '';
      this.activeSentenceNoteTarget = null;
    }
    if (this.studyActiveTaskTab !== 'comprehension') {
      this.activeComprehensionNoteKey = '';
      this.activeComprehensionNoteTarget = null;
    }

    const sub = params.get('sub');
    if (sub && this.isSentenceSubTab(sub)) {
      this.facade.selectSentenceSubTab(sub, false);
    }

    this.syncPageHeaderTabs();
  }

  private syncPageHeaderTabs() {
    const lessonId = this.route.snapshot.paramMap.get('id');
    if (!lessonId) {
      this.pageHeader.clearTabs();
      return;
    }

    const baseCommands = ['/arabic/quran/lessons', lessonId, 'study'];
    const tabs = STUDY_TASK_TAB_ORDER.map((id) => {
      if (id === 'lesson') {
        return {
          id,
          label: 'Lesson',
          commands: baseCommands,
          queryParams: { task: null, sub: null },
        };
      }

      return {
        id,
        label: this.state.taskTabs.find((tab) => tab.type === id)?.label ?? this.toTitle(id),
        commands: baseCommands,
        queryParams: { task: id, sub: id === 'sentence_structure' ? this.state.sentenceSubTab : null },
      };
    });

    const config: PageHeaderTabsConfig = {
      activeTabId: this.studyActiveTaskTab,
      tabs,
      action: {
        label: 'Edit Lesson',
        commands: ['/arabic/quran/lessons', lessonId, 'edit'],
      },
    };

    this.pageHeader.setTabs(config);
  }

  private syncQueryParams(params: Record<string, string | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isTaskType(value: string): value is TaskType {
    return (
      value === 'reading' ||
      value === 'sentence_structure' ||
      value === 'morphology' ||
      value === 'expressions' ||
      value === 'comprehension' ||
      value === 'passage_structure'
    );
  }

  private isSentenceSubTab(value: string): value is SentenceSubTab {
    return value === 'verses' || value === 'items' || value === 'json';
  }

  private getPassageStructurePayload(): Record<string, unknown> {
    const tab = this.state.taskTabs.find((entry) => entry.type === 'passage_structure');
    if (!tab?.json?.trim()) return {};
    try {
      const parsed = JSON.parse(tab.json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private buildPassageSections(payload: Record<string, unknown>): PassageSectionCard[] {
    const analysis = this.recordFromUnknown(payload['analysis']);
    const rawSections = Array.isArray(analysis?.['sections']) ? analysis['sections'] : [];
    const parsed = rawSections
      .map((entry, index) => this.toPassageSection(entry, index))
      .filter((entry): entry is PassageSectionCard => entry != null);
    if (parsed.length) return parsed;
    return this.buildFallbackPassageSections(payload);
  }

  private toPassageSection(entry: unknown, index: number): PassageSectionCard | null {
    const section = this.recordFromUnknown(entry);
    if (!section) return null;

    const key = this.textFromUnknown(section['key']) || `section_${index + 1}`;
    const data = this.recordFromUnknown(section['data']) ?? {};
    const ui = this.recordFromUnknown(section['ui']);
    const renderer = this.resolvePassageRenderer(this.textFromUnknown(section['renderer']), data);
    const title = this.textFromUnknown(section['title']) || this.toReadableLabel(key);
    const badge = this.textFromUnknown(ui?.['badge']) || this.defaultPassageBadge(renderer);
    const accent = this.resolvePassageAccent({
      key,
      title,
      badge,
      renderer,
      tone: this.textFromUnknown(ui?.['tone']),
    });
    const iconName = this.resolvePassageIcon(this.textFromUnknown(ui?.['icon']), renderer, accent);

    const keyValueRows = renderer === 'keyvalue' ? this.toPassageKeyValueRows(data) : [];
    const clusters = renderer === 'clusters' ? this.toPassageClusters(data, accent) : [];
    const chiasm = renderer === 'chiasm' ? this.toPassageChiasm(data) : null;
    const timeline = renderer === 'timeline' ? this.toPassageTimeline(data) : [];
    const summary = this.pickFirst(data, ['function', 'effect', 'interpretation', 'projection', 'semantic_center', 'purpose']);

    const idSource = this.textFromUnknown(section['id']) || key || `section_${index + 1}`;
    const id = idSource.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');

    return {
      id,
      key,
      title,
      badge,
      renderer,
      accent,
      iconName,
      summary,
      keyValueRows,
      clusters,
      chiasm,
      timeline,
    };
  }

  private resolvePassageRenderer(renderer: string, data: Record<string, unknown>): PassageRenderer {
    const normalized = renderer.trim().toLowerCase();
    if (normalized === 'keyvalue' || normalized === 'clusters' || normalized === 'chiasm' || normalized === 'timeline') {
      return normalized;
    }
    if (Array.isArray(data['clusters'])) return 'clusters';
    if (Array.isArray(data['steps'])) return 'timeline';
    if (this.recordFromUnknown(data['outer_frame']) || this.recordFromUnknown(data['core_axis'])) return 'chiasm';
    return 'keyvalue';
  }

  private defaultPassageBadge(renderer: PassageRenderer): string {
    if (renderer === 'clusters') return 'Clusters';
    if (renderer === 'chiasm') return 'Chiasm';
    if (renderer === 'timeline') return 'Flow';
    return 'Insight';
  }

  private resolvePassageAccent(context: {
    key: string;
    title: string;
    badge: string;
    renderer: PassageRenderer;
    tone: string;
  }): PassageAccent {
    const signal = `${context.key} ${context.title} ${context.badge}`.toLowerCase();
    if (
      signal.includes('providence') ||
      signal.includes('divine') ||
      signal.includes('blessing') ||
      signal.includes('selection') ||
      signal.includes('purpose')
    ) {
      return 'green';
    }
    if (
      signal.includes('conflict') ||
      signal.includes('threat') ||
      signal.includes('enemy') ||
      signal.includes('warning') ||
      signal.includes('jealousy')
    ) {
      return 'orange';
    }
    if (signal.includes('seed') || signal.includes('dream') || signal.includes('narrative')) {
      return 'violet';
    }
    if (signal.includes('time') || signal.includes('temporal') || signal.includes('timeline') || signal.includes('flow')) {
      return 'gray';
    }
    if (signal.includes('discourse') || signal.includes('knowledge') || signal.includes('voice') || signal.includes('lexicon')) {
      return 'blue';
    }

    const tone = context.tone.toLowerCase();
    if (tone === 'success') return 'green';
    if (tone === 'warning' || tone === 'danger') return 'orange';
    if (tone === 'secondary') return 'gray';
    if (tone === 'primary' && context.renderer === 'keyvalue') {
      return signal.includes('seed') ? 'violet' : 'blue';
    }
    return 'blue';
  }

  private resolvePassageIcon(iconName: string, renderer: PassageRenderer, accent: PassageAccent): string {
    const normalized = iconName.trim();
    const aliasMap: Record<string, string> = {
      cilwarning: 'cilBell',
      cillightbulb: 'cilStar',
      cilclock: 'cilCalendar',
      cilswaphorizontal: 'cilShareAll',
      cillistrich: 'cilList',
      ciltransfer: 'cilShareBoxed',
      cilstream: 'cilListNumbered',
      cileducation: 'cilPuzzle',
    };

    const known = new Set([
      'cilSpeech',
      'cilMoon',
      'cilBell',
      'cilStar',
      'cilCalendar',
      'cilShareAll',
      'cilList',
      'cilShareBoxed',
      'cilListNumbered',
      'cilPuzzle',
      'cilLayers',
      'cilTags',
      'cilMap',
      'cilNotes',
      'cilTask',
      'cilDescription',
    ]);

    if (normalized) {
      const mapped = aliasMap[normalized.toLowerCase()];
      if (mapped) return mapped;
      if (known.has(normalized)) return normalized;
    }

    if (renderer === 'clusters') return 'cilTags';
    if (renderer === 'chiasm') return 'cilShareAll';
    if (renderer === 'timeline') return 'cilListNumbered';
    if (accent === 'green') return 'cilStar';
    if (accent === 'orange') return 'cilBell';
    if (accent === 'violet') return 'cilMoon';
    if (accent === 'gray') return 'cilCalendar';
    return 'cilSpeech';
  }

  private toPassageKeyValueRows(data: Record<string, unknown>): PassageKeyValueRow[] {
    const rows: PassageKeyValueRow[] = [];
    for (const [rawKey, value] of Object.entries(data)) {
      const label = this.toReadableLabel(rawKey);
      let text = '';
      let chips: string[] = [];

      if (Array.isArray(value)) {
        chips = this.uniqueChips(this.toPassageChipValues(value));
      } else {
        const nested = this.recordFromUnknown(value);
        if (nested) {
          const textParts: string[] = [];
          for (const [nestedKey, nestedValue] of Object.entries(nested)) {
            if (Array.isArray(nestedValue) || this.recordFromUnknown(nestedValue)) {
              chips.push(...this.toPassageChipValues(nestedValue));
              continue;
            }
            const scalar = this.textFromUnknown(nestedValue);
            if (scalar) textParts.push(`${this.toReadableLabel(nestedKey)}: ${scalar}`);
          }
          text = textParts.join(' • ');
        } else {
          text = this.textFromUnknown(value);
        }
      }

      chips = this.uniqueChips(chips);
      if (!text && !chips.length) continue;
      rows.push({ key: label, text, chips });
    }
    return rows;
  }

  private toPassageClusters(data: Record<string, unknown>, parentAccent: PassageAccent): PassageCluster[] {
    const clusters: PassageCluster[] = [];
    const source = this.objectArray(data['clusters']);

    if (source.length) {
      for (const [index, cluster] of source.entries()) {
        const title = this.firstText(cluster, ['name', 'title', 'label', 'key']) || `Cluster ${index + 1}`;
        let items = this.uniqueChips(this.toPassageChipValues(cluster['items']));

        if (!items.length) {
          const remainder: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(cluster)) {
            if (key === 'name' || key === 'title' || key === 'label' || key === 'key') continue;
            remainder[key] = value;
          }
          items = this.uniqueChips(this.toPassageChipValues(remainder));
        }

        if (!items.length) continue;
        clusters.push({
          title: this.toReadableLabel(title),
          items,
          accent: this.resolveClusterAccent(title, parentAccent),
        });
      }
    }

    if (clusters.length) return clusters;

    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      const items = this.uniqueChips(this.toPassageChipValues(value));
      if (!items.length) continue;
      clusters.push({
        title: this.toReadableLabel(key),
        items,
        accent: this.resolveClusterAccent(key, parentAccent),
      });
    }

    return clusters;
  }

  private toPassageChiasm(data: Record<string, unknown>): PassageChiasmModel | null {
    const outerEntries = this.recordEntriesToLines(this.recordFromUnknown(data['outer_frame']));
    const innerEntries = this.recordEntriesToLines(this.recordFromUnknown(data['inner_frame']));
    const axisEntries = this.recordEntriesToLines(this.recordFromUnknown(data['core_axis']));
    const interpretation = this.textFromUnknown(data['interpretation']);

    if (!outerEntries.length && !innerEntries.length && !axisEntries.length && !interpretation) return null;

    return {
      outerTop: outerEntries[0] || 'Outer frame',
      outerBottom: outerEntries[1] || outerEntries[0] || 'Outer frame',
      innerLeft: innerEntries[0] || 'Inner frame',
      innerRight: innerEntries[1] || innerEntries[0] || 'Inner frame',
      axis: axisEntries[0] || 'Core axis',
      interpretation,
    };
  }

  private toPassageTimeline(data: Record<string, unknown>): PassageTimelineStep[] {
    const source = Array.isArray(data['steps']) ? data['steps'] : [];
    const steps: PassageTimelineStep[] = [];

    for (const [index, raw] of source.entries()) {
      const record = this.recordFromUnknown(raw);
      if (!record) {
        const text = this.textFromUnknown(raw);
        if (!text) continue;
        const id = `step_${index + 1}`;
        steps.push({ id, title: `Step ${index + 1}`, text });
        continue;
      }

      const stepKey = this.textFromUnknown(record['key']) || `step_${index + 1}`;
      const title = this.textFromUnknown(record['title']) || this.toReadableLabel(stepKey);
      const text =
        this.pickFirst(record, ['text', 'value', 'description', 'detail', 'summary']) ||
        this.textFromUnknown(record['label']) ||
        title;
      const id = `${stepKey}_${index + 1}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      steps.push({ id, title, text });
    }

    if (steps.length) return steps;

    for (const [index, ayah] of this.selectedAyahs.slice(0, 7).entries()) {
      const detail = this.ayahTranslationText(ayah) || this.resolveReadingAyahText(ayah);
      steps.push({
        id: `ayah_${ayah.ayah}`,
        title: `Ayah ${ayah.ayah}`,
        text: detail || `Verse ${index + 1}`,
      });
    }
    return steps;
  }

  private buildFallbackPassageSections(payload: Record<string, unknown>): PassageSectionCard[] {
    const lessonContextRows: PassageKeyValueRow[] = [
      { key: 'Passage', text: this.passageReferenceBadge, chips: [] },
      { key: 'Heading', text: this.lessonHeading, chips: [] },
      { key: 'Overview', text: this.lessonDetail, chips: [] },
      { key: 'Scene', text: this.sceneDetail, chips: [] },
      { key: 'Aesthetic', text: this.sceneAesthetic, chips: [] },
    ];

    const clusters = this.toPassageClusters(payload, 'blue');
    const timeline = this.toPassageTimeline(payload);

    return [
      {
        id: 'passage_context',
        key: 'passage_context',
        title: 'Passage Context',
        badge: 'Context',
        renderer: 'keyvalue',
        accent: 'blue',
        iconName: 'cilSpeech',
        summary: '',
        keyValueRows: lessonContextRows.filter((row) => row.text.trim().length > 0),
        clusters: [],
        chiasm: null,
        timeline: [],
      },
      {
        id: 'passage_flow',
        key: 'passage_flow',
        title: 'Passage Flow',
        badge: 'Flow',
        renderer: timeline.length ? 'timeline' : 'clusters',
        accent: 'gray',
        iconName: timeline.length ? 'cilListNumbered' : 'cilTags',
        summary: '',
        keyValueRows: [],
        clusters: timeline.length ? [] : clusters,
        chiasm: null,
        timeline,
      },
    ];
  }

  private pruneCollapsedPassageSections(sections: PassageSectionCard[]): void {
    const allowed = new Set(sections.map((section) => section.id));
    for (const id of Array.from(this.collapsedPassageSectionIds)) {
      if (!allowed.has(id)) {
        this.collapsedPassageSectionIds.delete(id);
      }
    }
  }

  private buildComprehensionQuestionGroups(source: unknown): ComprehensionQuestionGroup[] {
    const payload = this.recordFromUnknown(source);
    const questionRoot = this.recordFromUnknown(payload?.['questions']) ?? payload;
    if (!questionRoot) return [];

    const ignoredKeys = new Set(['surah', 'verses', 'task_type', 'schema_version', 'title', 'subtitle']);
    const availableKeys = Object.keys(questionRoot).filter((key) => {
      if (!key || ignoredKeys.has(key)) return false;
      const value = questionRoot[key];
      return (
        Array.isArray(value) ||
        this.recordFromUnknown(value) != null ||
        (typeof value === 'string' && value.trim().length > 0)
      );
    });

    if (!availableKeys.length) return [];

    const preferredOrder = new Set<string>(COMPREHENSION_GROUP_ORDER);
    const orderedKeys = [
      ...COMPREHENSION_GROUP_ORDER.filter((key) => availableKeys.includes(key)),
      ...availableKeys.filter((key) => !preferredOrder.has(key)),
    ];

    const groups: ComprehensionQuestionGroup[] = [];
    for (const key of orderedKeys) {
      const questions = this.toQuestionList(questionRoot[key]);
      if (!questions.length) continue;

      const id = key.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      groups.push({
        id: id || `group_${groups.length + 1}`,
        key,
        title: this.comprehensionGroupTitle(key),
        accent: this.resolveComprehensionAccent(key),
        questions,
      });
    }

    return groups;
  }

  private comprehensionGroupTitle(key: string): string {
    const normalized = key.trim().toLowerCase();
    if (normalized === 'comprehension') return 'Core Comprehension';
    if (normalized === 'reflective') return 'Reflective Inquiry';
    if (normalized === 'analytical') return 'Analytical Inquiry';
    if (normalized === 'morphological') return 'Morphological Focus';
    if (normalized === 'grammatical') return 'Grammatical Focus';
    return this.toReadableLabel(key);
  }

  private resolveComprehensionAccent(key: string): PassageAccent {
    const normalized = key.trim().toLowerCase();
    if (normalized === 'reflective') return 'green';
    if (normalized === 'analytical') return 'violet';
    if (normalized === 'morphological') return 'orange';
    if (normalized === 'grammatical') return 'gray';
    return 'blue';
  }

  private toQuestionList(value: unknown): string[] {
    if (Array.isArray(value)) {
      const items = value.flatMap((entry) => this.toQuestionList(entry));
      return this.uniqueTexts(items, 80);
    }

    const record = this.recordFromUnknown(value);
    if (record) {
      const direct = this.pickFirst(record, ['question', 'prompt', 'text', 'value', 'label']);
      if (direct) return [direct];
      const nested = Object.values(record).flatMap((entry) => this.toQuestionList(entry));
      return this.uniqueTexts(nested, 80);
    }

    const scalar = this.textFromUnknown(value);
    if (!scalar) return [];
    return [scalar];
  }

  private comprehensionQuestionOrdinal(groupIndex: number, questionIndex: number): number {
    let offset = 0;
    for (let index = 0; index < groupIndex; index += 1) {
      offset += this.comprehensionQuestionGroups[index]?.questions?.length ?? 0;
    }
    return offset + questionIndex + 1;
  }

  private uniqueTexts(values: string[], limit = 80): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of values) {
      const text = entry.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
      if (result.length >= limit) break;
    }
    return result;
  }

  private buildExpressionStudyCards(source: unknown): ExpressionStudyCard[] {
    let entries: Array<Record<string, unknown>> = [];
    const sourceArray = Array.isArray(source) ? this.objectArray(source) : [];
    if (sourceArray.length) {
      entries = sourceArray;
    } else {
      const payload = this.recordFromUnknown(source);
      if (payload) {
        const fromUExpressions = this.objectArray(payload['u_expressions']);
        const fromExpressions = this.objectArray(payload['expressions']);
        const fromItems = this.objectArray(payload['items']);
        if (fromUExpressions.length) entries = fromUExpressions;
        else if (fromExpressions.length) entries = fromExpressions;
        else if (fromItems.length) entries = fromItems;
        if (!entries.length) {
          const isSingleExpression =
            this.textFromUnknown(payload['canonical_input']) ||
            this.textFromUnknown(payload['text_ar']) ||
            this.textFromUnknown(payload['ar_u_expression']);
          if (isSingleExpression) {
            entries = [payload];
          }
        }
      }
    }

    return entries
      .map((entry, index) => this.toExpressionStudyCard(entry, index))
      .filter((entry): entry is ExpressionStudyCard => entry != null);
  }

  private toExpressionStudyCard(entry: Record<string, unknown>, index: number): ExpressionStudyCard | null {
    const canonicalInput = this.firstText(entry, ['canonical_input']);
    const canonicalTail = canonicalInput.includes('|') ? canonicalInput.split('|').slice(1).join('|').trim() : '';
    const textAr = this.firstText(entry, ['text_ar', 'expression_ar']) || canonicalTail;
    const canonical = canonicalInput || this.firstText(entry, ['ar_u_expression', 'id', 'expression_norm']);

    const meta =
      this.recordFromJsonLike(entry['meta_json']) ??
      this.recordFromJsonLike(entry['meta']) ??
      ({} as Record<string, unknown>);

    const categoryRaw = this.pickFirst(meta, ['category', 'type', 'domain']) || this.firstText(entry, ['category']);
    const statusRaw =
      this.pickFirst(meta, ['scholarly_status', 'status']) || this.firstText(entry, ['scholarly_status', 'status']);
    const category = categoryRaw ? this.toReadableLabel(categoryRaw) : '';
    const status = statusRaw ? this.toReadableLabel(statusRaw) : '';
    const lemma = this.firstText(entry, ['lemma_ar', 'lemma_norm', 'lemma']);

    const label =
      this.firstText(entry, ['label']) ||
      this.firstText(entry, ['ar_u_expression']) ||
      (canonicalInput ? canonicalInput.split('|')[0].trim() : '') ||
      `Expression ${index + 1}`;

    const surah = this.numberFromUnknown(entry['surah']);
    const ayah = this.numberFromUnknown(entry['ayah']);
    const fallbackRef = this.firstText(entry, ['reference', 'verse']);
    const reference = surah != null && ayah != null ? `${surah}:${ayah}` : fallbackRef;

    const sources = this.toExpressionSources(meta['sources'] ?? entry['sources']);
    const sequence = this.toExpressionSequence(entry['sequence_json'] ?? entry['sequence']);
    const accent = this.resolveExpressionAccent({
      category: categoryRaw,
      status: statusRaw,
      label,
    });

    if (!textAr && !canonical && !sources.length && !sequence.length) return null;

    const idSource = this.firstText(entry, ['ar_u_expression', 'id']) || canonical || label || `expr_${index + 1}`;
    const id = idSource.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');

    return {
      id: id || `expr_${index + 1}`,
      label,
      textAr,
      canonical,
      reference,
      category,
      status,
      lemma,
      accent,
      sequence,
      sources,
    };
  }

  private toExpressionSequence(value: unknown): ExpressionSequenceToken[] {
    const source = Array.isArray(value) ? value : this.arrayFromJsonLike(value);
    const steps: ExpressionSequenceToken[] = [];

    for (const raw of source) {
      const record = this.recordFromUnknown(raw);
      if (record) {
        const text = this.pickFirst(record, ['token', 'text', 'value', 'label']);
        const type = this.pickFirst(record, ['type', 'role', 'pos']);
        if (!text) continue;
        steps.push({
          text,
          type: type ? this.toReadableLabel(type) : '',
        });
        continue;
      }

      const scalar = this.textFromUnknown(raw);
      if (!scalar) continue;
      steps.push({ text: scalar, type: '' });
    }

    return this.uniqueTexts(steps.map((step) => `${step.text}||${step.type}`), 16)
      .map((entry) => {
        const [text, type] = entry.split('||');
        return { text, type };
      })
      .filter((entry) => Boolean(entry.text));
  }

  private toExpressionSources(value: unknown): ExpressionSource[] {
    const source = Array.isArray(value) ? value : this.arrayFromJsonLike(value);
    const items: ExpressionSource[] = [];
    for (const raw of source) {
      const record = this.recordFromUnknown(raw);
      if (record) {
        const author = this.pickFirst(record, ['author', 'name']);
        const work = this.pickFirst(record, ['work', 'title', 'source']);
        if (!author && !work) continue;
        items.push({ author: author || 'Source', work: work || 'Untitled' });
        continue;
      }

      const scalar = this.textFromUnknown(raw);
      if (!scalar) continue;
      items.push({ author: 'Source', work: scalar });
    }

    return this.uniqueTexts(items.map((item) => `${item.author}||${item.work}`), 8)
      .map((entry) => {
        const [author, work] = entry.split('||');
        return { author: author || 'Source', work: work || 'Untitled' };
      })
      .filter((entry) => Boolean(entry.author) || Boolean(entry.work));
  }

  private resolveExpressionAccent(context: { category: string; status: string; label: string }): PassageAccent {
    const signal = `${context.category} ${context.status} ${context.label}`.toLowerCase();
    if (
      signal.includes('conflict') ||
      signal.includes('enemy') ||
      signal.includes('anthropological') ||
      signal.includes('threat')
    ) {
      return 'orange';
    }
    if (signal.includes('divine') || signal.includes('election') || signal.includes('providence')) {
      return 'green';
    }
    if (signal.includes('narrative') || signal.includes('story') || signal.includes('superlative')) {
      return 'violet';
    }
    if (signal.includes('grammar') || signal.includes('morphology') || signal.includes('form')) {
      return 'gray';
    }
    return 'blue';
  }

  private recordEntriesToLines(record: Record<string, unknown> | null): string[] {
    if (!record) return [];
    const lines: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      const valueText = this.valueToPassageText(value);
      if (key && valueText) {
        lines.push(`${key} · ${valueText}`);
      } else if (valueText) {
        lines.push(valueText);
      } else if (key) {
        lines.push(key);
      }
    }
    return lines;
  }

  private valueToPassageText(value: unknown): string {
    const scalar = this.textFromUnknown(value);
    if (scalar) return scalar;
    const chips = this.uniqueChips(this.toPassageChipValues(value));
    if (!chips.length) return '';
    return chips.join(', ');
  }

  private toPassageChipValues(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((entry) => this.toPassageChipValues(entry));
    }

    const record = this.recordFromUnknown(value);
    if (record) {
      const chips: string[] = [];
      for (const [key, nested] of Object.entries(record)) {
        if (Array.isArray(nested) || this.recordFromUnknown(nested)) {
          chips.push(...this.toPassageChipValues(nested));
          continue;
        }
        const scalar = this.textFromUnknown(nested);
        if (scalar) chips.push(`${this.toReadableLabel(key)}: ${scalar}`);
      }
      return chips;
    }

    const scalar = this.textFromUnknown(value);
    if (!scalar) return [];
    return [scalar];
  }

  private uniqueChips(values: string[]): string[] {
    const seen = new Set<string>();
    const chips: string[] = [];
    for (const entry of values) {
      const text = entry.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      chips.push(text);
      if (chips.length >= 20) break;
    }
    return chips;
  }

  private resolveClusterAccent(name: string, fallback: PassageAccent): PassageAccent {
    const signal = name.toLowerCase();
    if (signal.includes('knowledge') || signal.includes('sign') || signal.includes('discourse') || signal.includes('lex')) {
      return 'blue';
    }
    if (signal.includes('selection') || signal.includes('providence') || signal.includes('divine') || signal.includes('blessing')) {
      return 'green';
    }
    if (signal.includes('conflict') || signal.includes('threat') || signal.includes('enemy') || signal.includes('jealous')) {
      return 'orange';
    }
    if (signal.includes('seed') || signal.includes('dream') || signal.includes('narrative')) {
      return 'violet';
    }
    if (signal.includes('time') || signal.includes('flow') || signal.includes('structure')) {
      return 'gray';
    }
    return fallback;
  }

  private toReadableLabel(raw: string): string {
    return raw
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private recordFromUnknown(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private recordFromJsonLike(value: unknown): Record<string, unknown> | null {
    const direct = this.recordFromUnknown(value);
    if (direct) return direct;
    if (typeof value !== 'string') return null;
    const parsed = this.parseTaskJsonUnknown(value);
    return this.recordFromUnknown(parsed);
  }

  private arrayFromJsonLike(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    const parsed = this.parseTaskJsonUnknown(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  private parseTaskJsonUnknown(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  private parseTaskJsonObject(raw: string): Record<string, unknown> {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private toSentenceStructureSentence(value: unknown, index: number): QuranSentenceStructureSentence | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const canonicalSentence = this.textFromUnknown(record['canonical_sentence']) || this.textFromUnknown(record['text']);
    const summary = this.toSentenceStructureSummary(record['structure_summary'], canonicalSentence);
    const sentenceOrder = this.numberFromUnknown(record['sentence_order']) ?? index + 1;

    return {
      sentence_order: sentenceOrder,
      structure_summary: summary,
    };
  }

  private toSentenceStructureSummary(raw: unknown, fallbackText: string): QuranSentenceStructureSummary {
    let summaryRecord: Record<string, unknown> | null = null;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      summaryRecord = raw as Record<string, unknown>;
    }

    const fullText = this.textFromUnknown(summaryRecord?.['full_text']) || fallbackText;
    const rawComponents = Array.isArray(summaryRecord?.['main_components']) ? summaryRecord['main_components'] : [];
    const mainComponents = rawComponents
      .map((item, index) => this.toSentenceStructureSegment(item, index))
      .filter((item): item is QuranSentenceStructureSegment => item != null);
    const rawExpansions = Array.isArray(summaryRecord?.['expansions']) ? summaryRecord['expansions'] : [];
    const expansionComponents = rawExpansions
      .map((item, index) => this.toSentenceStructureExpansionSegment(item, index))
      .filter((item): item is QuranSentenceStructureSegment => item != null);

    if (!mainComponents.length && fullText) {
      mainComponents.push({
        component: 'Sentence',
        text: fullText,
        pattern: '',
        role: '',
        grammar: [],
      });
    }

    return {
      full_text: fullText,
      main_components: mainComponents,
      expansions: expansionComponents,
    };
  }

  private toSentenceStructureExpansionSegment(raw: unknown, index: number): QuranSentenceStructureSegment | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const component = this.textFromUnknown(record['type']) || `Expansion ${index + 1}`;
    const text = this.textFromUnknown(record['text']);
    const pattern = this.textFromUnknown(record['pattern']);
    const role = this.textFromUnknown(record['function']) || this.textFromUnknown(record['role']);
    const grammarRaw = Array.isArray(record['grammar']) ? record['grammar'] : [];
    const grammar = grammarRaw.map((item) => this.textFromUnknown(item)).filter((item) => Boolean(item));

    return {
      component,
      text: text || component,
      pattern,
      role,
      grammar,
    };
  }

  private toSentenceStructureSegment(raw: unknown, index: number): QuranSentenceStructureSegment | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const component = this.textFromUnknown(record['component']) || `Component ${index + 1}`;
    const text = this.textFromUnknown(record['text']);
    const pattern = this.textFromUnknown(record['pattern']);
    const role = this.textFromUnknown(record['role']);
    const grammarRaw = Array.isArray(record['grammar']) ? record['grammar'] : [];
    const grammar = grammarRaw.map((item) => this.textFromUnknown(item)).filter((item) => Boolean(item));

    return {
      component,
      text: text || component,
      pattern,
      role,
      grammar,
    };
  }

  private stripArabicDiacritics(value: string): string {
    return value.replace(ARABIC_DIACRITICS_RE, '').trim();
  }

  private splitWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  private asFiniteNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  private get storageKey(): string {
    const lessonId = this.state.lessonId ?? this.route.snapshot.paramMap.get('id') ?? 'global';
    return `km:quran:study-font:${lessonId}`;
  }

  private readStoredFontSize(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return null;
      if (parsed < this.minFontRem || parsed > this.maxFontRem) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private persistFontSize() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(this.storageKey, String(this.fontRem));
    } catch {
      // localStorage may be unavailable in restricted environments.
    }
  }

  private getReadingSourceAyahs() {
    const payload = this.readingTaskPayload;
    const from = this.asFiniteNumber(payload['ayah_from']);
    const to = this.asFiniteNumber(payload['ayah_to']);
    if (from == null || to == null) {
      return this.selectedAyahs;
    }
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    return this.selectedAyahs.filter((ayah) => ayah.ayah >= min && ayah.ayah <= max);
  }

  private resolveReadingAyahText(ayah: QuranAyah): string {
    const original = (ayah.text_uthmani || ayah.text || '').trim();
    const strippedOriginal = this.stripArabicDiacritics(original);
    const simple = (ayah.text_simple || ayah.text_imlaei_simple || '').trim().replace(/\s+/g, ' ');
    const simpleWords = this.splitWords(simple).length;
    const originalWords = this.splitWords(strippedOriginal).length;

    if (simple && (originalWords <= 1 || simpleWords >= Math.max(2, Math.ceil(originalWords * 0.6)))) {
      return simple;
    }

    return strippedOriginal || simple || original;
  }

  private morphologyPos(item: Record<string, unknown>): 'noun' | 'verb' | null {
    const posRaw = this.firstText(item, ['pos', 'pos2']).toLowerCase();
    if (posRaw === 'noun' || posRaw === 'adj') return 'noun';
    if (posRaw === 'verb') return 'verb';
    return null;
  }

  private firstText(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = this.textFromUnknown(item[key]);
      if (value) return value;
    }
    return '';
  }

  private textFromUnknown(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  private numberFromUnknown(value: unknown): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.trunc(numeric);
  }

  private resolveSurahName(surah: number | null): string {
    const target = surah ?? this.numberFromUnknown(this.state.selectedSurah);
    if (target == null) return '';
    const fromAyah = this.selectedAyahs.find((ayah) => ayah.surah === target);
    const name = (fromAyah?.surah_name_en || '').trim();
    if (name) return name;
    return String(target);
  }

  private get dialogRangeCompact(): string {
    const raw = this.rangeLabelShort?.trim();
    if (!raw) return '';
    const match = raw.match(/^Surah\s+(\d+)\s+(.+)$/i);
    if (!match) return raw;
    return `${match[1]}:${match[2].replace('-', '–')}`;
  }

  private get dialogNarrativeLabel(): string {
    const subtype = this.state.lessonSubtype?.trim();
    if (subtype) return this.toTitle(subtype);

    const heading = this.lessonHeading?.trim();
    if (!heading) return '';
    if (heading.length <= 32) return heading;
    return '';
  }

  private get morphologyDialogLocationParts(): StudyWordLocationParts {
    return this.parseWordLocation(this.morphologyDialogWord?.location ?? '', this.morphologyDialogWord);
  }

  private parseWordLocation(
    location: string,
    fallback?: { surah?: number | null; ayah?: number | null; tokenIndex?: number | null } | null
  ): StudyWordLocationParts {
    const text = this.textFromUnknown(location);
    if (text) {
      const segments = text
        .split(':')
        .map((part) => part.trim())
        .filter(Boolean);
      if (segments.length >= 2) {
        const surah = this.numberFromUnknown(segments[0]);
        const ayah = this.numberFromUnknown(segments[1]);
        const tokenIndex = this.numberFromUnknown(segments[2]);
        if (surah != null && ayah != null) {
          return { surah, ayah, tokenIndex };
        }
      }
    }

    return {
      surah: this.numberFromUnknown(fallback?.surah),
      ayah: this.numberFromUnknown(fallback?.ayah),
      tokenIndex: this.numberFromUnknown(fallback?.tokenIndex),
    };
  }

  private ayahTranslationText(ayah: QuranAyah): string {
    const direct = (ayah.translation || '').trim();
    if (direct) return direct;

    const translations = ayah.translations;
    if (!translations) return '';
    const candidates = [translations.haleem, translations.sahih, translations.asad, translations.usmani];
    for (const item of candidates) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
    return '';
  }

  private translationPrimaryFromRecord(record: Record<string, unknown>): string {
    const translation = record['translation'];
    if (typeof translation === 'string') return translation.trim();
    if (!translation || typeof translation !== 'object' || Array.isArray(translation)) return '';
    const primary = (translation as Record<string, unknown>)['primary'];
    return this.textFromUnknown(primary);
  }

  private findMorphologyRecordByLocation(surah: number, ayah: number, tokenIndex: number): Record<string, unknown> | null {
    const target = `${surah}:${ayah}:${tokenIndex}`;
    for (const item of this.morphologyItems) {
      const direct = this.textFromUnknown(item['word_location']);
      if (direct && direct === target) return item;

      const itemSurah = this.numberFromUnknown(item['surah']);
      const itemAyah = this.numberFromUnknown(item['ayah']);
      const itemToken = this.numberFromUnknown(item['token_index']);
      if (itemSurah === surah && itemAyah === ayah && itemToken === tokenIndex) {
        return item;
      }
    }
    return null;
  }

  private toMorphologyPills(items: Array<Record<string, unknown>>, prefix: 'noun' | 'verb'): AppPillItem[] {
    return items.map((item, index) => {
      const ref = this.morphologyRef(item);
      const root = this.morphologyRoot(item);
      return {
        id: this.morphologyPillId(item, index, prefix),
        primary: this.morphologyWord(item),
        secondary: root || undefined,
      };
    });
  }

  private morphologyPillId(item: Record<string, unknown>, index: number, prefix: 'noun' | 'verb'): string {
    const ref = this.morphologyRef(item);
    return ref === '—' ? `${prefix}-${index}` : `${prefix}-${ref}-${index}`;
  }

  private findMorphologyItemByPill(pill: AppPillItem): Record<string, unknown> | null {
    const pillId = pill.id == null ? '' : String(pill.id);
    if (pillId) {
      for (let index = 0; index < this.nounMorphologyItems.length; index += 1) {
        const item = this.nounMorphologyItems[index];
        if (this.morphologyPillId(item, index, 'noun') === pillId) return item;
      }
      for (let index = 0; index < this.verbMorphologyItems.length; index += 1) {
        const item = this.verbMorphologyItems[index];
        if (this.morphologyPillId(item, index, 'verb') === pillId) return item;
      }
    }

    const primary = pill.primary.trim();
    const secondary = (pill.secondary ?? '').trim();
    const fallbackMatch = this.morphologyItems.find((entry) => {
      const word = this.morphologyWord(entry);
      const root = this.morphologyRoot(entry);
      return word === primary && root === secondary;
    });
    return fallbackMatch ?? null;
  }

  private buildMorphologySelection(item: Record<string, unknown>): QuranWordInspectorSelection | null {
    const text =
      this.morphologyWord(item) !== '—'
        ? this.morphologyWord(item)
        : this.firstText(item, ['surface_ar', 'lemma_ar', 'surface_norm', 'word', 'text']);
    if (!text) return null;

    const surah = this.numberFromUnknown(item['surah']);
    const ayah = this.numberFromUnknown(item['ayah']);
    const tokenIndex = this.numberFromUnknown(item['token_index']);
    const location = this.resolveMorphologyLocation(item, surah, ayah, tokenIndex);

    return {
      text,
      location: location || text,
      surah,
      ayah,
      tokenIndex,
    };
  }

  private resolveMorphologyLocation(
    item: Record<string, unknown>,
    surah: number | null,
    ayah: number | null,
    tokenIndex: number | null
  ): string {
    const direct = this.textFromUnknown(item['word_location']);
    if (direct) return direct;
    if (surah != null && ayah != null && tokenIndex != null) return `${surah}:${ayah}:${tokenIndex}`;
    if (surah != null && ayah != null) return `${surah}:${ayah}`;
    return '';
  }

  private normalizeMorphologyDisplayText(value: string): string {
    const stripped = this.stripArabicDiacritics(value);
    return stripped || value.trim();
  }

  private objectArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)) as Array<Record<string, unknown>>;
  }

  private pickFirst(payload: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        const text = ['text', 'value', 'label', 'title', 'description']
          .map((nestedKey) => nested[nestedKey])
          .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
        if (text) return text.trim();
      }
    }
    return '';
  }

  private toTitle(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
