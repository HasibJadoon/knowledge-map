import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QrApiResponse,
  QrMenuPayload,
  QrPassage,
  QrReaderPayload,
} from '../models/qr.models';

@Injectable({ providedIn: 'root' })
export class QrApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  getMenu(): Observable<QrApiResponse<QrMenuPayload>> {
    return this.http.get<QrApiResponse<QrMenuPayload>>(`${this.base}/qr/menu`);
  }

  getSurahReader(surah: number, pageSize = 400): Observable<QrApiResponse<QrReaderPayload>> {
    const params = new HttpParams()
      .set('page', '1')
      .set('limit', String(pageSize));
    return this.http.get<QrApiResponse<QrReaderPayload>>(
      `${this.base}/qr/surahs/${encodeURIComponent(String(surah))}/reader`,
      { params },
    );
  }

  getSurahPassages(surah: number): Observable<QrApiResponse<QrPassage[]>> {
    const params = new HttpParams().set('surah', String(surah));
    return this.http.get<QrApiResponse<QrPassage[]>>(`${this.base}/qr/passages`, { params });
  }
}
