import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  QrApiResponse,
  QrAyah,
  QrMenuPayload,
  QrPagePayload,
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

  getPage(page: number): Observable<QrApiResponse<QrPagePayload>> {
    return this.api.getResponse<QrPagePayload>('qr', ['pages', page]);
  }

  getMushafPage(page: number, layout = 'qpc-v2-15-lines'): Observable<QrApiResponse<QrPagePayload>> {
    const params = new HttpParams().set('layout', layout);
    return this.api.getResponse<QrPagePayload>('qr', ['mushaf', 'pages', page], { params });
  }

  getSurahPassages(surah: number): Observable<QrApiResponse<QrPassage[]>> {
    const params = new HttpParams().set('surah', String(surah));
    return this.api.getResponse<QrPassage[]>('qr', ['passages'], { params });
  }

  /** Ayah list — GET /qr/ayahs?surah=X[&from=F&to=T][&words=1] */
  getSurahAyahs(surah: number, opts: { from?: number; to?: number; words?: boolean } = {}): Observable<QrAyah[]> {
    let params = new HttpParams().set('surah', String(surah));
    if (opts.from  !== undefined) params = params.set('from',  String(opts.from));
    if (opts.to    !== undefined) params = params.set('to',    String(opts.to));
    if (opts.words)               params = params.set('words', '1');
    return this.api.getData<QrAyah[]>('qr', ['ayahs'], { params });
  }
}
