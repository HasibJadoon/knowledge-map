import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, signal, computed, effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { forkJoin } from 'rxjs';

gsap.registerPlugin(ScrollTrigger);
import {
  SurahModulesService,
  StudyLessonResponse,
  StudySurahMeta,
  UnitTaskVm,
} from '../../../../shared/services/surah-modules.service';
import { QuranStateService } from '../../../../shared/services/quran-state.service';
import { LessonReadingStepComponent } from './steps/reading/lesson-reading-step.component';
import { LessonVocabularyStepComponent } from './steps/vocabulary/lesson-vocabulary-step.component';
import { LessonSentenceStructureStepComponent } from './steps/sentence-structure/lesson-sentence-structure-step.component';
import { LessonExpressionsStepComponent } from './steps/expressions/lesson-expressions-step.component';
import { LessonPassageStructureStepComponent } from './steps/passage-structure/lesson-passage-structure-step.component';

type StepId = 'reading' | 'morphology' | 'sentence-structure' | 'expressions' | 'passage-structure';
type Phase = 'entry' | 'workspace';

interface StepDef {
  id: StepId;
  label: string;
  kicker: string;
  summary: string;
}

type StepState = 'complete' | 'active' | 'upcoming';

interface StepIntroPayload {
  titles?: {
    arabic?: string;
    english?: string;
    subtitle?: string;
  };
  description?: string;
  labels?: {
    passage?: string;
    ayah?: string;
    action?: string;
  };
}

interface StepIntroView {
  arabicTitle: string | null;
  englishTitle: string;
  subtitle: string | null;
  description: string;
  passageLabel: string;
  ayahLabel: string;
  actionLabel: string;
}

const STEPS: StepDef[] = [
  {
    id: 'reading',
    label: 'Reading',
    kicker: 'Step 01',
    summary: 'Begin with the ayat in a clean reading panel and enter the passage before analysis.',
  },
  {
    id: 'morphology',
    label: 'Morphology',
    kicker: 'Step 02',
    summary: 'Move into the word forms, roots, and patterns that shape the passage.',
  },
  {
    id: 'sentence-structure',
    label: 'Sentence Structure',
    kicker: 'Step 03',
    summary: 'Unpack the sentence flow, structure tree, and treebank relationships.',
  },
  {
    id: 'expressions',
    label: 'Expressions',
    kicker: 'Step 04',
    summary: 'Review the expressions and recurring phrasal units anchored in this passage.',
  },
  {
    id: 'passage-structure',
    label: 'Passage Structure',
    kicker: 'Step 05',
    summary: 'Finish with the higher-level structure and how the passage is architected as a whole.',
  },
];

interface HeroConfig {
  quoteAr?: string;
  quoteRef?: string;
  surahTitle?: string;
  surahSubtitle?: string;
}

@Component({
  selector: 'km-surah-lesson-page',
  standalone: true,
  imports: [
    LessonReadingStepComponent,
    LessonVocabularyStepComponent,
    LessonSentenceStructureStepComponent,
    LessonExpressionsStepComponent,
    LessonPassageStructureStepComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-lesson-page.component.html',
  styleUrl: './surah-lesson-page.component.scss',
})
export class SurahLessonPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private quranState = inject(QuranStateService);
  private elRef = inject(ElementRef);

  readonly steps = STEPS;

  // ── State ────────────────────────────────────────────────
  phase = signal<Phase>('entry');
  surahId = signal(0);
  passageNo = signal(0);
  activeStep = signal<StepId>('reading');
  unit = signal<StudyLessonResponse['unit'] | null>(null);
  tasks = signal<UnitTaskVm[]>([]);
  lesson = signal<StudyLessonResponse | null>(null);
  heroConfig = signal<HeroConfig>({});
  unlockedSteps = signal<StepId[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  stepLoading = signal(false);
  stepError = signal<string | null>(null);

  private entryTl: gsap.core.Timeline | null = null;
  private stepAnimTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly stepDataCache = new Map<StepId, StudyLessonResponse>();

  surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find(s => s.surahNumber === id) ?? null;
  });

  constructor() {
    // Animate the visible workspace state whenever the current step changes.
    effect(() => {
      const _step = this.activeStep();
      const _unlocked = this.isStepUnlocked(_step);
      if (this.phase() !== 'workspace') return;
      if (_unlocked) this.ensureStepDataLoaded(_step);
      if (this.stepAnimTimeout) clearTimeout(this.stepAnimTimeout);
      this.stepAnimTimeout = setTimeout(() => this.animateCurrentStage(), 60);
    });
  }

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    const passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 0;
    this.surahId.set(surahId);
    this.passageNo.set(passageNo);

    const rawStepParam = this.route.snapshot.queryParamMap.get('step')
      ?? this.route.snapshot.queryParamMap.get('tab');
    const stepParam = this.normalizeStepParam(rawStepParam);
    if (stepParam && STEPS.some(step => step.id === stepParam)) {
      this.activeStep.set(stepParam);
    }

    this.quranState.load();

    forkJoin({
      grid: this.svc.getStudyGrid(surahId),
      tasks: this.svc.getStudyTasks(surahId, passageNo),
    }).subscribe({
      next: ({ grid, tasks }) => {
        this.parseContainerMeta(grid.surah);

        const currentUnit = grid.units.find((unit) => unit.order_index === passageNo);
        if (!currentUnit) {
          this.error.set('Passage not found');
          this.loading.set(false);
          return;
        }

        this.unit.set({
          unit_id: currentUnit.unit_id,
          order_index: currentUnit.order_index,
          ayah_from: currentUnit.ayah_from,
          ayah_to: currentUnit.ayah_to,
          start_ref: currentUnit.start_ref,
          end_ref: currentUnit.end_ref,
          text_cache: currentUnit.text_cache,
          label: currentUnit.label,
          theme: currentUnit.theme,
        });
        this.tasks.set(tasks.tasks ?? []);
        this.loading.set(false);
        setTimeout(() => this.runEntryAnimation(), 120);
      },
      error: () => {
        this.error.set('Failed to load lesson');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.entryTl?.kill();
    if (this.stepAnimTimeout) clearTimeout(this.stepAnimTimeout);
    ScrollTrigger.getAll().forEach(st => st.kill());
  }

  // ── Container meta ───────────────────────────────────────

  private parseContainerMeta(surah: StudySurahMeta): void {
    if (!surah.meta_json) return;
    try {
      const meta = JSON.parse(surah.meta_json);
      this.heroConfig.set({
        quoteAr: meta?.ui?.hero?.quote_ar,
        quoteRef: meta?.ui?.hero?.quote_ref,
        surahTitle: meta?.title,
        surahSubtitle: meta?.subtitle,
      });
    } catch {}
  }

  private ensureStepDataLoaded(stepId: StepId): void {
    const cached = this.stepDataCache.get(stepId);
    if (cached) {
      this.lesson.set(cached);
      this.stepLoading.set(false);
      this.stepError.set(null);
      return;
    }

    const unit = this.unit();
    if (!unit) return;

    this.stepLoading.set(true);
    this.stepError.set(null);
    this.lesson.set(null);

    const surahId = this.surahId();
    const passageNo = this.passageNo();
    const onSuccess = (lesson: StudyLessonResponse) => {
      this.stepDataCache.set(stepId, lesson);
      if (this.activeStep() === stepId) {
        this.lesson.set(lesson);
      }
      this.stepLoading.set(false);
      this.stepError.set(null);
    };
    const onError = () => {
      if (this.activeStep() === stepId) {
        this.lesson.set(null);
      }
      this.stepLoading.set(false);
      this.stepError.set('Failed to load this step.');
    };

    switch (stepId) {
      case 'reading':
        this.svc.getStudyReading(surahId, passageNo).subscribe({
          next: (response) => onSuccess({
            ok: response.ok,
            lessonId: null,
            surahId,
            passageNo,
            unit: this.mergeShellUnit(response.unit),
            ayahs: response.ayahs ?? [],
            vocabulary: { nouns: [], verbs: [] },
            expressions: [],
            tasks: this.replaceTask(response.task),
          }),
          error: onError,
        });
        break;
      case 'morphology':
        this.svc.getStudyMorphology(surahId, passageNo).subscribe({
          next: (response) => onSuccess({
            ok: response.ok,
            lessonId: null,
            surahId,
            passageNo,
            unit: this.mergeShellUnit(response.unit),
            ayahs: [],
            vocabulary: {
              nouns: response.nouns ?? [],
              verbs: response.verbs ?? [],
            },
            expressions: [],
            tasks: this.replaceTask(response.task),
          }),
          error: onError,
        });
        break;
      case 'sentence-structure':
        this.svc.getStudySentenceStructure(surahId, passageNo).subscribe({
          next: (response) => onSuccess({
            ok: response.ok,
            lessonId: null,
            surahId,
            passageNo,
            unit: this.mergeShellUnit(response.unit),
            ayahs: [],
            vocabulary: { nouns: [], verbs: [] },
            expressions: [],
            tasks: this.replaceTask(response.task),
          }),
          error: onError,
        });
        break;
      case 'expressions':
        this.svc.getStudyExpressions(surahId, passageNo).subscribe({
          next: (response) => onSuccess({
            ok: response.ok,
            lessonId: null,
            surahId,
            passageNo,
            unit: this.mergeShellUnit(response.unit),
            ayahs: [],
            vocabulary: { nouns: [], verbs: [] },
            expressions: response.expressions ?? [],
            tasks: this.replaceTask(response.task),
          }),
          error: onError,
        });
        break;
      case 'passage-structure':
        this.svc.getStudyPassageStructure(surahId, passageNo).subscribe({
          next: (response) => onSuccess({
            ok: response.ok,
            lessonId: null,
            surahId,
            passageNo,
            unit: this.mergeShellUnit(response.unit),
            ayahs: [],
            vocabulary: { nouns: [], verbs: [] },
            expressions: [],
            tasks: this.replaceTask(response.task),
          }),
          error: onError,
        });
        break;
    }
  }

  private mergeShellUnit(stepUnit: StudyLessonResponse['unit'] | null | undefined): StudyLessonResponse['unit'] {
    const shellUnit = this.unit();
    return {
      unit_id: stepUnit?.unit_id ?? shellUnit?.unit_id ?? '',
      order_index: stepUnit?.order_index ?? shellUnit?.order_index ?? this.passageNo(),
      ayah_from: stepUnit?.ayah_from ?? shellUnit?.ayah_from ?? 0,
      ayah_to: stepUnit?.ayah_to ?? shellUnit?.ayah_to ?? 0,
      start_ref: stepUnit?.start_ref ?? shellUnit?.start_ref,
      end_ref: stepUnit?.end_ref ?? shellUnit?.end_ref,
      text_cache: shellUnit?.text_cache ?? stepUnit?.text_cache,
      label: shellUnit?.label ?? stepUnit?.label,
      theme: shellUnit?.theme ?? stepUnit?.theme,
    };
  }

  private replaceTask(task: UnitTaskVm | null | undefined): UnitTaskVm[] {
    if (!task) return this.tasks();
    const current = this.tasks();
    const next = current.map((entry) => (entry.task_type === task.task_type ? task : entry));
    return next.some((entry) => entry.task_type === task.task_type) ? next : [...next, task];
  }

  // ── Entry animation — query DOM directly (reliable with @if + OnPush) ──

  private runEntryAnimation(): void {
    if (this.phase() !== 'entry') return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const entryBg   = root.querySelector<HTMLElement>('.entry__bg');
    const goldSweep = root.querySelector<HTMLElement>('.entry__gold-sweep');
    const entryAr   = root.querySelector<HTMLElement>('.entry__arabic');
    const entryTitles = root.querySelector<HTMLElement>('.entry__titles');
    const entryTheme  = root.querySelector<HTMLElement>('.entry__theme');
    const entryQuote  = root.querySelector<HTMLElement>('.entry__quote');
    const startBtn    = root.querySelector<HTMLElement>('.entry__start');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    this.entryTl = tl;

    if (entryBg)      tl.fromTo(entryBg,      { opacity: 0 },              { opacity: 1, duration: 1.0 });
    if (goldSweep)    tl.fromTo(goldSweep,     { scaleX: 0, opacity: 0 },  { scaleX: 1, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, '-=0.5');
    if (entryAr)      tl.fromTo(entryAr,       { opacity: 0, y: 30 },      { opacity: 1, y: 0, duration: 0.65 }, '-=0.3');
    if (entryTitles)  tl.fromTo(entryTitles,   { opacity: 0, y: 20 },      { opacity: 1, y: 0, duration: 0.55 }, '-=0.2');
    if (entryTheme)   tl.fromTo(entryTheme,    { opacity: 0, y: 14 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.15');
    if (entryQuote)   tl.fromTo(entryQuote,    { opacity: 0 },              { opacity: 1, duration: 0.6 }, '-=0.1');
    if (startBtn)     tl.fromTo(startBtn,      { opacity: 0, scale: 0.85, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, '-=0.1');
    tl.add(() => this.animateLoopingArrow('.entry__start-arrow'), '+=0.05');
  }

  // ── Start button ─────────────────────────────────────────

  startStudy(event?: MouseEvent): void {
    if (this.phase() !== 'entry') return;
    this.entryTl?.kill();

    const root = this.elRef.nativeElement as HTMLElement;
    const entryEl = root.querySelector<HTMLElement>('.entry');
    const button = this.resolveButtonTarget(event, '.entry__start');

    const proceed = () => {
      this.phase.set('workspace');
      this.unlockedSteps.set([]);
      setTimeout(() => this.runWorkspaceAnimation(), 60);
    };

    if (!entryEl) { proceed(); return; }

    const animateOut = () => {
      gsap.to(entryEl, {
        opacity: 0, y: -50,
        duration: 0.45, ease: 'power3.in',
        onComplete: proceed,
      });
    };

    if (!button) {
      animateOut();
      return;
    }

    this.animateAdvanceButton(button, animateOut);
  }

  // ── Workspace animation ──────────────────────────────────

  private runWorkspaceAnimation(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const heroBg     = root.querySelector<HTMLElement>('.hero__bg');
    const heroAr     = root.querySelector<HTMLElement>('.hero__ar');
    const heroEn     = root.querySelector<HTMLElement>('.hero__en');
    const heroDivider = root.querySelector<HTMLElement>('.hero__divider');
    const stepPanel  = root.querySelector<HTMLElement>('.step-panel');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (heroBg)      tl.fromTo(heroBg,      { opacity: 0 },             { opacity: 1, duration: 0.7 });
    if (heroAr)      tl.fromTo(heroAr,      { opacity: 0, y: 20 },      { opacity: 1, y: 0, duration: 0.55 }, '-=0.3');
    if (heroEn)      tl.fromTo(heroEn,      { opacity: 0, y: 14 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.2');
    if (heroDivider) tl.fromTo(heroDivider, { scaleX: 0, opacity: 0 },  { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' }, '-=0.1');
    if (stepPanel)   tl.fromTo(stepPanel,   { opacity: 0, y: 18 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.08');

    tl.add(() => this.animateCurrentStage(), '+=0.05');
  }

  private animateCurrentStage(): void {
    if (this.currentStepLocked()) {
      this.animateStepGate();
      return;
    }
    this.animateStepPanel();
  }

  private animateStepGate(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const panel = root.querySelector<HTMLElement>('.step-panel');
    const gate = root.querySelector<HTMLElement>('.step-gate');
    if (!panel || !gate) return;

    const pieces = Array.from(gate.querySelectorAll<HTMLElement>(
      '.step-gate__arabic, .step-gate__title, .step-gate__subtitle, .step-gate__chips, .step-gate__divider, .step-gate__description, .step-gate__button',
    ));

    gsap.killTweensOf(panel.querySelectorAll('*'));
    gsap.set(pieces, { opacity: 0, y: 18 });
    gsap.fromTo(
      panel,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    );
    if (pieces.length) {
      gsap.to(pieces, {
        opacity: 1,
        y: 0,
        duration: 0.46,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.12,
        onComplete: () => this.animateLoopingArrow('.step-gate__button-arrow'),
      });
    }
  }

  // ── Step panel animation — fires on every step change ─────

  private animateStepPanel(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const panel = root.querySelector<HTMLElement>('.step-panel');
    if (!panel) return;

    gsap.killTweensOf(panel.querySelectorAll('*'));
    gsap.fromTo(panel,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out',
        onComplete: () => this.animateStepCards(panel)
      }
    );
  }

  private animateStepCards(panel: HTMLElement): void {
    ScrollTrigger.getAll()
      .filter(st => panel.contains(st.trigger as Node))
      .forEach(st => st.kill());

    const cardSel = [
      '.word-card',
      '.expr-card',
      '.rt-passage',
      '.section-card',
      '.sst__hero',
      '.sst__task-card',
      '.sst__panel',
      '.sst-node',
    ].join(', ');

    const cards = Array.from(panel.querySelectorAll<HTMLElement>(cardSel));
    if (!cards.length) return;

    gsap.set(cards, { opacity: 0, y: 24 });

    cards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        scroller: document.body,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: 'power2.out',
            delay: Math.min(i * 0.04, 0.3),
          });
        },
      });
    });

    ScrollTrigger.refresh();
  }

  // ── Step management ──────────────────────────────────────

  beginCurrentStep(event?: MouseEvent): void {
    const stepId = this.activeStep();
    if (this.isStepUnlocked(stepId)) {
      this.replayCurrentStep();
      return;
    }

    const root = this.elRef.nativeElement as HTMLElement;
    const gate = root.querySelector<HTMLElement>('.step-gate');
    const button = this.resolveButtonTarget(event, '.step-gate__button');
    const unlock = () => this.unlockStep(stepId);

    if (!gate) {
      unlock();
      return;
    }

    const animateOut = () => {
      gsap.to(gate, {
        opacity: 0,
        y: -20,
        duration: 0.34,
        ease: 'power3.in',
        onComplete: unlock,
      });
    };

    if (!button) {
      animateOut();
      return;
    }

    this.animateAdvanceButton(button, animateOut);
  }

  selectStep(id: StepId): void {
    this.activeStep.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: id, tab: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  replayCurrentStep(): void {
    if (this.stepAnimTimeout) clearTimeout(this.stepAnimTimeout);
    this.stepAnimTimeout = setTimeout(() => this.animateStepPanel(), 30);
  }

  previousStep(): void {
    const index = this.currentStepIndex();
    if (index <= 0) return;
    this.selectStep(this.steps[index - 1].id);
  }

  nextStep(): void {
    const index = this.currentStepIndex();
    if (index >= this.steps.length - 1) return;
    this.selectStep(this.steps[index + 1].id);
  }

  canGoPrevious(): boolean {
    return this.currentStepIndex() > 0;
  }

  canGoNext(): boolean {
    return this.currentStepIndex() < this.steps.length - 1;
  }

  currentStepIndex(): number {
    const index = this.steps.findIndex((step) => step.id === this.activeStep());
    return index >= 0 ? index : 0;
  }

  currentStep(): StepDef {
    return this.steps[this.currentStepIndex()] ?? this.steps[0];
  }

  currentStepLocked(): boolean {
    return !this.isStepUnlocked(this.activeStep());
  }

  currentStepIntro(): StepIntroView {
    const step = this.currentStep();
    const task = this.rootTaskForStep(step.id);
    const payload = this.parseStepIntroPayload(task?.task_json);
    const titles = payload?.titles ?? {};
    const labels = payload?.labels ?? {};

    return {
      arabicTitle: this.cleanString(titles.arabic),
      englishTitle: this.cleanString(titles.english) ?? task?.task_name?.trim() ?? step.label,
      subtitle: this.cleanString(titles.subtitle),
      description: this.cleanString(payload?.description) ?? step.summary,
      passageLabel: this.cleanString(labels.passage) ?? `Passage ${this.passageNo()}`,
      ayahLabel: this.cleanString(labels.ayah) ?? `Ayah ${this.ayahDisplay()}`,
      actionLabel: this.cleanString(labels.action)
        ?? `BEGIN ${(task?.task_name?.trim() ?? step.label).toUpperCase()}`,
    };
  }

  stepState(index: number): StepState {
    const current = this.currentStepIndex();
    if (index < current) return 'complete';
    if (index === current) return 'active';
    return 'upcoming';
  }

  stepStateLabel(index: number): string {
    switch (this.stepState(index)) {
      case 'complete':
        return 'Completed';
      case 'active':
        return 'Current';
      default:
        return 'Upcoming';
    }
  }

  progressPercent(): number {
    return ((this.currentStepIndex() + 1) / this.steps.length) * 100;
  }

  previousStepLabel(): string {
    if (!this.canGoPrevious()) return 'Beginning';
    return this.steps[this.currentStepIndex() - 1].label;
  }

  nextStepLabel(): string {
    if (!this.canGoNext()) return 'Completed';
    return this.steps[this.currentStepIndex() + 1].label;
  }

  stepNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  back(): void {
    this.router.navigate(['/quran', 'surah', this.surahId(), 'study']);
  }

  ayahRange(): string {
    const u = this.unit();
    if (!u) return '';
    const sid = this.surahId();
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${sid}:${u.ayah_from}\u2013${u.ayah_to}`
      : `${sid}:${u.ayah_from}`;
  }

  ayahDisplay(): string {
    const u = this.unit();
    if (!u) return '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${u.ayah_from}\u2013${u.ayah_to}`
      : `${u.ayah_from}`;
  }

  private rootTaskForStep(stepId: StepId): UnitTaskVm | null {
    const taskType = this.taskTypeForStep(stepId);
    return this.tasks().find((task) => task.task_type === taskType) ?? null;
  }

  private taskTypeForStep(stepId: StepId): UnitTaskVm['task_type'] {
    switch (stepId) {
      case 'morphology':
        return 'morphology';
      case 'sentence-structure':
        return 'sentence_structure';
      case 'passage-structure':
        return 'passage_structure';
      default:
        return stepId;
    }
  }

  private isStepUnlocked(stepId: StepId): boolean {
    return this.unlockedSteps().includes(stepId);
  }

  private unlockStep(stepId: StepId): void {
    this.unlockedSteps.update((steps) => (steps.includes(stepId) ? steps : [...steps, stepId]));
  }

  private parseStepIntroPayload(raw: unknown): StepIntroPayload | null {
    const parsed = this.parseJsonLike(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null;
    return parsed as StepIntroPayload;
  }

  private parseJsonLike(raw: unknown): unknown {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }

  private cleanString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private animateLoopingArrow(selector: string): void {
    const root = this.elRef.nativeElement as HTMLElement;
    const arrow = root.querySelector<HTMLElement>(selector);
    if (!arrow) return;
    gsap.killTweensOf(arrow);
    gsap.set(arrow, { x: 0 });
    gsap.to(arrow, {
      x: 8,
      duration: 1.05,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true,
    });
  }

  private animateAdvanceButton(button: HTMLElement, onComplete: () => void): void {
    const arrow = button.querySelector<HTMLElement>('.entry__start-arrow, .step-gate__button-arrow');
    const label = button.querySelector<HTMLElement>('.entry__start-label, .step-gate__button-label');

    if (arrow) gsap.killTweensOf(arrow);

    const tl = gsap.timeline({ onComplete });
    tl.to(button, {
      scale: 0.985,
      duration: 0.12,
      ease: 'power2.out',
    });
    if (label) {
      tl.to(label, {
        letterSpacing: '0.28em',
        duration: 0.18,
        ease: 'power2.out',
      }, 0);
    }
    if (arrow) {
      tl.to(arrow, {
        x: 26,
        y: -4,
        opacity: 0,
        duration: 0.26,
        ease: 'power2.in',
      }, 0.02);
    }
    tl.to(button, {
      x: 16,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.08);
  }

  private resolveButtonTarget(event: MouseEvent | undefined, selector: string): HTMLElement | null {
    const currentTarget = event?.currentTarget;
    if (currentTarget instanceof HTMLElement) {
      return currentTarget.closest(selector) as HTMLElement ?? currentTarget;
    }
    const root = this.elRef.nativeElement as HTMLElement;
    return root.querySelector<HTMLElement>(selector);
  }

  private normalizeStepParam(value: string | null): StepId | null {
    if (!value) return null;
    if (value === 'vocabulary') return 'morphology';
    if (STEPS.some((step) => step.id === value)) {
      return value as StepId;
    }
    return null;
  }

}
