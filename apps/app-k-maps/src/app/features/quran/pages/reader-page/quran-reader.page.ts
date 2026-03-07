import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { sparklesOutline, textOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import type Swiper from 'swiper';
import type { SwiperContainer } from 'swiper/element';
import { register } from 'swiper/element/bundle';

import { QURAN_TOTAL_PAGES } from '../../../../shared/models/quran-reader.model';
import { QuranPageRendererComponent } from '../../components/quran-page-renderer/quran-page-renderer.component';
import { QuranReaderPageViewModel } from '../../models/quran-reader-view.model';
import { QuranReaderPageService } from '../../services/quran-reader-page.service';

register();

type ReaderEdge = 'previous' | 'next';

@Component({
  selector: 'app-quran-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QuranPageRendererComponent],
  templateUrl: './quran-reader.page.html',
  styleUrl: './quran-reader.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class QuranReaderPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly readerPageService = inject(QuranReaderPageService);
  private readonly swiperSlideChangeHandler = (event: Event) =>
    this.onSwiperSlideChange(event as CustomEvent<[Swiper]>);

  private swiperElement: SwiperContainer | null = null;
  private suppressSlideChange = false;
  private activeLoadToken = 0;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly currentPage = signal<QuranReaderPageViewModel | null>(null);
  readonly previousPage = signal<QuranReaderPageViewModel | null>(null);
  readonly nextPage = signal<QuranReaderPageViewModel | null>(null);
  readonly pendingNavigationPage = signal<number | null>(null);
  readonly showDiacritics = signal(false);
  readonly initialPlaceholderLines = Array.from({ length: 8 }, (_, index) => index);
  readonly neighbouringPlaceholderLines = Array.from({ length: 9 }, (_, index) => index);

  readonly bannerError = computed(() => this.currentPage() ? this.error() : '');
  readonly toolbarPageLabel = computed(() => {
    const pageNumber = this.pendingNavigationPage() ?? this.currentPage()?.meta.pageNumber ?? null;
    return pageNumber == null ? '' : `P. ${pageNumber}`;
  });
  readonly toolbarTitle = computed(() => this.currentPage()?.header.title || 'Qur\'an');
  readonly textModeIcon = computed(() => this.showDiacritics() ? sparklesOutline : textOutline);
  readonly textModeLabel = computed(() =>
    this.showDiacritics() ? 'Show text without diacritics' : 'Show text with diacritics'
  );

  @ViewChild('swiperElement')
  set swiperElementRef(value: ElementRef<SwiperContainer> | undefined) {
    this.attachSwiper(value?.nativeElement ?? null);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.swiperElement) {
        this.swiperElement.removeEventListener('swiperslidechange', this.swiperSlideChangeHandler);
      }
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      void this.handleRouteChange(paramMap);
    });
  }

  async retryCurrentRoute(): Promise<void> {
    await this.handleRouteChange(this.route.snapshot.paramMap);
  }

  async openBrowse(): Promise<void> {
    await this.router.navigate(['/quran']);
  }

  toggleTextMode(): void {
    this.showDiacritics.update((value) => !value);
  }

  private async handleRouteChange(paramMap: ParamMap): Promise<void> {
    const pageParam = paramMap.get('page');
    if (pageParam != null) {
      const pageNumber = this.parsePageNumber(pageParam, QURAN_TOTAL_PAGES);
      if (pageNumber == null) {
        this.showRouteError(`Page numbers must be between 1 and ${QURAN_TOTAL_PAGES}.`);
        return;
      }

      await this.loadPage(pageNumber);
      return;
    }

    const surahParam = paramMap.get('surah');
    if (surahParam != null) {
      const surahNumber = this.parsePageNumber(surahParam, 114);
      if (surahNumber == null) {
        this.showRouteError('Surah numbers must be between 1 and 114.');
        return;
      }

      await this.redirectToSurahStartPage(surahNumber);
      return;
    }

    this.showRouteError('The requested Qur’an reader route is not valid.');
  }

  private async redirectToSurahStartPage(surahNumber: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.pendingNavigationPage.set(null);
    this.updateSwiperInteractivity();

    try {
      const startPage = await firstValueFrom(this.readerPageService.resolveSurahStartPage(surahNumber));
      if (startPage == null) {
        this.showRouteError(`Surah ${surahNumber} does not have a start page yet.`);
        return;
      }

      const navigated = await this.router.navigate(['/quran', 'page', startPage], { replaceUrl: true });
      if (!navigated) {
        this.showRouteError('Unable to open the selected surah.');
      }
    } catch (error: unknown) {
      this.showRouteError(this.readErrorMessage(error, 'Unable to resolve the selected surah.'));
    }
  }

  private async loadPage(pageNumber: number): Promise<void> {
    const loadToken = ++this.activeLoadToken;
    this.loading.set(true);
    this.error.set('');
    this.pendingNavigationPage.set(null);
    this.updateSwiperInteractivity();

    try {
      const page = await firstValueFrom(this.readerPageService.getPage(pageNumber));
      if (loadToken !== this.activeLoadToken) {
        return;
      }

      this.previousPage.set(null);
      this.nextPage.set(null);
      this.currentPage.set(page);
      this.loading.set(false);
      this.readerPageService.preloadAdjacentPages(pageNumber);
      this.syncSwiperPosition(false);

      void this.loadWindowPage(page.meta.prevPage, 'previous', loadToken);
      void this.loadWindowPage(page.meta.nextPage, 'next', loadToken);
    } catch (error: unknown) {
      if (loadToken !== this.activeLoadToken) {
        return;
      }

      this.loading.set(false);
      this.error.set(this.readErrorMessage(error, 'Unable to load the selected page.'));
      if (!this.currentPage()) {
        this.previousPage.set(null);
        this.nextPage.set(null);
      }
      this.syncSwiperPosition(false);
    }
  }

  private async loadWindowPage(
    pageNumber: number | null,
    edge: ReaderEdge,
    loadToken: number
  ): Promise<void> {
    this.setWindowPage(edge, null);
    if (pageNumber == null) {
      this.syncSwiperPosition(false);
      return;
    }

    try {
      const page = await firstValueFrom(this.readerPageService.getPage(pageNumber));
      if (loadToken !== this.activeLoadToken) {
        return;
      }

      this.setWindowPage(edge, page);
    } catch {
      if (loadToken !== this.activeLoadToken) {
        return;
      }

      this.setWindowPage(edge, null);
    } finally {
      if (loadToken === this.activeLoadToken) {
        this.syncSwiperPosition(false);
      }
    }
  }

  private setWindowPage(edge: ReaderEdge, page: QuranReaderPageViewModel | null): void {
    if (edge === 'previous') {
      this.previousPage.set(page);
      return;
    }

    this.nextPage.set(page);
  }

  private attachSwiper(element: SwiperContainer | null): void {
    if (this.swiperElement === element) {
      return;
    }

    if (this.swiperElement) {
      this.swiperElement.removeEventListener('swiperslidechange', this.swiperSlideChangeHandler);
    }

    this.swiperElement = element;
    if (!element) {
      return;
    }

    Object.assign(element, {
      init: false,
      direction: 'horizontal',
      slidesPerView: 1,
      initialSlide: 1,
      speed: 240,
      threshold: 10,
      spaceBetween: 14,
      resistanceRatio: 0.72,
      allowTouchMove: false,
      allowSlidePrev: false,
      allowSlideNext: false,
      eventsPrefix: 'swiper',
    });

    element.addEventListener('swiperslidechange', this.swiperSlideChangeHandler);
    if (!element.swiper) {
      element.initialize();
    }

    this.syncSwiperPosition(false);
  }

  private onSwiperSlideChange(event: CustomEvent<[Swiper]>): void {
    if (this.suppressSlideChange || this.pendingNavigationPage() != null) {
      return;
    }

    const swiper = event.detail[0];
    const page = this.currentPage();
    if (!swiper || !page) {
      return;
    }

    if (swiper.activeIndex === 0 && page.meta.prevPage != null) {
      void this.navigateToPage(page.meta.prevPage);
      return;
    }

    if (swiper.activeIndex === 2 && page.meta.nextPage != null) {
      void this.navigateToPage(page.meta.nextPage);
      return;
    }

    if (swiper.activeIndex !== 1) {
      this.syncSwiperPosition(false);
    }
  }

  private async navigateToPage(pageNumber: number): Promise<void> {
    const currentPage = this.currentPage();
    if (!currentPage || currentPage.meta.pageNumber === pageNumber || this.pendingNavigationPage() === pageNumber) {
      return;
    }

    this.pendingNavigationPage.set(pageNumber);
    this.updateSwiperInteractivity();

    const navigated = await this.router.navigate(['/quran', 'page', pageNumber], { replaceUrl: true });
    if (!navigated) {
      this.pendingNavigationPage.set(null);
      this.error.set('Unable to open the selected page.');
      this.syncSwiperPosition(false);
    }
  }

  private syncSwiperPosition(animate: boolean): void {
    const page = this.currentPage();
    const swiper = this.swiperElement?.swiper;
    if (!page || !swiper || !this.swiperElement) {
      return;
    }

    this.suppressSlideChange = true;
    this.updateSwiperInteractivity();
    swiper.update();
    swiper.slideTo(1, animate ? 240 : 0, false);

    requestAnimationFrame(() => {
      this.suppressSlideChange = false;
    });
  }

  private updateSwiperInteractivity(): void {
    const page = this.currentPage();
    const swiperElement = this.swiperElement;
    if (!swiperElement) {
      return;
    }

    const allowTouchMove = page != null && this.pendingNavigationPage() == null;
    const allowSlidePrev = page?.meta.prevPage != null;
    const allowSlideNext = page?.meta.nextPage != null;

    swiperElement.allowTouchMove = allowTouchMove;
    swiperElement.allowSlidePrev = allowSlidePrev;
    swiperElement.allowSlideNext = allowSlideNext;

    const swiper = swiperElement.swiper;
    if (!swiper) {
      return;
    }

    swiper.allowTouchMove = allowTouchMove;
    swiper.allowSlidePrev = allowSlidePrev;
    swiper.allowSlideNext = allowSlideNext;
  }

  private showRouteError(message: string): void {
    this.activeLoadToken += 1;
    this.loading.set(false);
    this.error.set(message);
    this.pendingNavigationPage.set(null);
    this.currentPage.set(null);
    this.previousPage.set(null);
    this.nextPage.set(null);
    this.updateSwiperInteractivity();
  }

  private parsePageNumber(rawValue: string, maxValue: number): number | null {
    const value = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(value) || value < 1 || value > maxValue) {
      return null;
    }

    return value;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallback;
  }
}
