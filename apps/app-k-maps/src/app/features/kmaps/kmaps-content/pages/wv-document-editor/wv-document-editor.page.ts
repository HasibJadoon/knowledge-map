import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { WvDocumentsService } from '../../../kmaps-shared/services/wv-documents.service';
import { WvDistillService } from '../../../kmaps-shared/services/wv-distill.service';
import { WvNodesService } from '../../../kmaps-shared/services/wv-nodes.service';
import { WvHighlightsService } from '../../../kmaps-shared/services/wv-highlights.service';
import { WvNotesService } from '../../../kmaps-shared/services/wv-notes.service';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-wv-document-editor-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './wv-document-editor.page.html',
  styleUrl: './wv-document-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvDocumentEditorPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly notesService = inject(WvNotesService);
  private readonly highlightsService = inject(WvHighlightsService);
  private readonly distillService = inject(WvDistillService);
  private readonly nodesService = inject(WvNodesService);
  private readonly documentsService = inject(WvDocumentsService);

  readonly batchId = signal('');
  readonly unitId = signal('');
  readonly batch = computed(() => this.distillService.getBatch(this.batchId()));
  readonly resolvedUnitId = computed(() => this.unitId() || this.batch()?.unitId || '');
  readonly unit = computed(() => this.workflow.getUnit(this.resolvedUnitId()));
  readonly source = computed(() => this.workflow.getSource(this.unit()?.sourceId || ''));
  readonly noteIds = computed(() => {
    const batchId = this.batchId();
    if (batchId) {
      return this.distillService
        .getItems(batchId)
        .filter((item) => item.selected)
        .map((item) => item.noteId);
    }

    return [
      ...this.notesService.listForUnit(this.source()?.id || '', this.resolvedUnitId()).map((note) => note.id),
      ...this.highlightsService.listForUnit(this.source()?.id || '', this.resolvedUnitId()).map((note) => note.id),
    ];
  });
  readonly claimIds = computed(() =>
    this.nodesService
      .decisions()
      .filter((decision) => decision.nodeType === 'claim' && decision.graphTargetId != null)
      .map((decision) => decision.graphTargetId!)
  );
  readonly conceptIds = computed(() =>
    this.nodesService
      .decisions()
      .filter((decision) => decision.nodeType !== 'claim' && decision.graphTargetId != null)
      .map((decision) => decision.graphTargetId!)
  );
  readonly documentDraft = signal<ReturnType<WvDocumentsService['createDraft']> | null>(null);
  readonly contentItem = computed(() => {
    const draft = this.documentDraft();
    return draft ? this.documentsService.getContentItem(draft.id) : null;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((queryParams) => {
      this.batchId.set(queryParams.get('batchId') || '');
      this.unitId.set(queryParams.get('unitId') || '');
      this.ensureDraft();
    });
  }

  ensureDraft(): void {
    if (this.documentDraft() || !this.unit() || !this.source()) {
      return;
    }

    const draft = this.documentsService.createDraft({
      sourceId: this.source()!.id,
      unitId: this.unit()!.id,
      title: `${this.source()!.title} · ${this.unit()!.title}`,
      noteIds: this.noteIds(),
      claimIds: this.claimIds(),
      conceptIds: this.conceptIds(),
    });

    this.documentDraft.set(draft);
  }

  openFullBuilder(): void {
    const contentItem = this.contentItem();
    if (!contentItem) {
      return;
    }

    void this.router.navigate(this.builderRoute(contentItem.id));
  }

  backHref(): string {
    const batchId = this.batchId();
    if (!batchId) {
      if (!this.source() || !this.unit()) {
        return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
      }

      return this.routeRoot() === 'wv'
        ? `/wv/source/${this.source()?.id || ''}/unit/${this.unit()?.id || ''}`
        : `/worldview/sources/${this.source()?.id || ''}/units/${this.unit()?.id || ''}`;
    }

    return this.routeRoot() === 'wv' ? `/wv/suggestions/${batchId}` : `/worldview/suggestions/${batchId}`;
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }

  private builderRoute(contentId: string): string[] {
    return this.routeRoot() === 'wv'
      ? ['/wv', 'content', contentId]
      : ['/worldview', 'content', contentId];
  }
}
