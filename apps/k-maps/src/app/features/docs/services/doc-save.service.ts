import { Injectable, inject } from '@angular/core';
import { DocEditorService } from './doc-editor.service';
import { DocsApiService } from './docs-api.service';
import { TiptapDoc } from '../../../shared/models/document-editor.models';

@Injectable({ providedIn: 'root' })
export class DocSaveService {
  private editor  = inject(DocEditorService);
  private docsApi = inject(DocsApiService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 1500;

  scheduleSave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), this.DEBOUNCE_MS);
  }

  private save(): void {
    const id = this.editor.docId();
    if (!id) return;
    this.editor.isSaving.set(true);
    this.docsApi.updateDoc(id, {
      title: this.editor.title(),
      content: this.editor.getJSON() as TiptapDoc,
      word_count: this.editor.wordCount(),
    }).subscribe({
      next: () => { this.editor.isSaving.set(false); this.editor.isDirty.set(false); },
      error: () => { this.editor.isSaving.set(false); },
    });
  }
}
