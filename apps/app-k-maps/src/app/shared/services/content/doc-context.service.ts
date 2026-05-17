import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DocEditorService, DocContext } from './doc-editor.service';
import { DocsApiService } from './docs-api.service';

@Injectable({ providedIn: 'root' })
export class DocContextService {
  private editor  = inject(DocEditorService);
  private docsApi = inject(DocsApiService);
  private router  = inject(Router);

  buildFromUrl(url: string, queryParams: Record<string, string> = {}): Partial<DocContext> {
    if (url.startsWith('quran')) {
      const parts = url.split('/');
      const surah = parts[1] ? parseInt(parts[1]) : null;
      return {
        domain: 'quran', docType: 'tafsir', surah,
        ayahFrom: queryParams['from'] ? parseInt(queryParams['from']) : null,
        ayahTo:   queryParams['to']   ? parseInt(queryParams['to'])   : null,
      };
    }
    if (url.startsWith('worldview')) return { domain: 'worldview', docType: 'analysis' };
    if (url.startsWith('arabic')) {
      const parts = url.split('/');
      return { domain: 'arabic', docType: 'lesson', unitId: parts[2] ? parseInt(parts[2]) : null };
    }
    return { domain: 'general', docType: 'note' };
  }

  openNewDocWithContext(originUrl: string, queryParams: Record<string, string> = {}): void {
    const ctx = this.buildFromUrl(originUrl, queryParams);
    this.docsApi.createDoc({
      title: 'Untitled',
      domain: ctx.domain ?? 'general',
      doc_type: ctx.docType ?? 'note',
      surah: ctx.surah ?? null,
      ayah_from: ctx.ayahFrom ?? null,
      ayah_to: ctx.ayahTo ?? null,
      unit_id: ctx.unitId ?? null,
      workspace_id: ctx.workspaceId ?? null,
    }).subscribe(({ id }) => {
      this.editor.applyContext(ctx);
      this.router.navigate(['/docs', id]);
    });
  }
}
