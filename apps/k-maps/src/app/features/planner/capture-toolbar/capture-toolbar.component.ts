import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  group: string;
  run: (editor: Editor) => void;
  active?: (editor: Editor) => boolean;
}

@Component({
  selector: 'km-capture-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ctb">
      <div class="ctb__group">
        <select class="ctb__select" (change)="onBlockType($event)">
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>
      <div class="ctb__sep"></div>
      @for (action of actions; track action.id) {
        @if (action.group === 'sep') {
          <div class="ctb__sep"></div>
        } @else {
          <button
            class="ctb__btn"
            type="button"
            [class.ctb__btn--active]="editor && action.active ? action.active(editor) : false"
            [title]="action.label"
            (click)="run(action)"
          >{{ action.icon }}</button>
        }
      }
    </div>
  `,
  styles: [`
    .ctb {
      display: flex;
      align-items: center;
      gap: 0.18rem;
      padding: 0 0.75rem;
      height: 100%;
    }
    .ctb__sep {
      width: 1px;
      height: 1.1rem;
      background: rgba(226, 196, 141, 0.14);
      margin: 0 0.3rem;
      flex-shrink: 0;
    }
    .ctb__group { display: flex; align-items: center; gap: 0.18rem; }
    .ctb__select {
      background: rgba(12, 11, 10, 0.72);
      border: 1px solid rgba(226, 196, 141, 0.14);
      color: rgba(248, 238, 218, 0.82);
      padding: 0.3rem 0.5rem;
      font-family: var(--km-font-heading);
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .ctb__btn {
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.44rem;
      border: 1px solid transparent;
      background: transparent;
      color: rgba(248, 238, 218, 0.74);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 140ms, background 140ms, color 140ms;
    }
    .ctb__btn:hover {
      border-color: rgba(226, 196, 141, 0.18);
      background: rgba(255, 255, 255, 0.04);
      color: rgba(248, 238, 218, 0.96);
    }
    .ctb__btn--active {
      border-color: rgba(226, 196, 141, 0.28);
      background: rgba(226, 196, 141, 0.08);
      color: rgba(226, 196, 141, 0.96);
    }
  `],
})
export class CaptureToolbarComponent {
  @Input() editor: Editor | null = null;
  @Output() editorChange = new EventEmitter<void>();

  readonly actions: ToolbarAction[] = [
    {
      id: 'bold', label: 'Bold', icon: 'B', group: 'inline',
      run: (e) => e.chain().focus().toggleBold().run(),
      active: (e) => e.isActive('bold'),
    },
    {
      id: 'italic', label: 'Italic', icon: 'I', group: 'inline',
      run: (e) => e.chain().focus().toggleItalic().run(),
      active: (e) => e.isActive('italic'),
    },
    {
      id: 'strike', label: 'Strikethrough', icon: 'S̶', group: 'inline',
      run: (e) => e.chain().focus().toggleStrike().run(),
      active: (e) => e.isActive('strike'),
    },
    {
      id: 'code', label: 'Inline code', icon: '<>', group: 'inline',
      run: (e) => e.chain().focus().toggleCode().run(),
      active: (e) => e.isActive('code'),
    },
    { id: 'sep1', label: '', icon: '', group: 'sep', run: () => {} },
    {
      id: 'bulletList', label: 'Bullet list', icon: '•', group: 'block',
      run: (e) => e.chain().focus().toggleBulletList().run(),
      active: (e) => e.isActive('bulletList'),
    },
    {
      id: 'orderedList', label: 'Numbered list', icon: '1.', group: 'block',
      run: (e) => e.chain().focus().toggleOrderedList().run(),
      active: (e) => e.isActive('orderedList'),
    },
    {
      id: 'blockquote', label: 'Blockquote', icon: '❝', group: 'block',
      run: (e) => e.chain().focus().toggleBlockquote().run(),
      active: (e) => e.isActive('blockquote'),
    },
    {
      id: 'codeBlock', label: 'Code block', icon: '{ }', group: 'block',
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
      active: (e) => e.isActive('codeBlock'),
    },
    { id: 'sep2', label: '', icon: '', group: 'sep', run: () => {} },
    {
      id: 'hr', label: 'Divider', icon: '—', group: 'insert',
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    { id: 'sep3', label: '', icon: '', group: 'sep', run: () => {} },
    {
      id: 'undo', label: 'Undo', icon: '↶', group: 'history',
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      id: 'redo', label: 'Redo', icon: '↷', group: 'history',
      run: (e) => e.chain().focus().redo().run(),
    },
  ];

  run(action: ToolbarAction): void {
    if (!this.editor) return;
    action.run(this.editor);
    this.editorChange.emit();
  }

  onBlockType(event: Event): void {
    if (!this.editor) return;
    const value = (event.target as HTMLSelectElement).value;
    const chain = this.editor.chain().focus();
    if (value === 'paragraph') chain.setParagraph().run();
    else if (value === 'h1') chain.setHeading({ level: 1 }).run();
    else if (value === 'h2') chain.setHeading({ level: 2 }).run();
    else if (value === 'h3') chain.setHeading({ level: 3 }).run();
    this.editorChange.emit();
  }
}
