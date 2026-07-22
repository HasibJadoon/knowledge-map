// ─── ControlApiService — km-core control-system adapter ───────────────────────
// Single integration point for the control dashboard. Targets the CORE gateway
// aggregate route (/api/core/dashboard) and unwraps the { ok, data } envelope.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ControlSnapshot } from './control.models';

interface Envelope<T> { ok: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class ControlApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /** Full control-system snapshot: subsystems, health, flags, live feed. */
  getSnapshot(): Observable<ControlSnapshot> {
    return this.http
      .get<Envelope<ControlSnapshot>>(`${this.base}/core/dashboard`)
      .pipe(map((res) => res.data));
  }
}
