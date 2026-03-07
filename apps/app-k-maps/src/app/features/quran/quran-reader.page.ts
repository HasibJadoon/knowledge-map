import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom, Subscription } from 'rxjs';
import { QuranBrowseSurah, QuranPageMeta, QuranPageVerse } from '../../shared/models/quran-reader.model';
import { QuranReaderService } from '../../shared/services/quran-reader.service';

interface QuranReaderSurahGroup {
  surah: QuranBrowseSurah | null;
  verses: QuranPageVerse[];
}

interface QuranRecentPage {
  page: number;
  surah: number | null;
  name_en: string | null;
  name_ar: string | null;
  juz: number | null;
  seen_at: string;
}

const QURAN_RECENT_PAGES_KEY = 'quran_recent_pages';

@Component({
  selector: 'app-quran-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-reader.page.html',
  styleUrl: './quran-reader.page.scss',
})
export class QuranReaderPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quranReader = inject(QuranReaderService);
  private readonly subscriptions = new Subscription();
  private readonly arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private touchStartTime = 0;

  pageData: QuranPageMeta | null = null;
  surahs: QuranBrowseSurah[] = [];
  surahGroups: QuranReaderSurahGroup[] = [];
  loading = false;
  error = '';

  ngOnInit() {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const pageParam = Number.parseInt(String(params.get('page') ?? ''), 10);
        if (!Number.isFinite(pageParam) || pageParam < 1) {
          this.error = 'Invalid Quran page.';
          this.pageData = null;
          this.surahs = [];
          this.surahGroups = [];
          return;
        }

        void this.loadPage(pageParam);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get pageTitle(): string {
    if (this.pageData == null) return 'Quran';
    return `Page ${this.pageData.number}`;
  }

  get readerHeading(): string {
    if (!this.surahs.length) return 'Quran Reader';
    if (this.surahs.length === 1) {
      const surah = this.surahs[0]!;
      return surah.meta.name_simple || surah.name_en || `Surah ${surah.surah}`;
    }

    const first = this.surahs[0]!;
    const last = this.surahs[this.surahs.length - 1]!;
    const firstLabel = first.meta.name_simple || first.name_en || `Surah ${first.surah}`;
    const lastLabel = last.meta.name_simple || last.name_en || `Surah ${last.surah}`;
    return `${firstLabel} -> ${lastLabel}`;
  }

  get pageContext(): string {
    if (this.pageData == null) return '';

    const refRange = `${this.pageData.start_ref} - ${this.pageData.end_ref}`;
    const juzLabel = this.pageData.juzs.length
      ? this.pageData.juzs.length === 1
        ? `Juz' ${this.pageData.juzs[0]}`
        : `Juz' ${this.pageData.juzs[0]}-${this.pageData.juzs[this.pageData.juzs.length - 1]}`
      : 'Juz not tagged';

    return `${refRange} - ${juzLabel}`;
  }

  async loadPage(page: number) {
    this.loading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(this.quranReader.getPage(page));
      this.pageData = response.page;
      this.surahs = response.surahs ?? [];
      this.surahGroups = this.buildSurahGroups(response.verses ?? [], this.surahs);
      this.persistRecentPage();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unable to load Quran page.';
      this.pageData = null;
      this.surahs = [];
      this.surahGroups = [];
    } finally {
      this.loading = false;
    }
  }

  goToPage(page: number | null) {
    if (page == null || this.pageData?.number === page) return;
    void this.router.navigate(['/quran/page', page]);
  }

  openBrowse() {
    void this.router.navigate(['/quran']);
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
  }

  onTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches?.[0];
    if (!touch || this.touchStartX == null || this.touchStartY == null) {
      this.resetTouch();
      return;
    }

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const elapsed = Date.now() - this.touchStartTime;

    this.resetTouch();

    if (elapsed > 800) return;
    if (Math.abs(deltaX) < 70) return;
    if (Math.abs(deltaY) > 56) return;

    if (deltaX < 0) {
      this.goToPage(this.pageData?.next_page ?? null);
      return;
    }

    this.goToPage(this.pageData?.prev_page ?? null);
  }

  resetTouch() {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = 0;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.goToPage(this.pageData?.next_page ?? null);
      return;
    }

    if (event.key === 'ArrowRight') {
      this.goToPage(this.pageData?.prev_page ?? null);
    }
  }

  getRevelationLabel(place: string | null): string {
    if (place === 'makkah') return 'Makki';
    if (place === 'madinah') return 'Madani';
    return 'Revelation not tagged';
  }

  formatVerseText(verse: QuranPageVerse): string {
    const words = verse.words
      .map((word) => word.text ?? word.simple ?? '')
      .filter((token) => token.trim().length > 0);

    return words.length ? words.join(' ') : verse.text;
  }

  formatVerseMarker(verse: QuranPageVerse): string {
    const marker = (verse.verse_full ?? verse.verse_mark ?? '').trim();
    return marker || this.toArabicDigits(verse.ayah);
  }

  trackByGroup(_: number, group: QuranReaderSurahGroup): number {
    return group.surah?.surah ?? group.verses[0]?.surah ?? 0;
  }

  trackByVerse(_: number, verse: QuranPageVerse): string {
    return verse.verse_key;
  }

  private buildSurahGroups(verses: QuranPageVerse[], surahs: QuranBrowseSurah[]): QuranReaderSurahGroup[] {
    const surahMap = new Map<number, QuranBrowseSurah>(surahs.map((surah) => [surah.surah, surah]));
    const groups: QuranReaderSurahGroup[] = [];

    for (const verse of verses) {
      const currentGroup = groups[groups.length - 1];
      if (currentGroup && currentGroup.surah?.surah === verse.surah) {
        currentGroup.verses.push(verse);
        continue;
      }

      groups.push({
        surah: surahMap.get(verse.surah) ?? null,
        verses: [verse],
      });
    }

    return groups;
  }

  private persistRecentPage() {
    if (this.pageData == null) return;

    const primarySurah = this.surahs[0] ?? null;
    const nextEntry: QuranRecentPage = {
      page: this.pageData.number,
      surah: primarySurah?.surah ?? null,
      name_en: primarySurah?.meta.name_simple || primarySurah?.name_en || null,
      name_ar: primarySurah?.name_ar ?? null,
      juz: this.pageData.juzs[0] ?? null,
      seen_at: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(QURAN_RECENT_PAGES_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(current) ? current : [];
      const filtered = list.filter((entry) => typeof entry?.page !== 'number' || entry.page !== nextEntry.page);
      filtered.unshift(nextEntry);
      localStorage.setItem(QURAN_RECENT_PAGES_KEY, JSON.stringify(filtered.slice(0, 6)));
    } catch {
      localStorage.setItem(QURAN_RECENT_PAGES_KEY, JSON.stringify([nextEntry]));
    }
  }

  private toArabicDigits(value: number): string {
    return String(value)
      .split('')
      .map((digit) => this.arabicDigits[Number(digit)] ?? digit)
      .join('');
  }
}
