import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, IonContent } from '@ionic/angular';
import gsap from 'gsap';

import { environment } from '../../../../environments/environment';
import { WvGraphShellComponent } from '../wv-graph/wv-graph-shell/wv-graph-shell.component';

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string | null;
  source_domain?: string | null;
  people?: Array<{ id: string; display_name?: string | null; role?: string | null }> | null;
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
  // Full unit fields from /worldview/units/:id
  readingBody?: string[] | null;
  readingBlocks?: Array<{ type?: string; text?: string; [k: string]: unknown }> | null;
  readingSchema?: string | null;
  locatorLabel?: string | null;
  readingMinutes?: number | null;
  children?: WvUnit[];
}

interface ReaderNoteEntry {
  id: string;
  noteKind: string;
  title?: string | null;
  bodyMd: string;
  excerptText?: string | null;
  locator?: string | null;
  createdAt?: string | null;
}

interface ReaderHighlightEntry {
  id: string;
  noteKind: string;
  title?: string | null;
  bodyMd: string;
  excerptText?: string | null;
  locator?: string | null;
  color?: string | null;
  createdAt?: string | null;
  source: 'highlight' | 'note';
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
}

interface ReadingBlock {
  type: string; // 'heading' | 'subheading' | 'paragraph' | 'quote' | 'link' | 'separator'
  text?: string;
  cite?: string;
  label?: string;
  href?: string;
}

type ReaderSheetTab = 'highlights' | 'notes' | 'wv';

// Used only for heuristic fallback classification of flat readingBody[]
type BlockType = 'h1' | 'h2' | 'h3' | 'blockquote' | 'attribution' | 'link' | 'para';
interface ClassifiedBlock { text: string; type: BlockType; url?: string; }

@Component({
  selector: 'app-worldview-unit-reader',
  standalone: true,
  imports: [CommonModule, IonicModule, WvGraphShellComponent],
  templateUrl: './worldview-unit-reader.page.html',
  styleUrl: './worldview-unit-reader.page.scss',
})
export class WorldviewUnitReaderPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sheetDragPointerId: number | null = null;
  private sheetDragStartY = 0;
  private sheetDragStartExpanded = false;
  private removeSheetDragListeners: (() => void) | null = null;

  @ViewChild('readerEl') readerEl?: ElementRef<HTMLElement>;
  @ViewChild('headerEl') headerEl?: ElementRef<HTMLElement>;
  @ViewChild('summaryEl') summaryEl?: ElementRef<HTMLElement>;
  @ViewChild('proseEl') proseEl?: ElementRef<HTMLElement>;
  @ViewChild('subEl') subEl?: ElementRef<HTMLElement>;
  @ViewChild('tocSheetEl') tocSheetEl?: ElementRef<HTMLElement>;
  @ViewChild('contentRef') contentRef?: IonContent;

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly allUnits = signal<WvUnit[]>([]);
  readonly loading = signal(true);
  readonly tocOpen = signal(false);
  readonly sheetExpanded = signal(false);
  readonly sheetTab = signal<ReaderSheetTab>('highlights');
  readonly readerNotes = signal<ReaderNoteEntry[]>([]);
  readonly readerHighlights = signal<ReaderHighlightEntry[]>([]);
  readonly readerWv = signal<ReaderNoteEntry[]>([]);
  readonly skeletons = [1, 2, 3, 4, 5, 6];
  readonly sheetTabs: { id: ReaderSheetTab; label: string; icon: string }[] = [
    { id: 'highlights', label: 'Highlights', icon: 'sparkles-outline' },
    { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
    { id: 'wv', label: 'Worldview', icon: 'git-network-outline' },
  ];

  readonly rootUnits = computed(() => buildUnitTree(this.allUnits()));
  readonly unitsById = computed(() => new Map(this.allUnits().map((u) => [u.id, u] as const)));
  readonly tocItems = computed(() => flattenUnits(this.rootUnits()));

  readonly unit = computed(() => this.unitsById().get(this.unitId()) ?? null);

  readonly children = computed(() => {
    const u = this.unit();
    if (!u) return [];
    return sortUnits(this.allUnits().filter((x) => x.parent_unit_id === u.id));
  });

  readonly parentChapter = computed(() => {
    const u = this.unit();
    if (!u) return null;
    let current = this.unitsById().get(u.id) ?? u;
    while (current.parent_unit_id) {
      const parent = this.unitsById().get(current.parent_unit_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  });

  readonly summaryBlocks = computed(() => splitParagraphs(this.unit()?.summary ?? ''));

  // Use structured readingBlocks when available, fall back to heuristic classification
  readonly blocks = computed((): ReadingBlock[] => {
    const u = this.unit();
    if (!u) return [];

    // Prefer rich structured blocks from the API
    if (u.readingBlocks?.length) {
      return u.readingBlocks as ReadingBlock[];
    }

    // Fall back: classify flat readingBody[] or body_preview
    const raw: string[] = u.readingBody?.filter(Boolean) ?? (() => {
      const lines = [
        ...splitParagraphs(u.body_preview ?? ''),
        ...splitParagraphs(u.anchor_text ?? ''),
      ];
      return lines.filter((b, i) => lines.indexOf(b) === i);
    })();

    return classifyBlocks(raw).map((b): ReadingBlock => ({
      type: b.type === 'h1' ? 'heading'
          : b.type === 'h2' || b.type === 'h3' ? 'subheading'
          : b.type === 'blockquote' ? 'quote'
          : b.type === 'attribution' ? 'cite-line'
          : b.type === 'link' ? 'link'
          : 'paragraph',
      text: b.text,
      href: (b as { url?: string }).url,
    }));
  });

  readonly currentTocIndex = computed(() => {
    const id = this.unitId();
    const idx = this.tocItems().findIndex((item) => item.unit.id === id);
    return idx < 0 ? 0 : idx;
  });

  readonly readProgressPercent = computed(() => {
    const total = this.tocItems().length;
    if (total <= 1) return 0;
    return Math.round((this.currentTocIndex() / (total - 1)) * 100);
  });

  readonly prevUnit = computed(() => {
    const idx = this.currentTocIndex();
    return idx > 0 ? (this.tocItems()[idx - 1]?.unit ?? null) : null;
  });

  readonly nextUnit = computed(() => {
    const items = this.tocItems();
    const idx = this.currentTocIndex();
    return idx < items.length - 1 ? (items[idx + 1]?.unit ?? null) : null;
  });

  readonly highlightEntries = computed(() =>
    [...this.readerHighlights()].sort((left, right) => this.compareCreatedAt(left.createdAt, right.createdAt)),
  );

  readonly noteEntries = computed(() =>
    [...this.readerNotes()].sort((left, right) => this.compareCreatedAt(left.createdAt, right.createdAt)),
  );

  readonly wvEntries = computed(() =>
    [...this.readerWv()].sort((left, right) => this.compareCreatedAt(left.createdAt, right.createdAt)),
  );

  readonly kicker = computed(() => {
    const u = this.unit();
    const chapter = this.parentChapter();
    if (u && chapter && chapter.id !== u.id) {
      return `${this.unitTypeLabel(chapter.unit_type)} · ${this.unitTitle(chapter)}`;
    }
    const src = this.source();
    if (!src) return 'Worldview Source';
    if (src.people?.length) return src.people.map((p) => p.display_name).filter(Boolean).join(' · ');
    return src.creator ?? src.subtitle ?? 'Worldview Source';
  });

  ngOnInit(): void {
    const sourceId = this.route.snapshot.paramMap.get('sourceId') ?? '';
    const unitId = this.route.snapshot.paramMap.get('unitId') ?? '';
    this.sourceId.set(sourceId);
    this.unitId.set(unitId);
    if (!sourceId || !unitId) { this.loading.set(false); return; }
    void this.load(sourceId, unitId);
  }

  ngAfterViewInit(): void {
    // Animations run after data loads
  }

  ngOnDestroy(): void {
    this.stopSheetDrag();
  }

  private async load(sourceId: string, unitId: string): Promise<void> {
    try {
      // Fetch source + all units (for TOC/nav), full unit content, and reader annotations in parallel.
      const [sourceRes, unitRes, annotationsRes] = await Promise.all([
        fetch(`${environment.apiBase}/worldview/sources/${sourceId}`),
        fetch(`${environment.apiBase}/worldview/units/${unitId}`),
        fetch(`${environment.apiBase}/worldview/units/${unitId}/annotations`),
      ]);

      if (sourceRes.ok) {
        const data = (await sourceRes.json()) as { ok: boolean; source: WvSource; units: WvUnit[] };
        if (data.ok) {
          this.source.set(data.source);
          this.allUnits.set(data.units ?? []);
        }
      }

      if (unitRes.ok) {
        const data = (await unitRes.json()) as { ok: boolean; result: WvUnit };
        if (data.ok && data.result) {
          // Merge full unit data into allUnits so the computed unit() signal picks it up
          this.allUnits.update((units) => {
            const idx = units.findIndex((u) => u.id === data.result.id);
            if (idx >= 0) {
              const updated = [...units];
              updated[idx] = { ...updated[idx], ...data.result };
              return updated;
            }
            // Unit not in list yet — add it
            return [...units, data.result];
          });
        }
      }

      if (annotationsRes.ok) {
        const data = (await annotationsRes.json()) as {
          ok: boolean;
          notes?: unknown;
          highlights?: unknown;
          wv?: unknown;
        };

        if (data.ok) {
          this.readerNotes.set(this.normalizeNotes(data.notes));
          this.readerHighlights.set(this.normalizeHighlights(data.highlights));
          this.readerWv.set(this.normalizeWorldview(data.wv));
        }
      }
    } catch { /* ignore */ } finally {
      this.loading.set(false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.animate()));
    }
  }

  private animate(): void {
    setTimeout(() => {
      const header = this.headerEl?.nativeElement;
      const summary = this.summaryEl?.nativeElement;
      const prose = this.proseEl?.nativeElement;
      if (!header) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. Kicker + title fade up
      const kicker = header.querySelector('.reading__kicker');
      const title = header.querySelector('.reading__title');
      const rule = header.querySelector('.reading__rule');
      const meta = header.querySelector('.reading__meta');

      if (kicker) tl.fromTo(kicker, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
      if (title)  tl.fromTo(title,  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.42 }, '-=0.18');
      if (rule)   tl.fromTo(rule,   { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.48, ease: 'power3.inOut', transformOrigin: 'left' }, '-=0.22');
      if (meta)   tl.fromTo(meta,   { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28 }, '-=0.2');

      // 2. Summary paragraphs stagger
      if (summary) {
        const paras = summary.querySelectorAll('.summary__para');
        if (paras.length) {
          tl.fromTo(paras,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.36, stagger: 0.09, ease: 'power2.out' },
            '-=0.1'
          );
        }
      }

      // 3. First screen of prose blocks — staggered fade + slide
      if (prose) {
        const firstBlocks = Array.from(
          prose.querySelectorAll<HTMLElement>(
            '.prose-heading-wrap, .prose-para, .prose-quote, .prose-link, .prose-sep'
          )
        ).slice(0, 8); // only first 8 blocks (what's roughly above the fold)

        if (firstBlocks.length) {
          tl.fromTo(firstBlocks,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.34, stagger: 0.06, ease: 'power2.out' },
            '-=0.12'
          );
        }

        // Animate first h1-line separately with a draw effect
        const firstH1Line = prose.querySelector('.prose-h1-line');
        if (firstH1Line) {
          tl.fromTo(firstH1Line,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.55, ease: 'power3.inOut', transformOrigin: 'left' },
            '-=0.5' // overlap with block animation
          );
        }
      }

      // 4. Observe remaining heading lines as user scrolls
      this.observeHeadingLines(prose);
    }, 80);
  }

  private observeHeadingLines(prose: HTMLElement | undefined): void {
    if (!prose) return;
    const lines = prose.querySelectorAll<HTMLElement>('.prose-h1-line, .prose-h2-line');
    if (!lines.length) return;

    // Set initial state for all lines (first may already be animated)
    gsap.set(lines, { scaleX: 0, transformOrigin: 'left' });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const line = entry.target as HTMLElement;
          const isH1 = line.classList.contains('prose-h1-line');
          gsap.to(line, {
            scaleX: 1,
            duration: isH1 ? 0.55 : 0.4,
            ease: 'power3.inOut',
            transformOrigin: 'left',
          });
          observer.unobserve(line);
        }
      });
    }, { threshold: 0.5 });

    lines.forEach((line) => observer.observe(line));
  }

  goToUnit(unitId: string): void {
    void this.router.navigate(['/worldview', 'library', this.sourceId(), 'read', unitId]);
    void this.contentRef?.scrollToTop(0);
  }

  goBack(): void {
    void this.router.navigate(['/worldview', 'library', this.sourceId()]);
  }

  openToc(): void {
    this.sheetExpanded.set(false);
    this.sheetTab.set(this.defaultSheetTab());
    this.tocOpen.set(true);
    requestAnimationFrame(() => {
      const sheet = this.tocSheetEl?.nativeElement;
      if (sheet) {
        gsap.fromTo(sheet, { y: '100%', opacity: 0.4 }, { y: '0%', opacity: 1, duration: 0.38, ease: 'expo.out' });
      }
    });
  }

  closeToc(): void {
    this.stopSheetDrag();
    const sheet = this.tocSheetEl?.nativeElement;
    if (sheet) {
      gsap.to(sheet, {
        y: '100%', opacity: 0, duration: 0.26, ease: 'expo.in',
        onComplete: () => {
          this.sheetExpanded.set(false);
          this.tocOpen.set(false);
        },
      });
    } else {
      this.sheetExpanded.set(false);
      this.tocOpen.set(false);
    }
  }

  selectFromToc(unitId: string): void {
    this.closeToc();
    setTimeout(() => this.goToUnit(unitId), 160);
  }

  setSheetTab(tab: ReaderSheetTab): void {
    this.sheetTab.set(tab);
    // WV graph needs full height — auto-expand sheet
    if (tab === 'wv') {
      this.sheetExpanded.set(true);
    }
  }

  toggleSheetExpanded(): void {
    this.sheetExpanded.update((expanded) => !expanded);
  }

  startSheetDrag(event: PointerEvent): void {
    if (this.sheetDragPointerId !== null) return;

    event.preventDefault();
    this.stopSheetDrag();
    this.sheetDragPointerId = event.pointerId;
    this.sheetDragStartY = event.clientY;
    this.sheetDragStartExpanded = this.sheetExpanded();

    const onPointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== this.sheetDragPointerId) return;

      const delta = pointerEvent.clientY - this.sheetDragStartY;
      if (delta <= -36) {
        this.sheetExpanded.set(true);
      } else if (delta >= 36) {
        this.sheetExpanded.set(false);
      } else {
        this.sheetExpanded.set(this.sheetDragStartExpanded);
      }

      this.stopSheetDrag();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    this.removeSheetDragListeners = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      }
    };
  }

  unitTitle(unit: WvUnit | null | undefined): string {
    return unit?.title?.trim() || unit?.anchor_text?.trim() || 'Untitled unit';
  }

  unitRef(unit: WvUnit | null | undefined): string {
    if (!unit) return '';
    if (unit.start_ref && unit.end_ref && unit.start_ref !== unit.end_ref) {
      return `${unit.start_ref} – ${unit.end_ref}`;
    }
    return unit.start_ref || unit.end_ref || '';
  }

  unitTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      chapter: 'Chapter', section: 'Section', part: 'Part',
      preface: 'Preface', introduction: 'Introduction',
      appendix: 'Appendix', conclusion: 'Conclusion', verse: 'Verse',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Unit';
  }

  typeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'Book', article: 'Article', essay: 'Essay', paper: 'Paper',
      lecture: 'Lecture', podcast: 'Podcast', video: 'Video',
      scripture: 'Scripture', report: 'Report', document: 'Document',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Source';
  }

  typeColor(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'gold', article: 'blue', essay: 'ember', paper: 'purple',
      lecture: 'sage', podcast: 'sage', video: 'blue', scripture: 'gold', report: 'purple',
    };
    return map[(type ?? '').toLowerCase()] ?? '';
  }

  childSummary(unit: WvUnit): string {
    return unit.summary?.trim() || this.unitRef(unit) || 'Open this section.';
  }

  tabCount(tab: ReaderSheetTab): number {
    switch (tab) {
      case 'highlights':
        return this.highlightEntries().length;
      case 'notes':
        return this.noteEntries().length;
      case 'wv':
        return this.wvEntries().length;
    }
  }

  noteKindLabel(kind: string): string {
    const labels: Record<string, string> = {
      highlight: 'Highlight',
      quote: 'Highlight',
      reflection: 'Reflection',
      question: 'Question',
      insight: 'Insight',
      claim_seed: 'Claim',
      worldview: 'Worldview',
      summary: 'Summary',
      observation: 'Observation',
      reference: 'Reference',
      todo: 'Todo',
      idea: 'Idea',
    };

    return labels[kind] ?? kind.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatNoteDate(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  tocMeta(unit: WvUnit): string {
    return [this.unitTypeLabel(unit.unit_type), this.unitRef(unit)].filter(Boolean).join(' · ');
  }

  readingMinutes(unit: WvUnit | null | undefined): string {
    if (unit?.readingMinutes) return `${unit.readingMinutes} min read`;
    const text = [unit?.summary, unit?.body_preview, unit?.anchor_text].filter(Boolean).join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!words) return 'Quick read';
    return `${Math.max(1, Math.round(words / 180))} min read`;
  }

  private defaultSheetTab(): ReaderSheetTab {
    for (const tab of this.sheetTabs) {
      if (this.tabCount(tab.id) > 0) {
        return tab.id;
      }
    }

    return 'highlights';
  }

  private stopSheetDrag(): void {
    this.removeSheetDragListeners?.();
    this.removeSheetDragListeners = null;
    this.sheetDragPointerId = null;
  }

  private compareCreatedAt(left?: string | null, right?: string | null): number {
    const leftTs = left ? Date.parse(left) : 0;
    const rightTs = right ? Date.parse(right) : 0;
    return leftTs - rightTs;
  }

  private normalizeNotes(value: unknown): ReaderNoteEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((note) => ({
        id: typeof note['id'] === 'string' ? note['id'] : '',
        noteKind: typeof note['note_kind'] === 'string' ? note['note_kind'] : 'reflection',
        title: typeof note['title'] === 'string' ? note['title'] : null,
        bodyMd: typeof note['body_md'] === 'string' ? note['body_md'] : '',
        excerptText: typeof note['excerpt_text'] === 'string' ? note['excerpt_text'] : null,
        locator: typeof note['locator'] === 'string' ? note['locator'] : null,
        createdAt: typeof note['created_at'] === 'string' ? note['created_at'] : null,
      }))
      .filter((note) => !!note.id && !!note.bodyMd);
  }

  private normalizeHighlights(value: unknown): ReaderHighlightEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((highlight) => ({
        id: typeof highlight['id'] === 'string' ? highlight['id'] : '',
        noteKind: typeof highlight['note_kind'] === 'string' ? highlight['note_kind'] : 'highlight',
        title: typeof highlight['title'] === 'string' ? highlight['title'] : null,
        bodyMd: typeof highlight['body_md'] === 'string' ? highlight['body_md'] : '',
        excerptText: typeof highlight['excerpt_text'] === 'string' ? highlight['excerpt_text'] : null,
        locator: typeof highlight['locator'] === 'string' ? highlight['locator'] : null,
        color: typeof highlight['color'] === 'string' ? highlight['color'] : null,
        createdAt: typeof highlight['created_at'] === 'string' ? highlight['created_at'] : null,
        source: (highlight['source'] === 'note' ? 'note' : 'highlight') as 'note' | 'highlight',
      }))
      .filter((highlight) => !!highlight.id && !!highlight.bodyMd);
  }

  private normalizeWorldview(value: unknown): ReaderNoteEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((node) => ({
        id: typeof node['id'] === 'string' ? node['id'] : '',
        noteKind: typeof node['node_type'] === 'string' ? node['node_type'] : 'insight',
        title: typeof node['title'] === 'string' ? node['title'] : null,
        bodyMd: typeof node['text_plain'] === 'string' ? node['text_plain'] : '',
        excerptText: typeof node['summary'] === 'string' ? node['summary'] : null,
        locator: typeof node['slug'] === 'string' ? node['slug'] : null,
        createdAt: typeof node['created_at'] === 'string' ? node['created_at'] : null,
      }))
      .filter((node) => !!node.id && !!node.bodyMd);
  }
}

function sortUnits(units: WvUnit[]): WvUnit[] {
  return [...units].sort((l, r) => {
    const d = (l.order_index ?? 0) - (r.order_index ?? 0);
    if (d !== 0) return d;
    return (l.title ?? l.anchor_text ?? '').localeCompare(r.title ?? r.anchor_text ?? '');
  });
}

function buildUnitTree(units: WvUnit[]): WvUnit[] {
  const byId = new Map<string, WvUnit>();
  for (const unit of units) byId.set(unit.id, { ...unit, children: [] });
  const roots: WvUnit[] = [];
  for (const unit of byId.values()) {
    if (unit.parent_unit_id) {
      const parent = byId.get(unit.parent_unit_id);
      if (parent) { parent.children = [...(parent.children ?? []), unit]; continue; }
    }
    roots.push(unit);
  }
  const sortTree = (items: WvUnit[]): WvUnit[] =>
    sortUnits(items).map((item) => ({ ...item, children: sortTree(item.children ?? []) }));
  return sortTree(roots);
}

function flattenUnits(units: WvUnit[], depth = 0, prefix: number[] = []): TocItem[] {
  return units.reduce<TocItem[]>((items, unit, index) => {
    const numbering = [...prefix, index + 1];
    items.push({ unit, depth, numbering: numbering.join('.') });
    items.push(...flattenUnits(unit.children ?? [], depth + 1, numbering));
    return items;
  }, []);
}

function splitParagraphs(value: string): string[] {
  return value.split(/\n{2,}|\n/).map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function classifyBlocks(blocks: string[]): ClassifiedBlock[] {
  return blocks.map((raw, i): ClassifiedBlock => {
    const text = raw.trim();

    // ── URL / link block ──────────────────────────────────────────
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const label = text.replace(/\s*[-–—]?\s*https?:\/\/[^\s]+/, '').trim();
      return { text: label || text, type: 'link', url: urlMatch[0] };
    }

    const words = text.split(/\s+/).length;
    const endsWithPunct = /[.!?]$/.test(text);
    const prev = i > 0 ? blocks[i - 1]?.trim() ?? '' : '';
    const next = i < blocks.length - 1 ? blocks[i + 1]?.trim() ?? '' : '';
    const prevWords = prev.split(/\s+/).length;
    const nextWords = next.split(/\s+/).length;
    const nextEnds = /[.!?]$/.test(next);

    // ── Attribution line (author, Book — short, follows a long block) ─
    // Pattern: short, no period, previous block was long (quote)
    if (words <= 12 && !endsWithPunct && prevWords > 18) {
      return { text, type: 'attribution' };
    }

    // ── Headings ──────────────────────────────────────────────────
    if (words <= 4 && !endsWithPunct) return { text, type: 'h1' };

    if (words <= 9 && !endsWithPunct) {
      // If next block is a long para → section heading
      // If next block is short+no period → probably just a label
      return { text, type: nextWords > 15 ? 'h2' : 'h3' };
    }

    // ── Blockquote (longer text, next block is attribution) ───────
    const nextIsAttrib = nextWords <= 12 && !nextEnds && nextWords > 0;
    if (nextIsAttrib && words > 10) return { text, type: 'blockquote' };

    return { text, type: 'para' };
  });
}
