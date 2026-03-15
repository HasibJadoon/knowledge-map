import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  KmapsEntityStatus,
  KmapsNote,
  KmapsNoteKind,
  KmapsPerson,
  KmapsPersonType,
  KmapsSource,
  KmapsSourceDetail,
  KmapsSourcePerson,
  KmapsSourcePersonRole,
  KmapsSourceType,
  KmapsSourceUnit,
  KmapsUnitType,
} from '../../features/kmaps/kmaps-shared/models/kmaps.models';
import {
  WvDistillBatch,
  WvDistillBatchItem,
  WvInsightDecision,
  WvInsightSuggestion,
} from '../../features/kmaps/kmaps-shared/models/wv-workspace.models';

type WorkflowApiResponse = {
  ok?: boolean;
  error?: string;
  sources?: unknown[];
  highlights?: unknown[];
  units?: unknown[];
  people?: unknown[];
  source_people?: unknown[];
  source_details?: unknown[];
  notes?: unknown[];
};

export type WorldviewWorkflowSnapshot = {
  sources: KmapsSource[];
  units: KmapsSourceUnit[];
  people: KmapsPerson[];
  sourcePeople: KmapsSourcePerson[];
  sourceDetails: KmapsSourceDetail[];
  notes: KmapsNote[];
};

type SourceMutationApiResponse = {
  ok?: boolean;
  error?: string;
  source_id?: unknown;
  unit_ids?: unknown[];
};

type UnitMutationApiResponse = {
  ok?: boolean;
  error?: string;
  unit_id?: unknown;
};

type DistillBatchApiResponse = {
  ok?: boolean;
  error?: string;
  batch?: unknown;
  items?: unknown[];
  suggestions?: unknown[];
  decisions?: unknown[];
  draft_output?: unknown;
  prompt_version?: unknown;
  model?: unknown;
};

type DistillDecisionApiResponse = {
  ok?: boolean;
  error?: string;
  suggestion?: unknown;
  decision?: unknown;
};

export type WorldviewDistillBatchItemInput = {
  itemId: string;
  role: string | null;
};

export type WorldviewDistillBatchSnapshot = {
  batch: WvDistillBatch;
  items: WvDistillBatchItem[];
  suggestions: WvInsightSuggestion[];
  decisions: WvInsightDecision[];
  draftOutput: Record<string, unknown> | null;
  promptVersion: string | null;
  model: string | null;
};

export type WorldviewSourceInput = {
  sourceType: KmapsSourceType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  creator?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  language?: string | null;
  sourceUrl?: string | null;
  sourceRef?: string | null;
};

export type WorldviewSourceUnitDraftInput = {
  clientId: string;
  parentClientId?: string | null;
  unitType: KmapsUnitType;
  title: string;
  orderIndex?: number | null;
  startRef?: string | null;
  endRef?: string | null;
  anchorText?: string | null;
  summary?: string | null;
  readingBody?: string[];
  readingMinutes?: number | null;
  locatorLabel?: string | null;
};

export type WorldviewSourceUnitInput = {
  sourceId: string;
  parentUnitId?: string | null;
  unitType: KmapsUnitType;
  title: string;
  orderIndex?: number | null;
  startRef?: string | null;
  endRef?: string | null;
  anchorText?: string | null;
  summary?: string | null;
  readingBody?: string[];
  readingMinutes?: number | null;
  locatorLabel?: string | null;
};

export type CreateWorldviewSourceInput = {
  source: WorldviewSourceInput;
  units?: WorldviewSourceUnitDraftInput[];
};

export type UpdateWorldviewSourceInput = {
  sourceId: string;
  source: WorldviewSourceInput;
};

export type CreateWorldviewUnitInput = WorldviewSourceUnitInput;

export type UpdateWorldviewUnitInput = {
  unitId: string;
  unit: Omit<WorldviewSourceUnitInput, 'sourceId'> & { sourceId?: string };
};

export type WorldviewSourceMutationResult = {
  sourceId: string;
  unitIds: string[];
};

export type WorldviewUnitMutationResult = {
  unitId: string;
};

@Injectable({ providedIn: 'root' })
export class WorldviewApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot(environment.apiBase);
  private readonly baseUrl = `${this.apiRoot}/worldview`;

  fetchWorkflow(): Observable<WorldviewWorkflowSnapshot> {
    return this.http.get<WorkflowApiResponse>(`${this.baseUrl}/workflow`).pipe(
      map((response) => ({
        sources: asArray(response.sources).map(mapSource).filter((item): item is KmapsSource => item !== null),
        units: asArray(response.units).map(mapUnit).filter((item): item is KmapsSourceUnit => item !== null),
        people: asArray(response.people).map(mapPerson).filter((item): item is KmapsPerson => item !== null),
        sourcePeople: asArray(response.source_people)
          .map(mapSourcePerson)
          .filter((item): item is KmapsSourcePerson => item !== null),
        sourceDetails: asArray(response.source_details)
          .map(mapSourceDetail)
          .filter((item): item is KmapsSourceDetail => item !== null),
        notes: mergeNotes(
          asArray(response.notes).map(mapNote).filter((item): item is KmapsNote => item !== null),
          asArray(response.highlights).map(mapHighlight).filter((item): item is KmapsNote => item !== null),
        ),
      })),
    );
  }

  createSource(input: CreateWorldviewSourceInput): Observable<WorldviewSourceMutationResult> {
    return this.http.post<SourceMutationApiResponse>(`${this.baseUrl}/source`, input).pipe(map(mapSourceMutationResponse));
  }

  updateSource(input: UpdateWorldviewSourceInput): Observable<WorldviewSourceMutationResult> {
    return this.http.put<SourceMutationApiResponse>(`${this.baseUrl}/source`, input).pipe(map(mapSourceMutationResponse));
  }

  createUnit(input: CreateWorldviewUnitInput): Observable<WorldviewUnitMutationResult> {
    return this.http.post<UnitMutationApiResponse>(`${this.baseUrl}/unit`, input).pipe(map(mapUnitMutationResponse));
  }

  updateUnit(input: UpdateWorldviewUnitInput): Observable<WorldviewUnitMutationResult> {
    return this.http.put<UnitMutationApiResponse>(`${this.baseUrl}/unit`, input).pipe(map(mapUnitMutationResponse));
  }

  generateDistillBatch(input: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    items: WorldviewDistillBatchItemInput[];
    model?: string | null;
  }): Observable<WorldviewDistillBatchSnapshot> {
    return this.http.post<DistillBatchApiResponse>(`${this.baseUrl}/distill/generate`, input).pipe(map(mapDistillBatchSnapshot));
  }

  fetchDistillBatch(batchId: string): Observable<WorldviewDistillBatchSnapshot> {
    return this.http
      .get<DistillBatchApiResponse>(`${this.baseUrl}/distill/batch`, {
        params: { batchId },
      })
      .pipe(map(mapDistillBatchSnapshot));
  }

  saveDistillDecision(input: {
    suggestionId: string;
    decision: 'approve' | 'edit_and_save' | 'reject';
    title?: string | null;
    summary?: string | null;
    nodeType?: string | null;
    relationType?: string | null;
  }): Observable<{ suggestion: WvInsightSuggestion | null; decision: WvInsightDecision | null }> {
    return this.http
      .post<DistillDecisionApiResponse>(`${this.baseUrl}/distill/decision`, input)
      .pipe(
        map((response) => ({
          suggestion: mapDistillSuggestion(response.suggestion),
          decision: mapDistillDecision(response.decision),
        })),
      );
  }

  approveDistillBatch(batchId: string): Observable<WorldviewDistillBatchSnapshot> {
    return this.http.post<DistillBatchApiResponse>(`${this.baseUrl}/distill/approve`, { batchId }).pipe(map(mapDistillBatchSnapshot));
  }
}

function mapSourceMutationResponse(response: SourceMutationApiResponse): WorldviewSourceMutationResult {
  const sourceId = readTrimmed(response.source_id);
  if (!sourceId) {
    throw new Error(readTrimmed(response.error) ?? 'Failed to save worldview source.');
  }

  return {
    sourceId,
    unitIds: asArray(response.unit_ids).map(readTrimmed).filter((value): value is string => value != null),
  };
}

function mapUnitMutationResponse(response: UnitMutationApiResponse): WorldviewUnitMutationResult {
  const unitId = readTrimmed(response.unit_id);
  if (!unitId) {
    throw new Error(readTrimmed(response.error) ?? 'Failed to save worldview unit.');
  }

  return { unitId };
}

function mapDistillBatchSnapshot(response: DistillBatchApiResponse): WorldviewDistillBatchSnapshot {
  const batch = mapDistillBatch(response.batch);
  if (!batch) {
    throw new Error(readTrimmed(response.error) ?? 'Failed to load worldview distill batch.');
  }

  return {
    batch,
    items: asArray(response.items)
      .map((value) => mapDistillItem(value, batch.id))
      .filter((item): item is WvDistillBatchItem => item !== null),
    suggestions: asArray(response.suggestions)
      .map(mapDistillSuggestion)
      .filter((item): item is WvInsightSuggestion => item !== null),
    decisions: asArray(response.decisions)
      .map(mapDistillDecision)
      .filter((item): item is WvInsightDecision => item !== null),
    draftOutput: parseRecord(response.draft_output),
    promptVersion: readNullableString(response.prompt_version),
    model: readNullableString(response.model),
  };
}

function mapDistillBatch(value: unknown): WvDistillBatch | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const sourceId = readTrimmed(row?.['source_id']);
  const unitId = readTrimmed(row?.['source_unit_id']);
  if (!id || !sourceId || !unitId) {
    return null;
  }

  return {
    id,
    sourceId,
    unitId,
    batchType: 'distill',
    workspaceId: readTrimmed(row?.['workspace_id']) === 'ws_quran' ? 'ws_quran' : 'ws_worldview',
    status: mapDistillBatchStatus(row?.['status']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readTrimmed(row?.['updated_at']) ?? readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
  };
}

function mapDistillBatchStatus(value: unknown): WvDistillBatch['status'] {
  switch (value) {
    case 'approved':
      return 'completed';
    case 'ready':
    case 'running':
      return 'active';
    default:
      return 'draft';
  }
}

function mapDistillItem(value: unknown, batchId: string): WvDistillBatchItem | null {
  const row = asRecord(value);
  const noteId = readTrimmed(row?.['item_id']);
  if (!noteId) {
    return null;
  }

  return {
    id: `distill-item:${noteId}`,
    batchId,
    noteId,
    role: normalizeDistillRole(row?.['role']),
    selected: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapDistillSuggestion(value: unknown): WvInsightSuggestion | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const batchId = readTrimmed(row?.['batch_id']);
  const payload = parseRecord(row?.['payload_json']);
  const meta = parseRecord(row?.['meta_json']);
  if (!id || !batchId || !payload) {
    return null;
  }

  const kind = normalizeSuggestionKind(meta?.['kind'] ?? payload['node_type'] ?? payload['kind']);
  const title = readTrimmed(payload['title']);
  const summary = readTrimmed(payload['summary']);
  if (!kind || !title || !summary) {
    return null;
  }

  return {
    id,
    batchId,
    kind,
    title,
    summary,
    relationType: readNullableString(payload['relation_type'] ?? meta?.['relation_type']),
    sourceNoteIds: readStringArray(meta?.['source_item_ids']) ?? [],
    status: mapSuggestionStatus(row?.['status']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readTrimmed(row?.['updated_at']) ?? readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
  };
}

function mapDistillDecision(value: unknown): WvInsightDecision | null {
  const row = asRecord(value);
  const suggestionId = readTrimmed(row?.['suggestion_id']);
  const idValue = row?.['id'];
  if (!suggestionId || (typeof idValue !== 'number' && typeof idValue !== 'string')) {
    return null;
  }

  const edited = parseRecord(row?.['edited_payload_json']);
  const nodeType = normalizeSuggestionKind(edited?.['node_type']) ?? 'concept';

  return {
    id: String(idValue),
    suggestionId,
    status: mapDecisionStatus(row?.['decision']),
    title: readTrimmed(edited?.['title']) ?? '',
    summary: readTrimmed(edited?.['summary']) ?? '',
    nodeType,
    relationType: readNullableString(edited?.['relation_type'] ?? row?.['target_type']),
    graphTargetId: readNullableString(row?.['target_id']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readTrimmed(row?.['updated_at']) ?? readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
  };
}

function mapSource(value: unknown): KmapsSource | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceType = normalizeSourceType(row?.['source_type']);
  const title = readTrimmed(row?.['title']);
  if (!id || !canonicalInput || !sourceType || !title) {
    return null;
  }

  const sourceJson = parseRecord(row?.['source_json']);
  const metaJson = parseRecord(row?.['meta_json']);
  const progressPercent = readNumber(sourceJson?.['progressPercent'])
    ?? readNumber(sourceJson?.['progress_percent'])
    ?? 0;
  const updatedAt = readTrimmed(row?.['updated_at']);
  const createdAt = readTrimmed(row?.['created_at']) ?? new Date().toISOString();
  const lastOpenedAt = readTrimmed(sourceJson?.['lastOpenedAt'])
    ?? readTrimmed(sourceJson?.['last_opened_at'])
    ?? updatedAt
    ?? createdAt;

  return {
    id,
    canonicalInput,
    userId: readInteger(row?.['user_id']),
    sourceType,
    title,
    subtitle: readNullableString(row?.['subtitle']),
    creator: readNullableString(row?.['creator']),
    publisher: readNullableString(row?.['publisher']),
    publicationYear: readInteger(row?.['publication_year']),
    language: readNullableString(row?.['language']),
    sourceUrl: readNullableString(row?.['source_url']),
    sourceRef: readNullableString(row?.['source_ref']),
    status: normalizeEntityStatus(row?.['status']),
    description:
      readNullableString(row?.['description'])
      ?? readNullableString(sourceJson?.['summary'])
      ?? readNullableString(metaJson?.['description'])
      ?? '',
    progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
    lastOpenedAt,
    sourceJson,
    metaJson,
    createdAt,
    updatedAt,
  };
}

function mapUnit(value: unknown): KmapsSourceUnit | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceId = readTrimmed(row?.['source_id']);
  const unitType = normalizeUnitType(row?.['unit_type']);
  if (!id || !canonicalInput || !sourceId || !unitType) {
    return null;
  }

  const unitJson = parseRecord(row?.['unit_json']);
  const metaJson = parseRecord(row?.['meta_json']);
  const startRef = readNullableString(row?.['start_ref']);
  const endRef = readNullableString(row?.['end_ref']);
  const readingBody = readStringArray(unitJson?.['readingBody'])
    ?? readStringArray(unitJson?.['reading_body'])
    ?? [];
  const readingMinutes = readInteger(unitJson?.['readingMinutes'])
    ?? readInteger(unitJson?.['reading_minutes'])
    ?? estimateReadingMinutes(readingBody);
  const locatorLabel = readNullableString(unitJson?.['locatorLabel'])
    ?? readNullableString(unitJson?.['locator_label'])
    ?? readNullableString(metaJson?.['locatorLabel'])
    ?? composeLocatorLabel(startRef, endRef);

  return {
    id,
    canonicalInput,
    sourceId,
    parentUnitId: readNullableString(row?.['parent_unit_id']),
    unitType,
    title: readNullableString(row?.['title']) ?? locatorLabel ?? 'Untitled unit',
    orderIndex: readInteger(row?.['order_index']) ?? 0,
    startRef,
    endRef,
    locatorLabel,
    anchorText: readNullableString(row?.['anchor_text']),
    summary: readNullableString(row?.['summary']),
    readingMinutes,
    readingBody,
    unitJson,
    metaJson,
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function mapPerson(value: unknown): KmapsPerson | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const displayName = readTrimmed(row?.['display_name']);
  if (!id || !canonicalInput || !displayName) {
    return null;
  }

  const metaJson = parseRecord(row?.['meta_json']);

  return {
    id,
    canonicalInput,
    displayName,
    sortName: readNullableString(row?.['sort_name']),
    personType: normalizePersonType(row?.['person_type']),
    bioShort: readNullableString(row?.['bio_short']),
    websiteUrl: readNullableString(row?.['website_url']),
    avatarUrl: readNullableString(metaJson?.['avatarUrl']) ?? readNullableString(metaJson?.['avatar_url']),
    metaJson,
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function mapSourcePerson(value: unknown): KmapsSourcePerson | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceId = readTrimmed(row?.['source_id']);
  const personId = readTrimmed(row?.['person_id']);
  const role = normalizeSourcePersonRole(row?.['role']);
  if (!id || !canonicalInput || !sourceId || !personId || !role) {
    return null;
  }

  return {
    id,
    canonicalInput,
    sourceId,
    personId,
    role,
    orderIndex: readInteger(row?.['order_index']) ?? 0,
    isPrimary: readBooleanish(row?.['is_primary']),
    note: readNullableString(row?.['note']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function mapSourceDetail(value: unknown): KmapsSourceDetail | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceId = readTrimmed(row?.['source_id']);
  const detailKey = readTrimmed(row?.['detail_key']);
  if (!id || !canonicalInput || !sourceId || !detailKey) {
    return null;
  }

  return {
    id,
    canonicalInput,
    sourceId,
    detailKey,
    detailValue: readNullableString(row?.['detail_value']),
    orderIndex: readInteger(row?.['order_index']) ?? 0,
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function mapNote(value: unknown): KmapsNote | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceId = readTrimmed(row?.['source_id']);
  const noteKind = normalizeNoteKind(row?.['note_kind']);
  const bodyMd = readTrimmed(row?.['body_md']);
  if (!id || !canonicalInput || !sourceId || !noteKind || bodyMd === null) {
    return null;
  }

  return {
    id,
    canonicalInput,
    userId: readInteger(row?.['user_id']),
    sourceId,
    sourceUnitId: readNullableString(row?.['source_unit_id']),
    noteKind,
    title: readNullableString(row?.['title']),
    bodyMd,
    excerptText: readNullableString(row?.['excerpt_text']),
    locator: readNullableString(row?.['locator']),
    status: normalizeEntityStatus(row?.['status']),
    noteJson: parseRecord(row?.['note_json']),
    metaJson: parseRecord(row?.['meta_json']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function mapHighlight(value: unknown): KmapsNote | null {
  const row = asRecord(value);
  const id = readTrimmed(row?.['id']);
  const canonicalInput = readTrimmed(row?.['canonical_input']);
  const sourceId = readTrimmed(row?.['source_id']);
  const selectedText = readTrimmed(row?.['selected_text']);
  if (!id || !canonicalInput || !sourceId || selectedText === null) {
    return null;
  }

  return {
    id,
    canonicalInput,
    userId: readInteger(row?.['user_id']),
    sourceId,
    sourceUnitId: readNullableString(row?.['source_unit_id']),
    noteKind: 'highlight',
    title: 'Highlight',
    bodyMd: selectedText,
    excerptText: selectedText,
    locator: readNullableString(row?.['locator']),
    status: 'active',
    noteJson: compactRecord({
      anchorText: readNullableString(row?.['anchor_text']),
      sessionId: readNullableString(row?.['session_id']),
      startOffset: readInteger(row?.['start_offset']),
      endOffset: readInteger(row?.['end_offset']),
      color: readNullableString(row?.['color']),
    }),
    metaJson: parseRecord(row?.['meta_json']),
    createdAt: readTrimmed(row?.['created_at']) ?? new Date().toISOString(),
    updatedAt: readNullableString(row?.['updated_at']),
  };
}

function resolveApiRoot(apiBase: string): string {
  const normalized = apiBase.replace(/\/+$/, '');
  if (!normalized) {
    return '/api';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function compactRecord(value: Record<string, unknown>): Record<string, unknown> | null {
  const entries = Object.entries(value).filter(([, entry]) => entry != null);
  if (!entries.length) {
    return null;
  }

  return entries.reduce<Record<string, unknown>>((result, [key, entry]) => {
    result[key] = entry;
    return result;
  }, {});
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    return asRecord(parsed);
  }

  return asRecord(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function readNullableString(value: unknown): string | null {
  return readTrimmed(value);
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readBooleanish(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function mergeNotes(...groups: KmapsNote[][]): KmapsNote[] {
  const byId = new Map<string, KmapsNote>();

  for (const group of groups) {
    for (const note of group) {
      byId.set(note.id, note);
    }
  }

  return [...byId.values()].sort((left, right) => compareDatesDesc(left.updatedAt || left.createdAt, right.updatedAt || right.createdAt));
}

function compareDatesDesc(left: string | null | undefined, right: string | null | undefined): number {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function composeLocatorLabel(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef && startRef !== endRef) {
    return `${startRef} - ${endRef}`;
  }

  return startRef ?? endRef ?? null;
}

function estimateReadingMinutes(paragraphs: string[]): number {
  const words = paragraphs
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (!words) {
    return 0;
  }

  return Math.max(1, Math.round(words / 180));
}

function normalizeEntityStatus(value: unknown): KmapsEntityStatus {
  return value === 'draft' || value === 'archived' ? value : 'active';
}

function normalizeSourceType(value: unknown): KmapsSourceType | null {
  switch (value) {
    case 'book':
    case 'article':
    case 'lecture':
    case 'podcast':
    case 'video':
    case 'story':
    case 'paper':
    case 'conversation':
    case 'document':
    case 'other':
      return value;
    default:
      return null;
  }
}

function normalizeUnitType(value: unknown): KmapsUnitType | null {
  switch (value) {
    case 'chapter':
    case 'section':
    case 'heading':
    case 'scene':
    case 'timestamp':
    case 'topic':
    case 'passage':
    case 'segment':
    case 'other':
      return value;
    default:
      return null;
  }
}

function normalizePersonType(value: unknown): KmapsPersonType {
  return value === 'organization' ? 'organization' : 'person';
}

function normalizeSourcePersonRole(value: unknown): KmapsSourcePersonRole | null {
  switch (value) {
    case 'author':
    case 'co_author':
    case 'editor':
    case 'translator':
    case 'speaker':
    case 'host':
    case 'guest':
    case 'interviewer':
    case 'publisher':
    case 'organization':
    case 'narrator':
    case 'reviewer':
    case 'other':
      return value;
    default:
      return null;
  }
}

function normalizeNoteKind(value: unknown): KmapsNoteKind | null {
  switch (value) {
    case 'highlight':
    case 'quote':
    case 'summary':
    case 'reflection':
    case 'question':
    case 'claim_seed':
    case 'insight':
    case 'observation':
    case 'reference':
    case 'todo':
    case 'idea':
      return value;
    default:
      return null;
  }
}

function normalizeDistillRole(value: unknown): WvDistillBatchItem['role'] {
  switch (value) {
    case 'claim_seed':
    case 'observation':
    case 'question':
    case 'evidence':
      return value;
    default:
      return 'evidence';
  }
}

function normalizeSuggestionKind(value: unknown): WvInsightSuggestion['kind'] | null {
  switch (value) {
    case 'concept':
    case 'claim':
    case 'theme':
    case 'output':
    case 'edge':
      return value;
    default:
      return null;
  }
}

function mapSuggestionStatus(value: unknown): WvInsightSuggestion['status'] {
  switch (value) {
    case 'approved':
    case 'edited':
    case 'saved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return 'draft';
  }
}

function mapDecisionStatus(value: unknown): WvInsightDecision['status'] {
  switch (value) {
    case 'reject':
      return 'rejected';
    case 'edit_and_save':
      return 'edited';
    default:
      return 'approved';
  }
}
