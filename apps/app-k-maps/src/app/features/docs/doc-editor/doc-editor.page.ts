import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  inject, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule, NavController } from '@ionic/angular';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService }   from '../services/doc-save.service';
import { DocRightPanelComponent } from '../doc-right-panel/doc-right-panel.component';
import { environment } from '../../../../environments/environment';

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'codeBlock';

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, DocRightPanelComponent],
  template: `
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" (click)="goBack()" aria-label="Back">
            <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>
          <input class="km-title-input"
                 [(ngModel)]="titleModel"
                 (ngModelChange)="onTitleChange($event)"
                 placeholder="Untitled" />
        </ion-title>

        <ion-buttons slot="end">
          <span class="km-save-dot">
            {{ editorSvc.isSaving() ? 'Saving…' : editorSvc.isDirty() ? '●' : '' }}
          </span>
          <ion-button fill="clear" (click)="openPanel()" aria-label="Document info">
            <ion-icon slot="icon-only" name="information-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- ── Writing canvas ───────────────────────────────────────────────────
         IMPORTANT: This is a plain <div>, NOT ion-content.
         ion-content's shadow scroller intercepts touch events for scroll/tap
         disambiguation even when [scrollY]="false" — that 300-400 ms hold is
         what makes caret placement feel sluggish on iOS.
         A regular overflow-y:auto div gives WKWebView unambiguous ownership
         of contenteditable tap-to-caret with zero JS involvement.

         pointerdown/pointerup instead of click: pointerup fires the moment
         the touch lifts — no synthetic-click delay, no 300 ms path. -->
    <div class="km-canvas" #scrollEl
         (pointerdown)="onCanvasPD($event)"
         (pointerup)="onCanvasPU($event)">
      <div #editorEl class="km-doc-editor-el"></div>
      <div class="km-doc-tail" (pointerup)="onTailPU($event)"></div>
    </div>

    @if (panelOpen()) {
      <div class="km-backdrop" (click)="closePanel()"></div>
      <aside class="km-sheet" (click)="$event.stopPropagation()">
        <km-doc-right-panel (closeRequested)="closePanel()"></km-doc-right-panel>
      </aside>
    }

    <!-- ── Keyboard accessory bar (Obsidian-style) ────────────────────────
         position:fixed + --kb-offset CSS var keeps it directly above the
         software keyboard on all iOS versions via visualViewport tracking.
         Two modes switch based on whether the editor has a text selection:
           • No selection  → block-structure tools (undo/redo + paragraph/heading/list)
           • Has selection → inline-mark tools (bold/italic/underline/code/link) -->
    <div class="km-bar" #accessoryBar [class.km-bar--show]="toolbarVisible()">
      <div class="km-bar-row">

        <!-- Undo / Redo — always accessible, first in row (Obsidian convention) -->
        <button class="km-b" (click)="undo()" aria-label="Undo">↩</button>
        <button class="km-b" (click)="redo()" aria-label="Redo">↪</button>

        <div class="km-sep"></div>

        @if (editorSvc.hasSelection()) {

          <!-- ── Selection mode: inline marks ──────────────────────────── -->
          <button class="km-b" [class.km-b--on]="isBold()"
                  (click)="cmd('bold')" aria-label="Bold"><b>B</b></button>
          <button class="km-b" [class.km-b--on]="isItalic()"
                  (click)="cmd('italic')" aria-label="Italic"><i>I</i></button>
          <button class="km-b" [class.km-b--on]="isUnderline()"
                  (click)="cmd('underline')" aria-label="Underline"><u>U</u></button>
          <button class="km-b" [class.km-b--on]="isStrike()"
                  (click)="cmd('strike')" aria-label="Strikethrough"><s>S</s></button>

          <div class="km-sep"></div>

          <button class="km-b" [class.km-b--on]="isCode()"
                  (click)="cmd('code')" aria-label="Inline code">&lt;/&gt;</button>
          <button class="km-b" [class.km-b--on]="isLink()"
                  (click)="setLink()" aria-label="Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
                 width="13" height="13" aria-hidden="true">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button class="km-b" (click)="clearFormatting()" aria-label="Clear formatting">✕</button>

          <div class="km-sep"></div>

          <!-- Block type still reachable in selection mode -->
          <button class="km-b" (click)="setBlock('paragraph')" aria-label="Paragraph">¶</button>
          <button class="km-b" (click)="setBlock('heading1')">H1</button>
          <button class="km-b" (click)="setBlock('heading2')">H2</button>
          <button class="km-b" (click)="setBlock('heading3')">H3</button>

        } @else {

          <!-- ── Caret mode: block structure ────────────────────────────── -->
          <button class="km-b" (click)="setBlock('paragraph')" aria-label="Paragraph">¶</button>
          <button class="km-b" (click)="setBlock('heading1')">H1</button>
          <button class="km-b" (click)="setBlock('heading2')">H2</button>
          <button class="km-b" (click)="setBlock('heading3')">H3</button>

          <div class="km-sep"></div>

          <button class="km-b" (click)="setBlock('bulletList')" aria-label="Bullet list">•</button>
          <button class="km-b" (click)="setBlock('orderedList')" aria-label="Ordered list">1.</button>
          <button class="km-b" (click)="setBlock('taskList')" aria-label="Task list">☑</button>

          <div class="km-sep"></div>

          <button class="km-b" (click)="setBlock('blockquote')" aria-label="Blockquote">❝</button>
          <button class="km-b" (click)="insertCallout()" aria-label="Callout">💡</button>
          <button class="km-b" (click)="insertDivider()" aria-label="Divider">—</button>
          <button class="km-b" (click)="setBlock('codeBlock')" aria-label="Code block">&lt;/&gt;</button>

          <div class="km-sep"></div>

          <button class="km-b" (click)="setLink()" aria-label="Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
                 width="13" height="13" aria-hidden="true">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </button>

          <div class="km-sep"></div>

          <button class="km-b" (click)="outdent()" aria-label="Outdent">⇤</button>
          <button class="km-b" (click)="indent()" aria-label="Indent">⇥</button>

        }

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      /* Explicit background prevents flicker when ion-content is absent */
      background: #080808;
    }

    /* ── Header title input ──────────────────────────────────────────── */
    .km-title-input {
      background: transparent;
      border: none;
      outline: none;
      font-size: 0.975rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.88);
      width: 100%;
      font-family: var(--ion-font-family, 'Poppins', sans-serif);
      letter-spacing: -0.005em;
    }
    .km-title-input::placeholder { color: rgba(255, 255, 255, 0.22); }

    /* ── Save indicator ──────────────────────────────────────────────── */
    .km-save-dot {
      font-size: 0.68rem;
      color: rgba(201, 168, 76, 0.6);
      padding-right: 4px;
      min-width: 14px;
      display: inline-block;
    }

    /* ── Panel backdrop + sheet ──────────────────────────────────────── */
    .km-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    .km-sheet {
      position: fixed;
      inset: auto 0 0;
      height: min(82vh, 720px);
      border-radius: 18px 18px 0 0;
      overflow: hidden;
      background: #0c0c0c;
      box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.6);
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      z-index: 201;
    }

    /* ── Tap zone below last block ───────────────────────────────────── */
    .km-doc-tail {
      min-height: 160px;
      cursor: text;
      touch-action: manipulation;
    }

    /* ── Toolbar / header buttons — eliminate 300ms hold ─────────────── */
    ion-button {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
  `]
})
export class DocEditorPage implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollEl')   scrollEl!:   ElementRef<HTMLDivElement>;
  @ViewChild('accessoryBar') accessoryBar!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private ngZone     = inject(NgZone);
  private navCtrl    = inject(NavController);

  titleModel     = '';
  toolbarVisible = signal(false);
  panelOpen      = signal(false);

  private mutationObserver: MutationObserver | null = null;
  private readonly API = `${environment.apiBase}/docs`;
  private vpRaf: number | null = null;

  // ── Active mark queries ────────────────────────────────────────────────────
  isBold()      { return this.editorSvc.editor?.isActive('bold')      ?? false; }
  isItalic()    { return this.editorSvc.editor?.isActive('italic')    ?? false; }
  isUnderline() { return this.editorSvc.editor?.isActive('underline') ?? false; }
  isStrike()    { return this.editorSvc.editor?.isActive('strike')    ?? false; }
  isCode()      { return this.editorSvc.editor?.isActive('code')      ?? false; }
  isLink()      { return this.editorSvc.editor?.isActive('link')      ?? false; }

  ngOnInit(): void {
    this.editorSvc.saveFn = () => this.saveSvc.scheduleSave();

    // Slash-command "New Page" event bubbles up from SlashCommandExtension
    this.editorEl.nativeElement.addEventListener('km:create-page', ((e: CustomEvent) => {
      this.editorSvc.createPageBlock(e.detail.pos);
    }) as EventListener);

    // Accessory bar tracks keyboard presence via focus events
    this.editorEl.nativeElement.addEventListener('focusin', () => {
      this.toolbarVisible.set(true);
      this.cdr.markForCheck();
    });
    this.editorEl.nativeElement.addEventListener('focusout', () => {
      // Small delay so toolbar doesn't flicker when focus moves between
      // the editor and an accessory bar button
      setTimeout(() => {
        if (!this.editorEl.nativeElement.contains(document.activeElement)) {
          this.toolbarVisible.set(false);
          this.cdr.markForCheck();
        }
      }, 150);
    });

    // visualViewport: lifts the accessory bar above the software keyboard.
    // Runs outside Angular zone — never triggers change detection.
    this.ngZone.runOutsideAngular(() => {
      window.visualViewport?.addEventListener('resize', this.onVpResize, { passive: true });
      window.visualViewport?.addEventListener('scroll', this.onVpResize, { passive: true });
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

          // Init + setContent outside zone: every Tiptap transaction during
          // setContent would otherwise trigger a full change-detection cycle,
          // causing seconds of main-thread freeze on a 20-block document.
          this.ngZone.runOutsideAngular(() => {
            this.editorSvc.initEditor(this.editorEl.nativeElement);
            this.editorSvc.isLoadingContent = true;
            try {
              const json = typeof doc['document_json'] === 'string'
                ? JSON.parse(doc['document_json'] as string)
                : doc['document_json'];
              this.editorSvc.editor?.commands.setContent(json as never);
            } catch { /* empty doc — editor starts blank */ }
            this.editorSvc.isLoadingContent = false;

            const words = this.editorSvc.editor?.storage['characterCount']?.words() ?? 0;
            this.editorSvc.wordCount.set(words);
          });

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
    window.visualViewport?.removeEventListener('resize', this.onVpResize);
    window.visualViewport?.removeEventListener('scroll', this.onVpResize);
    if (this.vpRaf !== null) cancelAnimationFrame(this.vpRaf);
  }

  // ── visualViewport sync — one rAF per frame ────────────────────────────────
  private onVpResize = (): void => {
    if (this.vpRaf !== null) return;
    this.vpRaf = requestAnimationFrame(() => {
      this.vpRaf = null;
      const vv     = window.visualViewport;
      const bar    = this.accessoryBar?.nativeElement;
      const scroll = this.scrollEl?.nativeElement;
      if (!vv || !bar) return;

      // How far the keyboard pushes up from the bottom of the layout viewport
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      bar.style.setProperty('--kb-offset', `${keyboardHeight}px`);

      // Pad the scroll container so the caret is never hidden behind bar + keyboard
      if (scroll) {
        scroll.style.paddingBottom = `${keyboardHeight + 52}px`;
      }
    });
  };

  // ── Editing commands ───────────────────────────────────────────────────────
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

  undo(): void { this.editorSvc.editor?.chain().focus().undo().run(); }
  redo(): void { this.editorSvc.editor?.chain().focus().redo().run(); }

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

  clearFormatting(): void {
    this.editorSvc.editor?.chain().focus().unsetAllMarks().run();
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

  // ── Pointer-first canvas tap handling ─────────────────────────────────────
  // Using pointerdown/pointerup instead of click eliminates the synthetic-click
  // delay on iOS. We track the start position so we can distinguish a tap
  // (pointer barely moved) from a scroll gesture (pointer moved >8 px).
  private _tapX = 0;
  private _tapY = 0;

  onCanvasPD(ev: PointerEvent): void {
    if (!ev.isPrimary) return;
    this._tapX = ev.clientX;
    this._tapY = ev.clientY;
  }

  /**
   * pointerup on the canvas container: place caret near the tapped spot only
   * when the tap landed outside the ProseMirror editable area (i.e. in the
   * canvas padding). Taps inside ProseMirror are handled natively by the browser
   * — we must not interfere with those.
   */
  onCanvasPU(ev: PointerEvent): void {
    if (!ev.isPrimary) return;
    // Skip if the pointer moved enough to be a scroll/drag gesture
    if (Math.abs(ev.clientX - this._tapX) > 8 ||
        Math.abs(ev.clientY - this._tapY) > 8) return;

    const target = ev.target as HTMLElement;
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    // Let native ProseMirror handling take care of taps inside the editor
    if (!pm || pm.contains(target)) return;

    const e = this.editorSvc.editor;
    if (!e) return;

    const resolved = e.view.posAtCoords({ left: ev.clientX, top: ev.clientY });
    if (resolved != null) {
      e.chain().focus().setTextSelection(resolved.pos).run();
    } else {
      e.commands.focus('end');
    }
    this.toolbarVisible.set(true);
    this.cdr.markForCheck();
  }

  /** pointerup on the tail zone — always focus end, suppress synthetic click. */
  onTailPU(ev: PointerEvent): void {
    if (!ev.isPrimary) return;
    ev.preventDefault(); // prevent the follow-up synthetic click
    this.focusEnd();
  }

  focusEnd(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    e.commands.focus('end');
    this.toolbarVisible.set(true);
    this.cdr.markForCheck();
  }

  onTitleChange(val: string): void {
    this.editorSvc.title.set(val);
    this.editorSvc.isDirty.set(true);
    this.saveSvc.scheduleSave();
  }

  /**
   * Navigate back immediately. No flush() here — ngOnDestroy handles the exit
   * save so the back button feels instant rather than waiting for the save
   * path before the animation starts. The flush guard (isDirty && !isSaving)
   * in DocSaveService prevents a duplicate PATCH if a save is already in-flight.
   *
   * Uses (click) on ion-button rather than (pointerup) because Ionic web
   * components only expose declared outputs; (click) is always valid and fires
   * with no 300 ms delay when touch-action:manipulation is set on the host.
   */
  goBack(): void {
    void this.navCtrl.navigateBack('/docs', { animated: true });
  }

  openPanel(): void  { this.panelOpen.set(true);  this.cdr.markForCheck(); }
  closePanel(): void { this.panelOpen.set(false); this.cdr.markForCheck(); }

  // ── Entry animations (CSS transitions, not GSAP) ──────────────────────────
  // GSAP ticker consumes rAF budget for ~0.8 s on a 20-block document even
  // when running outside the zone. Compositor-handled CSS transitions are free.
  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 24);
    if (blocks.length <= 1) return;

    for (const el of blocks) {
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(6px)';
      el.style.transition = 'none';
    }
    requestAnimationFrame(() => {
      for (let i = 0; i < blocks.length; i++) {
        const d = i * 20;
        blocks[i].style.transition = `opacity 0.26s ease ${d}ms, transform 0.26s ease ${d}ms`;
        blocks[i].style.opacity    = '1';
        blocks[i].style.transform  = 'translateY(0)';
      }
      setTimeout(() => {
        for (const el of blocks) {
          el.style.opacity = el.style.transform = el.style.transition = '';
        }
      }, blocks.length * 20 + 300);
    });
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;

    const animated = new WeakSet<Element>();
    const pending: HTMLElement[] = [];
    let rafId: number | null = null;

    const flush = (): void => {
      rafId = null;
      const batch = pending.splice(0);
      for (const node of batch) {
        if (node.tagName === 'HR') {
          node.style.transform  = 'scaleX(0)';
          node.style.opacity    = '0';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease';
            node.style.transform  = 'scaleX(1)';
            node.style.opacity    = '1';
            setTimeout(() => {
              node.style.transform = node.style.opacity = node.style.transition = '';
            }, 450);
          });
        } else {
          node.style.opacity    = '0';
          node.style.transform  = 'translateY(8px)';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'opacity 0.24s ease, transform 0.24s ease';
            node.style.opacity    = '1';
            node.style.transform  = 'translateY(0)';
            setTimeout(() => {
              node.style.opacity = node.style.transform = node.style.transition = '';
            }, 280);
          });
        }
      }
    };

    this.mutationObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement) || animated.has(node)) return;
          animated.add(node);
          pending.push(node);
        });
      }
      if (pending.length > 0 && rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    });
    this.mutationObserver.observe(pm, { childList: true });
  }
}
