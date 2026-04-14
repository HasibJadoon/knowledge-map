import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocEditorService } from './doc-editor.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DocSaveService {
  private http   = inject(HttpClient);
  private editor = inject(DocEditorService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 1500;
  private readonly API = `${environment.apiBase}/docs`;

  scheduleSave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), this.DEBOUNCE_MS);
  }

  flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.save();
  }

  private save(): void {
    const id = this.editor.docId();
    if (!id) return;
    this.editor.isSaving.set(true);
    this.http.patch(`${this.API}/${id}`, {
      title: this.editor.title(),
      document_json: JSON.stringify(this.editor.getJSON()),
      word_count: this.editor.wordCount()
    }).subscribe({
      next: () => { this.editor.isSaving.set(false); this.editor.isDirty.set(false); },
      error: () => { this.editor.isSaving.set(false); }
    });
  }
}
