import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { QrPageLayoutAyah, QrPagePayload, QrPageWord } from '../../../shared/models/quran/qr.models';
import { QuranApiService } from '../../../shared/services/quran/quran-api.service';
import { QuranStateService } from '../../../shared/services/quran/quran-state.service';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

const FIRST_PAGE = 1;
const LAST_PAGE = 604;
const PAGE_BATCH_SIZE = 4;
const MUSHAF_LAYOUT = 'qpc-v2-15-lines';

@Component({
  selector: 'km-al-quran',
  standalone: true,
  imports: [HomePlaneButtonComponent],
  templateUrl: './al-quran.component.html',
  styleUrl: './al-quran.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlQuranComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly qrApi = inject(QuranApiService);
  private readonly loadedPageFonts = new Set<number>();
  readonly quranState = inject(QuranStateService);

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
    const el = event.target as HTMLElement;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 900) void this.loadNextPages();
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
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load previous pages'));
    } finally {
      this.loadingMore.set(false);
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
    } catch (err) {
      this.error.set(this.errorMessage(err, 'Failed to load more pages'));
    } finally {
      this.loadingMore.set(false);
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
