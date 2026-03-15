import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

import { isAdminToken } from '../../../../../core/auth/auth.utils';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsUnitWorkspaceTabsComponent } from '../../../kmaps-shared/components/unit-workspace-tabs/unit-workspace-tabs';
import { KmapsNote, KmapsNoteKind, KmapsSourceUnit, KmapsStatItem, formatNoteKindLabel, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';
import { WvWorkspaceTabKey } from '../../../kmaps-shared/models/wv-workspace.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { NoteWorkspaceModalComponent } from '../../../kmaps-notes/components/note-workspace-modal/note-workspace-modal';
import { WvHighlightsTabComponent } from '../../components/wv-highlights-tab/wv-highlights-tab';
import { WvNotesFilterKey, WvNotesTabComponent } from '../../components/wv-notes-tab/wv-notes-tab';
import { WvOverviewTabComponent } from '../../components/wv-overview-tab/wv-overview-tab';
import { WvReadTabComponent } from '../../components/wv-read-tab/wv-read-tab';
import { AppAddButtonComponent } from '../../../../../shared/components/app-add-button/app-add-button.component';

type ReadingSegment = {
  index: number;
  locator: string;
  marker: string | null;
  body: string;
};

type WorkspaceNoteKind = Extract<KmapsNoteKind, 'highlight' | 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed' | 'idea'>;
type ReadContextMenuPosition = {
  x: number;
  y: number;
};

@Component({
  selector: 'app-wv-unit-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    KmapsPageHeaderComponent,
    KmapsUnitWorkspaceTabsComponent,
    WvOverviewTabComponent,
    WvReadTabComponent,
    WvHighlightsTabComponent,
    WvNotesTabComponent,
    AppAddButtonComponent,
  ],
  templateUrl: './wv-unit-workspace.page.html',
  styleUrl: './wv-unit-workspace.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvUnitWorkspacePage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly worldviewApi = inject(WorldviewApiService);
  private readonly distillService = inject(WvDistillService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly nodesService = inject(WvNodesService);

  private existingDistillRequestVersion = 0;
  readonly canManageDistill = isAdminToken(localStorage.getItem('auth_token'));

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeTab = signal<WvWorkspaceTabKey>('overview');
  readonly searchQuery = signal('');
  readonly activeNotesFilter = signal<WvNotesFilterKey>('all');
  readonly selectedReadUnitId = signal('');
  readonly selectedSegmentIndexes = signal<number[]>([]);
  readonly selectedExcerpt = signal('');
  readonly selectedLocator = signal('');
  readonly readContextMenuOpen = signal(false);
  readonly readContextMenuPosition = signal<ReadContextMenuPosition | null>(null);
  readonly existingDistillBatchId = signal<string | null>(null);
  readonly existingDistillBatchStatus = signal<'draft' | 'active' | 'completed' | null>(null);

  readonly noteFilters: ReadonlyArray<WvNotesFilterKey> = ['all', 'summary', 'claim_seed', 'insight', 'reflection'];

  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly parentUnit = computed(() => {
    const currentUnit = this.unit();
    return currentUnit?.parentUnitId ? this.workflow.getUnit(currentUnit.parentUnitId) : null;
  });
  readonly childUnits = computed(() =>
    this.workflow
      .getUnitsForSource(this.sourceId())
      .filter((unit) => unit.parentUnitId === this.unitId())
      .sort((left, right) => left.orderIndex - right.orderIndex),
  );
  readonly readUnits = computed(() => {
    const currentUnit = this.unit();
    if (!currentUnit) {
      return [];
    }

    const children = this.childUnits();
    if (!children.length) {
      return [currentUnit];
    }

    // Keep the full passage available in the reader when nested ayah units exist.
    return currentUnit.readingBody.length ? [currentUnit, ...children] : children;
  });
  readonly selectedReadUnit = computed(
    () => this.readUnits().find((unit) => unit.id === this.selectedReadUnitId()) || this.readUnits()[0] || null,
  );
  readonly normalizedQuery = computed(() => this.searchQuery().trim().toLowerCase());
  readonly allHighlights = computed(() => this.highlightsService.listForUnit(this.sourceId(), this.unitId()));
  readonly allNotes = computed(() => this.notesService.listForUnit(this.sourceId(), this.unitId()));
  readonly filteredOverviewUnits = computed(() => {
    const query = this.normalizedQuery();
    if (!query) {
      return this.childUnits();
    }

    return this.childUnits().filter((unit) => matchesUnitQuery(unit, query));
  });
  readonly filteredHighlights = computed(() => {
    const query = this.normalizedQuery();
    if (!query) {
      return this.allHighlights();
    }

    return this.allHighlights().filter((note) => this.matchesNoteQuery(note, query));
  });
  readonly filteredNotes = computed(() => {
    const query = this.normalizedQuery();
    const filter = this.activeNotesFilter();

    return this.allNotes().filter((note) => {
      if (filter !== 'all' && note.noteKind !== filter) {
        return false;
      }

      return !query || this.matchesNoteQuery(note, query);
    });
  });
  readonly recentHighlights = computed(() => this.highlightsService.recentForUnit(this.sourceId(), this.unitId()));
  readonly recentNotes = computed(() => this.notesService.recentForUnit(this.sourceId(), this.unitId()));
  readonly nodeCount = computed(() => this.nodesService.getNodeCountForUnit(this.sourceId(), this.unitId()));
  readonly localDistillBatch = computed(() => this.distillService.getBatchForUnit(this.unitId()));
  readonly hasExistingDistill = computed(() => this.existingDistillBatchId() != null);
  readonly stats = computed<KmapsStatItem[]>(() => [
    { label: 'Highlights', value: this.allHighlights().length },
    { label: 'Notes', value: this.allNotes().length },
    { label: 'Nodes', value: this.nodeCount(), emphasis: this.nodeCount() > 0 },
  ]);
  readonly displayedReadingSegments = computed(() =>
    buildReadingSegments(this.selectedReadUnit(), this.normalizedQuery()),
  );
  readonly searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'read':
        return 'Search reading';
      case 'highlights':
        return 'Search highlights';
      case 'notes':
        return 'Search notes';
      case 'overview':
      default:
        return 'Search this unit';
    }
  });
  readonly isEmptyState = computed(() => !this.source() || !this.unit() || this.sourceId() === 'new' || this.unitId() === 'new');
  readonly showDistillFab = computed(() =>
    this.canManageDistill
    && (this.allNotes().length >= 1 || this.allHighlights().length >= 1)
    && !this.hasExistingDistill()
    && this.localDistillBatch()?.status !== 'active'
    && this.localDistillBatch()?.status !== 'completed',
  );
  readonly readContextMenuLeft = computed(() => this.resolveContextMenuLeft(this.readContextMenuPosition()));
  readonly readContextMenuTop = computed(() => this.resolveContextMenuTop(this.readContextMenuPosition()));

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeReadContextMenu();
  }

  backHref(): string {
    if (!this.sourceId()) {
      return this.joinRoute(this.libraryRoute());
    }

    return this.joinRoute(this.parentUnit() ? this.unitRoute(this.parentUnit()!.id) : this.sourceRoute());
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.searchQuery.set('');
      this.clearReadSelection();
      this.activeNotesFilter.set('all');
      void this.loadExistingDistillBatch();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((queryParamMap) => {
      this.activeTab.set(parseTabKey(queryParamMap.get('tab')));
    });

    effect(() => {
      const readUnits = this.readUnits();
      const currentId = this.selectedReadUnitId();

      if (!readUnits.length) {
        if (currentId) {
          this.selectedReadUnitId.set('');
        }
        return;
      }

      if (!readUnits.some((unit) => unit.id === currentId)) {
        this.selectedReadUnitId.set(readUnits[0].id);
      }
    });

    let lastReadUnitId = '';
    effect(() => {
      const nextReadUnitId = this.selectedReadUnit()?.id || '';
      if (nextReadUnitId !== lastReadUnitId) {
        lastReadUnitId = nextReadUnitId;
        this.clearReadSelection();
      }
    });
  }

  setActiveTab(tabKey: WvWorkspaceTabKey | string): void {
    const nextTab = parseTabKey(typeof tabKey === 'string' ? tabKey : tabKey);
    this.activeTab.set(nextTab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: nextTab === 'overview' ? null : nextTab,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.clearReadSelection();
  }

  onNotesFilterChange(filter: WvNotesFilterKey): void {
    this.activeNotesFilter.set(filter);
  }

  openUnit(unitId: string, tab?: WvWorkspaceTabKey): void {
    if (!unitId || unitId === this.unitId()) {
      return;
    }

    void this.router.navigate(this.hasChildUnits(unitId) ? this.unitRoute(unitId) : this.workspaceRoute(unitId), {
      queryParams: tab && tab !== 'overview' ? { tab } : undefined,
    });
  }

  selectReadUnit(unitId: string): void {
    this.selectedReadUnitId.set(unitId);
  }

  onReadSelectionChange(selection: { excerpt: string; locator: string }): void {
    this.selectedSegmentIndexes.set([]);
    this.selectedExcerpt.set(selection.excerpt.trim());
    this.selectedLocator.set(selection.locator.trim());
  }

  toggleReadSegment(index: number): void {
    const nextIndexes = this.selectedSegmentIndexes().includes(index)
      ? this.selectedSegmentIndexes().filter((value) => value !== index)
      : [...this.selectedSegmentIndexes(), index].sort((left, right) => left - right);

    this.selectedSegmentIndexes.set(nextIndexes);
    if (!nextIndexes.length) {
      this.clearReadSelection();
      return;
    }

    const selectedSegments = this.displayedReadingSegments().filter((segment) => nextIndexes.includes(segment.index));
    if (!selectedSegments.length) {
      this.clearReadSelection();
      return;
    }

    this.selectedExcerpt.set(selectedSegments.map((segment) => segment.body).join(' '));
    this.selectedLocator.set(composeSegmentSelectionLocator(selectedSegments, this.selectedReadUnit()));
  }

  onReadContextMenu(request: { event: MouseEvent; mode: 'selection' | 'segment'; index?: number; excerpt?: string; locator?: string }): void {
    if (request.mode === 'selection') {
      this.selectedSegmentIndexes.set([]);
      this.selectedExcerpt.set((request.excerpt || '').trim());
      this.selectedLocator.set((request.locator || '').trim());
    } else if (request.index != null) {
      const currentIndexes = this.selectedSegmentIndexes();
      const nextIndexes =
        currentIndexes.length && currentIndexes.includes(request.index) ? currentIndexes : [request.index];
      this.applySegmentSelection(nextIndexes);
    }

    if (!this.selectedExcerpt().trim()) {
      this.closeReadContextMenu();
      return;
    }

    this.readContextMenuPosition.set({
      x: request.event.clientX,
      y: request.event.clientY,
    });
    this.readContextMenuOpen.set(true);
  }

  async highlightSelected(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    const readUnit = this.selectedReadUnit();

    if (!excerpt || !readUnit || !this.source()) {
      return;
    }

    this.highlightsService.createHighlight({
      sourceId: this.sourceId(),
      unitId: readUnit.id,
      selectedText: excerpt,
      locator: this.selectedLocator() || readUnit.locatorLabel || null,
    });

    await this.presentToast('Highlight saved.');
    this.setActiveTab('highlights');
  }

  async copySelectedExcerpt(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    if (!excerpt) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(excerpt);
      await this.presentToast('Copied to clipboard.');
      return;
    }

    await this.presentToast('Clipboard is not available here.');
  }

  async linkSelectedToNode(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    const readUnit = this.selectedReadUnit();

    if (!excerpt || !readUnit || !this.source()) {
      return;
    }

    const note = this.notesService.createNote({
      sourceId: this.sourceId(),
      unitId: readUnit.id,
      noteKind: 'insight',
      title: deriveNodeTitle(excerpt),
      bodyMd: excerpt,
      excerptText: excerpt,
      locator: this.selectedLocator() || readUnit.locatorLabel || null,
    });
    this.workflow.createConceptAndLink(note.title || deriveNodeTitle(excerpt), [note.id]);

    await this.presentToast('Linked to a new node.');
  }

  async openCreateNoteModal(preferredKind: WorkspaceNoteKind = 'question'): Promise<void> {
    if (!this.source() || !this.preferredNoteUnitId()) {
      return;
    }

    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: this.preferredNoteUnitId(),
        preferredKind,
        initialTitle: preferredKind === 'quote' ? deriveNodeTitle(this.selectedExcerpt()) : '',
        initialBodyMd: this.selectedExcerpt() || '',
        initialExcerptText: this.selectedExcerpt() || null,
        initialLocator: this.selectedLocator() || null,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  closeReadContextMenu(): void {
    this.readContextMenuOpen.set(false);
    this.readContextMenuPosition.set(null);
  }

  async highlightFromContextMenu(): Promise<void> {
    this.closeReadContextMenu();
    await this.highlightSelected();
  }

  async takeNoteFromContextMenu(): Promise<void> {
    this.closeReadContextMenu();
    await this.openCreateNoteModal('quote');
  }

  async copyFromContextMenu(): Promise<void> {
    this.closeReadContextMenu();
    await this.copySelectedExcerpt();
  }

  async linkNodeFromContextMenu(): Promise<void> {
    this.closeReadContextMenu();
    await this.linkSelectedToNode();
  }

  async openNote(note: KmapsNote): Promise<void> {
    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: note.sourceUnitId || this.preferredNoteUnitId(),
        noteId: note.id,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  async openNoteFromHighlight(note: KmapsNote): Promise<void> {
    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: note.sourceUnitId || this.preferredNoteUnitId(),
        preferredKind: 'quote',
        initialTitle: deriveNodeTitle(note.excerptText || note.bodyMd),
        initialBodyMd: note.excerptText || note.bodyMd,
        initialExcerptText: note.excerptText || note.bodyMd,
        initialLocator: note.locator,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  async deleteHighlight(note: KmapsNote): Promise<void> {
    this.highlightsService.deleteHighlight(note.id);
    await this.presentToast('Highlight deleted.');
  }

  async deleteNote(note: KmapsNote): Promise<void> {
    this.notesService.deleteNote(note.id);
    await this.presentToast('Note deleted.');
  }

  startDistill(): void {
    if (!this.canManageDistill) {
      void this.presentToast('Admin role required to run distill.');
      return;
    }

    if (this.hasExistingDistill()) {
      void this.router.navigate(this.existingDistillRoute(this.existingDistillBatchId()!, this.existingDistillBatchStatus() ?? 'active'));
      return;
    }

    const localBatch = this.localDistillBatch();
    if (localBatch && localBatch.status !== 'draft') {
      void this.router.navigate(this.existingDistillRoute(localBatch.id, localBatch.status));
      return;
    }

    if (localBatch?.status === 'draft') {
      void this.router.navigate(this.distillBuilderRoute(localBatch.id));
      return;
    }

    if (!this.showDistillFab()) {
      return;
    }

    void this.router.navigate(this.distillStartRoute());
  }

  openPlanner(): void {
    void this.router.navigate(this.plannerRoute());
  }

  goBackToSource(): void {
    if (!this.sourceId()) {
      void this.router.navigate(this.libraryRoute());
      return;
    }

    void this.router.navigate(this.parentUnit() ? this.unitRoute(this.parentUnit()!.id) : this.sourceRoute());
  }

  noteEmptyMessage(): string {
    return this.normalizedQuery()
      ? 'No notes match this search in the current source unit.'
      : 'Create reflections, questions, ideas, or claim seeds and they will collect here.';
  }

  highlightsEmptyMessage(): string {
    return this.normalizedQuery()
      ? 'No saved highlights match this search yet.'
      : 'Read the source unit and save a passage to build your highlight list.';
  }

  private preferredNoteUnitId(): string {
    return this.selectedReadUnit()?.id || this.unit()?.id || '';
  }

  private clearReadSelection(): void {
    this.selectedSegmentIndexes.set([]);
    this.selectedExcerpt.set('');
    this.selectedLocator.set('');
    this.closeReadContextMenu();
  }

  private applySegmentSelection(indexes: number[]): void {
    const nextIndexes = [...indexes].sort((left, right) => left - right);
    this.selectedSegmentIndexes.set(nextIndexes);
    if (!nextIndexes.length) {
      this.selectedExcerpt.set('');
      this.selectedLocator.set('');
      return;
    }

    const selectedSegments = this.displayedReadingSegments().filter((segment) => nextIndexes.includes(segment.index));
    if (!selectedSegments.length) {
      this.selectedExcerpt.set('');
      this.selectedLocator.set('');
      return;
    }

    this.selectedExcerpt.set(selectedSegments.map((segment) => segment.body).join(' '));
    this.selectedLocator.set(composeSegmentSelectionLocator(selectedSegments, this.selectedReadUnit()));
  }

  private matchesNoteQuery(note: KmapsNote, query: string): boolean {
    const haystack = [
      note.title,
      note.bodyMd,
      note.excerptText,
      note.locator,
      formatNoteKindLabel(note.noteKind),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private resolveContextMenuLeft(position: ReadContextMenuPosition | null): number | null {
    if (!position || typeof window === 'undefined') {
      return null;
    }

    const menuWidth = 220;
    const gutter = 12;
    return Math.max(gutter, Math.min(position.x + 4, window.innerWidth - menuWidth - gutter));
  }

  private resolveContextMenuTop(position: ReadContextMenuPosition | null): number | null {
    if (!position || typeof window === 'undefined') {
      return null;
    }

    const menuHeight = 196;
    const gutter = 12;
    const preferredTop = position.y + 6;
    const maxTop = window.innerHeight - menuHeight - gutter;
    if (preferredTop <= maxTop) {
      return Math.max(gutter, preferredTop);
    }

    return Math.max(gutter, position.y - menuHeight - 6);
  }

  private libraryRoute(): string[] {
    return this.routeRoot() === 'wv' ? ['/wv', 'library'] : ['/worldview', 'library'];
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

  private hasChildUnits(unitId: string): boolean {
    return this.workflow.getUnitsForSource(this.sourceId()).some((unit) => unit.parentUnitId === unitId);
  }

  private distillStartRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'distill', 'start', this.unitId()]
      : ['/worldview', 'distill', 'start', this.unitId()];
  }

  private distillBuilderRoute(batchId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'distill', 'batch', batchId]
      : ['/worldview', 'distill', 'batch', batchId];
  }

  private existingDistillRoute(batchId: string, status: 'draft' | 'active' | 'completed'): string[] {
    if (status === 'completed') {
      return this.routeRoot() === 'wv'
        ? ['/wv', 'source', this.sourceId(), 'unit', this.unitId(), 'content']
        : ['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'content'];
    }

    return this.routeRoot() === 'wv'
      ? ['/wv', 'suggestions', batchId]
      : ['/worldview', 'suggestions', batchId];
  }

  private plannerRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'planner', this.unitId()]
      : ['/worldview', 'planner', this.unitId()];
  }

  private async loadExistingDistillBatch(): Promise<void> {
    const sourceId = this.sourceId();
    const unitId = this.unitId();
    if (!sourceId || !unitId) {
      this.existingDistillBatchId.set(null);
      this.existingDistillBatchStatus.set(null);
      return;
    }

    const requestVersion = ++this.existingDistillRequestVersion;
    this.worldviewApi
      .fetchDistillBatchForUnit({ sourceId, sourceUnitId: unitId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          if (requestVersion !== this.existingDistillRequestVersion) {
            return;
          }

          if (!snapshot) {
            this.existingDistillBatchId.set(null);
            this.existingDistillBatchStatus.set(null);
            return;
          }

          this.distillService.hydrateBatch(snapshot.batch, snapshot.items);
          this.existingDistillBatchId.set(snapshot.batch.id);
          this.existingDistillBatchStatus.set(snapshot.batch.status);
        },
        error: () => {
          if (requestVersion !== this.existingDistillRequestVersion) {
            return;
          }

          this.existingDistillBatchId.set(null);
          this.existingDistillBatchStatus.set(null);
        },
      });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1400,
      position: 'bottom',
    });

    await toast.present();
  }

  private joinRoute(route: string[]): string {
    return route.join('/');
  }
}

function parseTabKey(value: string | null): WvWorkspaceTabKey {
  switch (value) {
    case 'read':
    case 'highlights':
    case 'notes':
      return value;
    case 'overview':
    default:
      return 'overview';
  }
}

function matchesUnitQuery(unit: KmapsSourceUnit, query: string): boolean {
  const haystack = [unit.title, unit.summary, unit.locatorLabel, unit.anchorText, formatUnitTypeLabel(unit.unitType)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function buildReadingSegments(unit: KmapsSourceUnit | null, query: string): ReadingSegment[] {
  if (!unit?.readingBody.length) {
    return [];
  }

  const sequence = inferSequentialLocatorInfo(unit);
  return unit.readingBody
    .map((body, index) => {
      const sequenceNumber = sequence ? sequence.start + index : null;
      return {
        index,
        body,
        locator: sequence && sequence.prefix ? `${sequence.prefix}${sequenceNumber}` : fallbackLocator(unit, index),
        marker: sequenceNumber != null ? String(sequenceNumber) : null,
      };
    })
    .filter((segment) => !query || segment.body.toLowerCase().includes(query));
}

function deriveNodeTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'New node';
  }

  return trimmed.length > 56 ? `${trimmed.slice(0, 53).trim()}...` : trimmed;
}

function composeSegmentSelectionLocator(
  segments: ReadonlyArray<ReadingSegment>,
  unit: KmapsSourceUnit | null,
): string {
  if (!segments.length) {
    return unit?.locatorLabel || unit?.startRef || '';
  }

  const ordered = [...segments].sort((left, right) => left.index - right.index);
  if (ordered.length === 1) {
    return ordered[0].locator;
  }

  const isContiguous = ordered.every((segment, index) => index === 0 || segment.index === ordered[index - 1].index + 1);
  if (isContiguous) {
    return compactLocatorRange(ordered[0].locator, ordered[ordered.length - 1].locator) || ordered.map((segment) => segment.locator).join(', ');
  }

  return ordered.map((segment) => segment.locator).join(', ');
}

function fallbackLocator(unit: KmapsSourceUnit, index: number): string {
  if (unit.readingBody.length === 1) {
    return unit.locatorLabel || unit.startRef || unit.title;
  }

  const baseLocator = unit.locatorLabel || unit.startRef || unit.title;
  return [baseLocator, `P${index + 1}`].filter(Boolean).join(' · ');
}

function inferSequentialLocatorInfo(unit: KmapsSourceUnit): { prefix: string; start: number } | null {
  if (!unit.startRef || !unit.endRef || unit.readingBody.length < 1) {
    return null;
  }

  const startMatch = unit.startRef.match(/^(.*?)(\d+)$/);
  const endMatch = unit.endRef.match(/^(.*?)(\d+)$/);
  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
    return null;
  }

  const start = Number(startMatch[2]);
  const end = Number(endMatch[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  if (end - start + 1 !== unit.readingBody.length) {
    return null;
  }

  return { prefix: startMatch[1], start };
}

function compactLocatorRange(startLocator: string, endLocator: string): string | null {
  const startMatch = startLocator.match(/^(.*?)(\d+)$/);
  const endMatch = endLocator.match(/^(.*?)(\d+)$/);
  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
    return null;
  }

  return `${startMatch[1]}${startMatch[2]}-${endMatch[2]}`;
}
