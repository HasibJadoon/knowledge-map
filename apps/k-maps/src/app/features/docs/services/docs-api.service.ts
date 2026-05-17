// ─── DocsApiService — CM document adapter ─────────────────────────────────────
// The single integration point between the desktop document editor and the
// km-content (CM) backend. The editor speaks Tiptap JSON; CM stores structured
// `cm_blocks` rows. This service:
//   • targets the CM gateway routes (/api/cm/documents)
//   • decomposes / recomposes Tiptap content via block-mapper
//   • unwraps the CM `{ ok, data, meta }` response envelope
//   • maps app concepts with no CM column (domain, parent doc, …) onto meta_json

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CmDocumentRow,
  CreateDocInput,
  DocDetail,
  DocMeta,
  DocSummaryItem,
  MetaPatchInput,
  UpdateDocInput,
} from '../../../shared/models/document-editor.models';
import { blocksToTiptap, tiptapToBlocks } from './block-mapper';

interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  ok: boolean;
  data: T[];
  meta?: { has_more?: boolean };
}

@Injectable({ providedIn: 'root' })
export class DocsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/cm/documents`;

  // ── Reads ───────────────────────────────────────────────────────────────────

  /**
   * Load a document with its blocks recomposed into Tiptap content.
   * The id (CM:ULID) is path-safe and passed verbatim — encoding the colon
   * would break the worker's `/cm/documents/:id` route match.
   */
  getDoc(id: string): Observable<DocDetail> {
    return this.http
      .get<ApiEnvelope<CmDocumentRow>>(`${this.base}/${id}?include=blocks`)
      .pipe(map((res) => this.toDetail(res.data)));
  }

  /** List every document (CM has no domain column — the sidebar groups them). */
  listAll(): Observable<DocSummaryItem[]> {
    return this.fetchPage(1).pipe(map((rows) => rows.map((row) => this.toSummary(row))));
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  createDoc(input: CreateDocInput): Observable<{ id: string; title: string }> {
    const body = {
      title: (input.title || 'Untitled').trim() || 'Untitled',
      doc_type: input.doc_type || 'note',
      meta_json: JSON.stringify(this.buildMeta(input)),
    };
    return this.http
      .post<ApiEnvelope<CmDocumentRow>>(this.base, body)
      .pipe(map((res) => ({ id: res.data.doc_id, title: res.data.title })));
  }

  /** Patch title / word count and (when content is given) replace all blocks. */
  updateDoc(id: string, patch: UpdateDocInput): Observable<void> {
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body['title'] = patch.title;
    if (patch.word_count !== undefined) body['word_count'] = patch.word_count;
    if (patch.content !== undefined) body['blocks'] = tiptapToBlocks(patch.content);
    return this.http
      .patch<ApiEnvelope<unknown>>(`${this.base}/${id}`, body)
      .pipe(map(() => undefined));
  }

  /**
   * Patch document metadata. `doc_type` is a real column; `domain` and
   * `target_audience` live in meta_json, so the current meta is read first and
   * merged to avoid clobbering sibling fields (parent_doc_id, surah, …).
   */
  patchMeta(id: string, patch: MetaPatchInput): Observable<void> {
    return this.http.get<ApiEnvelope<CmDocumentRow>>(`${this.base}/${id}`).pipe(
      switchMap((res) => {
        const meta = this.parseMeta(res.data.meta_json);
        if (patch.domain !== undefined) meta.domain = patch.domain;
        if (patch.target_audience !== undefined) meta.target_audience = patch.target_audience;
        const body: Record<string, unknown> = { meta_json: JSON.stringify(meta) };
        if (patch.doc_type !== undefined) body['doc_type'] = patch.doc_type;
        return this.http.patch<ApiEnvelope<unknown>>(`${this.base}/${id}`, body);
      }),
      map(() => undefined),
    );
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private fetchPage(page: number): Observable<CmDocumentRow[]> {
    const url = `${this.base}?publication_state=all&per_page=100&page=${page}`;
    return this.http.get<PaginatedEnvelope<CmDocumentRow>>(url).pipe(
      switchMap((res) => {
        const rows = res.data ?? [];
        return res.meta?.has_more
          ? this.fetchPage(page + 1).pipe(map((rest) => [...rows, ...rest]))
          : of(rows);
      }),
    );
  }

  private buildMeta(input: CreateDocInput): DocMeta {
    return {
      domain: input.domain || 'general',
      parent_doc_id: input.parent_doc_id ?? null,
      surah: input.surah ?? null,
      ayah_from: input.ayah_from ?? null,
      ayah_to: input.ayah_to ?? null,
      source_id: input.source_id ?? null,
      unit_id: input.unit_id ?? null,
      workspace_id: input.workspace_id ?? null,
      sort_order: 0,
    };
  }

  private parseMeta(raw: string | null | undefined): DocMeta {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as DocMeta) : {};
    } catch {
      return {};
    }
  }

  private toDetail(row: CmDocumentRow): DocDetail {
    const meta = this.parseMeta(row.meta_json);
    return {
      id: row.doc_id,
      title: row.title ?? '',
      doc_type: row.doc_type ?? 'note',
      domain: meta.domain || 'general',
      status: row.publication_state ?? 'draft',
      word_count: row.word_count ?? 0,
      content: blocksToTiptap(row.blocks ?? []),
      meta,
      updated_at: row.updated_at ?? '',
    };
  }

  private toSummary(row: CmDocumentRow): DocSummaryItem {
    const meta = this.parseMeta(row.meta_json);
    return {
      id: row.doc_id,
      title: row.title ?? '',
      doc_type: row.doc_type ?? 'note',
      domain: meta.domain || 'general',
      status: row.publication_state ?? 'draft',
      word_count: row.word_count ?? 0,
      updated_at: row.updated_at ?? '',
      parent_doc_id: meta.parent_doc_id ?? null,
      sort_order: meta.sort_order ?? 0,
    };
  }
}
