import { HttpClient } from '@angular/common/http';
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

  async list(lessonId: number | string) {
    return firstValueFrom(
      this.http.get<ApiResponse>(`${this.baseUrl}?lesson_id=${lessonId}`)
    );
  }
}
