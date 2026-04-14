import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  inject, ChangeDetectionStrategy, ChangeDetectorRef, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule, ModalController } from '@ionic/angular';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService }   from '../services/doc-save.service';
import { DocRightPanelComponent } from '../doc-right-panel/doc-right-panel.component';
import { HighlightToolbarComponent } from './highlight-toolbar/highlight-toolbar.component';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

// ── Block types the bottom toolbar can set ───────────────────────────────────
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock';

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, HighlightToolbarComponent],
  template: `
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/docs" text="Docs"></ion-back-button>
        </ion-buttons>

        <ion-title>
          <input class="km-doc-title-input"
                 [(ngModel)]="titleModel"
                 (ngModelChange)="onTitleChange($event)"
                 placeholder="Untitled" />
        </ion-title>

        <ion-buttons slot="end">
          <span class="km-save-label">
            {{ editorSvc.isSaving() ? 'Saving…' : editorSvc.isDirty() ? '●' : '' }}
          </span>
          <ion-button fill="clear" (click)="openPanel()">
            <ion-icon slot="icon-only" name="information-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- ── Editor canvas ──────────────────────────────────────────────────── -->
    <ion-content class="km-doc-content">
      <div #editorEl class="km-doc-editor-el"></div>
    </ion-content>

    <!-- ── Floating selection bubble (always mounted, positions itself) ─── -->
    <km-highlight-toolbar></km-highlight-toolbar>

    <!-- ── Bottom formatting toolbar ─────────────────────────────────────── -->
    <ion-footer class="km-doc-footer" [class.km-doc-footer--visible]="toolbarVisible()">
      <ion-toolbar class="km-fmt-bar">
        <div class="km-fmt-scroll">

          <!-- Block type -->
          <button class="km-fmt-btn" title="Text" (click)="setBlock('paragraph')">¶</button>
          <button class="km-fmt-btn" title="H1" (click)="setBlock('heading1')">H₁</button>
          <button class="km-fmt-btn" title="H2" (click)="setBlock('heading2')">H₂</button>
          <button class="km-fmt-btn" title="H3" (click)="setBlock('heading3')">H₃</button>

          <div class="km-fmt-sep"></div>

          <!-- Inline marks -->
          <button class="km-fmt-btn km-fmt-btn--bold"
                  [class.km-fmt-btn--active]="isBold()" (click)="cmd('bold')"><b>B</b></button>
          <button class="km-fmt-btn km-fmt-btn--italic"
                  [class.km-fmt-btn--active]="isItalic()" (click)="cmd('italic')"><i>I</i></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isUnderline()" (click)="cmd('underline')"><u>U</u></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isStrike()" (click)="cmd('strike')"><s>S</s></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isCode()" (click)="cmd('code')">&lt;/&gt;</button>

          <div class="km-fmt-sep"></div>

          <!-- Lists -->
          <button class="km-fmt-btn" title="Bullet list" (click)="setBlock('bulletList')">•≡</button>
          <button class="km-fmt-btn" title="Numbered list" (click)="setBlock('orderedList')">1≡</button>

          <div class="km-fmt-sep"></div>

          <!-- Blockquote -->
          <button class="km-fmt-btn" title="Blockquote" (click)="setBlock('blockquote')">❝</button>

          <!-- Link -->
          <button class="km-fmt-btn" title="Link" (click)="setLink()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>

          <div class="km-fmt-sep"></div>

          <!-- Indent / Outdent -->
          <button class="km-fmt-btn" title="Outdent" (click)="outdent()">⇤</button>
          <button class="km-fmt-btn" title="Indent" (click)="indent()">⇥</button>

        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    /* ── Header ──────────────────────────────────────────────────────── */
    .km-doc-title-input {
      background: transparent;
      border: none;
      outline: none;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-text-color, #fff);
      width: 100%;
      font-family: var(--km-font-body, 'Poppins', sans-serif);
      &::placeholder { color: rgba(255,255,255,0.3); }
    }

    .km-save-label {
      font-size: 0.72rem;
      color: rgba(201,168,76,0.7);
      padding-right: 4px;
    }

    /* ── Editor canvas ───────────────────────────────────────────────── */
    .km-doc-content {
      --background: var(--app-page-background, #080808);
    }

    .km-doc-editor-el {
      padding: 20px 20px 100px;

      /* ── ProseMirror core ─────────────────────────────────────────── */
      :global(.ProseMirror) {
        outline: none;
        min-height: 60vh;
        font-size: 1.02rem;
        line-height: 1.85;
        color: var(--ion-text-color, rgba(255,255,255,0.88));
        font-family: var(--km-font-body, 'Poppins', sans-serif);
        caret-color: #c9a84c;
      }

      :global(.ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        color: rgba(255,255,255,0.25);
        pointer-events: none;
        float: left;
        height: 0;
        font-style: italic;
      }

      :global(.ProseMirror p) { margin: 0.2em 0 0.8em; }

      :global(.ProseMirror h1) {
        font-size: 1.75rem; font-weight: 800; line-height: 1.25;
        margin: 1.2em 0 0.35em; letter-spacing: -0.02em;
        background: linear-gradient(135deg, var(--ion-text-color, #e0e0e0) 60%, rgba(201,168,76,0.65) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      :global(.ProseMirror h2) {
        font-size: 1.3rem; font-weight: 700; line-height: 1.3;
        margin: 1.1em 0 0.3em; color: rgba(255,255,255,0.92);
      }
      :global(.ProseMirror h3) {
        font-size: 1.08rem; font-weight: 600; line-height: 1.4;
        margin: 1em 0 0.25em; color: rgba(255,255,255,0.82);
      }
      :global(.ProseMirror h4) {
        font-size: 0.78rem; font-weight: 600; margin: 0.9em 0 0.2em;
        color: rgba(201,168,76,0.78); letter-spacing: 0.04em; text-transform: uppercase;
      }

      :global(.ProseMirror blockquote) {
        border-left: 3px solid #c9a84c;
        padding: 0.5em 1em 0.5em 1.1em; margin: 0.9em 0;
        color: rgba(255,255,255,0.75); font-style: italic;
        background: linear-gradient(90deg, rgba(201,168,76,0.07) 0%, transparent 100%);
        border-radius: 0 7px 7px 0;
      }
      :global(.ProseMirror blockquote p) { margin: 0; }

      :global(.ProseMirror pre) {
        background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.07);
        border-radius: 8px; padding: 0.9em 1.1em; margin: 0.7em 0;
        font-size: 0.85rem; line-height: 1.7; overflow-x: auto;
      }
      :global(.ProseMirror code) {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 4px; padding: 0.12em 0.38em; font-size: 0.875em;
        font-family: 'JetBrains Mono', monospace;
      }
      :global(.ProseMirror pre code) { background: none; border: none; padding: 0; }

      :global(.ProseMirror ul), :global(.ProseMirror ol) { padding-left: 1.6em; margin: 0.5em 0; }
      :global(.ProseMirror ul) { list-style-type: disc !important; }
      :global(.ProseMirror ol) { list-style-type: decimal !important; }
      :global(.ProseMirror li) { margin: 0.25em 0; line-height: 1.8; }
      :global(.ProseMirror ul li::marker) { color: rgba(201,168,76,0.75); font-size: 0.85em; }
      :global(.ProseMirror ol li::marker) { color: rgba(201,168,76,0.7); font-weight: 700; }
      :global(.ProseMirror ul ul) { list-style-type: circle !important; }
      :global(.ProseMirror ul ul ul) { list-style-type: square !important; }

      :global(.ProseMirror hr) {
        border: none; margin: 2em 0; height: 1px; position: relative; overflow: visible;
        &::before {
          content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.12) 10%, rgba(201,168,76,0.55) 40%, rgba(201,168,76,0.55) 60%, rgba(201,168,76,0.12) 90%, transparent 100%);
        }
        &::after {
          content: '✦'; position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%); font-size: 0.52rem;
          color: rgba(201,168,76,0.7); background: var(--app-page-background, #080808); padding: 0 10px; letter-spacing: 6px;
        }
      }

      :global(.ProseMirror a) {
        color: rgba(201,168,76,0.9); text-decoration: underline;
        text-decoration-color: rgba(201,168,76,0.35); text-underline-offset: 3px;
      }

      :global(.ProseMirror mark) { border-radius: 3px; padding: 0.05em 0.2em; }
      :global(.ProseMirror strong) { font-weight: 700; color: rgba(255,255,255,0.95); }
      :global(.ProseMirror em) { font-style: italic; color: rgba(255,255,255,0.85); }

      /* ── Arabic auto-direction (paragraphs/headings only, not embed blocks) ── */
      :global(.ProseMirror p[dir="rtl"]),
      :global(.ProseMirror h1[dir="rtl"]),
      :global(.ProseMirror h2[dir="rtl"]),
      :global(.ProseMirror h3[dir="rtl"]),
      :global(.ProseMirror li[dir="rtl"]),
      :global(.ProseMirror blockquote[dir="rtl"]) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif) !important;
        font-size: 1.25rem;
        line-height: 2.1;
        letter-spacing: 0;
        word-spacing: 0.04em;
        text-align: right;
      }

      /* ── Ayah embed — tighter on mobile ─────────────────────────────── */
      :global(.ProseMirror .km-block--ayah .ayah-text) {
        font-family: var(--km-font-arabic, 'Uthmanic Hafs', serif) !important;
        font-size: 1.25rem !important;
        line-height: 1.95 !important;
        text-align: right;
      }

      /* ── Block selected ─────────────────────────────────────────────── */
      :global(.ProseMirror-selectednode) {
        outline: 2px solid rgba(201,168,76,0.4) !important;
        border-radius: 4px;
      }
    }

    /* ── Bottom formatting bar ────────────────────────────────────────── */
    .km-doc-footer {
      transform: translateY(100%);
      transition: transform 0.22s ease;
      &--visible { transform: translateY(0); }
    }

    .km-fmt-bar {
      --background: #131313;
      --border-color: rgba(255,255,255,0.08);
      --border-width: 1px 0 0 0;
    }

    .km-fmt-scroll {
      display: flex;
      align-items: center;
      gap: 2px;
      overflow-x: auto;
      padding: 4px 12px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .km-fmt-btn {
      flex-shrink: 0;
      min-width: 36px;
      height: 36px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.65);
      border-radius: 6px;
      font-size: 0.88rem;
      cursor: pointer;
      transition: background 0.1s, color 0.1s;

      &:active, &--active {
        background: rgba(201,168,76,0.12);
        color: #c9a84c;
      }

      &--bold  b  { font-weight: 700; }
      &--italic i { font-style: italic; }

      svg { display: block; }
    }

    .km-fmt-sep {
      width: 1px; height: 22px; flex-shrink: 0;
      background: rgba(255,255,255,0.1); margin: 0 3px;
    }
  `]
})
export class DocEditorPage implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private modalCtrl  = inject(ModalController);
  private router     = inject(Router);

  titleModel = '';
  toolbarVisible = signal(false);

  private mutationObserver: MutationObserver | null = null;
  private readonly API = `${environment.apiBase}/docs`;

  // ── Computed editor state ───────────────────────────────────────────────
  isBold()      { return this.editorSvc.editor?.isActive('bold')      ?? false; }
  isItalic()    { return this.editorSvc.editor?.isActive('italic')    ?? false; }
  isUnderline() { return this.editorSvc.editor?.isActive('underline') ?? false; }
  isStrike()    { return this.editorSvc.editor?.isActive('strike')    ?? false; }
  isCode()      { return this.editorSvc.editor?.isActive('code')      ?? false; }

  ngOnInit(): void {
    this.editorSvc.saveFn = () => this.saveSvc.scheduleSave();

    // Handle slash command "New Page"
    this.editorEl.nativeElement.addEventListener('km:create-page', ((e: CustomEvent) => {
      this.editorSvc.createPageBlock(e.detail.pos);
    }) as EventListener);

    // Show toolbar when editor is focused
    this.editorEl.nativeElement.addEventListener('focusin', () => {
      this.toolbarVisible.set(true);
      this.cdr.markForCheck();
    });
    this.editorEl.nativeElement.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!this.editorEl.nativeElement.contains(document.activeElement)) {
          this.toolbarVisible.set(false);
          this.cdr.markForCheck();
        }
      }, 150);
    });

    this.route.paramMap.subscribe(params => {
      const docId = params.get('docId');

      this.mutationObserver?.disconnect();
      this.mutationObserver = null;
      this.editorSvc.destroyEditor();

      if (docId) {
        this.editorSvc.docId.set(docId);
        this.http.get<Record<string, unknown>>(`${this.API}/${docId}`).subscribe(doc => {
          const title = (doc['title'] as string) ?? 'Untitled';
          this.editorSvc.title.set(title);
          this.titleModel = title;
          this.editorSvc.initEditor(this.editorEl.nativeElement);
          try {
            const json = typeof doc['document_json'] === 'string'
              ? JSON.parse(doc['document_json'] as string)
              : doc['document_json'];
            this.editorSvc.editor?.commands.setContent(json as never);
          } catch { /* empty doc */ }
          this.cdr.markForCheck();
          requestAnimationFrame(() => {
            this.animateContentIn();
            this.watchForNewBlocks();
          });
        });
      } else {
        this.editorSvc.initEditor(this.editorEl.nativeElement);
        requestAnimationFrame(() => this.animateContentIn());
      }
    });
  }

  ngOnDestroy(): void {
    this.editorSvc.saveFn = null;
    this.mutationObserver?.disconnect();
    this.saveSvc.flush();
    this.editorSvc.destroyEditor();
  }

  onTitleChange(val: string): void {
    this.editorSvc.title.set(val);
    this.editorSvc.isDirty.set(true);
    this.saveSvc.scheduleSave();
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  cmd(name: string): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (name) {
      case 'bold':      e.chain().focus().toggleBold().run();      break;
      case 'italic':    e.chain().focus().toggleItalic().run();    break;
      case 'underline': e.chain().focus().toggleUnderline().run(); break;
      case 'strike':    e.chain().focus().toggleStrike().run();    break;
      case 'code':      e.chain().focus().toggleCode().run();      break;
    }
    this.cdr.markForCheck();
  }

  setBlock(type: BlockType): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (type) {
      case 'paragraph':    e.chain().focus().setParagraph().run(); break;
      case 'heading1':     e.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'heading2':     e.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':     e.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bulletList':   e.chain().focus().toggleBulletList().run(); break;
      case 'orderedList':  e.chain().focus().toggleOrderedList().run(); break;
      case 'blockquote':   e.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock':    e.chain().focus().toggleCodeBlock().run(); break;
    }
    this.cdr.markForCheck();
  }

  setLink(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    if (e.isActive('link')) { e.chain().focus().unsetLink().run(); return; }
    const url = prompt('URL:');
    if (url) e.chain().focus().setLink({ href: url }).run();
  }

  indent():  void { this.editorSvc.editor?.chain().focus().sinkListItem('listItem').run(); }
  outdent(): void { this.editorSvc.editor?.chain().focus().liftListItem('listItem').run(); }

  // ── Right panel (ion-modal) ───────────────────────────────────────────────
  async openPanel(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DocRightPanelComponent,
      breakpoints: [0, 0.45, 0.75, 1],
      initialBreakpoint: 0.75,
      handle: true,
    });
    await modal.present();
  }

  // ── Animations ────────────────────────────────────────────────────────────
  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 20);
    if (blocks.length <= 1) return;
    requestAnimationFrame(() => {
      gsap.fromTo(blocks,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    });
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;
    const animated = new WeakSet<Element>();
    this.mutationObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement) || node.tagName !== 'HR') return;
          if (animated.has(node)) return;
          animated.add(node);
          gsap.fromTo(node,
            { scaleX: 0, opacity: 0 },
            { scaleX: 1, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' }
          );
        });
      }
    });
    this.mutationObserver.observe(pm, { childList: true });
  }
}
