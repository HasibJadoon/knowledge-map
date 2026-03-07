import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { bookOutline, documentTextOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  QuranBrowseJuz,
  QuranBrowseSurah,
  QuranRecentPageEntry,
} from '../../../../shared/models/quran-reader.model';
import { AppIconTabsComponent, IconTabItem } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import { QuranReaderService } from '../../../../shared/services/quran-reader.service';
import { QuranJuzTabComponent } from '../../components/quran-juz-tab/quran-juz-tab.component';
import { QuranSummaryTabComponent } from '../../components/quran-summary-tab/quran-summary-tab.component';
import { QuranSurahTabComponent } from '../../components/quran-surah-tab/quran-surah-tab.component';

type BrowseTab = 'surahs' | 'juz';
type MainTab = 'list' | 'summary';

const QURAN_RECENT_PAGES_KEY = 'quran_recent_pages';

@Component({
  selector: 'app-quran-browse-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QuranSummaryTabComponent, QuranSurahTabComponent, QuranJuzTabComponent, AppIconTabsComponent],
  templateUrl: './quran-browse.page.html',
  styleUrl: './quran-browse.page.scss',
})
export class QuranBrowsePage implements OnInit {
  private readonly quranReader = inject(QuranReaderService);
  private readonly router = inject(Router);

  mainTab: MainTab = 'list';
  activeTab: BrowseTab = 'surahs';
  surahs: QuranBrowseSurah[] = [];
  juzs: QuranBrowseJuz[] = [];
  recentPages: QuranRecentPageEntry[] = [];
  readonly browseTabs: IconTabItem[] = [
    { key: 'list', label: 'List', icon: bookOutline },
    { key: 'summary', label: 'Summary', icon: documentTextOutline },
  ];
  totalPages = 0;
  loading = false;
  error = '';

  async ngOnInit() {
    this.recentPages = this.readRecentPages();
    await this.loadMenu();
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

  onMainTabSelected(tabKey: string) {
    this.mainTab = tabKey === 'summary' ? 'summary' : 'list';
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

  openRecentPage(entry: QuranRecentPageEntry) {
    void this.router.navigate(['/quran/page', entry.page]);
  }

  private readRecentPages(): QuranRecentPageEntry[] {
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
        .slice(0, 3);
    } catch {
      return [];
    }
  }
}
