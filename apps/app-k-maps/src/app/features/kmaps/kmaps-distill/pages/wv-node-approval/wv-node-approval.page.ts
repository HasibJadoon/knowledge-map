import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';

@Component({
  selector: 'app-wv-node-approval-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './wv-node-approval.page.html',
  styleUrl: './wv-node-approval.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvNodeApprovalPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly nodesService = inject(WvNodesService);

  readonly suggestionId = signal('');
  readonly suggestion = computed(() => this.nodesService.getSuggestion(this.suggestionId()));
  readonly decision = computed(() => this.nodesService.getDecisionForSuggestion(this.suggestionId()));
  readonly form = this.fb.nonNullable.group({
    title: '',
    summary: '',
    nodeType: 'concept',
    relationType: '',
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.suggestionId.set(params.get('suggestionId') || '');
      const suggestion = this.suggestion();
      const decision = this.decision();

      this.form.patchValue({
        title: decision?.title || suggestion?.title || '',
        summary: decision?.summary || suggestion?.summary || '',
        nodeType: (decision?.nodeType || suggestion?.kind || 'concept') as 'concept',
        relationType: decision?.relationType || suggestion?.relationType || '',
      });
    });
  }

  save(status: 'approved' | 'edited' | 'rejected' = 'edited'): void {
    this.nodesService.saveDecision({
      suggestionId: this.suggestionId(),
      status,
      title: this.form.controls.title.value,
      summary: this.form.controls.summary.value,
      nodeType: this.form.controls.nodeType.value as 'concept' | 'claim' | 'theme' | 'output' | 'edge',
      relationType: this.form.controls.relationType.value || null,
    });

    const batchId = this.suggestion()?.batchId;
    if (!batchId) {
      return;
    }

    void this.router.navigate(this.suggestionsRoute(batchId));
  }

  backHref(): string {
    const batchId = this.suggestion()?.batchId;
    if (!batchId) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    return this.routeRoot() === 'wv' ? `/wv/suggestions/${batchId}` : `/worldview/suggestions/${batchId}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private suggestionsRoute(batchId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'suggestions', batchId]
      : ['/worldview', 'suggestions', batchId];
  }
}
