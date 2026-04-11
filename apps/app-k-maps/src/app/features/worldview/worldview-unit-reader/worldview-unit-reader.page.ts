import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, IonContent } from '@ionic/angular';
import gsap from 'gsap';

import { environment } from '../../../../environments/environment';

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

// Used only for heuristic fallback classification of flat readingBody[]
type BlockType = 'h1' | 'h2' | 'h3' | 'blockquote' | 'attribution' | 'link' | 'para';
interface ClassifiedBlock { text: string; type: BlockType; url?: string; }

@Component({
  selector: 'app-worldview-unit-reader',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './worldview-unit-reader.page.html',
  styleUrl: './worldview-unit-reader.page.scss',
})
export class WorldviewUnitReaderPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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
  readonly skeletons = [1, 2, 3, 4, 5, 6];

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

  private async load(sourceId: string, unitId: string): Promise<void> {
    try {
      // Fetch source + all units (for TOC/nav) AND full unit content in parallel
      const [sourceRes, unitRes] = await Promise.all([
        fetch(`${environment.apiBase}/worldview/sources/${sourceId}`),
        fetch(`${environment.apiBase}/worldview/units/${unitId}`),
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
    this.tocOpen.set(true);
    requestAnimationFrame(() => {
      const sheet = this.tocSheetEl?.nativeElement;
      if (sheet) {
        gsap.fromTo(sheet, { y: '100%', opacity: 0.4 }, { y: '0%', opacity: 1, duration: 0.38, ease: 'expo.out' });
      }
    });
  }

  closeToc(): void {
    const sheet = this.tocSheetEl?.nativeElement;
    if (sheet) {
      gsap.to(sheet, {
        y: '100%', opacity: 0, duration: 0.26, ease: 'expo.in',
        onComplete: () => this.tocOpen.set(false),
      });
    } else {
      this.tocOpen.set(false);
    }
  }

  selectFromToc(unitId: string): void {
    this.closeToc();
    setTimeout(() => this.goToUnit(unitId), 160);
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
