import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface WvSource {
  id: string;
  title: string;
  creator?: string;
  source_type?: string;
  publication_year?: number;
  unit_count?: number;
  note_count?: number;
}

interface WvUnit {
  id: string;
  title?: string;
  unit_type?: string;
  order_index?: number;
  parent_unit_id?: string | null;
  anchor_text?: string | null;
  summary?: string;
  note_count?: number;
  children?: WvUnit[];
}

interface WvNote {
  id: string;
  note_kind: string;
  title?: string;
  body_md: string;
  excerpt_text?: string;
  created_at?: string;
}

interface WvHighlight {
  id: string;
  source_unit_id?: string;
  locator?: string | null;
  anchor_text?: string | null;
  selected_text: string;
  color?: string | null;
  created_at?: string;
}

interface ReaderHighlightEntry {
  id: string;
  note_kind: string;
  excerpt_text?: string;
  body_md: string;
  created_at?: string;
  locator?: string | null;
  source: 'highlight' | 'note';
}

type NoteKind = 'highlight' | 'reflection' | 'question' | 'insight' | 'claim_seed';
type ReaderTab = 'highlights' | 'notes' | 'wv';

// ── Constants ────────────────────────────────────────────────────────────────

const KIND_ICON: Record<string, string> = {
  highlight: '◆', quote: '"', reflection: '◎',
  question: '?', insight: '✦', claim_seed: '⊕',
  summary: '≡', observation: '◉',
};

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-worldview-library',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-library.component.html',
  styleUrl: './worldview-library.component.scss',
})
export class WorldviewLibraryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('readerPane') readerPaneRef!: ElementRef<HTMLElement>;

  // ── Loading states ──────────────────────────────────────────────────────
  readonly loading       = signal(true);
  readonly unitsLoading  = signal(false);
  readonly notesLoading  = signal(false);
  readonly savingNote    = signal(false);
  readonly savingText    = signal(false);
  readonly addingSource  = signal(false);
  readonly addingUnit    = signal(false);

  // ── Data ────────────────────────────────────────────────────────────────
  readonly sources        = signal<WvSource[]>([]);
  readonly selectedSource = signal<WvSource | null>(null);
  readonly units          = signal<WvUnit[]>([]);
  readonly selectedParentUnit = signal<WvUnit | null>(null);
  readonly selectedUnit   = signal<WvUnit | null>(null);
  readonly notes          = signal<WvNote[]>([]);
  readonly highlights     = signal<WvHighlight[]>([]);

  // ── Passage text ────────────────────────────────────────────────────────
  readonly anchorText      = signal<string | null>(null);
  readonly anchorTextInput = signal('');
  readonly editingText     = signal(false);

  // ── UI state ────────────────────────────────────────────────────────────
  readonly noteFormOpen   = signal(false);
  readonly showAddSource  = signal(false);
  readonly showAddUnit    = signal(false);
  readonly selectedKind   = signal<NoteKind>('highlight');
  readonly excerptInput   = signal('');
  readonly noteBodyInput  = signal('');
  readonly collapsedUnits = signal<Set<string>>(new Set());
  readonly bottomTab      = signal<ReaderTab>('highlights');
  readonly textPaneHeight = signal(38);
  readonly isResizingReader = signal(false);

  private searchQuery = signal('');
  private tabAnimTimeout: ReturnType<typeof setTimeout> | null = null;
  private resizePointerId: number | null = null;
  private removeResizeListeners: (() => void) | null = null;

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly filteredSources = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.creator ?? '').toLowerCase().includes(q)
    );
  });

  readonly highlightNotes = computed(() => this.notes().filter(n => this.isHighlightKind(n.note_kind)));
  readonly highlightEntries = computed<ReaderHighlightEntry[]>(() => {
    const directHighlights = this.highlights().map<ReaderHighlightEntry>(highlight => ({
      id: highlight.id,
      note_kind: 'highlight',
      excerpt_text: highlight.anchor_text ?? undefined,
      body_md: highlight.selected_text,
      created_at: highlight.created_at,
      locator: highlight.locator,
      source: 'highlight',
    }));

    const noteHighlights = this.highlightNotes().map<ReaderHighlightEntry>(note => ({
      id: note.id,
      note_kind: note.note_kind,
      excerpt_text: note.excerpt_text,
      body_md: note.body_md,
      created_at: note.created_at,
      locator: null,
      source: 'note',
    }));

    return [...directHighlights, ...noteHighlights].sort((left, right) => this.compareCreatedAt(left.created_at, right.created_at));
  });
  readonly wvNotes        = computed(() => this.notes().filter(n => this.isWvKind(n.note_kind)));
  readonly regularNotes   = computed(() => this.notes().filter(n => !this.isHighlightKind(n.note_kind) && !this.isWvKind(n.note_kind)));
  readonly hasInsights    = computed(() => this.wvNotes().length > 0);
  readonly insightCount   = computed(() => this.wvNotes().length);
  readonly kindLabel    = computed(() => this.noteKinds.find(k => k.value === this.selectedKind())?.label ?? 'Note');

  readonly notePlaceholder = computed(() => {
    const m: Record<string, string> = {
      highlight:   'Your reflection on this passage…',
      reflection:  'What does this mean for your worldview?',
      question:    'What question does this raise?',
      insight:     'The key insight distilled from this…',
      claim_seed:  'A claim this passage supports or challenges…',
    };
    return m[this.selectedKind()] ?? 'Note…';
  });

  // ── Static config ─────────────────────────────────────────────────────────
  readonly bottomTabs = [
    { id: 'highlights' as const, label: 'Highlights', icon: '◆' },
    { id: 'notes'      as const, label: 'Notes',      icon: '◎' },
    { id: 'wv'         as const, label: 'WV',         icon: '◈' },
  ];

  readonly noteKinds: { value: NoteKind; label: string; icon: string }[] = [
    { value: 'highlight',  label: 'Highlight', icon: '◆' },
    { value: 'reflection', label: 'Reflect',   icon: '◎' },
    { value: 'question',   label: 'Question',  icon: '?' },
    { value: 'insight',    label: 'Insight',   icon: '✦' },
    { value: 'claim_seed', label: 'Claim',     icon: '⊕' },
  ];

  newSource = { title: '', creator: '', source_type: 'book', publication_year: '' };
  newUnit   = { title: '', unit_type: 'chapter', order_index: 1, summary: '' };

  constructor() {
    effect(() => {
      const _ = this.bottomTab();
      if (this.tabAnimTimeout) clearTimeout(this.tabAnimTimeout);
      this.tabAnimTimeout = setTimeout(() => this.animateReaderTab(), 50);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void { void this.loadSources(); }

  ngAfterViewInit(): void {
    gsap.fromTo(this.pageRef.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  }

  ngOnDestroy(): void {
    if (this.tabAnimTimeout) clearTimeout(this.tabAnimTimeout);
    this.stopReaderResize();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  selectSource(src: WvSource): void {
    this.selectedSource.set(src);
    this.selectedParentUnit.set(null);
    this.selectedUnit.set(null);
    this.notes.set([]);
    this.highlights.set([]);
    this.units.set([]);
    this.anchorText.set(null);
    void this.loadUnits(src.id);
  }

  clearSource(): void {
    this.selectedSource.set(null);
    this.selectedParentUnit.set(null);
    this.selectedUnit.set(null);
    this.notes.set([]);
    this.highlights.set([]);
    this.units.set([]);
    this.anchorText.set(null);
    this.editingText.set(false);
  }

  selectUnit(unit: WvUnit): void {
    this.selectedUnit.set(unit);
    this.anchorText.set(unit.anchor_text ?? null);
    this.anchorTextInput.set(unit.anchor_text ?? '');
    this.editingText.set(false);
    this.notes.set([]);
    this.highlights.set([]);
    this.bottomTab.set('highlights');
    void this.loadReaderData(unit.id);
  }

  setBottomTab(tab: ReaderTab): void {
    if (this.bottomTab() === tab) return;
    this.bottomTab.set(tab);
  }

  startReaderResize(event: PointerEvent): void {
    if (!this.readerPaneRef?.nativeElement) return;

    event.preventDefault();
    this.stopReaderResize();

    this.resizePointerId = event.pointerId;
    this.isResizingReader.set(true);

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
    }

    const onMove = (moveEvent: PointerEvent) => {
      if (this.resizePointerId !== null && moveEvent.pointerId !== this.resizePointerId) return;
      this.updateReaderSplit(moveEvent.clientY);
    };

    const onUp = (endEvent: PointerEvent) => {
      if (this.resizePointerId !== null && endEvent.pointerId !== this.resizePointerId) return;
      this.stopReaderResize();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }

    this.removeResizeListeners = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
    };

    this.updateReaderSplit(event.clientY);
  }

  onReaderResizeKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.adjustReaderSplit(-4);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.adjustReaderSplit(4);
    }
  }

  toggleCollapse(unitId: string): void {
    const s = new Set(this.collapsedUnits());
    s.has(unitId) ? s.delete(unitId) : s.add(unitId);
    this.collapsedUnits.set(s);
  }

  isCollapsed(unitId: string): boolean {
    return this.collapsedUnits().has(unitId);
  }

  totalNotes(unit: WvUnit): number {
    return (unit.note_count ?? 0) + (unit.children?.reduce((s, c) => s + (c.note_count ?? 0), 0) ?? 0);
  }

  // ── Note actions ──────────────────────────────────────────────────────────

  clearNoteForm(): void {
    this.excerptInput.set('');
    this.noteBodyInput.set('');
  }

  kindIcon(kind: string): string { return KIND_ICON[kind] ?? '◆'; }

  kindLabelText(kind: string): string {
    const labels: Record<string, string> = {
      quote: 'Highlight',
      highlight: 'Highlight',
      reflection: 'Reflection',
      question: 'Question',
      insight: 'Insight',
      claim_seed: 'Claim',
      summary: 'Summary',
      observation: 'Observation',
    };
    return labels[kind] ?? kind.replace(/_/g, ' ');
  }

  canDistill(note: WvNote): boolean {
    return !this.isWvKind(note.note_kind);
  }

  distillHighlight(entry: ReaderHighlightEntry): void {
    this.selectedKind.set('insight');
    this.excerptInput.set(entry.body_md);
    this.noteBodyInput.set('');
    this.noteFormOpen.set(true);
  }

  tabCount(tab: ReaderTab): number {
    switch (tab) {
      case 'highlights': return this.highlightEntries().length;
      case 'notes': return this.regularNotes().length;
      case 'wv': return this.wvNotes().length;
    }
  }

  formatDate(dt?: string): string {
    if (!dt) return '';
    try { return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dt; }
  }

  async saveNote(): Promise<void> {
    const src  = this.selectedSource();
    const unit = this.selectedUnit();
    const body = this.noteBodyInput().trim();
    if (!src || !body) return;

    this.savingNote.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_id:     src.id,
          source_unit_id: unit?.id ?? null,
          note_kind:     this.selectedKind(),
          body_md:       body,
          excerpt_text:  this.excerptInput().trim() || null,
        }),
      });
      if (res.ok) {
        this.clearNoteForm();
        if (unit) void this.loadReaderData(unit.id);
      }
    } finally {
      this.savingNote.set(false);
    }
  }

  async saveAnchorText(): Promise<void> {
    const unit = this.selectedUnit();
    const src  = this.selectedSource();
    if (!unit || !src) return;

    this.savingText.set(true);
    try {
      const text = this.anchorTextInput().trim();
      const res = await fetch(`${environment.wvBase}/wv/sources/${src.id}/units/${unit.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anchor_text: text }),
      });
      if (res.ok) {
        this.anchorText.set(text || null);
        this.editingText.set(false);
      }
    } finally {
      this.savingText.set(false);
    }
  }

  distill(note: WvNote): void {
    this.selectedKind.set('insight');
    this.excerptInput.set(note.body_md);
    this.noteBodyInput.set('');
    this.noteFormOpen.set(true);
  }

  distillAll(): void {
    const all = [...this.highlightEntries(), ...this.regularNotes()].map(n => n.body_md).join('\n\n');
    this.selectedKind.set('insight');
    this.excerptInput.set(all.slice(0, 500));
    this.noteBodyInput.set('');
    this.noteFormOpen.set(true);
  }

  // ── Source / Unit CRUD ────────────────────────────────────────────────────

  async addSource(): Promise<void> {
    if (!this.newSource.title.trim()) return;
    this.addingSource.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/sources`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title:            this.newSource.title,
          creator:          this.newSource.creator || null,
          source_type:      this.newSource.source_type,
          publication_year: this.newSource.publication_year ? parseInt(this.newSource.publication_year, 10) : null,
        }),
      });
      if (res.ok) {
        this.showAddSource.set(false);
        this.newSource = { title: '', creator: '', source_type: 'book', publication_year: '' };
        void this.loadSources();
      }
    } finally {
      this.addingSource.set(false);
    }
  }

  async addUnit(): Promise<void> {
    const src = this.selectedSource();
    if (!src) return;
    this.addingUnit.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/sources/${src.id}/units`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title:       this.newUnit.title,
          unit_type:   this.newUnit.unit_type,
          order_index: this.newUnit.order_index,
          summary:     this.newUnit.summary || null,
        }),
      });
      if (res.ok) {
        this.showAddUnit.set(false);
        this.newUnit = { title: '', unit_type: 'chapter', order_index: 1, summary: '' };
        void this.loadUnits(src.id);
      }
    } finally {
      this.addingUnit.set(false);
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private async loadSources(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/sources?limit=100`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; sources: WvSource[] };
      if (data.ok) this.sources.set(data.sources);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadUnits(sourceId: string): Promise<void> {
    this.unitsLoading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/sources/${sourceId}/units`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; units: WvUnit[] };
      if (!data.ok) return;

      // Build parent-child tree
      const map = new Map<string, WvUnit>();
      data.units.forEach(u => map.set(u.id, { ...u, children: [] }));
      const roots: WvUnit[] = [];
      data.units.forEach(u => {
        const node = map.get(u.id)!;
        if (u.parent_unit_id && map.has(u.parent_unit_id)) {
          map.get(u.parent_unit_id)!.children!.push(node);
        } else {
          roots.push(node);
        }
      });
      this.units.set(roots);
    } finally {
      this.unitsLoading.set(false);
    }
  }

  private async loadReaderData(unitId: string): Promise<void> {
    this.notesLoading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/notes?source_unit_id=${unitId}&limit=100`);
      if (!res.ok) return;

      const data = await res.json() as { ok: boolean; notes: WvNote[]; highlights?: WvHighlight[] };
      if (!data.ok) return;

      this.notes.set(data.notes ?? []);
      this.highlights.set(data.highlights ?? []);
    } finally {
      this.notesLoading.set(false);
    }
  }

  private isHighlightKind(kind: string): boolean {
    return kind === 'quote' || kind === 'highlight';
  }

  private isWvKind(kind: string): boolean {
    return kind === 'insight' || kind === 'claim_seed';
  }

  private adjustReaderSplit(delta: number): void {
    const next = Math.max(22, Math.min(72, this.textPaneHeight() + delta));
    this.textPaneHeight.set(next);
  }

  private updateReaderSplit(clientY: number): void {
    if (!this.readerPaneRef?.nativeElement) return;

    const rect = this.readerPaneRef.nativeElement.getBoundingClientRect();
    if (rect.height <= 0) return;

    const next = ((clientY - rect.top) / rect.height) * 100;
    this.textPaneHeight.set(Math.max(22, Math.min(72, next)));
  }

  private stopReaderResize(): void {
    this.resizePointerId = null;
    this.isResizingReader.set(false);
    this.removeResizeListeners?.();
    this.removeResizeListeners = null;

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }

  private compareCreatedAt(left?: string, right?: string): number {
    const leftTs = left ? Date.parse(left) : 0;
    const rightTs = right ? Date.parse(right) : 0;
    return leftTs - rightTs;
  }

  private animateReaderTab(): void {
    if (!this.pageRef?.nativeElement) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.pageRef.nativeElement;
    const panel = root.querySelector<HTMLElement>('.wvl__tab-panel');
    if (!panel) return;

    const items = panel.querySelectorAll<HTMLElement>('.wvl__note, .wvl__chip, .wvl__empty-card, .wvl__distill-bar');
    gsap.killTweensOf(panel);
    gsap.killTweensOf(items);

    gsap.fromTo(
      panel,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }
    );

    if (items.length) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.36, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }
}
