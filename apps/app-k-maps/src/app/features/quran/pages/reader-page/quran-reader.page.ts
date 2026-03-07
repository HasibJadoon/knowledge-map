import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import {
  QuranLayoutLine,
  QuranReaderPageData,
  QuranReaderSurah,
} from '../../../../shared/models/quran-reader.model';
import { QuranReaderService } from '../../../../shared/services/quran-reader.service';

@Component({
  selector: 'app-quran-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-reader.page.html',
  styleUrl: './quran-reader.page.scss',
})
export class QuranReaderPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quranReader = inject(QuranReaderService);

  surah: QuranReaderSurah | null = null;
  pages: QuranReaderPageData[] = [];
  totalPages = 0;
  loading = false;
  error = '';

  async ngOnInit() {
    const surah = Number.parseInt(String(this.route.snapshot.paramMap.get('surah') ?? ''), 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) {
      this.error = 'Invalid surah.';
      return;
    }

    await this.loadReader(surah);
  }

  get surahMeta(): string {
    if (!this.surah) return '';

    const parts: string[] = [];
    const revelation = this.surah.meta.revelation_place;

    if (revelation === 'makkah') parts.push('Makki');
    else if (revelation === 'madinah') parts.push('Madani');

    if (this.surah.ayah_count != null) {
      parts.push(`${this.surah.ayah_count} ayahs`);
    }

    if (this.surah.start_page != null) {
      const pageRange = this.surah.end_page != null && this.surah.end_page !== this.surah.start_page
        ? `${this.surah.start_page}-${this.surah.end_page}`
        : `${this.surah.start_page}`;
      parts.push(`Pages ${pageRange}`);
    }

    return parts.join(' · ');
  }

  get headerTitle(): string {
    if (!this.surah) return 'Quran Reader';
    return this.surah.meta.name_simple || this.surah.name_en || `Surah ${this.surah.surah}`;
  }

  trackByPage(_: number, pageData: QuranReaderPageData): number {
    return pageData.page.number;
  }

  trackByLine(_: number, line: QuranLayoutLine): number {
    return line.line_number;
  }

  private async loadReader(surah: number) {
    this.loading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(this.quranReader.getSurahPages(surah));
      this.surah = response.surah;
      this.pages = response.pages ?? [];
      this.totalPages = response.stats?.total_pages ?? 0;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unable to load surah reader.';
    } finally {
      this.loading = false;
    }
  }
}
