import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ArLesson = {
  id: number;
  title?: string;
  status?: string;
  lesson_type?: string;
  subtype?: string;
  source?: string;
  lesson_json?: any;
};

type ApiResponse = {
  ok?: boolean;
  result?: ArLesson;
  results?: ArLesson[];
  error?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ArLessonsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/lessons`;
  private readonly tokenKey = 'auth_token';

  list(params: Record<string, string> = {}) {
    const httpParams = new HttpParams({ fromObject: params });
    return this.http.get<ApiResponse>(this.baseUrl, {
      params: httpParams,
      headers: this.buildHeaders(),
    });
  }

  async get(id: number | string) {
    return firstValueFrom(
      this.http.get<ApiResponse>(`${this.baseUrl}/${id}`, {
        headers: this.buildHeaders(),
      })
    );
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
