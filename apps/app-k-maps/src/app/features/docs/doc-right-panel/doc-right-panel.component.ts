import {
  Component, OnInit, inject, signal,
  effect, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonicModule, ModalController } from '@ionic/angular';
import { DocEditorService } from '../services/doc-editor.service';
import { environment } from '../../../../environments/environment';

interface HeadingNode   { text: string; level: number; }
interface PageLinkItem  { doc_id: string; title: string; }
interface AyahItem      { surah: number; ayah: number; text: string; }
interface BlockLink     { id: number; entity_type?: string; entity_id?: number; }

@Component({
  selector: 'km-doc-right-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Document Info</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Done</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="cdr.markForCheck()">
          <ion-segment-button value="outline"><ion-label>Outline</ion-label></ion-segment-button>
          <ion-segment-button value="links"><ion-label>Links</ion-label></ion-segment-button>
          <ion-segment-button value="meta"><ion-label>Meta</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="km-rp-content">

      <!-- ── Outline ─────────────────────────────────────────────────── -->
      @if (activeTab === 'outline') {
        @if (headings().length === 0) {
          <div class="km-rp-empty">
            <ion-icon name="list-outline"></ion-icon>
            <p>No headings yet</p>
          </div>
        }
        @for (h of headings(); track h.text) {
          <ion-item button detail="false" lines="none"
                    class="km-rp-heading"
                    [style.--indent]="(h.level - 1) * 16 + 'px'"
                    (click)="scrollToHeading(h.text)">
            <ion-label>
              <span class="km-rp-h-level">H{{ h.level }}</span>
              {{ h.text }}
            </ion-label>
          </ion-item>
        }
      }

      <!-- ── Links ───────────────────────────────────────────────────── -->
      @if (activeTab === 'links') {
        @if (pageLinks().length) {
          <div class="km-rp-section-label">📄 Linked Pages</div>
          @for (p of pageLinks(); track p.doc_id) {
            <ion-item lines="none" class="km-rp-link-item"
                      button detail (click)="navigateToDoc(p.doc_id)">
              <ion-label>{{ p.title || 'Untitled' }}</ion-label>
            </ion-item>
          }
        }

        @if (ayahItems().length) {
          <div class="km-rp-section-label">📖 Quran</div>
          @for (a of ayahItems(); track a.surah + ':' + a.ayah) {
            <ion-item lines="none" class="km-rp-ayah-item">
              <ion-label>
                <p class="km-rp-ref">{{ a.surah }}:{{ a.ayah }}</p>
                <p class="km-rp-ayah-text">{{ a.text }}</p>
              </ion-label>
            </ion-item>
          }
        }

        @if (wvLinks().length) {
          <div class="km-rp-section-label">🌍 Worldview</div>
          @for (l of wvLinks(); track l.id) {
            <ion-item lines="none" class="km-rp-link-item">
              <ion-label>{{ l.entity_type }} #{{ l.entity_id }}</ion-label>
            </ion-item>
          }
        }

        @if (!pageLinks().length && !ayahItems().length && !wvLinks().length) {
          <div class="km-rp-empty">
            <ion-icon name="link-outline"></ion-icon>
            <p>No links yet.<br><small>Insert an Ayah embed or Page link via /</small></p>
          </div>
        }
      }

      <!-- ── Metadata ─────────────────────────────────────────────────── -->
      @if (activeTab === 'meta') {
        <ion-list class="km-rp-meta-list">
          <ion-item>
            <ion-label position="stacked">Domain</ion-label>
            <ion-select [(ngModel)]="metaDomain" (ionChange)="saveMeta()" interface="action-sheet">
              <ion-select-option value="general">General</ion-select-option>
              <ion-select-option value="quran">Quran</ion-select-option>
              <ion-select-option value="arabic">Arabic</ion-select-option>
              <ion-select-option value="worldview">Worldview</ion-select-option>
              <ion-select-option value="workspace">Workspace</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Doc Type</ion-label>
            <ion-select [(ngModel)]="metaDocType" (ionChange)="saveMeta()" interface="action-sheet">
              <ion-select-option value="note">Note</ion-select-option>
              <ion-select-option value="running_notes">Running Notes</ion-select-option>
              <ion-select-option value="journal">Journal</ion-select-option>
              <ion-select-option value="summary">Summary</ion-select-option>
              <ion-select-option value="tafsir">Tafsir</ion-select-option>
              <ion-select-option value="lesson">Lesson</ion-select-option>
              <ion-select-option value="analysis">Analysis</ion-select-option>
              <ion-select-option value="reflection">Reflection</ion-select-option>
              <ion-select-option value="script">Script</ion-select-option>
              <ion-select-option value="essay">Essay</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Audience</ion-label>
            <ion-input [(ngModel)]="metaAudience"
                       (ionBlur)="saveMeta()"
                       placeholder="e.g. general, scholars">
            </ion-input>
          </ion-item>

          <ion-item lines="none">
            <ion-label class="km-rp-word-count">
              {{ editorSvc.wordCount() }} words
            </ion-label>
          </ion-item>
        </ion-list>
      }

    </ion-content>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .km-rp-content { --background: var(--app-page-background, #080808); }

    .km-rp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 48px 24px;
      color: var(--ion-color-medium);
      text-align: center;
      ion-icon { font-size: 2.5rem; opacity: 0.35; }
      p { margin: 0; font-size: 0.85rem; line-height: 1.6; }
    }

    .km-rp-section-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--ion-color-medium);
      padding: 16px 20px 6px;
    }

    .km-rp-heading {
      --padding-start: calc(16px + var(--indent, 0px));
      --min-height: 38px;
      font-size: 0.88rem;
    }

    .km-rp-h-level {
      font-size: 0.65rem;
      color: #c9a84c;
      font-weight: 700;
      margin-right: 6px;
      vertical-align: middle;
    }

    .km-rp-link-item { --min-height: 44px; font-size: 0.88rem; }

    .km-rp-ayah-item {
      --min-height: 44px;
      .km-rp-ref {
        font-size: 0.72rem;
        color: #c9a84c;
        font-weight: 600;
        margin: 0 0 2px;
      }
      .km-rp-ayah-text {
        font-family: var(--km-font-arabic, 'Uthmanic Hafs', serif);
        font-size: 1.1rem;
        line-height: 1.9;
        direction: rtl;
        text-align: right;
        color: var(--ion-text-color);
        margin: 0;
      }
    }

    .km-rp-meta-list { --ion-background-color: transparent; }

    .km-rp-word-count {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      text-align: center;
      margin-top: 8px;
    }
  `]
})
export class DocRightPanelComponent implements OnInit {
  readonly editorSvc = inject(DocEditorService);
  private http       = inject(HttpClient);
  readonly cdr       = inject(ChangeDetectorRef);
  private modalCtrl  = inject(ModalController);
  private readonly API = `${environment.apiBase}/docs`;

  activeTab  = 'outline';
  headings   = signal<HeadingNode[]>([]);
  pageLinks  = signal<PageLinkItem[]>([]);
  ayahItems  = signal<AyahItem[]>([]);
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
        this.loadDbLinks();
        this.loadMeta();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void { /* init handled in constructor effect */ }

  buildOutline(): void {
    const json = this.editorSvc.getJSON() as { content?: Array<{ type: string; attrs?: { level?: number }; content?: Array<{ text?: string }> }> };
    this.headings.set(
      (json.content ?? [])
        .filter(n => n.type === 'heading')
        .map(n => ({
          text:  n.content?.map(c => c.text ?? '').join('') ?? '',
          level: n.attrs?.['level'] ?? 1
        }))
    );
  }

  buildLinks(): void {
    type DocNode = { type: string; attrs?: Record<string, unknown>; content?: DocNode[] };
    const json = this.editorSvc.getJSON() as { content?: DocNode[] };
    const pages: PageLinkItem[] = [];
    const ayahs: AyahItem[]    = [];

    const walk = (nodes: DocNode[]) => {
      for (const node of nodes) {
        if (node.type === 'page_link' && node.attrs?.['doc_id']) {
          pages.push({ doc_id: node.attrs['doc_id'] as string, title: (node.attrs['title'] as string) || 'Untitled' });
        }
        if (node.type === 'ayah_embed' && node.attrs?.['surah']) {
          ayahs.push({ surah: node.attrs['surah'] as number, ayah: node.attrs['ayah'] as number, text: (node.attrs['text_uthmani'] as string) || '' });
        }
        if (node.content?.length) walk(node.content);
      }
    };

    walk(json.content ?? []);
    this.pageLinks.set(pages);
    this.ayahItems.set(ayahs);
  }

  loadDbLinks(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.http.get<{ links: BlockLink[] }>(`${this.API}/${id}/links/wv`).subscribe(r => {
      this.wvLinks.set(r.links ?? []);
      this.cdr.markForCheck();
    });
  }

  loadMeta(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.http.get<Record<string, unknown>>(`${this.API}/${id}`).subscribe(doc => {
      this.metaDomain   = (doc['domain']          as string) || 'general';
      this.metaDocType  = (doc['doc_type']         as string) || 'note';
      this.metaAudience = (doc['target_audience']  as string) || '';
      this.cdr.markForCheck();
    });
  }

  scrollToHeading(text: string): void {
    const editor = this.editorSvc.editor;
    if (!editor) return;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent === text) {
        editor.commands.setTextSelection(pos);
        editor.commands.scrollIntoView();
      }
    });
  }

  saveMeta(): void {
    const id = this.editorSvc.docId();
    if (!id) return;
    this.http.patch(`${this.API}/${id}`, {
      domain: this.metaDomain,
      doc_type: this.metaDocType,
      target_audience: this.metaAudience,
    }).subscribe();
  }

  navigateToDoc(docId: string): void {
    this.dismiss();
    // Navigate after modal closes
    setTimeout(() => window.location.href = `/docs/${docId}`, 300);
  }

  dismiss(): void { this.modalCtrl.dismiss(); }
}
