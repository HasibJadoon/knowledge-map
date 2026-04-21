import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import type {
  DocumentEditorScope,
  DocumentListItem,
  DocumentDetail,
  TiptapDoc,
  QuranDocType,
  DocumentDetailResponse,
  DocumentCreateResponse,
  DocumentSaveResponse,
  DocumentUploadResponse,
  SaveState,
} from '../models/document-editor.models';

interface KmDoc {
  id: string; title: string; doc_type: string; domain: string;
  status: string; surah?: number | null; source_id?: string | null;
  unit_id?: string | null; word_count?: number;
  created_at: string; updated_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DocumentEditorService {
  private readonly api = inject(BackendApiService);

  // ── State signals ──────────────────────────────────────────────────────────
  documents = signal<DocumentListItem[]>([]);
  activeDocument = signal<DocumentDetail | null>(null);
  loadState = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  saveState = signal<SaveState>('idle');
  loadError = signal<string | null>(null);

  activeId = computed(() => this.activeDocument()?.id ?? null);

  // ── List — loads from new /api/docs endpoint ──────────────────────────────

  async loadDocuments(scope: DocumentEditorScope): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);

    let params = new HttpParams().set('domain', scope.domain);
    if (scope.surah != null)    params = params.set('surah', String(scope.surah));
    if (scope.source_id)        params = params.set('source_id', scope.source_id);
    if (scope.unit_id)          params = params.set('unit_id', scope.unit_id);

    try {
      // New endpoint: GET /api/docs → { docs: [...], total: N }
      const res = await firstValueFrom(
        this.api.getRaw<{ docs: KmDoc[]; total: number }>(['docs'], { params })
      );
      const mapped: DocumentListItem[] = (res.docs ?? []).map(d => ({
        id: d.id,
        title: d.title,
        doc_type: d.doc_type,
        summary: null,
        status: d.status,
        is_published: false,
        domain: d.domain,
        surah: d.surah ?? null,
        source_id: d.source_id ?? null,
        source_unit_id: null,
        unit_id: d.unit_id ?? null,
        created_at: d.created_at,
        updated_at: d.updated_at ?? null,
      }));
      this.documents.set(mapped);
      this.activeDocument.set(null);
      this.loadState.set('loaded');
    } catch (err: unknown) {
      this.loadError.set(err instanceof Error ? err.message : String(err));
      this.loadState.set('error');
    }
  }

  // ── Single document ────────────────────────────────────────────────────────

  async loadDocument(id: string): Promise<void> {
    this.loadState.set('loading');
    try {
      const res = await firstValueFrom(
        this.api.getRaw<DocumentDetailResponse>(['documents', id])
      );
      if (res.ok) {
        this.activeDocument.set(res.document);
        this.loadState.set('loaded');
      } else {
        throw new Error(res.error ?? 'Document not found');
      }
    } catch (err: unknown) {
      this.loadError.set(err instanceof Error ? err.message : String(err));
      this.loadState.set('error');
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async createDocument(
    title: string,
    docType: QuranDocType,
    scope: DocumentEditorScope
  ): Promise<DocumentDetail | null> {
    try {
      const res = await firstValueFrom(
        this.api.postRaw<DocumentCreateResponse>(['documents'], {
          title,
          doc_type: docType,
          domain: scope.domain,
          surah: scope.surah ?? null,
          source_id: scope.source_id ?? null,
          source_unit_id: scope.source_unit_id ?? null,
          unit_id: scope.unit_id ?? null,
        })
      );
      if (res.ok) {
        const newItem: DocumentListItem = {
          id: res.document.id,
          title: res.document.title,
          doc_type: res.document.doc_type,
          summary: res.document.summary ?? null,
          status: res.document.status ?? 'active',
          is_published: false,
          domain: res.document.domain ?? scope.domain,
          surah: res.document.surah ?? null,
          source_id: res.document.source_id ?? null,
          source_unit_id: res.document.source_unit_id ?? null,
          unit_id: res.document.unit_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: null,
        };
        this.documents.update(docs => [newItem, ...docs]);

        // Load full document to set as active
        await this.loadDocument(res.document_id);
        return this.activeDocument();
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Save (PUT — full document_json sync) ───────────────────────────────────

  async saveDocument(id: string, doc: TiptapDoc, title?: string): Promise<boolean> {
    this.saveState.set('saving');
    try {
      const res = await firstValueFrom(
        this.api.putRaw<DocumentSaveResponse>(['documents', id], {
          document_json: doc,
          ...(title ? { title } : {}),
        })
      );
      if (res.ok) {
        this.saveState.set('saved');
        // Update title in list if changed
        if (title) {
          this.documents.update(docs =>
            docs.map(d => d.id === id ? { ...d, title, updated_at: new Date().toISOString() } : d)
          );
          const active = this.activeDocument();
          if (active?.id === id) {
            this.activeDocument.set({ ...active, title, updated_at: new Date().toISOString() });
          }
        }
        return true;
      }
      this.saveState.set('error');
      return false;
    } catch {
      this.saveState.set('error');
      return false;
    }
  }

  // ── Upload image/audio to R2 ───────────────────────────────────────────────

  async uploadFile(
    documentId: string,
    file: File,
    resourceType: 'image' | 'audio'
  ): Promise<DocumentUploadResponse | null> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resource_type', resourceType);

    try {
      const res = await firstValueFrom(
        this.api.postRaw<DocumentUploadResponse>(['documents', documentId, 'upload'], formData)
      );
      return res.ok ? res : null;
    } catch {
      return null;
    }
  }

  // ── Select active document ─────────────────────────────────────────────────

  selectDocument(id: string): void {
    if (this.activeDocument()?.id === id) return;
    this.loadDocument(id);
  }

  clearActive(): void {
    this.activeDocument.set(null);
  }

  async createDocumentRecord(
    title: string,
    docType: QuranDocType,
    scope: DocumentEditorScope,
  ): Promise<string | null> {
    const body: Record<string, unknown> = {
      title,
      doc_type: docType,
      domain: scope.domain,
    };
    if (scope.surah != null) body['surah'] = scope.surah;
    if (scope.source_id) body['source_id'] = scope.source_id;

    try {
      const res = await firstValueFrom(this.api.postRaw<{ id: string }>(['docs'], body));
      return res.id ?? null;
    } catch {
      return null;
    }
  }
}
