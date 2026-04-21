import { Injectable, inject, signal } from '@angular/core';
import { QuranApiService } from './quran-api.service';
import { QuranSurahListItemDto } from '../../models/quran/quran.models';
import { mapQrMenuSurahToListItem } from './quran-api.mapper';

@Injectable({ providedIn: 'root' })
export class QuranStateService {
  private readonly qrApi = inject(QuranApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly surahs = signal<QuranSurahListItemDto[]>([]);

  load(): void {
    if (this.surahs().length > 0) return;
    this.loading.set(true);
    this.error.set(null);
    this.qrApi.getMenu().subscribe({
      next: (res) => {
        this.surahs.set(res.data.surahs.map(mapQrMenuSurahToListItem));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load surahs');
        this.loading.set(false);
      },
    });
  }
}
