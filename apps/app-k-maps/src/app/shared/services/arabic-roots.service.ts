import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ArabicRoot = {
  id: number;
  root: string;
  family?: string;
  status?: string;
  frequency?: string;
};

type ApiResponse = {
  ok?: boolean;
  results?: ArabicRoot[];
  error?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ArabicRootsService {
  private readonly baseUrl = `${environment.apiBase}/lexicon_roots`;
  private readonly tokenKey = 'auth_token';

  constructor(private readonly http: HttpClient) {}

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
