import {
  AfterViewInit,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';
import { QrPageLayoutAyah, QrPagePayload, QrPageWord } from '../../../../shared/models/quran/qr.models';
import { QuranApiService } from '../../../../shared/services/quran/quran-api.service';
import { QuranStateService } from '../../../../shared/services/quran/quran-state.service';

const FIRST_PAGE = 1;
const LAST_PAGE = 604;
const PAGE_BATCH_SIZE = 4;
const MUSHAF_LAYOUT = 'qpc-v2-15-lines';
const AUTO_LOAD_THRESHOLD_PX = 900;

@Component({
  selector: 'km-al-quran',
  standalone: true,
  imports: [],
  templateUrl: './al-quran.component.html',
  styleUrl: './al-quran.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlQuranComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly qrApi = inject(QuranApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly loadedPageFonts = new Set<number>();
  private readonly scrollListenerCleanups: Array<() => void> = [];
  private scrollCheckFrame = 0;
  readonly quranState = inject(QuranStateService);

  private loadPreviousObserver?: IntersectionObserver;
  private loadMoreObserver?: IntersectionObserver;
  private loadPreviousSentinel?: ElementRef<HTMLElement>;
  private loadMoreSentinel?: ElementRef<HTMLElement>;

  @ViewChild('loadPreviousSentinel')
  set loadPreviousSentinelRef(element: ElementRef<HTMLElement> | undefined) {
    this.loadPreviousObserver?.disconnect();
    this.loadPreviousObserver = undefined;
    this.loadPreviousSentinel = element;
    this.observeLoadPreviousSentinel();
  }

  @ViewChild('loadMoreSentinel')
  set loadMoreSentinelRef(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreObserver?.disconnect();
    this.loadMoreObserver = undefined;
    this.loadMoreSentinel = element;
    this.observeLoadMoreSentinel();
  }

  readonly pages = signal<QrPagePayload[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeStartPage = signal(FIRST_PAGE);

  readonly firstLoadedPage = computed(() => this.pages()[0]?.page.number ?? null);
  readonly lastLoadedPage = computed(() => this.pages()[this.pages().length - 1]?.page.number ?? null);
  readonly hasPreviousPages = computed(() => (this.firstLoadedPage() ?? FIRST_PAGE) > FIRST_PAGE);
  readonly hasMorePages = computed(() => (this.lastLoadedPage() ?? 0) < LAST_PAGE);
  readonly loadedRangeLabel = computed(() => {
    const first = this.firstLoadedPage();
    const last = this.lastLoadedPage();
    return first && last ? `${first}-${last}` : '';
  });

  async ngOnInit(): Promise<void> {
    this.quranState.load();
    await this.loadInitialPages();
    this.observeLoadPreviousSentinel();
    this.observeLoadMoreSentinel();
  }

  ngAfterViewInit(): void {
    this.observeLoadPreviousSentinel();
    this.observeLoadMoreSentinel();
    this.setupScrollListeners();
    this.scheduleScrollCheck();
  }

  ngOnDestroy(): void {
    this.loadPreviousObserver?.disconnect();
    this.loadMoreObserver?.disconnect();
    for (const cleanup of this.scrollListenerCleanups) cleanup();
    if (this.scrollCheckFrame) cancelAnimationFrame(this.scrollCheckFrame);
  }

  trackPage(_index: number, page: QrPagePayload): number {
    return page.page.number;
  }

  trackLine(_index: number, line: QrPagePayload['layout_lines'][number]): number {
    return line.line_number;
  }

  trackAyah(_index: number, ayah: QrPageLayoutAyah): string {
    return ayah.verse_key;
  }

  trackWord(_index: number, word: QrPageWord): string {
    return word.id;
  }

  mushafFont(page: number): string {
    return `'QPCV2Page${page}', var(--km-font-arabic), 'UthmanicHafs', 'AmiriQuran', serif`;
  }

  onScroll(event: Event): void {
    this.checkElementScrollPosition(event.target as HTMLElement);
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
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { surah, page: null, startingVerse: null },
      queryParamsHandling: 'merge',
    });
    await this.loadFromPage(page);
  }

  back(): void {
    this.router.navigate(['/quran']);
  }

  private async loadInitialPages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const startPage = await this.resolveInitialPage();
      await this.loadFromPage(startPage);
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load Al-Quran'));
      this.pages.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFromPage(page: number): Promise<void> {
    const startPage = this.clampPage(page);
    this.activeStartPage.set(startPage);
    const to = Math.min(LAST_PAGE, startPage + PAGE_BATCH_SIZE - 1);
    const loaded = await this.fetchPages(this.range(startPage, to));
    this.pages.set(loaded);
    this.animateLoadedPages(true);
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
      const reader = await firstValueFrom(this.qrApi.getSurahReader(surah, 500));
      const match = reader.data.ayahs.find((entry) => entry.ayah === ayah);
      if (match?.page_number) return this.clampPage(match.page_number);
    } catch {
      // Fall back to the surah start page below.
    }

    return this.resolveSurahStartPage(surah);
  }

  private async resolveSurahStartPage(surah: number): Promise<number> {
    const page = await this.lookupSurahPageFromMenu(surah);
    return page ?? FIRST_PAGE;
  }

  private async lookupSurahPageFromMenu(surah: number): Promise<number | null> {
    const menu = await firstValueFrom(this.qrApi.getMenu());
    return menu.data.surahs.find((item) => item.id === surah)?.page_start ?? null;
  }

  private async fetchPages(pageNumbers: number[]): Promise<QrPagePayload[]> {
    if (!pageNumbers.length) return [];
    this.ensureQpcFonts(pageNumbers);
    const responses = await Promise.all(pageNumbers.map((page) => firstValueFrom(this.qrApi.getMushafPage(page, MUSHAF_LAYOUT))));
    return responses.map((response) => response.data).sort((a, b) => a.page.number - b.page.number);
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
      const root = this.host.nativeElement as HTMLElement;
      if (reset) {
        root.querySelectorAll<HTMLElement>('.mushaf-page.is-animated').forEach((el: HTMLElement) => {
          el.classList.remove('is-animated');
        });
      }

      const pages = Array.from(
        root.querySelectorAll<HTMLElement>('.mushaf-page:not(.is-animated)'),
      );
      for (const page of pages) {
        page.classList.add('is-animated');
        const lines = Array.from(page.querySelectorAll<HTMLElement>('.mushaf-line'));
        const footer = page.querySelector<HTMLElement>('.mushaf-page__footer');

        gsap.fromTo(
          page,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power3.out' },
        );
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

  private observeLoadPreviousSentinel(): void {
    const sentinel = this.loadPreviousSentinel?.nativeElement;
    if (!sentinel || this.loadPreviousObserver) return;

    this.loadPreviousObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void this.loadPreviousPages();
          this.scheduleScrollCheck();
        }
      },
      { root: null, rootMargin: '900px 0px 900px', threshold: 0 },
    );
    this.loadPreviousObserver.observe(sentinel);
  }

  private observeLoadMoreSentinel(): void {
    const sentinel = this.loadMoreSentinel?.nativeElement;
    if (!sentinel || this.loadMoreObserver) return;

    this.loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void this.loadNextPages();
          this.scheduleScrollCheck();
        }
      },
      { root: null, rootMargin: '900px 0px 900px', threshold: 0 },
    );
    this.loadMoreObserver.observe(sentinel);
  }

  private setupScrollListeners(): void {
    const root = this.host.nativeElement as HTMLElement;
    const targets = new Set<EventTarget>();
    const readerScroller = root.querySelector<HTMLElement>('.al-quran-page');
    const shellScroller = root.closest<HTMLElement>('.qrs-page');
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
    const root = this.host.nativeElement as HTMLElement;
    const readerScroller = root.querySelector<HTMLElement>('.al-quran-page');
    const shellScroller = root.closest<HTMLElement>('.qrs-page');

    this.checkSentinelPositions();
    if (readerScroller) this.checkElementScrollPosition(readerScroller);
    if (shellScroller && shellScroller !== readerScroller) this.checkElementScrollPosition(shellScroller);
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
    if (!doc) return;

    const viewportHeight = globalThis.window?.innerHeight ?? doc.clientHeight;
    if (doc.scrollHeight <= viewportHeight + 1) return;

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

  private clampPage(value: number): number {
    if (!Number.isFinite(value)) return FIRST_PAGE;
    return Math.max(FIRST_PAGE, Math.min(LAST_PAGE, Math.trunc(value)));
  }

  private clampSurah(value: number): number {
    if (!Number.isFinite(value)) return FIRST_PAGE;
    return Math.max(1, Math.min(114, Math.trunc(value)));
  }

  private errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
  }
}
