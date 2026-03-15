import { PodcastEpisode } from '../../sprint/models/sprint.models';

export type CreatorEpisodeType = 'discussion' | 'solo' | 'lesson_log';
export type CreatorEpisodeStatus = 'draft' | 'script' | 'ready' | 'published' | 'completed';
export type CreatorSpeaker = 'host' | 'co_host' | 'guest' | 'both';
export type CreatorTalkingPointTone = 'hook' | 'core' | 'transition' | 'closing' | '';
export type CreatorLessonState = 'done' | 'needs_review' | 'assigned';

export interface CreatorDialogueItem {
  id: string;
  text: string;
  speaker: CreatorSpeaker;
  cue: string;
  order: number;
}

export interface CreatorTalkingPoint {
  id: string;
  text: string;
  tone: CreatorTalkingPointTone;
  durationMin?: number | null;
  userId?: number | null;
  order: number;
}

export interface CreatorChecklistItem {
  id: string;
  text: string;
  order: number;
}

export interface CreatorEpisodeSegment {
  id: string;
  episodeId: string;
  title: string;
  type: string;
  duration: number | null;
  summary: string;
  transitionNote: string;
  reference: string;
  primaryReference: string;
  secondaryReference: string;
  brainstormIdeas: string;
  sourceNote: string;
  notes: string;
  order: number;
  lessonState: CreatorLessonState;
  dialogueItems: CreatorDialogueItem[];
  talkingPoints: CreatorTalkingPoint[];
  doneItems: CreatorChecklistItem[];
  reviewItems: CreatorChecklistItem[];
}

export interface CreatorEpisodePublishState {
  videoTitle: string;
  description: string;
  tags: string;
  thumbnailNote: string;
  estimatedDuration: string;
  categoryOrPlaylist: string;
  publishStatus: string;
  hookLine: string;
  cta: string;
  endScreenNote: string;
}

export interface CreatorEpisodeOutputState {
  lessonSummary: string;
  exportNotes: string;
  reviewChecklist: string;
  nextSessionPrep: string;
}

export interface CreatorEpisodeSourceState {
  primaryReference: string;
  secondaryReference: string;
  brainstormIdeas: string;
  sourceNote: string;
}

export interface CreatorEpisodeWorldviewState {
  sourceId: string | null;
  sourceTitle: string;
  unitId: string | null;
  unitTitle: string;
  subunitId: string | null;
  subunitTitle: string;
  locatorLabel: string;
}

export interface CreatorEpisodeWorldviewView {
  source: string | null;
  unit: string | null;
  subunit: string | null;
  locator: string | null;
  pathLabel: string | null;
}

type EpisodeUnitLookup = (unitId: string) => { title: string; parentUnitId: string | null } | null;
type EpisodeSourceLookup = (sourceId: string) => { title: string } | null;

export interface CreatorEpisode {
  id: string;
  title: string;
  type: CreatorEpisodeType;
  status: CreatorEpisodeStatus;
  estimatedDuration: number | null;
  updatedAt: string;
  createdAt: string;
  relatedType: string | null;
  relatedId: string | null;
  source: CreatorEpisodeSourceState;
  worldview: CreatorEpisodeWorldviewState;
  publish: CreatorEpisodePublishState;
  output: CreatorEpisodeOutputState;
  segments: CreatorEpisodeSegment[];
  rawContent: Record<string, unknown>;
  rawRefs: Record<string, unknown>;
}

export const CREATOR_EPISODE_TYPES: ReadonlyArray<CreatorEpisodeType> = [
  'discussion',
  'solo',
  'lesson_log',
];

export const CREATOR_EPISODE_STATUSES: ReadonlyArray<CreatorEpisodeStatus> = [
  'draft',
  'script',
  'ready',
  'published',
  'completed',
];

export const CREATOR_SPEAKERS: ReadonlyArray<CreatorSpeaker> = [
  'host',
  'co_host',
  'guest',
  'both',
];

const CREATOR_TONES: ReadonlyArray<CreatorTalkingPointTone> = [
  '',
  'hook',
  'core',
  'transition',
  'closing',
];

export const CREATOR_LESSON_STATES: ReadonlyArray<CreatorLessonState> = [
  'done',
  'needs_review',
  'assigned',
];

export function isCreatorEpisodeType(value: unknown): value is CreatorEpisodeType {
  return value === 'discussion' || value === 'solo' || value === 'lesson_log';
}

export function isCreatorEpisodeStatus(value: unknown): value is CreatorEpisodeStatus {
  return value === 'draft'
    || value === 'script'
    || value === 'ready'
    || value === 'published'
    || value === 'completed';
}

export function isCreatorSpeaker(value: unknown): value is CreatorSpeaker {
  return value === 'host' || value === 'co_host' || value === 'guest' || value === 'both';
}

export function isCreatorLessonState(value: unknown): value is CreatorLessonState {
  return value === 'done' || value === 'needs_review' || value === 'assigned';
}

export function episodeTypeLabel(type: CreatorEpisodeType): string {
  if (type === 'lesson_log') {
    return 'Lesson Log';
  }

  return type === 'discussion' ? 'Discussion' : 'Solo';
}

export function episodeStatusLabel(status: CreatorEpisodeStatus): string {
  if (status === 'draft') return 'Draft';
  if (status === 'script') return 'Script';
  if (status === 'ready') return 'Ready';
  if (status === 'published') return 'Published';
  return 'Completed';
}

export function speakerLabel(speaker: CreatorSpeaker): string {
  if (speaker === 'co_host') {
    return 'Co-host';
  }

  if (speaker === 'both') {
    return 'Both';
  }

  return speaker === 'host' ? 'Host' : 'Guest';
}

export function lessonStateLabel(state: CreatorLessonState): string {
  if (state === 'needs_review') {
    return 'Needs Review';
  }

  return state === 'assigned' ? 'Assigned' : 'Done';
}

export function createBlankEpisode(args: {
  id: string;
  title: string;
  type: CreatorEpisodeType;
  createdAt?: string;
  updatedAt?: string;
  status?: CreatorEpisodeStatus;
  relatedType?: string | null;
  relatedId?: string | null;
  rawContent?: Record<string, unknown>;
  rawRefs?: Record<string, unknown>;
}): CreatorEpisode {
  const now = args.updatedAt ?? args.createdAt ?? new Date().toISOString();

  return {
    id: args.id,
    title: args.title,
    type: args.type,
    status: args.status ?? 'draft',
    estimatedDuration: null,
    updatedAt: args.updatedAt ?? now,
    createdAt: args.createdAt ?? now,
    relatedType: args.relatedType ?? null,
    relatedId: args.relatedId ?? null,
    source: {
      primaryReference: '',
      secondaryReference: '',
      brainstormIdeas: '',
      sourceNote: '',
    },
    worldview: {
      sourceId: null,
      sourceTitle: '',
      unitId: null,
      unitTitle: '',
      subunitId: null,
      subunitTitle: '',
      locatorLabel: '',
    },
    publish: {
      videoTitle: args.title,
      description: '',
      tags: '',
      thumbnailNote: '',
      estimatedDuration: '',
      categoryOrPlaylist: '',
      publishStatus: '',
      hookLine: '',
      cta: '',
      endScreenNote: '',
    },
    output: {
      lessonSummary: '',
      exportNotes: '',
      reviewChecklist: '',
      nextSessionPrep: '',
    },
    segments: defaultSegmentsForType(args.type, args.id),
    rawContent: { ...(args.rawContent ?? {}) },
    rawRefs: { ...(args.rawRefs ?? {}) },
  };
}

export function createSegment(episodeType: CreatorEpisodeType, episodeId: string, order: number, seedTitle?: string): CreatorEpisodeSegment {
  const title = seedTitle ?? defaultSegmentTitle(episodeType, order);
  return {
    id: buildId(),
    episodeId,
    title,
    type: title,
    duration: null,
    summary: '',
    transitionNote: '',
    reference: '',
    primaryReference: '',
    secondaryReference: '',
    brainstormIdeas: '',
    sourceNote: '',
    notes: '',
    order,
    lessonState: episodeType === 'lesson_log' ? 'done' : 'done',
    dialogueItems: episodeType === 'discussion'
      ? [createDialogueItem(0)]
      : [],
    talkingPoints: episodeType === 'solo'
      ? [createTalkingPoint(0)]
      : [],
    doneItems: episodeType === 'lesson_log'
      ? [createChecklistItem('What was covered', 0)]
      : [],
    reviewItems: episodeType === 'lesson_log'
      ? [createChecklistItem('What needs review', 0)]
      : [],
  };
}

export function createDialogueItem(order: number, text = ''): CreatorDialogueItem {
  return {
    id: buildId(),
    text,
    speaker: 'host',
    cue: '',
    order,
  };
}

export function createTalkingPoint(order: number, text = ''): CreatorTalkingPoint {
  return {
    id: buildId(),
    text,
    tone: '',
    durationMin: 1,
    userId: null,
    order,
  };
}

export function createChecklistItem(text: string, order: number): CreatorChecklistItem {
  return {
    id: buildId(),
    text,
    order,
  };
}

export function duplicateDialogueItem(item: CreatorDialogueItem, order: number): CreatorDialogueItem {
  return {
    ...item,
    id: buildId(),
    order,
  };
}

export function duplicateTalkingPoint(item: CreatorTalkingPoint, order: number): CreatorTalkingPoint {
  return {
    ...item,
    durationMin: item.durationMin ?? 1,
    userId: item.userId ?? null,
    id: buildId(),
    order,
  };
}

export function duplicateChecklistItem(item: CreatorChecklistItem, order: number): CreatorChecklistItem {
  return {
    ...item,
    id: buildId(),
    order,
  };
}

export function duplicateSegment(segment: CreatorEpisodeSegment, order: number): CreatorEpisodeSegment {
  return {
    ...segment,
    id: buildId(),
    order,
    dialogueItems: segment.dialogueItems.map((item, itemIndex) => duplicateDialogueItem(item, itemIndex)),
    talkingPoints: segment.talkingPoints.map((item, itemIndex) => duplicateTalkingPoint(item, itemIndex)),
    doneItems: segment.doneItems.map((item, itemIndex) => duplicateChecklistItem(item, itemIndex)),
    reviewItems: segment.reviewItems.map((item, itemIndex) => duplicateChecklistItem(item, itemIndex)),
  };
}

export function cloneEpisode(episode: CreatorEpisode): CreatorEpisode {
  return JSON.parse(JSON.stringify(episode)) as CreatorEpisode;
}

export function mapPodcastEpisodeToCreator(row: PodcastEpisode): CreatorEpisode {
  const content = asRecord(row.content_json);
  const refs = asRecord(row.refs_json);
  const builder = asRecord(content['builder']);
  const type = resolveEpisodeType(builder?.['type'], content['episode_type'], row.title);
  const worldview = readEpisodeWorldview(content, refs, row.related_type, row.related_id);
  const episode = createBlankEpisode({
    id: row.id,
    title: row.title,
    type,
    status: resolveEpisodeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    relatedType: row.related_type,
    relatedId: row.related_id,
    rawContent: content,
    rawRefs: refs,
  });

  episode.worldview = worldview;
  episode.estimatedDuration = toNumber(builder?.['estimatedDuration'])
    ?? toNumber(content['estimated_duration'])
    ?? estimateEpisodeDuration(readSegments(builder?.['segments'], type, row.id));
  episode.source = {
    primaryReference: toText(builder?.['source'] && asRecord(builder['source'])?.['primaryReference'])
      ?? toText(refs['primary_reference'])
      ?? resolveEpisodeWorldviewView(episode).pathLabel
      ?? toText(content['topic'])
      ?? '',
    secondaryReference: toText(builder?.['source'] && asRecord(builder['source'])?.['secondaryReference'])
      ?? toText(refs['secondary_reference'])
      ?? '',
    brainstormIdeas: toText(builder?.['source'] && asRecord(builder['source'])?.['brainstormIdeas'])
      ?? joinStringArray(refs['brainstorm_ids'])
      ?? '',
    sourceNote: toText(builder?.['source'] && asRecord(builder['source'])?.['sourceNote'])
      ?? toText(refs['source_note'])
      ?? '',
  };
  episode.publish = {
    videoTitle: toText(builder?.['publish'] && asRecord(builder['publish'])?.['videoTitle']) ?? row.title,
    description: toText(builder?.['publish'] && asRecord(builder['publish'])?.['description'])
      ?? toText(content['script'])
      ?? '',
    tags: toText(builder?.['publish'] && asRecord(builder['publish'])?.['tags']) ?? '',
    thumbnailNote: toText(builder?.['publish'] && asRecord(builder['publish'])?.['thumbnailNote']) ?? '',
    estimatedDuration: toText(builder?.['publish'] && asRecord(builder['publish'])?.['estimatedDuration']) ?? '',
    categoryOrPlaylist: toText(builder?.['publish'] && asRecord(builder['publish'])?.['categoryOrPlaylist']) ?? '',
    publishStatus: toText(builder?.['publish'] && asRecord(builder['publish'])?.['publishStatus']) ?? '',
    hookLine: toText(builder?.['publish'] && asRecord(builder['publish'])?.['hookLine']) ?? '',
    cta: toText(builder?.['publish'] && asRecord(builder['publish'])?.['cta']) ?? '',
    endScreenNote: toText(builder?.['publish'] && asRecord(builder['publish'])?.['endScreenNote']) ?? '',
  };
  episode.output = {
    lessonSummary: toText(builder?.['output'] && asRecord(builder['output'])?.['lessonSummary']) ?? '',
    exportNotes: toText(builder?.['output'] && asRecord(builder['output'])?.['exportNotes']) ?? '',
    reviewChecklist: toText(builder?.['output'] && asRecord(builder['output'])?.['reviewChecklist']) ?? '',
    nextSessionPrep: toText(builder?.['output'] && asRecord(builder['output'])?.['nextSessionPrep']) ?? '',
  };
  episode.segments = readSegments(builder?.['segments'], type, row.id);

  if (episode.segments.length === 0) {
    episode.segments = deriveLegacySegments(content, type, row.id);
  }

  if (episode.estimatedDuration === null) {
    episode.estimatedDuration = estimateEpisodeDuration(episode.segments);
  }

  if (type === 'lesson_log' && !episode.output.lessonSummary && episode.segments.length) {
    episode.output.lessonSummary = episode.segments
      .reduce<string[]>((items, segment) => {
        items.push(...segment.doneItems.map((item) => item.text));
        return items;
      }, [])
      .filter(Boolean)
      .join('\n');
  }

  return episode;
}

export function toPodcastSavePayload(episode: CreatorEpisode): {
  title: string;
  status: string;
  related_type: string | null;
  related_id: string | null;
  refs_json: Record<string, unknown>;
  content_json: Record<string, unknown>;
} {
  const refsJson = {
    ...episode.rawRefs,
    primary_reference: episode.source.primaryReference || null,
    secondary_reference: episode.source.secondaryReference || null,
    brainstorm_ids: splitCommaText(episode.source.brainstormIdeas),
    source_note: episode.source.sourceNote || null,
  };

  const contentJson = {
    ...episode.rawContent,
    schema_version: 1,
    episode_type: episode.type,
    estimated_duration: episode.estimatedDuration,
    builder: {
      type: episode.type,
      estimatedDuration: episode.estimatedDuration,
      source: {
        primaryReference: episode.source.primaryReference,
        secondaryReference: episode.source.secondaryReference,
        brainstormIdeas: episode.source.brainstormIdeas,
        sourceNote: episode.source.sourceNote,
      },
      publish: { ...episode.publish },
      output: { ...episode.output },
      segments: episode.segments
        .map((segment, index) => ({
          id: segment.id,
          title: segment.title,
          type: segment.type,
          duration: segment.duration,
          summary: segment.summary,
          transitionNote: segment.transitionNote,
          reference: segment.reference,
          primaryReference: segment.primaryReference,
          secondaryReference: segment.secondaryReference,
          brainstormIdeas: segment.brainstormIdeas,
          sourceNote: segment.sourceNote,
          notes: segment.notes,
          order: index,
          lessonState: segment.lessonState,
          dialogueItems: segment.dialogueItems.map((item, itemIndex) => ({
            id: item.id,
            text: item.text,
            speaker: item.speaker,
            cue: item.cue,
            order: itemIndex,
          })),
          talkingPoints: segment.talkingPoints.map((item, itemIndex) => ({
            id: item.id,
            text: item.text,
            tone: item.tone,
            durationMin: item.durationMin ?? 1,
            userId: item.userId ?? null,
            order: itemIndex,
          })),
          doneItems: segment.doneItems.map((item, itemIndex) => ({
            id: item.id,
            text: item.text,
            order: itemIndex,
          })),
          reviewItems: segment.reviewItems.map((item, itemIndex) => ({
            id: item.id,
            text: item.text,
            order: itemIndex,
          })),
        })),
    },
  };

  return {
    title: episode.title,
    status: episode.status,
    related_type: episode.relatedType,
    related_id: episode.relatedId,
    refs_json: refsJson,
    content_json: contentJson,
  };
}

export function resolveEpisodeWorldviewView(
  episode: CreatorEpisode,
  lookupSource?: EpisodeSourceLookup,
  lookupUnit?: EpisodeUnitLookup,
): CreatorEpisodeWorldviewView {
  const worldview = episode.worldview;
  const selectedUnitId = episode.relatedType === 'wv_source_unit'
    ? (episode.relatedId ?? worldview.subunitId ?? worldview.unitId)
    : (worldview.subunitId ?? worldview.unitId ?? episode.relatedId);
  const selectedUnit = selectedUnitId && lookupUnit ? lookupUnit(selectedUnitId) : null;
  const parentUnit = selectedUnit?.parentUnitId && lookupUnit ? lookupUnit(selectedUnit.parentUnitId) : null;

  const source = trimText(lookupSource && worldview.sourceId ? lookupSource(worldview.sourceId)?.title : null)
    ?? trimText(worldview.sourceTitle);

  let unit = trimText(worldview.unitTitle);
  let subunit = trimText(worldview.subunitTitle);

  if (selectedUnit && parentUnit) {
    unit = trimText(parentUnit.title) ?? unit;
    subunit = trimText(selectedUnit.title) ?? subunit;
  } else if (selectedUnit) {
    unit = trimText(selectedUnit.title) ?? unit;
  }

  if (unit && subunit && unit === subunit) {
    subunit = null;
  }

  const pathLabel = [source, unit, subunit].filter((value): value is string => Boolean(value)).join(' / ') || null;

  return {
    source,
    unit,
    subunit,
    locator: trimText(worldview.locatorLabel),
    pathLabel,
  };
}

function defaultSegmentsForType(type: CreatorEpisodeType, episodeId: string): CreatorEpisodeSegment[] {
  if (type === 'discussion') {
    return ['Intro', 'Main Discussion', 'Conclusion'].map((title, index) => createSegment(type, episodeId, index, title));
  }

  if (type === 'lesson_log') {
    return ['Passage Reading', 'Vocabulary', 'Discussion', 'Homework'].map((title, index) => {
      const segment = createSegment(type, episodeId, index, title);
      segment.lessonState = title === 'Homework' ? 'assigned' : 'done';
      return segment;
    });
  }

  return ['Intro', 'Main Point', 'Reflection', 'Conclusion'].map((title, index) => createSegment(type, episodeId, index, title));
}

function readEpisodeWorldview(
  content: Record<string, unknown>,
  refs: Record<string, unknown>,
  relatedType: string | null,
  relatedId: string | null,
): CreatorEpisodeWorldviewState {
  const worldview = asRecord(refs['worldview']) ?? asRecord(content['worldview']);
  const sourceId = toText(worldview?.['source_id']) ?? toText(refs['source_id']) ?? toText(content['source_id']) ?? null;
  const selectedUnitId = toText(worldview?.['selected_unit_id'])
    ?? toText(refs['source_unit_id'])
    ?? toText(content['source_unit_id'])
    ?? (relatedType === 'wv_source_unit' ? relatedId : null);

  let unitId = toText(worldview?.['unit_id']) ?? null;
  let subunitId = toText(worldview?.['subunit_id']) ?? null;

  if (!unitId && selectedUnitId) {
    unitId = selectedUnitId;
  }

  if (!subunitId && selectedUnitId && unitId && selectedUnitId !== unitId) {
    subunitId = selectedUnitId;
  }

  return {
    sourceId,
    sourceTitle: toText(worldview?.['source_title']) ?? '',
    unitId,
    unitTitle: toText(worldview?.['unit_title']) ?? '',
    subunitId,
    subunitTitle: toText(worldview?.['subunit_title']) ?? '',
    locatorLabel: toText(worldview?.['locator_label']) ?? toText(content['locator_label']) ?? '',
  };
}

function defaultSegmentTitle(type: CreatorEpisodeType, order: number): string {
  if (type === 'discussion') {
    return `Discussion ${order + 1}`;
  }

  if (type === 'lesson_log') {
    return `Section ${order + 1}`;
  }

  return `Segment ${order + 1}`;
}

function deriveLegacySegments(content: Record<string, unknown>, type: CreatorEpisodeType, episodeId: string): CreatorEpisodeSegment[] {
  const outlineItems = Array.isArray(content['outline']) ? content['outline'] : [];
  if (outlineItems.length === 0) {
    return defaultSegmentsForType(type, episodeId).map((segment, index) => withStableFallbackIds(segment, episodeId, index));
  }

  if (type === 'discussion') {
    const segment = createSegment(type, episodeId, 0, 'Outline');
    segment.id = buildStableId('seg', episodeId, 0, segment.title);
    segment.summary = toText(content['topic']) ?? '';
    segment.dialogueItems = outlineItems.map((item, index) => ({
      id: buildStableId('dlg', segment.id, index, toText(item) ?? `Prompt ${index + 1}`),
      text: toText(item) ?? `Prompt ${index + 1}`,
      speaker: index % 2 === 0 ? 'host' : 'co_host',
      cue: '',
      order: index,
    }));
    return [segment];
  }

  if (type === 'lesson_log') {
    const segment = createSegment(type, episodeId, 0, 'Lesson Notes');
    segment.id = buildStableId('seg', episodeId, 0, segment.title);
    segment.doneItems = outlineItems.map((item, index) => ({
      id: buildStableId('chk', segment.id, index, toText(item) ?? `Covered ${index + 1}`),
      text: toText(item) ?? `Covered ${index + 1}`,
      order: index,
    }));
    segment.reviewItems = [];
    return [segment];
  }

  const segment = createSegment(type, episodeId, 0, 'Outline');
  segment.id = buildStableId('seg', episodeId, 0, segment.title);
  segment.talkingPoints = outlineItems.map((item, index) => ({
    id: buildStableId('tp', segment.id, index, toText(item) ?? `Point ${index + 1}`),
    text: toText(item) ?? `Point ${index + 1}`,
    tone: '',
    durationMin: 1,
    userId: null,
    order: index,
  }));
  segment.summary = toText(content['topic']) ?? '';
  return [segment];
}

function readSegments(rawSegments: unknown, type: CreatorEpisodeType, episodeId: string): CreatorEpisodeSegment[] {
  if (!Array.isArray(rawSegments)) {
    return [];
  }

  return rawSegments
    .map((rawSegment, index) => mapSegment(rawSegment, type, episodeId, index))
    .filter((segment): segment is CreatorEpisodeSegment => Boolean(segment))
    .sort((left, right) => left.order - right.order);
}

function mapSegment(rawSegment: unknown, type: CreatorEpisodeType, episodeId: string, index: number): CreatorEpisodeSegment | null {
  const record = asRecord(rawSegment);
  if (!record) {
    return null;
  }

  const title = toText(record['title']) ?? defaultSegmentTitle(type, index);
  const order = toNumber(record['order']) ?? index;
  const segmentId = toText(record['id']) ?? buildStableId('seg', episodeId, order, title);

  return {
    id: segmentId,
    episodeId,
    title,
    type: toText(record['type']) ?? title,
    duration: toNumber(record['duration']),
    summary: toText(record['summary']) ?? '',
    transitionNote: toText(record['transitionNote']) ?? '',
    reference: toText(record['reference']) ?? '',
    primaryReference: toText(record['primaryReference']) ?? toText(record['reference']) ?? '',
    secondaryReference: toText(record['secondaryReference']) ?? '',
    brainstormIdeas: toText(record['brainstormIdeas']) ?? '',
    sourceNote: toText(record['sourceNote']) ?? '',
    notes: toText(record['notes']) ?? '',
    order,
    lessonState: resolveLessonState(record['lessonState']),
    dialogueItems: readDialogueItems(record['dialogueItems'], segmentId),
    talkingPoints: readTalkingPoints(record['talkingPoints'], segmentId),
    doneItems: readChecklistItems(record['doneItems'], segmentId),
    reviewItems: readChecklistItems(record['reviewItems'], segmentId),
  };
}

function readDialogueItems(value: unknown, segmentId: string): CreatorDialogueItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((rawItem, index): CreatorDialogueItem | null => {
      const record = asRecord(rawItem);
      if (!record) {
        return null;
      }

      return {
        id: toText(record['id']) ?? buildStableId('dlg', segmentId, index, toText(record['text']) ?? ''),
        text: toText(record['text']) ?? '',
        speaker: isCreatorSpeaker(record['speaker']) ? record['speaker'] : 'host',
        cue: toText(record['cue']) ?? '',
        order: toNumber(record['order']) ?? index,
      };
    })
    .filter((item): item is CreatorDialogueItem => Boolean(item))
    .sort((left, right) => left.order - right.order);
}

function readTalkingPoints(value: unknown, segmentId: string): CreatorTalkingPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((rawItem, index): CreatorTalkingPoint | null => {
      const record = asRecord(rawItem);
      if (!record) {
        return null;
      }

      const tone = toText(record['tone']);
      const durationMin = toInteger(record['durationMin'])
        ?? toInteger(record['duration'])
        ?? toInteger(record['minutes'])
        ?? toInteger(record['minute'])
        ?? 1;
      const userId = toInteger(record['userId'])
        ?? toInteger(record['user_id'])
        ?? toInteger(record['userID'])
        ?? toInteger(record['assignedUserId'])
        ?? toInteger(record['assigned_user_id'])
        ?? toInteger(record['assigneeId'])
        ?? toInteger(record['assignee_id'])
        ?? toInteger(record['ownerId'])
        ?? toInteger(record['owner_id']);
      return {
        id: toText(record['id']) ?? buildStableId('tp', segmentId, index, toText(record['text']) ?? ''),
        text: toText(record['text']) ?? '',
        tone: tone && CREATOR_TONES.includes(tone as CreatorTalkingPointTone)
          ? tone as CreatorTalkingPointTone
          : '',
        durationMin,
        userId,
        order: toNumber(record['order']) ?? index,
      };
    })
    .filter((item): item is CreatorTalkingPoint => Boolean(item))
    .sort((left, right) => left.order - right.order);
}

function readChecklistItems(value: unknown, segmentId: string): CreatorChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((rawItem, index) => {
      const record = asRecord(rawItem);
      if (!record) {
        return null;
      }

      return {
        id: toText(record['id']) ?? buildStableId('chk', segmentId, index, toText(record['text']) ?? ''),
        text: toText(record['text']) ?? '',
        order: toNumber(record['order']) ?? index,
      };
    })
    .filter((item): item is CreatorChecklistItem => Boolean(item))
    .sort((left, right) => left.order - right.order);
}

function resolveEpisodeType(...values: unknown[]): CreatorEpisodeType {
  for (const value of values) {
    if (isCreatorEpisodeType(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'lesson' || normalized === 'lesson log' || normalized === 'lesson_log') {
        return 'lesson_log';
      }
      if (normalized === 'discussion') {
        return 'discussion';
      }
      if (normalized === 'solo') {
        return 'solo';
      }
      if (normalized.includes('lesson')) {
        return 'lesson_log';
      }
    }
  }

  return 'solo';
}

function resolveEpisodeStatus(value: unknown): CreatorEpisodeStatus {
  return isCreatorEpisodeStatus(typeof value === 'string' ? value.trim().toLowerCase() : value)
    ? value as CreatorEpisodeStatus
    : 'draft';
}

function resolveLessonState(value: unknown): CreatorLessonState {
  if (isCreatorLessonState(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().toLowerCase() === 'needs review') {
    return 'needs_review';
  }

  return 'done';
}

function estimateEpisodeDuration(segments: CreatorEpisodeSegment[]): number | null {
  const total = segments.reduce((sum, segment) => sum + (segment.duration ?? 0), 0);
  return total > 0 ? total : null;
}

function splitCommaText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function joinStringArray(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((entry) => toText(entry))
    .filter((entry): entry is string => Boolean(entry));

  return items.length ? items.join(', ') : null;
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
}

function trimText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toInteger(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function withStableFallbackIds(segment: CreatorEpisodeSegment, episodeId: string, index: number): CreatorEpisodeSegment {
  const segmentId = buildStableId('seg', episodeId, index, segment.title);

  return {
    ...segment,
    id: segmentId,
    dialogueItems: segment.dialogueItems.map((item, itemIndex) => ({
      ...item,
      id: buildStableId('dlg', segmentId, itemIndex, item.text),
    })),
    talkingPoints: segment.talkingPoints.map((item, itemIndex) => ({
      ...item,
      durationMin: item.durationMin ?? 1,
      userId: item.userId ?? null,
      id: buildStableId('tp', segmentId, itemIndex, item.text),
    })),
    doneItems: segment.doneItems.map((item, itemIndex) => ({
      ...item,
      id: buildStableId('chk', segmentId, itemIndex, item.text),
    })),
    reviewItems: segment.reviewItems.map((item, itemIndex) => ({
      ...item,
      id: buildStableId('rvw', segmentId, itemIndex, item.text),
    })),
  };
}

function buildStableId(prefix: string, ...parts: Array<string | number>): string {
  const source = parts.map((part) => String(part)).join('|');
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function buildId(): string {
  return Math.random().toString(36).slice(2, 10);
}
