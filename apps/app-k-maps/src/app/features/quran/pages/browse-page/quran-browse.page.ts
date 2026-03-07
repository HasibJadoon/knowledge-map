import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { bookOutline, documentTextOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  QuranBrowseJuz,
  QuranBrowseSurah,
} from '../../../../shared/models/quran-reader.model';
import { AppIconTabsComponent, IconTabItem } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import { QuranReaderService } from '../../../../shared/services/quran-reader.service';
import { QuranJuzTabComponent } from '../../components/quran-juz-tab/quran-juz-tab.component';
import { QuranSummaryTabComponent } from '../../components/quran-summary-tab/quran-summary-tab.component';
import { QuranSurahTabComponent } from '../../components/quran-surah-tab/quran-surah-tab.component';

type BrowseTab = 'surahs' | 'juz';
type MainTab = 'list' | 'summary';

@Component({
  selector: 'app-quran-browse-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QuranSummaryTabComponent, QuranSurahTabComponent, QuranJuzTabComponent, AppIconTabsComponent],
  templateUrl: './quran-browse.page.html',
  styleUrl: './quran-browse.page.scss',
})
export class QuranBrowsePage implements OnInit {
  private readonly quranReader = inject(QuranReaderService);

  mainTab: MainTab = 'list';
  activeTab: BrowseTab = 'surahs';
  surahs: QuranBrowseSurah[] = [];
  juzs: QuranBrowseJuz[] = [];
  readonly browseTabs: IconTabItem[] = [
    { key: 'list', label: 'List', icon: bookOutline },
    { key: 'summary', label: 'Summary', icon: documentTextOutline },
  ];
  totalPages = 0;
  loading = false;
  error = '';

  async ngOnInit() {
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
}
