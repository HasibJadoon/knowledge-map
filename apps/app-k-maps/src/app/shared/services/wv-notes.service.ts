import { Injectable, inject } from '@angular/core';

import { KmapsNote, KmapsNoteKind } from '../../features/kmaps/kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from './kmaps-workflow.service';

@Injectable({ providedIn: 'root' })
export class WvNotesService {
  private readonly workflow = inject(KmapsWorkflowService);

  listForUnit(sourceId: string, unitId: string): KmapsNote[] {
    return this.workflow
      .getNotesForUnitScope(sourceId, unitId)
      .filter((note) => note.noteKind !== 'highlight');
  }

  recentForUnit(sourceId: string, unitId: string, limit = 3): KmapsNote[] {
    return this.listForUnit(sourceId, unitId).slice(0, limit);
  }

  createNote(input: {
    sourceId: string;
    unitId: string | null;
    noteKind: KmapsNoteKind;
    title: string | null;
    bodyMd: string;
    excerptText?: string | null;
    locator?: string | null;
  }): KmapsNote {
    return this.workflow.addNote({
      sourceId: input.sourceId,
      sourceUnitId: input.unitId,
      noteKind: input.noteKind,
      title: input.title,
      bodyMd: input.bodyMd,
      excerptText: input.excerptText ?? null,
      locator: input.locator ?? null,
    });
  }

  updateNote(noteId: string, input: {
    noteKind: KmapsNoteKind;
    title: string | null;
    bodyMd: string;
    excerptText?: string | null;
    locator?: string | null;
  }): KmapsNote | null {
    return this.workflow.updateNote(noteId, {
      noteKind: input.noteKind,
      title: input.title,
      bodyMd: input.bodyMd,
      excerptText: input.excerptText ?? null,
      locator: input.locator ?? null,
    });
  }

  deleteNote(noteId: string): boolean {
    return this.workflow.deleteNote(noteId);
  }
}
