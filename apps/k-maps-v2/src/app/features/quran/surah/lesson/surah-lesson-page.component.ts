import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, signal, computed, effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import {
  SurahModulesService,
  StudyLessonResponse,
  StudySurahMeta,
} from '../../../../shared/services/surah-modules.service';
import { QuranStateService } from '../../../../shared/services/quran-state.service';
import { LessonReadingStepComponent } from './steps/reading/lesson-reading-step.component';
import { LessonVocabularyStepComponent } from './steps/vocabulary/lesson-vocabulary-step.component';
import { LessonSentenceStructureStepComponent } from './steps/sentence-structure/lesson-sentence-structure-step.component';
import { LessonExpressionsStepComponent } from './steps/expressions/lesson-expressions-step.component';
import { LessonPassageStructureStepComponent } from './steps/passage-structure/lesson-passage-structure-step.component';

type StepId = 'reading' | 'vocabulary' | 'sentence-structure' | 'expressions' | 'passage-structure';
type Phase = 'entry' | 'workspace';

interface StepDef {
  id: StepId;
  label: string;
  kicker: string;
  summary: string;
}

type StepState = 'complete' | 'active' | 'upcoming';

const STEPS: StepDef[] = [
  {
    id: 'reading',
    label: 'Reading',
    kicker: 'Step 01',
    summary: 'Begin with the ayat in a clean reading panel and enter the passage before analysis.',
  },
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    kicker: 'Step 02',
    summary: 'Move into the core nouns and verbs that shape the passage vocabulary field.',
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
  lesson = signal<StudyLessonResponse | null>(null);
  heroConfig = signal<HeroConfig>({});
  loading = signal(true);
  error = signal<string | null>(null);

  private entryTl: gsap.core.Timeline | null = null;
  private stepAnimTimeout: ReturnType<typeof setTimeout> | null = null;

  surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find(s => s.surahNumber === id) ?? null;
  });

  constructor() {
    // Animate step content whenever the current step changes after the workspace is live.
    effect(() => {
      const _step = this.activeStep();
      if (this.phase() !== 'workspace') return;
      if (this.stepAnimTimeout) clearTimeout(this.stepAnimTimeout);
      this.stepAnimTimeout = setTimeout(() => this.animateStepPanel(), 60);
    });
  }

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    const passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 0;
    this.surahId.set(surahId);
    this.passageNo.set(passageNo);

    const stepParam = (this.route.snapshot.queryParamMap.get('step')
      ?? this.route.snapshot.queryParamMap.get('tab')) as StepId | null;
    if (stepParam && STEPS.some(step => step.id === stepParam)) {
      this.activeStep.set(stepParam);
    }

    this.quranState.load();

    this.svc.getStudyLesson(surahId, passageNo).subscribe({
      next: (res) => {
        this.lesson.set(res);
        this.loading.set(false);
        // Give Angular a full render cycle before querying DOM
        setTimeout(() => this.runEntryAnimation(), 120);
      },
      error: () => {
        this.error.set('Failed to load lesson');
        this.loading.set(false);
      },
    });

    this.svc.getStudyGrid(surahId).subscribe({
      next: (grid) => this.parseContainerMeta(grid.surah),
      error: () => {},
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
  }

  // ── Start button ─────────────────────────────────────────

  startStudy(): void {
    if (this.phase() !== 'entry') return;
    this.entryTl?.kill();

    const root = this.elRef.nativeElement as HTMLElement;
    const entryEl = root.querySelector<HTMLElement>('.entry');

    const proceed = () => {
      this.phase.set('workspace');
      this.activeStep.set('reading');
      setTimeout(() => this.runWorkspaceAnimation(), 60);
    };

    if (!entryEl) { proceed(); return; }

    gsap.to(entryEl, {
      opacity: 0, y: -50,
      duration: 0.45, ease: 'power3.in',
      onComplete: proceed,
    });
  }

  // ── Workspace animation ──────────────────────────────────

  private runWorkspaceAnimation(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const heroBg     = root.querySelector<HTMLElement>('.hero__bg');
    const heroAr     = root.querySelector<HTMLElement>('.hero__ar');
    const heroEn     = root.querySelector<HTMLElement>('.hero__en');
    const heroDivider = root.querySelector<HTMLElement>('.hero__divider');
    const stepsEl    = root.querySelector<HTMLElement>('.lesson-steps');
    const stepIntro  = root.querySelector<HTMLElement>('.step-intro');
    const stepPanel  = root.querySelector<HTMLElement>('.step-panel');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (heroBg)      tl.fromTo(heroBg,      { opacity: 0 },             { opacity: 1, duration: 0.7 });
    if (heroAr)      tl.fromTo(heroAr,      { opacity: 0, y: 20 },      { opacity: 1, y: 0, duration: 0.55 }, '-=0.3');
    if (heroEn)      tl.fromTo(heroEn,      { opacity: 0, y: 14 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.2');
    if (heroDivider) tl.fromTo(heroDivider, { scaleX: 0, opacity: 0 },  { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' }, '-=0.1');
    if (stepsEl)     tl.fromTo(stepsEl,     { opacity: 0, y: 10 },      { opacity: 1, y: 0, duration: 0.4 }, '-=0.05');
    if (stepIntro)   tl.fromTo(stepIntro,   { opacity: 0, y: 16 },      { opacity: 1, y: 0, duration: 0.42 }, '-=0.05');
    if (stepPanel)   tl.fromTo(stepPanel,   { opacity: 0, y: 18 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.08');

    tl.add(() => this.animateStepPanel(), '+=0.05');
  }

  // ── Step panel animation — fires on every step change ─────

  private animateStepPanel(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const stepIntro = root.querySelector<HTMLElement>('.step-intro');
    const panel = root.querySelector<HTMLElement>('.step-panel');
    if (!panel) return;

    gsap.killTweensOf(panel.querySelectorAll('*'));
    if (stepIntro) {
      gsap.fromTo(
        stepIntro,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out' },
      );
    }

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
    const u = this.lesson()?.unit;
    if (!u) return '';
    const sid = this.surahId();
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${sid}:${u.ayah_from}\u2013${u.ayah_to}`
      : `${sid}:${u.ayah_from}`;
  }

  ayahDisplay(): string {
    const u = this.lesson()?.unit;
    if (!u) return '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${u.ayah_from}\u2013${u.ayah_to}`
      : `${u.ayah_from}`;
  }

}
