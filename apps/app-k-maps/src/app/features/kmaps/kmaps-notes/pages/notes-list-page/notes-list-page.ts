import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, IonicModule, ModalController } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNote, KmapsNoteKind } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { NoteWorkspaceModalComponent } from '../../components/note-workspace-modal/note-workspace-modal';

type NotesFilterKey = 'all' | 'reflection' | 'question' | 'idea' | 'claim_seed';
type WorkspaceNoteKind = Extract<KmapsNoteKind, 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed' | 'idea'>;

@Component({
  selector: 'app-notes-list-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    KmapsPageHeaderComponent,
    KmapsUnitBottomTabsComponent,
    KmapsEmptyStateCardComponent,
  ],
  templateUrl: './notes-list-page.html',
  styleUrl: './notes-list-page.scss',
})
export class NotesListPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeFilter = signal<NotesFilterKey>('all');
  readonly filters: ReadonlyArray<NotesFilterKey> = ['all', 'reflection', 'question', 'idea', 'claim_seed'];
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly parentUnit = computed(() => this.workflow.getUnit(this.unit()?.parentUnitId || ''));
  readonly childUnits = computed(() =>
    this.workflow.getUnitsForSource(this.sourceId()).filter((unit) => unit.parentUnitId === this.unitId()),
  );
  readonly hasParentUnit = computed(() => !!this.parentUnit()?.id);
  readonly scopedNotes = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()));
  readonly sectionNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => isWorkspaceNote(note.noteKind))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  );
  readonly filteredNotes = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.sectionNotes();
    }

    return this.sectionNotes().filter((note) => note.noteKind === filter);
  });
  readonly toolbarTitle = computed(() => this.source()?.title || 'Notes');
  readonly toolbarSubtitle = computed(() => this.unit()?.locatorLabel || this.unit()?.title || '');
  readonly backHref = computed(() => {
    if (this.hasParentUnit()) {
      return `/worldview/sources/${this.sourceId()}/units/${this.parentUnit()!.id}/notes`;
    }

    return `/worldview/sources/${this.sourceId()}/units/${this.unitId()}`;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.activeFilter.set('all');
    });
  }

  setFilter(filter: NotesFilterKey): void {
    this.activeFilter.set(filter);
  }

  filterLabel(filter: NotesFilterKey): string {
    return filter === 'all'
      ? 'All'
      : filter === 'claim_seed'
        ? 'Claim Seed'
        : filter.charAt(0).toUpperCase() + filter.slice(1);
  }

  async openCreateNoteModal(preferredKind: WorkspaceNoteKind = 'question'): Promise<void> {
    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: this.unitId(),
        preferredKind,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  async openNoteModal(noteId: string): Promise<void> {
    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: this.unitId(),
        noteId,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  openParentChapter(): void {
    if (!this.parentUnit()?.id) {
      return;
    }

    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.parentUnit()!.id, 'notes']);
  }

  async openNoteMenu(note: KmapsNote): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: this.noteKindLabel(note.noteKind),
      buttons: [
        {
          text: 'Open note',
          icon: 'open-outline',
          handler: () => {
            void this.openNoteModal(note.id);
          },
        },
        {
          text: 'Copy preview',
          icon: 'copy-outline',
          handler: () => {
            void this.copyPreview(note);
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

  noteKindLabel(kind: KmapsNoteKind): string {
    return formatWorkspaceLabel(kind);
  }

  notePreview(note: KmapsNote): string {
    const value = (note.excerptText || note.title || note.bodyMd).trim();
    return value.length > 110 ? `${value.slice(0, 107).trim()}...` : value;
  }

  locatorLabel(note: KmapsNote): string {
    return [note.locator, formatRelativeTime(note.createdAt)].filter(Boolean).join(' • ');
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  private async copyPreview(note: KmapsNote): Promise<void> {
    const value = this.notePreview(note);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    }
  }
}

function isWorkspaceNote(kind: KmapsNoteKind): kind is WorkspaceNoteKind {
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

function formatWorkspaceLabel(kind: KmapsNoteKind): string {
  switch (kind) {
    case 'observation':
      return 'Comment';
    case 'claim_seed':
      return 'Claim Seed';
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' ');
  }
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
