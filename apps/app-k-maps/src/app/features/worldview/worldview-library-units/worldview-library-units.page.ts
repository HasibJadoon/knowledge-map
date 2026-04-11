import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';

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
  meta?: Record<string, unknown> | null;
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
  children?: WvUnit[];
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
}

@Component({
  selector: 'app-worldview-library-units',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-library-units.page.html',
  styleUrl: './worldview-library-units.page.scss',
})
export class WorldviewLibraryUnitsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sourceId = signal('');
  readonly selectedUnitId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly units = signal<WvUnit[]>([]);
  readonly loading = signal(true);
  readonly skeletons = [1, 2, 3, 4];

  readonly rootUnits = computed(() => buildUnitTree(this.units()));
  readonly chapterCount = computed(() => this.rootUnits().length);
  readonly unitsById = computed(() => new Map(this.units().map((unit) => [unit.id, unit] as const)));
  readonly tocItems = computed(() => flattenUnits(this.rootUnits()));

  readonly selectedUnit = computed(() => {
    const selectedId = this.selectedUnitId();
    if (selectedId) {
      const explicit = this.unitsById().get(selectedId);
      if (explicit) {
        return explicit;
      }
    }

    return this.rootUnits()[0] ?? null;
  });

  readonly selectedChapter = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) {
      return null;
    }

    let current = this.unitsById().get(unit.id) ?? unit;
    while (current.parent_unit_id) {
      const parent = this.unitsById().get(current.parent_unit_id);
      if (!parent) {
        break;
      }
      current = parent;
    }

    return current;
  });

  readonly selectedChildren = computed(() => {
    const current = this.selectedUnit();
    if (!current) {
      return [];
    }

    return sortUnits(
      this.units().filter((unit) => unit.parent_unit_id === current.id),
    );
  });

  readonly summaryBlocks = computed(() => splitParagraphs(this.selectedUnit()?.summary ?? ''));

  readonly readingBlocks = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) {
      return [];
    }

    const blocks = [
      ...splitParagraphs(unit.body_preview ?? ''),
      ...splitParagraphs(unit.anchor_text ?? ''),
    ];

    return blocks.filter((block, index) => blocks.indexOf(block) === index);
  });

  ngOnInit(): void {
    const sourceId = this.route.snapshot.paramMap.get('id') ?? '';
    this.sourceId.set(sourceId);
    this.selectedUnitId.set(this.route.snapshot.queryParamMap.get('unit') ?? '');

    if (!sourceId) {
      this.loading.set(false);
      return;
    }

    void this.load(sourceId);
  }

  private async load(id: string): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/worldview/sources/${id}`);
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as { ok: boolean; source: WvSource; units: WvUnit[] };
      if (!data.ok) {
        return;
      }

      this.source.set(data.source);
      this.units.set(data.units ?? []);
      this.ensureSelectedUnit();
    } catch {
      // ignore network errors for now
    } finally {
      this.loading.set(false);
    }
  }

  selectUnit(unitId: string): void {
    this.selectedUnitId.set(unitId);
    void this.router.navigate(['/worldview', 'library', this.sourceId()], {
      queryParams: { unit: unitId },
      replaceUrl: true,
    });
  }

  isActive(unitId: string): boolean {
    return this.selectedUnit()?.id === unitId;
  }

  typeIcon(type?: string | null): string {
    const map: Record<string, string> = {
      book: '📚',
      article: '📰',
      essay: '✍',
      paper: '🧾',
      lecture: '🎓',
      podcast: '🎙',
      video: '▶',
      scripture: '✧',
      report: '▣',
      document: '◎',
      other: '◎',
    };
    return map[(type ?? '').toLowerCase()] ?? '◎';
  }

  typeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'Book',
      article: 'Article',
      essay: 'Essay',
      paper: 'Paper',
      lecture: 'Lecture',
      podcast: 'Podcast',
      video: 'Video',
      scripture: 'Scripture',
      report: 'Report',
      document: 'Document',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Source';
  }

  typeColor(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'gold',
      article: 'blue',
      essay: 'ember',
      paper: 'purple',
      lecture: 'sage',
      podcast: 'sage',
      video: 'blue',
      scripture: 'gold',
      report: 'purple',
      document: '',
    };
    return map[(type ?? '').toLowerCase()] ?? '';
  }

  unitTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      chapter: 'Chapter',
      section: 'Section',
      part: 'Part',
      preface: 'Preface',
      introduction: 'Introduction',
      appendix: 'Appendix',
      conclusion: 'Conclusion',
      verse: 'Verse',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Unit';
  }

  sourcePeopleLine(): string {
    const src = this.source();
    if (!src) {
      return '';
    }

    if (src.people?.length) {
      return src.people.map((person) => person.display_name).filter(Boolean).join(' · ');
    }

    return src.creator ?? '';
  }

  sourceMetaLine(): string {
    const src = this.source();
    if (!src) {
      return '';
    }

    return [src.publisher, src.publication_year, src.language?.toUpperCase(), src.source_domain]
      .filter(Boolean)
      .join(' · ');
  }

  unitTitle(unit: WvUnit | null | undefined): string {
    return unit?.title?.trim() || unit?.anchor_text?.trim() || 'Untitled unit';
  }

  unitRef(unit: WvUnit | null | undefined): string {
    if (!unit) {
      return '';
    }

    if (unit.start_ref && unit.end_ref && unit.start_ref !== unit.end_ref) {
      return `${unit.start_ref} - ${unit.end_ref}`;
    }

    return unit.start_ref || unit.end_ref || '';
  }

  tocLabel(item: TocItem): string {
    return `${item.numbering} ${this.unitTitle(item.unit)}`;
  }

  childSummary(unit: WvUnit): string {
    return unit.summary?.trim() || this.unitRef(unit) || 'Open this section in the reader.';
  }

  storyKicker(): string {
    const unit = this.selectedUnit();
    const chapter = this.selectedChapter();

    if (unit && chapter && chapter.id !== unit.id) {
      return `${this.unitTypeLabel(chapter.unit_type)} · ${this.unitTitle(chapter)}`;
    }

    return this.sourcePeopleLine() || this.source()?.subtitle || 'Worldview Source';
  }

  tocMeta(unit: WvUnit): string {
    return [this.unitTypeLabel(unit.unit_type), this.unitRef(unit)]
      .filter(Boolean)
      .join(' · ');
  }

  readingMinutes(unit: WvUnit | null | undefined): string {
    const text = [unit?.summary, unit?.body_preview, unit?.anchor_text].filter(Boolean).join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!words) {
      return 'Quick read';
    }

    return `${Math.max(1, Math.round(words / 180))} min read`;
  }

  private ensureSelectedUnit(): void {
    const selectedId = this.selectedUnitId();
    if (selectedId && this.unitsById().get(selectedId)) {
      return;
    }

    const firstUnit = this.rootUnits()[0];
    this.selectedUnitId.set(firstUnit?.id ?? '');
  }
}

function sortUnits(units: WvUnit[]): WvUnit[] {
  return [...units].sort((left, right) => {
    const orderDelta = (left.order_index ?? 0) - (right.order_index ?? 0);
    if (orderDelta !== 0) {
      return orderDelta;
    }

    return (left.title ?? left.anchor_text ?? '').localeCompare(right.title ?? right.anchor_text ?? '');
  });
}

function buildUnitTree(units: WvUnit[]): WvUnit[] {
  const byId = new Map<string, WvUnit>();
  for (const unit of units) {
    byId.set(unit.id, { ...unit, children: [] });
  }

  const roots: WvUnit[] = [];
  for (const unit of byId.values()) {
    if (unit.parent_unit_id) {
      const parent = byId.get(unit.parent_unit_id);
      if (parent) {
        parent.children = [...(parent.children ?? []), unit];
        continue;
      }
    }

    roots.push(unit);
  }

  const sortTree = (items: WvUnit[]): WvUnit[] =>
    sortUnits(items).map((item) => ({
      ...item,
      children: sortTree(item.children ?? []),
    }));

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
  return value
    .split(/\n{2,}|\n/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
