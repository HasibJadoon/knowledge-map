import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ArabicRoot = {
  id: string;
  root: string;
  meta?: Record<string, unknown> | null;
  status?: string;
  frequency?: string;
  cards?: string | unknown[];
  root_latn?: string;
  root_norm?: string;
  search_keys_norm?: string;
  alt_latn_json?: string[] | null;
  romanization_sources_json?: Record<string, unknown> | null;
};

type ApiResponse = {
  ok?: boolean;
  results?: ArabicRoot[];
  error?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ArabicRootsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/lexicon_roots`;
  private readonly tokenKey = 'auth_token';

  list(params: Record<string, string> = {}) {
    const httpParams = new HttpParams({ fromObject: params });
    return this.http.get<ApiResponse>(this.baseUrl, {
      params: httpParams,
      headers: this.buildHeaders(),
    });
  }

  private buildHeaders() {
    const token = localStorage.getItem(this.tokenKey);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }
}
