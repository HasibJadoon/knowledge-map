import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { resolveApiRoot } from '../../sprint/services/api-root.util';

export interface PodcastUser {
  id: number;
  email?: string | null;
  login?: string | null;
  username?: string | null;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class PodcastUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  list(): Observable<PodcastUser[]> {
    return this.http.get<{ ok: boolean; users: PodcastUser[] }>(`${this.apiRoot}/users`).pipe(
      map((response) => response.users ?? [])
    );
  }
}
