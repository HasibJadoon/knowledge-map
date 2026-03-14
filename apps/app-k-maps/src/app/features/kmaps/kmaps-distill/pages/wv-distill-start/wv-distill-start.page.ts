import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvDistillService } from '../../../kmaps-shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../kmaps-shared/services/wv-highlights.service';
import { WvNotesService } from '../../../kmaps-shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

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

  readonly unitId = signal('');
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly source = computed(() => this.workflow.getSource(this.unit()?.sourceId || ''));
  readonly notes = computed(() => this.notesService.listForUnit(this.source()?.id || '', this.unitId()));
  readonly highlights = computed(() => this.highlightsService.listForUnit(this.source()?.id || '', this.unitId()));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.unitId.set(params.get('unitId') || '');
    });
  }

  startDistill(): void {
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
}
