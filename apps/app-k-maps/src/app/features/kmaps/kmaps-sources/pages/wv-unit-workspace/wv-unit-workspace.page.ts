import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, IonicModule, ModalController, ToastController } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsUnitWorkspaceTabsComponent } from '../../../kmaps-shared/components/unit-workspace-tabs/unit-workspace-tabs';
import { KmapsNote, KmapsNoteKind, KmapsSource, KmapsSourceUnit, KmapsStatItem, formatNoteKindLabel, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';
import { WvWorkspaceTabKey } from '../../../kmaps-shared/models/wv-workspace.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { NoteWorkspaceModalComponent } from '../../../kmaps-notes/components/note-workspace-modal/note-workspace-modal';
import { WvHighlightsTabComponent } from '../../components/wv-highlights-tab/wv-highlights-tab';
import { WvNotesFilterKey, WvNotesTabComponent } from '../../components/wv-notes-tab/wv-notes-tab';
import { WvOverviewTabComponent } from '../../components/wv-overview-tab/wv-overview-tab';
import { WvReadTabComponent } from '../../components/wv-read-tab/wv-read-tab';

type ReadingParagraph = {
  index: number;
  body: string;
};

type ReadingSection = {
  heading: string;
  paragraphs: ReadingParagraph[];
};

type WorkspaceNoteKind = Extract<KmapsNoteKind, 'highlight' | 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed' | 'idea'>;

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
  ],
  templateUrl: './wv-unit-workspace.page.html',
  styleUrl: './wv-unit-workspace.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvUnitWorkspacePage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly nodesService = inject(WvNodesService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeTab = signal<WvWorkspaceTabKey>('overview');
  readonly searchQuery = signal('');
  readonly activeNotesFilter = signal<WvNotesFilterKey>('all');
  readonly selectedReadUnitId = signal('');
  readonly selectedParagraphIndex = signal<number | null>(null);

  readonly noteFilters: ReadonlyArray<WvNotesFilterKey> = ['all', 'summary', 'claim_seed', 'insight', 'reflection'];

  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
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

    return this.childUnits().length ? this.childUnits() : [currentUnit];
  });
  readonly selectedReadUnit = computed(
    () => this.readUnits().find((unit) => unit.id === this.selectedReadUnitId()) || this.readUnits()[0] || null,
  );
  readonly sourceSummary = computed(() => this.buildSourceSummary(this.source(), this.unit()));
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
  readonly progressPercent = computed(() => clampPercent(this.source()?.progressPercent ?? 0));
  readonly stats = computed<KmapsStatItem[]>(() => [
    { label: 'Highlights', value: this.allHighlights().length },
    { label: 'Notes', value: this.allNotes().length },
    { label: 'Nodes', value: this.nodeCount(), emphasis: this.nodeCount() > 0 },
  ]);
  readonly displayedReadingSections = computed(() =>
    buildReadingSections(
      (this.selectedReadUnit()?.readingBody || [])
        .map((body, index) => ({ index, body }))
        .filter((paragraph) => {
          const query = this.normalizedQuery();
          return !query || paragraph.body.toLowerCase().includes(query);
        }),
    ),
  );
  readonly selectedExcerpt = computed(() => {
    const readUnit = this.selectedReadUnit();
    const paragraphIndex = this.selectedParagraphIndex();

    if (!readUnit || paragraphIndex == null) {
      return '';
    }

    return readUnit.readingBody[paragraphIndex] || '';
  });
  readonly selectedLocator = computed(() => {
    const readUnit = this.selectedReadUnit();
    const paragraphIndex = this.selectedParagraphIndex();

    if (!readUnit) {
      return '';
    }

    const baseLocator = readUnit.locatorLabel || readUnit.startRef || this.unit()?.locatorLabel || '';
    if (paragraphIndex == null) {
      return baseLocator;
    }

    return [baseLocator, `P${paragraphIndex + 1}`].filter(Boolean).join(' · ');
  });
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
  readonly showDistillFab = computed(() => this.allNotes().length >= 1);

  backHref(): string {
    return this.joinRoute(this.sourceId() ? this.sourceRoute() : this.libraryRoute());
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.searchQuery.set('');
      this.selectedParagraphIndex.set(null);
      this.activeNotesFilter.set('all');
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
        this.selectedParagraphIndex.set(null);
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
  }

  onNotesFilterChange(filter: WvNotesFilterKey): void {
    this.activeNotesFilter.set(filter);
  }

  openUnit(unitId: string, tab?: WvWorkspaceTabKey): void {
    if (!unitId || unitId === this.unitId()) {
      return;
    }

    void this.router.navigate(this.unitRoute(unitId), {
      queryParams: tab && tab !== 'overview' ? { tab } : undefined,
    });
  }

  selectReadUnit(unitId: string): void {
    this.selectedReadUnitId.set(unitId);
  }

  selectParagraph(index: number): void {
    this.selectedParagraphIndex.update((current) => (current === index ? null : index));
  }

  async openParagraphMenu(index: number): Promise<void> {
    this.selectParagraph(index);

    const actionSheet = await this.actionSheetController.create({
      header: this.selectedLocator() || 'Selection',
      buttons: [
        {
          text: 'Highlight',
          icon: 'color-wand-outline',
          handler: () => {
            void this.highlightSelected();
          },
        },
        {
          text: 'Add note',
          icon: 'create-outline',
          handler: () => {
            void this.openCreateNoteModal('quote');
          },
        },
        {
          text: 'Copy',
          icon: 'copy-outline',
          handler: () => {
            void this.copySelectedExcerpt();
          },
        },
        {
          text: 'Link node',
          icon: 'share-social-outline',
          handler: () => {
            void this.linkSelectedToNode();
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
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

    void this.router.navigate(this.sourceRoute());
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

  private buildSourceSummary(source: KmapsSource | null, unit: KmapsSourceUnit | null): string {
    return (
      unit?.summary?.trim() ||
      unit?.anchorText?.trim() ||
      source?.description?.trim() ||
      'Use this workspace to read, save highlights, and keep notes for the current source unit.'
    );
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

  private distillStartRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'distill', 'start', this.unitId()]
      : ['/worldview', 'distill', 'start', this.unitId()];
  }

  private plannerRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'planner', this.unitId()]
      : ['/worldview', 'planner', this.unitId()];
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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function matchesUnitQuery(unit: KmapsSourceUnit, query: string): boolean {
  const haystack = [unit.title, unit.summary, unit.locatorLabel, unit.anchorText, formatUnitTypeLabel(unit.unitType)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function buildReadingSections(paragraphs: ReadingParagraph[]): ReadingSection[] {
  if (!paragraphs.length) {
    return [];
  }

  if (paragraphs.length <= 3) {
    return [
      {
        heading: 'Reading',
        paragraphs,
      },
    ];
  }

  const pivot = Math.ceil(paragraphs.length / 2);
  return [
    {
      heading: 'Opening',
      paragraphs: paragraphs.slice(0, pivot),
    },
    {
      heading: 'Continuation',
      paragraphs: paragraphs.slice(pivot),
    },
  ];
}

function deriveNodeTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'New node';
  }

  return trimmed.length > 56 ? `${trimmed.slice(0, 53).trim()}...` : trimmed;
}
