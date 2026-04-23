import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { resolveApiRoot } from './api-root.util';

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  log(payload: {
    event_type: string;
    target_type?: string;
    target_id?: string;
    ref?: string;
    note?: string;
    event_json?: Record<string, unknown>;
  }): Observable<boolean> {
    return this.http.post<{ ok: boolean }>(`${this.apiRoot}/activity/log`, payload).pipe(
      map((response) => Boolean(response.ok))
    );
  }
}
