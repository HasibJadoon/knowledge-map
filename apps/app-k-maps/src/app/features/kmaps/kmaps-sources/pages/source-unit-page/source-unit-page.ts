import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsSourceUnit, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { AppAddButtonComponent } from '../../../../../shared/components/app-add-button/app-add-button.component';
import { NativeSearchbarComponent } from '../../../../../shared/components/native-searchbar/native-searchbar.component';
import { SourceUnitEditorModalComponent } from '../../components/source-unit-editor-modal/source-unit-editor-modal';

@Component({
  selector: 'app-source-unit-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, NativeSearchbarComponent, AppAddButtonComponent],
  templateUrl: './source-unit-page.html',
  styleUrl: './source-unit-page.scss',
})
export class SourceUnitPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly searchQuery = signal('');

  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly allUnits = computed(() => sortUnits(this.workflow.getUnitsForSource(this.sourceId())));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly parentUnit = computed(() => {
    const currentUnit = this.unit();
    return currentUnit?.parentUnitId ? this.workflow.getUnit(currentUnit.parentUnitId) : null;
  });
  readonly childUnits = computed(() => this.allUnits().filter((unit) => unit.parentUnitId === this.unitId()));
  readonly visibleUnits = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.childUnits();
    }

    return this.childUnits().filter((unit) => matchesUnitQuery(unit, query));
  });
  readonly searchPlaceholder = computed(() =>
    this.childUnits().some((unit) => unit.unitType === 'passage') ? 'Search passages' : 'Search sections',
  );
  readonly heroSummary = computed(() => {
    const currentUnit = this.unit();
    if (!currentUnit) {
      return '';
    }

    return (
      currentUnit.summary ||
      `Open a ${this.childUnits().some((unit) => unit.unitType === 'passage') ? 'passage' : 'section'} to continue into the workspace tabs.`
    );
  });
  readonly childCountLabel = computed(() => formatCollectionLabel(this.childUnits()));
  readonly noteCount = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()).length);
  readonly emptyTitle = computed(() => {
    if (this.searchQuery().trim()) {
      return 'No matching passages';
    }

    return 'No passages yet';
  });
  readonly emptyMessage = computed(() => {
    if (this.searchQuery().trim()) {
      return 'Try a broader search term to find a passage or subsection.';
    }

    return 'Add passages or subsections under this chapter, then open a leaf unit to reach the workspace tabs.';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.searchQuery.set('');
    });

    let redirectedLeafId = '';
    effect(() => {
      const currentUnit = this.unit();
      const currentSourceId = this.sourceId();
      const childUnits = this.childUnits();

      if (!currentSourceId || !currentUnit || childUnits.length) {
        redirectedLeafId = '';
        return;
      }

      if (redirectedLeafId === currentUnit.id) {
        return;
      }

      redirectedLeafId = currentUnit.id;
      void this.router.navigate(this.workspaceRoute(currentUnit.id), {
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
    });
  }

  backHref(): string {
    return this.joinRoute(this.parentUnit() ? this.unitRoute(this.parentUnit()!.id) : this.sourceRoute());
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  openUnit(unitId: string): void {
    const route = this.hasChildUnits(unitId) ? this.unitRoute(unitId) : this.workspaceRoute(unitId);
    void this.router.navigate(route);
  }

  resumeReading(): void {
    const target = findPreferredLeafUnit(this.allUnits(), this.unitId()) || this.unit();
    if (!target) {
      return;
    }

    void this.router.navigate(this.workspaceRoute(target.id), {
      queryParams: { tab: 'read' },
    });
  }

  goBack(): void {
    void this.router.navigate(this.parentUnit() ? this.unitRoute(this.parentUnit()!.id) : this.sourceRoute());
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  async addChildUnit(event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event, initialParentUnitId: this.unitId() });
  }

  unitMeta(unit: KmapsSourceUnit): string {
    const locator = unit.locatorLabel || composeLocatorLabel(unit.startRef, unit.endRef);
    return [formatUnitTypeLabel(unit.unitType), locator].filter(Boolean).join(' · ');
  }

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  async addSubunit(unitId: string, event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event, initialParentUnitId: unitId });
  }

  async editUnit(unitId: string, event?: Event): Promise<void> {
    await this.openUnitEditorModal({ event, unitId });
  }

  private hasChildUnits(unitId: string): boolean {
    return this.allUnits().some((unit) => unit.parentUnitId === unitId);
  }

  private async openUnitEditorModal(options: {
    event?: Event;
    unitId?: string;
    initialParentUnitId?: string | null;
  }): Promise<void> {
    this.stopEvent(options.event);
    if (!this.source()) {
      return;
    }

    const modal = await this.modalController.create({
      component: SourceUnitEditorModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
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

  private sourceRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'source', this.sourceId()]
      : ['/worldview', 'sources', this.sourceId()];
  }

  private unitRoute(unitId = this.unitId()): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'source', this.sourceId(), 'unit', unitId]
      : ['/worldview', 'sources', this.sourceId(), 'units', unitId];
  }

  private workspaceRoute(unitId = this.unitId()): string[] {
    return [...this.unitRoute(unitId), 'workspace'];
  }

  private joinRoute(route: string[]): string {
    return route.join('/');
  }
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

function findPreferredLeafUnit(units: KmapsSourceUnit[], rootUnitId: string): KmapsSourceUnit | null {
  const currentUnit = units.find((unit) => unit.id === rootUnitId) ?? null;
  if (!currentUnit) {
    return null;
  }

  const children = sortUnits(units.filter((unit) => unit.parentUnitId === rootUnitId));
  if (!children.length) {
    return currentUnit;
  }

  for (const child of children) {
    const leaf = findPreferredLeafUnit(units, child.id);
    if (leaf) {
      return leaf;
    }
  }

  return currentUnit;
}

function formatCollectionLabel(units: KmapsSourceUnit[]): string {
  const count = units.length;
  if (!count) {
    return '0 passages';
  }

  const everyPassage = units.every((unit) => unit.unitType === 'passage');
  const noun = everyPassage ? 'passage' : 'section';
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function composeLocatorLabel(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef && startRef !== endRef) {
    return `${startRef}-${endRef}`;
  }

  return startRef ?? endRef ?? null;
}
