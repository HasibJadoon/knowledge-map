import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import {
  formatUnitTypeLabel,
  type KmapsSource,
  type KmapsSourceUnit,
} from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { AppAddButtonComponent } from '../../../../../shared/components/app-add-button/app-add-button.component';
import { NativeSearchbarComponent } from '../../../../../shared/components/native-searchbar/native-searchbar.component';
import { SourceUnitEditorModalComponent } from '../../components/source-unit-editor-modal/source-unit-editor-modal';

@Component({
  selector: 'app-source-detail-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, NativeSearchbarComponent, AppAddButtonComponent],
  templateUrl: './source-detail-page.html',
  styleUrl: './source-detail-page.scss',
})
export class SourceDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly searchQuery = signal('');
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly units = computed(() => sortUnits(this.workflow.getUnitsForSource(this.sourceId())));
  readonly currentSource = computed<KmapsSource>(() => this.source() ?? this.buildDraftSource());
  readonly displayRootUnits = computed(() => resolveDisplayRootUnits(this.units(), this.currentSource().title));
  readonly outlineUnits = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const units = this.units();
    const topLevelUnits = this.displayRootUnits();

    if (!query) {
      return topLevelUnits;
    }

    return topLevelUnits.filter((unit) => matchesUnitQuery(unit, query) || matchesDescendantQuery(units, unit.id, query));
  });
  readonly isDraft = computed(() => this.sourceId() === 'new' || !this.source());
  readonly progressPercent = computed(() => clampPercent(this.currentSource().progressPercent));
  readonly progressCopy = computed(() => {
    const currentLocator = this.recentLocator();
    if (currentLocator) {
      return `Last opened: ${currentLocator}`;
    }

    const chapterCount = this.displayRootUnits().length;
    return `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} ready for reading.`;
  });
  readonly emptyTitle = computed(() => {
    if (this.searchQuery().trim()) {
      return 'No matching chapters';
    }

    return 'No chapters yet';
  });
  readonly emptyMessage = computed(() => {
    if (this.searchQuery().trim()) {
      return 'Try a broader search term to find a chapter in this source.';
    }

    return 'Add chapter structure first, then drill into passages before opening the reading tabs.';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || 'new');
      this.searchQuery.set('');
    });
  }

  libraryHref(): string {
    return this.joinRoute(this.libraryRoute());
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  openUnit(unitId: string): void {
    void this.router.navigate(this.unitRoute(unitId));
  }

  resumeReading(): void {
    const target = findPreferredLeafUnit(this.units(), this.displayRootUnits(), this.readRecentLocatorForSource(this.sourceId()));
    if (!target) {
      return;
    }

    void this.router.navigate(this.workspaceRoute(target.id), {
      queryParams: { tab: 'read' },
    });
  }

  goBackToLibrary(): void {
    void this.router.navigate(this.libraryRoute());
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  async addTopLevelUnit(event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event });
  }

  async addSubunit(unitId: string, event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event, initialParentUnitId: unitId });
  }

  async editUnit(unitId: string, event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event, unitId });
  }

  unitMeta(unit: KmapsSourceUnit): string {
    const locator = unit.locatorLabel || composeLocatorLabel(unit.startRef, unit.endRef);
    const meta = [formatUnitTypeLabel(unit.unitType), locator].filter(Boolean);
    return meta.join(' · ');
  }

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  private recentLocator(): string | null {
    const source = this.currentSource();
    const value = source.sourceJson?.['recentLocator'];
    return typeof value === 'string' && value.trim() ? value.trim() : source.sourceRef;
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

  private async openUnitEditorModal(options: {
    event?: Event;
    unitId?: string;
    initialParentUnitId?: string | null;
  }): Promise<void> {
    this.stopEvent(options.event);
    if (this.isDraft()) {
      return;
    }

    const modal = await this.modalController.create({
      component: SourceUnitEditorModalComponent,
      componentProps: {
        sourceId: this.currentSource().id,
        unitId: options.unitId ?? null,
        initialParentUnitId: options.initialParentUnitId ?? null,
      },
      breakpoints: [0, 0.86, 1],
      initialBreakpoint: 0.86,
      backdropDismiss: true,
      handle: true,
      cssClass: 'km-source-unit-editor-modal',
    });

    await modal.present();
  }

  private stopEvent(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private libraryRoute(): string[] {
    return this.routeRoot() === 'wv' ? ['/wv', 'library'] : ['/worldview', 'library'];
  }

  private unitRoute(unitId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'source', this.currentSource().id, 'unit', unitId]
      : ['/worldview', 'sources', this.currentSource().id, 'units', unitId];
  }

  private workspaceRoute(unitId: string): string[] {
    return [...this.unitRoute(unitId), 'workspace'];
  }

  private joinRoute(route: string[]): string {
    return route.join('/');
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

function matchesDescendantQuery(units: KmapsSourceUnit[], parentUnitId: string, query: string): boolean {
  const queue = units.filter((unit) => unit.parentUnitId === parentUnitId);

  while (queue.length) {
    const next = queue.shift();
    if (!next) {
      continue;
    }

    if (matchesUnitQuery(next, query)) {
      return true;
    }

    queue.push(...units.filter((unit) => unit.parentUnitId === next.id));
  }

  return false;
}

function resolveDisplayRootUnits(units: KmapsSourceUnit[], sourceTitle: string): KmapsSourceUnit[] {
  const topLevelUnits = units.filter((unit) => !unit.parentUnitId);
  if (topLevelUnits.length !== 1) {
    return topLevelUnits;
  }

  const [container] = topLevelUnits;
  const containerChildren = sortUnits(units.filter((unit) => unit.parentUnitId === container.id));
  if (!containerChildren.length) {
    return topLevelUnits;
  }

  if (normalizeLabel(container.title) !== normalizeLabel(sourceTitle)) {
    return topLevelUnits;
  }

  return containerChildren;
}

function findPreferredLeafUnit(
  units: KmapsSourceUnit[],
  roots: KmapsSourceUnit[],
  recentLocator: string,
): KmapsSourceUnit | null {
  const leaves: KmapsSourceUnit[] = [];
  for (const root of roots) {
    leaves.push(...collectLeafUnits(units, root.id));
  }
  const orderedLeaves = sortUnits(leaves.length ? leaves : roots);

  return orderedLeaves.find((unit) => matchesRecentLocator(unit, recentLocator)) || orderedLeaves[0] || null;
}

function collectLeafUnits(units: KmapsSourceUnit[], unitId: string): KmapsSourceUnit[] {
  const currentUnit = units.find((unit) => unit.id === unitId);
  if (!currentUnit) {
    return [];
  }

  const children = sortUnits(units.filter((unit) => unit.parentUnitId === unitId));
  if (!children.length) {
    return [currentUnit];
  }

  const leaves: KmapsSourceUnit[] = [];
  for (const child of children) {
    leaves.push(...collectLeafUnits(units, child.id));
  }

  return leaves;
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

function composeLocatorLabel(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef && startRef !== endRef) {
    return `${startRef}-${endRef}`;
  }

  return startRef ?? endRef ?? null;
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}
