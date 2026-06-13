// ─── DocsApiService — CM document adapter ─────────────────────────────────────
// The single integration point between the mobile document editor and the
// km-content (CM) backend. The editor speaks Tiptap JSON; CM stores structured
// `cm_blocks` rows. This service:
//   • targets the CM gateway routes (/api/cm/documents)
//   • decomposes / recomposes Tiptap content via block-mapper
//   • unwraps the CM `{ ok, data, meta }` response envelope
//   • maps app concepts with no CM column (domain, parent doc, …) onto meta_json
//
// Ownership (core_user_ref) is resolved server-side from the authenticated
// gateway header, so this client never sends an identity.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CmDocumentRow,
  CreateDocInput,
  DocMeta,
  DocumentDetail,
  DocumentSearchResult,
  DocumentSummary,
  UpdateDocInput,
} from '../../models/content/document.model';
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

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.82;

@Injectable({ providedIn: 'root' })
export class DocsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/cm/documents`;

  /** Cached full document list; invalidated on any create/update. */
  private cachedRows: CmDocumentRow[] | null = null;

  // ── Reads ───────────────────────────────────────────────────────────────────

  /**
   * Load a document with its blocks recomposed into Tiptap content.
   * The id (CM:ULID) is path-safe and passed verbatim — encoding the colon
   * would break the worker's `/cm/documents/:id` route match.
   */
  getDoc(id: string): Observable<DocumentDetail> {
    return this.http
      .get<ApiEnvelope<CmDocumentRow>>(`${this.base}/${id}?include=blocks`)
      .pipe(map((res) => this.toDetail(res.data)));
  }

  /** List a domain's documents (CM has no domain column — filtered from meta). */
  listDocs(domain: string): Observable<DocumentSummary[]> {
    return this.fetchAll().pipe(
      map((rows) => rows.map((row) => this.toSummary(row)).filter((doc) => doc.domain === domain)),
    );
  }

  searchDocs(query: string): Observable<DocumentSearchResult[]> {
    const url = `${this.base}/search?q=${encodeURIComponent(query)}&per_page=50`;
    return this.http
      .get<PaginatedEnvelope<CmDocumentRow>>(url)
      .pipe(map((res) => (res.data ?? []).map((row) => this.toSearchResult(row))));
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  createDoc(input: CreateDocInput): Observable<{ id: string; title: string }> {
    const body = {
      title: (input.title || 'Untitled').trim() || 'Untitled',
      doc_type: input.doc_type || 'note',
      meta_json: JSON.stringify(this.buildMeta(input)),
    };
    return this.http.post<ApiEnvelope<CmDocumentRow>>(this.base, body).pipe(
      tap(() => this.invalidate()),
      map((res) => ({ id: res.data.doc_id, title: res.data.title })),
    );
  }

  /** Patch title / word count and (when content is given) replace all blocks. */
  updateDoc(id: string, patch: UpdateDocInput): Observable<void> {
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body['title'] = patch.title;
    if (patch.word_count !== undefined) body['word_count'] = patch.word_count;
    if (patch.content !== undefined) body['blocks'] = tiptapToBlocks(patch.content);
    return this.http
      .patch<ApiEnvelope<unknown>>(`${this.base}/${id}`, body)
      .pipe(
        tap(() => this.invalidate()),
        map(() => undefined),
      );
  }

  /**
   * Prepare an image for insertion. Images are downscaled and embedded as a
   * data URL so they round-trip through the block mapper without external
   * object storage.
   */
  async uploadImage(file: File): Promise<string> {
    return resizeImageToDataUrl(file, MAX_IMAGE_DIMENSION, IMAGE_QUALITY);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private fetchAll(): Observable<CmDocumentRow[]> {
    if (this.cachedRows) return of(this.cachedRows);
    return this.fetchPage(1).pipe(tap((rows) => (this.cachedRows = rows)));
  }

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

  private invalidate(): void {
    this.cachedRows = null;
  }

  private buildMeta(input: CreateDocInput): DocMeta {
    return {
      domain: input.domain || 'general',
      topic_key: input.topic_key ?? null,
      parent_doc_id: input.parent_doc_id ?? null,
      surah: input.surah ?? null,
      ayah_from: input.ayah_from ?? null,
      ayah_to: input.ayah_to ?? null,
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

  private toDetail(row: CmDocumentRow): DocumentDetail {
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

  private toSummary(row: CmDocumentRow): DocumentSummary {
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
      topic_key: meta.topic_key ?? null,
    };
  }

  private toSearchResult(row: CmDocumentRow): DocumentSearchResult {
    const meta = this.parseMeta(row.meta_json);
    return {
      id: row.doc_id,
      title: row.title ?? '',
      doc_type: row.doc_type ?? 'note',
      domain: meta.domain || 'general',
      status: row.publication_state ?? 'draft',
      updated_at: row.updated_at ?? null,
      excerpt: null,
    };
  }
}

/** Downscale an image file and return a JPEG/PNG data URL. */
function resizeImageToDataUrl(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('image read failed'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const image = new Image();
      image.onerror = () => reject(new Error('image decode failed'));
      image.onload = () => {
        let { width, height } = image;
        const largest = Math.max(width, height);
        if (largest > maxDimension && largest > 0) {
          const scale = maxDimension / largest;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
