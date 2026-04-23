import { Injectable, inject, signal } from '@angular/core';

import { KmapsNote } from '../models/worldview/kmaps.models';
import { KmapsWorkflowService } from './kmaps-workflow.service';
import { WvDistillBatch, WvDistillBatchItem, WvInsightDecision, WvInsightSuggestion } from '../models/worldview/wv-workspace.models';

@Injectable({ providedIn: 'root' })
export class WvNodesService {
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly suggestionsState = signal<WvInsightSuggestion[]>([]);
  private readonly decisionsState = signal<WvInsightDecision[]>([]);

  readonly suggestions = this.suggestionsState.asReadonly();
  readonly decisions = this.decisionsState.asReadonly();

  getNodeCountForUnit(sourceId: string, unitId: string): number {
    return (
      this.workflow.getConceptsForContext(sourceId, unitId).length +
      this.workflow.getClaimsForContext(sourceId, unitId).length
    );
  }

  getSuggestionsForBatch(batchId: string): WvInsightSuggestion[] {
    return this.suggestionsState().filter((suggestion) => suggestion.batchId === batchId);
  }

  getSuggestion(suggestionId: string): WvInsightSuggestion | null {
    return this.suggestionsState().find((suggestion) => suggestion.id === suggestionId) ?? null;
  }

  getDecisionForSuggestion(suggestionId: string): WvInsightDecision | null {
    return this.decisionsState().find((decision) => decision.suggestionId === suggestionId) ?? null;
  }

  hydrateBatch(batchId: string, suggestions: WvInsightSuggestion[], decisions: WvInsightDecision[]): void {
    this.suggestionsState.update((current) => {
      const rest = current.filter((entry) => entry.batchId !== batchId);
      return [...suggestions, ...rest];
    });

    const suggestionIds = new Set(suggestions.map((entry) => entry.id));
    this.decisionsState.update((current) => {
      const rest = current.filter((entry) => !suggestionIds.has(entry.suggestionId));
      return [...decisions, ...rest];
    });
  }

  upsertSuggestion(suggestion: WvInsightSuggestion): void {
    this.suggestionsState.update((current) => {
      const rest = current.filter((entry) => entry.id !== suggestion.id);
      return [suggestion, ...rest];
    });
  }

  upsertDecision(decision: WvInsightDecision | null): void {
    if (!decision) {
      return;
    }

    this.decisionsState.update((current) => {
      const rest = current.filter((entry) => entry.suggestionId !== decision.suggestionId);
      return [decision, ...rest];
    });
  }

  ensureSuggestions(batch: WvDistillBatch, items: WvDistillBatchItem[], notesById: Map<string, KmapsNote>): WvInsightSuggestion[] {
    const existing = this.getSuggestionsForBatch(batch.id);
    if (existing.length) {
      return existing;
    }

    const selectedItems = items.filter((item) => item.selected);
    const selectedNotes = selectedItems
      .map((item) => notesById.get(item.noteId))
      .filter((note): note is KmapsNote => note != null);
    const createdAt = new Date().toISOString();

    const suggestions = buildSuggestions(batch, selectedItems, selectedNotes, createdAt);
    this.suggestionsState.update((current) => [...suggestions, ...current]);
    return suggestions;
  }

  saveDecision(input: {
    suggestionId: string;
    status: WvInsightDecision['status'];
    title: string;
    summary: string;
    nodeType: WvInsightDecision['nodeType'];
    relationType: string | null;
  }): WvInsightDecision | null {
    const suggestion = this.getSuggestion(input.suggestionId);
    if (!suggestion) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    const existing = this.getDecisionForSuggestion(input.suggestionId);
    const graphTargetId = this.persistGraphNode(suggestion, input.title, input.nodeType);
    const decision: WvInsightDecision = {
      id: existing?.id || createId('wv-decision'),
      suggestionId: input.suggestionId,
      status: input.status,
      title: input.title.trim(),
      summary: input.summary.trim(),
      nodeType: input.nodeType,
      relationType: input.relationType,
      graphTargetId,
      createdAt: existing?.createdAt || updatedAt,
      updatedAt,
    };

    this.decisionsState.update((current) => {
      const rest = current.filter((item) => item.suggestionId !== decision.suggestionId);
      return [decision, ...rest];
    });
    this.suggestionsState.update((current) =>
      current.map((item) =>
        item.id === input.suggestionId
          ? { ...item, status: input.status === 'rejected' ? 'rejected' : 'approved', updatedAt }
          : item,
      ),
    );

    return decision;
  }

  private persistGraphNode(
    suggestion: WvInsightSuggestion,
    title: string,
    nodeType: WvInsightDecision['nodeType'],
  ): string | null {
    if (!suggestion.sourceNoteIds.length || nodeType === 'edge') {
      return null;
    }

    if (nodeType === 'claim') {
      return this.workflow.createClaimFromNotes(suggestion.sourceNoteIds).id;
    }

    return this.workflow.createConceptAndLink(title, suggestion.sourceNoteIds).id;
  }
}

function buildSuggestions(
  batch: WvDistillBatch,
  items: WvDistillBatchItem[],
  notes: KmapsNote[],
  createdAt: string,
): WvInsightSuggestion[] {
  if (!notes.length) {
    return [];
  }

  const summaries = notes.map((note) => summarizeNote(note));
  const evidenceText = notes.find((note) => note.noteKind === 'highlight')?.excerptText || notes[0]?.excerptText || notes[0]?.bodyMd || '';
  const seedText = notes.find((note) => note.noteKind === 'claim_seed')?.bodyMd || summaries[0];

  return [
    {
      id: createId('wv-suggestion'),
      batchId: batch.id,
      kind: 'concept',
      title: buildConceptTitle(notes[0]),
      summary: `${seedText} This concept can anchor the unit's emerging worldview graph.`,
      relationType: 'supports',
      sourceNoteIds: items.map((item) => item.noteId),
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: createId('wv-suggestion'),
      batchId: batch.id,
      kind: 'claim',
      title: buildClaimTitle(seedText),
      summary: summaries.slice(0, 2).join(' '),
      relationType: 'supported_by',
      sourceNoteIds: items.map((item) => item.noteId),
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: createId('wv-suggestion'),
      batchId: batch.id,
      kind: 'output',
      title: buildOutputTitle(notes[0]),
      summary: evidenceText || summaries[0],
      relationType: 'feeds_output',
      sourceNoteIds: items.map((item) => item.noteId),
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

function summarizeNote(note: KmapsNote): string {
  const value = (note.bodyMd || note.excerptText || '').trim();
  return value.length > 120 ? `${value.slice(0, 117).trim()}...` : value;
}

function buildConceptTitle(note: KmapsNote): string {
  const base = note.title?.trim() || note.locator?.trim() || 'New concept';
  return base.length > 48 ? `${base.slice(0, 45).trim()}...` : base;
}

function buildClaimTitle(seedText: string): string {
  const trimmed = seedText.trim() || 'New distilled claim';
  return trimmed.length > 72 ? `${trimmed.slice(0, 69).trim()}...` : trimmed;
}

function buildOutputTitle(note: KmapsNote): string {
  const locator = note.locator?.trim();
  return locator ? `${locator} worldview output` : 'Worldview output draft';
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
