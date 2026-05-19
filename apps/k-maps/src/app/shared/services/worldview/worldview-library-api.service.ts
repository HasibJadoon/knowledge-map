import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BackendApiResponse } from '../backend-api.service';

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

/**
 * Unit detail as consumed by the reader. The worker currently returns a plain
 * `WvUnitRow`; the optional rich fields are kept so the reader keeps compiling
 * if/when the endpoint is enriched with document/reading content.
 */
export interface WvUnitDetailRow extends WvUnitRow {
  locatorLabel?: string | null;
  readingMinutes?: number | null;
  readingSchema?: string | null;
  readingBody?: unknown;
  readingBlocks?: unknown;
  documentId?: string | null;
  documentTitle?: string | null;
  documentSummary?: string | null;
  documentJson?: unknown;
  documentText?: string | null;
  documentBlocks?: unknown;
  children?: unknown[];
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
  getUnit(id: string): Observable<WvUnitDetailRow> {
    return this.http
      .get<BackendApiResponse<WvUnitDetailRow>>(`${this.base}/worldview/units/${id}`)
      .pipe(map((res) => res?.data));
  }

  /** Highlights, notes and worldview-graph material for a unit. */
  getUnitAnnotations(id: string): Observable<WvAnnotationsBundle> {
    return this.http
      .get<BackendApiResponse<WvAnnotationsBundle>>(`${this.base}/worldview/units/${id}/annotations`)
      .pipe(map((res) => res?.data));
  }
}
