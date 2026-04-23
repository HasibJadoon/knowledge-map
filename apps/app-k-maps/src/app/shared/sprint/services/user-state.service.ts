import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { UserFocusState } from '../models/sprint.models';
import { resolveApiRoot } from './api-root.util';

@Injectable({ providedIn: 'root' })
export class UserStateService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  getState(): Observable<UserFocusState> {
    return this.http.get<{ ok: boolean; state: UserFocusState }>(`${this.apiRoot}/user_state`).pipe(
      map((response) => response.state)
    );
  }

  updateState(payload: {
    current_type?: string | null;
    current_id?: string | null;
    current_unit_id?: string | null;
    focus_mode?: UserFocusState['focus_mode'];
    state_json?: Record<string, unknown> | null;
  }): Observable<UserFocusState> {
    return this.http.put<{ ok: boolean; state: UserFocusState }>(`${this.apiRoot}/user_state`, payload).pipe(
      map((response) => response.state)
    );
  }
}
