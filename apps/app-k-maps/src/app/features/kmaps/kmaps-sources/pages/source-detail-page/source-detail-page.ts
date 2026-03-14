import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import {
  formatUnitTypeLabel,
  type KmapsSource,
  type KmapsSourceUnit,
} from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';
import { NativeSearchbarComponent } from '../../../../../shared/components/native-searchbar/native-searchbar.component';

type SourceOutlineGroup = {
  unit: KmapsSourceUnit;
  children: KmapsSourceUnit[];
  visibleChildren: KmapsSourceUnit[];
  isExpanded: boolean;
  isExpandable: boolean;
};

@Component({
  selector: 'app-source-detail-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, NativeSearchbarComponent],
  templateUrl: './source-detail-page.html',
  styleUrl: './source-detail-page.scss',
})
export class SourceDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly searchQuery = signal('');
  readonly expandedChapterIds = signal<Record<string, boolean>>({});
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly units = computed(() => sortUnits(this.workflow.getUnitsForSource(this.sourceId())));
  readonly outlineGroups = computed<SourceOutlineGroup[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const topLevelUnits = this.units().filter((unit) => !unit.parentUnitId);
    const childrenByParent = new Map<string, KmapsSourceUnit[]>();

    for (const unit of this.units()) {
      if (!unit.parentUnitId) {
        continue;
      }

      const siblings = childrenByParent.get(unit.parentUnitId) || [];
      siblings.push(unit);
      childrenByParent.set(unit.parentUnitId, sortUnits(siblings));
    }

    return topLevelUnits
      .map((unit) => {
        const children = childrenByParent.get(unit.id) || [];
        const isExpandable = children.length > 0;

        if (!query) {
          const isExpanded = isExpandable && this.isChapterExpanded(unit.id);
          return {
            unit,
            children,
            visibleChildren: isExpanded ? children : [],
            isExpanded,
            isExpandable,
          };
        }

        const unitMatches = matchesUnitQuery(unit, query);
        const matchingChildren = children.filter((child) => matchesUnitQuery(child, query));

        if (!unitMatches && matchingChildren.length === 0) {
          return null;
        }

        const visibleChildren = !isExpandable ? [] : unitMatches ? children : matchingChildren;

        return {
          unit,
          children,
          visibleChildren,
          isExpanded: visibleChildren.length > 0,
          isExpandable,
        };
      })
      .filter((group): group is SourceOutlineGroup => group !== null);
  });
  readonly currentSource = computed<KmapsSource>(() => this.source() ?? this.buildDraftSource());
  readonly isDraft = computed(() => this.sourceId() === 'new' || !this.source());
  readonly headerSubtitle = computed(() => {
    const source = this.currentSource();
    return [source.creator, source.publicationYear ? String(source.publicationYear) : null].filter(Boolean).join(' • ');
  });
  readonly progressPercent = computed(() => clampPercent(this.currentSource().progressPercent));
  readonly progressCopy = computed(() => {
    const source = this.currentSource();
    const currentLocator = this.recentLocator();

    if (currentLocator) {
      return `Last opened: ${currentLocator}`;
    }

    return `${this.units().length} ${this.units().length === 1 ? 'unit' : 'units'} ready for reading.`;
  });
  readonly emptyTitle = computed(() => {
    if (this.searchQuery().trim()) {
      return 'No matching chapters or sections';
    }

    return 'No units yet';
  });
  readonly emptyMessage = computed(() => {
    if (this.searchQuery().trim()) {
      return 'Try a broader search term to find a chapter, section, or locator.';
    }

    return 'Add chapter or section structure first, then open each source unit in the new workspace tabs.';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      const sourceId = paramMap.get('sourceId') || 'new';
      this.sourceId.set(sourceId);
      this.syncExpandedOutline(sourceId);
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  openUnit(unitId: string, tab?: 'overview' | 'read'): void {
    void this.router.navigate(['/worldview', 'sources', this.currentSource().id, 'units', unitId], {
      queryParams: tab && tab !== 'overview' ? { tab } : undefined,
    });
  }

  resumeReading(): void {
    this.openContinueReading();
  }

  toggleOutlineGroup(event: Event, unitId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleChapter(unitId);
  }

  goBackToLibrary(): void {
    void this.router.navigate(['/worldview/library']);
  }

  trackGroup(_: number, group: SourceOutlineGroup): string {
    return group.unit.id;
  }

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  chapterChevron(group: SourceOutlineGroup): string {
    if (!group.isExpandable) {
      return 'chevron-forward-outline';
    }

    return group.isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline';
  }

  private openContinueReading(): void {
    const firstUnit = this.units().find((unit) => !unit.parentUnitId) || this.units()[0];
    if (!firstUnit) {
      return;
    }

    this.openUnit(firstUnit.id, 'read');
  }

  private recentLocator(): string | null {
    const source = this.currentSource();
    const value = source.sourceJson?.['recentLocator'];
    return typeof value === 'string' && value.trim() ? value.trim() : source.sourceRef;
  }

  private toggleChapter(unitId: string): void {
    this.expandedChapterIds.update((current) => ({
      ...current,
      [unitId]: !current[unitId],
    }));
  }

  private isChapterExpanded(unitId: string): boolean {
    return !!this.expandedChapterIds()[unitId];
  }

  private syncExpandedOutline(sourceId: string): void {
    const units = sortUnits(this.workflow.getUnitsForSource(sourceId));
    const topLevelUnits = units.filter((unit) => !unit.parentUnitId);
    const childParentIds = new Set(units.filter((unit) => !!unit.parentUnitId).map((unit) => unit.parentUnitId as string));
    const expandableUnits = topLevelUnits.filter((unit) => childParentIds.has(unit.id));

    if (!expandableUnits.length) {
      this.expandedChapterIds.set({});
      return;
    }

    const recentLocator = this.readRecentLocatorForSource(sourceId);
    const preferredUnit =
      expandableUnits.find((unit) => matchesRecentLocator(unit, recentLocator)) || expandableUnits[0];

    this.expandedChapterIds.set(preferredUnit ? { [preferredUnit.id]: true } : {});
  }

  private readRecentLocatorForSource(sourceId: string): string {
    const source = this.workflow.getSource(sourceId);
    const value = source?.sourceJson?.['recentLocator'];

    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }

    return (source?.sourceRef || '').toLowerCase();
  }

  private buildDraftSource(): KmapsSource {
    const now = new Date().toISOString();

    return {
      id: 'draft-source',
      canonicalInput: 'wv_source|draft',
      userId: 1,
      sourceType: 'document',
      title: 'New source draft',
      subtitle: 'Use quick capture after you define the source structure',
      creator: null,
      publisher: null,
      publicationYear: null,
      language: 'English',
      sourceUrl: null,
      sourceRef: null,
      status: 'draft',
      description: 'This draft placeholder is ready for the next source you want to read inside the K-Maps workflow.',
      progressPercent: 0,
      lastOpenedAt: now,
      sourceJson: null,
      metaJson: null,
      createdAt: now,
      updatedAt: null,
    };
  }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sortUnits(units: KmapsSourceUnit[]): KmapsSourceUnit[] {
  return [...units].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    return left.title.localeCompare(right.title);
  });
}

function matchesUnitQuery(unit: KmapsSourceUnit, query: string): boolean {
  const haystack = [unit.title, unit.summary, unit.locatorLabel, unit.anchorText, formatUnitTypeLabel(unit.unitType)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesRecentLocator(unit: KmapsSourceUnit, recentLocator: string): boolean {
  if (!recentLocator) {
    return false;
  }

  const chapterToken = unit.unitType === 'chapter' ? `chapter ${unit.orderIndex}` : '';
  const haystack = [unit.title, unit.locatorLabel, unit.startRef, unit.endRef, chapterToken]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return recentLocator.includes(haystack) || haystack.includes(recentLocator) || recentLocator.includes(chapterToken);
}
