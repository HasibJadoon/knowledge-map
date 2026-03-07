import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranBrowseSurah } from '../../../../shared/models/quran-reader.model';

@Component({
  selector: 'app-quran-surah-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-surah-tab.component.html',
  styleUrl: './quran-surah-tab.component.scss',
})
export class QuranSurahTabComponent {
  @Input() surahs: QuranBrowseSurah[] = [];

  @Output() surahSelected = new EventEmitter<QuranBrowseSurah>();

  getRevelationLabel(place: string | null): string {
    if (place === 'makkah') return 'Makki';
    if (place === 'madinah') return 'Madani';
    return 'Revelation not tagged';
  }

  trackBySurah(_: number, surah: QuranBrowseSurah): number {
    return surah.surah;
  }
}
