import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranBrowseJuz, QuranBrowseSurah } from '../../../../shared/models/quran-reader.model';

@Component({
  selector: 'app-quran-juz-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './quran-juz-tab.component.html',
  styleUrl: './quran-juz-tab.component.scss',
})
export class QuranJuzTabComponent {
  @Input() juzs: QuranBrowseJuz[] = [];

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
