import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, inject, signal, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import gsap from 'gsap';
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

/** Parsed hero configuration from container meta_json */
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

  // ── Entry hero refs ──────────────────────────────────────
  @ViewChild('entryEl') entryEl!: ElementRef<HTMLElement>;
  @ViewChild('entryBg') entryBg!: ElementRef<HTMLElement>;
  @ViewChild('goldSweep') goldSweep!: ElementRef<HTMLElement>;
  @ViewChild('entryAr') entryAr!: ElementRef<HTMLElement>;
  @ViewChild('entryTitles') entryTitles!: ElementRef<HTMLElement>;
  @ViewChild('entryTheme') entryTheme!: ElementRef<HTMLElement>;
  @ViewChild('entryQuote') entryQuote!: ElementRef<HTMLElement>;
  @ViewChild('startBtn') startBtn!: ElementRef<HTMLElement>;

  // ── Workspace refs ───────────────────────────────────────
  @ViewChild('workspaceEl') workspaceEl!: ElementRef<HTMLElement>;
  @ViewChild('heroEl') heroEl!: ElementRef<HTMLElement>;
  @ViewChild('heroBg') heroBg!: ElementRef<HTMLElement>;
  @ViewChild('heroAr') heroAr!: ElementRef<HTMLElement>;
  @ViewChild('heroEn') heroEn!: ElementRef<HTMLElement>;
  @ViewChild('heroDivider') heroDivider!: ElementRef<HTMLElement>;
  @ViewChild('tabsEl') tabsEl!: ElementRef<HTMLElement>;

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

  surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find(s => s.surahNumber === id) ?? null;
  });

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    const passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 0;
    this.surahId.set(surahId);
    this.passageNo.set(passageNo);

    // Restore tab from query param
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as TabId | null;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      this.activeTab.set(tabParam);
    }

    // Ensure surah list loaded for hero meta
    this.quranState.load();

    // Load lesson data
    this.svc.getStudyLesson(surahId, passageNo).subscribe({
      next: (res) => {
        this.lesson.set(res);
        this.loading.set(false);

        // Fire entry animation once data is ready
        setTimeout(() => this.runEntryAnimation(), 32);
      },
      error: () => {
        this.error.set('Failed to load lesson');
        this.loading.set(false);
      },
    });

    // Optionally load container meta for hero quote
    this.svc.getStudyGrid(surahId).subscribe({
      next: (grid) => this.parseContainerMeta(grid.surah),
      error: () => { /* quote is optional — no error surfacing */ },
    });
  }

  ngAfterViewInit(): void {
    // Entry animation is triggered after data loads
  }

  ngOnDestroy(): void {
    this.entryTl?.kill();
  }

  // ── Container meta parsing ───────────────────────────────

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
    } catch { /* malformed JSON — ignore */ }
  }

  // ── Entry animation timeline ─────────────────────────────

  private runEntryAnimation(): void {
    if (this.phase() !== 'entry') return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    this.entryTl = tl;

    // 1. Background fades in from near-black
    if (this.entryBg?.nativeElement) {
      tl.fromTo(this.entryBg.nativeElement,
        { opacity: 0 },
        { opacity: 1, duration: 1.0 }
      );
    }

    // 2. Gold sweep line
    if (this.goldSweep?.nativeElement) {
      tl.fromTo(this.goldSweep.nativeElement,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.8, ease: 'power2.inOut' },
        '-=0.5'
      );
    }

    // 3. Arabic surah name
    if (this.entryAr?.nativeElement) {
      tl.fromTo(this.entryAr.nativeElement,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.65 },
        '-=0.3'
      );
    }

    // 4. English title + passage info
    if (this.entryTitles?.nativeElement) {
      tl.fromTo(this.entryTitles.nativeElement,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55 },
        '-=0.2'
      );
    }

    // 5. Theme/subtitle
    if (this.entryTheme?.nativeElement) {
      tl.fromTo(this.entryTheme.nativeElement,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45 },
        '-=0.15'
      );
    }

    // 6. Quote
    if (this.entryQuote?.nativeElement) {
      tl.fromTo(this.entryQuote.nativeElement,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        '-=0.1'
      );
    }

    // 7. Start button — appears last with subtle scale
    if (this.startBtn?.nativeElement) {
      tl.fromTo(this.startBtn.nativeElement,
        { opacity: 0, scale: 0.85, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' },
        '-=0.1'
      );
    }
  }

  // ── Start button click ───────────────────────────────────

  startStudy(): void {
    if (this.phase() !== 'entry') return;

    const entryEl = this.entryEl?.nativeElement;
    if (!entryEl) {
      this.phase.set('workspace');
      return;
    }

    // Kill entry timeline
    this.entryTl?.kill();

    // Cinematic exit: content slides up and fades
    const tl = gsap.timeline({
      onComplete: () => {
        this.phase.set('workspace');
        // Wait a frame for workspace DOM to render, then animate it in
        setTimeout(() => this.runWorkspaceAnimation(), 32);
      },
    });

    tl.to(entryEl, {
      opacity: 0,
      y: -50,
      duration: 0.45,
      ease: 'power3.in',
    });
  }

  // ── Workspace animation ──────────────────────────────────

  private runWorkspaceAnimation(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (this.heroBg?.nativeElement) {
      tl.fromTo(this.heroBg.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.7 });
    }
    if (this.heroAr?.nativeElement) {
      tl.fromTo(this.heroAr.nativeElement, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55 }, '-=0.3');
    }
    if (this.heroEn?.nativeElement) {
      tl.fromTo(this.heroEn.nativeElement, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45 }, '-=0.2');
    }
    if (this.heroDivider?.nativeElement) {
      tl.fromTo(this.heroDivider.nativeElement,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' },
        '-=0.1'
      );
    }
    if (this.tabsEl?.nativeElement) {
      tl.fromTo(this.tabsEl.nativeElement, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.05');
    }
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
