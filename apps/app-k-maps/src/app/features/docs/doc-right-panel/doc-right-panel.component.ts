import {
  Component, OnInit, inject, signal,
  effect, ChangeDetectionStrategy, ChangeDetectorRef,
  EventEmitter, Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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

      <!-- ── Outline / TOC ─────────────────────────────────────────── -->
      @if (activeTab === 'outline') {
        @if (headings().length === 0) {
          <div class="km-rp-empty">
            <div class="km-rp-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
                <path d="M4 6h16M4 10h10M4 14h12M4 18h8"/>
              </svg>
            </div>
            <p>No headings yet</p>
            <small>Use H1, H2, H3 in your document</small>
          </div>
        } @else {
          <div class="km-toc">

            <div class="km-toc__meta">
              <span class="km-toc__meta-count">{{ headings().length }} heading{{ headings().length !== 1 ? 's' : '' }}</span>
            </div>

            @for (h of headings(); track h.text + $index) {
              <button class="km-toc__item"
                      [ngClass]="'km-toc__item--h' + h.level"
                      (click)="scrollToHeading(h.text)">

                @if (h.level > 1) {
                  <span class="km-toc__track"></span>
                }

                <span class="km-toc__badge"
                      [ngClass]="'km-toc__badge--h' + h.level">H{{ h.level }}</span>

                <span class="km-toc__text">{{ h.text }}</span>

                <svg class="km-toc__arrow" viewBox="0 0 8 14" fill="none"
                     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                     width="6" height="10">
                  <path d="M1 1l6 6-6 6"/>
                </svg>
              </button>
            }

          </div>
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
        <div class="km-rp-meta-list">
          <label class="km-rp-field">
            <span class="km-rp-field-label">Domain</span>
            <select class="km-rp-field-control" [(ngModel)]="metaDomain" (ngModelChange)="saveMeta()">
              <option value="general">General</option>
              <option value="quran">Quran</option>
              <option value="arabic">Arabic</option>
              <option value="worldview">Worldview</option>
              <option value="workspace">Workspace</option>
            </select>
          </label>

          <label class="km-rp-field">
            <span class="km-rp-field-label">Doc Type</span>
            <select class="km-rp-field-control" [(ngModel)]="metaDocType" (ngModelChange)="saveMeta()">
              <option value="note">Note</option>
              <option value="running_notes">Running Notes</option>
              <option value="journal">Journal</option>
              <option value="summary">Summary</option>
              <option value="tafsir">Tafsir</option>
              <option value="lesson">Lesson</option>
              <option value="analysis">Analysis</option>
              <option value="reflection">Reflection</option>
              <option value="script">Script</option>
              <option value="essay">Essay</option>
            </select>
          </label>

          <label class="km-rp-field">
            <span class="km-rp-field-label">Audience</span>
            <input class="km-rp-field-control"
                   [(ngModel)]="metaAudience"
                   (blur)="saveMeta()"
                   placeholder="e.g. general, scholars" />
          </label>

          <div class="km-rp-word-count">
            {{ editorSvc.wordCount() }} words
          </div>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .km-rp-content { --background: var(--app-page-background, #080808); }

    /* ── Empty state ────────────────────────────────────────────── */
    .km-rp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 56px 24px;
      text-align: center;
    }
    .km-rp-empty__icon {
      width: 52px; height: 52px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.3);
      margin-bottom: 4px;
    }
    .km-rp-empty p {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 500;
      color: rgba(255,255,255,0.45);
    }
    .km-rp-empty small {
      font-size: 0.76rem;
      color: rgba(255,255,255,0.25);
    }

    /* ── TOC / Outline ──────────────────────────────────────────── */
    .km-toc {
      padding: 6px 0 28px;
    }

    .km-toc__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      margin-bottom: 4px;
    }
    .km-toc__meta-count {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.28);
    }

    /* ── TOC row ────────────────────────────────────────────────── */
    .km-toc__item {
      display: flex;
      align-items: center;
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      font-family: var(--km-font-body, 'Poppins', sans-serif);
      transition: background 0.1s;
      position: relative;
    }
    .km-toc__item:active {
      background: rgba(255,255,255,0.04);
    }

    /* ── H1 row ─────────────────────────────────────────────────── */
    .km-toc__item--h1 {
      gap: 10px;
      padding: 11px 14px 11px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .km-toc__item--h1 .km-toc__text {
      font-size: 0.9rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      letter-spacing: -0.012em;
    }
    .km-toc__item--h1 .km-toc__badge--h1 {
      background: rgba(201,168,76,0.15);
      color: #c9a84c;
      border-color: rgba(201,168,76,0.28);
      font-size: 0.6rem;
    }

    /* ── H2 row ─────────────────────────────────────────────────── */
    .km-toc__item--h2 {
      gap: 9px;
      padding: 9px 14px 9px 32px;
    }
    .km-toc__item--h2 .km-toc__text {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.74);
      letter-spacing: -0.008em;
    }
    .km-toc__item--h2 .km-toc__badge--h2 {
      background: rgba(201,168,76,0.08);
      color: rgba(201,168,76,0.78);
      border-color: rgba(201,168,76,0.16);
      font-size: 0.57rem;
    }
    .km-toc__item--h2 .km-toc__track {
      position: absolute;
      left: 18px; top: 0; bottom: 0;
      width: 1.5px;
      background: rgba(201,168,76,0.22);
    }

    /* ── H3 row ─────────────────────────────────────────────────── */
    .km-toc__item--h3 {
      gap: 8px;
      padding: 8px 14px 8px 48px;
    }
    .km-toc__item--h3 .km-toc__text {
      font-size: 0.8rem;
      font-weight: 500;
      color: rgba(255,255,255,0.52);
    }
    .km-toc__item--h3 .km-toc__badge--h3 {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.38);
      border-color: rgba(255,255,255,0.09);
      font-size: 0.54rem;
    }
    .km-toc__item--h3 .km-toc__track {
      position: absolute;
      left: 18px; top: 0; bottom: 0;
      width: 1.5px;
      background: rgba(255,255,255,0.07);
    }

    /* ── H4 row ─────────────────────────────────────────────────── */
    .km-toc__item--h4 {
      gap: 8px;
      padding: 7px 14px 7px 62px;
    }
    .km-toc__item--h4 .km-toc__text {
      font-size: 0.76rem;
      font-weight: 500;
      color: rgba(255,255,255,0.38);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .km-toc__item--h4 .km-toc__badge--h4 {
      background: transparent;
      color: rgba(255,255,255,0.25);
      border-color: rgba(255,255,255,0.07);
      font-size: 0.52rem;
    }
    .km-toc__item--h4 .km-toc__track {
      position: absolute;
      left: 18px; top: 0; bottom: 0;
      width: 1.5px;
      background: rgba(255,255,255,0.05);
    }

    /* ── Shared badge ───────────────────────────────────────────── */
    .km-toc__badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 17px;
      padding: 0 4px;
      border-radius: 4px;
      border: 1px solid;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    /* ── Heading text ───────────────────────────────────────────── */
    .km-toc__text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
    }

    /* ── Chevron ────────────────────────────────────────────────── */
    .km-toc__arrow {
      flex-shrink: 0;
      color: rgba(255,255,255,0.16);
      transition: color 0.12s;
    }
    .km-toc__item:active .km-toc__arrow {
      color: rgba(201,168,76,0.55);
    }

    /* ── Links tab ──────────────────────────────────────────────── */
    .km-rp-section-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: rgba(255,255,255,0.28);
      padding: 16px 18px 6px;
    }

    .km-rp-link-item {
      --min-height: 44px;
      --padding-start: 18px;
      font-size: 0.88rem;
    }

    .km-rp-ayah-item {
      --min-height: 44px;
      --padding-start: 18px;
      .km-rp-ref {
        font-size: 0.7rem;
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

    /* ── Meta tab ───────────────────────────────────────────────── */
    .km-rp-meta-list {
      display: grid;
      gap: 14px;
      padding: 18px 16px 28px;
    }

    .km-rp-field { display: grid; gap: 7px; }

    .km-rp-field-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.42);
    }

    .km-rp-field-control {
      width: 100%;
      min-height: 44px;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      color: var(--ion-text-color, #fff);
      font: inherit;
      padding: 0.7rem 0.9rem;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .km-rp-field-control:focus {
      border-color: rgba(201,168,76,0.42);
      box-shadow: 0 0 0 2px rgba(201,168,76,0.12);
    }

    .km-rp-word-count {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.28);
      text-align: center;
      margin-top: 4px;
    }
  `]
})
export class DocRightPanelComponent implements OnInit {
  @Output() closeRequested = new EventEmitter<void>();

  readonly editorSvc = inject(DocEditorService);
  private http       = inject(HttpClient);
  readonly cdr       = inject(ChangeDetectorRef);
  private router     = inject(Router);
  private readonly API = `${environment.apiBase}/docs`;

  activeTab  = 'outline';
  headings   = signal<HeadingNode[]>([]);
  pageLinks  = signal<PageLinkItem[]>([]);
  ayahItems  = signal<AyahItem[]>([]);
  wvLinks    = signal<BlockLink[]>([]);

  metaDomain   = 'general';
  metaDocType  = 'note';
  metaAudience = '';

  private buildTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Debounced rebuild — fires at most once per 800 ms.
   * Without debounce, every keystroke triggers buildOutline() (full doc walk)
   * + buildLinks() + markForCheck(), causing per-keystroke CD cycles.
   */
  private boundBuild = () => {
    if (this.buildTimer) clearTimeout(this.buildTimer);
    this.buildTimer = setTimeout(() => {
      this.buildTimer = null;
      this.buildOutline();
      this.buildLinks();
      this.cdr.markForCheck();
    }, 800);
  };

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
    void this.router.navigate(['/docs', docId]);
  }

  dismiss(): void { this.closeRequested.emit(); }
}
