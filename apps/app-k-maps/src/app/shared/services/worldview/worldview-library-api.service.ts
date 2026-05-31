import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BackendApiResponse } from '../core/backend-api.service';

// ─── Worldview Library API ────────────────────────────────────────────────────
// Typed gateway for the worldview source catalogue + reader.
// Every worldview worker endpoint returns the unified `{ ok, data }` envelope;
// these methods unwrap `data` so callers never touch the envelope directly.
//
//   GET /worldview/sources                  — source catalogue
//   GET /worldview/sources/:id               — source row + its units
//   GET /worldview/units/:id                 — single unit row
//   GET /worldview/units/:id/annotations     — highlights / notes / worldview graph

/** A worldview source row as stored in `wv_sources`. */
export interface WvSourceRow {
  id: string;
  slug: string | null;
  title: string;
  title_ar: string | null;
  source_type: string | null;
  source_domain: string | null;
  tradition_id: string | null;
  language: string | null;
  published_year: number | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  description_md: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** A worldview unit row as stored in `wv_source_units`. */
export interface WvUnitRow {
  id: string;
  source_id: string;
  parent_id: string | null;
  unit_type: string | null;
  title: string | null;
  unit_index: number | null;
  page_start: number | null;
  page_end: number | null;
  text_excerpt: string | null;
  description_md: string | null;
  created_at: string | null;
}

/** A source together with its full unit list (`GET /worldview/sources/:id`). */
export interface WvSourceWithUnits extends WvSourceRow {
  units: WvUnitRow[];
}

/** Reader annotations bundle (`GET /worldview/units/:id/annotations`). */
export interface WvAnnotationsBundle {
  unit_id: string;
  annotations: unknown[];
  highlights: unknown[];
  notes: unknown[];
  wv: unknown[];
  wv_node_edges: unknown[];
  wv_evidence_links: unknown[];
}

/** A reading-session row as stored in `wv_reading_sessions`. */
export interface WvReadingSession {
  id: string;
  source_id: string;
  source_unit_id: string | null;
  title: string | null;
  session_type: string;
  status: 'active' | 'paused' | 'completed' | string;
  focus_mode: string | null;
  started_at: string;
  ended_at: string | null;
  last_position: string | null;
  duration_secs: number | null;
  summary_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields accepted when starting a reading session. */
export interface WvReadingSessionCreate {
  source_id: string;
  source_unit_id?: string | null;
  title?: string | null;
  focus_mode?: string | null;
  last_position?: string | null;
}

/** Fields accepted when updating a reading session (id required). */
export interface WvReadingSessionPatch {
  id: string;
  source_unit_id?: string | null;
  status?: 'active' | 'paused' | 'completed';
  focus_mode?: string | null;
  last_position?: string | null;
  ended_at?: string | null;
  summary_md?: string | null;
}

/**
 * A per-source-unit visual illustration (`wv_source_unit_illustrations`). Each
 * illustration is a complete, self-contained HTML document stored verbatim in
 * `html_content`; a unit can own 1..N of them, ordered by `order_index`.
 */
export interface WvIllustration {
  id: string;
  source_unit_id: string;
  source_id: string | null;
  slug: string | null;
  order_index: number;
  title: string | null;
  caption: string | null;
  theme: string;               // dark | paper
  html_content: string;        // full standalone HTML document
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

/** List rows omit the (potentially large) html_content blob. */
export type WvIllustrationSummary = Omit<WvIllustration, 'html_content'>;

/** Fields accepted when creating an illustration. */
export interface WvIllustrationCreate {
  source_unit_id: string;
  html_content: string;
  source_id?: string | null;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  meta_json?: string | null;
}

/** Fields accepted when updating an illustration (id required). */
export interface WvIllustrationPatch {
  id: string;
  html_content?: string;
  slug?: string | null;
  order_index?: number | null;
  title?: string | null;
  caption?: string | null;
  theme?: string;
  meta_json?: string | null;
}

@Injectable({ providedIn: 'root' })
export class WorldviewLibraryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase.replace(/\/+$/, '');

  /** The full worldview source catalogue. */
  listSources(limit = 100): Observable<WvSourceRow[]> {
    return this.http
      .get<BackendApiResponse<WvSourceRow[]>>(`${this.base}/worldview/sources`, {
        params: { limit },
      })
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  /** A single source with its complete unit tree. */
  getSource(id: string): Observable<WvSourceWithUnits> {
    return this.http
      .get<BackendApiResponse<WvSourceWithUnits>>(`${this.base}/worldview/sources/${id}`)
      .pipe(map((res) => ({ ...res?.data, units: res?.data?.units ?? [] }) as WvSourceWithUnits));
  }

  /** A single unit row. */
  getUnit(id: string): Observable<WvUnitRow> {
    return this.http
      .get<BackendApiResponse<WvUnitRow>>(`${this.base}/worldview/units/${id}`)
      .pipe(map((res) => res?.data));
  }

  /** Highlights, notes and worldview-graph material for a unit. */
  getUnitAnnotations(id: string): Observable<WvAnnotationsBundle> {
    return this.http
      .get<BackendApiResponse<WvAnnotationsBundle>>(`${this.base}/worldview/units/${id}/annotations`)
      .pipe(map((res) => res?.data));
  }

  // ── Reading sessions ────────────────────────────────────────────────────────

  /** The current active reading session for a source, or null. */
  getActiveSession(sourceId: string): Observable<WvReadingSession | null> {
    return this.http
      .get<BackendApiResponse<WvReadingSession | null>>(
        `${this.base}/worldview/reading-sessions/active`,
        { params: { source_id: sourceId } },
      )
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  /** All reading sessions for a source, newest first. */
  listSessions(sourceId: string): Observable<WvReadingSession[]> {
    return this.http
      .get<BackendApiResponse<WvReadingSession[]>>(`${this.base}/worldview/reading-sessions`, {
        params: { source_id: sourceId, limit: 50 },
      })
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  /** Start a new reading session. */
  createSession(input: WvReadingSessionCreate): Observable<WvReadingSession> {
    return this.http
      .post<BackendApiResponse<WvReadingSession>>(`${this.base}/worldview/reading-session`, input)
      .pipe(map((res) => res?.data));
  }

  /** Update a reading session (pause / complete / move position). */
  updateSession(input: WvReadingSessionPatch): Observable<WvReadingSession | null> {
    return this.http
      .put<BackendApiResponse<WvReadingSession>>(`${this.base}/worldview/reading-session`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  // ── Source-unit illustrations ─────────────────────────────────────────────────

  /** All illustrations attached to a single source unit, in display order. */
  listUnitIllustrations(unitId: string): Observable<WvIllustrationSummary[]> {
    return this.http
      .get<BackendApiResponse<WvIllustrationSummary[]>>(
        `${this.base}/worldview/units/${unitId}/illustrations`,
      )
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  /** All illustrations across a whole source. */
  listSourceIllustrations(sourceId: string): Observable<WvIllustrationSummary[]> {
    return this.http
      .get<BackendApiResponse<WvIllustrationSummary[]>>(
        `${this.base}/worldview/sources/${sourceId}/illustrations`,
      )
      .pipe(map((res) => (res?.ok ? res.data ?? [] : [])));
  }

  /** A single illustration including its full html_content. */
  getIllustration(id: string): Observable<WvIllustration | null> {
    return this.http
      .get<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustrations/${id}`)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  /** Absolute URL of the rendered HTML page — use as an <iframe> src. */
  illustrationPageUrl(id: string): string {
    return `${this.base}/worldview/illustrations/${id}/page`;
  }

  /** Create a new illustration on a source unit. */
  createIllustration(input: WvIllustrationCreate): Observable<WvIllustration | null> {
    return this.http
      .post<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustration`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  /** Update an existing illustration (body.id required). */
  updateIllustration(input: WvIllustrationPatch): Observable<WvIllustration | null> {
    return this.http
      .put<BackendApiResponse<WvIllustration>>(`${this.base}/worldview/illustration`, input)
      .pipe(map((res) => (res?.ok ? res.data ?? null : null)));
  }

  /** Delete an illustration. */
  deleteIllustration(id: string): Observable<boolean> {
    return this.http
      .delete<BackendApiResponse<{ deleted: boolean }>>(
        `${this.base}/worldview/illustration/${id}`,
      )
      .pipe(map((res) => !!res?.ok));
  }
}
