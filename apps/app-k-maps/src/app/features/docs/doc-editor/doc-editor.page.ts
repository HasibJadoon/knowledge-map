import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef,
  ElementRef, inject, OnDestroy, signal, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { AutoDirection } from '../../quran/pages/surah-notes-page/auto-direction.extension';
import { Callout } from './tiptap-extensions/callout.extension';
import { SlashCommandExtension } from './tiptap-extensions/slash-command.extension';
import { PageLink } from './tiptap-extensions/page-link.extension';
import { AyahEmbed } from './tiptap-extensions/ayah-embed.extension';
import { VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock } from './tiptap-extensions/arabic-blocks.extension';
import {
  ClaimBlock, EvidenceBlock, ReflectionBlock,
  TaskBlock, SceneBlock, TimelineBlock,
  ComprehensionBlock, ChildrenBlock, PassageEmbed,
} from './tiptap-extensions/worldview-blocks.extension';
import { environment } from '../../../../environments/environment';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  imports: [IonicModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './doc-editor.page.html',
  styleUrl: './doc-editor.page.scss',
})
export class DocEditorPage implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost') editorHost?: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private navCtrl    = inject(NavController);
  private readonly API = `${environment.apiBase}/docs`;

  // ── Signals ────────────────────────────────────────────────────────────────
  docTitle        = signal('');
  saveState       = signal<SaveState>('idle');
  toolbarVisible  = signal(false);
  hasSelection    = signal(false);
  insertSheetOpen = signal(false);
  loading         = signal(true);

  private editor: Editor | null = null;
  private docId  = '';
  private pendingDoc: unknown = null;
  private saveTimer:  ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private vpResizeHandler: (() => void) | null = null;

  constructor() {
    // Route params in constructor so takeUntilDestroyed has an injection context
    this.route.paramMap.pipe(
      map(p => p.get('docId')),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(id => {
      if (id) {
        this.docId = id;
        void this.loadDoc(id);
      }
    });
  }

  // ── Mark state queries ─────────────────────────────────────────────────────
  isBold()      { return this.editor?.isActive('bold')      ?? false; }
  isItalic()    { return this.editor?.isActive('italic')    ?? false; }
  isUnderline() { return this.editor?.isActive('underline') ?? false; }
  isStrike()    { return this.editor?.isActive('strike')    ?? false; }
  isCode()      { return this.editor?.isActive('code')      ?? false; }
  isLink()      { return this.editor?.isActive('link')      ?? false; }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    // visualViewport.resize is the most reliable cross-platform signal for
    // keyboard open/close — the same API the slash menu uses.
    // On iOS with KeyboardResize.Ionic, visualViewport.height shrinks by the
    // full keyboard height (including the native accessory bar) when the
    // keyboard opens. A drop of >100 px from the base window height means
    // the software keyboard is visible.
    if (!window.visualViewport) return;

    this.vpResizeHandler = () => {
      const keyboardOpen = (window.innerHeight - window.visualViewport!.height) > 100;
      this.toolbarVisible.set(keyboardOpen);
      this.cdr.markForCheck();
    };
    window.visualViewport.addEventListener('resize', this.vpResizeHandler);
  }

  ngOnDestroy(): void {
    if (this.saveTimer)  clearTimeout(this.saveTimer);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.flushSave();
    this.editor?.destroy();
    if (this.vpResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.vpResizeHandler);
    }
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  private async loadDoc(id: string): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();
    try {
      const doc = await firstValueFrom(
        this.http.get<{ title?: string; document_json?: unknown }>(`${this.API}/${id}`)
      );
      this.docTitle.set(doc.title ?? '');
      const json = typeof doc.document_json === 'string'
        ? JSON.parse(doc.document_json as string)
        : doc.document_json;
      this.mountEditor(json);
    } catch { /* ignore */ }
    this.loading.set(false);
    this.cdr.markForCheck();
  }

  // ── Editor mount ───────────────────────────────────────────────────────────

  private mountEditor(content: unknown): void {
    this.editor?.destroy();
    this.editor = null;
    // Small delay so Angular can render the host element before TipTap mounts
    setTimeout(() => {
      if (!this.editorHost?.nativeElement) return;
      this.editor = new Editor({
        element: this.editorHost!.nativeElement,
        extensions: [
          StarterKit.configure({ horizontalRule: false }),
          HorizontalRule,
          Placeholder.configure({ placeholder: 'Start writing… (type / for commands)' }),
          Link.configure({ openOnClick: false }),
          Underline,
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          TaskList,
          TaskItem.configure({ nested: true }),
          AutoDirection,
          Callout,
          SlashCommandExtension,
          PageLink,
          AyahEmbed,
          VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock,
          ClaimBlock, EvidenceBlock, ReflectionBlock,
          TaskBlock, SceneBlock, TimelineBlock,
          ComprehensionBlock, ChildrenBlock, PassageEmbed,
        ],
        editable: true,
        content: (content ?? { type: 'doc', content: [] }) as never,
        onUpdate: ({ editor }) => {
          this.pendingDoc = editor.getJSON();
          this.scheduleSave();
        },
        onSelectionUpdate: ({ editor }) => {
          const { from, to } = editor.state.selection;
          this.hasSelection.set(from !== to);
          this.cdr.markForCheck();
        },
        });

      // iOS: `change` events on checkboxes inside contenteditable are unreliable.
      // Delegate `touchend` on the editor root to toggle task items reliably.
      this.editorHost!.nativeElement.addEventListener('touchend', (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.matches('input[type="checkbox"]')) {
          e.preventDefault();
          (target as HTMLInputElement).checked = !(target as HTMLInputElement).checked;
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, { passive: false });

      this.cdr.markForCheck();
    }, 80);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.doSave(), 1500);
  }

  private flushSave(): void {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    if (this.pendingDoc && this.docId) void this.doSave();
  }

  private async doSave(): Promise<void> {
    if (!this.docId || !this.pendingDoc) return;
    this.saveState.set('saving');
    this.cdr.markForCheck();
    try {
      await firstValueFrom(
        this.http.patch<unknown>(`${this.API}/${this.docId}`, {
          title: this.docTitle(),
          document_json: JSON.stringify(this.pendingDoc),
        })
      );
      this.pendingDoc = null;
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
    this.cdr.markForCheck();
    if (this.saveState() === 'saved') {
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => {
        this.saveState.set('idle');
        this.cdr.markForCheck();
      }, 2000);
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────────

  async onTitleBlur(e: Event): Promise<void> {
    const newTitle = (e.target as HTMLInputElement).value.trim();
    if (!newTitle || !this.docId) return;
    this.docTitle.set(newTitle);
    try {
      await firstValueFrom(
        this.http.patch<unknown>(`${this.API}/${this.docId}`, { title: newTitle })
      );
    } catch { /* ignore */ }
  }

  onTitleEnter(e: Event): void {
    (e.target as HTMLInputElement).blur();
    setTimeout(() => this.editor?.commands.focus('start'), 50);
  }

  // ── Editing commands ───────────────────────────────────────────────────────

  cmd(name: string): void {
    if (!this.editor) return;
    switch (name) {
      case 'bold':      this.editor.chain().focus().toggleBold().run();      break;
      case 'italic':    this.editor.chain().focus().toggleItalic().run();    break;
      case 'underline': this.editor.chain().focus().toggleUnderline().run(); break;
      case 'strike':    this.editor.chain().focus().toggleStrike().run();    break;
      case 'code':      this.editor.chain().focus().toggleCode().run();      break;
    }
    this.cdr.markForCheck();
  }

  setBlock(type: string): void {
    if (!this.editor) return;
    switch (type) {
      case 'paragraph':   this.editor.chain().focus().setParagraph().run();              break;
      case 'heading1':    this.editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'heading2':    this.editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':    this.editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bulletList':  this.editor.chain().focus().toggleBulletList().run();          break;
      case 'orderedList': this.editor.chain().focus().toggleOrderedList().run();         break;
      case 'taskList':    this.editor.chain().focus().toggleTaskList().run();            break;
      case 'blockquote':
        // toggleBlockquote uses wrapIn which fails when the cursor is inside a
        // list node (group:'listItem', not 'block'). clearNodes() lifts the node
        // to a plain paragraph first so wrapIn can always succeed.
        if (!this.editor.chain().focus().toggleBlockquote().run()) {
          this.editor.chain().focus().clearNodes().toggleBlockquote().run();
        }
        break;
    }
    this.cdr.markForCheck();
  }

  undo(): void { this.editor?.chain().focus().undo().run(); }
  redo(): void { this.editor?.chain().focus().redo().run(); }

  insertCallout(): void {
    this.editor?.chain().focus().insertContent({
      type: 'callout',
      attrs: { type: 'tip', emoji: '💡' },
      content: [{ type: 'paragraph' }],
    }).run();
  }

  insertDivider(): void {
    this.editor?.chain().focus().setHorizontalRule().run();
  }

  setLink(): void {
    if (!this.editor) return;
    if (this.editor.isActive('link')) { this.editor.chain().focus().unsetLink().run(); return; }
    const url = prompt('URL:');
    if (url) this.editor.chain().focus().setLink({ href: url }).run();
  }

  clearFormatting(): void {
    this.editor?.chain().focus().unsetAllMarks().run();
    this.cdr.markForCheck();
  }

  indent():  void { this.editor?.chain().focus().sinkListItem('listItem').run(); }
  outdent(): void { this.editor?.chain().focus().liftListItem('listItem').run(); }

  // ── Insert sheet ───────────────────────────────────────────────────────────

  openInsertSheet():  void { this.insertSheetOpen.set(true);  this.cdr.markForCheck(); }
  closeInsertSheet(): void { this.insertSheetOpen.set(false); this.cdr.markForCheck(); }

  insertFromSheet(type: string): void {
    this.closeInsertSheet();
    // Let the sheet close before the editor gets focus back
    setTimeout(() => {
      if (!this.editor) return;
      switch (type) {
        case 'heading1':    this.editor.chain().focus().setHeading({ level: 1 }).run();  break;
        case 'heading2':    this.editor.chain().focus().setHeading({ level: 2 }).run();  break;
        case 'heading3':    this.editor.chain().focus().setHeading({ level: 3 }).run();  break;
        case 'bulletList':  this.editor.chain().focus().toggleBulletList().run();        break;
        case 'orderedList': this.editor.chain().focus().toggleOrderedList().run();       break;
        case 'taskList':    this.editor.chain().focus().toggleTaskList().run();          break;
        case 'blockquote':
          if (!this.editor.chain().focus().toggleBlockquote().run()) {
            this.editor.chain().focus().clearNodes().toggleBlockquote().run();
          }
          break;
        case 'callout':     this.insertCallout();  break;
        case 'divider':     this.insertDivider();  break;
        case 'image':       this.triggerImage();   break;
      }
    }, 120);
  }

  // ── Canvas tail tap ────────────────────────────────────────────────────────

  onTailPU(ev: PointerEvent): void {
    if (!ev.isPrimary) return;
    ev.preventDefault(); // suppress follow-up synthetic click
    this.editor?.commands.focus('end');
    this.toolbarVisible.set(true);
    this.cdr.markForCheck();
  }

  // ── Image ──────────────────────────────────────────────────────────────────

  triggerImage(): void { this.imageInput?.nativeElement.click(); }

  async onImageSelected(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.docId) return;
    const form = new FormData();
    form.append('file', file);
    form.append('resource_type', 'image');
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; url: string }>(`${this.API}/${this.docId}/upload`, form)
      );
      if (res.ok && this.editor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.editor.chain().focus() as any).setImage({ src: res.url, alt: file.name }).run();
      }
    } catch { /* ignore */ }
    (e.target as HTMLInputElement).value = '';
  }

  // ── Back ───────────────────────────────────────────────────────────────────
  // Navigate immediately — ngOnDestroy handles the flush save so back feels
  // instant rather than waiting for a synchronous save path to complete.
  goBack(): void {
    void this.navCtrl.navigateBack('/docs', { animated: true });
  }
}
