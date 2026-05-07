import {
  AfterViewInit,
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
const AUTO_LOAD_THRESHOLD_PX = 900;
const MOBILE_PAGED_QUERY = '(max-width: 900px)';
const SWIPE_MIN_DISTANCE_PX = 42;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 72;
const WHEEL_SWIPE_COOLDOWN_MS = 420;

@Component({
  selector: 'app-al-quran',
  standalone: true,
  imports: [],
  templateUrl: './al-quran.component.html',
  styleUrl: './al-quran.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlQuranComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quranReader = inject(QuranReaderService);
  private readonly researchSearch = inject(QuranResearchSearchService, { optional: true });
  private readonly readerHeader = inject(QuranReaderHeaderService, { optional: true });
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly loadedPageFonts = new Set<number>();
  private readonly scrollListenerCleanups: Array<() => void> = [];
  private readonly swipeListenerCleanups: Array<() => void> = [];
  private scrollCheckFrame = 0;
  private readerScrollFrame = 0;
  private pointerStartX: number | null = null;
  private pointerStartY: number | null = null;
  private swipeHandled = false;
  private lastWheelSwipeAt = 0;
  private loadPreviousSentinel?: ElementRef<HTMLElement>;
  private loadMoreSentinel?: ElementRef<HTMLElement>;

  @ViewChild('loadPreviousSentinel')
  set loadPreviousSentinelRef(element: ElementRef<HTMLElement> | undefined) {
    this.loadPreviousSentinel = element;
    this.scheduleScrollCheck();
  }

  @ViewChild('loadMoreSentinel')
  set loadMoreSentinelRef(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreSentinel = element;
    this.scheduleScrollCheck();
  }

  @ViewChild('mushafReader')
  set mushafReaderRef(element: ElementRef<HTMLElement> | undefined) {
    this.clearSwipeListeners();
    if (!element) return;
    this.setupSwipeListeners(element.nativeElement);
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

  readonly firstLoadedPage = computed(() => this.pages()[0]?.page.number ?? null);
  readonly lastLoadedPage = computed(() => this.pages()[this.pages().length - 1]?.page.number ?? null);
  readonly hasPreviousPages = computed(() => (this.firstLoadedPage() ?? FIRST_PAGE) > FIRST_PAGE);
  readonly hasMorePages = computed(() => (this.lastLoadedPage() ?? 0) < LAST_PAGE);
  readonly canGoPreviousPage = computed(() => this.activePage() > FIRST_PAGE && !this.loading() && !this.loadingMore());
  readonly canGoNextPage = computed(() => this.activePage() < LAST_PAGE && !this.loading() && !this.loadingMore());
  readonly loadedRangeLabel = computed(() => {
    const first = this.firstLoadedPage();
    const last = this.lastLoadedPage();
    return first && last ? `${first}-${last}` : '';
  });

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

  ngAfterViewInit(): void {
    this.setupScrollListeners();
    this.scheduleScrollCheck();
  }

  ngOnDestroy(): void {
    for (const cleanup of this.scrollListenerCleanups) cleanup();
    this.clearSwipeListeners();
    if (this.scrollCheckFrame) cancelAnimationFrame(this.scrollCheckFrame);
    if (this.readerScrollFrame) cancelAnimationFrame(this.readerScrollFrame);
    this.readerHeader?.clearHandlers();
  }

  trackPage(_index: number, page: QuranPageResponse): number {
    return page.page.number;
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

  onScroll(event: Event): void {
    if (this.isMobilePaged()) return;
    this.checkElementScrollPosition(event.target as HTMLElement);
  }

  onReaderScroll(event: Event): void {
    if (!this.isMobilePaged()) return;

    const scroller = event.currentTarget as HTMLElement | null;
    if (!scroller || this.readerScrollFrame) return;

    this.readerScrollFrame = requestAnimationFrame(() => {
      this.readerScrollFrame = 0;
      this.syncActivePageFromReaderScroll(scroller);
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.startSwipe(event.clientX, event.clientY);
  }

  onPointerUp(event: PointerEvent): void {
    this.finishSwipe(event.clientX, event.clientY);
  }

  onPointerMove(event: PointerEvent): void {
    this.moveSwipe(event.clientX, event.clientY);
  }

  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.startSwipe(event.clientX, event.clientY);
  }

  onMouseUp(event: MouseEvent): void {
    this.finishSwipe(event.clientX, event.clientY);
  }

  onMouseMove(event: MouseEvent): void {
    this.moveSwipe(event.clientX, event.clientY);
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    this.startSwipe(touch.clientX, touch.clientY);
  }

  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    this.finishSwipe(touch.clientX, touch.clientY);
  }

  onTouchMove(event: TouchEvent): void {
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    this.moveSwipe(touch.clientX, touch.clientY);
  }

  private startSwipe(clientX: number, clientY: number): void {
    if (!this.isMobilePaged()) return;
    this.pointerStartX = clientX;
    this.pointerStartY = clientY;
    this.swipeHandled = false;
  }

  private finishSwipe(clientX: number, clientY: number): void {
    if (!this.isMobilePaged() || this.pointerStartX === null || this.pointerStartY === null) return;

    const deltaX = clientX - this.pointerStartX;
    const deltaY = clientY - this.pointerStartY;
    this.pointerStartX = null;
    this.pointerStartY = null;

    if (!this.swipeHandled) this.handleSwipeDelta(deltaX, deltaY);
    this.swipeHandled = false;
  }

  private moveSwipe(clientX: number, clientY: number): void {
    if (!this.isMobilePaged() || this.swipeHandled || this.pointerStartX === null || this.pointerStartY === null) return;

    const deltaX = clientX - this.pointerStartX;
    const deltaY = clientY - this.pointerStartY;
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX || Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX) return;

    this.swipeHandled = true;
    this.handleSwipeDelta(deltaX, deltaY);
  }

  private handleWheelSwipe(event: WheelEvent): void {
    if (!this.isMobilePaged()) return;
    if (Math.abs(event.deltaX) < SWIPE_MIN_DISTANCE_PX || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

    const now = Date.now();
    if (now - this.lastWheelSwipeAt < WHEEL_SWIPE_COOLDOWN_MS) return;
    this.lastWheelSwipeAt = now;
    this.handleSwipeDelta(-event.deltaX, 0);
  }

  private handleSwipeDelta(deltaX: number, deltaY: number): void {
    if (!this.isMobilePaged()) return;
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX || Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX) return;
    if (deltaX < 0) {
      void this.goToNextPage();
    } else {
      void this.goToPreviousPage();
    }
  }

  private setupSwipeListeners(el: HTMLElement): void {
    const doc = globalThis.document;
    const win = globalThis.window;

    const onPointerDown = ((event: PointerEvent) => this.onPointerDown(event)) as EventListener;
    const onPointerUp = ((event: PointerEvent) => this.onPointerUp(event)) as EventListener;
    const onPointerMove = ((event: PointerEvent) => this.onPointerMove(event)) as EventListener;
    const onMouseDown = ((event: MouseEvent) => this.onMouseDown(event)) as EventListener;
    const onMouseUp = ((event: MouseEvent) => this.onMouseUp(event)) as EventListener;
    const onMouseMove = ((event: MouseEvent) => this.onMouseMove(event)) as EventListener;
    const onTouchStart = ((event: TouchEvent) => this.onTouchStart(event)) as EventListener;
    const onTouchEnd = ((event: TouchEvent) => this.onTouchEnd(event)) as EventListener;
    const onTouchMove = ((event: TouchEvent) => this.onTouchMove(event)) as EventListener;
    const onWheel = ((event: WheelEvent) => this.handleWheelSwipe(event)) as EventListener;

    el.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    el.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    el.addEventListener('mousedown', onMouseDown, { capture: true, passive: true });
    el.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    el.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    el.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
    el.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    el.addEventListener('wheel', onWheel, { capture: true, passive: true });

    this.swipeListenerCleanups.push(
      () => el.removeEventListener('pointerdown', onPointerDown, { capture: true }),
      () => el.removeEventListener('pointermove', onPointerMove, { capture: true }),
      () => el.removeEventListener('mousedown', onMouseDown, { capture: true }),
      () => el.removeEventListener('mousemove', onMouseMove, { capture: true }),
      () => el.removeEventListener('touchstart', onTouchStart, { capture: true }),
      () => el.removeEventListener('touchmove', onTouchMove, { capture: true }),
      () => el.removeEventListener('touchend', onTouchEnd, { capture: true }),
      () => el.removeEventListener('wheel', onWheel, { capture: true }),
    );

    const endTargets: Array<Window | Document> = [];
    if (win) endTargets.push(win);
    if (doc) endTargets.push(doc);

    for (const target of endTargets) {
      target.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
      target.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
      target.addEventListener('mouseup', onMouseUp, { capture: true, passive: true });
      target.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
      target.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
      target.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
      this.swipeListenerCleanups.push(
        () => target.removeEventListener('pointerup', onPointerUp, { capture: true }),
        () => target.removeEventListener('pointermove', onPointerMove, { capture: true }),
        () => target.removeEventListener('mouseup', onMouseUp, { capture: true }),
        () => target.removeEventListener('mousemove', onMouseMove, { capture: true }),
        () => target.removeEventListener('touchend', onTouchEnd, { capture: true }),
        () => target.removeEventListener('touchmove', onTouchMove, { capture: true }),
      );
    }
  }

  private clearSwipeListeners(): void {
    while (this.swipeListenerCleanups.length) {
      this.swipeListenerCleanups.pop()?.();
    }
  }

  private syncActivePageFromReaderScroll(scroller: HTMLElement): void {
    const pages = this.pages();
    if (!pages.length || scroller.clientWidth <= 0) return;

    const index = Math.max(0, Math.min(pages.length - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)));
    const page = pages[index];
    if (!page || page.page.number === this.activePage()) return;

    this.activePage.set(page.page.number);
    this.activeStartPage.set(page.page.number);
    this.syncActiveReferenceFromPage(page);

    if (index >= pages.length - 2) void this.loadNextPages();
    if (index <= 1) void this.loadPreviousPages();
  }

  private scrollActivePageIntoView(): void {
    requestAnimationFrame(() => {
      const root = this.host.nativeElement;
      const page = root.querySelector<HTMLElement>('.mushaf-page--active');
      page?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
  }

  async loadPreviousPages(): Promise<void> {
    if (this.loadingMore() || !this.hasPreviousPages()) return;
    this.loadingMore.set(true);
    this.error.set(null);

    const first = this.firstLoadedPage() ?? FIRST_PAGE;
    const from = Math.max(FIRST_PAGE, first - PAGE_BATCH_SIZE);
    const pageNumbers = this.range(from, first - 1);

    try {
      const loaded = await this.fetchPages(pageNumbers);
      this.pages.set([...loaded, ...this.pages()]);
      this.animateLoadedPages();
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load previous pages'));
    } finally {
      this.loadingMore.set(false);
      this.scheduleScrollCheck();
    }
  }

  async loadNextPages(): Promise<void> {
    if (this.loadingMore() || !this.hasMorePages()) return;
    this.loadingMore.set(true);
    this.error.set(null);

    const last = this.lastLoadedPage() ?? 0;
    const to = Math.min(LAST_PAGE, last + PAGE_BATCH_SIZE);
    const pageNumbers = this.range(last + 1, to);

    try {
      const loaded = await this.fetchPages(pageNumbers);
      this.pages.set([...this.pages(), ...loaded]);
      this.animateLoadedPages();
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load more pages'));
    } finally {
      this.loadingMore.set(false);
      this.scheduleScrollCheck();
    }
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

  async goToPreviousPage(): Promise<void> {
    await this.goToPagedPage(this.activePage() - 1, 'previous');
  }

  async goToNextPage(): Promise<void> {
    await this.goToPagedPage(this.activePage() + 1, 'next');
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
    this.scheduleScrollCheck();
  }

  private async goToPagedPage(page: number, direction: 'next' | 'previous'): Promise<void> {
    if (this.loading() || this.loadingMore()) return;

    const targetPage = this.clampPage(page);
    const currentPage = this.activePage();
    if (targetPage === currentPage) return;

    const previousPage = currentPage;
    this.error.set(null);
    this.activePage.set(targetPage);
    this.activeStartPage.set(targetPage);

    let pagePayload = this.pages().find((entry) => entry.page.number === targetPage) ?? null;
    if (!pagePayload) {
      this.loadingMore.set(true);
      try {
        const loaded = await this.fetchPages([targetPage]);
        pagePayload = loaded[0] ?? null;
        this.pages.set(this.mergePages(this.pages(), loaded));
      } catch (err) {
        this.activePage.set(previousPage);
        this.activeStartPage.set(previousPage);
        this.error.set(this.errorMessage(err, 'Failed to load page'));
        return;
      } finally {
        this.loadingMore.set(false);
      }
    }

    if (pagePayload) this.syncActiveReferenceFromPage(pagePayload);
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: targetPage, surah: null, startingVerse: null },
      queryParamsHandling: 'merge',
    });
    this.scrollActivePageIntoView();
    this.animateActivePage(direction);
  }

  private async resolveInitialPage(): Promise<number> {
    const query = this.route.snapshot.queryParamMap;
    const pageParam = Number(query.get('page'));
    if (Number.isFinite(pageParam) && pageParam > 0) return this.clampPage(pageParam);

    const routeSurah = this.route.snapshot.paramMap.get('surahId');
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

    return this.surahs().find((surah) => {
      const number = String(surah.surah);
      return number === normalized
        || this.normalizeSearch(surah.name_en ?? '') === normalized
        || this.normalizeSearch(surah.meta.name_simple ?? '') === normalized
        || surah.name_ar.includes(query.trim());
    }) ?? null;
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['’`-]/g, '')
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
    const page = this.surahs().find((item) => item.surah === surah)?.start_page
      ?? await firstValueFrom(this.quranReader.resolveSurahStartPage(surah));
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
  src: url('https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/p${page}.woff2?v=3.1') format('woff2');
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

  private animateActivePage(direction: 'next' | 'previous'): void {
    requestAnimationFrame(() => {
      const root = this.host.nativeElement;
      const page = root.querySelector<HTMLElement>('.mushaf-page--active');
      if (!page) return;
      gsap.killTweensOf(page);
      gsap.fromTo(
        page,
        { autoAlpha: 0, x: direction === 'next' ? -28 : 28 },
        { autoAlpha: 1, x: 0, duration: 0.24, ease: 'power2.out', clearProps: 'transform' },
      );
    });
  }

  private setupScrollListeners(): void {
    const root = this.host.nativeElement;
    const targets = new Set<EventTarget>();
    const readerScroller = root.querySelector<HTMLElement>('.al-quran-page');
    const shellScroller = root.closest<HTMLElement>('.qrs-content');
    const doc = globalThis.document;

    if (readerScroller) targets.add(readerScroller);
    if (shellScroller) targets.add(shellScroller);
    if (globalThis.window) targets.add(globalThis.window);

    const listener = () => this.scheduleScrollCheck();
    for (const target of targets) {
      target.addEventListener('scroll', listener, { passive: true });
      this.scrollListenerCleanups.push(() => target.removeEventListener('scroll', listener));
    }

    if (doc) {
      doc.addEventListener('scroll', listener, { capture: true, passive: true });
      this.scrollListenerCleanups.push(() => doc.removeEventListener('scroll', listener, { capture: true }));
    }
  }

  private scheduleScrollCheck(): void {
    if (this.scrollCheckFrame) return;
    this.scrollCheckFrame = requestAnimationFrame(() => {
      this.scrollCheckFrame = 0;
      this.checkCurrentScrollPosition();
    });
  }

  private checkCurrentScrollPosition(): void {
    if (this.isMobilePaged()) return;

    const root = this.host.nativeElement;
    const readerScroller = root.querySelector<HTMLElement>('.al-quran-page');

    this.checkSentinelPositions();
    if (readerScroller) this.checkElementScrollPosition(readerScroller);
    this.checkWindowScrollPosition();
  }

  private checkSentinelPositions(): void {
    if (this.loading() || this.loadingMore()) return;

    const viewportHeight = globalThis.window?.innerHeight ?? globalThis.document?.documentElement.clientHeight ?? 0;
    const nextSentinel = this.loadMoreSentinel?.nativeElement;
    if (nextSentinel && nextSentinel.getBoundingClientRect().top < viewportHeight + AUTO_LOAD_THRESHOLD_PX) {
      void this.loadNextPages();
      return;
    }

    const previousSentinel = this.loadPreviousSentinel?.nativeElement;
    if (previousSentinel && previousSentinel.getBoundingClientRect().bottom > -AUTO_LOAD_THRESHOLD_PX) {
      void this.loadPreviousPages();
    }
  }

  private checkElementScrollPosition(el: HTMLElement): void {
    if (this.loading() || this.loadingMore()) return;
    if (el.scrollHeight <= el.clientHeight + 1) return;

    const remainingBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remainingBottom < AUTO_LOAD_THRESHOLD_PX) {
      void this.loadNextPages();
      return;
    }

    if (el.scrollTop < AUTO_LOAD_THRESHOLD_PX) void this.loadPreviousPages();
  }

  private checkWindowScrollPosition(): void {
    if (this.loading() || this.loadingMore()) return;
    const doc = globalThis.document?.documentElement;
    const viewportHeight = globalThis.window?.innerHeight ?? doc?.clientHeight ?? 0;
    if (!doc || doc.scrollHeight <= viewportHeight + 1) return;

    const scrollTop = globalThis.window?.scrollY ?? doc.scrollTop;
    const remainingBottom = doc.scrollHeight - scrollTop - viewportHeight;
    if (remainingBottom < AUTO_LOAD_THRESHOLD_PX) {
      void this.loadNextPages();
      return;
    }
    if (scrollTop < AUTO_LOAD_THRESHOLD_PX) void this.loadPreviousPages();
  }

  private range(from: number, to: number): number[] {
    const out: number[] = [];
    for (let page = from; page <= to; page++) out.push(page);
    return out;
  }

  private mergePages(current: QuranPageResponse[], incoming: QuranPageResponse[]): QuranPageResponse[] {
    const pages = new Map<number, QuranPageResponse>();
    for (const page of current) pages.set(page.page.number, page);
    for (const page of incoming) pages.set(page.page.number, page);
    return Array.from(pages.values()).sort((a, b) => a.page.number - b.page.number);
  }

  private isMobilePaged(): boolean {
    return globalThis.matchMedia?.(MOBILE_PAGED_QUERY).matches ?? false;
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
