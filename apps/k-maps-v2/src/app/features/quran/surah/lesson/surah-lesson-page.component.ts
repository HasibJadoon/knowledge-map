import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, inject, signal, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SurahModulesService, StudyLessonResponse } from '../../../../shared/services/surah-modules.service';
import { QuranStateService } from '../../../../shared/services/quran-state.service';
import { QuranGsapService } from '../../shared/quran-gsap.service';
import { LessonReadingTabComponent } from './tabs/lesson-reading-tab.component';
import { LessonVocabularyTabComponent } from './tabs/lesson-vocabulary-tab.component';
import { LessonSentenceStructureTabComponent } from './tabs/lesson-sentence-structure-tab.component';
import { LessonExpressionsTabComponent } from './tabs/lesson-expressions-tab.component';
import { LessonPassageStructureTabComponent } from './tabs/lesson-passage-structure-tab.component';

type TabId = 'reading' | 'vocabulary' | 'sentence-structure' | 'expressions' | 'passage-structure';

interface Tab { id: TabId; label: string; }

const TABS: Tab[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'sentence-structure', label: 'Sentence Structure' },
  { id: 'expressions', label: 'Expressions' },
  { id: 'passage-structure', label: 'Passage Structure' },
];

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
  private gsapSvc = inject(QuranGsapService);

  @ViewChild('heroEl') heroEl!: ElementRef<HTMLElement>;
  @ViewChild('heroBg') heroBg!: ElementRef<HTMLElement>;
  @ViewChild('heroAr') heroAr!: ElementRef<HTMLElement>;
  @ViewChild('heroEn') heroEn!: ElementRef<HTMLElement>;
  @ViewChild('heroDivider') heroDivider!: ElementRef<HTMLElement>;
  @ViewChild('tabsEl') tabsEl!: ElementRef<HTMLElement>;

  readonly tabs = TABS;

  surahId = signal(0);
  passageNo = signal(0);
  activeTab = signal<TabId>('reading');
  lesson = signal<StudyLessonResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  surahName = computed(() => {
    const surahs = this.quranState.surahs();
    const id = this.surahId();
    return surahs.find(s => s.surahNumber === id) ?? null;
  });

  private gsap: typeof import('gsap').default | null = null;

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

    this.svc.getStudyLesson(surahId, passageNo).subscribe({
      next: (res) => { this.lesson.set(res); this.loading.set(false); },
      error: () => { this.error.set('Failed to load lesson'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    import('gsap').then(({ default: gsap }) => {
      this.gsap = gsap;
      this.runHeroAnimation(gsap);
    });
  }

  ngOnDestroy(): void {
    if (this.gsap) {
      // Clean up ScrollTriggers tied to this component
      try {
        const { ScrollTrigger } = require('gsap/ScrollTrigger');
        ScrollTrigger.getAll()
          .filter((t: any) => this.heroEl?.nativeElement?.contains(t.trigger))
          .forEach((t: any) => t.kill());
      } catch { /* noop */ }
    }
  }

  private runHeroAnimation(gsap: typeof import('gsap').default): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!this.heroBg?.nativeElement) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(this.heroBg.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.7 });
    if (this.heroAr?.nativeElement) {
      tl.fromTo(this.heroAr.nativeElement, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55 }, '-=0.3');
    }
    if (this.heroEn?.nativeElement) {
      tl.fromTo(this.heroEn.nativeElement, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45 }, '-=0.2');
    }
    if (this.heroDivider?.nativeElement) {
      tl.fromTo(this.heroDivider.nativeElement, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' }, '-=0.1');
    }
    if (this.tabsEl?.nativeElement) {
      tl.fromTo(this.tabsEl.nativeElement, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.05');
    }
  }

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
      ? `${sid}:${u.ayah_from}–${u.ayah_to}`
      : `${sid}:${u.ayah_from}`;
  }
}
