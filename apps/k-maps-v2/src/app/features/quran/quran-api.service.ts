import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SurahListResponse } from './quran.models';

@Injectable({ providedIn: 'root' })
export class QuranApiService {
  private readonly http = inject(HttpClient);

  getSurahs(): Observable<SurahListResponse> {
    return this.http.get<SurahListResponse>(`${environment.apiBase}/quran/surahs`);
  }
}
