import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { TiptapDoc } from './models/planner.models';

@Component({
  selector: 'km-capture-tiptap-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="tiptap-host" #editorHost></div>`,
  styles: [`
    :host { display: block; height: 100%; }
    .tiptap-host { height: 100%; overflow-y: auto; cursor: text; }
    :host ::ng-deep .ProseMirror {
      min-height: 100%;
      padding: 2rem 2.4rem;
      outline: none;
      font-family: 'EB Garamond', serif;
      font-size: 1.08rem;
      line-height: 1.84;
      color: rgba(248, 238, 218, 0.94);
      caret-color: rgba(226, 196, 141, 0.9);
    }
    :host ::ng-deep .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: rgba(214, 203, 184, 0.36);
      pointer-events: none;
      height: 0;
      font-style: italic;
    }
    :host ::ng-deep .ProseMirror p { margin: 0 0 1em; }
    :host ::ng-deep .ProseMirror h1 { font-size: 1.6rem; margin: 1.4em 0 0.6em; color: rgba(248, 238, 218, 0.98); letter-spacing: 0.03em; }
    :host ::ng-deep .ProseMirror h2 { font-size: 1.28rem; margin: 1.2em 0 0.5em; color: rgba(248, 238, 218, 0.94); }
    :host ::ng-deep .ProseMirror h3 { font-size: 1.08rem; margin: 1em 0 0.4em; color: rgba(226, 196, 141, 0.88); }
    :host ::ng-deep .ProseMirror blockquote {
      border-left: 3px solid rgba(226, 196, 141, 0.38);
      margin: 1em 0;
      padding: 0.5em 1em;
      color: rgba(214, 203, 184, 0.76);
      font-style: italic;
    }
    :host ::ng-deep .ProseMirror ul, :host ::ng-deep .ProseMirror ol { padding-left: 1.5em; margin: 0.6em 0; }
    :host ::ng-deep .ProseMirror li { margin-bottom: 0.3em; }
    :host ::ng-deep .ProseMirror strong { color: rgba(248, 238, 218, 0.98); font-weight: 600; }
    :host ::ng-deep .ProseMirror em { color: rgba(226, 196, 141, 0.86); }
    :host ::ng-deep .ProseMirror code {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(226, 196, 141, 0.12);
      padding: 0.15em 0.45em;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.86em;
      color: rgba(226, 196, 141, 0.88);
    }
    :host ::ng-deep .ProseMirror pre {
      background: rgba(0, 0, 0, 0.34);
      border: 1px solid rgba(226, 196, 141, 0.1);
      padding: 1em 1.2em;
      border-radius: 0;
      overflow-x: auto;
    }
    :host ::ng-deep .ProseMirror pre code { background: none; border: none; padding: 0; font-size: 0.88rem; }
    :host ::ng-deep .ProseMirror hr {
      border: none;
      border-top: 1px solid rgba(226, 196, 141, 0.18);
      margin: 2em 0;
    }
    :host ::ng-deep .ProseMirror ::selection { background: rgba(226, 196, 141, 0.22); }
  `],
})
export class CaptureTiptapEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  @Input() doc: TiptapDoc | null = null;
  @Input() placeholder = 'Start writing your note…';
  @Input() editable = true;

  @Output() docChange = new EventEmitter<TiptapDoc>();
  @Output() editorReady = new EventEmitter<Editor>();

  private editor: Editor | null = null;
  private suppressUpdate = false;

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: this.placeholder }),
      ],
      editable: this.editable,
      content: this.doc ?? { type: 'doc', content: [] },
      onUpdate: ({ editor }) => {
        if (this.suppressUpdate) return;
        this.docChange.emit(editor.getJSON() as TiptapDoc);
      },
    });
    this.editorReady.emit(this.editor);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc'] && this.editor && !changes['doc'].firstChange) {
      const incoming = changes['doc'].currentValue as TiptapDoc | null;
      const current = this.editor.getJSON() as TiptapDoc;
      if (JSON.stringify(incoming) !== JSON.stringify(current)) {
        this.suppressUpdate = true;
        this.editor.commands.setContent(incoming ?? { type: 'doc', content: [] });
        this.suppressUpdate = false;
      }
    }
    if (changes['editable'] && this.editor) {
      this.editor.setEditable(this.editable);
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  focus(): void {
    this.editor?.commands.focus();
  }

  getEditor(): Editor | null {
    return this.editor;
  }
}
