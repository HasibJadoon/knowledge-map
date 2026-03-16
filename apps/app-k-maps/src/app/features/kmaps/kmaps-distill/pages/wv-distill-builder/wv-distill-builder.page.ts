import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { NoteCardComponent } from '../../../kmaps-notes/components/note-card/note-card';
import { NoteWorkspaceModalComponent } from '../../../kmaps-notes/components/note-workspace-modal/note-workspace-modal';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNote } from '../../../kmaps-shared/models/kmaps.models';
import { WvDistillItemRole } from '../../../kmaps-shared/models/wv-workspace.models';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';

@Component({
  selector: 'app-wv-distill-builder-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent, NoteCardComponent],
  templateUrl: './wv-distill-builder.page.html',
  styleUrl: './wv-distill-builder.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvDistillBuilderPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly worldviewApi = inject(WorldviewApiService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly distillService = inject(WvDistillService);
  private readonly nodesService = inject(WvNodesService);

  readonly batchId = signal('');
  readonly isLoading = signal(false);
  readonly isGenerating = signal(false);
  readonly batch = computed(() => this.distillService.getBatch(this.batchId()));
  readonly unit = computed(() => this.workflow.getUnit(this.batch()?.unitId || ''));
  readonly source = computed(() => this.workflow.getSource(this.batch()?.sourceId || ''));
  readonly sourceNotes = computed(() => this.notesService.listForUnit(this.source()?.id || '', this.unit()?.id || ''));
  readonly sourceHighlights = computed(() => this.highlightsService.listForUnit(this.source()?.id || '', this.unit()?.id || ''));
  readonly sourceItems = computed(() => [...this.sourceHighlights(), ...this.sourceNotes()]);
  readonly hasBatch = computed(() => this.batch() != null);
  readonly batchItems = computed(() => (this.batchId() ? this.distillService.getItems(this.batchId()) : []));
  readonly selectedItems = computed(() => this.batchItems().filter((item) => item.selected));
  readonly canGenerateBatch = computed(() => this.batch()?.status === 'draft');
  readonly canEditBatch = computed(() => this.canGenerateBatch() && !this.isGenerating());
  readonly canEditNotes = computed(() => this.hasBatch() && !this.isGenerating());
  readonly footerActionDisabled = computed(() =>
    this.isGenerating() || !this.canGenerateBatch() || !this.selectedItems().length,
  );
  readonly footerActionLabel = computed(() => {
    if (this.isGenerating()) {
      return 'Generating…';
    }

    if (!this.canGenerateBatch()) {
      return 'Suggestions Generated';
    }

    return 'Generate Suggestions';
  });
  readonly selectAllDisabled = computed(() =>
    !this.canEditBatch() || !this.batchItems().some((item) => !item.selected),
  );
  readonly roles: ReadonlyArray<WvDistillItemRole> = ['claim_seed', 'evidence', 'observation', 'question'];

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.batchId.set(params.get('batchId') || '');
      void this.loadBatch();
    });

    effect(() => {
      const batch = this.batch();
      const batchId = this.batchId();
      if (!batch || !batchId) {
        return;
      }

      const sourceItems = this.sourceItems();
      untracked(() => {
        this.distillService.syncBatchItems(batchId, sourceItems);
      });
    });
  }

  isSelected(noteId: string): boolean {
    return this.batchItems().some((item) => item.noteId === noteId && item.selected);
  }

  roleFor(noteId: string): WvDistillItemRole {
    return this.batchItems().find((item) => item.noteId === noteId)?.role || 'evidence';
  }

  toggleSelection(noteId: string): void {
    if (!this.canEditBatch()) {
      return;
    }

    this.distillService.updateItemSelection(this.batchId(), noteId, !this.isSelected(noteId));
  }

  updateRole(noteId: string, role: WvDistillItemRole): void {
    if (!this.canEditBatch()) {
      return;
    }

    this.distillService.updateItemRole(this.batchId(), noteId, role);
  }

  onRoleChange(noteId: string, value: string | null | undefined): void {
    if (!this.canEditBatch()) {
      return;
    }

    switch (value) {
      case 'claim_seed':
      case 'observation':
      case 'question':
      case 'evidence':
        this.updateRole(noteId, value);
        return;
      default:
        this.updateRole(noteId, 'evidence');
    }
  }

  selectAllItems(): void {
    if (this.selectAllDisabled()) {
      return;
    }

    for (const item of this.batchItems()) {
      if (!item.selected) {
        this.distillService.updateItemSelection(this.batchId(), item.noteId, true);
      }
    }
  }

  async openNoteEditor(noteId: string): Promise<void> {
    const source = this.source();
    const unit = this.unit();
    if (!source || !unit || !this.canEditNotes()) {
      return;
    }

    const modal = await this.modalController.create({
      component: NoteWorkspaceModalComponent,
      componentProps: {
        sourceId: source.id,
        unitId: unit.id,
        noteId,
      },
      cssClass: 'km-note-workspace-modal',
      showBackdrop: true,
    });

    await modal.present();
  }

  async openSuggestions(): Promise<void> {
    const batch = this.batch();
    const unit = this.unit();
    const source = this.source();
    if (!batch || !unit || !source || this.isGenerating()) {
      return;
    }

    if (batch.status !== 'draft') {
      void this.router.navigate(this.suggestionsRoute());
      return;
    }

    const selectedItems = this.selectedItems().map((item) => ({
      itemId: item.noteId,
      role: item.role,
    }));
    if (!selectedItems.length) {
      return;
    }

    this.isGenerating.set(true);
    try {
      const snapshot = await firstValueFrom(
        this.worldviewApi.generateDistillBatch({
          batchId: batch.id,
          sourceId: source.id,
          sourceUnitId: unit.id,
          items: selectedItems,
          model: 'gpt-5-mini',
        }),
      );
      this.distillService.hydrateBatch(snapshot.batch, snapshot.items);
      this.nodesService.hydrateBatch(snapshot.batch.id, snapshot.suggestions, snapshot.decisions);
      void this.router.navigate(this.suggestionsRoute());
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        const existingBatchId = typeof error.error?.existing_batch_id === 'string' ? error.error.existing_batch_id : this.batchId();
        if (existingBatchId) {
          void this.router.navigate(this.routeRoot() === 'wv'
            ? ['/wv', 'suggestions', existingBatchId]
            : ['/worldview', 'suggestions', existingBatchId]);
          return;
        }
      }

      console.error('Failed to generate worldview distill output.', error);
    } finally {
      this.isGenerating.set(false);
    }
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  backHref(): string {
    if (!this.unit()) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    return this.routeRoot() === 'wv'
      ? `/wv/distill/start/${this.unit()?.id || ''}`
      : `/worldview/distill/start/${this.unit()?.id || ''}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private suggestionsRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'suggestions', this.batchId()]
      : ['/worldview', 'suggestions', this.batchId()];
  }

  private async loadBatch(): Promise<void> {
    const batchId = this.batchId();
    if (!batchId || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    try {
      const snapshot = await firstValueFrom(this.worldviewApi.fetchDistillBatch(batchId));
      this.distillService.hydrateBatch(snapshot.batch, snapshot.items);
      this.nodesService.hydrateBatch(snapshot.batch.id, snapshot.suggestions, snapshot.decisions);
    } catch (error) {
      if (!this.batch()) {
        console.error('Failed to load worldview distill batch.', error);
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
