import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppHeaderbarComponent } from '../../../../../shared/components';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import { QuranAyah, QuranSurah } from '../../../../../shared/models/arabic/quran-data.model';
import { QuranDataSubmenuComponent } from '../shared/quran-data-submenu.component';

@Component({
  selector: 'app-quran-text',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent, QuranDataSubmenuComponent],
  templateUrl: './quran-text.component.html',
  styleUrls: ['./quran-text.component.scss'],
})
export class QuranTextComponent implements OnInit {
  private readonly dataService = inject(QuranDataService);

  readonly tabs = [
    { id: 'surah', label: 'Surah' },
    { id: 'juz', label: 'Juz' },
    { id: 'revelation', label: 'Revelation Order' },
  ];
  activeTab = 'surah';

  q = '';
  sort = 'asc';

  readonly bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  readonly bismillahTranslation = 'In the Name of Allah—the Most Compassionate, Most Merciful';

  surahs: QuranSurah[] = [];
  filteredSurahs: QuranSurah[] = [];
  selectedSurah: QuranSurah | null = null;
  ayahs: QuranAyah[] = [];

  loadingSurahs = false;
  loadingAyahs = false;
  error = '';
  ayahError = '';

  async ngOnInit() {
    await this.loadSurahs();
  }

  async loadSurahs() {
    this.loadingSurahs = true;
    this.error = '';
    try {
      const response = await this.dataService.listSurahs();
      this.surahs = response.results ?? [];
      this.applyFilters();
    } catch (err: any) {
      console.error('quran surah list error', err);
      this.error = err?.message ?? 'Unable to load surahs.';
    } finally {
      this.loadingSurahs = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();
    let list = [...this.surahs];

    if (term) {
      list = list.filter((surah) => {
        const en = (surah.name_en ?? '').toLowerCase();
        const ar = surah.name_ar ?? '';
        return (
          en.includes(term) ||
          ar.includes(this.q.trim()) ||
          String(surah.surah).includes(term)
        );
      });
    }

    list.sort((a, b) => (this.sort === 'desc' ? b.surah - a.surah : a.surah - b.surah));

    this.filteredSurahs = list;
  }

  onHeaderSearchInput(value: string) {
    this.q = value;
    this.applyFilters();
  }

  setTab(tabId: string) {
    this.activeTab = tabId;
  }

  async selectSurah(surah: QuranSurah) {
    if (this.selectedSurah?.surah === surah.surah) return;
    this.selectedSurah = surah;
    await this.loadAyahs(surah.surah);
  }

  async loadAyahs(surah: number) {
    this.loadingAyahs = true;
    this.ayahError = '';
    this.ayahs = [];
    try {
      const response = await this.dataService.listAyahs({ surah, pageSize: 400 });
      this.ayahs = response.results ?? [];
    } catch (err: any) {
      console.error('quran ayah load error', err);
      this.ayahError = err?.message ?? 'Unable to load ayahs.';
    } finally {
      this.loadingAyahs = false;
    }
  }

  get shouldShowBismillah() {
    return !!this.selectedSurah && this.selectedSurah.surah !== 9;
  }

  trackBySurah = (_: number, surah: QuranSurah) => surah.surah;
  trackByAyah = (_: number, ayah: QuranAyah) => `${ayah.surah}:${ayah.ayah}`;
}
