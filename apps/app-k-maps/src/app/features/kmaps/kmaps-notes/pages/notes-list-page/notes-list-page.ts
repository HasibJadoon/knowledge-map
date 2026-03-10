import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsWorkflowShellComponent } from '../../../kmaps-shared/components/workflow-shell/workflow-shell';
import { KmapsNote, KmapsNoteKind } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';
import { NoteWorkspaceModalComponent } from '../../components/note-workspace-modal/note-workspace-modal';

type WorkspaceNoteKind = Extract<KmapsNoteKind, 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed'>;

@Component({
  selector: 'app-notes-list-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    KmapsWorkflowShellComponent,
    KmapsEmptyStateCardComponent,
  ],
  templateUrl: './notes-list-page.html',
  styleUrl: './notes-list-page.scss',
})
export class NotesListPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly parentUnit = computed(() => this.workflow.getUnit(this.unit()?.parentUnitId || ''));
  readonly heading = computed(() => splitUnitHeading(this.unit()?.title));
  readonly parentHeading = computed(() => splitUnitHeading(this.parentUnit()?.title));
  readonly sectionNotes = computed(() =>
    this.workflow
      .getNotesForContext(this.sourceId(), this.unitId() || null)
      .filter((note) => isWorkspaceNote(note.noteKind))
      .sort(compareByKindThenDate),
  );
  readonly highlightCount = computed(
    () => this.workflow.getNotesForContext(this.sourceId(), this.unitId() || null).filter((note) => note.noteKind === 'highlight').length,
  );
  readonly claimCount = computed(() => this.workflow.getClaimsForContext(this.sourceId(), this.unitId() || null).length);
  readonly toolbarTitle = computed(() => this.parentHeading().subtitle || this.parentHeading().title || 'Section');
  readonly toolbarSubtitle = computed(() => this.parentHeading().subtitle ? this.parentHeading().title : '');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
    });
  }

  async openCreateNoteModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: this.sourceId(),
        unitId: this.unitId(),
        preferredKind: 'question',
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

    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.parentUnit()!.id]);
  }

  noteKindLabel(kind: KmapsNoteKind): string {
    return formatWorkspaceLabel(kind);
  }

  noteIcon(kind: KmapsNoteKind): string {
    return noteKindIcon(kind);
  }

  notePreview(note: KmapsNote): string {
    const value = (note.excerptText || note.title || note.bodyMd).trim();
    return value.length > 90 ? `${value.slice(0, 87).trim()}...` : value;
  }

  locatorLabel(note: KmapsNote): string {
    return note.locator || this.unit()?.locatorLabel || '';
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }
}

function splitUnitHeading(title: string | null | undefined): { title: string; subtitle: string } {
  const value = (title || '').trim();
  if (!value) {
    return { title: 'Section workspace', subtitle: '' };
  }

  const [left, ...rest] = value
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: rest[0] || left || value,
    subtitle: rest[0] ? left : '',
  };
}

function isWorkspaceNote(kind: KmapsNoteKind): kind is WorkspaceNoteKind {
  return (
    kind === 'quote' ||
    kind === 'reflection' ||
    kind === 'question' ||
    kind === 'insight' ||
    kind === 'observation' ||
    kind === 'claim_seed'
  );
}

function compareByKindThenDate(left: KmapsNote, right: KmapsNote): number {
  const leftRank = noteKindRank(left.noteKind);
  const rightRank = noteKindRank(right.noteKind);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function noteKindRank(kind: KmapsNoteKind): number {
  switch (kind) {
    case 'quote':
      return 1;
    case 'reflection':
      return 2;
    case 'question':
      return 3;
    case 'insight':
      return 4;
    case 'observation':
      return 5;
    case 'claim_seed':
      return 6;
    default:
      return 99;
  }
}

function formatWorkspaceLabel(kind: KmapsNoteKind): string {
  switch (kind) {
    case 'observation':
      return 'Comment';
    case 'claim_seed':
      return 'Claim Seed';
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
}

function noteKindIcon(kind: KmapsNoteKind): string {
  switch (kind) {
    case 'quote':
      return 'bookmark-outline';
    case 'reflection':
      return 'chatbox-ellipses-outline';
    case 'question':
      return 'help-circle-outline';
    case 'insight':
      return 'bulb-outline';
    case 'observation':
      return 'chatbubble-ellipses-outline';
    case 'claim_seed':
      return 'flash-outline';
    default:
      return 'document-text-outline';
  }
}
