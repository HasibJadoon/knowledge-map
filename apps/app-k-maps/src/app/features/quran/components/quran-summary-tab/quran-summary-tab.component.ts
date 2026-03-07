import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranRecentPageEntry } from '../../../../shared/models/quran-reader.model';

@Component({
  selector: 'app-quran-summary-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-summary-tab.component.html',
  styleUrl: './quran-summary-tab.component.scss',
})
export class QuranSummaryTabComponent {
  @Input() totalPages = 0;
  @Input() totalSurahs = 0;
  @Input() totalJuzs = 0;
  @Input() recentPages: QuranRecentPageEntry[] = [];

  @Output() firstPageRequested = new EventEmitter<void>();
  @Output() recentPageSelected = new EventEmitter<QuranRecentPageEntry>();

  get hasRecentPages(): boolean {
    return this.recentPages.length > 0;
  }

  formatRecentTime(value: string): string {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return 'Recently opened';

    const diffMs = Date.now() - timestamp;
    if (diffMs <= 0) return 'Just now';

    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.round(diffMs / minute));
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.round(diffMs / hour));
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.round(diffMs / day));
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  trackByRecent(_: number, entry: QuranRecentPageEntry): number {
    return entry.page;
  }
}
