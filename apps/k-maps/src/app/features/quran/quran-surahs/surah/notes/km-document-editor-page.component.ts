import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef,
  inject, Input, OnDestroy, OnInit, signal, ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { DocumentEditorService } from '../../../../../shared/services/document-editor.service';
import { KmDocumentListComponent } from './km-document-list.component';
import { KmDocumentEditorComponent } from './km-document-editor.component';
import type {
  DocumentEditorScope, QuranDocType, TiptapDoc,
} from '../../../../../shared/models/document-editor.models';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'km-document-editor-page',
  standalone: true,
  imports: [KmDocumentListComponent, KmDocumentEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-editor-page" #pageRoot>
      <!-- Sidebar -->
      <aside class="km-editor-page__sidebar" [class.km-editor-page__sidebar--collapsed]="sidebarCollapsed()">
        @if (!sidebarCollapsed()) {
          <km-document-list
            [documents]="svc.documents()"
            [activeId]="svc.activeId()"
            [loading]="svc.loadState() === 'loading'"
            [scope]="scope"
            [createRequest]="createRequest()"
            (select)="onSelectDocument($event)"
            (create)="onCreateDocument($event)">
          </km-document-list>
        }
      </aside>

      <!-- Toggle sidebar button -->
      <button class="km-editor-page__toggle" (click)="toggleSidebar()" [title]="sidebarCollapsed() ? 'Show list' : 'Hide list'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          @if (sidebarCollapsed()) {
            <path d="M3 12h18M3 6h18M3 18h18"/>
          } @else {
            <path d="M15 18l-6-6 6-6"/>
          }
        </svg>
      </button>

      <!-- Editor area -->
      <main class="km-editor-page__main">
        @if (svc.activeDocument(); as doc) {
          <!-- Document header -->
          <div class="km-editor-page__doc-header" #docHeader>
            <input
              class="km-editor-page__title-input"
              [value]="doc.title"
              placeholder="Untitled"
              (blur)="onTitleBlur($event)"
              (keydown.enter)="$any($event.target).blur()" />
            <div class="km-editor-page__save-status">
              @switch (saveState()) {
                @case ('saving') { <span class="km-save-status km-save-status--saving">Saving…</span> }
                @case ('saved')  { <span class="km-save-status km-save-status--saved">Saved</span> }
                @case ('error')  { <span class="km-save-status km-save-status--error">Error saving</span> }
              }
            </div>
          </div>

          <!-- Tiptap editor -->
          <km-document-editor
            [doc]="doc.document_json"
            [editable]="true"
            (docChange)="onDocChange($event)"
            (imageUpload)="onImageUpload($event)"
            (audioUpload)="onAudioUpload($event)">
          </km-document-editor>
        } @else {
          <!-- Empty state -->
          <div class="km-editor-page__empty" #emptyState>
            <div class="km-editor-page__empty-icon">📄</div>
            <p class="km-editor-page__empty-text">Select a note or create a new one</p>
            <button class="km-editor-page__empty-btn" (click)="onNewDocClick()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Note
            </button>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: flex; height: 100%; min-height: 0; overflow: hidden; }

    .km-editor-page {
      display: flex; width: 100%; height: 100%;
      background: var(--km-bg); overflow: hidden;
      position: relative; min-height: 0;
    }

    /* Sidebar */
    .km-editor-page__sidebar {
      width: 240px; flex-shrink: 0;
      overflow: hidden;
      min-height: 0;
      transition: width 0.28s cubic-bezier(0.4,0,0.2,1);
    }
    .km-editor-page__sidebar--collapsed { width: 0; }

    /* Toggle button */
    .km-editor-page__toggle {
      width: 28px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border: none;
      border-left: 1px solid var(--km-border);
      border-right: 1px solid var(--km-border);
      background: var(--km-surface);
      color: var(--km-text-3, rgba(255,255,255,0.35));
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }
    .km-editor-page__toggle:hover { color: var(--km-gold); background: rgba(201,168,76,0.06); }
    .km-editor-page__toggle svg { width: 14px; height: 14px; }

    /* Main */
    .km-editor-page__main {
      flex: 1; overflow: hidden;
      display: flex; flex-direction: column;
      min-height: 0;
    }

    /* Doc header */
    .km-editor-page__doc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px 8px;
      border-bottom: 1px solid var(--km-border);
      flex-shrink: 0;
    }
    .km-editor-page__title-input {
      background: transparent; border: none; outline: none;
      font-size: 1rem; font-weight: 600;
      color: var(--km-text); width: 100%;
      padding: 4px 0;
    }
    .km-editor-page__title-input::placeholder { color: var(--km-text-3, rgba(255,255,255,0.3)); }

    .km-editor-page__save-status { flex-shrink: 0; }
    .km-save-status {
      font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
    }
    .km-save-status--saving { color: var(--km-text-3); }
    .km-save-status--saved  { color: rgba(120,200,120,0.7); }
    .km-save-status--error  { color: rgba(220,100,100,0.8); }

    /* Empty state */
    .km-editor-page__empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
      color: var(--km-text-3, rgba(255,255,255,0.35));
    }
    .km-editor-page__empty-icon { font-size: 2.4rem; opacity: 0.5; }
    .km-editor-page__empty-text { font-size: 0.88rem; }
    .km-editor-page__empty-btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 8px 20px; border-radius: 6px;
      border: 1px solid var(--km-border-gold, rgba(201,168,76,0.3));
      background: transparent; color: var(--km-gold);
      font-size: 0.82rem; cursor: pointer;
    }
    .km-editor-page__empty-btn svg { width: 14px; height: 14px; }
    .km-editor-page__empty-btn:hover { background: rgba(201,168,76,0.1); }
  `],
})
export class KmDocumentEditorPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pageRoot') pageRoot!: ElementRef;
  @ViewChild('docHeader') docHeader?: ElementRef;
  @ViewChild('emptyState') emptyState?: ElementRef;

  @Input({ required: true }) scope!: DocumentEditorScope;

  svc = inject(DocumentEditorService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  createRequest = signal(0);
  saveState = signal<SaveState>('idle');

  private pendingDoc: TiptapDoc | null = null;
  private pendingTitle: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.svc.loadDocuments(this.scope);
  }

  ngAfterViewInit(): void {
    // Animate page entrance
    gsap.fromTo(this.pageRoot.nativeElement, { opacity: 0 }, {
      opacity: 1, duration: 0.4, ease: 'power2.out',
    });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    // Flush any pending save immediately
    if (this.pendingDoc && this.svc.activeId()) {
      this.svc.saveDocument(this.svc.activeId()!, this.pendingDoc, this.pendingTitle ?? undefined);
    }
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  // ── Document selection → navigate to full editor ──────────────────────────

  onSelectDocument(id: string): void {
    this.router.navigate(['/docs', id]);
  }

  // ── Document creation → navigate to full editor ───────────────────────────

  async onCreateDocument(ev: { title: string; docType: QuranDocType }): Promise<void> {
    try {
      const docId = await this.svc.createDocumentRecord(ev.title, ev.docType, this.scope);
      if (docId) {
        this.router.navigate(['/docs', docId]);
        return;
      }
      await this.svc.createDocument(ev.title, ev.docType, this.scope);
      this.cdr.markForCheck();
    } catch {
      // fallback: open create in old system
      await this.svc.createDocument(ev.title, ev.docType, this.scope);
      this.cdr.markForCheck();
    }
  }

  onNewDocClick(): void {
    // Quick-create an untitled doc with context and navigate to full editor
    this.svc.createDocumentRecord('Untitled', 'running_notes', this.scope)
      .then(docId => {
        if (docId) this.router.navigate(['/docs', docId]);
      })
      .catch(() => {
        // fallback to sidebar create form
        this.sidebarCollapsed.set(false);
        this.createRequest.update((value) => value + 1);
      });
  }

  // ── Title change ───────────────────────────────────────────────────────────

  onTitleBlur(e: Event): void {
    const newTitle = (e.target as HTMLInputElement).value.trim();
    const active = this.svc.activeDocument();
    if (!active || !newTitle || newTitle === active.title) return;
    this.pendingTitle = newTitle;
    this.scheduleSave();
  }

  // ── Doc change (debounced 1.5 s) ──────────────────────────────────────────

  onDocChange(doc: TiptapDoc): void {
    this.pendingDoc = doc;
    this.saveState.set('idle');
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.doSave(), 1500);
  }

  private flushSave(): void {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    if ((this.pendingDoc || this.pendingTitle) && this.svc.activeId()) {
      this.doSave();
    }
  }

  private async doSave(): Promise<void> {
    const id = this.svc.activeId();
    if (!id || (!this.pendingDoc && !this.pendingTitle)) return;

    const doc = this.pendingDoc ?? this.svc.activeDocument()?.document_json;
    if (!doc) return;

    this.saveState.set('saving');
    this.cdr.markForCheck();

    const ok = await this.svc.saveDocument(id, doc, this.pendingTitle ?? undefined);
    this.pendingDoc = null;
    this.pendingTitle = null;

    this.saveState.set(ok ? 'saved' : 'error');
    this.cdr.markForCheck();

    // Auto-clear "Saved" badge after 2 s
    if (ok) {
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => {
        this.saveState.set('idle');
        this.cdr.markForCheck();
      }, 2000);
    }
  }

  // ── Media upload ──────────────────────────────────────────────────────────

  async onImageUpload(file: File): Promise<void> {
    const id = this.svc.activeId();
    if (!id) return;
    const res = await this.svc.uploadFile(id, file, 'image');
    if (res?.url) {
      // The editor component will need to insert the image — emit via a child ref
      // We use a simple approach: child editor's insertImageUrl method
      // Angular CDK or ViewChild is cleaner, but for simplicity we broadcast via event
      document.dispatchEvent(new CustomEvent('km-insert-image', {
        detail: { url: res.url, alt: file.name },
      }));
    }
  }

  async onAudioUpload(file: File): Promise<void> {
    const id = this.svc.activeId();
    if (!id) return;
    const res = await this.svc.uploadFile(id, file, 'audio');
    if (res?.url) {
      // Insert as a paragraph with a link to the audio
      document.dispatchEvent(new CustomEvent('km-insert-audio', {
        detail: { url: res.url, name: file.name },
      }));
    }
  }
}
