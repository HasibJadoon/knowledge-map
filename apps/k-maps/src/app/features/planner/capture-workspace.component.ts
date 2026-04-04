import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import type { Editor } from '@tiptap/core';
import { CaptureTiptapEditorComponent } from './capture-tiptap-editor.component';
import { CaptureToolbarComponent } from './capture-toolbar.component';
import type {
  CaptureArea,
  CaptureNote,
  CaptureNoteDraft,
  TiptapDoc,
} from './models/planner.models';
import { emptyTiptapDoc, legacyNoteToTiptap } from './models/planner.models';

export interface CaptureAreaOption {
  id: CaptureArea;
  label: string;
}

@Component({
  selector: 'km-capture-workspace',
  standalone: true,
  imports: [FormsModule, CaptureTiptapEditorComponent, CaptureToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-workspace.component.html',
  styleUrl: './capture-workspace.component.scss',
})
export class CaptureWorkspaceComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('root') rootEl!: ElementRef<HTMLDivElement>;
  @ViewChild('inboxPanel') inboxPanelEl!: ElementRef<HTMLDivElement>;
  @ViewChild('jsonPanel') jsonPanelEl!: ElementRef<HTMLDivElement>;
  @ViewChild(CaptureTiptapEditorComponent) tiptap!: CaptureTiptapEditorComponent;

  @Input() notes: CaptureNote[] = [];
  @Input() selectedNote: CaptureNote | null = null;
  @Input() loading = false;
  @Input() saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  @Input() areas: CaptureAreaOption[] = [
    { id: 'quran', label: 'Quran' },
    { id: 'arabic', label: 'Arabic' },
    { id: 'wv', label: 'WV' },
    { id: 'vocabulary', label: 'Vocabulary' },
  ];

  @Output() noteSelected = new EventEmitter<string>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() draftSaved = new EventEmitter<CaptureNoteDraft>();
  @Output() backRequested = new EventEmitter<void>();

  // Draft state for the currently open note
  draft = signal<CaptureNoteDraft>({
    area: 'quran',
    stage: 'inbox',
    title: '',
    editor_json: emptyTiptapDoc(),
  });

  tiptapEditor = signal<Editor | null>(null);
  jsonText = signal('');
  jsonError = signal<string | null>(null);
  inboxCollapsed = signal(false);
  jsonCollapsed = signal(false);

  readonly areaLabels: Record<CaptureArea, string> = {
    quran: 'Quran',
    arabic: 'Arabic',
    wv: 'WV',
    vocabulary: 'Vocabulary',
  };

  readonly inboxGroups = computed(() => {
    const groups: Record<string, CaptureNote[]> = { inbox: [], review: [], done: [] };
    for (const note of this.notes) {
      (groups[note.stage] ?? groups['inbox']).push(note);
    }
    return groups;
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.rootEl.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
    );
    if (this.selectedNote) this.loadNoteToDraft(this.selectedNote);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedNote'] && !changes['selectedNote'].firstChange) {
      const note = changes['selectedNote'].currentValue as CaptureNote | null;
      if (note) this.loadNoteToDraft(note);
    }
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
      this.draft.update(d => ({ ...d, editor_json: doc }));
      this.refreshJson();
      this.cdr.markForCheck();
    }, 250);
  }

  selectNote(id: string): void {
    this.noteSelected.emit(id);
  }

  updateArea(area: CaptureArea): void {
    this.draft.update(d => ({ ...d, area }));
  }

  updateTitle(title: string): void {
    this.draft.update(d => ({ ...d, title }));
  }

  onSave(): void {
    this.draftSaved.emit(this.draft());
  }

  onBack(): void {
    this.backRequested.emit();
  }

  applyJson(): void {
    const raw = this.jsonText();
    try {
      const parsed = JSON.parse(raw) as TiptapDoc;
      if (parsed?.type !== 'doc') throw new Error('Root must be a Tiptap doc with type "doc".');
      this.jsonError.set(null);
      this.draft.update(d => ({ ...d, editor_json: parsed }));
    } catch (err) {
      this.jsonError.set(err instanceof Error ? err.message : 'Invalid JSON.');
    }
  }

  toggleInbox(): void {
    const panel = this.inboxPanelEl.nativeElement;
    if (this.inboxCollapsed()) {
      this.inboxCollapsed.set(false);
      gsap.fromTo(panel, { width: 0, opacity: 0 }, { width: '220px', opacity: 1, duration: 0.32, ease: 'expo.out' });
    } else {
      gsap.to(panel, {
        width: 0, opacity: 0, duration: 0.22, ease: 'expo.in',
        onComplete: () => this.inboxCollapsed.set(true),
      });
    }
  }

  toggleJson(): void {
    const panel = this.jsonPanelEl?.nativeElement;
    if (!panel) { this.jsonCollapsed.update(v => !v); return; }
    if (this.jsonCollapsed()) {
      this.jsonCollapsed.set(false);
      gsap.fromTo(panel, { width: 0, opacity: 0 }, { width: '36%', opacity: 1, duration: 0.32, ease: 'expo.out' });
    } else {
      gsap.to(panel, {
        width: 0, opacity: 0, duration: 0.22, ease: 'expo.in',
        onComplete: () => this.jsonCollapsed.set(true),
      });
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
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

  private loadNoteToDraft(note: CaptureNote): void {
    // Support legacy notes that might not have editor_json yet
    const editorJson: TiptapDoc = note.editor_json ?? legacyNoteToTiptap(note.plain_text ?? '');
    this.draft.set({
      area: note.area,
      stage: note.stage,
      title: note.title,
      editor_json: editorJson,
    });
    this.refreshJson();
    this.cdr.markForCheck();
  }

  private refreshJson(): void {
    this.jsonText.set(JSON.stringify(this.draft().editor_json, null, 2));
  }
}
