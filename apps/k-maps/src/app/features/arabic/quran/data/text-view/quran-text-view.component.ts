import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppHeaderbarComponent } from '../../../../../shared/components';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import { QuranAyah, QuranSurah } from '../../../../../shared/models/arabic/quran-data.model';

type QuranAyahWithPage = QuranAyah & { page?: number | null };

@Component({
  selector: 'app-quran-text-view',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent],
  templateUrl: './quran-text-view.component.html',
  styleUrls: ['./quran-text-view.component.scss'],
})
export class QuranTextViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(QuranDataService);
  private readonly subs = new Subscription();

  readonly bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  readonly bismillahTranslation = 'In the Name of Allah—the Most Compassionate, Most Merciful';

  surahId: number | null = null;
  surah: QuranSurah | null = null;
  ayahs: QuranAyahWithPage[] = [];
  viewMode: 'verse' | 'reading' = 'verse';

  loadingSurah = false;
  loadingAyahs = false;
  error = '';

  ngOnInit() {
    this.subs.add(
      this.route.paramMap.subscribe((params) => {
        const raw = params.get('surah');
        const id = Number.parseInt(String(raw ?? ''), 10);
        if (!Number.isFinite(id) || id < 1 || id > 114) {
          this.error = 'Invalid surah id.';
          this.surah = null;
          this.ayahs = [];
          return;
        }
        this.surahId = id;
        void this.loadSurah(id);
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async loadSurah(id: number) {
    this.loadingSurah = true;
    this.error = '';
    try {
      const response = await this.dataService.listSurahs();
      const match = (response.results ?? []).find((row) => row.surah === id) || null;
      if (!match) {
        this.error = 'Surah not found.';
        this.surah = null;
        this.ayahs = [];
        return;
      }
      this.surah = match;
      await this.loadAyahs(id);
    } catch (err: any) {
      console.error('surah load error', err);
      this.error = err?.message ?? 'Unable to load surah.';
    } finally {
      this.loadingSurah = false;
    }
  }

  async loadAyahs(surah: number) {
    this.loadingAyahs = true;
    this.ayahs = [];
    try {
      const response = await this.dataService.listAyahs({ surah, pageSize: 400 });
      this.ayahs = response.results ?? [];
    } catch (err: any) {
      console.error('ayah load error', err);
      this.error = err?.message ?? 'Unable to load ayahs.';
    } finally {
      this.loadingAyahs = false;
    }
  }

  get shouldShowBismillah() {
    return !!this.surah && this.surah.surah !== 9;
  }

  get headerTitle() {
    if (!this.surah) return 'Quran Text';
    const englishName = this.surah.name_en || `Surah ${this.surah.surah}`;
    return `${this.surah.surah}. ${englishName}`;
  }

  setViewMode(mode: 'verse' | 'reading') {
    this.viewMode = mode;
  }

  goBack() {
    this.router.navigate(['/arabic/quran/data/text']);
  }

  trackByAyah = (_: number, ayah: QuranAyahWithPage) => `${ayah.surah}:${ayah.ayah}`;

  showPageDivider(index: number) {
    if (index <= 0) return false;
    const currentPage = this.ayahs[index]?.page ?? null;
    const previousPage = this.ayahs[index - 1]?.page ?? null;
    if (!currentPage) return false;
    return currentPage !== previousPage;
  }

  getAyahMark(ayah: QuranAyahWithPage) {
    return ayah.verse_mark || `(${ayah.ayah})`;
  }
}
