import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';
import { Subscription, forkJoin } from 'rxjs';
import {
  StudyLessonResponse,
  StudySurahMeta,
  SurahModulesService,
  UnitTaskVm,
  WorldviewHubResponse,
} from '../../../../shared/services/surah-modules.service';
import { QuranStateService } from '../../../../shared/services/quran-state.service';
import { UiSettingsService } from '../../../../shared/services/ui-settings.service';
import { LessonExpressionsStepComponent } from './steps/expressions/lesson-expressions-step.component';
import { LessonPassageStructureStepComponent } from './steps/passage-structure/lesson-passage-structure-step.component';
import { LessonReadingStepComponent } from './steps/reading/lesson-reading-step.component';
import { LessonSentenceStructureStepComponent } from './steps/sentence-structure/lesson-sentence-structure-step.component';
import { LessonVocabularyStepComponent } from './steps/vocabulary/lesson-vocabulary-step.component';

type StepId =
  | 'reading'
  | 'morphology'
  | 'sentence-structure'
  | 'expressions'
  | 'passage-structure'
  | 'worldview';

interface StepDef {
  id: StepId;
  title: string;
  arabicTitle: string;
  subtitle: string;
  description: string;
  badge: string;
  accent: string;
  category?: string;
  iconName?: string;
  accentStart: string;
  accentEnd: string;
  accentStrong: string;
}

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
  arabicTitle: string;
  englishTitle: string;
  subtitle: string;
  description: string;
  passageLabel: string;
  ayahLabel: string;
}

interface HeroConfig {
  quoteAr?: string;
  quoteRef?: string;
  surahTitle?: string;
  surahSubtitle?: string;
}

interface WorldviewCard {
  label: string;
  value: string;
  description: string;
}

interface WorldviewSummaryView {
  cards: WorldviewCard[];
  prompts: string[];
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STEPS: StepDef[] = [
  {
    id: 'reading',
    title: 'Reading',
    arabicTitle: 'القراءة',
    subtitle: 'Follow the ayah',
    description:
      'Show ayah text, translation, recitation focus, and guided follow-along reading mode.',
    badge: 'Layer 01',
    accent: 'Recitation',
    category: 'Foundational Reading',
    iconName: 'book-open',
    accentStart: '#4b271a',
    accentEnd: '#8a5236',
    accentStrong: '#d6a177',
  },
  {
    id: 'morphology',
    title: 'Morphology',
    arabicTitle: 'الصرف',
    subtitle: 'Roots and patterns',
    description:
      'Show roots, forms, derived words, and morphology study cards for the passage.',
    badge: 'Layer 02',
    accent: 'Word Forms',
    category: 'Lexical Study',
    iconName: 'branch',
    accentStart: '#403116',
    accentEnd: '#756128',
    accentStrong: '#d0b56b',
  },
  {
    id: 'sentence-structure',
    title: 'Sentence Structure',
    arabicTitle: 'بناء الجملة',
    subtitle: 'How the sentence is built',
    description:
      'Show clauses, phrases, grammar functions, and syntactic breakdown inside the ayah.',
    badge: 'Layer 03',
    accent: 'Syntax',
    category: 'Grammar Architecture',
    iconName: 'network',
    accentStart: '#172635',
    accentEnd: '#284862',
    accentStrong: '#7ea7d8',
  },
  {
    id: 'expressions',
    title: 'Expressions',
    arabicTitle: 'التعبيرات',
    subtitle: 'Meaning beyond single words',
    description:
      'Show idioms, rhetorical phrases, and semantic expressions that shape the passage.',
    badge: 'Layer 04',
    accent: 'Semantics',
    category: 'Meaning Layers',
    iconName: 'spark',
    accentStart: '#311624',
    accentEnd: '#5d3048',
    accentStrong: '#c78cab',
  },
  {
    id: 'passage-structure',
    title: 'Passage Structure',
    arabicTitle: 'بنية المقطع',
    subtitle: 'The flow of the passage',
    description:
      'Show thematic movement, section flow, discourse structure, and passage-level architecture.',
    badge: 'Layer 05',
    accent: 'Architecture',
    category: 'Discourse Flow',
    iconName: 'layout',
    accentStart: '#231c3f',
    accentEnd: '#44376f',
    accentStrong: '#9a8ce0',
  },
  {
    id: 'worldview',
    title: 'Worldview',
    arabicTitle: 'الرؤية',
    subtitle: 'Claims, evidence, higher-order ideas',
    description:
      'Show concepts, claims, evidences, and higher-order ideas that open the worldview horizon of the passage.',
    badge: 'Layer 06',
    accent: 'Worldview',
    category: 'Reflection Layer',
    iconName: 'compass',
    accentStart: '#1c2335',
    accentEnd: '#38456b',
    accentStrong: '#9eb6ec',
  },
];

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
export class SurahLessonPageComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly svc = inject(SurahModulesService);
  private readonly quranState = inject(QuranStateService);
  private readonly uiSettings = inject(UiSettingsService);

  @ViewChild('sceneEl') sceneEl?: ElementRef<HTMLElement>;
  @ViewChild('panelEl') panelEl?: ElementRef<HTMLElement>;
  @ViewChild('panelSurfaceEl') panelSurfaceEl?: ElementRef<HTMLElement>;
  @ViewChild('panelInnerEl') panelInnerEl?: ElementRef<HTMLElement>;
  @ViewChild('panelWorkspaceEl') panelWorkspaceEl?: ElementRef<HTMLElement>;
  @ViewChild('closedHeroEl') closedHeroEl?: ElementRef<HTMLElement>;
  @ViewChildren('stripEl') stripEls?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('ambientEl') ambientEls?: QueryList<ElementRef<HTMLElement>>;

  readonly steps = STEPS;
  readonly totalSteps = STEPS.length;
  readonly panelOpen = computed(
    () => this.currentStep() > 0 && this.activeStepId() !== null,
  );
  readonly activeStep = computed(() => {
    const stepId = this.activeStepId();
    if (stepId) {
      return this.stepById(stepId);
    }

    const fallbackIndex = Math.min(
      Math.max(this.currentStep() - 1, 0),
      this.steps.length - 1,
    );
    return this.steps[fallbackIndex];
  });
  readonly worldviewSummary = computed<WorldviewSummaryView>(() => {
    const counts = this.worldviewHub()?.counts ?? {
      nodes: 0,
      sources: 0,
      notes: 0,
      documents: 0,
    };
    const surahTitle = this.surahName()?.englishName ?? `Surah ${this.surahId()}`;
    const passageLabel = `Passage ${this.passageNo()}`;

    return {
      cards: [
        {
          label: 'Concept Nodes',
          value: String(counts.nodes),
          description:
            'Named concepts and connected claims that map the conceptual terrain of the surah.',
        },
        {
          label: 'Evidence Sources',
          value: String(counts.sources),
          description:
            'Supporting references, research trails, and interpretive evidence linked into the worldview graph.',
        },
        {
          label: 'Reflection Notes',
          value: String(counts.notes),
          description:
            'Captured reflections that move from textual observation toward belief, orientation, and judgment.',
        },
        {
          label: 'Study Documents',
          value: String(counts.documents),
          description:
            'Long-form documents that frame higher-order ideas emerging from the text.',
        },
      ],
      prompts: [
        `How does ${surahTitle} move from image to meaning inside ${passageLabel}?`,
        'Which claim about knowledge, guidance, or human perception is being formed by these ayat?',
        'What evidence inside the passage anchors that claim and turns it into a worldview statement?',
        'Which later study channels should open next: nodes, notes, documents, or sources?',
      ],
    };
  });

  surahId = signal(0);
  passageNo = signal(0);
  currentStep = signal(0);
  activeStepId = signal<StepId | null>(null);
  unit = signal<StudyLessonResponse['unit'] | null>(null);
  tasks = signal<UnitTaskVm[]>([]);
  lesson = signal<StudyLessonResponse | null>(null);
  worldviewHub = signal<WorldviewHubResponse | null>(null);
  heroConfig = signal<HeroConfig>({});
  loading = signal(true);
  error = signal<string | null>(null);
  stepLoading = signal(false);
  stepError = signal<string | null>(null);
  transitioning = signal(false);
  obsOverlayEnabled = this.uiSettings.obsOverlayEnabled;
  obsOverlayTopRight = computed(
    () =>
      this.uiSettings.obsOverlayEnabled() &&
      this.uiSettings.obsOverlayPosition() === 'top-right',
  );

  private readonly stepDataCache = new Map<StepId, StudyLessonResponse>();
  private sceneTimeline: gsap.core.Timeline | null = null;
  private ambientTimeline: gsap.core.Timeline | null = null;
  private landingTimeline: gsap.core.Timeline | null = null;
  private routeQuerySub?: Subscription;
  private routeStepParam: StepId | null = null;
  private viewReady = false;
  private landingPlayed = false;

  readonly surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find((surah) => surah.surahNumber === id) ?? null;
  });

  ngOnInit(): void {
    const surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    const passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 0;
    const rawStepParam =
      this.route.snapshot.queryParamMap.get('step') ??
      this.route.snapshot.queryParamMap.get('tab');
    const stepParam = this.normalizeStepParam(rawStepParam);
    const stepIndex = stepParam
      ? this.steps.findIndex((step) => step.id === stepParam)
      : -1;

    this.surahId.set(surahId);
    this.passageNo.set(passageNo);
    this.routeStepParam = stepParam;
    this.currentStep.set(stepIndex >= 0 ? stepIndex + 1 : 0);
    this.activeStepId.set(stepIndex >= 0 ? stepParam : null);
    this.watchRouteStepParam();

    this.quranState.load();

    forkJoin({
      grid: this.svc.getStudyGrid(surahId),
      tasks: this.svc.getStudyTasks(surahId, passageNo),
    }).subscribe({
      next: ({ grid, tasks }) => {
        this.parseContainerMeta(grid.surah);

        const currentUnit = grid.units.find(
          (entry) => entry.order_index === passageNo,
        );
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

        if (this.routeStepParam) {
          void this.ensureStepDataLoaded(this.routeStepParam);
        }

        this.syncSceneAfterRender(true);
      },
      error: () => {
        this.error.set('Failed to load lesson');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.startAmbientMotion();
    this.syncSceneAfterRender(true);
  }

  ngOnDestroy(): void {
    this.sceneTimeline?.kill();
    this.ambientTimeline?.kill();
    this.landingTimeline?.kill();
    this.routeQuerySub?.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncSceneAfterRender(true);
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (
      event.key === 'Escape' &&
      this.currentStep() > 0 &&
      !this.transitioning()
    ) {
      event.preventDefault();
      this.resetScene();
    }
  }

  onSceneWheel(event: WheelEvent): void {
    if (event.defaultPrevented || event.ctrlKey || !this.panelOpen()) return;

    const scene = this.sceneEl?.nativeElement;
    const workspace = this.panelWorkspaceEl?.nativeElement;
    if (!scene || !workspace || this.isCompactLayout(scene)) return;

    const target = event.target;
    if (target instanceof Node && workspace.contains(target)) {
      return;
    }

    if (workspace.scrollHeight <= workspace.clientHeight) return;

    const deltaY = this.normalizeWheelDelta(event);
    if (!deltaY) return;

    workspace.scrollTop += deltaY;
    event.preventDefault();
  }

  activateStrip(index: number): void {
    if (this.transitioning()) return;
    if (index < 0 || index >= this.steps.length) return;
    const targetStep = index < this.currentStep() ? index : index + 1;
    void this.transitionToStepCount(targetStep);
  }

  openNextStep(): void {
    if (this.transitioning() || this.currentStep() >= this.steps.length) return;
    void this.transitionToStepCount(this.currentStep() + 1);
  }

  nextStep(): void {
    if (this.transitioning() || this.currentStep() >= this.steps.length) return;
    void this.transitionToStepCount(this.currentStep() + 1);
  }

  previousStep(): void {
    if (this.transitioning() || this.currentStep() === 0) return;
    void this.transitionToStepCount(this.currentStep() - 1);
  }

  resetScene(immediate = false): void {
    if (!this.currentStep() && !immediate) return;
    void this.transitionToStepCount(0, immediate);
  }

  canReset(): boolean {
    return this.currentStep() > 0;
  }

  canGoPrevious(): boolean {
    return this.currentStep() > 0;
  }

  canGoNext(): boolean {
    return this.currentStep() < this.steps.length;
  }

  activeStepIndex(): number {
    const stepId = this.activeStepId();
    if (!stepId) return -1;
    return this.steps.findIndex((step) => step.id === stepId);
  }

  isOpened(index: number): boolean {
    return index < this.currentStep();
  }

  isFrontier(index: number): boolean {
    return this.currentStep() < this.steps.length && index === this.currentStep();
  }

  isFuture(index: number): boolean {
    return index > this.currentStep();
  }

  isActive(index: number): boolean {
    return this.currentStep() > 0 && index === this.currentStep() - 1;
  }

  stripAriaLabel(index: number): string {
    const step = this.steps[index];
    const status = index < this.currentStep()
      ? 'opened, click to close back from here'
      : 'closed, click to open to this layer';
    return `${step.title}, ${step.badge}, ${status}`;
  }

  currentStepIntro(): StepIntroView {
    const step = this.activeStep();
    const task = this.rootTaskForStep(step.id);
    const payload = this.parseStepIntroPayload(task?.task_json);
    const titles = payload?.titles ?? {};
    const labels = payload?.labels ?? {};

    return {
      arabicTitle: this.cleanString(titles.arabic) ?? step.arabicTitle,
      englishTitle:
        this.cleanString(titles.english) ??
        task?.task_name?.trim() ??
        step.title,
      subtitle: this.cleanString(titles.subtitle) ?? step.subtitle,
      description: this.cleanString(payload?.description) ?? step.description,
      passageLabel:
        this.cleanString(labels.passage) ?? `Passage ${this.passageNo()}`,
      ayahLabel: this.cleanString(labels.ayah) ?? `Ayah ${this.ayahDisplay()}`,
    };
  }

  currentStepLabel(): string {
    const step = this.currentStep();
    return `${step} / ${this.steps.length}`;
  }

  nextFrontierLabel(): string {
    if (this.currentStep() >= this.steps.length) {
      return 'All study layers opened';
    }
    return this.steps[this.currentStep()].title;
  }

  themeText(): string {
    return (
      this.unit()?.theme?.trim() ??
      this.heroConfig().surahSubtitle?.trim() ??
      'A guided study workspace for this passage.'
    );
  }

  chamberLead(): string {
    return 'Unfold the study chamber one gate at a time, from recitation and roots to passage architecture and worldview.';
  }

  chamberQuote(): string | null {
    return this.cleanString(this.heroConfig().quoteAr);
  }

  back(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/quran', 'surah', this.surahId(), 'study']);
  }

  ayahRange(): string {
    const unit = this.unit();
    if (!unit) return '';
    const sid = this.surahId();
    return unit.ayah_to && unit.ayah_to !== unit.ayah_from
      ? `${sid}:${unit.ayah_from}\u2013${unit.ayah_to}`
      : `${sid}:${unit.ayah_from}`;
  }

  ayahDisplay(): string {
    const unit = this.unit();
    if (!unit) return '';
    return unit.ayah_to && unit.ayah_to !== unit.ayah_from
      ? `${unit.ayah_from}\u2013${unit.ayah_to}`
      : `${unit.ayah_from}`;
  }

  stepNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  onStripKeydown(event: KeyboardEvent, index: number): void {
    if (this.transitioning()) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusAdjacentStrip(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.focusAdjacentStrip(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusStrip(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusStrip(this.steps.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.activateStrip(index);
        break;
    }
  }

  private focusAdjacentStrip(index: number, direction: 1 | -1): void {
    const nextIndex =
      (index + direction + this.steps.length) % this.steps.length;
    this.focusStrip(nextIndex);
  }

  private normalizeWheelDelta(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return event.deltaY * 18;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      const workspaceHeight = this.panelWorkspaceEl?.nativeElement.clientHeight ?? 0;
      return event.deltaY * workspaceHeight;
    }

    return event.deltaY;
  }

  private focusStrip(index: number): void {
    this.stripEls?.get(index)?.nativeElement.focus();
  }

  private stepById(stepId: StepId): StepDef {
    return this.steps.find((step) => step.id === stepId) ?? this.steps[0];
  }

  private watchRouteStepParam(): void {
    this.routeQuerySub?.unsubscribe();
    this.routeQuerySub = this.route.queryParamMap.subscribe((queryParamMap) => {
      const rawStepParam =
        queryParamMap.get('step') ?? queryParamMap.get('tab');
      const stepParam = this.normalizeStepParam(rawStepParam);
      this.routeStepParam = stepParam;
      this.applyRouteStepState(stepParam);
    });
  }

  private applyRouteStepState(stepParam: StepId | null): void {
    const stepIndex = stepParam
      ? this.steps.findIndex((step) => step.id === stepParam)
      : -1;
    const targetStep = stepIndex >= 0 ? stepIndex + 1 : 0;

    if (this.loading() || !this.unit()) {
      this.currentStep.set(targetStep);
      this.activeStepId.set(stepParam);
      return;
    }

    if (this.transitioning()) return;

    if (targetStep === this.currentStep()) {
      if (this.activeStepId() === stepParam) return;

      this.activeStepId.set(stepParam);
      if (stepParam) {
        void this.ensureStepDataLoaded(stepParam);
      } else {
        this.lesson.set(null);
        this.stepLoading.set(false);
        this.stepError.set(null);
      }
      this.syncSceneAfterRender(true);
      return;
    }

    void this.transitionToStepCount(targetStep, true);
  }

  private syncStepQuery(stepId: StepId | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: stepId, tab: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private syncSceneAfterRender(immediate = false): void {
    if (!this.viewReady || this.loading() || !this.unit()) return;

    requestAnimationFrame(() => {
      this.layoutScene(this.currentStep(), this.currentStep(), immediate, true);
      if (!this.landingPlayed) {
        this.playInitialLanding();
      }
    });
  }

  private async transitionToStepCount(
    targetStep: number,
    immediate = false,
  ): Promise<void> {
    if (this.loading() || !this.unit() || this.transitioning()) return;

    const normalizedTarget = this.clamp(targetStep, 0, this.steps.length);
    const startingStep = this.currentStep();
    if (normalizedTarget === startingStep) return;

    const finalStepId = this.stepIdForCount(normalizedTarget);
    const direction = normalizedTarget > startingStep ? 1 : -1;

    this.transitioning.set(true);
    this.stepError.set(null);
    this.activeStepId.set(finalStepId);

    let previousStep = startingStep;
    while (previousStep !== normalizedTarget) {
      const nextStep = previousStep + direction;
      this.currentStep.set(nextStep);
      await this.animateSceneStep(nextStep, previousStep, immediate, false);
      previousStep = nextStep;
    }

    if (finalStepId) {
      await this.ensureStepDataLoaded(finalStepId);
      if (!immediate) {
        this.pulseStrip(normalizedTarget - 1);
      }
      this.animatePanelContentSwap(immediate);
    } else {
      this.activeStepId.set(null);
      this.stepLoading.set(false);
      this.stepError.set(null);
    }

    this.syncStepQuery(finalStepId);
    this.transitioning.set(false);
  }

  private layoutScene(
    stepCount: number,
    previousStep: number,
    immediate = false,
    revealContentOnComplete = true,
    onComplete?: () => void,
  ): void {
    const scene = this.sceneEl?.nativeElement;
    const panel = this.panelEl?.nativeElement;
    const panelSurface = this.panelSurfaceEl?.nativeElement;
    const panelInner = this.panelInnerEl?.nativeElement;
    const chamber = this.closedHeroEl?.nativeElement;
    const strips = this.stripEls?.toArray().map((ref) => ref.nativeElement) ?? [];

    if (
      !scene ||
      !panel ||
      !panelSurface ||
      !panelInner ||
      !chamber ||
      strips.length !== this.steps.length
    ) {
      if (!onComplete) {
        this.transitioning.set(false);
      }
      onComplete?.();
      return;
    }

    this.sceneTimeline?.kill();

    if (this.isCompactLayout(scene)) {
      this.applyCompactLayout(
        stepCount,
        immediate,
        strips,
        panel,
        panelSurface,
        panelInner,
        chamber,
        revealContentOnComplete,
        onComplete,
      );
      return;
    }

    const width = scene.clientWidth;
    const railWidth = this.clamp(width * 0.078, 84, 112);
    const panelGap = this.clamp(width * 0.02, 24, 36);
    const leftCount = stepCount;
    const rightCount = this.steps.length - stepCount;
    const rightClusterStart = width - rightCount * railWidth;
    const panelX = stepCount > 0 ? leftCount * railWidth + panelGap : panelGap;
    const panelRightEdge =
      stepCount === this.steps.length
        ? width - panelGap
        : rightClusterStart - panelGap;
    const panelWidth =
      stepCount > 0 ? Math.max(panelRightEdge - panelX, width * 0.2) : 0;
    const stripTargets = this.steps.map((_, index) => {
      if (index < leftCount) {
        return { x: index * railWidth, width: railWidth };
      }

      const rightIndex = index - leftCount;
      return {
        x: width - (rightCount - rightIndex) * railWidth,
        width: railWidth,
      };
    });

    if (immediate) {
      strips.forEach((strip, index) => {
        gsap.set(strip, {
          x: stripTargets[index].x,
          width: stripTargets[index].width,
        });
      });
      gsap.set(panel, {
        x: panelX,
        width: panelWidth,
        opacity: stepCount > 0 ? 1 : 0,
        pointerEvents: stepCount > 0 ? 'auto' : 'none',
      });
      gsap.set(panelSurface, {
        clipPath:
          stepCount > 0
            ? 'inset(0 0 0 0 round 1.85rem)'
            : 'inset(0 100% 0 0 round 1.85rem)',
      });
      gsap.set(panelInner, { opacity: stepCount > 0 ? 1 : 0, y: 0 });
      gsap.set(chamber, {
        opacity: stepCount > 0 ? 0 : 1,
        y: stepCount > 0 ? -26 : 0,
      });
      if (stepCount > 0 && revealContentOnComplete) {
        this.animatePanelContentIn(true);
      }
      if (!onComplete) {
        this.transitioning.set(false);
      }
      onComplete?.();
      return;
    }

    const openingFromZero = previousStep === 0 && stepCount > 0;
    const closingToZero = stepCount === 0;
    const timeline = gsap.timeline({
      defaults: { ease: 'power4.inOut' },
      onComplete: () => {
        if (!onComplete) {
          this.transitioning.set(false);
        }
        if (stepCount > 0 && revealContentOnComplete) {
          this.animatePanelContentIn();
        } else if (stepCount === 0) {
          gsap.set(chamber, { opacity: 1, y: 0 });
        }
        onComplete?.();
      },
    });
    this.sceneTimeline = timeline;

    if (closingToZero) {
      timeline.to(
        panelInner,
        {
          opacity: 0,
          y: 22,
          duration: 0.22,
          ease: 'power2.in',
        },
        0,
      );

      timeline.to(
        panelSurface,
        {
          clipPath: 'inset(0 100% 0 0 round 1.85rem)',
          duration: 0.78,
        },
        0.06,
      );

      timeline.to(
        panel,
        {
          x: panelX,
          width: panelWidth,
          opacity: 0,
          duration: 0.95,
          onStart: () => {
            gsap.set(panel, { pointerEvents: 'none' });
          },
        },
        0,
      );

      strips.forEach((strip, index) => {
        timeline.to(
          strip,
          {
            x: stripTargets[index].x,
            width: stripTargets[index].width,
            duration: 1.04,
          },
          0.05,
        );
      });

      timeline.fromTo(
        chamber,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.82,
          ease: 'power3.out',
        },
        0.34,
      );

      return;
    }

    gsap.set(panel, { pointerEvents: 'auto' });
    timeline.to(
      chamber,
      {
        opacity: 0,
        y: -22,
        duration: 0.28,
        ease: 'power2.out',
      },
      0,
    );

    if (openingFromZero) {
      gsap.set(panel, { opacity: 1 });
      gsap.set(panelInner, { opacity: 0, y: 28 });
      gsap.set(panelSurface, {
        clipPath: 'inset(0 100% 0 0 round 1.85rem)',
      });
    } else {
      timeline.to(
        panelInner,
        {
          opacity: 0,
          y: 16,
          duration: 0.18,
          ease: 'power2.in',
        },
        0,
      );
    }

    strips.forEach((strip, index) => {
      timeline.to(
        strip,
        {
          x: stripTargets[index].x,
          width: stripTargets[index].width,
          duration: 1.12,
        },
        0,
      );
    });

    timeline.to(
      panel,
      {
        x: panelX,
        width: panelWidth,
        opacity: 1,
        duration: 1.08,
      },
      0.06,
    );

    timeline.to(
      panelSurface,
      {
        clipPath: 'inset(0 0 0 0 round 1.85rem)',
        duration: 0.92,
      },
      openingFromZero ? 0.24 : 0.12,
    );
  }

  private applyCompactLayout(
    stepCount: number,
    immediate: boolean,
    strips: HTMLElement[],
    panel: HTMLElement,
    panelSurface: HTMLElement,
    panelInner: HTMLElement,
    chamber: HTMLElement,
    revealContentOnComplete = true,
    onComplete?: () => void,
  ): void {
    gsap.set(strips, { clearProps: 'all' });
    gsap.set(panel, {
      clearProps: 'x,width',
      opacity: stepCount > 0 ? 1 : 0,
      pointerEvents: stepCount > 0 ? 'auto' : 'none',
    });
    gsap.set(panelSurface, { clearProps: 'clipPath' });
    gsap.set(panelInner, { clearProps: 'all' });
    gsap.set(chamber, { clearProps: 'all' });
    if (!onComplete) {
      this.transitioning.set(false);
    }

    if (stepCount > 0 && revealContentOnComplete) {
      this.animatePanelContentIn(immediate);
    }

    onComplete?.();
  }

  private animateSceneStep(
    stepCount: number,
    previousStep: number,
    immediate = false,
    revealContentOnComplete = true,
  ): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        if (!this.sceneEl?.nativeElement) {
          resolve();
          return;
        }

        this.layoutScene(
          stepCount,
          previousStep,
          immediate || prefersReducedMotion(),
          revealContentOnComplete,
          resolve,
        );
      });
    });
  }

  private stepIdForCount(stepCount: number): StepId | null {
    if (stepCount <= 0) return null;
    return this.steps[stepCount - 1]?.id ?? null;
  }

  private animatePanelContentSwap(immediate = false): void {
    requestAnimationFrame(() => {
      if (immediate || prefersReducedMotion()) {
        this.animatePanelContentIn(true);
        return;
      }

      const panelInner = this.panelInnerEl?.nativeElement;
      if (!panelInner) {
        this.animatePanelContentIn();
        return;
      }

      gsap.to(panelInner, {
        opacity: 0,
        y: 12,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => this.animatePanelContentIn(false),
      });
    });
  }

  private animatePanelContentIn(immediate = false): void {
    const panelInner = this.panelInnerEl?.nativeElement;
    if (!panelInner) return;

    if (immediate || prefersReducedMotion()) {
      gsap.set(panelInner, { opacity: 1, y: 0, clearProps: 'transform' });
    } else {
      gsap.fromTo(
        panelInner,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.44,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }

    const pieces = Array.from(
      panelInner.querySelectorAll<HTMLElement>(
        '.study-panel__eyebrow, .study-panel__title, .study-panel__arabic, .study-panel__lead, .study-panel__chips, .study-panel__metrics, .study-panel__workspace',
      ),
    );

    if (!pieces.length) return;

    if (immediate || prefersReducedMotion()) {
      gsap.set(pieces, { opacity: 1, y: 0, clearProps: 'transform' });
      return;
    }

    gsap.fromTo(
      pieces,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.62,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'transform',
      },
    );
  }

  private pulseStrip(index: number): void {
    const strip = this.stripEls?.get(index)?.nativeElement;
    if (!strip || prefersReducedMotion()) return;

    gsap.fromTo(
      strip,
      {
        boxShadow:
          '0 0 0 rgba(0, 0, 0, 0), inset 0 0 0 1px rgba(214, 179, 90, 0.14)',
      },
      {
        boxShadow:
          '0 0 1.8rem rgba(214, 179, 90, 0.12), inset 0 0 0 1px rgba(214, 179, 90, 0.34)',
        duration: 0.34,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      },
    );
  }

  private playInitialLanding(): void {
    if (this.landingPlayed || prefersReducedMotion()) {
      this.landingPlayed = true;
      return;
    }

    const strips = this.stripEls?.toArray().map((ref) => ref.nativeElement) ?? [];
    if (!strips.length) {
      this.landingPlayed = true;
      return;
    }

    this.landingPlayed = true;
    this.transitioning.set(true);
    this.landingTimeline?.kill();

    gsap.set(strips, {
      y: 100,
      autoAlpha: 0,
      scale: 0.985,
      transformOrigin: '50% 100%',
    });

    this.landingTimeline = gsap.timeline({
      onComplete: () => {
        gsap.set(strips, { clearProps: 'transform,opacity,visibility' });
        this.transitioning.set(false);
      },
    });

    this.landingTimeline.to(strips, {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      duration: 1.55,
      ease: 'power4.out',
      stagger: 0.07,
    });
  }

  private startAmbientMotion(): void {
    const ambient = this.ambientEls?.toArray().map((ref) => ref.nativeElement) ?? [];
    if (!ambient.length || prefersReducedMotion()) return;

    this.ambientTimeline?.kill();
    this.ambientTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.ambientTimeline
      .to(
        ambient[0],
        {
          xPercent: 4,
          yPercent: -6,
          scale: 1.08,
          duration: 9.5,
          ease: 'sine.inOut',
        },
        0,
      )
      .to(
        ambient[1],
        {
          xPercent: -6,
          yPercent: 5,
          scale: 1.12,
          duration: 11.5,
          ease: 'sine.inOut',
        },
        0,
      );
  }

  private isCompactLayout(scene: HTMLElement): boolean {
    return scene.clientWidth <= 960;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

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

  private ensureStepDataLoaded(stepId: StepId): Promise<void> {
    return new Promise((resolve) => {
    if (stepId === 'worldview') {
      if (this.worldviewHub()) {
        this.stepLoading.set(false);
        this.stepError.set(null);
        resolve();
        return;
      }

      this.stepLoading.set(true);
      this.stepError.set(null);
      this.lesson.set(null);

      this.svc.getWorldviewHub(this.surahId()).subscribe({
        next: (response) => {
          this.worldviewHub.set(response);
          this.stepLoading.set(false);
          this.stepError.set(null);
          resolve();
        },
        error: () => {
          this.stepLoading.set(false);
          this.stepError.set('Failed to load the worldview layer.');
          resolve();
        },
      });
      return;
    }

    const cached = this.stepDataCache.get(stepId);
    if (cached) {
      this.lesson.set(cached);
      this.stepLoading.set(false);
      this.stepError.set(null);
      resolve();
      return;
    }

    const unit = this.unit();
    if (!unit) {
      resolve();
      return;
    }

    this.stepLoading.set(true);
    this.stepError.set(null);
    this.lesson.set(null);

    const surahId = this.surahId();
    const passageNo = this.passageNo();
    const onSuccess = (lesson: StudyLessonResponse) => {
      this.stepDataCache.set(stepId, lesson);
      if (this.activeStepId() === stepId) {
        this.lesson.set(lesson);
      }
      this.stepLoading.set(false);
      this.stepError.set(null);
      resolve();
    };
    const onError = () => {
      if (this.activeStepId() === stepId) {
        this.lesson.set(null);
      }
      this.stepLoading.set(false);
      this.stepError.set('Failed to load this study layer.');
      resolve();
    };

    switch (stepId) {
      case 'reading':
        this.svc.getStudyReading(surahId, passageNo).subscribe({
          next: (response) =>
            onSuccess({
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
          next: (response) =>
            onSuccess({
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
          next: (response) =>
            onSuccess({
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
          next: (response) =>
            onSuccess({
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
          next: (response) =>
            onSuccess({
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
    });
  }

  private mergeShellUnit(
    stepUnit: StudyLessonResponse['unit'] | null | undefined,
  ): StudyLessonResponse['unit'] {
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
    const next = current.map((entry) =>
      entry.task_type === task.task_type ? task : entry,
    );
    return next.some((entry) => entry.task_type === task.task_type)
      ? next
      : [...next, task];
  }

  private rootTaskForStep(stepId: StepId): UnitTaskVm | null {
    if (stepId === 'worldview') return null;
    const taskType = this.taskTypeForStep(stepId);
    return this.tasks().find((task) => task.task_type === taskType) ?? null;
  }

  private taskTypeForStep(stepId: Exclude<StepId, 'worldview'>): UnitTaskVm['task_type'] {
    switch (stepId) {
      case 'sentence-structure':
        return 'sentence_structure';
      case 'passage-structure':
        return 'passage_structure';
      default:
        return stepId;
    }
  }

  private parseStepIntroPayload(raw: unknown): StepIntroPayload | null {
    const parsed = this.parseJsonLike(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return null;
    }
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

  private normalizeStepParam(value: string | null): StepId | null {
    if (!value) return null;

    const normalized = value.trim().toLowerCase();
    const aliases: Record<string, StepId> = {
      vocabulary: 'morphology',
      morphology: 'morphology',
      reading: 'reading',
      expressions: 'expressions',
      worldview: 'worldview',
      reflection: 'worldview',
      'sentence-structure': 'sentence-structure',
      sentence_structure: 'sentence-structure',
      'passage-structure': 'passage-structure',
      passage_structure: 'passage-structure',
    };

    return aliases[normalized] ?? null;
  }
}
