import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type ApiResponse = {
  ok?: boolean;
  results?: any[];
  error?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class GrammarNotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/grammar_notes`;
  private readonly tokenKey = 'auth_token';

  async list(lessonId: number | string) {
    return firstValueFrom(
      this.http.get<ApiResponse>(`${this.baseUrl}?lesson_id=${lessonId}`, {
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
