import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  inject, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService }   from '../services/doc-save.service';
import { DocRightPanelComponent } from '../doc-right-panel/doc-right-panel.component';
import { HighlightToolbarComponent } from './highlight-toolbar/highlight-toolbar.component';
import { environment } from '../../../../environments/environment';

// ── Block types the bottom toolbar can set ───────────────────────────────────
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'codeBlock';

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, HighlightToolbarComponent, DocRightPanelComponent],
  template: `
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/docs" text=""></ion-back-button>
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
    <ion-content class="km-doc-content" (click)="onContentTap($event)">
      <div #editorEl class="km-doc-editor-el"></div>
      <!-- Tap-to-focus padding area below last block -->
      <div class="km-doc-tail" (click)="focusEnd()"></div>
    </ion-content>

    @if (panelOpen()) {
      <div class="km-doc-panel-backdrop" (click)="closePanel()"></div>
      <aside class="km-doc-panel" (click)="$event.stopPropagation()">
        <km-doc-right-panel (closeRequested)="closePanel()"></km-doc-right-panel>
      </aside>
    }

    <!-- ── Floating selection bubble (always mounted, positions itself) ─── -->
    <km-highlight-toolbar></km-highlight-toolbar>

    <!-- ── Bottom formatting toolbar ─────────────────────────────────────── -->
    <ion-footer class="km-doc-footer" [class.km-doc-footer--visible]="toolbarVisible()">
      <ion-toolbar class="km-fmt-bar">
        <div class="km-fmt-scroll">

          <!-- Block type -->
          <button class="km-fmt-btn" title="Text"      (click)="setBlock('paragraph')">¶</button>
          <button class="km-fmt-btn" title="Heading 1" (click)="setBlock('heading1')">H₁</button>
          <button class="km-fmt-btn" title="Heading 2" (click)="setBlock('heading2')">H₂</button>
          <button class="km-fmt-btn" title="Heading 3" (click)="setBlock('heading3')">H₃</button>

          <div class="km-fmt-sep"></div>

          <!-- Inline marks -->
          <button class="km-fmt-btn" [class.km-fmt-btn--active]="isBold()"
                  (click)="cmd('bold')"><b>B</b></button>
          <button class="km-fmt-btn" [class.km-fmt-btn--active]="isItalic()"
                  (click)="cmd('italic')"><i>I</i></button>
          <button class="km-fmt-btn" [class.km-fmt-btn--active]="isUnderline()"
                  (click)="cmd('underline')"><u>U</u></button>
          <button class="km-fmt-btn" [class.km-fmt-btn--active]="isStrike()"
                  (click)="cmd('strike')"><s>S</s></button>
          <button class="km-fmt-btn" [class.km-fmt-btn--active]="isCode()"
                  (click)="cmd('code')">&lt;/&gt;</button>

          <div class="km-fmt-sep"></div>

          <!-- Lists -->
          <button class="km-fmt-btn" title="Bullet list"  (click)="setBlock('bulletList')">•≡</button>
          <button class="km-fmt-btn" title="Numbered list" (click)="setBlock('orderedList')">1≡</button>
          <button class="km-fmt-btn" title="Task list"    (click)="setBlock('taskList')">☑</button>

          <div class="km-fmt-sep"></div>

          <!-- Block elements -->
          <button class="km-fmt-btn" title="Blockquote"  (click)="setBlock('blockquote')">❝</button>
          <button class="km-fmt-btn" title="Callout"     (click)="insertCallout()">💡</button>
          <button class="km-fmt-btn" title="Divider"     (click)="insertDivider()">—</button>
          <button class="km-fmt-btn" title="Code block"  (click)="setBlock('codeBlock')">&#123; &#125;</button>

          <div class="km-fmt-sep"></div>

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
          <button class="km-fmt-btn" title="Indent"  (click)="indent()">⇥</button>

        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    /* ── Header title input ─────────────────────────────────────────── */
    .km-doc-title-input {
      background: transparent;
      border: none;
      outline: none;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-text-color, rgba(255,255,255,0.92));
      width: 100%;
      font-family: var(--ion-font-family, 'Poppins', sans-serif);
    }
    .km-doc-title-input::placeholder { color: rgba(255,255,255,0.28); }

    /* ── Save indicator ─────────────────────────────────────────────── */
    .km-save-label {
      font-size: 0.72rem;
      color: rgba(201,168,76,0.7);
      padding-right: 4px;
      min-width: 16px;
      display: inline-block;
    }

    /* ── Ion content background ─────────────────────────────────────── */
    .km-doc-content {
      --background: var(--ion-background-color, #080808);
    }

    /* ── Panel backdrop + slide-up panel ────────────────────────────── */
    .km-doc-panel-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 200;
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    .km-doc-panel {
      position: fixed;
      inset: auto 0 0;
      height: min(82vh, 720px);
      border-radius: 20px 20px 0 0;
      overflow: hidden;
      background: var(--ion-background-color, #080808);
      box-shadow: 0 -16px 48px rgba(0,0,0,0.55);
      border-top: 1px solid rgba(255,255,255,0.08);
      z-index: 201;
    }

    /* ── Tap-to-focus tail below last block (Apple Notes style) ─────── */
    .km-doc-tail {
      min-height: 200px;
      cursor: text;
    }

    /* ── Intentionally empty placeholder so Angular sees a non-empty styles array ─ */
    /* All .ProseMirror, .km-fmt-*, .km-doc-footer rules live in _editor.scss (global) */
    .km-_noop { display: contents; }
  `]
})
export class DocEditorPage implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private ngZone     = inject(NgZone);

  titleModel = '';
  toolbarVisible = signal(false);
  panelOpen = signal(false);

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

          /*
           * Run editor init + setContent OUTSIDE Angular zone.
           * HttpClient subscribes inside zone by default — every TipTap
           * transaction fired by setContent would otherwise trigger a full
           * Angular change-detection cycle, locking the main thread for
           * hundreds of ms per node (15+ nodes = seconds of freeze).
           */
          this.ngZone.runOutsideAngular(() => {
            this.editorSvc.initEditor(this.editorEl.nativeElement);

            // Suppress onUpdate dirty/save during initial content load
            this.editorSvc.isLoadingContent = true;
            try {
              const json = typeof doc['document_json'] === 'string'
                ? JSON.parse(doc['document_json'] as string)
                : doc['document_json'];
              this.editorSvc.editor?.commands.setContent(json as never);
            } catch { /* empty doc */ }
            this.editorSvc.isLoadingContent = false;

            // Sync word count once after load (don't need zone for signal)
            const words = this.editorSvc.editor?.storage['characterCount']?.words() ?? 0;
            this.editorSvc.wordCount.set(words);
          });

          // Re-enter zone for UI update + animations
          this.cdr.markForCheck();
          requestAnimationFrame(() => {
            this.animateContentIn();
            this.watchForNewBlocks();
          });
        });
      } else {
        this.ngZone.runOutsideAngular(() => {
          this.editorSvc.initEditor(this.editorEl.nativeElement);
        });
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
      case 'paragraph':   e.chain().focus().setParagraph().run();              break;
      case 'heading1':    e.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'heading2':    e.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':    e.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bulletList':  e.chain().focus().toggleBulletList().run();          break;
      case 'orderedList': e.chain().focus().toggleOrderedList().run();         break;
      case 'taskList':    e.chain().focus().toggleTaskList().run();            break;
      case 'blockquote':  e.chain().focus().toggleBlockquote().run();          break;
      case 'codeBlock':   e.chain().focus().toggleCodeBlock().run();           break;
    }
    this.cdr.markForCheck();
  }

  insertCallout(): void {
    this.editorSvc.editor?.chain().focus().insertContent({
      type: 'callout',
      attrs: { type: 'tip', emoji: '💡' },
      content: [{ type: 'paragraph' }],
    }).run();
  }

  insertDivider(): void {
    this.editorSvc.editor?.chain().focus().setHorizontalRule().run();
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

  /**
   * Tap on ion-content area outside the editor (not on a block) → focus end.
   * Also re-shows keyboard if iOS dismissed it while editor was still "focused".
   */
  onContentTap(e: Event): void {
    const target = e.target as HTMLElement;
    // Only act when the tap is outside the ProseMirror content itself
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (pm?.contains(target)) return;
    this.focusEnd();
  }

  /** Focus at end of document — shows keyboard + places caret after last block. */
  focusEnd(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    // .focus('end') positions the caret at the very end of the document
    e.commands.focus('end');
    this.toolbarVisible.set(true);
    this.cdr.markForCheck();
  }

  // ── Right panel ────────────────────────────────────────────────────────────
  openPanel(): void {
    this.panelOpen.set(true);
    this.cdr.markForCheck();
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.cdr.markForCheck();
  }

  // ── Animations ────────────────────────────────────────────────────────────
  /**
   * Fade-in blocks using CSS transitions, not GSAP.
   * GSAP's global ticker runs outside Angular zone but still consumes rAF
   * budget for ~0.8 s on a 20-block document.  CSS transitions are handled
   * by the compositor thread and have no JS rAF cost.
   */
  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 24) as HTMLElement[];
    if (blocks.length <= 1) return;

    // Prime: hide all blocks (synchronous — happens before paint)
    for (const el of blocks) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'none';
    }

    // On next paint: start CSS transitions with staggered delay
    requestAnimationFrame(() => {
      for (let i = 0; i < blocks.length; i++) {
        const delay = i * 20; // 20 ms stagger
        blocks[i].style.transition = `opacity 0.26s ease ${delay}ms, transform 0.26s ease ${delay}ms`;
        blocks[i].style.opacity    = '1';
        blocks[i].style.transform  = 'translateY(0)';
      }
      // Strip inline styles once animation is done so they don't interfere
      const cleanup = blocks.length * 20 + 300;
      setTimeout(() => {
        for (const el of blocks) {
          el.style.opacity    = '';
          el.style.transform  = '';
          el.style.transition = '';
        }
      }, cleanup);
    });
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;

    const animated = new WeakSet<Element>();
    // Pending nodes accumulated across a burst of mutations — animated in one rAF
    const pending: HTMLElement[] = [];
    let rafId: number | null = null;

    const flush = () => {
      rafId = null;
      const batch = pending.splice(0); // drain
      for (const node of batch) {
        if (node.tagName === 'HR') {
          node.style.transform  = 'scaleX(0)';
          node.style.opacity    = '0';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease';
            node.style.transform  = 'scaleX(1)';
            node.style.opacity    = '1';
            setTimeout(() => { node.style.transform = ''; node.style.opacity = ''; node.style.transition = ''; }, 450);
          });
        } else {
          node.style.opacity    = '0';
          node.style.transform  = 'translateY(8px)';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'opacity 0.24s ease, transform 0.24s ease';
            node.style.opacity    = '1';
            node.style.transform  = 'translateY(0)';
            setTimeout(() => { node.style.opacity = ''; node.style.transform = ''; node.style.transition = ''; }, 280);
          });
        }
      }
    };

    this.mutationObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (animated.has(node)) return;
          animated.add(node);
          pending.push(node);
        });
      }
      // Batch all mutations arriving in the same frame into a single rAF
      if (pending.length > 0 && rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    });
    this.mutationObserver.observe(pm, { childList: true });
  }
}
