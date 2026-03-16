import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';

@Component({
  selector: 'app-wv-distill-start-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './wv-distill-start.page.html',
  styleUrl: './wv-distill-start.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvDistillStartPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly distillService = inject(WvDistillService);
  private readonly worldviewApi = inject(WorldviewApiService);

  private requestVersion = 0;

  readonly unitId = signal('');
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly source = computed(() => this.workflow.getSource(this.unit()?.sourceId || ''));
  readonly notes = computed(() => this.notesService.listForUnit(this.source()?.id || '', this.unitId()));
  readonly highlights = computed(() => this.highlightsService.listForUnit(this.source()?.id || '', this.unitId()));
  readonly existingBatchId = signal<string | null>(null);
  readonly existingBatchStatus = signal<'draft' | 'active' | 'completed' | null>(null);
  readonly existingBatchLoading = signal(false);
  readonly localBatch = computed(() => this.distillService.getBatchForUnit(this.unitId()));
  readonly localBatchStatus = computed(() => this.localBatch()?.status ?? null);
  readonly distillLocked = computed(() =>
    this.existingBatchId() != null && this.existingBatchStatus() !== 'completed',
  );
  readonly actionLabel = computed(() => {
    if (this.distillLocked()) {
      return 'Open Existing Distill';
    }

    if (this.localBatchStatus() === 'active') {
      return 'Open Existing Distill';
    }

    if (this.localBatchStatus() === 'draft') {
      return 'Resume';
    }

    return 'Start Distill';
  });
  readonly actionDisabled = computed(() =>
    !this.distillLocked()
    && this.localBatchStatus() !== 'draft'
    && !this.notes().length
    && !this.highlights().length,
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.unitId.set(params.get('unitId') || '');
    });

    effect(() => {
      if (this.unitId() && this.unit()?.sourceId) {
        void this.loadExistingBatch();
      }
    });
  }

  startDistill(): void {
    if (this.distillLocked()) {
      void this.router.navigate(this.existingDistillRoute(this.existingBatchId()!, this.existingBatchStatus() ?? 'active'));
      return;
    }

    const localBatch = this.localBatch();
    if (localBatch?.status === 'active') {
      void this.router.navigate(this.existingDistillRoute(localBatch.id, localBatch.status));
      return;
    }

    if (localBatch?.status === 'draft') {
      void this.router.navigate(this.builderRoute(localBatch.id));
      return;
    }

    const source = this.source();
    const unit = this.unit();
    if (!source || !unit) {
      return;
    }

    const batch = this.distillService.ensureDraftBatch(source.id, unit.id);
    void this.router.navigate(this.builderRoute(batch.id));
  }

  backHref(): string {
    const unit = this.unit();
    if (!unit) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    return this.routeRoot() === 'wv'
      ? `/wv/source/${unit.sourceId}/unit/${unit.id}`
      : `/worldview/sources/${unit.sourceId}/units/${unit.id}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private builderRoute(batchId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'distill', 'batch', batchId]
      : ['/worldview', 'distill', 'batch', batchId];
  }

  private existingDistillRoute(batchId: string, status: 'draft' | 'active' | 'completed'): string[] {
    if (status === 'completed') {
      return this.routeRoot() === 'wv'
        ? ['/wv', 'source', this.source()?.id || '', 'unit', this.unit()?.id || '', 'content']
        : ['/worldview', 'sources', this.source()?.id || '', 'units', this.unit()?.id || '', 'content'];
    }

    return this.routeRoot() === 'wv'
      ? ['/wv', 'suggestions', batchId]
      : ['/worldview', 'suggestions', batchId];
  }

  private async loadExistingBatch(): Promise<void> {
    const source = this.source();
    const unit = this.unit();
    if (!source || !unit) {
      this.existingBatchId.set(null);
      this.existingBatchStatus.set(null);
      this.existingBatchLoading.set(false);
      return;
    }

    const requestVersion = ++this.requestVersion;
    this.existingBatchLoading.set(true);

    this.worldviewApi
      .fetchDistillBatchForUnit({
        sourceId: source.id,
        sourceUnitId: unit.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          if (!snapshot) {
            this.existingBatchId.set(null);
            this.existingBatchStatus.set(null);
            this.existingBatchLoading.set(false);
            return;
          }

          this.distillService.hydrateBatch(snapshot.batch, snapshot.items);
          this.existingBatchId.set(snapshot.batch.id);
          this.existingBatchStatus.set(snapshot.batch.status);
          this.existingBatchLoading.set(false);
        },
        error: () => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.existingBatchId.set(null);
          this.existingBatchStatus.set(null);
          this.existingBatchLoading.set(false);
        },
      });
  }
}
