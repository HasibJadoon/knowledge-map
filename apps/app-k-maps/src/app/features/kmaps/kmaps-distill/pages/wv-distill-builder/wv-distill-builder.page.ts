import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { NoteCardComponent } from '../../../kmaps-notes/components/note-card/note-card';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNote } from '../../../kmaps-shared/models/kmaps.models';
import { WvDistillItemRole } from '../../../kmaps-shared/models/wv-workspace.models';
import { WvDistillService } from '../../../kmaps-shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../kmaps-shared/services/wv-highlights.service';
import { WvNotesService } from '../../../kmaps-shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

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
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly distillService = inject(WvDistillService);

  readonly batchId = signal('');
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

  openSuggestions(): void {
    this.distillService.completeBatch(this.batchId());
    void this.router.navigate(this.suggestionsRoute());
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
