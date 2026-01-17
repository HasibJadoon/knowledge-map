import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
  private readonly baseUrl = `${environment.apiBase}/grammar_notes`;
  private readonly tokenKey = 'auth_token';

  constructor(private readonly http: HttpClient) {}

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
