import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import { QuranSurah } from '../../../../../shared/models/arabic/quran-data.model';

@Component({
  selector: 'app-quran-text',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quran-text.component.html',
  styleUrls: ['./quran-text.component.scss'],
})
export class QuranTextComponent implements OnInit {
  private readonly dataService = inject(QuranDataService);
  private readonly router = inject(Router);

  readonly tabs = [
    { id: 'surah', label: 'Surah' },
    { id: 'juz', label: 'Juz' }
  ];
  activeTab = 'surah';

  q = '';
  sort = 'asc';

  surahs: QuranSurah[] = [];
  filteredSurahs: QuranSurah[] = [];

  loadingSurahs = false;
  error = '';

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

  openSurah(surah: QuranSurah) {
    this.router.navigate(['/arabic/quran/data/text', surah.surah]);
  }

  trackBySurah = (_: number, surah: QuranSurah) => surah.surah;
}
