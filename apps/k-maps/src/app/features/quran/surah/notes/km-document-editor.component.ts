import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef,
  EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { KmDocumentToolbarComponent } from './km-document-toolbar.component';
import { KmSlashMenuComponent } from './km-slash-menu.component';
import { KmLinkDialogComponent } from './km-link-dialog.component';
import { Callout } from './extensions/callout.extension';
import { SlashCommand } from './extensions/slash-command.extension';
import type { TiptapDoc } from '../../../../shared/models/document-editor.models';

@Component({
  selector: 'km-document-editor',
  standalone: true,
  imports: [KmDocumentToolbarComponent, KmSlashMenuComponent, KmLinkDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-editor-wrap">
      <km-document-toolbar
        [editor]="editor"
        (linkClick)="openLinkDialog()"
        (imageClick)="triggerImageUpload()"
        (audioClick)="triggerAudioUpload()">
      </km-document-toolbar>

      <div class="km-editor-body">
        <!-- Link dialog anchored below toolbar -->
        @if (linkDialogOpen()) {
          <div class="km-link-dialog-anchor">
            <km-link-dialog
              [show]="linkDialogOpen()"
              [existingUrl]="currentLinkUrl()"
              [hasLink]="!!currentLinkUrl()"
              (confirmed)="applyLink($event)"
              (removed)="removeLink()"
              (cancelled)="linkDialogOpen.set(false)">
            </km-link-dialog>
          </div>
        }

        <div class="km-editor-host" #editorHost></div>
      </div>

      <!-- Slash command floating menu -->
      <km-slash-menu
        [editor]="editor"
        [open]="slashOpen()"
        [queryText]="slashQuery()"
        [anchorTop]="slashTop()"
        [anchorLeft]="slashLeft()"
        (closed)="closeSlash()">
      </km-slash-menu>
    </div>

    <!-- Hidden file inputs -->
    <input #imageInput type="file" accept="image/*" hidden (change)="onImageSelected($event)" />
    <input #audioInput type="file" accept="audio/*" hidden (change)="onAudioSelected($event)" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .km-editor-wrap {
      display: flex; flex-direction: column;
      height: 100%; overflow: hidden;
      position: relative;
    }
    .km-editor-body { flex: 1; overflow-y: auto; position: relative; }
    .km-link-dialog-anchor {
      position: sticky; top: 0; z-index: 100;
      display: flex; justify-content: center;
      padding: 8px 0;
      pointer-events: none;
    }
    .km-link-dialog-anchor > * { pointer-events: all; }

    .km-editor-host { height: 100%; }

    :host ::ng-deep .ProseMirror {
      min-height: calc(100vh - 200px);
      padding: 2.4rem 3rem;
      outline: none;
      font-family: 'EB Garamond', 'Palatino Linotype', Georgia, serif;
      font-size: 1.06rem;
      line-height: 1.85;
      color: var(--km-text, rgba(236,228,216,0.92));
      caret-color: var(--km-gold, #c9a84c);
      max-width: 720px;
      margin: 0 auto;
    }

    /* Placeholder */
    :host ::ng-deep .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left; color: rgba(200,190,175,0.3);
      pointer-events: none; height: 0; font-style: italic;
    }

    /* Typography */
    :host ::ng-deep .ProseMirror p { margin: 0 0 1em; }
    :host ::ng-deep .ProseMirror h1 {
      font-size: 1.72rem; margin: 1.5em 0 0.6em;
      color: var(--km-text, rgba(236,228,216,0.98));
      letter-spacing: 0.02em; font-weight: 600;
      border-bottom: 1px solid var(--km-border, rgba(255,255,255,0.08));
      padding-bottom: 0.3em;
    }
    :host ::ng-deep .ProseMirror h2 {
      font-size: 1.32rem; margin: 1.3em 0 0.5em;
      color: var(--km-text, rgba(236,228,216,0.96)); font-weight: 600;
    }
    :host ::ng-deep .ProseMirror h3 {
      font-size: 1.08rem; margin: 1.1em 0 0.4em;
      color: var(--km-gold, #c9a84c); font-weight: 600;
    }
    :host ::ng-deep .ProseMirror blockquote {
      border-left: 3px solid var(--km-border-gold, rgba(201,168,76,0.4));
      margin: 1.2em 0; padding: 0.6em 1.2em;
      color: rgba(220,210,195,0.72); font-style: italic;
    }
    :host ::ng-deep .ProseMirror ul,
    :host ::ng-deep .ProseMirror ol { padding-left: 1.6em; margin: 0.6em 0; }
    :host ::ng-deep .ProseMirror li { margin-bottom: 0.3em; }
    :host ::ng-deep .ProseMirror strong { color: var(--km-text); font-weight: 600; }
    :host ::ng-deep .ProseMirror em { color: rgba(220,196,155,0.85); }
    :host ::ng-deep .ProseMirror u { text-decoration-color: rgba(201,168,76,0.5); }
    :host ::ng-deep .ProseMirror s { opacity: 0.55; }
    :host ::ng-deep .ProseMirror code {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(201,168,76,0.12);
      padding: 0.13em 0.42em; border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.84em; color: rgba(201,168,76,0.88);
    }
    :host ::ng-deep .ProseMirror pre {
      background: rgba(0,0,0,0.36); border: 1px solid rgba(201,168,76,0.1);
      padding: 1em 1.3em; overflow-x: auto; border-radius: 4px;
    }
    :host ::ng-deep .ProseMirror pre code {
      background: none; border: none; padding: 0; font-size: 0.88rem;
    }
    :host ::ng-deep .ProseMirror hr {
      border: none; border-top: 1px solid var(--km-border, rgba(255,255,255,0.1));
      margin: 2.2em 0;
    }
    :host ::ng-deep .ProseMirror a {
      color: var(--km-gold, #c9a84c); text-decoration: underline;
      text-decoration-color: rgba(201,168,76,0.4);
    }
    :host ::ng-deep .ProseMirror img {
      max-width: 100%; border-radius: 4px;
      border: 1px solid var(--km-border);
      margin: 0.8em 0;
    }
    :host ::ng-deep .ProseMirror ::selection { background: rgba(201,168,76,0.2); }

    /* Callout */
    :host ::ng-deep .km-callout {
      display: flex; gap: 12px;
      background: rgba(201,168,76,0.06);
      border-left: 3px solid var(--km-gold, #c9a84c);
      border-radius: 0 6px 6px 0;
      padding: 12px 14px; margin: 1.2em 0;
    }
    :host ::ng-deep .km-callout[data-callout-type="warning"] {
      background: rgba(224,160,80,0.06);
      border-left-color: #e0a050;
    }
    :host ::ng-deep .km-callout[data-callout-type="definition"] {
      background: rgba(100,160,220,0.06);
      border-left-color: #64a0dc;
    }
    :host ::ng-deep .km-callout__icon {
      font-size: 1.1rem; flex-shrink: 0; padding-top: 2px;
    }
    :host ::ng-deep .km-callout__body { flex: 1; }
    :host ::ng-deep .km-callout__body p:last-child { margin-bottom: 0; }
  `],
})
export class KmDocumentEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('audioInput') audioInput!: ElementRef<HTMLInputElement>;

  @Input() doc: TiptapDoc | null = null;
  @Input() placeholder = 'Start writing… type / for commands';
  @Input() editable = true;

  @Output() docChange   = new EventEmitter<TiptapDoc>();
  @Output() editorReady = new EventEmitter<Editor>();
  @Output() imageUpload = new EventEmitter<File>();
  @Output() audioUpload = new EventEmitter<File>();

  editor: Editor | null = null;

  // Slash menu state
  slashOpen  = signal(false);
  slashQuery = signal('');
  slashTop   = signal(0);
  slashLeft  = signal(0);

  // Link dialog state
  linkDialogOpen  = signal(false);
  currentLinkUrl  = signal('');

  private cdr = inject(ChangeDetectorRef);
  private suppressUpdate = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: this.placeholder }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        Underline,
        Callout,
        SlashCommand,
      ],
      editable: this.editable,
      content: this.doc ?? { type: 'doc', content: [] },
      onUpdate: ({ editor }) => {
        if (this.suppressUpdate) return;
        this.docChange.emit(editor.getJSON() as TiptapDoc);
      },
    });

    // Listen for slash command events from ProseMirror plugin
    this.editorHost.nativeElement.addEventListener('km-slash-open', (e: Event) => {
      const detail = (e as CustomEvent).detail as { query: string };
      this.slashQuery.set(detail.query ?? '');
      this.slashOpen.set(true);
      this.positionSlashMenu();
      this.cdr.markForCheck();
    });

    this.editorHost.nativeElement.addEventListener('km-slash-close', () => {
      this.slashOpen.set(false);
      this.cdr.markForCheck();
    });

    this.editorReady.emit(this.editor);
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['doc'] && this.editor && !ch['doc'].firstChange) {
      const incoming = ch['doc'].currentValue as TiptapDoc | null;
      const current = this.editor.getJSON() as TiptapDoc;
      if (JSON.stringify(incoming) !== JSON.stringify(current)) {
        this.suppressUpdate = true;
        this.editor.commands.setContent(incoming ?? { type: 'doc', content: [] });
        this.suppressUpdate = false;
      }
    }
    if (ch['editable'] && this.editor) {
      this.editor.setEditable(this.editable);
    }
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.editor?.destroy();
  }

  // ── Slash menu ─────────────────────────────────────────────────────────────

  private positionSlashMenu(): void {
    if (!this.editor) return;
    const { view } = this.editor;
    const { from } = view.state.selection;
    const coords = view.coordsAtPos(from);
    this.slashTop.set(coords.bottom + 6);
    this.slashLeft.set(Math.min(coords.left, window.innerWidth - 300));
  }

  closeSlash(): void {
    this.slashOpen.set(false);
    this.editor?.commands.focus();
  }

  // ── Link dialog ────────────────────────────────────────────────────────────

  openLinkDialog(): void {
    const url = this.editor?.getAttributes('link')['href'] as string ?? '';
    this.currentLinkUrl.set(url);
    this.linkDialogOpen.set(true);
  }

  applyLink(url: string): void {
    this.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    this.linkDialogOpen.set(false);
  }

  removeLink(): void {
    this.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    this.linkDialogOpen.set(false);
  }

  // ── File upload triggers ───────────────────────────────────────────────────

  triggerImageUpload(): void { this.imageInput?.nativeElement.click(); }
  triggerAudioUpload(): void { this.audioInput?.nativeElement.click(); }

  onImageSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) { this.imageUpload.emit(file); (e.target as HTMLInputElement).value = ''; }
  }

  onAudioSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) { this.audioUpload.emit(file); (e.target as HTMLInputElement).value = ''; }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  insertImageUrl(url: string, alt = ''): void {
    // Insert image as an HTML img wrapped in a paragraph since @tiptap/extension-image is not installed
    this.editor?.chain().focus().insertContent(`<img src="${url}" alt="${alt}" />`).run();
  }

  focus(): void { this.editor?.commands.focus(); }
  getJSON(): TiptapDoc | null { return this.editor?.getJSON() as TiptapDoc ?? null; }
}
