import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranBrowseJuz, QuranBrowseSurah } from '../../../../shared/models/quran-reader.model';

@Component({
  selector: 'app-quran-juz-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-juz-tab.component.html',
  styleUrl: './quran-juz-tab.component.scss',
})
export class QuranJuzTabComponent {
  @Input() juzs: QuranBrowseJuz[] = [];

  @Output() juzSelected = new EventEmitter<QuranBrowseJuz>();
  @Output() surahSelected = new EventEmitter<QuranBrowseSurah>();

  getRevelationLabel(place: string | null): string {
    if (place === 'makkah') return 'Makki';
    if (place === 'madinah') return 'Madani';
    return 'Revelation not tagged';
  }

  trackByJuz(_: number, juz: QuranBrowseJuz): number {
    return juz.juz;
  }

  trackBySurah(_: number, surah: QuranBrowseSurah): number {
    return surah.surah;
  }
}
