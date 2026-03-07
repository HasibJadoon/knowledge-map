import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { bookOutline, languageOutline } from 'ionicons/icons';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  QuranBrowseSurah,
  QuranPageLayoutLine,
  QuranPageMeta,
  QuranPageVerse,
} from '../../../../shared/models/quran-reader.model';
import { QuranReaderService } from '../../../../shared/services/quran-reader.service';
import { AppIconTabsComponent, IconTabItem } from '../../../../shared/components/icon-tabs/icon-tabs.component';

interface QuranReaderSurahGroup {
  surah: QuranBrowseSurah | null;
  verses: QuranPageVerse[];
}

type QuranReaderTextMode = 'diacritic' | 'plain';
type QuranReaderTab = 'reading' | 'translation';

interface QuranRecentPage {
  page: number;
  surah: number | null;
  name_en: string | null;
  name_ar: string | null;
  juz: number | null;
  seen_at: string;
}

const QURAN_RECENT_PAGES_KEY = 'quran_recent_pages';
const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const BISMILLAH_DIACRITIC = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const BISMILLAH_PLAIN = 'بسم الله الرحمن الرحيم';

@Component({
  selector: 'app-quran-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule, AppIconTabsComponent],
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
  readonly readerTabs: IconTabItem[] = [
    { key: 'reading', label: 'Reading', icon: bookOutline },
    { key: 'translation', label: 'Translation', icon: languageOutline },
  ];

  pageData: QuranPageMeta | null = null;
  surahs: QuranBrowseSurah[] = [];
  surahGroups: QuranReaderSurahGroup[] = [];
  pageLayoutLines: QuranPageLayoutLine[] = [];
  activeTab: QuranReaderTab = 'reading';
  textMode: QuranReaderTextMode = 'diacritic';
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
          this.pageLayoutLines = [];
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
    if (this.surahs.length === 1) {
      const surah = this.surahs[0]!;
      return surah.meta.name_simple || surah.name_en || `Surah ${surah.surah}`;
    }

    if (this.surahs.length > 1) {
      return this.readerHeading;
    }

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
    const juzLabel = this.formatJuzLabel(this.pageData.juzs);

    return `${refRange} - ${juzLabel}`;
  }

  get pageNumberLabel(): string {
    return this.pageData ? String(this.pageData.number) : '';
  }

  async loadPage(page: number) {
    this.loading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(this.quranReader.getPage(page));
      this.pageData = response.page;
      this.surahs = response.surahs ?? [];
      this.surahGroups = this.buildSurahGroups(response.verses ?? [], this.surahs);
      this.pageLayoutLines = response.layout_lines ?? [];
      this.persistRecentPage();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unable to load Quran page.';
      this.pageData = null;
      this.surahs = [];
      this.surahGroups = [];
      this.pageLayoutLines = [];
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

  setTextMode(value: string | null | undefined) {
    if (value !== 'diacritic' && value !== 'plain') return;
    this.textMode = value;
  }

  onTextModeChange(event: CustomEvent<{ value?: unknown }>) {
    const value = typeof event.detail.value === 'string' ? event.detail.value : null;
    this.setTextMode(value);
  }

  setActiveTab(tab: QuranReaderTab) {
    this.activeTab = tab;
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

  getGroupJuzLabel(group: QuranReaderSurahGroup): string {
    const juzs = Array.from(
      new Set(group.verses.map((verse) => verse.juz).filter((value): value is number => value != null))
    ).sort((a, b) => a - b);
    return this.formatJuzLabel(juzs.length ? juzs : this.pageData?.juzs ?? []);
  }

  getGroupSurahName(group: QuranReaderSurahGroup): string {
    if (group.surah != null) {
      return group.surah.meta.name_simple || group.surah.name_en || `Surah ${group.surah.surah}`;
    }

    const verse = group.verses[0];
    return verse ? `Surah ${verse.surah}` : 'Surah';
  }

  getGroupSurahArabicName(group: QuranReaderSurahGroup): string {
    return group.surah?.name_ar ?? '';
  }

  isSurahStart(group: QuranReaderSurahGroup): boolean {
    return group.verses[0]?.ayah === 1;
  }

  shouldShowSurahHeader(group: QuranReaderSurahGroup): boolean {
    return this.isSurahStart(group) && Boolean(group.surah?.name_ar);
  }

  getOpeningBismillahText(group: QuranReaderSurahGroup): string {
    if (!this.isSurahStart(group)) return '';
    if (this.hasBismillahAsFirstVerse(group)) {
      return this.getVerseDisplayText(group.verses[0]!);
    }
    if (!group.surah?.meta.bismillah_pre) return '';
    return this.textMode === 'plain' ? BISMILLAH_PLAIN : BISMILLAH_DIACRITIC;
  }

  getOpeningBismillahMarker(group: QuranReaderSurahGroup): string {
    if (!this.hasBismillahAsFirstVerse(group)) return '';
    return this.formatVerseMarker(group.verses[0]!);
  }

  getReadingVerses(group: QuranReaderSurahGroup): QuranPageVerse[] {
    return this.hasBismillahAsFirstVerse(group) ? group.verses.slice(1) : group.verses;
  }

  getVerseDisplayText(verse: QuranPageVerse): string {
    if (this.textMode === 'plain') {
      return (verse.text_simple ?? this.stripArabicDiacritics(verse.text)).trim();
    }

    return (verse.text ?? '').trim();
  }

  getLayoutLineDisplayText(line: QuranPageLayoutLine): string {
    if (this.textMode === 'plain') {
      return (line.text_simple ?? this.stripArabicDiacritics(line.text)).trim();
    }

    return (line.text ?? '').trim();
  }

  hasGroupTranslations(group: QuranReaderSurahGroup): boolean {
    return group.verses.some((verse) => Boolean(verse.translation));
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

  trackByLayoutLine(_: number, line: QuranPageLayoutLine): string {
    return `${line.line_number}:${line.line_type}`;
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
      localStorage.setItem(QURAN_RECENT_PAGES_KEY, JSON.stringify(filtered.slice(0, 3)));
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

  private stripArabicDiacritics(value: string): string {
    return value.replace(ARABIC_DIACRITICS_RE, '');
  }

  private hasBismillahAsFirstVerse(group: QuranReaderSurahGroup): boolean {
    if (!this.isSurahStart(group)) return false;
    const firstVerse = group.verses[0];
    if (!firstVerse) return false;
    return this.normalizeArabic(firstVerse.text) === this.normalizeArabic(BISMILLAH_DIACRITIC);
  }

  private normalizeArabic(value: string): string {
    return this.stripArabicDiacritics(value).replace(/\s+/g, ' ').trim();
  }

  private formatJuzLabel(juzs: number[]): string {
    if (!juzs.length) return 'Juz not tagged';
    if (juzs.length === 1) return `Juz' ${juzs[0]}`;
    return `Juz' ${juzs[0]}-${juzs[juzs.length - 1]}`;
  }
}
