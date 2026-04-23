import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef,
  ElementRef, inject, OnDestroy, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { AutoDirection } from './auto-direction.extension';
import { environment } from '../../../../../environments/environment';

// ── Minimal models ─────────────────────────────────────────────────────────────

interface TiptapDoc { type: 'doc'; content: unknown[] }

interface DocListItem {
  id: string;
  title: string;
  doc_type: string;
  updated_at: string | null;
  created_at: string;
}

interface DocDetail extends DocListItem {
  document_json: TiptapDoc;
}

const DOC_TYPES = [
  { value: 'running_notes', label: 'Running Notes' },
  { value: 'morphology',    label: 'Morphology' },
  { value: 'nahw',          label: 'Nahw / Structure' },
  { value: 'passage_notes', label: 'Passage Notes' },
  { value: 'tafsir',        label: 'Tafsir' },
  { value: 'draft',         label: 'Draft' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-quran-surah-notes-page',
  standalone: true,
  imports: [IonicModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quran-surah-notes.page.html',
  styleUrl: './quran-surah-notes.page.scss',
})
export class QuranSurahNotesPage implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost') editorHost?: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  private route     = inject(ActivatedRoute);
  private http      = inject(HttpClient);
  private cdr       = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private base      = `${environment.apiBase}/documents`;

  // ── State ──────────────────────────────────────────────────────────────────
  surah      = signal(0);
  documents  = signal<DocListItem[]>([]);
  activeDoc  = signal<DocDetail | null>(null);
  listLoading  = signal(true);
  docLoading   = signal(false);
  saveState    = signal<SaveState>('idle');
  listOpen     = signal(true);

  // Create form
  creating     = signal(false);
  newTitle     = '';
  newDocType   = 'running_notes';
  docTypes     = DOC_TYPES;

  private editor: Editor | null = null;
  private pendingDoc: TiptapDoc | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressUpdate = false;

  constructor() {
    this.route.paramMap.pipe(
      map(p => parseSurah(p.get('surahId') ?? p.get('surah'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(s => {
      if (s != null) {
        this.surah.set(s);
        this.loadDocuments(s);
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    // editor is lazily mounted when a document is selected
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.flushSave();
    this.editor?.destroy();
  }

  // ── Document list ─────────────────────────────────────────────────────────

  async loadDocuments(surah: number): Promise<void> {
    this.listLoading.set(true);
    try {
      const params = new HttpParams().set('domain', 'quran').set('surah', String(surah));
      const res = await firstValueFrom(
        this.http.get<{ ok: boolean; documents: DocListItem[] }>(this.base, { params })
      );
      if (res.ok) this.documents.set(res.documents);
    } catch { /* ignore */ }
    this.listLoading.set(false);
    this.cdr.markForCheck();
  }

  async selectDocument(id: string): Promise<void> {
    if (this.activeDoc()?.id === id) { this.listOpen.set(false); return; }
    this.flushSave();
    this.docLoading.set(true);
    this.listOpen.set(false);
    this.cdr.markForCheck();

    try {
      const res = await firstValueFrom(
        this.http.get<{ ok: boolean; document: DocDetail }>(`${this.base}/${id}`)
      );
      if (res.ok) {
        this.activeDoc.set(res.document);
        this.mountEditor(res.document.document_json);
      }
    } catch { /* ignore */ }
    this.docLoading.set(false);
    this.cdr.markForCheck();
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async submitCreate(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title) return;
    this.creating.set(false);
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; document_id: string; document: DocDetail }>(this.base, {
          title, doc_type: this.newDocType, domain: 'quran', surah: this.surah(),
        })
      );
      if (res.ok) {
        const item: DocListItem = {
          id: res.document.id, title: res.document.title,
          doc_type: res.document.doc_type, updated_at: null,
          created_at: new Date().toISOString(),
        };
        this.documents.update(d => [item, ...d]);
        await this.selectDocument(res.document_id);
      }
    } catch { /* ignore */ }
    this.newTitle = '';
    this.cdr.markForCheck();
  }

  // ── Editor ────────────────────────────────────────────────────────────────

  private mountEditor(doc: TiptapDoc): void {
    this.editor?.destroy();
    // Wait for view to render the host element
    setTimeout(() => {
      if (!this.editorHost?.nativeElement) return;
      this.editor = new Editor({
        element: this.editorHost.nativeElement,
        extensions: [
          StarterKit,
          Placeholder.configure({ placeholder: 'Start writing… (type / for commands)' }),
          Link.configure({ openOnClick: false }),
          Underline,
          AutoDirection,
        ],
        editable: true,
        content: (doc ?? { type: 'doc', content: [] }) as never,
        onUpdate: ({ editor }: { editor: Editor }) => {
          if (this.suppressUpdate) return;
          this.pendingDoc = editor.getJSON() as TiptapDoc;
          this.scheduleSave();
        },
      });
      this.cdr.markForCheck();
    }, 80);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveState.set('idle');
    this.saveTimer = setTimeout(() => this.doSave(), 1500);
  }

  private flushSave(): void {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    if (this.pendingDoc && this.activeDoc()) this.doSave();
  }

  private async doSave(): Promise<void> {
    const id  = this.activeDoc()?.id;
    const doc = this.pendingDoc ?? this.activeDoc()?.document_json;
    if (!id || !doc) return;

    this.saveState.set('saving');
    this.cdr.markForCheck();

    try {
      const res = await firstValueFrom(
        this.http.put<{ ok: boolean }>(`${this.base}/${id}`, { document_json: doc })
      );
      this.saveState.set(res.ok ? 'saved' : 'error');
    } catch {
      this.saveState.set('error');
    }

    this.pendingDoc = null;
    this.cdr.markForCheck();

    if (this.saveState() === 'saved') {
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => {
        this.saveState.set('idle');
        this.cdr.markForCheck();
      }, 2000);
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────

  async onTitleBlur(e: Event): Promise<void> {
    const newTitle = (e.target as HTMLInputElement).value.trim();
    const active = this.activeDoc();
    if (!active || !newTitle || newTitle === active.title) return;

    try {
      await firstValueFrom(
        this.http.patch<{ ok: boolean }>(`${this.base}/${active.id}`, { title: newTitle })
      );
      this.documents.update(docs =>
        docs.map(d => d.id === active.id ? { ...d, title: newTitle } : d)
      );
      this.activeDoc.update(d => d ? { ...d, title: newTitle } : d);
      this.cdr.markForCheck();
    } catch { /* ignore */ }
  }

  // ── Image upload ──────────────────────────────────────────────────────────

  triggerImage(): void { this.imageInput?.nativeElement.click(); }

  async onImageSelected(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    const id   = this.activeDoc()?.id;
    if (!file || !id) return;

    const form = new FormData();
    form.append('file', file);
    form.append('resource_type', 'image');
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; url: string }>(`${this.base}/${id}/upload`, form)
      );
      if (res.ok && this.editor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.editor.chain().focus() as any).setImage({ src: res.url, alt: file.name }).run();
      }
    } catch { /* ignore */ }
    (e.target as HTMLInputElement).value = '';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  docTypeLabel(t: string): string {
    return DOC_TYPES.find(d => d.value === t)?.label ?? t;
  }
  formatDate(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  }
  goBack(): void { this.listOpen.set(true); }
}

function parseSurah(v: string | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}
