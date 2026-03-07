import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { QuranMenuResponse } from '../models/quran-reader.model';

@Injectable({ providedIn: 'root' })
export class QuranReaderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/quran`;

  getMenu() {
    return this.http.get<QuranMenuResponse>(`${this.baseUrl}/menu`);
  }
}
