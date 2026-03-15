import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';

@Component({
  selector: 'app-wv-suggestions-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './wv-suggestions.page.html',
  styleUrl: './wv-suggestions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvSuggestionsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly worldviewApi = inject(WorldviewApiService);
  private readonly distillService = inject(WvDistillService);
  private readonly nodesService = inject(WvNodesService);

  readonly batchId = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isApprovingBatch = signal(false);
  readonly batch = computed(() => this.distillService.getBatch(this.batchId()));
  readonly unit = computed(() => this.workflow.getUnit(this.batch()?.unitId || ''));
  readonly source = computed(() => this.workflow.getSource(this.batch()?.sourceId || ''));
  readonly hasBatch = computed(() => this.batch() != null);
  readonly suggestions = computed(() => (this.batchId() ? this.nodesService.getSuggestionsForBatch(this.batchId()) : []));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.batchId.set(params.get('batchId') || '');
      void this.loadBatch();
    });
  }

  async approveSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.nodesService.getSuggestion(suggestionId);
    if (!suggestion || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const response = await firstValueFrom(
        this.worldviewApi.saveDistillDecision({
          suggestionId,
          decision: 'approve',
          title: suggestion.title,
          summary: suggestion.summary,
          nodeType: suggestion.kind,
          relationType: suggestion.relationType,
        }),
      );
      if (response.suggestion) {
        this.nodesService.upsertSuggestion(response.suggestion);
      }
      this.nodesService.upsertDecision(response.decision);
    } catch (error) {
      console.error('Failed to approve worldview suggestion.', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  async rejectSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.nodesService.getSuggestion(suggestionId);
    if (!suggestion || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const response = await firstValueFrom(
        this.worldviewApi.saveDistillDecision({
          suggestionId,
          decision: 'reject',
          title: suggestion.title,
          summary: suggestion.summary,
          nodeType: suggestion.kind,
          relationType: suggestion.relationType,
        }),
      );
      if (response.suggestion) {
        this.nodesService.upsertSuggestion(response.suggestion);
      }
      this.nodesService.upsertDecision(response.decision);
    } catch (error) {
      console.error('Failed to reject worldview suggestion.', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  editSuggestion(suggestionId: string): void {
    void this.router.navigate(this.approvalRoute(suggestionId));
  }

  openDocumentEditor(): void {
    void this.router.navigate(this.documentRoute(), {
      queryParams: {
        batchId: this.batchId(),
        unitId: this.unit()?.id || '',
      },
    });
  }

  openPlanner(): void {
    void this.router.navigate(this.plannerRoute());
  }

  async saveApprovedOutput(): Promise<void> {
    if (!this.batchId() || this.isApprovingBatch()) {
      return;
    }

    this.isApprovingBatch.set(true);
    try {
      const snapshot = await firstValueFrom(this.worldviewApi.approveDistillBatch(this.batchId()));
      this.distillService.hydrateBatch(snapshot.batch, snapshot.items);
      this.nodesService.hydrateBatch(snapshot.batch.id, snapshot.suggestions, snapshot.decisions);
      await this.workflow.reload();
    } catch (error) {
      console.error('Failed to commit worldview distill output.', error);
    } finally {
      this.isApprovingBatch.set(false);
    }
  }

  backHref(): string {
    if (!this.batch()) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    return this.routeRoot() === 'wv'
      ? `/wv/distill/batch/${this.batchId()}`
      : `/worldview/distill/batch/${this.batchId()}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private approvalRoute(suggestionId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'approval', suggestionId]
      : ['/worldview', 'approval', suggestionId];
  }

  private documentRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'document', 'create']
      : ['/worldview', 'document', 'create'];
  }

  private plannerRoute(): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'planner', this.unit()?.id || '']
      : ['/worldview', 'planner', this.unit()?.id || ''];
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
