import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import type { Editor } from '@tiptap/core';
import { CaptureTiptapEditorComponent } from './capture-tiptap-editor.component';
import { CaptureToolbarComponent } from './capture-toolbar.component';
import type { CaptureArea, CaptureNoteDraft, TiptapDoc } from './models/planner.models';
import { emptyTiptapDoc } from './models/planner.models';

export interface CaptureAreaOption {
  id: CaptureArea;
  label: string;
}

@Component({
  selector: 'km-capture-editor',
  standalone: true,
  imports: [FormsModule, CaptureTiptapEditorComponent, CaptureToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-editor.component.html',
  styleUrl: './capture-editor.component.scss',
})
export class CaptureEditorComponent implements AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('root') rootEl!: ElementRef<HTMLDivElement>;
  @ViewChild('jsonPanel') jsonPanelEl!: ElementRef<HTMLDivElement>;
  @ViewChild(CaptureTiptapEditorComponent) tiptap!: CaptureTiptapEditorComponent;

  @Input() draft: CaptureNoteDraft = {
    area: 'quran',
    stage: 'inbox',
    title: '',
    editor_json: emptyTiptapDoc(),
  };
  @Input() saving = false;
  @Input() areas: CaptureAreaOption[] = [
    { id: 'quran', label: 'Quran' },
    { id: 'arabic', label: 'Arabic' },
    { id: 'wv', label: 'WV' },
    { id: 'vocabulary', label: 'Vocabulary' },
  ];

  @Output() draftChange = new EventEmitter<CaptureNoteDraft>();
  @Output() saveRequested = new EventEmitter<CaptureNoteDraft>();
  @Output() backRequested = new EventEmitter<void>();

  tiptapEditor = signal<Editor | null>(null);
  jsonText = signal('');
  jsonError = signal<string | null>(null);
  jsonCollapsed = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.rootEl.nativeElement,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' },
    );
    this.refreshJson();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onEditorReady(editor: Editor): void {
    this.tiptapEditor.set(editor);
    this.refreshJson();
    this.cdr.markForCheck();
  }

  onDocChange(doc: TiptapDoc): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const next = { ...this.draft, editor_json: doc };
      this.draft = next;
      this.draftChange.emit(next);
      this.refreshJson();
      this.cdr.markForCheck();
    }, 250);
  }

  updateArea(area: CaptureArea): void {
    const next = { ...this.draft, area };
    this.draft = next;
    this.draftChange.emit(next);
  }

  updateTitle(title: string): void {
    const next = { ...this.draft, title };
    this.draft = next;
    this.draftChange.emit(next);
  }

  onSave(): void {
    this.saveRequested.emit(this.draft);
  }

  onBack(): void {
    gsap.to(this.rootEl.nativeElement, {
      opacity: 0, y: 10, duration: 0.22, ease: 'power2.in',
      onComplete: () => this.backRequested.emit(),
    });
  }

  applyJson(): void {
    const raw = this.jsonText();
    try {
      const parsed = JSON.parse(raw) as TiptapDoc;
      if (parsed?.type !== 'doc') throw new Error('Root must be a Tiptap doc with type "doc".');
      this.jsonError.set(null);
      const next = { ...this.draft, editor_json: parsed };
      this.draft = next;
      this.draftChange.emit(next);
    } catch (err) {
      this.jsonError.set(err instanceof Error ? err.message : 'Invalid JSON.');
    }
  }

  toggleJson(): void {
    if (this.jsonCollapsed()) {
      this.jsonCollapsed.set(false);
      gsap.fromTo(
        this.jsonPanelEl.nativeElement,
        { width: 0, opacity: 0 },
        { width: '38%', opacity: 1, duration: 0.32, ease: 'expo.out' },
      );
    } else {
      gsap.to(this.jsonPanelEl.nativeElement, {
        width: 0, opacity: 0, duration: 0.22, ease: 'expo.in',
        onComplete: () => this.jsonCollapsed.set(true),
      });
    }
  }

  private refreshJson(): void {
    this.jsonText.set(JSON.stringify(this.draft.editor_json, null, 2));
  }

  highlightJson(json: string): string {
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'json-num';
          if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-str';
          else if (/true|false/.test(match)) cls = 'json-bool';
          else if (/null/.test(match)) cls = 'json-null';
          return `<span class="${cls}">${match}</span>`;
        });
  }
}
