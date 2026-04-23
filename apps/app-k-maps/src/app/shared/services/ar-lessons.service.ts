import { HttpClient, HttpParams } from '@angular/common/http';
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

  list(params: Record<string, string> = {}) {
    const httpParams = new HttpParams({ fromObject: params });
    return this.http.get<ApiResponse>(this.baseUrl, {
      params: httpParams,
    });
  }

  async get(id: number | string) {
    return firstValueFrom(
      this.http.get<ApiResponse>(`${this.baseUrl}/${id}`)
    );
  }
}
