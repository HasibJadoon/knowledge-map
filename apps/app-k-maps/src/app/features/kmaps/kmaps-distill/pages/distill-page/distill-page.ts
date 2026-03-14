import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, IonicModule, ModalController } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNote } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';
import { NoteWorkspaceModalComponent } from '../../../kmaps-notes/components/note-workspace-modal/note-workspace-modal';

type HighlightFilterKey = 'all' | 'today' | 'session' | 'unprocessed';

@Component({
  selector: 'app-distill-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    KmapsPageHeaderComponent,
    KmapsUnitBottomTabsComponent,
    KmapsEmptyStateCardComponent,
  ],
  templateUrl: './distill-page.html',
  styleUrl: './distill-page.scss',
})
export class DistillPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeFilter = signal<HighlightFilterKey>('all');
  readonly filters: ReadonlyArray<HighlightFilterKey> = ['all', 'today', 'session', 'unprocessed'];
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly progressPercent = computed(() => clampPercent(this.source()?.progressPercent ?? 0));
  readonly highlightNotes = computed(() =>
    this.workflow
      .getNotesForUnitScope(this.sourceId(), this.unitId())
      .filter((note) => note.noteKind === 'highlight')
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  );
  readonly filteredHighlights = computed(() => {
    const highlights = this.highlightNotes();

    switch (this.activeFilter()) {
      case 'today':
        return highlights.filter((note) => isToday(note.createdAt));
      case 'session':
        return highlights.filter((note) => isSameSession(note.createdAt, this.source()?.lastOpenedAt || null));
      case 'unprocessed':
        return highlights.filter((note) => this.isUnprocessed(note));
      case 'all':
      default:
        return highlights;
    }
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.activeFilter.set('all');
    });
  }

  setFilter(filter: HighlightFilterKey): void {
    this.activeFilter.set(filter);
  }

  filterLabel(filter: HighlightFilterKey): string {
    switch (filter) {
      case 'today':
        return 'Today';
      case 'session':
        return 'Session';
      case 'unprocessed':
        return 'Unprocessed';
      case 'all':
      default:
        return 'All';
    }
  }

  async openHighlight(noteId: string): Promise<void> {
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

  async openHighlightMenu(note: KmapsNote): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: note.locator || 'Highlight',
      buttons: [
        {
          text: 'Open highlight',
          icon: 'open-outline',
          handler: () => {
            void this.openHighlight(note.id);
          },
        },
        {
          text: 'Add note',
          icon: 'create-outline',
          handler: () => {
            void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'capture'], {
              queryParams: {
                excerpt: note.excerptText || note.bodyMd,
                locator: note.locator,
              },
            });
          },
        },
        {
          text: 'Copy text',
          icon: 'copy-outline',
          handler: () => {
            void this.copyHighlight(note);
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

  notePreview(note: KmapsNote): string {
    const value = (note.excerptText || note.bodyMd).trim();
    return value.length > 160 ? `${value.slice(0, 157).trim()}...` : value;
  }

  noteMeta(note: KmapsNote): string {
    const state = this.isUnprocessed(note) ? 'Unprocessed' : 'Saved';
    return [note.locator, formatRelativeTime(note.createdAt), state].filter(Boolean).join(' • ');
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  goToRead(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'read']);
  }

  private isUnprocessed(note: KmapsNote): boolean {
    const links = this.workflow.getNoteLinksForNote(note.id);
    return links.filter((link) => link.targetType !== 'source' && link.targetType !== 'source_unit').length === 0;
  }

  private async copyHighlight(note: KmapsNote): Promise<void> {
    const value = (note.excerptText || note.bodyMd).trim();
    if (!value) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    }
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isSameSession(noteCreatedAt: string, lastOpenedAt: string | null): boolean {
  if (!lastOpenedAt) {
    return false;
  }

  const note = new Date(noteCreatedAt);
  const session = new Date(lastOpenedAt);
  return Math.abs(note.getTime() - session.getTime()) <= 6 * 60 * 60 * 1000;
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
