import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocEditorService, DocContext } from './doc-editor.service';

@Injectable({ providedIn: 'root' })
export class DocContextService {
  private editor = inject(DocEditorService);
  private http   = inject(HttpClient);
  private router = inject(Router);

  buildFromUrl(url: string, queryParams: Record<string, string> = {}): Partial<DocContext> {
    if (url.startsWith('quran')) {
      const parts = url.split('/');
      const surah = parts[1] ? parseInt(parts[1]) : null;
      return {
        domain: 'quran',
        docType: 'tafsir',
        surah,
        ayahFrom: queryParams['from'] ? parseInt(queryParams['from']) : null,
        ayahTo:   queryParams['to']   ? parseInt(queryParams['to'])   : null,
      };
    }
    if (url.startsWith('worldview')) {
      return { domain: 'worldview', docType: 'analysis' };
    }
    if (url.startsWith('arabic')) {
      const parts = url.split('/');
      return {
        domain: 'arabic',
        docType: 'lesson',
        unitId: parts[2] ? parseInt(parts[2]) : null,
      };
    }
    return { domain: 'general', docType: 'note' };
  }

  openNewDocWithContext(originUrl: string, queryParams: Record<string, string> = {}): void {
    const ctx = this.buildFromUrl(originUrl, queryParams);
    this.http.post<{ id: string }>('/api/docs', {
      ...ctx,
      title: 'Untitled'
    }).subscribe(({ id }) => {
      this.editor.applyContext(ctx);
      this.router.navigate(['/docs', id]);
    });
  }
}
