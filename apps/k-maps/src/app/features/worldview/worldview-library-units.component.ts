import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { environment } from '../../../environments/environment';

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publication_year?: number | null;
  language?: string | null;
  source_domain?: string | null;
  meta?: Record<string, unknown> | null;
  people?: WvSourcePerson[] | null;
}

interface WvSourcePerson {
  id: string;
  display_name?: string | null;
  role?: string | null;
  is_primary?: number | boolean | null;
}

interface WvUnit {
  id: string;
  source_id: string;
  parent_unit_id?: string | null;
  unit_type?: string | null;
  title?: string | null;
  order_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  anchor_text?: string | null;
  summary?: string | null;
  body_preview?: string | null;
  meta?: Record<string, unknown> | null;
  children?: WvUnit[];
}

interface WvUnitDetail extends WvUnit {
  source_title?: string | null;
  creator?: string | null;
  source_type?: string | null;
  reading_body?: string | null;
  reading_blocks?: WvReadingBlock[] | null;
  children: WvUnit[];
}

interface WvReadingBlock {
  type?: string | null;
  text?: string | null;
  href?: string | null;
  label?: string | null;
  cite?: string | null;
}

interface WvNote {
  id: string;
  note_kind: string;
  title?: string | null;
  body_md: string;
  excerpt_text?: string | null;
  created_at?: string | null;
}

interface WvHighlight {
  id: string;
  source_unit_id?: string | null;
  locator?: string | null;
  anchor_text?: string | null;
  selected_text: string;
  color?: string | null;
  created_at?: string | null;
}

interface ReaderHighlightEntry {
  id: string;
  note_kind: string;
  excerpt_text?: string | null;
  body_md: string;
  created_at?: string | null;
  locator?: string | null;
  source: 'highlight' | 'note';
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
  siblingIndex: number;
}

interface PassageBlock {
  id: string;
  text: string;
  marker?: string | null;
  direction: 'rtl' | 'ltr';
  arabic: boolean;
  kind: 'paragraph' | 'heading' | 'subheading' | 'separator' | 'link' | 'quote';
  href?: string | null;
  label?: string | null;
  cite?: string | null;
}

type ReaderTab = 'highlights' | 'notes' | 'wv';

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const END_MARKER_RE = /[\u06DD\u06DE][\u0660-\u0669]*/g;
const ARABIC_INDIC_ONLY_RE = /^[\u0660-\u0669]+$/;
const KIND_ICON: Record<string, string> = {
  highlight: '◆',
  quote: '"',
  reflection: '◎',
  question: '?',
  insight: '✦',
  claim_seed: '⊕',
  summary: '≡',
  observation: '◉',
};

@Component({
  selector: 'km-worldview-library-units',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './worldview-library-units.component.html',
  styleUrl: './worldview-library-units.component.scss',
})
export class WorldviewLibraryUnitsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('splitContainer') splitContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('readerBody') readerBodyRef?: ElementRef<HTMLElement>;
  @ViewChild('readArea') readAreaRef?: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  private routeSub?: Subscription;
  private resizePointerId: number | null = null;
  private removeResizeListeners: (() => void) | null = null;
  private tocResizePointerId: number | null = null;
  private removeTocResizeListeners: (() => void) | null = null;
  private pageAnimationContext: gsap.Context | null = null;
  private scrollAnimationContext: gsap.Context | null = null;

  readonly source = signal<WvSource | null>(null);
  readonly rawUnits = signal<WvUnit[]>([]);
  readonly selectedUnit = signal<WvUnit | null>(null);
  readonly detailCache = signal<Record<string, WvUnitDetail>>({});
  readonly notes = signal<WvNote[]>([]);
  readonly highlights = signal<WvHighlight[]>([]);

  readonly sourceLoading = signal(true);
  readonly detailLoading = signal(false);
  readonly notesLoading = signal(false);
  readonly isResizingReader = signal(false);
  readonly isResizingToc = signal(false);
  readonly tocHidden = signal(false);
  readonly tocWidth = signal(310);
  readonly workspaceHidden = signal(false);

  readonly skeletons = [1, 2, 3, 4, 5];
  readonly collapsedUnits = signal<Set<string>>(new Set());
  readonly textPaneHeight = signal(60);
  readonly readerSections = [
    { id: 'highlights' as const, label: 'Highlights' },
    { id: 'notes' as const, label: 'Notes' },
    { id: 'wv' as const, label: 'WV' },
  ];
  readonly visibleReaderSections = computed(() =>
    this.readerSections.filter((section) => this.tabCount(section.id) > 0),
  );

  readonly unitsById = computed(() => new Map(this.rawUnits().map((unit) => [unit.id, unit] as const)));

  readonly rootUnits = computed(() => this.buildUnitTree(this.rawUnits()));

  readonly tocItems = computed(() => {
    const items: TocItem[] = [];
    const walk = (units: WvUnit[], depth: number, prefix: number[]) => {
      units.forEach((unit, index) => {
        const numbering = [...prefix, index + 1];
        items.push({
          unit,
          depth,
          numbering: numbering.join('.'),
          siblingIndex: index + 1,
        });
        if (this.collapsedUnits().has(unit.id)) return;
        walk(unit.children ?? [], depth + 1, numbering);
      });
    };
    walk(this.rootUnits(), 0, []);
    return items;
  });

  readonly selectedDetail = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) return null;
    return this.detailCache()[unit.id] ?? null;
  });

  readonly selectedTreeUnit = computed(() => {
    const id = this.selectedUnit()?.id;
    if (!id) return null;
    return this.findUnitInTree(id, this.rootUnits());
  });

  readonly selectedSummary = computed(() => {
    return this.selectedDetail()?.summary ?? this.selectedTreeUnit()?.summary ?? this.selectedUnit()?.summary ?? null;
  });

  readonly displayBody = computed(() => {
    const detail = this.selectedDetail();
    const unit = this.selectedTreeUnit() ?? this.selectedUnit();
    return detail?.reading_body ?? detail?.anchor_text ?? unit?.anchor_text ?? unit?.body_preview ?? null;
  });

  readonly summaryBlocks = computed(() => this.buildPassageBlocks(this.selectedSummary()));
  readonly passageBlocks = computed(() => {
    const detail = this.selectedDetail();
    if (detail?.reading_blocks?.length) {
      return this.normalizeStructuredBlocks(detail.reading_blocks);
    }
    return this.buildPassageBlocks(this.displayBody());
  });
  readonly hasArabicPassage = computed(() => {
    const blocks = this.passageBlocks();
    return blocks.length > 0 && blocks.every((block) => block.arabic && block.kind === 'paragraph');
  });

  readonly selectedChapter = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) return null;
    let current = this.unitsById().get(unit.id) ?? unit;
    while (current.parent_unit_id) {
      const parent = this.unitsById().get(current.parent_unit_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  });

  readonly selectedParentUnit = computed(() => {
    const parentId = this.selectedUnit()?.parent_unit_id;
    return parentId ? (this.unitsById().get(parentId) ?? null) : null;
  });

  readonly highlightEntries = computed<ReaderHighlightEntry[]>(() => {
    const directHighlights = this.highlights().map<ReaderHighlightEntry>((highlight) => ({
      id: highlight.id,
      note_kind: 'highlight',
      excerpt_text: highlight.anchor_text,
      body_md: highlight.selected_text,
      created_at: highlight.created_at,
      locator: highlight.locator,
      source: 'highlight',
    }));

    const noteHighlights = this.notes()
      .filter((note) => this.isHighlightKind(note.note_kind))
      .map<ReaderHighlightEntry>((note) => ({
        id: note.id,
        note_kind: note.note_kind,
        excerpt_text: note.excerpt_text,
        body_md: note.body_md,
        created_at: note.created_at,
        locator: null,
        source: 'note',
      }));

    return [...directHighlights, ...noteHighlights].sort((left, right) =>
      this.compareCreatedAt(left.created_at, right.created_at),
    );
  });

  readonly regularNotes = computed(() =>
    this.notes().filter((note) => !this.isHighlightKind(note.note_kind) && !this.isWvKind(note.note_kind)),
  );

  readonly wvNotes = computed(() => this.notes().filter((note) => this.isWvKind(note.note_kind)));

  ngOnInit(): void {
    gsap.registerPlugin(ScrollTrigger);
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        void this.router.navigate(['/worldview/library']);
        return;
      }
      this.loadSource(id);
    });
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.reader-page', { opacity: 0 }, { opacity: 1, duration: 0.32, ease: 'power2.out' });
    this.animateWorkspace();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.stopReaderResize();
    this.stopTocResize();
    this.pageAnimationContext?.revert();
    this.scrollAnimationContext?.revert();
  }

  back(): void {
    void this.router.navigate(['/worldview/library']);
  }

  selectUnit(unit: WvUnit): void {
    this.expandAncestors(unit);

    const sameUnit = this.selectedUnit()?.id === unit.id;
    this.selectedUnit.set(unit);
    if (!sameUnit) {
      this.notes.set([]);
      this.highlights.set([]);
      void this.loadReaderData(unit.id);
    } else if (!this.notes().length && !this.highlights().length && !this.notesLoading()) {
      void this.loadReaderData(unit.id);
    }

    if (sameUnit && this.detailCache()[unit.id]) return;

    this.detailLoading.set(true);

    this.http.get<any>(`${this.base}/worldview/units/${unit.id}`).subscribe({
      next: (res) => {
        if (res?.ok && res.result) {
          const detail = this.normalizeUnit(res.result) as WvUnitDetail;
          detail.reading_body = res.result.reading_body ?? null;
          detail.reading_blocks = Array.isArray(res.result.reading_blocks) ? res.result.reading_blocks : null;
          detail.children = (res.result.children ?? []).map((child: any) => this.normalizeUnit(child));

          this.detailCache.update((cache) => ({ ...cache, [unit.id]: detail }));
          if (detail.children.length) this.mergeUnits(detail.children);
        }

        this.detailLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          this.animateWorkspace();
          this.animateScrollSurfaces();
        });
      },
      error: () => {
        this.detailLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onTocRowClick(unit: WvUnit): void {
    if (this.hasChildren(unit) && this.selectedUnit()?.id === unit.id) {
      this.toggleCollapsed(unit.id);
      return;
    }

    this.selectUnit(unit);
  }

  onTocToggle(event: Event, unit: WvUnit): void {
    event.stopPropagation();
    this.selectUnit(unit);
    this.toggleCollapsed(unit.id);
  }

  toggleCollapsed(unitId: string): void {
    this.collapsedUnits.update((current) => {
      const next = new Set(current);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  }

  isCollapsed(unitId: string): boolean {
    return this.collapsedUnits().has(unitId);
  }

  hasChildren(unit: WvUnit): boolean {
    return (unit.children?.length ?? 0) > 0;
  }

  startReaderResize(event: PointerEvent): void {
    if (!this.splitContainerRef?.nativeElement || this.workspaceHidden()) return;

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

  startTocResize(event: PointerEvent): void {
    if (!this.readerBodyRef?.nativeElement || this.tocHidden()) return;

    event.preventDefault();
    this.stopTocResize();

    this.tocResizePointerId = event.pointerId;
    this.isResizingToc.set(true);

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    const onMove = (moveEvent: PointerEvent) => {
      if (this.tocResizePointerId !== null && moveEvent.pointerId !== this.tocResizePointerId) return;
      this.updateTocWidth(moveEvent.clientX);
    };

    const onUp = (endEvent: PointerEvent) => {
      if (this.tocResizePointerId !== null && endEvent.pointerId !== this.tocResizePointerId) return;
      this.stopTocResize();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }

    this.removeTocResizeListeners = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
    };

    this.updateTocWidth(event.clientX);
  }

  onTocResizeKeydown(event: KeyboardEvent): void {
    if (this.tocHidden()) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.adjustTocWidth(-18);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.adjustTocWidth(18);
    }
  }

  toggleTocHidden(): void {
    const nextHidden = !this.tocHidden();
    this.tocHidden.set(nextHidden);
    if (!nextHidden && this.tocWidth() < 220) {
      this.tocWidth.set(310);
    }
  }

  toggleWorkspaceHidden(): void {
    const nextHidden = !this.workspaceHidden();
    this.workspaceHidden.set(nextHidden);
    if (nextHidden) this.stopReaderResize();
  }

  onReaderResizeKeydown(event: KeyboardEvent): void {
    if (this.workspaceHidden()) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.adjustReaderSplit(-4);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.adjustReaderSplit(4);
    }
  }

  sourceTypeLabel(type?: string | null): string {
    const key = this.normalizeType(type);
    const map: Record<string, string> = {
      book: 'Book',
      article: 'Article',
      essay: 'Essay',
      paper: 'Paper',
      lecture: 'Lecture',
      podcast: 'Podcast',
      video: 'Video',
      website: 'Website',
      document: 'Document',
      scripture: 'Scripture',
      report: 'Report',
      other: 'Source',
    };
    return map[key] ?? this.startCase(key);
  }

  sourceTypeColor(type?: string | null): string {
    const key = this.normalizeType(type);
    const map: Record<string, string> = {
      book: 'gold',
      article: 'blue',
      essay: 'ember',
      paper: 'purple',
      lecture: 'sage',
      podcast: 'sage',
      video: 'blue',
      website: 'amber',
      document: 'gold',
      scripture: 'gold',
      report: 'purple',
      other: '',
    };
    return map[key] ?? '';
  }

  unitTypeLabel(type?: string | null): string {
    const key = this.normalizeUnitType(type);
    const map: Record<string, string> = {
      chapter: 'Chapter',
      passage: 'Passage',
      section: 'Section',
      part: 'Part',
      unit: 'Unit',
      excerpt: 'Excerpt',
      page: 'Page',
      paragraph: 'Paragraph',
    };
    return map[key] ?? this.startCase(key);
  }

  unitTypeColor(type?: string | null): string {
    const key = this.normalizeUnitType(type);
    const map: Record<string, string> = {
      chapter: 'gold',
      passage: 'blue',
      section: 'blue',
      part: 'purple',
      unit: 'sage',
      excerpt: 'amber',
      page: 'ember',
      paragraph: 'sage',
    };
    return map[key] ?? '';
  }

  unitLabel(unit: WvUnit, fallbackIndex?: number): string {
    return unit.title?.trim() || `${this.unitTypeLabel(unit.unit_type)} ${fallbackIndex ?? ''}`.trim();
  }

  refLine(unit: WvUnit): string {
    if (unit.start_ref && unit.end_ref) return `${unit.start_ref} – ${unit.end_ref}`;
    if (unit.start_ref) return unit.start_ref;
    if (unit.end_ref) return unit.end_ref;
    return '';
  }

  summaryPreview(unit: WvUnit): string {
    const summary = unit.summary?.trim() ?? '';
    if (!summary) return '';
    return summary.length > 110 ? `${summary.slice(0, 107)}...` : summary;
  }

  sourcePeopleLine(): string {
    const people = (this.source()?.people ?? [])
      .map((person) => person.display_name?.trim())
      .filter((name): name is string => !!name);

    return people.join(' · ');
  }

  tocOrdinalLabel(item: TocItem): string {
    if (item.depth === 0) {
      const chapterRef = this.chapterNumber(item.unit);
      const rootLabel = this.unitTypeLabel(item.unit.unit_type);
      return `${rootLabel} ${chapterRef ?? item.siblingIndex}`;
    }

    const ordinal = item.numbering.split('.').pop() ?? String(item.siblingIndex);
    return `${this.unitTypeLabel(item.unit.unit_type)} ${ordinal}`;
  }

  tabCount(tab: ReaderTab): number {
    switch (tab) {
      case 'highlights':
        return this.highlightEntries().length;
      case 'notes':
        return this.regularNotes().length;
      case 'wv':
        return this.wvNotes().length;
    }
  }

  kindIcon(kind: string): string {
    return KIND_ICON[kind] ?? '◆';
  }

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
    return labels[kind] ?? this.startCase(kind);
  }

  formatDate(dt?: string | null): string {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dt;
    }
  }

  arabicWords(text: string): string[] {
    return text
      .replace(END_MARKER_RE, '')
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => !!word)
      .filter((word) => !ARABIC_INDIC_ONLY_RE.test(word));
  }

  isArabicText(value?: string | null): boolean {
    return !!value && ARABIC_SCRIPT_RE.test(value);
  }

  textDirection(value?: string | null): 'rtl' | 'ltr' {
    return this.isArabicText(value) ? 'rtl' : 'ltr';
  }

  private loadSource(id: string): void {
    this.sourceLoading.set(true);
    this.detailLoading.set(false);
    this.notesLoading.set(false);
    this.source.set(null);
    this.rawUnits.set([]);
    this.selectedUnit.set(null);
    this.detailCache.set({});
    this.notes.set([]);
    this.highlights.set([]);
    this.collapsedUnits.set(new Set());
    this.textPaneHeight.set(60);
    this.tocHidden.set(false);
    this.tocWidth.set(310);
    this.workspaceHidden.set(false);

    this.http.get<any>(`${this.base}/worldview/sources/${id}`).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.source.set(res.source ?? null);
          const units = (res.units ?? []).map((unit: any) => this.normalizeUnit(unit));
          this.rawUnits.set(units);

          const first = this.firstSelectableUnit(units);
          if (first) this.selectUnit(first);
        }

        this.sourceLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          this.animateWorkspace();
          this.animateScrollSurfaces();
        });
      },
      error: () => {
        this.sourceLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private normalizeUnit(unit: any): WvUnit {
    const sourceId = typeof unit.source_id === 'string' ? unit.source_id.trim() : '';
    const parentUnitId = typeof unit.parent_unit_id === 'string' ? unit.parent_unit_id.trim() : '';
    return {
      id: unit.id,
      source_id: sourceId,
      parent_unit_id: parentUnitId || null,
      unit_type: unit.unit_type ?? null,
      title: unit.title ?? null,
      order_index: unit.order_index ?? null,
      start_ref: unit.start_ref ?? null,
      end_ref: unit.end_ref ?? null,
      anchor_text: unit.anchor_text ?? null,
      summary: unit.summary ?? null,
      body_preview: unit.body_preview ?? null,
      meta: unit.meta ?? null,
      children: unit.children ?? [],
    };
  }

  private async loadReaderData(unitId: string): Promise<void> {
    this.notesLoading.set(true);

    try {
      const res = await fetch(`${this.base}/wv/notes?source_unit_id=${unitId}&limit=100`);
      const data = await res.json();
      if (this.selectedUnit()?.id !== unitId) return;

      if (data?.ok) {
        this.notes.set(data.notes ?? []);
        this.highlights.set(data.highlights ?? []);
      } else {
        this.notes.set([]);
        this.highlights.set([]);
      }
    } catch {
      if (this.selectedUnit()?.id !== unitId) return;
      this.notes.set([]);
      this.highlights.set([]);
    } finally {
      if (this.selectedUnit()?.id === unitId) {
        this.notesLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => this.animateWorkspace());
      }
    }
  }

  private mergeUnits(units: WvUnit[]): void {
    const map = new Map(this.rawUnits().map((unit) => [unit.id, unit] as const));
    for (const unit of units) {
      const current = map.get(unit.id) ?? ({} as WvUnit);
      map.set(unit.id, {
        ...current,
        ...unit,
        source_id: unit.source_id || current.source_id,
        parent_unit_id: unit.parent_unit_id ?? current.parent_unit_id ?? null,
        unit_type: unit.unit_type ?? current.unit_type ?? null,
        title: unit.title ?? current.title ?? null,
        order_index: unit.order_index ?? current.order_index ?? null,
        start_ref: unit.start_ref ?? current.start_ref ?? null,
        end_ref: unit.end_ref ?? current.end_ref ?? null,
        anchor_text: unit.anchor_text ?? current.anchor_text ?? null,
        summary: unit.summary ?? current.summary ?? null,
        body_preview: unit.body_preview ?? current.body_preview ?? null,
        meta: unit.meta ?? current.meta ?? null,
        children: (unit.children?.length ? unit.children : current.children) ?? [],
      });
    }
    this.rawUnits.set(Array.from(map.values()));
  }

  private firstSelectableUnit(units: WvUnit[]): WvUnit | null {
    const roots = this.buildUnitTree(units);
    if (!roots.length) return null;

    let current = roots[0];
    while (current.children?.length) {
      current = current.children[0];
    }
    return current;
  }

  private buildUnitTree(units: WvUnit[]): WvUnit[] {
    const childrenByParent = new Map<string, WvUnit[]>();

    for (const unit of units) {
      if (!unit.parent_unit_id) continue;
      const bucket = childrenByParent.get(unit.parent_unit_id) ?? [];
      bucket.push(unit);
      childrenByParent.set(unit.parent_unit_id, bucket);
    }

    const buildBranch = (parentId: string | null): WvUnit[] => {
      const branch = parentId
        ? (childrenByParent.get(parentId) ?? [])
        : units.filter((unit) => !unit.parent_unit_id);

      return this.sortUnits(branch).map((unit) => ({
        ...unit,
        children: buildBranch(unit.id),
      }));
    };

    return buildBranch(null);
  }

  private findUnitInTree(id: string, units: WvUnit[]): WvUnit | null {
    for (const unit of units) {
      if (unit.id === id) return unit;
      const found = this.findUnitInTree(id, unit.children ?? []);
      if (found) return found;
    }
    return null;
  }

  private sortUnits(units: WvUnit[]): WvUnit[] {
    return [...units].sort((left, right) => {
      const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id.localeCompare(right.id);
    });
  }

  private chapterNumber(unit: WvUnit): string | null {
    const ref = unit.start_ref ?? unit.end_ref ?? '';
    const match = ref.match(/^(\d+)/);
    return match?.[1] ?? null;
  }

  private buildPassageBlocks(value?: string | null): PassageBlock[] {
    const source = value?.trim() ?? '';
    if (!source) return [];

    return source
      .split(/\n\s*\n+/)
      .map((part) => this.normalizePassageBlock(part))
      .filter((block): block is PassageBlock => !!block);
  }

  private normalizeStructuredBlocks(blocks: WvReadingBlock[]): PassageBlock[] {
    return blocks
      .map<PassageBlock | null>((block, index) => {
        const type = (block.type ?? 'paragraph').trim().toLowerCase();
        const text = (block.text ?? '').trim();
        const href = (block.href ?? '').trim();
        const label = (block.label ?? '').trim();
        const cite = (block.cite ?? '').trim();

        if (!type) return null;
        if (type !== 'separator' && !text && !href) return null;

        if (type === 'separator') {
          return {
            id: `separator-${index}`,
            text: '',
            marker: null,
            direction: 'ltr',
            arabic: false,
            kind: 'separator',
            href: null,
            label: null,
            cite: null,
          };
        }

        const arabic = this.isArabicText(text);
        const passageBlock: PassageBlock = {
          id: `${type}-${index}-${text.slice(0, 20) || 'block'}`,
          text,
          marker: null,
          direction: arabic ? 'rtl' : 'ltr',
          arabic,
          kind: this.normalizeStructuredKind(type),
          href: href || null,
          label: label || null,
          cite: cite || null,
        };
        return passageBlock;
      })
      .filter((block): block is PassageBlock => !!block);
  }

  private normalizePassageBlock(part: string): PassageBlock | null {
    const text = part.trim();
    if (!text) return null;

    const arabic = this.isArabicText(text);
    if (!arabic) {
      if (/^-{3,}$/.test(text)) {
        return {
          id: `divider-${Math.random().toString(36).slice(2, 8)}`,
          text: '',
          marker: null,
          direction: 'ltr',
          arabic: false,
          kind: 'separator',
          href: null,
          label: null,
          cite: null,
        };
      }

      const headingMatch = text.match(/^##\s+(.+)$/);
      if (headingMatch) {
        const clean = this.cleanRichText(headingMatch[1]);
        return {
          id: `heading-${clean.slice(0, 24)}`,
          text: clean,
          marker: null,
          direction: 'ltr',
          arabic: false,
          kind: 'heading',
          href: null,
          label: null,
          cite: null,
        };
      }

      const subheadingMatch = text.match(/^###\s+(.+)$/);
      if (subheadingMatch) {
        const clean = this.cleanRichText(subheadingMatch[1]);
        return {
          id: `subheading-${clean.slice(0, 24)}`,
          text: clean,
          marker: null,
          direction: 'ltr',
          arabic: false,
          kind: 'subheading',
          href: null,
          label: null,
          cite: null,
        };
      }

      const linkMatch = text.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (linkMatch) {
        return {
          id: `link-${linkMatch[1].slice(0, 24)}`,
          text: this.cleanRichText(linkMatch[1]),
          marker: null,
          direction: 'ltr',
          arabic: false,
          kind: 'link',
          href: linkMatch[2],
          label: this.cleanRichText(linkMatch[1]),
          cite: null,
        };
      }
    }

    const match = arabic ? text.match(/^(.*?)(?:\s+([٠-٩0-9]+))$/u) : null;
    const body = match?.[1]?.trim() || text;
    const marker = match?.[2] ? this.toArabicIndicDigits(match[2]) : null;

    return {
      id: `${body.slice(0, 24)}-${marker ?? 'text'}`,
      text: arabic ? body : this.cleanRichText(body),
      marker,
      direction: arabic ? 'rtl' : 'ltr',
      arabic,
      kind: 'paragraph',
      href: null,
      label: null,
      cite: null,
    };
  }

  private normalizeStructuredKind(type: string): PassageBlock['kind'] {
    switch (type) {
      case 'heading':
      case 'subheading':
      case 'separator':
      case 'link':
      case 'quote':
        return type;
      default:
        return 'paragraph';
    }
  }

  private expandAncestors(unit: WvUnit): void {
    const next = new Set(this.collapsedUnits());
    let parentId = unit.parent_unit_id ?? null;

    while (parentId) {
      next.delete(parentId);
      parentId = this.unitsById().get(parentId)?.parent_unit_id ?? null;
    }

    this.collapsedUnits.set(next);
  }

  private isHighlightKind(kind: string): boolean {
    return kind === 'quote' || kind === 'highlight';
  }

  private isWvKind(kind: string): boolean {
    return kind === 'insight' || kind === 'claim_seed' || kind === 'worldview';
  }

  private compareCreatedAt(left?: string | null, right?: string | null): number {
    const leftTs = left ? Date.parse(left) : 0;
    const rightTs = right ? Date.parse(right) : 0;
    return leftTs - rightTs;
  }

  private adjustReaderSplit(delta: number): void {
    const next = Math.max(28, Math.min(76, this.textPaneHeight() + delta));
    this.textPaneHeight.set(next);
  }

  private adjustTocWidth(delta: number): void {
    const next = Math.max(220, Math.min(520, this.tocWidth() + delta));
    this.tocWidth.set(next);
  }

  private updateReaderSplit(clientY: number): void {
    if (!this.splitContainerRef?.nativeElement) return;

    const rect = this.splitContainerRef.nativeElement.getBoundingClientRect();
    if (rect.height <= 0) return;

    const next = ((clientY - rect.top) / rect.height) * 100;
    this.textPaneHeight.set(Math.max(28, Math.min(76, next)));
  }

  private updateTocWidth(clientX: number): void {
    if (!this.readerBodyRef?.nativeElement) return;

    const rect = this.readerBodyRef.nativeElement.getBoundingClientRect();
    if (rect.width <= 0) return;

    const next = clientX - rect.left;
    this.tocWidth.set(Math.max(220, Math.min(520, next)));
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

  private stopTocResize(): void {
    this.tocResizePointerId = null;
    this.isResizingToc.set(false);
    this.removeTocResizeListeners?.();
    this.removeTocResizeListeners = null;

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }

  private animateWorkspace(): void {
    const root = this.readerBodyRef?.nativeElement;
    if (!root) return;

    this.pageAnimationContext?.revert();
    this.pageAnimationContext = gsap.context(() => {
      const revealTargets = gsap.utils.toArray<HTMLElement>('.reader-stack__body > *');
      const tocRows = gsap.utils.toArray<HTMLElement>('.toc-row');

      if (this.prefersReducedMotion()) {
        gsap.set(
          ['.left-panel__head', '.mode-bar', '.read-controls', '.story-header', '.reader-stack', revealTargets],
          { opacity: 1, x: 0, y: 0, clearProps: 'transform' },
        );
        gsap.set(['.story-header__line', '.story-heading__line', '.story-subheading__line'], { scaleX: 1 });
        return;
      }

      gsap.set('.story-header__line', { scaleX: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.left-panel__head', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.3 })
        .fromTo('.mode-bar, .read-controls', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.34, stagger: 0.05 }, 0.06)
        .fromTo('.story-kicker', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.28 }, 0.12)
        .fromTo('.story-title', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.48 }, 0.16)
        .to('.story-header__line', { scaleX: 1, duration: 0.58, ease: 'power2.out' }, 0.24)
        .fromTo('.reader-stack', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.34, stagger: 0.06 }, 0.18);

      if (tocRows.length) {
        tl.fromTo(tocRows, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.28, stagger: 0.022 }, 0.08);
      }

      if (revealTargets.length) {
        tl.fromTo(revealTargets, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.24, stagger: 0.018 }, 0.24);
      }
    }, root);
  }

  private animateScrollSurfaces(): void {
    const scroller = this.readAreaRef?.nativeElement;
    if (!scroller) return;

    this.scrollAnimationContext?.revert();
    this.scrollAnimationContext = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>('.scroll-reveal');
      if (!targets.length) return;

      if (this.prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform' });
        gsap.set(['.story-heading__line', '.story-subheading__line'], { scaleX: 1 });
        return;
      }

      gsap.set(targets, { opacity: 0, y: 22 });
      gsap.set(['.story-heading__line', '.story-subheading__line'], { scaleX: 0 });
      targets.forEach((target, index) => {
        const line = target.querySelector<HTMLElement>('.story-heading__line, .story-subheading__line');
        const scrollTrigger = {
          trigger: target,
          scroller,
          start: index === 0 ? 'top bottom' : 'top 88%',
          once: true,
        };

        if (line) {
          const tl = gsap.timeline({ defaults: { overwrite: 'auto' }, scrollTrigger });
          tl.to(target, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            clearProps: 'transform',
            delay: index === 0 ? 0.04 : 0,
          }).to(
            line,
            {
              scaleX: 1,
              duration: 0.56,
              ease: 'power2.out',
              clearProps: 'transform',
            },
            '-=0.34',
          );
          return;
        }

        gsap.to(target, {
          opacity: 1,
          y: 0,
          duration: 0.52,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform',
          delay: index === 0 ? 0.04 : 0,
          scrollTrigger,
        });
      });

      ScrollTrigger.refresh();
    }, scroller);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private normalizeType(type?: string | null): string {
    return (type ?? '').trim() || 'other';
  }

  private cleanRichText(value: string): string {
    return value
      .replace(/<aside>|<\/aside>|💡/g, '')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeUnitType(type?: string | null): string {
    return (type ?? '').trim() || 'unit';
  }

  private startCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private toArabicIndicDigits(value: string): string {
    return value.replace(/\d/g, (digit) => String.fromCharCode(0x0660 + Number(digit)));
  }
}
