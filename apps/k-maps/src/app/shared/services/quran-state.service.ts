import { Injectable, inject, signal } from '@angular/core';
import { QrApiService } from './qr-api.service';
import { QuranSurahListItemDto } from '../models/quran.models';
import { qrMenuSurahToListItem } from './qr-api.mapper';

@Injectable({ providedIn: 'root' })
export class QuranStateService {
  private readonly qrApi = inject(QrApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly surahs = signal<QuranSurahListItemDto[]>([]);

  load(): void {
    if (this.surahs().length > 0) return;
    this.loading.set(true);
    this.error.set(null);
    this.qrApi.getMenu().subscribe({
      next: (res) => {
        this.surahs.set(res.data.surahs.map(qrMenuSurahToListItem));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load surahs');
        this.loading.set(false);
      },
    });
  }
}
