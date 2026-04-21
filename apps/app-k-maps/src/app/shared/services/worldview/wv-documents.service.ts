import { Injectable, inject, signal } from '@angular/core';

import { KmapsContentItem } from '../../models/worldview/kmaps.models';
import { WvDocumentDraft } from '../../models/worldview/wv-workspace.models';
import { KmapsWorkflowService } from './kmaps-workflow.service';

@Injectable({ providedIn: 'root' })
export class WvDocumentsService {
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly draftsState = signal<WvDocumentDraft[]>([]);

  readonly drafts = this.draftsState.asReadonly();

  createDraft(input: {
    sourceId: string;
    unitId: string;
    title: string;
    noteIds: string[];
    claimIds?: string[];
    conceptIds?: string[];
  }): WvDocumentDraft {
    const contentItem = this.workflow.createContentFromSelection(
      input.noteIds,
      input.claimIds ?? [],
      input.conceptIds ?? [],
    );
    const createdAt = new Date().toISOString();
    const draft: WvDocumentDraft = {
      id: createId('wv-document'),
      unitId: input.unitId,
      sourceId: input.sourceId,
      title: input.title.trim() || contentItem.title,
      docType: 'lesson',
      contentItemId: contentItem.id,
      createdAt,
      updatedAt: createdAt,
    };

    this.draftsState.update((current) => [draft, ...current]);
    return draft;
  }

  getDraft(documentId: string): WvDocumentDraft | null {
    return this.draftsState().find((draft) => draft.id === documentId) ?? null;
  }

  getContentItem(documentId: string): KmapsContentItem | null {
    const draft = this.getDraft(documentId);
    if (!draft) {
      return null;
    }

    return this.workflow.getContentItem(draft.contentItemId);
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
