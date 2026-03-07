import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { QuranBrowseJuz, QuranBrowseSurah } from '../../shared/models/quran-reader.model';
import { QuranReaderService } from '../../shared/services/quran-reader.service';

type BrowseTab = 'surahs' | 'juz';

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
  selector: 'app-quran-browse-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-browse.page.html',
  styleUrl: './quran-browse.page.scss',
})
export class QuranBrowsePage implements OnInit {
  private readonly quranReader = inject(QuranReaderService);
  private readonly router = inject(Router);

  activeTab: BrowseTab = 'surahs';
  surahs: QuranBrowseSurah[] = [];
  juzs: QuranBrowseJuz[] = [];
  recentPages: QuranRecentPage[] = [];
  totalPages = 0;
  loading = false;
  error = '';

  async ngOnInit() {
    this.recentPages = this.readRecentPages();
    await this.loadMenu();
  }

  get hasRecentPages(): boolean {
    return this.recentPages.length > 0;
  }

  async loadMenu() {
    this.loading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(this.quranReader.getMenu());
      this.surahs = response.surahs ?? [];
      this.juzs = response.juzs ?? [];
      this.totalPages = response.stats?.total_pages ?? 0;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unable to load Quran menu.';
    } finally {
      this.loading = false;
    }
  }

  onTabChange(event: CustomEvent) {
    const nextValue = String((event.detail as { value?: string | null } | null)?.value ?? 'surahs');
    const nextTab = nextValue === 'juz' ? 'juz' : 'surahs';
    this.activeTab = nextTab;
  }

  openFirstPage() {
    void this.router.navigate(['/quran/page', 1]);
  }

  openSurah(surah: QuranBrowseSurah) {
    if (surah.start_page == null) return;
    void this.router.navigate(['/quran/page', surah.start_page]);
  }

  openJuz(juz: QuranBrowseJuz) {
    if (juz.start_page == null) return;
    void this.router.navigate(['/quran/page', juz.start_page]);
  }

  openRecentPage(entry: QuranRecentPage) {
    void this.router.navigate(['/quran/page', entry.page]);
  }

  getRevelationLabel(place: string | null): string {
    if (place === 'makkah') return 'Makki';
    if (place === 'madinah') return 'Madani';
    return 'Revelation not tagged';
  }

  formatRecentTime(iso: string): string {
    const timestamp = Date.parse(iso);
    if (!Number.isFinite(timestamp)) return 'Recently opened';

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  }

  trackBySurah(_: number, surah: QuranBrowseSurah): number {
    return surah.surah;
  }

  trackByJuz(_: number, juz: QuranBrowseJuz): number {
    return juz.juz;
  }

  trackByRecent(_: number, entry: QuranRecentPage): number {
    return entry.page;
  }

  private readRecentPages(): QuranRecentPage[] {
    try {
      const raw = localStorage.getItem(QURAN_RECENT_PAGES_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((entry) => ({
          page: typeof entry?.page === 'number' ? entry.page : NaN,
          surah: typeof entry?.surah === 'number' ? entry.surah : null,
          name_en: typeof entry?.name_en === 'string' ? entry.name_en : null,
          name_ar: typeof entry?.name_ar === 'string' ? entry.name_ar : null,
          juz: typeof entry?.juz === 'number' ? entry.juz : null,
          seen_at: typeof entry?.seen_at === 'string' ? entry.seen_at : '',
        }))
        .filter((entry) => Number.isFinite(entry.page))
        .slice(0, 6);
    } catch {
      return [];
    }
  }
}
