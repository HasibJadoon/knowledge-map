import { Injectable, inject } from '@angular/core';
import { DocEditorService } from './doc-editor.service';
import { DocsApiService } from './docs-api.service';
import { TiptapDoc } from '../../models/content/document.model';

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

  flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    // Guard against a duplicate PATCH: goBack() calls flush() then ngOnDestroy
    // also calls flush() while the first save is still in flight.
    if (this.editor.isDirty() && !this.editor.isSaving()) {
      this.save();
    }
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
