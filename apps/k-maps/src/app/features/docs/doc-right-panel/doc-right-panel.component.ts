import { Component, OnInit, inject, signal, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocEditorService } from '../services/doc-editor.service';
import { DocsApiService } from '../services/docs-api.service';

interface HeadingNode { text: string; level: number; }
interface BlockLink { id: number; block_id: string; entity_type?: string; entity_id?: number; surah?: number; ayah_from?: number; ayah_to?: number; }
interface PageLinkItem { doc_id: string; title: string; }
interface AyahItem { surah: number; ayah: number; text: string; }

@Component({
  selector: 'km-doc-right-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
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

            @if (pageLinks().length) {
              <div class="km-rp-link-section">
                <div class="km-rp-link-group-label">📄 Linked Pages</div>
                @for (p of pageLinks(); track p.doc_id) {
                  <a class="km-rp-page-link" [routerLink]="['/docs', p.doc_id]">
                    <span>{{ p.title || 'Untitled' }}</span>
                    <span class="km-rp-link-arrow">→</span>
                  </a>
                }
              </div>
            }

            @if (ayahItems().length) {
              <div class="km-rp-link-section">
                <div class="km-rp-link-group-label">📖 Quran</div>
                @for (a of ayahItems(); track a.surah + ':' + a.ayah) {
                  <div class="km-rp-link-item">
                    <span class="km-rp-ref">{{ a.surah }}:{{ a.ayah }}</span>
                    <span class="km-rp-ayah-text">{{ a.text }}</span>
                  </div>
                }
              </div>
            }

            @if (wvLinks().length) {
              <div class="km-rp-link-section">
                <div class="km-rp-link-group-label">🌍 Worldview</div>
                @for (l of wvLinks(); track l.id) {
                  <div class="km-rp-link-item">{{ l.entity_type }} #{{ l.entity_id }}</div>
                }
              </div>
            }

            @if (!pageLinks().length && !ayahItems().length && !wvLinks().length) {
              <p class="km-rp-empty">No links yet.<br>
                <span class="km-rp-hint">Insert an Ayah embed or Page link via /</span>
              </p>
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
                @if (metaDocType && !['note','tafsir','lesson','analysis','script','essay','running_notes','journal','summary','reflection'].includes(metaDocType)) {
                  <option [value]="metaDocType">{{ metaDocType }}</option>
                }
                <option>note</option>
                <option>running_notes</option>
                <option>journal</option>
                <option>summary</option>
                <option>tafsir</option>
                <option>lesson</option>
                <option>analysis</option>
                <option>reflection</option>
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
    .km-rp-link-section { margin-bottom: 14px; }
    .km-rp-page-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 6px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.8rem;
      color: rgba(201,168,76,0.85);
      transition: background 0.1s;
      &:hover { background: rgba(201,168,76,0.08); color: rgba(201,168,76,1); }
    }
    .km-rp-link-arrow { opacity: 0.5; font-size: 0.75rem; margin-left: auto; }
    .km-rp-link-item {
      padding: 4px 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .km-rp-ref {
      font-size: 0.72rem;
      color: var(--km-gold);
      font-weight: 600;
    }
    .km-rp-ayah-text {
      font-family: var(--km-font-arabic-amiri);
      font-size: 1rem;
      line-height: 1.8;
      color: var(--km-text-2);
      direction: rtl;
      text-align: right;
      user-select: text;
      cursor: text;
    }
    .km-rp-hint {
      font-size: 0.72rem;
      color: var(--km-text-3);
      font-style: normal;
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
  private docsApi   = inject(DocsApiService);
  private cdr       = inject(ChangeDetectorRef);

  readonly tabs = ['Outline', 'Links', 'Metadata'] as const;
  activeTab  = signal<'Outline' | 'Links' | 'Metadata'>('Outline');
  headings   = signal<HeadingNode[]>([]);
  pageLinks  = signal<PageLinkItem[]>([]);
  ayahItems  = signal<AyahItem[]>([]);
  // DB-backed cross-resource links await the CM links feature; populated empty.
  wvLinks    = signal<BlockLink[]>([]);

  metaDomain   = 'general';
  metaDocType  = 'note';
  metaAudience = '';

  private boundBuild = () => { this.buildOutline(); this.buildLinks(); this.cdr.markForCheck(); };

  constructor() {
    effect(() => {
      const ready = this.editorSvc.editorReady();
      const editor = this.editorSvc.editor;
      if (ready && editor) {
        editor.off('update', this.boundBuild);
        editor.on('update', this.boundBuild);
        this.buildOutline();
        this.buildLinks();
        this.loadMeta();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void { /* intentionally empty — init handled in constructor effect */ }

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

  /** Extract page_link and ayah_embed nodes directly from editor content. */
  buildLinks(): void {
    type DocNode = { type: string; attrs?: Record<string, unknown>; content?: DocNode[] };
    const json = this.editorSvc.getJSON() as { content?: DocNode[] };

    const pages: PageLinkItem[] = [];
    const ayahs: AyahItem[] = [];

    const walk = (nodes: DocNode[]) => {
      for (const node of nodes) {
        if (node.type === 'page_link' && node.attrs?.['doc_id']) {
          pages.push({ doc_id: node.attrs['doc_id'] as string, title: (node.attrs['title'] as string) || 'Untitled' });
        }
        if (node.type === 'ayah_embed' && node.attrs?.['surah']) {
          ayahs.push({
            surah: node.attrs['surah'] as number,
            ayah: node.attrs['ayah'] as number,
            text: (node.attrs['text_uthmani'] as string) || '',
          });
        }
        if (node.content?.length) walk(node.content);
      }
    };

    walk(json.content ?? []);
    this.pageLinks.set(pages);
    this.ayahItems.set(ayahs);
  }

  loadMeta(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.docsApi.getDoc(id).subscribe(doc => {
      this.metaDomain   = doc.domain || 'general';
      this.metaDocType  = doc.doc_type || 'note';
      this.metaAudience = doc.meta.target_audience || '';
      this.cdr.markForCheck();
    });
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
    this.docsApi.patchMeta(id, {
      domain: this.metaDomain,
      doc_type: this.metaDocType,
      target_audience: this.metaAudience,
    }).subscribe();
  }
}
