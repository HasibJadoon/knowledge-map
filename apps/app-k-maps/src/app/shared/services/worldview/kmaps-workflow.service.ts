import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  KMAPS_CLAIMS,
  KMAPS_CONCEPTS,
  KMAPS_CONTENT_ITEMS,
  KMAPS_NOTES,
  KMAPS_NOTE_LINKS,
  KMAPS_PEOPLE,
  KMAPS_SOURCES,
  KMAPS_SOURCE_DETAILS,
  KMAPS_SOURCE_PEOPLE,
  KMAPS_SOURCE_UNITS,
} from '../../features/worldview/data/kmaps-workflow.data';
import {
  KmapsClaim,
  KmapsConcept,
  KmapsContentBlock,
  KmapsContentBlockKind,
  KmapsContentItem,
  KmapsEvidenceItem,
  KmapsLinkRelation,
  KmapsMetaItem,
  KmapsNote,
  KmapsNoteKind,
  KmapsNoteLink,
  KmapsPerson,
  KmapsSource,
  KmapsSourceContributor,
  KmapsSourceDetail,
  KmapsSourcePerson,
  KmapsSourceUnit,
  formatContentBlockLabel,
  formatNoteKindLabel,
  formatTokenLabel,
} from '../../models/worldview/kmaps.models';
import {
  CreateWorldviewSourceInput,
  CreateWorldviewUnitInput,
  UpdateWorldviewSourceInput,
  UpdateWorldviewUnitInput,
  WorldviewApiService,
} from './worldview-api.service';

type CreateNoteInput = {
  sourceId: string;
  sourceUnitId: string | null;
  noteKind: KmapsNoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
  locator: string | null;
};

type UpdateNoteInput = {
  noteKind: KmapsNoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
  locator: string | null;
};

@Injectable({ providedIn: 'root' })
export class KmapsWorkflowService {
  private readonly worldviewApi = inject(WorldviewApiService);
  private readonly peopleState = signal<KmapsPerson[]>(clone(KMAPS_PEOPLE));
  private readonly sourcesState = signal<KmapsSource[]>(clone(KMAPS_SOURCES));
  private readonly sourcePeopleState = signal<KmapsSourcePerson[]>(clone(KMAPS_SOURCE_PEOPLE));
  private readonly sourceDetailsState = signal<KmapsSourceDetail[]>(clone(KMAPS_SOURCE_DETAILS));
  private readonly unitsState = signal<KmapsSourceUnit[]>(clone(KMAPS_SOURCE_UNITS));
  private readonly notesState = signal<KmapsNote[]>(clone(KMAPS_NOTES));
  private readonly noteLinksState = signal<KmapsNoteLink[]>(clone(KMAPS_NOTE_LINKS));
  private readonly conceptsState = signal<KmapsConcept[]>(clone(KMAPS_CONCEPTS));
  private readonly claimsState = signal<KmapsClaim[]>(clone(KMAPS_CLAIMS));
  private readonly contentItemsState = signal<KmapsContentItem[]>(clone(KMAPS_CONTENT_ITEMS));

  readonly people = this.peopleState.asReadonly();
  readonly sources = this.sourcesState.asReadonly();
  readonly sourcePeople = this.sourcePeopleState.asReadonly();
  readonly sourceDetails = this.sourceDetailsState.asReadonly();
  readonly units = this.unitsState.asReadonly();
  readonly notes = this.notesState.asReadonly();
  readonly noteLinks = this.noteLinksState.asReadonly();
  readonly concepts = this.conceptsState.asReadonly();
  readonly claims = this.claimsState.asReadonly();
  readonly contentItems = this.contentItemsState.asReadonly();

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    try {
      const snapshot = await firstValueFrom(this.worldviewApi.fetchWorkflow());
      this.peopleState.set(snapshot.people);
      this.sourcesState.set(snapshot.sources);
      this.sourcePeopleState.set(snapshot.sourcePeople);
      this.sourceDetailsState.set(snapshot.sourceDetails);
      this.unitsState.set(snapshot.units);
      this.notesState.set(snapshot.notes);
    } catch (error) {
      console.error('Failed to hydrate worldview workflow from API.', error);
    }
  }

  async createSourceWithUnits(input: CreateWorldviewSourceInput): Promise<{ sourceId: string; unitIds: string[] }> {
    const result = await firstValueFrom(this.worldviewApi.createSource(input));
    await this.reload();
    return result;
  }

  async updateSource(input: UpdateWorldviewSourceInput): Promise<{ sourceId: string; unitIds: string[] }> {
    const result = await firstValueFrom(this.worldviewApi.updateSource(input));
    await this.reload();
    return result;
  }

  async createUnit(input: CreateWorldviewUnitInput): Promise<{ unitId: string }> {
    const result = await firstValueFrom(this.worldviewApi.createUnit(input));
    await this.reload();
    return result;
  }

  async updateUnit(input: UpdateWorldviewUnitInput): Promise<{ unitId: string }> {
    const result = await firstValueFrom(this.worldviewApi.updateUnit(input));
    await this.reload();
    return result;
  }

  getSource(sourceId: string | null | undefined): KmapsSource | null {
    const id = (sourceId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.sourcesState().find((source) => source.id === id) ?? null;
  }

  getPerson(personId: string | null | undefined): KmapsPerson | null {
    const id = (personId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.peopleState().find((person) => person.id === id) ?? null;
  }

  getUnitsForSource(sourceId: string | null | undefined): KmapsSourceUnit[] {
    const id = (sourceId ?? '').trim();
    if (!id) {
      return [];
    }

    return this.unitsState()
      .filter((unit) => unit.sourceId === id)
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }

  getUnit(unitId: string | null | undefined): KmapsSourceUnit | null {
    const id = (unitId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.unitsState().find((unit) => unit.id === id) ?? null;
  }

  getContributorsForSource(sourceId: string | null | undefined): KmapsSourceContributor[] {
    const id = (sourceId ?? '').trim();
    if (!id) {
      return [];
    }

    return this.sourcePeopleState()
      .filter((entry) => entry.sourceId === id)
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.orderIndex - right.orderIndex;
      })
      .map((entry) => {
        const person = this.getPerson(entry.personId);
        if (!person) {
          return null;
        }

        return {
          person,
          role: entry.role,
          orderIndex: entry.orderIndex,
          isPrimary: entry.isPrimary,
          note: entry.note,
        } satisfies KmapsSourceContributor;
      })
      .filter((entry): entry is KmapsSourceContributor => entry != null);
  }

  getDetailsForSource(sourceId: string | null | undefined): KmapsSourceDetail[] {
    const id = (sourceId ?? '').trim();
    if (!id) {
      return [];
    }

    return this.sourceDetailsState()
      .filter((detail) => detail.sourceId === id)
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }

  getPublicationMetaForSource(sourceId: string | null | undefined): KmapsMetaItem[] {
    const source = this.getSource(sourceId);
    if (!source) {
      return [];
    }

    const items: KmapsMetaItem[] = [];

    if (source.publisher) {
      items.push({ label: 'Publisher', value: source.publisher });
    }

    if (source.publicationYear) {
      items.push({ label: 'Year', value: String(source.publicationYear) });
    }

    if (source.language) {
      items.push({ label: 'Language', value: source.language });
    }

    for (const detail of this.getDetailsForSource(source.id)) {
      if (!detail.detailValue || !detail.detailKey.startsWith('publication:')) {
        continue;
      }

      items.push({
        label: formatDetailLabel(detail.detailKey.slice('publication:'.length)),
        value: detail.detailValue,
      });
    }

    if (source.sourceUrl) {
      items.push({ label: 'Source URL', value: source.sourceUrl });
    }

    if (source.sourceRef) {
      items.push({ label: 'Reference', value: source.sourceRef });
    }

    return uniqueMetaItems(items);
  }

  getDescriptiveMetaForSource(sourceId: string | null | undefined): KmapsMetaItem[] {
    const source = this.getSource(sourceId);
    if (!source) {
      return [];
    }

    const items: KmapsMetaItem[] = [];

    if (source.description) {
      items.push({ label: 'Summary', value: source.description });
    }

    if (source.status) {
      items.push({ label: 'Status', value: formatTokenLabel(source.status) });
    }

    const recentLocator = typeof source.sourceJson?.['recentLocator'] === 'string' ? source.sourceJson['recentLocator'] : null;
    if (recentLocator) {
      items.push({ label: 'Recent Locator', value: recentLocator });
    }

    for (const detail of this.getDetailsForSource(source.id)) {
      if (!detail.detailValue || !detail.detailKey.startsWith('detail:')) {
        continue;
      }

      items.push({
        label: formatDetailLabel(detail.detailKey.slice('detail:'.length)),
        value: detail.detailValue,
      });
    }

    return uniqueMetaItems(items);
  }

  getNotesForContext(sourceId: string | null | undefined, sourceUnitId?: string | null): KmapsNote[] {
    const id = (sourceId ?? '').trim();
    if (!id) {
      return [];
    }

    return this.notesState()
      .filter((note) => {
        if (note.sourceId !== id) {
          return false;
        }

        if (!sourceUnitId) {
          return true;
        }

        return note.sourceUnitId === sourceUnitId;
      })
      .sort(compareByDateDesc);
  }

  getNotesForUnitScope(sourceId: string | null | undefined, sourceUnitId: string | null | undefined): KmapsNote[] {
    const source = (sourceId ?? '').trim();
    const unit = (sourceUnitId ?? '').trim();
    if (!source) {
      return [];
    }

    if (!unit) {
      return this.getNotesForContext(source);
    }

    const scopedUnitIds = this.resolveUnitScopeIds(source, unit);
    return this.getNotesForContext(source).filter((note) => note.sourceUnitId != null && scopedUnitIds.has(note.sourceUnitId));
  }

  getRecentSources(limit = 3): KmapsSource[] {
    return [...this.sourcesState()].sort(compareByEntityRecency).slice(0, limit);
  }

  getSourceNotesCount(sourceId: string): number {
    return this.getNotesForContext(sourceId).length;
  }

  getSourceClaimCount(sourceId: string): number {
    return this.claimsState().filter((claim) => claim.sourceId === sourceId).length;
  }

  getRecentNotes(sourceId: string, sourceUnitId: string | null, limit = 3): KmapsNote[] {
    return this.getNotesForContext(sourceId, sourceUnitId).slice(0, limit);
  }

  getClaimsForContext(sourceId: string | null | undefined, sourceUnitId?: string | null): KmapsClaim[] {
    const source = (sourceId ?? '').trim();
    if (!source) {
      return [];
    }

    if (!sourceUnitId) {
      return this.claimsState()
        .filter((claim) => claim.sourceId === source)
        .sort(compareByDateDesc);
    }

    const scopedUnitIds = this.resolveUnitScopeIds(source, sourceUnitId);
    return this.claimsState()
      .filter((claim) => claim.sourceId === source && claim.sourceUnitId != null && scopedUnitIds.has(claim.sourceUnitId))
      .sort(compareByDateDesc);
  }

  getConceptsForContext(sourceId: string | null | undefined, sourceUnitId?: string | null): KmapsConcept[] {
    const noteIds = new Set(this.getNotesForUnitScope(sourceId, sourceUnitId).map((note) => note.id));
    const conceptIds = new Set<string>();

    for (const link of this.noteLinksState()) {
      if (link.targetType === 'concept' && noteIds.has(link.noteId)) {
        conceptIds.add(link.targetId);
      }
    }

    for (const claim of this.getClaimsForContext(sourceId, sourceUnitId)) {
      for (const conceptId of claim.conceptIds) {
        conceptIds.add(conceptId);
      }
    }

    return [...this.conceptsState()]
      .filter((concept) => conceptIds.has(concept.id))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  getNotesForConceptInContext(
    conceptId: string | null | undefined,
    sourceId: string | null | undefined,
    sourceUnitId?: string | null,
  ): KmapsNote[] {
    const id = (conceptId ?? '').trim();
    if (!id) {
      return [];
    }

    const scopedNoteIds = new Set(this.getNotesForUnitScope(sourceId, sourceUnitId).map((note) => note.id));
    const linkedNoteIds = new Set(
      this.noteLinksState()
        .filter((link) => link.targetType === 'concept' && link.targetId === id && scopedNoteIds.has(link.noteId))
        .map((link) => link.noteId),
    );

    return this.notesState()
      .filter((note) => linkedNoteIds.has(note.id))
      .sort(compareByDateDesc);
  }

  getNoteKindCounts(sourceId: string, sourceUnitId?: string | null): Record<KmapsNoteKind, number> {
    const counts = createEmptyNoteKindCounts();
    for (const note of this.getNotesForContext(sourceId, sourceUnitId)) {
      counts[note.noteKind] += 1;
    }

    return counts;
  }

  getNoteLinksForNote(noteId: string): KmapsNoteLink[] {
    return this.noteLinksState().filter((link) => link.noteId === noteId);
  }

  getNoteById(noteId: string | null | undefined): KmapsNote | null {
    const id = (noteId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.getNote(id);
  }

  getConcept(conceptId: string | null | undefined): KmapsConcept | null {
    const id = (conceptId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.conceptsState().find((concept) => concept.id === id) ?? null;
  }

  getClaim(claimId: string | null | undefined): KmapsClaim | null {
    const id = (claimId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.claimsState().find((claim) => claim.id === id) ?? null;
  }

  getContentItem(contentItemId: string | null | undefined): KmapsContentItem | null {
    const id = (contentItemId ?? '').trim();
    if (!id) {
      return null;
    }

    return this.contentItemsState().find((item) => item.id === id) ?? null;
  }

  getLinkedConceptsForNotes(noteIds: string[]): KmapsConcept[] {
    const conceptIds = new Set(
      this.noteLinksState()
        .filter((link) => noteIds.includes(link.noteId) && link.targetType === 'concept')
        .map((link) => link.targetId),
    );

    return this.conceptsState().filter((concept) => conceptIds.has(concept.id));
  }

  getConceptSuggestions(noteIds: string[], query = ''): KmapsConcept[] {
    const normalized = query.trim().toLowerCase();
    const linkedConceptIds = new Set(this.getLinkedConceptsForNotes(noteIds).map((concept) => concept.id));

    return [...this.conceptsState()]
      .filter((concept) => {
        if (!normalized) {
          return true;
        }

        return (
          concept.label.toLowerCase().includes(normalized) ||
          concept.summary.toLowerCase().includes(normalized) ||
          concept.slug.includes(normalized)
        );
      })
      .sort((left, right) => {
        const leftPriority = linkedConceptIds.has(left.id) ? 1 : 0;
        const rightPriority = linkedConceptIds.has(right.id) ? 1 : 0;
        if (leftPriority !== rightPriority) {
          return rightPriority - leftPriority;
        }

        return left.label.localeCompare(right.label);
      });
  }

  getNotesForClaim(claimId: string): KmapsNote[] {
    const claim = this.getClaim(claimId);
    if (!claim) {
      return [];
    }

    return claim.noteIds
      .map((noteId) => this.getNote(noteId))
      .filter((note): note is KmapsNote => note != null);
  }

  getClaimsForConcept(conceptId: string): KmapsClaim[] {
    return this.claimsState().filter((claim) => claim.conceptIds.includes(conceptId));
  }

  getRelatedNotesForConcept(conceptId: string): KmapsNote[] {
    const linkedNoteIds = new Set(
      this.noteLinksState()
        .filter((link) => link.targetType === 'concept' && link.targetId === conceptId)
        .map((link) => link.noteId),
    );

    return this.notesState()
      .filter((note) => linkedNoteIds.has(note.id))
      .sort(compareByDateDesc);
  }

  getRelatedSourcesForConcept(conceptId: string): KmapsSource[] {
    const sourceIds = new Set<string>();

    for (const note of this.getRelatedNotesForConcept(conceptId)) {
      sourceIds.add(note.sourceId);
    }

    for (const claim of this.getClaimsForConcept(conceptId)) {
      if (claim.sourceId) {
        sourceIds.add(claim.sourceId);
      }
    }

    return this.sourcesState().filter((source) => sourceIds.has(source.id));
  }

  getRelatedConcepts(conceptId: string): KmapsConcept[] {
    const concept = this.getConcept(conceptId);
    if (!concept) {
      return [];
    }

    const relatedIds = new Set(concept.relatedConceptIds);
    for (const claim of this.getClaimsForConcept(conceptId)) {
      for (const relatedConceptId of claim.conceptIds) {
        if (relatedConceptId !== conceptId) {
          relatedIds.add(relatedConceptId);
        }
      }
    }

    return this.conceptsState().filter((item) => relatedIds.has(item.id));
  }

  getEvidenceItemsFromNotes(noteIds: string[]): KmapsEvidenceItem[] {
    return noteIds
      .map((noteId) => this.getNote(noteId))
      .filter((note): note is KmapsNote => note != null)
      .map((note) => ({
        id: note.id,
        title: note.title || formatNoteKindLabel(note.noteKind),
        body: note.excerptText || note.bodyMd,
        meta: [note.locator, formatNoteKindLabel(note.noteKind)].filter(Boolean).join(' • '),
        noteKind: note.noteKind,
      }));
  }

  addNote(input: CreateNoteInput): KmapsNote {
    const createdAt = new Date().toISOString();
    const id = createId('note');
    const note: KmapsNote = {
      id,
      canonicalInput: `wv_note|${input.sourceId}|${input.sourceUnitId ?? 'root'}|${slugify(input.title || input.bodyMd).slice(0, 32)}`,
      userId: 1,
      sourceId: input.sourceId,
      sourceUnitId: input.sourceUnitId,
      noteKind: input.noteKind,
      title: input.title,
      bodyMd: input.bodyMd.trim(),
      excerptText: input.excerptText?.trim() || null,
      locator: input.locator?.trim() || null,
      status: 'active',
      noteJson: null,
      metaJson: null,
      createdAt,
      updatedAt: createdAt,
    };

    this.notesState.update((current) => [note, ...current]);
    this.addContextLinks(note);
    this.bumpSourceTimestamp(input.sourceId, createdAt);
    return note;
  }

  updateNote(noteId: string, input: UpdateNoteInput): KmapsNote | null {
    const id = noteId.trim();
    if (!id) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    let updatedNote: KmapsNote | null = null;
    let updatedSourceId: string | null = null;

    this.notesState.update((current) =>
      current.map((note) => {
        if (note.id !== id) {
          return note;
        }

        updatedNote = {
          ...note,
          noteKind: input.noteKind,
          title: input.title?.trim() || null,
          bodyMd: input.bodyMd.trim(),
          excerptText: input.excerptText?.trim() || null,
          locator: input.locator?.trim() || null,
          updatedAt,
        };
        updatedSourceId = note.sourceId;

        return updatedNote;
      }),
    );

    if (updatedSourceId) {
      this.bumpSourceTimestamp(updatedSourceId, updatedAt);
    }

    return updatedNote;
  }

  deleteNote(noteId: string): boolean {
    const id = noteId.trim();
    if (!id) {
      return false;
    }

    const note = this.getNote(id);
    if (!note) {
      return false;
    }

    this.notesState.update((current) => current.filter((item) => item.id !== id));
    this.noteLinksState.update((current) => current.filter((item) => item.noteId !== id));
    this.bumpSourceTimestamp(note.sourceId, new Date().toISOString());
    return true;
  }

  linkNotesToConcept(noteIds: string[], conceptId: string): void {
    const createdAt = new Date().toISOString();
    const existing = new Set(
      this.noteLinksState()
        .filter((link) => link.targetType === 'concept' && link.targetId === conceptId)
        .map((link) => link.noteId),
    );

    const additions = noteIds
      .filter((noteId) => !existing.has(noteId))
      .map((noteId) => this.buildNoteLink(noteId, 'concept', conceptId, 'distills_to_concept', createdAt));

    if (!additions.length) {
      return;
    }

    this.noteLinksState.update((current) => [...additions, ...current]);
    this.conceptsState.update((concepts) =>
      concepts.map((concept) => (concept.id === conceptId ? { ...concept, updatedAt: createdAt } : concept)),
    );
  }

  createConceptAndLink(label: string, noteIds: string[]): KmapsConcept {
    const normalizedLabel = label.trim();
    const existing = this.conceptsState().find((concept) => concept.label.toLowerCase() === normalizedLabel.toLowerCase());
    if (existing) {
      this.linkNotesToConcept(noteIds, existing.id);
      return existing;
    }

    const createdAt = new Date().toISOString();
    const concept: KmapsConcept = {
      id: createId('concept'),
      canonicalInput: `wv_concept|${slugify(normalizedLabel)}`,
      slug: slugify(normalizedLabel),
      label: normalizedLabel,
      summary: 'Created during distillation. Expand the summary once the concept boundary is clearer.',
      category: 'other',
      status: 'active',
      relatedConceptIds: [],
      createdAt,
      updatedAt: createdAt,
    };

    this.conceptsState.update((current) => [concept, ...current]);
    this.linkNotesToConcept(noteIds, concept.id);
    return concept;
  }

  createClaimFromNotes(noteIds: string[]): KmapsClaim {
    const selectedNotes = this.resolveNotes(noteIds);
    const createdAt = new Date().toISOString();
    const title = buildClaimTitle(selectedNotes);
    const sourceId = selectedNotes[0]?.sourceId ?? null;
    const sourceUnitId = selectedNotes[0]?.sourceUnitId ?? null;
    const conceptIds = this.getLinkedConceptsForNotes(noteIds).map((concept) => concept.id);

    const claim: KmapsClaim = {
      id: createId('claim'),
      canonicalInput: `wv_claim|${slugify(title)}|${createdAt}`,
      title,
      claimText: buildClaimText(selectedNotes),
      sourceId,
      sourceUnitId,
      noteIds: noteIds.slice(),
      conceptIds,
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    };

    this.claimsState.update((current) => [claim, ...current]);
    this.syncNoteLinksForTarget(noteIds, 'claim', claim.id, 'supports_claim', createdAt);
    return claim;
  }

  saveClaim(claim: KmapsClaim): KmapsClaim {
    const updatedAt = new Date().toISOString();
    const nextClaim = { ...claim, updatedAt };
    let exists = false;

    this.claimsState.update((current) =>
      current.map((item) => {
        if (item.id !== claim.id) {
          return item;
        }

        exists = true;
        return nextClaim;
      }),
    );

    if (!exists) {
      this.claimsState.update((current) => [nextClaim, ...current]);
    }

    this.syncNoteLinksForTarget(nextClaim.noteIds, 'claim', nextClaim.id, 'supports_claim', updatedAt);
    return nextClaim;
  }

  createContentFromSelection(noteIds: string[], claimIds: string[] = [], conceptIds: string[] = []): KmapsContentItem {
    const createdAt = new Date().toISOString();
    const evidenceItems = this.getEvidenceItemsFromNotes(noteIds);
    const title = evidenceItems[0]?.title ? `${evidenceItems[0].title} outline` : 'New content outline';

    const contentItem: KmapsContentItem = {
      id: createId('content'),
      canonicalInput: `wv_content|${slugify(title)}|${createdAt}`,
      title,
      contentType: 'article',
      status: 'draft',
      noteIds: noteIds.slice(),
      claimIds: claimIds.slice(),
      conceptIds: conceptIds.length ? conceptIds.slice() : this.getLinkedConceptsForNotes(noteIds).map((concept) => concept.id),
      blocks: createDefaultBlocks(evidenceItems),
      createdAt,
      updatedAt: createdAt,
    };

    this.contentItemsState.update((current) => [contentItem, ...current]);
    this.syncNoteLinksForTarget(noteIds, 'content_item', contentItem.id, 'feeds_content', createdAt);
    return contentItem;
  }

  saveContentItem(item: KmapsContentItem): KmapsContentItem {
    const updatedAt = new Date().toISOString();
    const nextItem = {
      ...item,
      blocks: item.blocks
        .slice()
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((block, index) => ({ ...block, orderIndex: index + 1 })),
      updatedAt,
    };
    let exists = false;

    this.contentItemsState.update((current) =>
      current.map((entry) => {
        if (entry.id !== item.id) {
          return entry;
        }

        exists = true;
        return nextItem;
      }),
    );

    if (!exists) {
      this.contentItemsState.update((current) => [nextItem, ...current]);
    }

    this.syncNoteLinksForTarget(nextItem.noteIds, 'content_item', nextItem.id, 'feeds_content', updatedAt);
    return nextItem;
  }

  private getNote(noteId: string): KmapsNote | null {
    return this.notesState().find((note) => note.id === noteId) ?? null;
  }

  private resolveNotes(noteIds: string[]): KmapsNote[] {
    return noteIds
      .map((noteId) => this.getNote(noteId))
      .filter((note): note is KmapsNote => note != null);
  }

  private resolveUnitScopeIds(sourceId: string, sourceUnitId: string): Set<string> {
    const scopedIds = new Set<string>();
    const queue = [sourceUnitId];

    while (queue.length) {
      const currentId = queue.shift();
      if (!currentId || scopedIds.has(currentId)) {
        continue;
      }

      scopedIds.add(currentId);
      const childIds = this.unitsState()
        .filter((unit) => unit.sourceId === sourceId && unit.parentUnitId === currentId)
        .map((unit) => unit.id);
      queue.push(...childIds);
    }

    return scopedIds;
  }

  private addContextLinks(note: KmapsNote): void {
    const createdAt = note.createdAt;
    const links = [this.buildNoteLink(note.id, 'source', note.sourceId, 'references_source', createdAt)];

    if (note.sourceUnitId) {
      links.push(this.buildNoteLink(note.id, 'source_unit', note.sourceUnitId, 'references_unit', createdAt));
    }

    this.noteLinksState.update((current) => [...links, ...current]);
  }

  private buildNoteLink(
    noteId: string,
    targetType: KmapsNoteLink['targetType'],
    targetId: string,
    relation: KmapsLinkRelation,
    createdAt: string,
  ): KmapsNoteLink {
    return {
      id: createId('note-link'),
      canonicalInput: `wv_note_link|${noteId}|${targetType}|${targetId}`,
      noteId,
      targetType,
      targetId,
      relation,
      note: null,
      metaJson: null,
      createdAt,
      updatedAt: createdAt,
    };
  }

  private syncNoteLinksForTarget(
    noteIds: string[],
    targetType: KmapsNoteLink['targetType'],
    targetId: string,
    relation: KmapsLinkRelation,
    createdAt: string,
  ): void {
    const existing = new Set(
      this.noteLinksState()
        .filter((link) => link.targetType === targetType && link.targetId === targetId)
        .map((link) => link.noteId),
    );

    const additions = noteIds
      .filter((noteId) => !existing.has(noteId))
      .map((noteId) => this.buildNoteLink(noteId, targetType, targetId, relation, createdAt));

    if (!additions.length) {
      return;
    }

    this.noteLinksState.update((current) => [...additions, ...current]);
  }

  private bumpSourceTimestamp(sourceId: string, updatedAt: string): void {
    this.sourcesState.update((sources) =>
      sources.map((source) => (source.id === sourceId ? { ...source, updatedAt, lastOpenedAt: updatedAt } : source)),
    );
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareByEntityRecency(left: { updatedAt: string | null; createdAt: string }, right: { updatedAt: string | null; createdAt: string }): number {
  return compareIsoDesc(left.updatedAt ?? left.createdAt, right.updatedAt ?? right.createdAt);
}

function compareByDateDesc(left: { createdAt: string }, right: { createdAt: string }): number {
  return compareIsoDesc(left.createdAt, right.createdAt);
}

function compareIsoDesc(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

function formatDetailLabel(value: string): string {
  return formatTokenLabel(value.replace(/[:\s-]+/g, '_'));
}

function uniqueMetaItems(items: KmapsMetaItem[]): KmapsMetaItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.label}|${item.value}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createEmptyNoteKindCounts(): Record<KmapsNoteKind, number> {
  return {
    highlight: 0,
    quote: 0,
    summary: 0,
    reflection: 0,
    question: 0,
    claim_seed: 0,
    insight: 0,
    observation: 0,
    reference: 0,
    todo: 0,
    idea: 0,
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildClaimTitle(notes: KmapsNote[]): string {
  const firstTitle = notes.find((note) => note.title)?.title?.trim();
  if (firstTitle) {
    return firstTitle;
  }

  return 'New distilled claim';
}

function buildClaimText(notes: KmapsNote[]): string {
  const excerpt = notes
    .map((note) => note.excerptText || note.bodyMd)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  return excerpt || 'Draft a claim from the selected notes.';
}

function createDefaultBlocks(evidenceItems: KmapsEvidenceItem[]): KmapsContentBlock[] {
  const evidenceText = evidenceItems.length
    ? evidenceItems.map((item) => `${item.title}: ${item.body}`).join('\n\n')
    : 'Add source evidence here.';

  return [
    createBlock('intro', 1, 'Set the frame', 'State the problem, tension, or question that the piece is resolving.'),
    createBlock('main_point', 2, 'Main point', 'Draft the central claim or argument you want the audience to remember.'),
    createBlock('evidence', 3, 'Evidence', evidenceText),
    createBlock('reflection', 4, 'Reflection', 'Bridge the claim into application, critique, or reflection.'),
    createBlock('conclusion', 5, 'Conclusion', 'Close with the clearest synthesis or next-step insight.'),
  ];
}

function createBlock(kind: KmapsContentBlockKind, orderIndex: number, title: string, body: string): KmapsContentBlock {
  return {
    id: createId(`block-${kind}`),
    kind,
    title: title || formatContentBlockLabel(kind),
    body,
    orderIndex,
  };
}
