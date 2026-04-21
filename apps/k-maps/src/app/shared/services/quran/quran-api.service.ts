import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  QrApiResponse,
  QrMenuPayload,
  QrPassage,
  QrReaderPayload,
} from '../../models/quran/qr.models';
import { BackendApiService } from '../backend-api.service';

@Injectable({ providedIn: 'root' })
export class QuranApiService {
  private readonly api = inject(BackendApiService);

  getMenu(): Observable<QrApiResponse<QrMenuPayload>> {
    return this.api.getResponse<QrMenuPayload>('qr', ['menu']);
  }

  getSurahReader(surah: number, pageSize = 400): Observable<QrApiResponse<QrReaderPayload>> {
    const params = new HttpParams()
      .set('page', '1')
      .set('limit', String(pageSize));
    return this.api.getResponse<QrReaderPayload>('qr', ['surahs', surah, 'reader'], { params });
  }

  getSurahPassages(surah: number): Observable<QrApiResponse<QrPassage[]>> {
    const params = new HttpParams().set('surah', String(surah));
    return this.api.getResponse<QrPassage[]>('qr', ['passages'], { params });
  }
}
