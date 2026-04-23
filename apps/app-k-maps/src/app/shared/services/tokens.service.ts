import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenListResponse } from '../models/token.model';

@Injectable({ providedIn: 'root' })
export class TokensService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/tokens`;

  list(filters: { q?: string; pos?: string; page?: number; pageSize?: number }) {
    let params = new HttpParams();
    if (filters.q) {
      params = params.set('q', filters.q);
    }
    if (filters.pos) {
      params = params.set('pos', filters.pos);
    }
    if (filters.page) {
      params = params.set('page', String(filters.page));
    }
    if (filters.pageSize) {
      params = params.set('pageSize', String(filters.pageSize));
    }

    return this.http.get<TokenListResponse>(this.baseUrl, {
      params,
    });
  }
}
