import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  DocumentListItem, DocumentEditorScope, QuranDocType,
} from '../../../../../shared/models/document-editor.models';
import { QURAN_DOC_TYPES } from '../../../../../shared/models/document-editor.models';

@Component({
  selector: 'km-document-list',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-doc-list">
      <!-- Header -->
      <div class="km-doc-list__header">
        <span class="km-doc-list__title">Notes</span>
        <button class="km-doc-list__new-btn" (click)="openCreate()" title="New document">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <!-- New document form -->
      @if (creating()) {
        <div class="km-doc-list__create">
          <input
            class="km-doc-list__create-input"
            [(ngModel)]="newTitle"
            placeholder="Document title…"
            (keydown.enter)="submitCreate()"
            (keydown.escape)="creating.set(false)"
            autofocus />
          <select class="km-doc-list__create-select" [(ngModel)]="newDocType">
            @for (dt of docTypes; track dt.value) {
              <option [value]="dt.value">{{ dt.label }}</option>
            }
          </select>
          <div class="km-doc-list__create-actions">
            <button class="km-doc-list__create-btn km-doc-list__create-btn--primary"
              (click)="submitCreate()" [disabled]="!newTitle.trim()">
              Create
            </button>
            <button class="km-doc-list__create-btn" (click)="creating.set(false)">Cancel</button>
          </div>
        </div>
      }

      <!-- Document list -->
      <div class="km-doc-list__items">
        @if (loading) {
          <div class="km-doc-list__state">Loading…</div>
        } @else if (documents.length === 0) {
          <div class="km-doc-list__state km-doc-list__state--empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="km-doc-list__empty-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>No notes yet</span>
            <button class="km-doc-list__create-btn km-doc-list__create-btn--primary"
              (click)="openCreate()">
              New Note
            </button>
          </div>
        } @else {
          @for (doc of documents; track doc.id) {
            <button
              class="km-doc-list__item"
              [class.km-doc-list__item--active]="doc.id === activeId"
              (click)="select.emit(doc.id)">
              <span class="km-doc-list__item-title">{{ doc.title }}</span>
              <span class="km-doc-list__item-meta">
                <span class="km-doc-list__item-type">{{ docTypeLabel(doc.doc_type) }}</span>
                @if (doc.updated_at) {
                  <span class="km-doc-list__item-date">{{ formatDate(doc.updated_at) }}</span>
                }
              </span>
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .km-doc-list {
      display: flex; flex-direction: column;
      height: 100%; overflow: hidden;
      border-right: 1px solid var(--km-border);
      background: var(--km-surface);
    }
    .km-doc-list__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--km-border);
      flex-shrink: 0;
    }
    .km-doc-list__title {
      font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--km-text-2);
    }
    .km-doc-list__new-btn {
      width: 28px; height: 28px; border-radius: 5px;
      border: 1px solid var(--km-border);
      background: transparent; color: var(--km-text-2);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .km-doc-list__new-btn:hover { background: rgba(201,168,76,0.1); color: var(--km-gold); border-color: var(--km-border-gold); }
    .km-doc-list__new-btn svg { width: 14px; height: 14px; }

    .km-doc-list__create {
      padding: 10px 12px;
      border-bottom: 1px solid var(--km-border);
      display: flex; flex-direction: column; gap: 7px;
      flex-shrink: 0;
      background: rgba(201,168,76,0.04);
    }
    .km-doc-list__create-input,
    .km-doc-list__create-select {
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--km-border);
      border-radius: 5px; padding: 6px 9px;
      color: var(--km-text); font-size: 0.82rem;
      outline: none; width: 100%;
    }
    .km-doc-list__create-input:focus,
    .km-doc-list__create-select:focus { border-color: var(--km-gold); }
    .km-doc-list__create-select { cursor: pointer; }
    .km-doc-list__create-actions { display: flex; gap: 6px; }
    .km-doc-list__create-btn {
      flex: 1; padding: 6px 10px; border-radius: 5px;
      border: 1px solid var(--km-border);
      background: transparent; color: var(--km-text-2);
      font-size: 0.78rem; cursor: pointer;
    }
    .km-doc-list__create-btn--primary {
      background: var(--km-gold); color: #1a1a1a;
      border-color: var(--km-gold); font-weight: 600;
    }
    .km-doc-list__create-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .km-doc-list__items { flex: 1; overflow-y: auto; padding: 6px; }
    .km-doc-list__item {
      display: flex; flex-direction: column; gap: 2px;
      width: 100%; padding: 9px 10px;
      border: none; background: transparent;
      text-align: left; cursor: pointer;
      border-radius: 6px; color: var(--km-text);
      transition: background 0.15s;
    }
    .km-doc-list__item:hover { background: rgba(255,255,255,0.04); }
    .km-doc-list__item--active { background: rgba(201,168,76,0.1) !important; }
    .km-doc-list__item-title {
      font-size: 0.84rem; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .km-doc-list__item-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.7rem; color: var(--km-text-3, rgba(255,255,255,0.35));
    }
    .km-doc-list__item-type {
      background: rgba(255,255,255,0.06); border-radius: 3px;
      padding: 1px 5px; text-transform: capitalize;
    }

    .km-doc-list__state {
      padding: 24px 14px; text-align: center;
      color: var(--km-text-3, rgba(255,255,255,0.35));
      font-size: 0.82rem;
    }
    .km-doc-list__state--empty {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .km-doc-list__empty-icon { width: 36px; height: 36px; opacity: 0.3; }
  `],
})
export class KmDocumentListComponent implements OnChanges {
  @Input() documents: DocumentListItem[] = [];
  @Input() activeId: string | null = null;
  @Input() loading = false;
  @Input() scope!: DocumentEditorScope;
  @Input() createRequest = 0;

  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<{ title: string; docType: QuranDocType }>();

  docTypes = QURAN_DOC_TYPES;
  creating = signal(false);
  newTitle = '';
  newDocType: QuranDocType = 'running_notes';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['createRequest'] && !changes['createRequest'].firstChange && this.createRequest > 0) {
      this.openCreate();
    }
  }

  openCreate(): void {
    this.newTitle = '';
    this.newDocType = 'running_notes';
    this.creating.set(true);
  }

  submitCreate(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.create.emit({ title, docType: this.newDocType });
    this.creating.set(false);
  }

  docTypeLabel(docType: string): string {
    return QURAN_DOC_TYPES.find(d => d.value === docType)?.label ?? docType;
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }
}
