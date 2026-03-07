import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { documentTextOutline } from 'ionicons/icons';
import { QuranBrowseSurah } from '../../../../shared/models/quran-reader.model';

@Component({
  selector: 'app-quran-surah-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './quran-surah-tab.component.html',
  styleUrl: './quran-surah-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranSurahTabComponent {
  private readonly router = inject(Router);

  @Input() surahs: QuranBrowseSurah[] = [];
  readonly documentTextOutline = documentTextOutline;

  getRevelationLabel(place: string | null): string {
    if (place === 'makkah') return 'Makki';
    if (place === 'madinah') return 'Madani';
    return 'Revelation not tagged';
  }

  trackBySurah(_: number, surah: QuranBrowseSurah): number {
    return surah.surah;
  }

  buildSurahLink(surah: QuranBrowseSurah): string[] {
    if (surah.start_page != null) {
      return ['/quran', 'page', String(surah.start_page)];
    }

    return ['/quran', 'surah', String(surah.surah)];
  }

  openSurahNotes(event: Event, surah: QuranBrowseSurah): void {
    event.preventDefault();
    event.stopPropagation();

    void this.router.navigate(['/quran', 'surah', String(surah.surah), 'notes']);
  }
}
