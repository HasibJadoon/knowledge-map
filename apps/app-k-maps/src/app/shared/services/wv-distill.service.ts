import { Injectable, signal } from '@angular/core';

import { KmapsNote } from '../../features/kmaps/kmaps-shared/models/kmaps.models';
import { WvDistillBatch, WvDistillBatchItem, WvDistillItemRole } from '../../features/kmaps/kmaps-shared/models/wv-workspace.models';

@Injectable({ providedIn: 'root' })
export class WvDistillService {
  private readonly batchesState = signal<WvDistillBatch[]>([]);
  private readonly batchItemsState = signal<WvDistillBatchItem[]>([]);

  readonly batches = this.batchesState.asReadonly();
  readonly batchItems = this.batchItemsState.asReadonly();

  ensureDraftBatch(sourceId: string, unitId: string): WvDistillBatch {
    const existing = this.getBatchForUnit(unitId);
    if (existing) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const batch: WvDistillBatch = {
      id: createId('wv-distill-batch'),
      unitId,
      sourceId,
      batchType: 'distill',
      workspaceId: 'ws_worldview',
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    };

    this.batchesState.update((current) => [batch, ...current]);
    return batch;
  }

  getBatch(batchId: string): WvDistillBatch | null {
    return this.batchesState().find((batch) => batch.id === batchId) ?? null;
  }

  getBatchForUnit(unitId: string): WvDistillBatch | null {
    return this.batchesState()
      .filter((batch) => batch.unitId === unitId)
      .sort((left, right) => compareBatchRecency(left, right))[0] ?? null;
  }

  getItems(batchId: string): WvDistillBatchItem[] {
    return this.batchItemsState().filter((item) => item.batchId === batchId);
  }

  hydrateBatch(batch: WvDistillBatch, items: WvDistillBatchItem[]): void {
    this.batchesState.update((current) => {
      const rest = current.filter((entry) => entry.id !== batch.id);
      return [batch, ...rest];
    });

    this.batchItemsState.update((current) => {
      const rest = current.filter((entry) => entry.batchId !== batch.id);
      return [...items, ...rest];
    });
  }

  syncBatchItems(batchId: string, notes: KmapsNote[]): WvDistillBatchItem[] {
    const existing = new Map(this.getItems(batchId).map((item) => [item.noteId, item]));
    const createdAt = new Date().toISOString();

    const nextItems = notes.map((note) => {
      const current = existing.get(note.id);
      if (current) {
        return current;
      }

      return {
        id: createId('wv-distill-item'),
        batchId,
        noteId: note.id,
        role: note.noteKind === 'highlight' ? 'evidence' : inferRole(note.noteKind),
        selected: note.noteKind !== 'highlight',
        createdAt,
        updatedAt: createdAt,
      } satisfies WvDistillBatchItem;
    });

    this.batchItemsState.update((items) => {
      const retained = items.filter((item) => item.batchId !== batchId);
      return [...nextItems, ...retained];
    });

    return nextItems;
  }

  updateItemSelection(batchId: string, noteId: string, selected: boolean): void {
    const updatedAt = new Date().toISOString();
    this.batchItemsState.update((items) =>
      items.map((item) =>
        item.batchId === batchId && item.noteId === noteId ? { ...item, selected, updatedAt } : item,
      ),
    );
    this.touchBatch(batchId, updatedAt);
  }

  updateItemRole(batchId: string, noteId: string, role: WvDistillItemRole): void {
    const updatedAt = new Date().toISOString();
    this.batchItemsState.update((items) =>
      items.map((item) =>
        item.batchId === batchId && item.noteId === noteId ? { ...item, role, updatedAt } : item,
      ),
    );
    this.touchBatch(batchId, updatedAt);
  }

  completeBatch(batchId: string): void {
    const updatedAt = new Date().toISOString();
    this.batchesState.update((batches) =>
      batches.map((batch) => (batch.id === batchId ? { ...batch, status: 'active', updatedAt } : batch)),
    );
  }

  private touchBatch(batchId: string, updatedAt: string): void {
    this.batchesState.update((batches) =>
      batches.map((batch) => (batch.id === batchId ? { ...batch, updatedAt } : batch)),
    );
  }
}

function inferRole(noteKind: KmapsNote['noteKind']): WvDistillItemRole {
  switch (noteKind) {
    case 'claim_seed':
      return 'claim_seed';
    case 'question':
      return 'question';
    case 'observation':
    case 'summary':
      return 'observation';
    default:
      return 'evidence';
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function compareBatchRecency(left: WvDistillBatch, right: WvDistillBatch): number {
  const leftTime = Date.parse(left.updatedAt || left.createdAt);
  const rightTime = Date.parse(right.updatedAt || right.createdAt);
  return rightTime - leftTime;
}
