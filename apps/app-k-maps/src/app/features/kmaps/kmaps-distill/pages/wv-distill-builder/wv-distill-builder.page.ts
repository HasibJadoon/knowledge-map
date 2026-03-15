import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { NoteCardComponent } from '../../../kmaps-notes/components/note-card/note-card';
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
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly worldviewApi = inject(WorldviewApiService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly distillService = inject(WvDistillService);
  private readonly nodesService = inject(WvNodesService);

  readonly batchId = signal('');
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
  readonly roles: ReadonlyArray<WvDistillItemRole> = ['claim_seed', 'evidence', 'observation', 'question'];

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.batchId.set(params.get('batchId') || '');
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
    this.distillService.updateItemSelection(this.batchId(), noteId, !this.isSelected(noteId));
  }

  updateRole(noteId: string, role: WvDistillItemRole): void {
    this.distillService.updateItemRole(this.batchId(), noteId, role);
  }

  onRoleChange(noteId: string, value: string | null | undefined): void {
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

  async openSuggestions(): Promise<void> {
    const batch = this.batch();
    const unit = this.unit();
    const source = this.source();
    if (!batch || !unit || !source || this.isGenerating()) {
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
}
