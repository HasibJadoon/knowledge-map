import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, IonContent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';
import {
  QuranBrowseSurah,
  QuranLayoutLine,
  QuranPageAyahSlice,
  QuranPageResponse,
  QuranPageWord,
} from '../../../../shared/models/quran/quran-reader.model';
import { QuranReaderService } from '../../../../shared/services/quran/quran-reader.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { QuranReaderHeaderService } from './quran-reader-header.service';

const FIRST_PAGE = 1;
const LAST_PAGE = 604;
const PAGE_BATCH_SIZE = 4;
const MUSHAF_LAYOUT = 'qpc-v2-15-lines';
const SWIPE_MIN_DISTANCE_PX = 48;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 80;

@Component({
  selector: 'app-al-quran',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './al-quran.component.html',
  styleUrl: './al-quran.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlQuranComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quranReader = inject(QuranReaderService);
  private readonly researchSearch = inject(QuranResearchSearchService, { optional: true });
  private readonly readerHeader = inject(QuranReaderHeaderService, { optional: true });
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly loadedPageFonts = new Set<number>();
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private readerContent?: IonContent;

  @ViewChild('readerContent')
  set readerContentRef(content: IonContent | undefined) {
    this.readerContent = content;
  }

  readonly surahs = signal<QuranBrowseSurah[]>([]);
  readonly pages = signal<QuranPageResponse[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeStartPage = signal(FIRST_PAGE);
  readonly activePage = signal(FIRST_PAGE);
  readonly activeSurah = signal(FIRST_PAGE);
  readonly activeVerse = signal(FIRST_PAGE);

  readonly activePageData = computed(() =>
    this.pages().find((p) => p.page.number === this.activePage()) ?? null,
  );
  readonly canGoPrevious = computed(() => this.activePage() > FIRST_PAGE && !this.loading() && !this.loadingMore());
  readonly canGoNext = computed(() => this.activePage() < LAST_PAGE && !this.loading() && !this.loadingMore());

  constructor() {
    const readerHeader = this.readerHeader;
    if (readerHeader) {
      readerHeader.registerHandlers({
        goToSurah: (value) => void this.goToSurah(value),
        goToVerse: (value) => void this.goToVerse(value),
        goToPage: (value) => void this.goToPage(value),
      });

      effect(() => {
        readerHeader.updateState({
          surahs: this.surahs(),
          activeSurah: this.activeSurah(),
          activeVerse: this.activeVerse(),
          activePage: this.activePage(),
          disabled: this.loading() || !!this.error(),
        });
      });
    }

    const search = this.researchSearch;
    if (!search) return;

    effect((onCleanup) => {
      const query = search.searchTerm().trim();
      if (!query) return;

      const timer = setTimeout(() => {
        void this.handleHeaderSearch(query);
      }, 420);
      onCleanup(() => clearTimeout(timer));
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadInitialPages();
  }

  ngOnDestroy(): void {
    this.readerHeader?.clearHandlers();
  }

  trackLine(_index: number, line: QuranLayoutLine): number {
    return line.line_number;
  }

  trackAyah(_index: number, ayah: QuranPageAyahSlice): string {
    return ayah.verse_key;
  }

  trackWord(_index: number, word: QuranPageWord): string {
    return `${word.surah}:${word.ayah}:${word.position}`;
  }

  mushafFont(page: number): string {
    return `'QPCV2Page${page}', var(--km-font-arabic), 'UthmanicHafs', 'AmiriQuran', serif`;
  }

  onTouchSwipeStart(event: Event): void {
    const touch = (event as TouchEvent).changedTouches.item(0);
    if (!touch) return;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
  }

  onTouchSwipeEnd(event: Event): void {
    const touch = (event as TouchEvent).changedTouches.item(0);
    if (!touch || this.swipeStartX === null || this.swipeStartY === null) return;

    const deltaX = touch.clientX - this.swipeStartX;
    const deltaY = touch.clientY - this.swipeStartY;
    this.swipeStartX = null;
    this.swipeStartY = null;

    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX || Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX) return;

    void this.navigateByPage(deltaX > 0 ? 1 : -1);
  }

  onSwipeCancel(): void {
    this.swipeStartX = null;
    this.swipeStartY = null;
  }

  async goToPage(raw: string): Promise<void> {
    const page = this.clampPage(Number(raw));
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
    await this.loadFromPage(page);
  }

  async goToSurah(raw: string): Promise<void> {
    const surah = this.clampSurah(Number(raw));
    const page = await this.resolveSurahStartPage(surah);
    this.activeSurah.set(surah);
    this.activeVerse.set(FIRST_PAGE);
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { surah, page: null, startingVerse: null },
      queryParamsHandling: 'merge',
    });
    await this.loadFromPage(page, { surah, verse: FIRST_PAGE });
  }

  async goToVerse(raw: string): Promise<void> {
    const verse = this.clampVerse(Number(raw));
    await this.goToAyah(this.activeSurah(), verse);
  }

  private async navigateByPage(delta: number): Promise<void> {
    if (this.loading() || this.loadingMore()) return;
    const target = this.clampPage(this.activePage() + delta);
    if (target === this.activePage()) return;

    this.activePage.set(target);
    this.activeStartPage.set(target);
    void this.readerContent?.scrollToTop(0);

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: target },
      queryParamsHandling: 'merge',
    });

    if (!this.pages().some((p) => p.page.number === target)) {
      this.loadingMore.set(true);
      try {
        const loaded = await this.fetchPages([target]);
        this.pages.update((current) => this.mergeIntoCache(current, loaded));
      } catch (err) {
        this.error.set(this.errorMessage(err, 'Failed to load page'));
        return;
      } finally {
        this.loadingMore.set(false);
      }
    }

    this.animateLoadedPages();
    const page = this.pages().find((p) => p.page.number === target);
    if (page) this.syncActiveReferenceFromPage(page);

    void this.preloadPages(target);
  }

  private async loadInitialPages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.loadMenu();
      const startPage = await this.resolveInitialPage();
      await this.loadFromPage(startPage);
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load Al-Quran'));
      this.pages.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMenu(): Promise<void> {
    const menu = await firstValueFrom(this.quranReader.getMenu());
    this.surahs.set(menu.surahs);
  }

  private async loadFromPage(page: number, activeRef?: { surah: number; verse: number }): Promise<void> {
    const startPage = this.clampPage(page);
    this.activeStartPage.set(startPage);
    this.activePage.set(startPage);
    const to = Math.min(LAST_PAGE, startPage + PAGE_BATCH_SIZE - 1);
    const loaded = await this.fetchPages(this.range(startPage, to));
    this.pages.set(loaded);
    if (activeRef) {
      this.activeSurah.set(activeRef.surah);
      this.activeVerse.set(activeRef.verse);
    } else {
      this.syncActiveReferenceFromPages(loaded);
    }
    this.animateLoadedPages(true);
    void this.readerContent?.scrollToTop(0);
  }

  private async preloadPages(aroundPage: number): Promise<void> {
    if (this.loadingMore()) return;
    const toLoad = this.range(aroundPage + 1, Math.min(LAST_PAGE, aroundPage + PAGE_BATCH_SIZE))
      .filter((p) => !this.pages().some((cached) => cached.page.number === p));
    if (!toLoad.length) return;

    try {
      const loaded = await this.fetchPages(toLoad);
      this.pages.update((current) => this.mergeIntoCache(current, loaded));
    } catch {
      // Preload failure is silent — next navigate will fetch on demand.
    }
  }

  private mergeIntoCache(current: QuranPageResponse[], incoming: QuranPageResponse[]): QuranPageResponse[] {
    const map = new Map(current.map((p) => [p.page.number, p]));
    for (const p of incoming) map.set(p.page.number, p);
    return Array.from(map.values()).sort((a, b) => a.page.number - b.page.number);
  }

  private async resolveInitialPage(): Promise<number> {
    const query = this.route.snapshot.queryParamMap;
    const pageParam = Number(query.get('page'));
    if (Number.isFinite(pageParam) && pageParam > 0) return this.clampPage(pageParam);

    const routeSurah = this.route.snapshot.paramMap.get('surahId') ?? this.route.parent?.snapshot.paramMap.get('surahId');
    const surahParam = Number(query.get('surah') ?? query.get('sura') ?? query.get('chapter') ?? routeSurah);
    const verseParam = Number(query.get('startingVerse') ?? query.get('ayah') ?? query.get('verse'));
    const surah = this.clampSurah(surahParam || FIRST_PAGE);
    const verse = Number.isFinite(verseParam) && verseParam > 0 ? verseParam : FIRST_PAGE;

    if (surah > FIRST_PAGE || verse > FIRST_PAGE) {
      return this.resolveAyahPage(surah, verse);
    }

    return FIRST_PAGE;
  }

  private async resolveAyahPage(surah: number, ayah: number): Promise<number> {
    try {
      const reader = await firstValueFrom(this.quranReader.getSurahAyahs(surah));
      const match = (reader.results ?? reader.verses ?? []).find((entry) => entry.ayah === ayah);
      if (match?.page_number) return this.clampPage(match.page_number);
    } catch {
      // Fall back to the surah start page below.
    }

    return this.resolveSurahStartPage(surah);
  }

  private async goToAyah(surah: number, ayah: number): Promise<void> {
    const clampedSurah = this.clampSurah(surah);
    const clampedAyah = this.clampVerse(ayah);
    const page = await this.resolveAyahPage(clampedSurah, clampedAyah);
    this.activeSurah.set(clampedSurah);
    this.activeVerse.set(clampedAyah);
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { surah: clampedSurah, startingVerse: clampedAyah, page: null },
      queryParamsHandling: 'merge',
    });
    await this.loadFromPage(page, { surah: clampedSurah, verse: clampedAyah });
  }

  private async handleHeaderSearch(query: string): Promise<void> {
    if (this.loading()) return;

    const ref = this.parseAyahReference(query);
    if (ref) {
      await this.goToAyah(ref.surah, ref.ayah);
      return;
    }

    const surah = this.matchSurah(query);
    if (surah) {
      await this.goToSurah(String(surah.surah));
      return;
    }

    if (query.length < 2) return;

    try {
      const result = await firstValueFrom(this.quranReader.searchAyahs(query, 1, 1));
      const match = result.results[0];
      if (match) await this.goToAyah(match.surah, match.ayah);
    } catch {
      // Search is a navigation helper; keep the current page if no lookup succeeds.
    }
  }

  private parseAyahReference(query: string): { surah: number; ayah: number } | null {
    const normalized = query.trim();
    const match = normalized.match(/^(\d{1,3})\s*[:./,\-\s]\s*(\d{1,3})$/);
    if (!match) return null;
    const surah = this.clampSurah(Number(match[1]));
    const ayah = this.clampVerse(Number(match[2]));
    return { surah, ayah };
  }

  private matchSurah(query: string): QuranBrowseSurah | null {
    const normalized = this.normalizeSearch(query);
    if (!normalized) return null;

    return (
      this.surahs().find((surah) => {
        const number = String(surah.surah);
        return (
          number === normalized ||
          this.normalizeSearch(surah.name_en ?? '') === normalized ||
          this.normalizeSearch(surah.meta.name_simple ?? '') === normalized ||
          surah.name_ar.includes(query.trim())
        );
      }) ?? null
    );
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[''`-]/g, '')
      .trim()
      .toLowerCase();
  }

  private syncActiveReferenceFromPages(pages: QuranPageResponse[]): void {
    const firstVerse = pages[0]?.verses[0];
    if (!firstVerse) return;
    this.activeSurah.set(firstVerse.surah);
    this.activeVerse.set(firstVerse.ayah);
  }

  private syncActiveReferenceFromPage(page: QuranPageResponse): void {
    const firstVerse = page.verses[0];
    if (!firstVerse) return;
    this.activeSurah.set(firstVerse.surah);
    this.activeVerse.set(firstVerse.ayah);
  }

  private async resolveSurahStartPage(surah: number): Promise<number> {
    const page =
      this.surahs().find((item) => item.surah === surah)?.start_page ??
      (await firstValueFrom(this.quranReader.resolveSurahStartPage(surah)));
    return page ?? FIRST_PAGE;
  }

  private async fetchPages(pageNumbers: number[]): Promise<QuranPageResponse[]> {
    if (!pageNumbers.length) return [];
    this.ensureQpcFonts(pageNumbers);
    const responses = await Promise.all(
      pageNumbers.map((page) => firstValueFrom(this.quranReader.getMushafPage(page, MUSHAF_LAYOUT))),
    );
    return responses.sort((a, b) => a.page.number - b.page.number);
  }

  private ensureQpcFonts(pageNumbers: number[]): void {
    const doc = globalThis.document;
    if (!doc?.head) return;

    for (const page of pageNumbers) {
      if (this.loadedPageFonts.has(page)) continue;
      this.loadedPageFonts.add(page);

      const styleId = `qpc-v2-page-font-${page}`;
      if (doc.getElementById(styleId)) continue;

      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = `
@font-face {
  font-family: 'QPCV2Page${page}';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/QPC%20V2%20Font.woff2/p${page}.woff2') format('woff2'),
       url('https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/p${page}.woff2?v=3.1') format('woff2');
}`;
      doc.head.appendChild(style);
    }
  }

  private animateLoadedPages(reset = false): void {
    requestAnimationFrame(() => {
      const root = this.host.nativeElement;
      if (reset) {
        root.querySelectorAll<HTMLElement>('.mushaf-page.is-animated').forEach((el) => {
          el.classList.remove('is-animated');
        });
      }

      const pages = Array.from(root.querySelectorAll<HTMLElement>('.mushaf-page:not(.is-animated)'));
      for (const page of pages) {
        page.classList.add('is-animated');
        const lines = Array.from(page.querySelectorAll<HTMLElement>('.mushaf-line'));
        const footer = page.querySelector<HTMLElement>('.mushaf-page__footer');

        gsap.fromTo(page, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power3.out' });
        gsap.fromTo(
          lines,
          { autoAlpha: 0, y: 12, filter: 'blur(5px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.52,
            ease: 'power3.out',
            stagger: 0.026,
            delay: 0.08,
          },
        );
        if (footer) {
          gsap.fromTo(
            footer,
            { autoAlpha: 0, scaleX: 0.82 },
            { autoAlpha: 1, scaleX: 1, duration: 0.38, ease: 'power2.out', delay: 0.34 },
          );
        }
      }
    });
  }

  private range(from: number, to: number): number[] {
    const out: number[] = [];
    for (let page = from; page <= to; page++) out.push(page);
    return out;
  }

  private clampPage(value: number): number {
    if (!Number.isFinite(value)) return FIRST_PAGE;
    return Math.max(FIRST_PAGE, Math.min(LAST_PAGE, Math.trunc(value)));
  }

  private clampSurah(value: number): number {
    if (!Number.isFinite(value)) return FIRST_PAGE;
    return Math.max(1, Math.min(114, Math.trunc(value)));
  }

  private clampVerse(value: number): number {
    if (!Number.isFinite(value)) return FIRST_PAGE;
    return Math.max(FIRST_PAGE, Math.trunc(value));
  }

  private errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }
}
