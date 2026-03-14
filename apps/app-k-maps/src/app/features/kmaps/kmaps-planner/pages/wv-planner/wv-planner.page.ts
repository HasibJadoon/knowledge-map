import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvPlannerService } from '../../../kmaps-shared/services/wv-planner.service';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-wv-planner-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './wv-planner.page.html',
  styleUrl: './wv-planner.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvPlannerPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly plannerService = inject(WvPlannerService);

  readonly unitId = signal('');
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly source = computed(() => this.workflow.getSource(this.unit()?.sourceId || ''));
  readonly tasks = computed(() => (this.unit() ? this.plannerService.getTasksForUnit(this.unit()!.id) : []));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.unitId.set(params.get('unitId') || '');
    });

    effect(() => {
      const source = this.source();
      const unit = this.unit();
      if (!source || !unit) {
        return;
      }

      untracked(() => {
        this.plannerService.ensureTasksForUnit(source, unit);
      });
    });
  }

  updateLane(taskId: string, lane: 'todo' | 'in_progress' | 'review' | 'done'): void {
    this.plannerService.updateLane(taskId, lane);
  }

  onLaneChange(taskId: string, value: string | number | null | undefined): void {
    switch (value) {
      case 'todo':
      case 'in_progress':
      case 'review':
      case 'done':
        this.updateLane(taskId, value);
        return;
      default:
        this.updateLane(taskId, 'todo');
    }
  }

  openPlannerWorkspace(): void {
    void this.router.navigate(['/planner']);
  }

  backHref(): string {
    if (!this.source() || !this.unit()) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    return this.routeRoot() === 'wv'
      ? `/wv/source/${this.source()?.id || ''}/unit/${this.unit()?.id || ''}`
      : `/worldview/sources/${this.source()?.id || ''}/units/${this.unit()?.id || ''}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }
}
