import { Injectable, inject } from '@angular/core';

import { KmapsNote } from '../../features/worldview/worldview/models/kmaps.models';
import { KmapsWorkflowService } from './kmaps-workflow.service';

@Injectable({ providedIn: 'root' })
export class WvHighlightsService {
  private readonly workflow = inject(KmapsWorkflowService);

  listForUnit(sourceId: string, unitId: string): KmapsNote[] {
    return this.workflow
      .getNotesForUnitScope(sourceId, unitId)
      .filter((note) => note.noteKind === 'highlight');
  }

  recentForUnit(sourceId: string, unitId: string, limit = 3): KmapsNote[] {
    return this.listForUnit(sourceId, unitId).slice(0, limit);
  }

  createHighlight(input: {
    sourceId: string;
    unitId: string;
    selectedText: string;
    locator: string | null;
  }): KmapsNote {
    return this.workflow.addNote({
      sourceId: input.sourceId,
      sourceUnitId: input.unitId,
      noteKind: 'highlight',
      title: 'Highlight',
      bodyMd: input.selectedText,
      excerptText: input.selectedText,
      locator: input.locator,
    });
  }

  updateHighlight(noteId: string, selectedText: string, locator: string | null): KmapsNote | null {
    return this.workflow.updateNote(noteId, {
      noteKind: 'highlight',
      title: 'Highlight',
      bodyMd: selectedText,
      excerptText: selectedText,
      locator,
    });
  }

  deleteHighlight(noteId: string): boolean {
    return this.workflow.deleteNote(noteId);
  }
}
