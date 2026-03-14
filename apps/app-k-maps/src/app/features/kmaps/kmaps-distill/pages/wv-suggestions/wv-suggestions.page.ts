import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';

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
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly notesService = inject(WvNotesService);
  private readonly distillService = inject(WvDistillService);
  private readonly nodesService = inject(WvNodesService);

  readonly batchId = signal('');
  readonly batch = computed(() => this.distillService.getBatch(this.batchId()));
  readonly unit = computed(() => this.workflow.getUnit(this.batch()?.unitId || ''));
  readonly source = computed(() => this.workflow.getSource(this.batch()?.sourceId || ''));
  readonly sourceNotes = computed(() => this.notesService.listForUnit(this.source()?.id || '', this.unit()?.id || ''));
  readonly sourceHighlights = computed(() => this.highlightsService.listForUnit(this.source()?.id || '', this.unit()?.id || ''));
  readonly noteMap = computed(() => new Map([...this.sourceHighlights(), ...this.sourceNotes()].map((note) => [note.id, note])));
  readonly hasBatch = computed(() => this.batch() != null);
  readonly suggestions = computed(() => (this.batchId() ? this.nodesService.getSuggestionsForBatch(this.batchId()) : []));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.batchId.set(params.get('batchId') || '');
    });

    effect(() => {
      const batch = this.batch();
      if (!batch) {
        return;
      }

      const batchItems = this.distillService.getItems(batch.id);
      const noteMap = this.noteMap();
      untracked(() => {
        this.nodesService.ensureSuggestions(batch, batchItems, noteMap);
      });
    });
  }

  approveSuggestion(suggestionId: string): void {
    const suggestion = this.nodesService.getSuggestion(suggestionId);
    if (!suggestion) {
      return;
    }

    this.nodesService.saveDecision({
      suggestionId,
      status: 'approved',
      title: suggestion.title,
      summary: suggestion.summary,
      nodeType: suggestion.kind,
      relationType: suggestion.relationType,
    });
  }

  rejectSuggestion(suggestionId: string): void {
    const suggestion = this.nodesService.getSuggestion(suggestionId);
    if (!suggestion) {
      return;
    }

    this.nodesService.saveDecision({
      suggestionId,
      status: 'rejected',
      title: suggestion.title,
      summary: suggestion.summary,
      nodeType: suggestion.kind,
      relationType: suggestion.relationType,
    });
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
}
