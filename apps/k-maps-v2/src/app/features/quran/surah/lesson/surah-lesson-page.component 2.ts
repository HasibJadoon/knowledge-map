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
import { LessonReadingTabComponent } from './tabs/lesson-reading-tab.component';
import { LessonVocabularyTabComponent } from './tabs/lesson-vocabulary-tab.component';
import { LessonSentenceStructureTabComponent } from './tabs/lesson-sentence-structure-tab.component';
import { LessonExpressionsTabComponent } from './tabs/lesson-expressions-tab.component';
import { LessonPassageStructureTabComponent } from './tabs/lesson-passage-structure-tab.component';

type TabId = 'reading' | 'vocabulary' | 'sentence-structure' | 'expressions' | 'passage-structure';
type Phase = 'entry' | 'workspace';

interface Tab { id: TabId; label: string; }

const TABS: Tab[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'sentence-structure', label: 'Sentence Structure' },
  { id: 'expressions', label: 'Expressions' },
  { id: 'passage-structure', label: 'Passage Structure' },
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
    LessonReadingTabComponent,
    LessonVocabularyTabComponent,
    LessonSentenceStructureTabComponent,
    LessonExpressionsTabComponent,
    LessonPassageStructureTabComponent,
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

  readonly tabs = TABS;

  // ── State ────────────────────────────────────────────────
  phase = signal<Phase>('entry');
  surahId = signal(0);
  passageNo = signal(0);
  activeTab = signal<TabId>('reading');
  lesson = signal<StudyLessonResponse | null>(null);
  heroConfig = signal<HeroConfig>({});
  loading = signal(true);
  error = signal<string | null>(null);

  private entryTl: gsap.core.Timeline | null = null;
  private tabAnimTimeout: ReturnType<typeof setTimeout> | null = null;

  surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find(s => s.surahNumber === id) ?? null;
  });

  constructor() {
    // Animate tab content in whenever active tab changes (after workspace is live)
    effect(() => {
      const _ = this.activeTab(); // track
      if (this.phase() !== 'workspace') return;
      if (this.tabAnimTimeout) clearTimeout(this.tabAnimTimeout);
      this.tabAnimTimeout = setTimeout(() => this.animateTabContent(), 60);
    });
  }

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    const passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 0;
    this.surahId.set(surahId);
    this.passageNo.set(passageNo);

    const tabParam = this.route.snapshot.queryParamMap.get('tab') as TabId | null;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      this.activeTab.set(tabParam);
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
    if (this.tabAnimTimeout) clearTimeout(this.tabAnimTimeout);
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
    const tabsEl     = root.querySelector<HTMLElement>('.tab-bar');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (heroBg)      tl.fromTo(heroBg,      { opacity: 0 },             { opacity: 1, duration: 0.7 });
    if (heroAr)      tl.fromTo(heroAr,      { opacity: 0, y: 20 },      { opacity: 1, y: 0, duration: 0.55 }, '-=0.3');
    if (heroEn)      tl.fromTo(heroEn,      { opacity: 0, y: 14 },      { opacity: 1, y: 0, duration: 0.45 }, '-=0.2');
    if (heroDivider) tl.fromTo(heroDivider, { scaleX: 0, opacity: 0 },  { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' }, '-=0.1');
    if (tabsEl)      tl.fromTo(tabsEl,      { opacity: 0, y: 10 },      { opacity: 1, y: 0, duration: 0.4 }, '-=0.05');

    // Animate first tab content after workspace animates in
    tl.add(() => this.animateTabContent(), '+=0.05');
  }

  // ── Tab content animation — fires on every tab switch ────

  private animateTabContent(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.elRef.nativeElement as HTMLElement;
    const tabContent = root.querySelector<HTMLElement>('.tab-content');
    if (!tabContent) return;

    // Kill any running animations on child elements
    gsap.killTweensOf(tabContent.querySelectorAll('*'));

    // Fade + slide the whole tab-content wrapper
    gsap.fromTo(tabContent,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out',
        onComplete: () => this.animateTabCards(tabContent)
      }
    );
  }

  /** ScrollTrigger-animate individual cards/items inside the active tab */
  private animateTabCards(tabContent: HTMLElement): void {
    // Kill any previous ScrollTriggers scoped to this tab content
    ScrollTrigger.getAll()
      .filter(st => tabContent.contains(st.trigger as Node))
      .forEach(st => st.kill());

    // Selectors that match cards/items in each tab
    const cardSel = [
      '.word-card',    // vocabulary
      '.expr-card',    // expressions
      '.rt-passage',   // reading passage block
      '.ss-block',     // sentence structure
      '.ps-block',     // passage structure
    ].join(', ');

    const cards = Array.from(tabContent.querySelectorAll<HTMLElement>(cardSel));
    if (!cards.length) return;

    // Set all invisible first
    gsap.set(cards, { opacity: 0, y: 24 });

    cards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        scroller: document.body,          // ← key: body is the scroll container
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: 'power2.out',
            delay: Math.min(i * 0.04, 0.3), // cap total stagger at 300ms
          });
        },
      });
    });

    // Refresh so ScrollTrigger picks up correct positions
    ScrollTrigger.refresh();
  }

  // ── Tab management ───────────────────────────────────────

  selectTab(id: TabId): void {
    this.activeTab.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
