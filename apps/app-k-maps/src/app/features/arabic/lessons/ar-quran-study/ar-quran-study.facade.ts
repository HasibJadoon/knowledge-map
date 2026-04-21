import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  chatbubbleEllipsesOutline,
  flashOutline,
  gitNetworkOutline,
  listOutline,
  listSharp,
  sparklesOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';

import { environment } from '../../../../../environments/environment';
import {
  QuranLesson,
  QuranLessonSentence,
  getQuranSentenceArabic,
  getQuranSentenceTranslation,
} from '../../../../shared/models/arabic/quran-lesson.model';
import { QuranLessonService } from '../../../../shared/services/quran/quran-lesson.service';

const COMPREHENSION_GROUP_ORDER = [
  'comprehension',
  'reflective',
  'analytical',
  'morphological',
  'grammatical',
] as const;

const ARABIC_SCRIPT_CHAR_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export type StudyTask =
  | 'reading'
  | 'morphology'
  | 'sentence_structure'
  | 'grammar_concepts'
  | 'expressions'
  | 'comprehension'
  | 'passage_structure';

export type PassageAccent = 'blue' | 'green' | 'orange' | 'violet' | 'gray';
export type PassageRenderer = 'keyvalue' | 'clusters' | 'chiasm' | 'timeline';

export type StudyReadingAyah = {
  id: string;
  ayah: number;
  text: string;
  marker: string;
  translation: string;
};

export type StudyMorphologyItem = {
  key: string;
  word: string;
  root: string;
  gloss: string;
  location: string;
};

export type StudySentenceEntry = {
  id: string;
  order: number;
  arabic: string;
  translation: string;
  summary: string;
  components: string[];
};

export type StudyKeyValueRow = {
  key: string;
  text: string;
  chips: string[];
};

export type PassageKeyValueRow = {
  key: string;
  text: string;
  chips: string[];
};

export type PassageCluster = {
  title: string;
  items: string[];
  accent: PassageAccent;
};

export type PassageChiasmModel = {
  outerTop: string;
  outerBottom: string;
  innerLeft: string;
  innerRight: string;
  axis: string;
  interpretation: string;
};

export type PassageTimelineStep = {
  id: string;
  title: string;
  text: string;
};

export type PassageTextSegment = {
  text: string;
  isArabic: boolean;
};

export type PassageSectionCard = {
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

export type ComprehensionQuestionGroup = {
  id: string;
  key: string;
  title: string;
  accent: PassageAccent;
  questions: string[];
};

export type ExpressionSequenceToken = {
  text: string;
  type: string;
};

export type ExpressionSource = {
  author: string;
  work: string;
};

export type ExpressionStudyCard = {
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

@Injectable()
export class ArQuranStudyFacade {
  private readonly quranLessonService = inject(QuranLessonService);
  private readonly http = inject(HttpClient);

  private readonly defaultText: QuranLesson['text'] = {
    arabic_full: [],
    mode: 'original',
  };

  loading = true;
  error = '';
  lesson: QuranLesson | null = null;
  activeTask: StudyTask = 'reading';

  private taskPayloads: Partial<Record<StudyTask, unknown>> = {};
  private readonly collapsedPassageSectionIds = new Set<string>();

  private passageSectionsCacheKey = '';
  private passageSectionsCache: PassageSectionCard[] = [];

  private comprehensionGroupsCacheKey = '';
  private comprehensionGroupsCache: ComprehensionQuestionGroup[] = [];

  private expressionCardsCacheKey = '';
  private expressionCardsCache: ExpressionStudyCard[] = [];

  async loadLesson(lessonId: number): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const lesson = await firstValueFrom(this.quranLessonService.getLesson(lessonId));
      this.lesson = {
        ...lesson,
        text: lesson.text ?? { ...this.defaultText },
      };

      this.taskPayloads = await this.loadTaskPayloads(lessonId);
      this.hydrateFallbackTaskPayloads();
      this.resetCaches();
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson.';
      this.lesson = null;
      this.taskPayloads = {};
      this.resetCaches();
    } finally {
      this.loading = false;
    }
  }

  setActiveTask(task: StudyTask) {
    this.activeTask = task;
  }

  get lessonTitle(): string {
    return this.lesson?.title?.trim() || 'Quran Study';
  }

  get lessonTitleArabic(): string {
    return this.lesson?.title_ar?.trim() || '';
  }

  get lessonSubtitle(): string {
    const reference = this.lesson?.reference;
    const surah = this.numberFromUnknown(reference?.surah);
    const from = this.numberFromUnknown(reference?.ayah_from);
    const to = this.numberFromUnknown(reference?.ayah_to) ?? from;

    if (surah == null || from == null || to == null) {
      return 'Structured study of the selected lesson passage.';
    }

    if (from === to) return `Surah ${surah}, Ayah ${from}`;
    return `Surah ${surah}, Ayah ${from}-${to}`;
  }

  get studyUnitId(): string {
    const fromReference = this.textFromUnknown(this.lesson?.reference?.source_ref_id);
    if (fromReference) return fromReference;

    const fromAyahUnit = this.lesson?.text?.arabic_full
      .map((ayah) => this.textFromUnknown(ayah.unit_id))
      .find((value) => value.length > 0);
    if (fromAyahUnit) return fromAyahUnit;

    return this.textFromUnknown(this.lesson?.id);
  }

  get studyRangeRef(): string {
    const badge = this.passageReferenceBadge.trim();
    if (badge && badge !== '—') return badge;
    return this.lessonSubtitle;
  }

  get hasTaskData(): boolean {
    return Object.keys(this.taskPayloads).length > 0;
  }

  get readingAyahs(): StudyReadingAyah[] {
    const readingPayload = this.recordFromUnknown(this.taskPayloads['reading']);
    const text = this.lesson?.text?.arabic_full ?? [];

    if (!text.length) {
      const readingText = this.textFromUnknown(readingPayload?.['reading_text']);
      if (!readingText) return [];
      return [
        {
          id: 'reading_fallback',
          ayah: 0,
          text: readingText,
          marker: '',
          translation: '',
        },
      ];
    }

    return text.map((ayah) => {
      const marker =
        this.textFromUnknown(ayah.verse_mark)
        || this.textFromUnknown(ayah.verse_full)
        || (ayah.ayah ? `﴿${ayah.ayah}﴾` : '');

      const translation =
        this.textFromUnknown(ayah.translation)
        || this.translationFromMap(ayah.translations)
        || '';

      return {
        id: ayah.unit_id || `${ayah.surah}:${ayah.ayah}`,
        ayah: ayah.ayah,
        text: this.textFromUnknown(ayah.arabic),
        marker,
        translation,
      };
    }).filter((entry) => entry.text.length > 0);
  }

  get morphologyNouns(): StudyMorphologyItem[] {
    return this.morphologyItems.filter((entry) => entry.key === 'noun');
  }

  get morphologyVerbs(): StudyMorphologyItem[] {
    return this.morphologyItems.filter((entry) => entry.key === 'verb');
  }

  get morphologyTaskPayload(): Record<string, unknown> {
    return this.recordFromUnknown(this.taskPayloads['morphology']) ?? {};
  }

  get lexiconMorphologyItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    return this.objectArray(
      payload['lexicon_morphology']
      ?? payload['lexiconMorphology']
      ?? payload['links']
    );
  }

  get morphologyEvidenceItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    return this.objectArray(
      payload['lexicon_evidence']
      ?? payload['lexiconEvidence']
      ?? payload['evidence']
      ?? payload['evidence_items']
    );
  }

  get morphologyRawItems(): Array<Record<string, unknown>> {
    const payload = this.morphologyTaskPayload;
    const items = this.objectArray(payload['items']);
    if (items.length) return items;

    const linked = this.lexiconMorphologyItems;
    if (linked.length) return linked;

    return [
      ...this.objectArray(payload['nouns']),
      ...this.objectArray(payload['verbs']),
    ];
  }

  get sentenceEntries(): StudySentenceEntry[] {
    const payload = this.recordFromUnknown(this.taskPayloads['sentence_structure']);
    const items = this.objectArray(payload?.['items']);

    if (items.length) {
      return items
        .map((entry, index) => this.toSentenceEntry(entry, index))
        .filter((entry): entry is StudySentenceEntry => entry != null)
        .sort((a, b) => a.order - b.order);
    }

    const lessonSentences = Array.isArray(this.lesson?.sentences) ? this.lesson?.sentences : [];

    return lessonSentences
      .map((sentence, index) => this.toSentenceEntryFromLesson(sentence, index))
      .filter((entry): entry is StudySentenceEntry => entry != null)
      .sort((a, b) => a.order - b.order);
  }

  get grammarRows(): StudyKeyValueRow[] {
    const payload = this.recordFromUnknown(this.taskPayloads['grammar_concepts']);
    if (!payload) return [];

    const items = this.objectArray(payload['items']);
    if (items.length) {
      return items
        .map((item, index) => {
          const label = this.firstText(item, ['label', 'title', 'name', 'concept']) || `Concept ${index + 1}`;
          const text = this.pickFirst(item, ['analysis', 'note', 'summary', 'description', 'value']);
          const chips = this.uniqueChips(this.toPassageChipValues(item['examples'] ?? item['tags'] ?? item['signals']));
          if (!text && !chips.length) return null;
          return { key: label, text, chips };
        })
        .filter((entry): entry is StudyKeyValueRow => entry != null);
    }

    return this.toPassageKeyValueRows(payload).map((row) => ({
      key: row.key,
      text: row.text,
      chips: row.chips,
    }));
  }

  get comprehensionQuestionGroups(): ComprehensionQuestionGroup[] {
    const cacheKey = JSON.stringify(this.taskPayloads['comprehension'] ?? null);
    if (cacheKey === this.comprehensionGroupsCacheKey) {
      return this.comprehensionGroupsCache;
    }

    const groups = this.buildComprehensionQuestionGroups(this.taskPayloads['comprehension']);
    this.comprehensionGroupsCacheKey = cacheKey;
    this.comprehensionGroupsCache = groups;
    return groups;
  }

  get comprehensionQuestionTotal(): number {
    return this.comprehensionQuestionGroups.reduce((total, group) => total + group.questions.length, 0);
  }

  get expressionStudyCards(): ExpressionStudyCard[] {
    const cacheKey = JSON.stringify(this.taskPayloads['expressions'] ?? null);
    if (cacheKey === this.expressionCardsCacheKey) {
      return this.expressionCardsCache;
    }

    const cards = this.buildExpressionStudyCards(this.taskPayloads['expressions']);
    this.expressionCardsCacheKey = cacheKey;
    this.expressionCardsCache = cards;
    return cards;
  }

  get passageHeaderTitle(): string {
    const payload = this.passageStructurePayload;
    const analysis = this.recordFromUnknown(payload['analysis']);
    const heading = this.pickFirst(analysis ?? payload, [
      'passage_title',
      'title',
      'heading',
      'study_heading',
    ]);
    return heading || this.lessonTitle;
  }

  get passageHeaderSubtitle(): string {
    const payload = this.passageStructurePayload;
    const analysis = this.recordFromUnknown(payload['analysis']);
    const subtitle = this.pickFirst(analysis ?? payload, [
      'subtitle',
      'description',
      'summary',
      'overview',
    ]);

    return subtitle || 'Structured cognitive map of discourse, conflict, providence, and narrative flow.';
  }

  get passageReferenceBadge(): string {
    const payload = this.passageStructurePayload;
    const scope = this.recordFromUnknown(payload['scope']);
    const ref = this.recordFromUnknown(scope?.['ref']);

    const surah = this.numberFromUnknown(ref?.['surah']) ?? this.numberFromUnknown(this.lesson?.reference?.surah);
    let verses = this.textFromUnknown(ref?.['verses']).replace(/\s+/g, '');

    if (!verses) {
      const from = this.numberFromUnknown(this.lesson?.reference?.ayah_from);
      const to = this.numberFromUnknown(this.lesson?.reference?.ayah_to) ?? from;
      if (from != null && to != null) {
        verses = from === to ? `${from}` : `${from}-${to}`;
      }
    }

    if (verses) verses = verses.replace(/-/g, '–');

    if (surah != null && verses) return `${surah}:${verses}`;
    if (surah != null) return String(surah);
    return '—';
  }

  get passageStructureSections(): PassageSectionCard[] {
    const cacheKey = JSON.stringify(this.taskPayloads['passage_structure'] ?? null);
    if (cacheKey === this.passageSectionsCacheKey) {
      return this.passageSectionsCache;
    }

    const sections = this.buildPassageSections(this.passageStructurePayload);
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

  passageSectionDomId(id: string): string {
    const safe = id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    return `kmap-section-${safe || 'unknown'}`;
  }

  scrollToPassageSection(sectionId: string): void {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(this.passageSectionDomId(sectionId));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }

  resolveSectionIcon(iconName: string, renderer: PassageRenderer, accent: PassageAccent): string {
    const normalized = iconName.trim().toLowerCase();

    const namedMap: Record<string, string> = {
      cilspeech: chatbubbleEllipsesOutline,
      cilmoon: sparklesOutline,
      cilwarning: warningOutline,
      cillightbulb: flashOutline,
      cilclock: timeOutline,
      cilswaphorizontal: gitNetworkOutline,
      cillistrich: listSharp,
      cilstream: listOutline,
    };

    if (normalized && namedMap[normalized]) return namedMap[normalized];

    if (renderer === 'clusters') return listSharp;
    if (renderer === 'chiasm') return gitNetworkOutline;
    if (renderer === 'timeline') return listOutline;
    if (accent === 'green') return sparklesOutline;
    if (accent === 'orange') return warningOutline;
    if (accent === 'violet') return flashOutline;
    if (accent === 'gray') return timeOutline;

    return chatbubbleEllipsesOutline;
  }

  toPassageTextSegments(value: string): PassageTextSegment[] {
    if (!value) return [];

    const parts = value.split(
      /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/
    );

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

  private get morphologyItems(): StudyMorphologyItem[] {
    const payload = this.recordFromUnknown(this.taskPayloads['morphology']) ?? {};
    const rawItems = this.objectArray(payload['items']);

    const itemsFromRows = rawItems
      .map((entry, index) => this.toMorphologyEntry(entry, index))
      .filter((entry): entry is StudyMorphologyItem => entry != null);

    if (itemsFromRows.length) return itemsFromRows;

    const nouns = this.arrayToMorphologyItems(payload['nouns'], 'noun');
    const verbs = this.arrayToMorphologyItems(payload['verbs'], 'verb');
    if (nouns.length || verbs.length) return [...nouns, ...verbs];

    return [];
  }

  private toMorphologyEntry(entry: Record<string, unknown>, index: number): StudyMorphologyItem | null {
    const word = this.firstText(entry, ['surface_ar', 'word', 'text', 'lemma_ar']);
    if (!word) return null;

    const posRaw = this.firstText(entry, ['pos', 'pos2']).toLowerCase();
    const key: StudyMorphologyItem['key'] =
      posRaw === 'verb'
        ? 'verb'
        : posRaw === 'noun' || posRaw === 'adj'
          ? 'noun'
          : 'noun';

    const root = this.firstText(entry, ['root_norm', 'root']);
    const gloss =
      this.firstText(entry, ['translation', 'gloss'])
      || this.textFromUnknown(this.recordFromUnknown(entry['translation'])?.['primary']);

    const location =
      this.firstText(entry, ['word_location'])
      || this.compactWordLocation(entry)
      || `#${index + 1}`;

    return {
      key,
      word,
      root,
      gloss,
      location,
    };
  }

  private arrayToMorphologyItems(value: unknown, key: 'noun' | 'verb'): StudyMorphologyItem[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((entry, index) => {
        const record = this.recordFromUnknown(entry);
        if (record) {
          const word = this.firstText(record, ['surface_ar', 'word', 'text', 'lemma_ar']);
          if (!word) return null;
          const root = this.firstText(record, ['root_norm', 'root']);
          const gloss = this.firstText(record, ['translation', 'gloss']);
          const location = this.firstText(record, ['word_location']) || `#${index + 1}`;
          return { key, word, root, gloss, location } as StudyMorphologyItem;
        }

        const text = this.textFromUnknown(entry);
        if (!text) return null;

        return {
          key,
          word: text,
          root: '',
          gloss: '',
          location: `#${index + 1}`,
        } as StudyMorphologyItem;
      })
      .filter((entry): entry is StudyMorphologyItem => entry != null);
  }

  private toSentenceEntry(entry: Record<string, unknown>, index: number): StudySentenceEntry | null {
    const order = this.numberFromUnknown(entry['sentence_order']) ?? index + 1;

    const canonical = this.firstText(entry, ['canonical_sentence', 'text', 'arabic']);
    const summaryObj = this.recordFromUnknown(entry['structure_summary']);
    const summary = this.pickFirst(summaryObj ?? entry, ['summary', 'function', 'note'])
      || this.textFromUnknown(summaryObj?.['full_text'])
      || canonical;

    const componentsRaw = Array.isArray(summaryObj?.['main_components']) ? summaryObj['main_components'] : [];
    const components = componentsRaw
      .map((component) => {
        const record = this.recordFromUnknown(component);
        if (!record) return '';
        const label = this.firstText(record, ['component']);
        const text = this.firstText(record, ['text']);
        if (label && text) return `${label}: ${text}`;
        return text || label;
      })
      .filter((text): text is string => Boolean(text));

    if (!canonical && !summary && !components.length) return null;

    return {
      id: this.firstText(entry, ['sentence_id', 'id']) || `sentence_${order}`,
      order,
      arabic: canonical || summary,
      translation: this.firstText(entry, ['translation']),
      summary,
      components,
    };
  }

  private toSentenceEntryFromLesson(sentence: QuranLessonSentence, index: number): StudySentenceEntry | null {
    const arabic = this.textFromUnknown(getQuranSentenceArabic(sentence));
    const translation = this.textFromUnknown(getQuranSentenceTranslation(sentence));
    if (!arabic && !translation) return null;

    const order =
      this.numberFromUnknown((sentence as unknown as Record<string, unknown>)['sentence_order'])
      ?? this.numberFromUnknown(sentence.ref?.sentence_order_in_unit)
      ?? index + 1;

    return {
      id: sentence.sentence_id || `sentence_${order}`,
      order,
      arabic,
      translation,
      summary: translation || arabic,
      components: [],
    };
  }

  private async loadTaskPayloads(lessonId: number): Promise<Partial<Record<StudyTask, unknown>>> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiBase}/ar/quran/lessons/${lessonId}/tasks`)
      );

      const taskRows =
        this.arrayFromUnknown(response?.result?.tasks)
        ?? this.arrayFromUnknown(response?.tasks)
        ?? this.arrayFromUnknown(response?.results)
        ?? [];

      const output: Partial<Record<StudyTask, unknown>> = {};

      for (const rawTask of taskRows) {
        const row = this.recordFromUnknown(rawTask);
        if (!row) continue;

        const taskType = this.textFromUnknown(row['task_type']).toLowerCase();
        if (!this.isStudyTask(taskType)) continue;

        const payloadRaw =
          row['task_json']
          ?? row['json']
          ?? row['payload']
          ?? row['data']
          ?? null;

        output[taskType] = this.parseTaskPayload(payloadRaw);
      }

      return output;
    } catch {
      return {};
    }
  }

  private hydrateFallbackTaskPayloads(): void {
    if (!this.lesson) return;

    if (!this.taskPayloads['reading']) {
      this.taskPayloads['reading'] = {
        text: this.lesson.text,
        reference: this.lesson.reference,
      };
    }

    if (!this.taskPayloads['sentence_structure']) {
      this.taskPayloads['sentence_structure'] = {
        items: (this.lesson.sentences ?? []).map((sentence, index) => ({
          sentence_id: sentence.sentence_id,
          sentence_order: this.numberFromUnknown(sentence.ref?.sentence_order_in_unit) ?? index + 1,
          canonical_sentence: this.textFromUnknown(getQuranSentenceArabic(sentence)),
          translation: this.textFromUnknown(getQuranSentenceTranslation(sentence)),
        })),
      };
    }

    if (!this.taskPayloads['comprehension']) {
      this.taskPayloads['comprehension'] = this.lesson.comprehension ?? {};
    }

    if (!this.taskPayloads['expressions']) {
      const cardMap = this.recordFromUnknown(this.lesson.vocab_layer?.cards);
      this.taskPayloads['expressions'] = {
        items: this.objectArray(cardMap?.['expressions']),
      };
    }

    if (!this.taskPayloads['morphology']) {
      this.taskPayloads['morphology'] = {
        items: [],
      };
    }

    if (!this.taskPayloads['grammar_concepts']) {
      this.taskPayloads['grammar_concepts'] = {
        items: [],
      };
    }

    if (!this.taskPayloads['passage_structure']) {
      this.taskPayloads['passage_structure'] = {
        scope: {
          ref: {
            surah: this.lesson.reference?.surah,
            verses: this.buildReferenceVerses(),
          },
        },
        analysis: {
          title: this.lessonTitle,
          subtitle: 'Structured passage map generated from available lesson context.',
          sections: [],
        },
      };
    }
  }

  private buildReferenceVerses(): string {
    const from = this.numberFromUnknown(this.lesson?.reference?.ayah_from);
    const to = this.numberFromUnknown(this.lesson?.reference?.ayah_to) ?? from;

    if (from == null || to == null) return '';
    return from === to ? `${from}` : `${from}-${to}`;
  }

  private resetCaches(): void {
    this.passageSectionsCacheKey = '';
    this.passageSectionsCache = [];

    this.comprehensionGroupsCacheKey = '';
    this.comprehensionGroupsCache = [];

    this.expressionCardsCacheKey = '';
    this.expressionCardsCache = [];

    this.collapsedPassageSectionIds.clear();
  }

  private get passageStructurePayload(): Record<string, unknown> {
    const payload = this.recordFromUnknown(this.taskPayloads['passage_structure']);
    return payload ?? {};
  }

  private isStudyTask(value: string): value is StudyTask {
    return (
      value === 'reading'
      || value === 'morphology'
      || value === 'sentence_structure'
      || value === 'grammar_concepts'
      || value === 'expressions'
      || value === 'comprehension'
      || value === 'passage_structure'
    );
  }

  private parseTaskPayload(payload: unknown): unknown {
    if (typeof payload !== 'string') return payload;

    const trimmed = payload.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      return payload;
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

    const iconName = this.textFromUnknown(ui?.['icon']);

    const keyValueRows = renderer === 'keyvalue' ? this.toPassageKeyValueRows(data) : [];
    const clusters = renderer === 'clusters' ? this.toPassageClusters(data, accent) : [];
    const chiasm = renderer === 'chiasm' ? this.toPassageChiasm(data) : null;
    const timeline = renderer === 'timeline' ? this.toPassageTimeline(data) : [];

    const summary = this.pickFirst(data, [
      'function',
      'effect',
      'interpretation',
      'projection',
      'semantic_center',
      'purpose',
    ]);

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

    if (
      normalized === 'keyvalue'
      || normalized === 'clusters'
      || normalized === 'chiasm'
      || normalized === 'timeline'
    ) {
      return normalized;
    }

    if (Array.isArray(data['clusters'])) return 'clusters';
    if (Array.isArray(data['steps'])) return 'timeline';
    if (this.recordFromUnknown(data['outer_frame']) || this.recordFromUnknown(data['core_axis'])) {
      return 'chiasm';
    }

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
      signal.includes('providence')
      || signal.includes('divine')
      || signal.includes('blessing')
      || signal.includes('selection')
      || signal.includes('purpose')
    ) {
      return 'green';
    }

    if (
      signal.includes('conflict')
      || signal.includes('threat')
      || signal.includes('enemy')
      || signal.includes('warning')
      || signal.includes('jealousy')
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

  private toPassageClusters(
    data: Record<string, unknown>,
    parentAccent: PassageAccent
  ): PassageCluster[] {
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

    if (!outerEntries.length && !innerEntries.length && !axisEntries.length && !interpretation) {
      return null;
    }

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

        steps.push({
          id: `step_${index + 1}`,
          title: `Step ${index + 1}`,
          text,
        });
        continue;
      }

      const stepKey = this.textFromUnknown(record['key']) || `step_${index + 1}`;
      const title = this.textFromUnknown(record['title']) || this.toReadableLabel(stepKey);
      const text =
        this.pickFirst(record, ['text', 'value', 'description', 'detail', 'summary'])
        || this.textFromUnknown(record['label'])
        || title;

      const id = `${stepKey}_${index + 1}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      steps.push({ id, title, text });
    }

    if (steps.length) return steps;

    for (const [index, ayah] of this.readingAyahs.slice(0, 7).entries()) {
      steps.push({
        id: `ayah_${index + 1}`,
        title: `Ayah ${ayah.ayah || index + 1}`,
        text: ayah.translation || ayah.text,
      });
    }

    return steps;
  }

  private buildFallbackPassageSections(payload: Record<string, unknown>): PassageSectionCard[] {
    const lessonContextRows: PassageKeyValueRow[] = [
      { key: 'Passage', text: this.passageReferenceBadge, chips: [] },
      { key: 'Heading', text: this.passageHeaderTitle, chips: [] },
      { key: 'Overview', text: this.passageHeaderSubtitle, chips: [] },
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
        iconName: timeline.length ? 'cilStream' : 'cilListRich',
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

    const ignoredKeys = new Set([
      'surah',
      'verses',
      'task_type',
      'schema_version',
      'title',
      'subtitle',
      'mcqs',
    ]);

    const availableKeys = Object.keys(questionRoot).filter((key) => {
      if (!key || ignoredKeys.has(key)) return false;
      const value = questionRoot[key];

      return (
        Array.isArray(value)
        || this.recordFromUnknown(value) != null
        || (typeof value === 'string' && value.trim().length > 0)
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
      const items: string[] = [];
      for (const entry of value) {
        items.push(...this.toQuestionList(entry));
      }
      return this.uniqueTexts(items, 80);
    }

    const record = this.recordFromUnknown(value);
    if (record) {
      const direct = this.pickFirst(record, ['question', 'prompt', 'text', 'value', 'label']);
      if (direct) return [direct];

      const nested: string[] = [];
      for (const entry of Object.values(record)) {
        nested.push(...this.toQuestionList(entry));
      }
      return this.uniqueTexts(nested, 80);
    }

    const scalar = this.textFromUnknown(value);
    if (!scalar) return [];
    return [scalar];
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
            this.textFromUnknown(payload['canonical_input'])
            || this.textFromUnknown(payload['text_ar'])
            || this.textFromUnknown(payload['ar_u_expression']);

          if (isSingleExpression) entries = [payload];
        }
      }
    }

    return entries
      .map((entry, index) => this.toExpressionStudyCard(entry, index))
      .filter((entry): entry is ExpressionStudyCard => entry != null);
  }

  private toExpressionStudyCard(entry: Record<string, unknown>, index: number): ExpressionStudyCard | null {
    const canonicalInput = this.firstText(entry, ['canonical_input']);
    const canonicalTail = canonicalInput.includes('|')
      ? canonicalInput.split('|').slice(1).join('|').trim()
      : '';

    const textAr = this.firstText(entry, ['text_ar', 'expression_ar']) || canonicalTail;
    const canonical = canonicalInput || this.firstText(entry, ['ar_u_expression', 'id', 'expression_norm']);

    const meta =
      this.recordFromJsonLike(entry['meta_json'])
      ?? this.recordFromJsonLike(entry['meta'])
      ?? ({} as Record<string, unknown>);

    const categoryRaw = this.pickFirst(meta, ['category', 'type', 'domain']) || this.firstText(entry, ['category']);
    const statusRaw =
      this.pickFirst(meta, ['scholarly_status', 'status'])
      || this.firstText(entry, ['scholarly_status', 'status']);

    const category = categoryRaw ? this.toReadableLabel(categoryRaw) : '';
    const status = statusRaw ? this.toReadableLabel(statusRaw) : '';
    const lemma = this.firstText(entry, ['lemma_ar', 'lemma_norm', 'lemma']);

    const label =
      this.firstText(entry, ['label'])
      || this.firstText(entry, ['ar_u_expression'])
      || (canonicalInput ? canonicalInput.split('|')[0].trim() : '')
      || `Expression ${index + 1}`;

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

    const idSource =
      this.firstText(entry, ['ar_u_expression', 'id'])
      || canonical
      || label
      || `expr_${index + 1}`;

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

        steps.push({ text, type: type ? this.toReadableLabel(type) : '' });
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
        return {
          author: author || 'Source',
          work: work || 'Untitled',
        };
      })
      .filter((entry) => Boolean(entry.author) || Boolean(entry.work));
  }

  private resolveExpressionAccent(context: {
    category: string;
    status: string;
    label: string;
  }): PassageAccent {
    const signal = `${context.category} ${context.status} ${context.label}`.toLowerCase();

    if (
      signal.includes('conflict')
      || signal.includes('enemy')
      || signal.includes('anthropological')
      || signal.includes('threat')
      || signal.includes('warning')
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
      const chips: string[] = [];
      for (const entry of value) {
        chips.push(...this.toPassageChipValues(entry));
      }
      return chips;
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

  private translationFromMap(value: unknown): string {
    const map = this.recordFromUnknown(value);
    if (!map) return '';

    const candidates = ['primary', 'haleem', 'sahih', 'asad', 'usmani'];
    for (const key of candidates) {
      const text = this.textFromUnknown(map[key]);
      if (text) return text;
    }

    for (const candidate of Object.values(map)) {
      const text = this.textFromUnknown(candidate);
      if (text) return text;
    }

    return '';
  }

  private compactWordLocation(entry: Record<string, unknown>): string {
    const surah = this.numberFromUnknown(entry['surah']);
    const ayah = this.numberFromUnknown(entry['ayah']);
    const token = this.numberFromUnknown(entry['token_index']);

    if (surah != null && ayah != null && token != null) {
      return `${surah}:${ayah}:${token}`;
    }

    if (surah != null && ayah != null) {
      return `${surah}:${ayah}`;
    }

    return '';
  }

  private toReadableLabel(raw: string): string {
    return raw
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
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

  private firstText(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = this.textFromUnknown(item[key]);
      if (value) return value;
    }

    return '';
  }

  private pickFirst(payload: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

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

  private recordFromUnknown(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private recordFromJsonLike(value: unknown): Record<string, unknown> | null {
    const direct = this.recordFromUnknown(value);
    if (direct) return direct;

    if (typeof value !== 'string') return null;

    const parsed = this.parseTaskPayload(value);
    return this.recordFromUnknown(parsed);
  }

  private arrayFromJsonLike(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;

    if (typeof value !== 'string') return [];

    const parsed = this.parseTaskPayload(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  private arrayFromUnknown(value: unknown): unknown[] | null {
    if (!Array.isArray(value)) return null;
    return value;
  }

  private objectArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];

    return value.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    );
  }
}
