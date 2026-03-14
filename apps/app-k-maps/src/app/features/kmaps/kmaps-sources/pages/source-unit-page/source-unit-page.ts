import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { albumsOutline, bookOutline, bookmarkOutline, documentTextOutline } from 'ionicons/icons';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import {
  KmapsNote,
  KmapsNoteKind,
  KmapsSource,
  KmapsSourceUnit,
  formatNoteKindLabel,
  formatUnitTypeLabel,
} from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';
import { NoteWorkspaceModalComponent } from '../../../kmaps-notes/components/note-workspace-modal/note-workspace-modal';
import { NativeSearchbarComponent } from '../../../../../shared/components/native-searchbar/native-searchbar.component';
import { AppIconTabsComponent, type IconTabItem } from '../../../../../shared/components/icon-tabs/icon-tabs.component';

type SourceUnitTabKey = 'overview' | 'read' | 'highlights' | 'notes';
type WorkspaceNoteKind = Extract<KmapsNoteKind, 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed' | 'idea'>;

type SourceUnitMetric = {
  key: 'sections' | 'highlights' | 'notes' | 'concepts';
  label: string;
  value: number;
};

type ReadingParagraph = {
  index: number;
  body: string;
};

type ReadingSection = {
  heading: string;
  paragraphs: ReadingParagraph[];
};

@Component({
  selector: 'app-source-unit-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, NativeSearchbarComponent, AppIconTabsComponent],
  templateUrl: './source-unit-page.html',
  styleUrl: './source-unit-page.scss',
})
export class SourceUnitPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeTab = signal<SourceUnitTabKey>('overview');
  readonly searchQuery = signal('');
  readonly selectedReadUnitId = signal('');
  readonly selectedParagraphIndex = signal<number | null>(null);

  readonly tabs: ReadonlyArray<IconTabItem> = [
    { key: 'overview', label: 'Overview', icon: albumsOutline },
    { key: 'read', label: 'Read', icon: bookOutline },
    { key: 'highlights', label: 'Highlights', icon: bookmarkOutline },
    { key: 'notes', label: 'Notes', icon: documentTextOutline },
  ];

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
  readonly progressPercent = computed(() => clampPercent(this.source()?.progressPercent ?? 0));
  readonly normalizedQuery = computed(() => this.searchQuery().trim().toLowerCase());
  readonly scopedNotes = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()));
  readonly highlightNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => note.noteKind === 'highlight')
      .sort(compareNotesByDateDesc),
  );
  readonly workspaceNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => note.noteKind !== 'highlight')
      .sort(compareNotesByDateDesc),
  );
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
      return this.highlightNotes();
    }

    return this.highlightNotes().filter((note) => this.matchesNoteQuery(note, query));
  });
  readonly filteredNotes = computed(() => {
    const query = this.normalizedQuery();
    if (!query) {
      return this.workspaceNotes();
    }

    return this.workspaceNotes().filter((note) => this.matchesNoteQuery(note, query));
  });
  readonly recentHighlights = computed(() => this.highlightNotes().slice(0, 3));
  readonly recentNotes = computed(() => this.workspaceNotes().slice(0, 3));
  readonly conceptCount = computed(() => this.workflow.getConceptsForContext(this.sourceId(), this.unitId()).length);
  readonly metrics = computed<SourceUnitMetric[]>(() => [
    { key: 'sections', label: this.childUnits().length ? 'Sections' : 'Reading Units', value: this.readUnits().length },
    { key: 'highlights', label: 'Highlights', value: this.highlightNotes().length },
    { key: 'notes', label: 'Notes', value: this.workspaceNotes().length },
    { key: 'concepts', label: 'Concepts', value: this.conceptCount() },
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
  readonly emptyStateTitle = computed(() => {
    switch (this.activeTab()) {
      case 'read':
        return 'No reading loaded';
      case 'highlights':
        return 'No highlights yet';
      case 'notes':
        return 'No notes yet';
      case 'overview':
      default:
        return 'No source unit yet';
    }
  });
  readonly emptyStateMessage = computed(() => {
    switch (this.activeTab()) {
      case 'read':
        return 'Open a source unit with reading text and the read tab will load here.';
      case 'highlights':
        return 'Saved highlights for this source unit will appear here once you start reading.';
      case 'notes':
        return 'Create notes for this source unit and they will collect here in one place.';
      case 'overview':
      default:
        return 'Choose a source unit from the source page to populate this workspace.';
    }
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.searchQuery.set('');
      this.selectedParagraphIndex.set(null);
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

  setActiveTab(tabKey: string): void {
    const nextTab = parseTabKey(tabKey);
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

  openUnit(unitId: string, tab?: SourceUnitTabKey): void {
    if (!unitId || unitId === this.unitId()) {
      return;
    }

    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', unitId], {
      queryParams: tab && tab !== 'overview' ? { tab } : undefined,
    });
  }

  selectReadUnit(unitId: string): void {
    this.selectedReadUnitId.set(unitId);
  }

  selectParagraph(index: number): void {
    this.selectedParagraphIndex.update((current) => (current === index ? null : index));
  }

  async highlightSelected(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    const readUnit = this.selectedReadUnit();

    if (!excerpt || !readUnit || !this.source()) {
      return;
    }

    this.workflow.addNote({
      sourceId: this.sourceId(),
      sourceUnitId: readUnit.id,
      noteKind: 'highlight',
      title: 'Highlight',
      bodyMd: excerpt,
      excerptText: excerpt,
      locator: this.selectedLocator() || readUnit.locatorLabel || null,
    });

    await this.presentToast('Highlight saved.');
    this.setActiveTab('highlights');
  }

  async saveQuoteSelected(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    const readUnit = this.selectedReadUnit();

    if (!excerpt || !readUnit || !this.source()) {
      return;
    }

    this.workflow.addNote({
      sourceId: this.sourceId(),
      sourceUnitId: readUnit.id,
      noteKind: 'quote',
      title: deriveNoteTitle(excerpt, 'quote'),
      bodyMd: excerpt,
      excerptText: excerpt,
      locator: this.selectedLocator() || readUnit.locatorLabel || null,
    });

    await this.presentToast('Quote saved.');
    this.setActiveTab('notes');
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
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  async openNote(note: KmapsNote): Promise<void> {
    if (!isEditableNoteKind(note.noteKind)) {
      await this.presentToast('This note type is read-only in the new unit workspace.');
      return;
    }

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

  goBackToSource(): void {
    if (!this.sourceId()) {
      void this.router.navigate(['/worldview/library']);
      return;
    }

    void this.router.navigate(['/worldview', 'sources', this.sourceId()]);
  }

  jumpToRead(): void {
    this.setActiveTab('read');
  }

  noteKindLabel(kind: KmapsNoteKind): string {
    return formatNoteKindLabel(kind);
  }

  noteTitle(note: KmapsNote): string {
    return note.title?.trim() || deriveNoteTitle(note.excerptText || note.bodyMd || '', note.noteKind);
  }

  notePreview(note: KmapsNote, maxLength = 150): string {
    const value = (note.excerptText || note.bodyMd || note.title || '').trim();
    return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
  }

  noteMeta(note: KmapsNote): string {
    const unitLabel = this.noteUnitLabel(note);
    return [unitLabel, note.locator, formatRelativeTime(note.createdAt)].filter(Boolean).join(' • ');
  }

  noteKindTone(kind: KmapsNoteKind): 'primary' | 'secondary' | 'warning' | 'success' {
    switch (kind) {
      case 'quote':
        return 'secondary';
      case 'claim_seed':
        return 'warning';
      case 'reflection':
      case 'insight':
        return 'success';
      case 'question':
      case 'observation':
      case 'idea':
      default:
        return 'primary';
    }
  }

  overviewUnitMeta(unit: KmapsSourceUnit): string {
    return [formatUnitTypeLabel(unit.unitType), unit.locatorLabel, readingMinutesLabel(unit.readingMinutes)].filter(Boolean).join(' • ');
  }

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  trackMetric(_: number, metric: SourceUnitMetric): string {
    return metric.key;
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  trackSection(_: number, section: ReadingSection): string {
    return section.heading;
  }

  readingMinutesLabelForUnit(unit: KmapsSourceUnit | null): string {
    return readingMinutesLabel(unit?.readingMinutes ?? 0);
  }

  unitTypeLabel(unit: KmapsSourceUnit | null): string {
    return unit ? formatUnitTypeLabel(unit.unitType) : 'Source Unit';
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

  private noteUnitLabel(note: KmapsNote): string {
    if (!note.sourceUnitId || note.sourceUnitId === this.unitId()) {
      return '';
    }

    return this.workflow.getUnit(note.sourceUnitId)?.title || '';
  }

  private matchesNoteQuery(note: KmapsNote, query: string): boolean {
    const haystack = [
      note.title,
      note.bodyMd,
      note.excerptText,
      note.locator,
      this.noteUnitLabel(note),
      formatNoteKindLabel(note.noteKind),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1400,
      position: 'bottom',
    });

    await toast.present();
  }
}

function parseTabKey(value: string | null): SourceUnitTabKey {
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

function compareNotesByDateDesc(left: KmapsNote, right: KmapsNote): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
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

function deriveNoteTitle(value: string, kind: KmapsNoteKind): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return formatNoteKindLabel(kind);
  }

  return trimmed.length > 72 ? `${trimmed.slice(0, 69).trim()}...` : trimmed;
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const deltaMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const hours = Math.round(deltaMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function readingMinutesLabel(value: number): string {
  const minutes = Math.max(0, Math.round(value));
  return minutes > 0 ? `${minutes} min` : 'Ready';
}

function isEditableNoteKind(kind: KmapsNoteKind): kind is WorkspaceNoteKind {
  return (
    kind === 'quote' ||
    kind === 'reflection' ||
    kind === 'question' ||
    kind === 'insight' ||
    kind === 'observation' ||
    kind === 'claim_seed' ||
    kind === 'idea'
  );
}
