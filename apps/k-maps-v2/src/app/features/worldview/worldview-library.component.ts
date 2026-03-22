import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

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

type NoteKind = 'highlight' | 'reflection' | 'question' | 'insight' | 'claim_seed';

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
export class WorldviewLibraryComponent implements OnInit, AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

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
  readonly bottomTab      = signal<'highlights' | 'notes' | 'graph'>('highlights');

  private searchQuery = signal('');

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly filteredSources = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.creator ?? '').toLowerCase().includes(q)
    );
  });

  readonly hasInsights  = computed(() => this.notes().some(n => n.note_kind === 'insight' || n.note_kind === 'claim_seed'));
  readonly insightCount = computed(() => this.notes().filter(n => n.note_kind === 'insight' || n.note_kind === 'claim_seed').length);
  readonly kindLabel    = computed(() => this.noteKinds.find(k => k.value === this.selectedKind())?.label ?? 'Note');
  readonly quoteNotes   = computed(() => this.notes().filter(n => n.note_kind === 'quote'));
  readonly nonQuoteNotes = computed(() => this.notes().filter(n => n.note_kind !== 'quote'));

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
    { id: 'graph'      as const, label: 'WV Graph',   icon: '◈' },
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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void { void this.loadSources(); }

  ngAfterViewInit(): void {
    gsap.fromTo(this.pageRef.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
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
    this.units.set([]);
    this.anchorText.set(null);
    void this.loadUnits(src.id);
  }

  clearSource(): void {
    this.selectedSource.set(null);
    this.selectedParentUnit.set(null);
    this.selectedUnit.set(null);
    this.notes.set([]);
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
    this.bottomTab.set('highlights');
    void this.loadNotes(unit.id);
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
        if (unit) void this.loadNotes(unit.id);
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
    const all = this.notes().map(n => n.body_md).join('\n\n');
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

  private async loadNotes(unitId: string): Promise<void> {
    this.notesLoading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/notes?source_unit_id=${unitId}&limit=100`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; notes: WvNote[] };
      if (data.ok) this.notes.set(data.notes);
    } finally {
      this.notesLoading.set(false);
    }
  }
}
