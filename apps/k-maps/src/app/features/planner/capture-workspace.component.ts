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
  CaptureRef,
  CaptureRefDraft,
  R2Resource,
  TiptapDoc,
} from './models/planner.models';
import { emptyTiptapDoc, legacyNoteToTiptap } from './models/planner.models';
import { environment } from '../../../environments/environment';

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
  @ViewChild('jsonExpandable') jsonExpandableEl!: ElementRef<HTMLDivElement>;
  @ViewChild('bottomPanel') bottomPanelEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputEl!: ElementRef<HTMLInputElement>;
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
  jsonExpanded = signal(true);

  // ── Resources & References panel ──────────────────────────────────────────
  bottomPanelVisible = signal(false);
  bottomPanelExpanded = signal(false);
  activeBottomTab = signal<'resources' | 'refs'>('resources');

  resources = signal<R2Resource[]>([]);
  captureRefs = signal<CaptureRef[]>([]);
  uploadState = signal<'idle' | 'uploading' | 'error'>('idle');
  uploadError = signal<string | null>(null);
  refsState = signal<'idle' | 'saving' | 'error'>('idle');

  refDraft = signal<CaptureRefDraft>({
    ref_type: 'url',
    label: '',
    relation: 'related',
    url: '',
    surah: '',
    ayah: '',
  });

  readonly refTypes: Array<{ id: CaptureRef['ref_type']; label: string }> = [
    { id: 'quran_ayah', label: 'Quran Ayah' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'url', label: 'URL / Article' },
    { id: 'book', label: 'Book' },
    { id: 'hadith', label: 'Hadith' },
    { id: 'note', label: 'Note' },
    { id: 'capture', label: 'Capture' },
    { id: 'wv_node', label: 'WV Node' },
  ];

  readonly relations: Array<{ id: CaptureRef['relation']; label: string }> = [
    { id: 'related', label: 'Related' },
    { id: 'primary_source', label: 'Primary Source' },
    { id: 'secondary_source', label: 'Secondary Source' },
    { id: 'quote_source', label: 'Quote Source' },
    { id: 'inspiration', label: 'Inspiration' },
    { id: 'background', label: 'Background' },
    { id: 'derived_from', label: 'Derived From' },
  ];

  readonly resourceIcons: Record<string, string> = {
    image: '🖼', pdf: '📄', audio: '🎵', video: '🎬', json: '{ }', thumbnail: '🖼',
  };

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
      this.jsonExpanded.set(true);
      this.cdr.detectChanges();
      gsap.fromTo(panel, { width: 0, opacity: 0 }, { width: '36%', opacity: 1, duration: 0.32, ease: 'expo.out' });
    } else {
      gsap.to(panel, {
        width: 0, opacity: 0, duration: 0.22, ease: 'expo.in',
        onComplete: () => { this.jsonCollapsed.set(true); this.cdr.markForCheck(); },
      });
    }
  }

  toggleJsonExpand(): void {
    const el = this.jsonExpandableEl?.nativeElement;
    if (!el) { this.jsonExpanded.update(v => !v); return; }
    if (this.jsonExpanded()) {
      gsap.to(el, {
        height: 0, opacity: 0, duration: 0.26, ease: 'expo.in',
        onComplete: () => { this.jsonExpanded.set(false); this.cdr.markForCheck(); },
      });
    } else {
      this.jsonExpanded.set(true);
      this.cdr.detectChanges();
      gsap.fromTo(el,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.32, ease: 'expo.out' }
      );
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

  // ── Bottom panel: Resources & References ──────────────────────────────────

  showBottomPanel(tab: 'resources' | 'refs' = 'resources'): void {
    this.activeBottomTab.set(tab);
    if (this.bottomPanelVisible()) { return; }
    this.bottomPanelVisible.set(true);
    this.bottomPanelExpanded.set(false);
    this.cdr.detectChanges();
    const el = this.bottomPanelEl?.nativeElement;
    if (el) gsap.fromTo(el, { height: 0, opacity: 0 }, { height: '2.6rem', opacity: 1, duration: 0.28, ease: 'expo.out' });
  }

  hideBottomPanel(): void {
    const el = this.bottomPanelEl?.nativeElement;
    if (!el) { this.bottomPanelVisible.set(false); return; }
    gsap.to(el, { height: 0, opacity: 0, duration: 0.2, ease: 'expo.in', onComplete: () => {
      this.bottomPanelVisible.set(false);
      this.cdr.markForCheck();
    }});
  }

  toggleBottomExpand(): void {
    const el = this.bottomPanelEl?.nativeElement;
    if (!el) return;
    if (this.bottomPanelExpanded()) {
      this.bottomPanelExpanded.set(false);
      gsap.to(el, { height: '2.6rem', duration: 0.28, ease: 'expo.in' });
    } else {
      this.bottomPanelExpanded.set(true);
      gsap.to(el, { height: '16rem', duration: 0.32, ease: 'expo.out' });
    }
  }

  setBottomTab(tab: 'resources' | 'refs'): void {
    this.activeBottomTab.set(tab);
    if (!this.bottomPanelExpanded()) this.toggleBottomExpand();
  }

  triggerFileUpload(): void {
    this.fileInputEl?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedNote) return;
    input.value = '';

    this.uploadState.set('uploading');
    this.uploadError.set(null);
    this.cdr.markForCheck();

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('resource_type', file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'image');
      form.append('usage', 'attachment');

      const res = await fetch(`${environment.apiBase}/captures/${encodeURIComponent(this.selectedNote.id)}/r2`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json() as { ok: boolean; resource?: R2Resource; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Upload failed');
      this.resources.update(r => [...r, data.resource!]);
      this.uploadState.set('idle');
    } catch (err) {
      this.uploadState.set('error');
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed');
    }
    this.cdr.markForCheck();
  }

  async deleteResource(resourceId: string): Promise<void> {
    if (!this.selectedNote) return;
    try {
      const res = await fetch(
        `${environment.apiBase}/captures/${encodeURIComponent(this.selectedNote.id)}/r2?resourceId=${encodeURIComponent(resourceId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json() as { ok: boolean };
      if (data.ok) this.resources.update(r => r.filter(x => x.resource_id !== resourceId));
    } catch { /* silently ignore */ }
    this.cdr.markForCheck();
  }

  updateRefDraft(partial: Partial<CaptureRefDraft>): void {
    this.refDraft.update(d => ({ ...d, ...partial }));
  }

  async addRef(): Promise<void> {
    if (!this.selectedNote) return;
    const d = this.refDraft();
    if (!d.label.trim()) return;

    const locator = d.ref_type === 'quran_ayah' && d.surah
      ? { surah: Number(d.surah), ayah: Number(d.ayah) }
      : null;

    this.refsState.set('saving');
    this.cdr.markForCheck();

    try {
      const res = await fetch(
        `${environment.apiBase}/captures/${encodeURIComponent(this.selectedNote.id)}/refs`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ref_type: d.ref_type,
            label: d.label,
            relation: d.relation,
            url: d.url || null,
            locator,
          }),
        }
      );
      const data = await res.json() as { ok: boolean; ref?: CaptureRef; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Failed to add reference');
      this.captureRefs.update(refs => [...refs, data.ref!]);
      this.refDraft.set({ ref_type: 'url', label: '', relation: 'related', url: '', surah: '', ayah: '' });
      this.refsState.set('idle');
    } catch {
      this.refsState.set('error');
    }
    this.cdr.markForCheck();
  }

  async deleteRef(refId: string): Promise<void> {
    if (!this.selectedNote) return;
    try {
      const res = await fetch(
        `${environment.apiBase}/captures/${encodeURIComponent(this.selectedNote.id)}/refs?refId=${encodeURIComponent(refId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json() as { ok: boolean };
      if (data.ok) this.captureRefs.update(r => r.filter(x => x.ref_id !== refId));
    } catch { /* silently ignore */ }
    this.cdr.markForCheck();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  private loadNoteToDraft(note: CaptureNote): void {
    const editorJson: TiptapDoc = note.editor_json ?? legacyNoteToTiptap(note.plain_text ?? '');
    this.draft.set({
      area: note.area,
      stage: note.stage,
      title: note.title,
      editor_json: editorJson,
    });
    this.resources.set(note.r2_resources ?? []);
    this.captureRefs.set(note.capture_refs ?? []);
    this.refreshJson();
    this.cdr.markForCheck();
  }

  private refreshJson(): void {
    this.jsonText.set(JSON.stringify(this.draft().editor_json, null, 2));
  }
}
