import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
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
  children: WvUnit[];
}

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

@Component({
  selector: 'km-worldview-library-units',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './worldview-library-units.component.html',
  styleUrl: './worldview-library-units.component.scss',
})
export class WorldviewLibraryUnitsComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.wvBase;

  private routeSub?: Subscription;

  readonly source = signal<WvSource | null>(null);
  readonly rawUnits = signal<WvUnit[]>([]);
  readonly selectedUnit = signal<WvUnit | null>(null);
  readonly detailCache = signal<Record<string, WvUnitDetail>>({});

  readonly sourceLoading = signal(true);
  readonly detailLoading = signal(false);

  readonly skeletons = [1, 2, 3, 4, 5];

  readonly rootUnits = computed(() => {
    const units = [...this.rawUnits()].sort((left, right) => {
      const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id.localeCompare(right.id);
    });

    const childrenByParent = new Map<string, WvUnit[]>();
    for (const unit of units) {
      if (!unit.parent_unit_id) continue;
      const bucket = childrenByParent.get(unit.parent_unit_id) ?? [];
      bucket.push(unit);
      childrenByParent.set(unit.parent_unit_id, bucket);
    }

    return units
      .filter((unit) => !unit.parent_unit_id)
      .map((unit) => ({
        ...unit,
        children: (childrenByParent.get(unit.id) ?? []).sort((left, right) => {
          const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.id.localeCompare(right.id);
        }),
      }));
  });

  readonly selectedDetail = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) return null;
    return this.detailCache()[unit.id] ?? null;
  });

  readonly selectedSummary = computed(() => {
    return this.selectedDetail()?.summary ?? this.selectedUnit()?.summary ?? null;
  });

  readonly displayBody = computed(() => {
    const detail = this.selectedDetail();
    const unit = this.selectedUnit();
    return detail?.reading_body ?? detail?.anchor_text ?? unit?.anchor_text ?? unit?.body_preview ?? null;
  });

  readonly selectedChapter = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) return null;
    if (!unit.parent_unit_id) return unit;
    return this.rootUnits().find((candidate) => candidate.id === unit.parent_unit_id) ?? null;
  });

  readonly relatedSections = computed(() => {
    const chapter = this.selectedChapter();
    return chapter?.children ?? [];
  });

  readonly sectionPanelLabel = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) return 'Sections';
    return unit.parent_unit_id ? 'Sibling Sections' : 'Sections';
  });

  ngOnInit(): void {
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
    gsap.fromTo('.reader-page', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  back(): void {
    void this.router.navigate(['/worldview/library']);
  }

  selectUnit(unit: WvUnit): void {
    if (this.selectedUnit()?.id === unit.id && this.detailCache()[unit.id]) return;

    this.selectedUnit.set(unit);
    this.detailLoading.set(true);

    this.http.get<any>(`${this.base}/worldview/units/${unit.id}`).subscribe({
      next: (res) => {
        if (res?.ok && res.result) {
          const detail = this.normalizeUnit(res.result) as WvUnitDetail;
          detail.reading_body = res.result.reading_body ?? null;
          detail.children = (res.result.children ?? []).map((child: any) => this.normalizeUnit(child));

          this.detailCache.update((cache) => ({ ...cache, [unit.id]: detail }));
          if (detail.children.length) this.mergeUnits(detail.children);
        }

        this.detailLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo(
            '.read-area',
            { opacity: 0 },
            { opacity: 1, duration: 0.26, ease: 'power2.out' },
          );
        });
      },
      error: () => {
        this.detailLoading.set(false);
        this.cdr.markForCheck();
      },
    });
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

  isArabicText(value?: string | null): boolean {
    return !!value && ARABIC_SCRIPT_RE.test(value);
  }

  textDirection(value?: string | null): 'rtl' | 'ltr' {
    return this.isArabicText(value) ? 'rtl' : 'ltr';
  }

  private loadSource(id: string): void {
    this.sourceLoading.set(true);
    this.detailLoading.set(false);
    this.source.set(null);
    this.rawUnits.set([]);
    this.selectedUnit.set(null);
    this.detailCache.set({});

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
          gsap.fromTo(
            '.u-row, .s-row',
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out' },
          );
        });
      },
      error: () => {
        this.sourceLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private normalizeUnit(unit: any): WvUnit {
    return {
      id: unit.id,
      source_id: unit.source_id,
      parent_unit_id: unit.parent_unit_id ?? null,
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

  private mergeUnits(units: WvUnit[]): void {
    const map = new Map(this.rawUnits().map((unit) => [unit.id, unit] as const));
    for (const unit of units) {
      const current = map.get(unit.id) ?? ({} as WvUnit);
      map.set(unit.id, { ...current, ...unit });
    }
    this.rawUnits.set(Array.from(map.values()));
  }

  private firstSelectableUnit(units: WvUnit[]): WvUnit | null {
    const roots = units
      .filter((unit) => !unit.parent_unit_id)
      .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));

    if (!roots.length) return null;

    const byParent = new Map<string, WvUnit[]>();
    for (const unit of units) {
      if (!unit.parent_unit_id) continue;
      const bucket = byParent.get(unit.parent_unit_id) ?? [];
      bucket.push(unit);
      byParent.set(unit.parent_unit_id, bucket);
    }

    const firstRoot = roots[0];
    const firstChild = (byParent.get(firstRoot.id) ?? []).sort(
      (left, right) => (left.order_index ?? 0) - (right.order_index ?? 0),
    )[0];

    return firstChild ?? firstRoot;
  }

  private normalizeType(type?: string | null): string {
    return (type ?? '').trim() || 'other';
  }

  private normalizeUnitType(type?: string | null): string {
    return (type ?? '').trim() || 'unit';
  }

  private startCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
