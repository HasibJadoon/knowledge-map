import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DocEditorService } from '../services/doc-editor.service';

interface HeadingNode { text: string; level: number; }
interface BlockLink { id: number; block_id: string; entity_type?: string; entity_id?: number; surah?: number; ayah_from?: number; ayah_to?: number; }

@Component({
  selector: 'km-doc-right-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="km-doc-rp">
      <div class="km-doc-rp-tabs">
        @for (tab of tabs; track tab) {
          <button class="km-doc-rp-tab"
                  [class.km-doc-rp-tab--active]="activeTab() === tab"
                  (click)="activeTab.set(tab)">{{ tab }}</button>
        }
      </div>

      <div class="km-doc-rp-body">
        @if (activeTab() === 'Outline') {
          <div class="km-rp-outline">
            @if (headings().length === 0) {
              <p class="km-rp-empty">No headings yet</p>
            }
            @for (h of headings(); track h.text) {
              <div class="km-rp-heading" [style.padding-left]="(h.level - 1) * 12 + 'px'"
                   (click)="scrollToHeading(h.text)">
                {{ h.text }}
              </div>
            }
          </div>
        }

        @if (activeTab() === 'Links') {
          <div class="km-rp-links">
            @if (quranLinks().length) {
              <div class="km-rp-link-group">
                <div class="km-rp-link-group-label">Quran</div>
                @for (l of quranLinks(); track l.id) {
                  <div class="km-rp-link-item">{{ l.surah }}:{{ l.ayah_from }}{{ l.ayah_to !== l.ayah_from ? '–'+l.ayah_to : '' }}</div>
                }
              </div>
            }
            @if (wvLinks().length) {
              <div class="km-rp-link-group">
                <div class="km-rp-link-group-label">Worldview</div>
                @for (l of wvLinks(); track l.id) {
                  <div class="km-rp-link-item">{{ l.entity_type }} #{{ l.entity_id }}</div>
                }
              </div>
            }
            @if (!quranLinks().length && !wvLinks().length) {
              <p class="km-rp-empty">No links yet</p>
            }
          </div>
        }

        @if (activeTab() === 'Metadata') {
          <div class="km-rp-metadata">
            <label class="km-rp-field">
              <span>Domain</span>
              <select [(ngModel)]="metaDomain" (ngModelChange)="saveMeta()">
                <option>general</option>
                <option>quran</option>
                <option>arabic</option>
                <option>worldview</option>
                <option>workspace</option>
              </select>
            </label>
            <label class="km-rp-field">
              <span>Doc Type</span>
              <select [(ngModel)]="metaDocType" (ngModelChange)="saveMeta()">
                <option>note</option>
                <option>tafsir</option>
                <option>lesson</option>
                <option>analysis</option>
                <option>script</option>
                <option>essay</option>
              </select>
            </label>
            <label class="km-rp-field">
              <span>Audience</span>
              <input [(ngModel)]="metaAudience" (blur)="saveMeta()" placeholder="e.g. general, scholars" />
            </label>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .km-doc-rp {
      width: 240px;
      border-left: 1px solid var(--km-border);
      display: flex;
      flex-direction: column;
      background: var(--km-surface);
      height: 100%;
    }
    .km-doc-rp-tabs {
      display: flex;
      border-bottom: 1px solid var(--km-border);
    }
    .km-doc-rp-tab {
      flex: 1;
      padding: 8px 0;
      font-size: 0.72rem;
      font-weight: 600;
      background: transparent;
      border: none;
      color: var(--km-text-3);
      cursor: pointer;
      &--active { color: var(--km-gold); border-bottom: 2px solid var(--km-gold); }
    }
    .km-doc-rp-body { flex: 1; overflow-y: auto; padding: 12px; }
    .km-rp-empty { color: var(--km-text-3); font-size: 0.8rem; }
    .km-rp-heading {
      font-size: 0.8rem;
      color: var(--km-text-2);
      padding: 4px 0;
      cursor: pointer;
      &:hover { color: var(--km-gold); }
    }
    .km-rp-link-group-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--km-text-3);
      margin: 8px 0 4px;
    }
    .km-rp-link-item {
      font-size: 0.78rem;
      color: var(--km-text-2);
      padding: 3px 0;
    }
    .km-rp-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
      span { font-size: 0.72rem; color: var(--km-text-3); font-weight: 600; text-transform: uppercase; }
      select, input {
        background: var(--km-surface-2);
        border: 1px solid var(--km-border);
        border-radius: 6px;
        padding: 6px 8px;
        color: var(--km-text);
        font-size: 0.82rem;
        font-family: var(--km-font-body);
      }
    }
  `]
})
export class DocRightPanelComponent implements OnInit {
  private editorSvc = inject(DocEditorService);
  private http      = inject(HttpClient);

  readonly tabs = ['Outline', 'Links', 'Metadata'] as const;
  activeTab  = signal<'Outline' | 'Links' | 'Metadata'>('Outline');
  headings   = signal<HeadingNode[]>([]);
  quranLinks = signal<BlockLink[]>([]);
  wvLinks    = signal<BlockLink[]>([]);

  metaDomain   = 'general';
  metaDocType  = 'note';
  metaAudience = '';

  ngOnInit(): void {
    // Rebuild outline whenever editor updates
    const editor = this.editorSvc.editor;
    if (editor) {
      editor.on('update', () => this.buildOutline());
      this.buildOutline();
    }
    this.loadLinks();
  }

  buildOutline(): void {
    const json = this.editorSvc.getJSON() as { content?: Array<{ type: string; attrs?: { level?: number }; content?: Array<{ text?: string }> }> };
    const nodes = json.content ?? [];
    const heads = nodes
      .filter(n => n.type === 'heading')
      .map(n => ({
        text: n.content?.map(c => c.text ?? '').join('') ?? '',
        level: n.attrs?.['level'] ?? 1
      }));
    this.headings.set(heads);
  }

  loadLinks(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.http.get<{ links: BlockLink[] }>(`/api/docs/${id}/links/quran`).subscribe(r => this.quranLinks.set(r.links ?? []));
    this.http.get<{ links: BlockLink[] }>(`/api/docs/${id}/links/wv`).subscribe(r => this.wvLinks.set(r.links ?? []));
  }

  scrollToHeading(text: string): void {
    const editor = this.editorSvc.editor;
    if (!editor) return;
    const { state } = editor;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent === text) {
        editor.commands.setTextSelection(pos);
        editor.commands.scrollIntoView();
      }
    });
  }

  saveMeta(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.http.patch(`/api/docs/${id}`, {
      domain: this.metaDomain,
      doc_type: this.metaDocType,
      target_audience: this.metaAudience,
    }).subscribe();
  }
}
