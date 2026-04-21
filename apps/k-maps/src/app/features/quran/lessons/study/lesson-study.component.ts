import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { forkJoin } from 'rxjs';
import gsap from 'gsap';
import {
  KMapsService,
  LessonFullDetail,
  LessonTask,
  TaskType,
} from '../../../../shared/services/k-maps.service';
import { QuranAyah } from '../../../../shared/models/quran.models';
import { qrPassagesToResponse, qrReaderToAyahsResponse } from '../../../../shared/services/qr-api.mapper';
import { QrApiService } from '../../../../shared/services/qr-api.service';

// ── Constants ────────────────────────────────────────────────────────────────

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const STUDY_TAB_ORDER: Array<'overview' | TaskType> = [
  'overview',
  'reading',
  'morphology',
  'sentence_structure',
  'expressions',
  'comprehension',
  'passage_structure',
];

const COMPREHENSION_ORDER = ['comprehension', 'reflective', 'analytical', 'morphological', 'grammatical'] as const;

// ── Local types ───────────────────────────────────────────────────────────────

export type StudyActiveTab = 'overview' | TaskType;

type PassageAccent = 'blue' | 'green' | 'orange' | 'violet' | 'gray';
type PassageRenderer = 'keyvalue' | 'clusters' | 'chiasm' | 'timeline';

export interface ReadingWordToken {
  text: string;
  location: string;
  surah: number;
  ayah: number;
  tokenIndex: number;
}

export interface MorphologyItem {
  word: string;
  root: string;
  location: string;
  pos: 'noun' | 'verb' | 'other';
  meaning: string;
  raw: Record<string, unknown>;
}

export interface SentenceSentence {
  sentence_order: number;
  structure_summary: {
    full_text: string;
    main_components: SentenceSegment[];
    expansions: SentenceSegment[];
  };
}

export interface SentenceSegment {
  component: string;
  text: string;
  role?: string;
  pattern?: string;
  grammar?: unknown[];
}

export interface ComprehensionGroup {
  id: string;
  title: string;
  accent: PassageAccent;
  questions: string[];
}

export interface ExpressionCard {
  id: string;
  label: string;
  textAr: string;
  canonical: string;
  reference: string;
  category: string;
  status: string;
  lemma: string;
  accent: PassageAccent;
  sequence: { text: string; type: string }[];
  sources: { author: string; work: string }[];
}

export interface PassageKeyValueRow { key: string; text: string; chips: string[]; }
export interface PassageCluster { title: string; items: string[]; accent: PassageAccent; }
export interface PassageChiasm {
  outerTop: string; outerBottom: string;
  innerLeft: string; innerRight: string;
  axis: string; interpretation: string;
}
export interface PassageTimelineStep { id: string; title: string; text: string; }

export interface PassageSection {
  id: string;
  key: string;
  title: string;
  badge: string;
  renderer: PassageRenderer;
  accent: PassageAccent;
  summary: string;
  keyValueRows: PassageKeyValueRow[];
  clusters: PassageCluster[];
  chiasm: PassageChiasm | null;
  timeline: PassageTimelineStep[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-lesson-study',
  standalone: true,
  imports: [NgClass],
  templateUrl: './lesson-study.component.html',
  styleUrl: './lesson-study.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonStudyComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kmaps = inject(KMapsService);
  private readonly qrApi = inject(QrApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('panelEl') panelEl!: ElementRef<HTMLElement>;

  // ── State signals ──────────────────────────────────────────────────────────
  lessonId = signal('');
  lesson = signal<LessonFullDetail | null>(null);
  tasks = signal<LessonTask[]>([]);
  ayahs = signal<QuranAyah[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<StudyActiveTab>('overview');

  // Reading state
  selectedWordLocation = signal<string | null>(null);

  // Morphology dialog
  morphDialogItem = signal<MorphologyItem | null>(null);

  // Sentence expand/collapse
  private expandedSentenceKeys = new Set<string>();

  // Passage collapse
  private collapsedSectionIds = new Set<string>();

  // Caches
  private passageSectionsCache: PassageSection[] = [];
  private passageSectionsCacheKey = '';
  private comprehensionGroupsCache: ComprehensionGroup[] = [];
  private comprehensionGroupsCacheKey = '';
  private expressionCardsCache: ExpressionCard[] = [];
  private expressionCardsCacheKey = '';

  // ── Computed ───────────────────────────────────────────────────────────────

  readonly availableTabs = computed(() => {
    const taskTypes = new Set(this.tasks().map((t) => t.task_type));
    return STUDY_TAB_ORDER.filter((id) => id === 'overview' || taskTypes.has(id as TaskType));
  });

  readonly tabLabel: Record<StudyActiveTab, string> = {
    overview: 'Overview',
    reading: 'Reading',
    morphology: 'Morphology',
    sentence_structure: 'Sentence Structure',
    expressions: 'Expressions',
    comprehension: 'Comprehension',
    passage_structure: 'Passage Structure',
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lessonId') ?? '';
    this.lessonId.set(id);

    const taskParam = this.route.snapshot.queryParamMap.get('task') as StudyActiveTab | null;
    if (taskParam && STUDY_TAB_ORDER.includes(taskParam as any)) {
      this.activeTab.set(taskParam);
    }

    this.loadAll(id);

    this.route.queryParamMap.subscribe((params) => {
      const task = params.get('task') as StudyActiveTab | null;
      if (task && STUDY_TAB_ORDER.includes(task as any) && task !== this.activeTab()) {
        this.activeTab.set(task);
        this.morphDialogItem.set(null);
        this.selectedWordLocation.set(null);
        this.animatePanel();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.loading()) this.animatePanel();
  }

  ngOnDestroy(): void {}

  // ── Data loading ───────────────────────────────────────────────────────────

  private loadAll(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      detail: this.kmaps.getLessonDetail(id),
      tasks: this.kmaps.getLessonTasks(id),
    }).subscribe({
      next: ({ detail, tasks }) => {
        this.lesson.set(detail);
        this.tasks.set(tasks);
        if (detail.surah) {
          forkJoin({
            reader: this.qrApi.getSurahReader(detail.surah, 400),
            passages: this.qrApi.getSurahPassages(detail.surah),
          }).subscribe({
            next: ({ reader, passages }) => {
              const res = qrReaderToAyahsResponse(reader, qrPassagesToResponse(passages.data));
              const all = res.results ?? res.verses ?? [];
              const from = detail.ayah_from ?? 1;
              const to = detail.ayah_to ?? all.length;
              this.ayahs.set(all.filter((a) => a.ayah >= from && a.ayah <= to));
              this.loading.set(false);
              this.cdr.markForCheck();
              setTimeout(() => this.animatePanel(), 20);
            },
            error: () => {
              this.loading.set(false);
              this.cdr.markForCheck();
            },
          });
        } else {
          this.loading.set(false);
          this.cdr.markForCheck();
          setTimeout(() => this.animatePanel(), 20);
        }
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load lesson');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  setTab(tab: StudyActiveTab): void {
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.morphDialogItem.set(null);
    this.selectedWordLocation.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { task: tab === 'overview' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.animatePanel();
  }

  back(): void {
    this.router.navigate(['/quran']);
  }

  // ── Lesson overview getters ────────────────────────────────────────────────

  get lessonTitle(): string {
    return this.lesson()?.title || `Lesson #${this.lessonId()}`;
  }

  get lessonSubtitle(): string {
    const l = this.lesson();
    if (!l?.surah) return '';
    const from = l.ayah_from;
    const to = l.ayah_to;
    if (from == null) return `Surah ${l.surah}`;
    return from === to || to == null
      ? `Surah ${l.surah} · Ayah ${from}`
      : `Surah ${l.surah} · Ayah ${from}–${to}`;
  }

  get passageRef(): string {
    const l = this.lesson();
    if (!l?.surah) return '—';
    const from = l.ayah_from;
    const to = l.ayah_to;
    if (from == null) return String(l.surah);
    if (from === to || to == null) return `${l.surah}:${from}`;
    return `${l.surah}:${from}–${to}`;
  }

  get lessonOverviewPayload(): Record<string, unknown> {
    return this.parseTaskJson('passage_structure') ?? {};
  }

  get lessonHeading(): string {
    return this.pickFirst(this.lessonOverviewPayload, ['heading', 'title', 'study_heading']) || this.lessonTitle;
  }

  get lessonDetail(): string {
    return this.pickFirst(this.lessonOverviewPayload, ['detail', 'description', 'summary', 'overview']) || '—';
  }

  get episodeIntro(): string {
    return this.pickFirst(this.lessonOverviewPayload, ['episode_intro', 'intro']) || '—';
  }

  get sceneDetail(): string {
    return this.pickFirst(this.lessonOverviewPayload, ['scene', 'scene_intro', 'scene_detail']) || '—';
  }

  get sceneAesthetic(): string {
    return this.pickFirst(this.lessonOverviewPayload, ['scene_aesthetic', 'aesthetic', 'tone']) || '—';
  }

  // ── Reading tab ────────────────────────────────────────────────────────────

  get readingAyahGroups(): { ayah: number; words: ReadingWordToken[] }[] {
    return this.ayahs()
      .map((ayah) => {
        const words = this.splitWords(this.ayahText(ayah)).map((w, i) => ({
          text: w,
          location: `${ayah.surah}:${ayah.ayah}:${i + 1}`,
          surah: ayah.surah,
          ayah: ayah.ayah,
          tokenIndex: i + 1,
        }));
        return { ayah: ayah.ayah, words };
      })
      .filter((g) => g.words.length > 0);
  }

  selectWord(token: ReadingWordToken): void {
    const loc = token.location;
    this.selectedWordLocation.set(this.selectedWordLocation() === loc ? null : loc);
  }

  isWordSelected(location: string): boolean {
    return this.selectedWordLocation() === location;
  }

  // ── Morphology tab ─────────────────────────────────────────────────────────

  get morphologyItems(): MorphologyItem[] {
    const payload = this.parseTaskJson('morphology') ?? {};
    const raw = this.objectArray(payload['items']) || this.objectArray(payload['lexicon_morphology']) || [];
    return raw.map((item) => this.toMorphologyItem(item)).filter((i): i is MorphologyItem => i != null);
  }

  get nounItems(): MorphologyItem[] {
    return this.morphologyItems.filter((i) => i.pos === 'noun');
  }

  get verbItems(): MorphologyItem[] {
    return this.morphologyItems.filter((i) => i.pos === 'verb');
  }

  selectMorphItem(item: MorphologyItem): void {
    this.morphDialogItem.set(this.morphDialogItem()?.location === item.location ? null : item);
  }

  closeMorphDialog(): void {
    this.morphDialogItem.set(null);
  }

  get morphDialogContextAyahs(): { ayah: number; words: string[]; translation: string; isFocus: boolean }[] {
    const dialog = this.morphDialogItem();
    if (!dialog) return [];
    const parts = dialog.location.split(':');
    const focusAyah = Number(parts[1]);
    if (!focusAyah) return [];

    const center = this.ayahs().findIndex((a) => a.ayah === focusAyah);
    const slice = this.ayahs().slice(Math.max(0, center - 1), center + 2);
    return slice.map((a) => ({
      ayah: a.ayah,
      words: this.splitWords(this.ayahText(a)),
      translation: a.translation ?? '',
      isFocus: a.ayah === focusAyah,
    }));
  }

  // ── Sentence structure tab ─────────────────────────────────────────────────

  get sentenceSentences(): SentenceSentence[] {
    const payload = this.parseTaskJson('sentence_structure');
    if (!payload) return [];
    const items = Array.isArray(payload['items']) ? payload['items'] : [];
    return (items as unknown[])
      .map((raw, i) => this.toSentence(raw, i))
      .filter((s): s is SentenceSentence => s != null)
      .sort((a, b) => a.sentence_order - b.sentence_order);
  }

  toggleSentenceSection(sentence: SentenceSentence, part: 'main' | 'expansion'): void {
    const key = `${sentence.sentence_order}:${part}`;
    this.expandedSentenceKeys.has(key)
      ? this.expandedSentenceKeys.delete(key)
      : this.expandedSentenceKeys.add(key);
    this.cdr.markForCheck();
  }

  isSentenceSectionExpanded(sentence: SentenceSentence, part: 'main' | 'expansion'): boolean {
    return this.expandedSentenceKeys.has(`${sentence.sentence_order}:${part}`);
  }

  sentenceRef(sentence: SentenceSentence, index: number): string {
    const ayah = this.ayahs()[index];
    const surah = this.lesson()?.surah;
    if (!ayah || !surah) return `Sentence ${sentence.sentence_order}`;
    return `${surah}:${ayah.ayah}`;
  }

  segmentLabel(component: string): string {
    return String(component).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase() || 'COMPONENT';
  }

  segmentDescription(seg: SentenceSegment): string {
    if (seg.role) return seg.role;
    if (seg.pattern) return seg.pattern;
    if (Array.isArray(seg.grammar) && seg.grammar.length) {
      return seg.grammar.map((g) => String(g)).join(' • ');
    }
    return 'Structured sentence component.';
  }

  segmentTags(seg: SentenceSegment): string[] {
    const out = new Set<string>();
    if (seg.pattern) out.add(seg.pattern);
    for (const g of seg.grammar ?? []) {
      const v = String(g).trim();
      if (v) out.add(v);
      if (out.size >= 4) break;
    }
    return Array.from(out);
  }

  segmentTone(seg: SentenceSegment, index: number, isExpansion = false): string {
    const c = String(seg.component).toLowerCase();
    if (c.includes('main')) return 'gold';
    if (c.includes('cause') || c.includes('reason')) return 'amber';
    if (c.includes('clarif') || c.includes('explain')) return 'cyan';
    if (c.includes('result') || c.includes('effect')) return 'mint';
    if (c.includes('preposition') || c.includes('attach')) return 'cyan';
    return isExpansion ? 'slate' : index === 0 ? 'gold' : 'slate';
  }

  segmentDescriptionIsArabic(seg: SentenceSegment): boolean {
    return ARABIC_SCRIPT_RE.test(this.segmentDescription(seg));
  }

  // ── Comprehension tab ──────────────────────────────────────────────────────

  get comprehensionGroups(): ComprehensionGroup[] {
    const raw = this.rawTaskJson('comprehension');
    if (raw === this.comprehensionGroupsCacheKey) return this.comprehensionGroupsCache;
    const groups = this.buildComprehensionGroups(this.parseTaskJsonFromString(raw));
    this.comprehensionGroupsCacheKey = raw;
    this.comprehensionGroupsCache = groups;
    return groups;
  }

  toTextSegments(value: string): { text: string; isArabic: boolean }[] {
    if (!value) return [];
    return value.split(/([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+)/)
      .filter(Boolean)
      .map((part) => ({ text: part, isArabic: ARABIC_SCRIPT_RE.test(part) }));
  }

  // ── Expressions tab ────────────────────────────────────────────────────────

  get expressionCards(): ExpressionCard[] {
    const raw = this.rawTaskJson('expressions');
    if (raw === this.expressionCardsCacheKey) return this.expressionCardsCache;
    const cards = this.buildExpressionCards(this.parseTaskJsonFromString(raw));
    this.expressionCardsCacheKey = raw;
    this.expressionCardsCache = cards;
    return cards;
  }

  // ── Passage structure tab ──────────────────────────────────────────────────

  get passageSections(): PassageSection[] {
    const raw = this.rawTaskJson('passage_structure');
    if (raw === this.passageSectionsCacheKey) return this.passageSectionsCache;
    const payload = this.parseTaskJsonFromString(raw) ?? {};
    const sections = this.buildPassageSections(payload as Record<string, unknown>);
    this.passageSectionsCacheKey = raw;
    this.passageSectionsCache = sections;
    return sections;
  }

  get passageHeaderTitle(): string {
    const payload = this.parseTaskJson('passage_structure') ?? {};
    const analysis = this.recordFromUnknown(payload['analysis']);
    return this.pickFirst(analysis ?? payload, ['passage_title', 'title', 'heading']) || this.lessonTitle;
  }

  get passageHeaderSubtitle(): string {
    const payload = this.parseTaskJson('passage_structure') ?? {};
    const analysis = this.recordFromUnknown(payload['analysis']);
    return this.pickFirst(analysis ?? payload, ['subtitle', 'description', 'summary'])
      || 'Structured cognitive map of discourse and narrative flow.';
  }

  get hasCollapsedSections(): boolean { return this.collapsedSectionIds.size > 0; }
  get allCollapsed(): boolean {
    const s = this.passageSections;
    return s.length > 0 && this.collapsedSectionIds.size >= s.length;
  }

  isSectionCollapsed(id: string): boolean { return this.collapsedSectionIds.has(id); }

  toggleSection(id: string): void {
    this.collapsedSectionIds.has(id)
      ? this.collapsedSectionIds.delete(id)
      : this.collapsedSectionIds.add(id);
    this.cdr.markForCheck();
  }

  expandAll(): void { this.collapsedSectionIds.clear(); this.cdr.markForCheck(); }
  collapseAll(): void {
    this.passageSections.forEach((s) => this.collapsedSectionIds.add(s.id));
    this.cdr.markForCheck();
  }

  sectionDomId(id: string): string {
    return `km-section-${id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
  }

  scrollToSection(id: string): void {
    document.getElementById(this.sectionDomId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── GSAP ───────────────────────────────────────────────────────────────────

  private animatePanel(): void {
    const el = this.panelEl?.nativeElement;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' });
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  toArabicIndic(n: number): string {
    return String(Math.max(0, Math.trunc(n))).split('').map((c) => {
      const d = c.charCodeAt(0) - 48;
      return d >= 0 && d <= 9 ? ARABIC_INDIC[d] : c;
    }).join('');
  }

  private ayahText(ayah: QuranAyah): string {
    return (ayah.text_uthmani ?? ayah.text ?? '')
      .replace(/\u06DD/g, ' ')
      .replace(/﴿[^﴾]*﴾/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private splitWords(text: string): string[] {
    return text.split(/\s+/).filter((w) => w.length > 0 && !/^[٠-٩0-9]+$/.test(w));
  }

  private rawTaskJson(type: TaskType): string {
    return this.tasks().find((t) => t.task_type === type)?.task_json?.trim() ?? '';
  }

  private parseTaskJson(type: TaskType): Record<string, unknown> | null {
    const raw = this.rawTaskJson(type);
    return this.parseTaskJsonFromString(raw);
  }

  private parseTaskJsonFromString(raw: string): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return null;
    } catch { return null; }
  }

  private toMorphologyItem(raw: Record<string, unknown>): MorphologyItem | null {
    const word = this.firstText(raw, ['surface_ar', 'word', 'text']);
    if (!word) return null;
    const pos = this.firstText(raw, ['pos', 'pos2']).toLowerCase();
    return {
      word: word.replace(ARABIC_DIACRITICS_RE, ''),
      root: this.firstText(raw, ['root_norm', 'root']),
      location: this.firstText(raw, ['word_location', 'location']) || `${raw['surah']}:${raw['ayah']}:${raw['token_index']}`,
      pos: pos === 'verb' ? 'verb' : pos === 'noun' ? 'noun' : 'other',
      meaning: this.firstText(raw, ['meaning', 'translation', 'gloss']),
      raw,
    };
  }

  private toSentence(raw: unknown, index: number): SentenceSentence | null {
    const r = this.recordFromUnknown(raw);
    if (!r) return null;
    const summary = this.recordFromUnknown(r['structure_summary']) ?? {};
    const mainComponents = this.toSegments(summary['main_components']);
    const expansions = this.toSegments(summary['expansions']);
    return {
      sentence_order: Number(r['sentence_order'] ?? index + 1),
      structure_summary: {
        full_text: String(r['full_text'] ?? summary['full_text'] ?? ''),
        main_components: mainComponents,
        expansions,
      },
    };
  }

  private toSegments(raw: unknown): SentenceSegment[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) => {
      const r = this.recordFromUnknown(entry) ?? {};
      return {
        component: String(r['component'] ?? ''),
        text: String(r['text'] ?? ''),
        role: r['role'] != null ? String(r['role']) : undefined,
        pattern: r['pattern'] != null ? String(r['pattern']) : undefined,
        grammar: Array.isArray(r['grammar']) ? r['grammar'] : undefined,
      };
    }).filter((s) => s.component);
  }

  private buildComprehensionGroups(source: unknown): ComprehensionGroup[] {
    const payload = this.recordFromUnknown(source);
    const root = this.recordFromUnknown(payload?.['questions']) ?? payload ?? {};
    const IGNORE = new Set(['surah', 'verses', 'task_type', 'schema_version', 'title', 'subtitle']);
    const keys = Object.keys(root).filter((k) => k && !IGNORE.has(k));
    const ordered = [
      ...COMPREHENSION_ORDER.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !(COMPREHENSION_ORDER as readonly string[]).includes(k)),
    ];
    const groups: ComprehensionGroup[] = [];
    for (const key of ordered) {
      const questions = this.toQuestionList(root[key]);
      if (!questions.length) continue;
      groups.push({
        id: key.toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || `g${groups.length}`,
        title: this.comprehensionTitle(key),
        accent: this.comprehensionAccent(key),
        questions,
      });
    }
    return groups;
  }

  private comprehensionTitle(key: string): string {
    const k = key.toLowerCase();
    if (k === 'comprehension') return 'Core Comprehension';
    if (k === 'reflective') return 'Reflective Inquiry';
    if (k === 'analytical') return 'Analytical Inquiry';
    if (k === 'morphological') return 'Morphological Focus';
    if (k === 'grammatical') return 'Grammatical Focus';
    return this.toReadableLabel(key);
  }

  private comprehensionAccent(key: string): PassageAccent {
    const k = key.toLowerCase();
    if (k === 'reflective') return 'green';
    if (k === 'analytical') return 'violet';
    if (k === 'morphological') return 'orange';
    if (k === 'grammatical') return 'gray';
    return 'blue';
  }

  private toQuestionList(value: unknown): string[] {
    if (Array.isArray(value)) return this.uniqueTexts(value.flatMap((v) => this.toQuestionList(v)));
    const r = this.recordFromUnknown(value);
    if (r) {
      const direct = this.pickFirst(r, ['question', 'prompt', 'text', 'value']);
      if (direct) return [direct];
      return this.uniqueTexts(Object.values(r).flatMap((v) => this.toQuestionList(v)));
    }
    const s = String(value ?? '').trim();
    return s ? [s] : [];
  }

  private buildExpressionCards(source: unknown): ExpressionCard[] {
    let entries: Record<string, unknown>[] = [];
    if (Array.isArray(source)) {
      entries = this.objectArray(source);
    } else {
      const payload = this.recordFromUnknown(source);
      if (payload) {
        entries = this.objectArray(payload['u_expressions'])
          || this.objectArray(payload['expressions'])
          || this.objectArray(payload['items']);
        if (!entries.length && (payload['canonical_input'] || payload['text_ar'])) entries = [payload];
      }
    }
    return entries.map((e, i) => this.toExpressionCard(e, i)).filter((c): c is ExpressionCard => c != null);
  }

  private toExpressionCard(entry: Record<string, unknown>, index: number): ExpressionCard | null {
    const canonicalInput = this.firstText(entry, ['canonical_input']);
    const canonicalTail = canonicalInput.includes('|') ? canonicalInput.split('|').slice(1).join('|').trim() : '';
    const textAr = this.firstText(entry, ['text_ar', 'expression_ar']) || canonicalTail;
    const canonical = canonicalInput || this.firstText(entry, ['ar_u_expression', 'id']);
    const meta = this.recordFromJsonLike(entry['meta_json']) ?? this.recordFromJsonLike(entry['meta']) ?? {};
    const category = this.toReadableLabel(this.pickFirst(meta, ['category', 'type']) || this.firstText(entry, ['category']));
    const status = this.toReadableLabel(this.pickFirst(meta, ['scholarly_status', 'status']) || this.firstText(entry, ['status']));
    const lemma = this.firstText(entry, ['lemma_ar', 'lemma_norm', 'lemma']);
    const label = this.firstText(entry, ['label']) || this.firstText(entry, ['ar_u_expression'])
      || (canonicalInput ? canonicalInput.split('|')[0].trim() : '') || `Expression ${index + 1}`;
    const surah = Number(entry['surah']);
    const ayah = Number(entry['ayah']);
    const reference = surah && ayah ? `${surah}:${ayah}` : this.firstText(entry, ['reference', 'verse']);
    const sources = this.toExpressionSources(meta['sources'] ?? entry['sources']);
    const sequence = this.toExpressionSequence(entry['sequence_json'] ?? entry['sequence']);
    const accent = this.expressionAccent({ category, status, label });
    if (!textAr && !canonical && !sources.length) return null;
    const id = (this.firstText(entry, ['ar_u_expression', 'id']) || canonical || `expr_${index + 1}`)
      .toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return { id: id || `expr_${index + 1}`, label, textAr, canonical, reference, category, status, lemma, accent, sequence, sources };
  }

  private toExpressionSequence(value: unknown): { text: string; type: string }[] {
    const source = Array.isArray(value) ? value : (this.arrayFromJsonLike(value) ?? []);
    return source.slice(0, 16).map((raw) => {
      const r = this.recordFromUnknown(raw);
      if (r) return { text: this.pickFirst(r, ['token', 'text', 'value']), type: this.toReadableLabel(this.pickFirst(r, ['type', 'role', 'pos'])) };
      return { text: String(raw ?? '').trim(), type: '' };
    }).filter((s) => s.text);
  }

  private toExpressionSources(value: unknown): { author: string; work: string }[] {
    const source = Array.isArray(value) ? value : (this.arrayFromJsonLike(value) ?? []);
    return source.slice(0, 8).map((raw) => {
      const r = this.recordFromUnknown(raw);
      if (r) return { author: this.pickFirst(r, ['author', 'name']) || 'Source', work: this.pickFirst(r, ['work', 'title', 'source']) || '' };
      return { author: 'Source', work: String(raw ?? '').trim() };
    }).filter((s) => s.author || s.work);
  }

  private expressionAccent(ctx: { category: string; status: string; label: string }): PassageAccent {
    const sig = `${ctx.category} ${ctx.status} ${ctx.label}`.toLowerCase();
    if (sig.includes('conflict') || sig.includes('threat')) return 'orange';
    if (sig.includes('divine') || sig.includes('providence')) return 'green';
    if (sig.includes('narrative') || sig.includes('story')) return 'violet';
    if (sig.includes('grammar') || sig.includes('morph')) return 'gray';
    return 'blue';
  }

  private buildPassageSections(payload: Record<string, unknown>): PassageSection[] {
    const analysis = this.recordFromUnknown(payload['analysis']);
    const raw = Array.isArray(analysis?.['sections']) ? analysis['sections'] : [];
    const parsed = (raw as unknown[]).map((e, i) => this.toPassageSection(e, i)).filter((s): s is PassageSection => s != null);
    if (parsed.length) return parsed;
    return this.fallbackPassageSections(payload);
  }

  private toPassageSection(entry: unknown, index: number): PassageSection | null {
    const section = this.recordFromUnknown(entry);
    if (!section) return null;
    const key = String(section['key'] ?? `section_${index + 1}`);
    const data = this.recordFromUnknown(section['data']) ?? {};
    const ui = this.recordFromUnknown(section['ui']) ?? {};
    const renderer = this.resolveRenderer(String(section['renderer'] ?? ''), data);
    const title = String(section['title'] ?? this.toReadableLabel(key));
    const badge = String(ui['badge'] ?? this.defaultBadge(renderer));
    const accent = this.resolveAccent({ key, title, badge, renderer, tone: String(ui['tone'] ?? '') });
    const summary = this.pickFirst(data, ['function', 'effect', 'interpretation', 'purpose']);
    const id = (String(section['id'] ?? key)).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return {
      id: id || `section_${index + 1}`, key, title, badge, renderer, accent, summary,
      keyValueRows: renderer === 'keyvalue' ? this.toKeyValueRows(data) : [],
      clusters: renderer === 'clusters' ? this.toClusters(data, accent) : [],
      chiasm: renderer === 'chiasm' ? this.toChiasm(data) : null,
      timeline: renderer === 'timeline' ? this.toTimeline(data) : [],
    };
  }

  private fallbackPassageSections(payload: Record<string, unknown>): PassageSection[] {
    const rows: PassageKeyValueRow[] = [
      { key: 'Passage', text: this.passageRef, chips: [] },
      { key: 'Heading', text: this.lessonHeading, chips: [] },
      { key: 'Overview', text: this.lessonDetail, chips: [] },
      { key: 'Scene', text: this.sceneDetail, chips: [] },
    ].filter((r) => r.text && r.text !== '—');
    return ([
      { id: 'context', key: 'context', title: 'Passage Context', badge: 'Context', renderer: 'keyvalue' as PassageRenderer, accent: 'blue' as PassageAccent, summary: '', keyValueRows: rows, clusters: [], chiasm: null, timeline: [] },
      { id: 'flow', key: 'flow', title: 'Passage Flow', badge: 'Flow', renderer: 'clusters' as PassageRenderer, accent: 'gray' as PassageAccent, summary: '', keyValueRows: [], clusters: this.toClusters(payload, 'gray'), chiasm: null, timeline: [] },
    ] as PassageSection[]).filter((s) => {
      if (s.renderer === 'clusters') return s.clusters.length > 0;
      if (s.renderer === 'keyvalue') return s.keyValueRows.length > 0;
      return true;
    });
  }

  private resolveRenderer(raw: string, data: Record<string, unknown>): PassageRenderer {
    const n = raw.trim().toLowerCase();
    if (n === 'keyvalue' || n === 'clusters' || n === 'chiasm' || n === 'timeline') return n;
    if (Array.isArray(data['clusters'])) return 'clusters';
    if (Array.isArray(data['steps'])) return 'timeline';
    if (data['outer_frame'] || data['core_axis']) return 'chiasm';
    return 'keyvalue';
  }

  private defaultBadge(renderer: PassageRenderer): string {
    if (renderer === 'clusters') return 'Clusters';
    if (renderer === 'chiasm') return 'Chiasm';
    if (renderer === 'timeline') return 'Flow';
    return 'Insight';
  }

  private resolveAccent(ctx: { key: string; title: string; badge: string; renderer: PassageRenderer; tone: string }): PassageAccent {
    const sig = `${ctx.key} ${ctx.title} ${ctx.badge}`.toLowerCase();
    if (sig.includes('providence') || sig.includes('divine') || sig.includes('blessing')) return 'green';
    if (sig.includes('conflict') || sig.includes('threat') || sig.includes('enemy')) return 'orange';
    if (sig.includes('seed') || sig.includes('dream') || sig.includes('narrative')) return 'violet';
    if (sig.includes('time') || sig.includes('flow') || sig.includes('timeline')) return 'gray';
    const tone = ctx.tone.toLowerCase();
    if (tone === 'success') return 'green';
    if (tone === 'warning' || tone === 'danger') return 'orange';
    if (tone === 'secondary') return 'gray';
    return 'blue';
  }

  private toKeyValueRows(data: Record<string, unknown>): PassageKeyValueRow[] {
    const rows: PassageKeyValueRow[] = [];
    for (const [rawKey, value] of Object.entries(data)) {
      const key = this.toReadableLabel(rawKey);
      if (Array.isArray(value)) {
        const chips = this.uniqueChips(value.map((v) => String(v).trim()).filter(Boolean));
        if (chips.length) rows.push({ key, text: '', chips });
      } else {
        const text = String(value ?? '').trim();
        if (text) rows.push({ key, text, chips: [] });
      }
    }
    return rows;
  }

  private toClusters(data: Record<string, unknown>, parentAccent: PassageAccent): PassageCluster[] {
    const source = this.objectArray(data['clusters']);
    const clusters: PassageCluster[] = [];
    if (source.length) {
      for (const [i, cluster] of source.entries()) {
        const title = this.firstText(cluster, ['name', 'title', 'label']) || `Cluster ${i + 1}`;
        const items = this.uniqueChips((Array.isArray(cluster['items']) ? cluster['items'] : []).map((v: unknown) => String(v).trim()).filter(Boolean));
        if (!items.length) continue;
        clusters.push({ title: this.toReadableLabel(title), items, accent: parentAccent });
      }
    }
    if (clusters.length) return clusters;
    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      const items = this.uniqueChips(value.map((v) => String(v).trim()).filter(Boolean));
      if (items.length) clusters.push({ title: this.toReadableLabel(key), items, accent: parentAccent });
    }
    return clusters;
  }

  private toChiasm(data: Record<string, unknown>): PassageChiasm | null {
    const outer = Object.entries(this.recordFromUnknown(data['outer_frame']) ?? {}).map(([k, v]) => `${k} · ${v}`);
    const inner = Object.entries(this.recordFromUnknown(data['inner_frame']) ?? {}).map(([k, v]) => `${k} · ${v}`);
    const axis = Object.values(this.recordFromUnknown(data['core_axis']) ?? {}).map((v) => String(v));
    const interpretation = String(data['interpretation'] ?? '').trim();
    if (!outer.length && !inner.length && !axis.length && !interpretation) return null;
    return {
      outerTop: outer[0] || 'Outer frame', outerBottom: outer[1] || outer[0] || 'Outer frame',
      innerLeft: inner[0] || 'Inner frame', innerRight: inner[1] || inner[0] || 'Inner frame',
      axis: axis[0] || 'Core axis', interpretation,
    };
  }

  private toTimeline(data: Record<string, unknown>): PassageTimelineStep[] {
    const source = Array.isArray(data['steps']) ? data['steps'] : [];
    return (source as unknown[]).map((raw, i) => {
      const r = this.recordFromUnknown(raw);
      if (!r) return { id: `step_${i + 1}`, title: `Step ${i + 1}`, text: String(raw ?? '') };
      const key = String(r['key'] ?? `step_${i + 1}`);
      const title = String(r['title'] ?? this.toReadableLabel(key));
      const text = this.pickFirst(r, ['text', 'value', 'description', 'detail']) || title;
      return { id: `${key}_${i + 1}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '_'), title, text };
    }).filter((s) => s.text);
  }

  // ── Generic helpers ────────────────────────────────────────────────────────

  private recordFromUnknown(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    return null;
  }

  private recordFromJsonLike(value: unknown): Record<string, unknown> | null {
    if (this.recordFromUnknown(value)) return value as Record<string, unknown>;
    if (typeof value === 'string') {
      try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
    }
    return null;
  }

  private arrayFromJsonLike(value: unknown): unknown[] | null {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try { const p = JSON.parse(value); return Array.isArray(p) ? p : null; } catch { return null; }
    }
    return null;
  }

  private objectArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => this.recordFromUnknown(v)).filter((v): v is Record<string, unknown> => v != null);
  }

  private firstText(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const val = String(record[key] ?? '').trim();
      if (val) return val;
    }
    return '';
  }

  private pickFirst(record: Record<string, unknown>, keys: string[]): string {
    return this.firstText(record, keys);
  }

  private uniqueChips(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))].slice(0, 20);
  }

  private uniqueTexts(values: string[], limit = 80): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of values) {
      const t = v.trim();
      if (t && !seen.has(t)) { seen.add(t); result.push(t); }
      if (result.length >= limit) break;
    }
    return result;
  }

  private toReadableLabel(raw: string): string {
    return String(raw ?? '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
