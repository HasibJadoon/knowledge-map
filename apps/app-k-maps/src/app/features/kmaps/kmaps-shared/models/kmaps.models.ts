export type KmapsEntityStatus = 'draft' | 'active' | 'archived';

export type KmapsSourceType =
  | 'book'
  | 'article'
  | 'lecture'
  | 'podcast'
  | 'video'
  | 'story'
  | 'paper'
  | 'conversation'
  | 'document'
  | 'other';

export type KmapsPersonType = 'person' | 'organization';

export type KmapsSourcePersonRole =
  | 'author'
  | 'co_author'
  | 'editor'
  | 'translator'
  | 'speaker'
  | 'host'
  | 'guest'
  | 'interviewer'
  | 'publisher'
  | 'organization'
  | 'narrator'
  | 'reviewer'
  | 'other';

export type KmapsUnitType =
  | 'chapter'
  | 'section'
  | 'heading'
  | 'scene'
  | 'timestamp'
  | 'topic'
  | 'passage'
  | 'segment'
  | 'other';

export type KmapsNoteKind =
  | 'highlight'
  | 'quote'
  | 'summary'
  | 'reflection'
  | 'question'
  | 'claim_seed'
  | 'insight'
  | 'observation'
  | 'reference'
  | 'todo'
  | 'idea';

export type KmapsLinkTargetType =
  | 'concept'
  | 'claim'
  | 'content_item'
  | 'quran_relation'
  | 'source'
  | 'source_unit'
  | 'note'
  | 'external'
  | 'other';

export type KmapsLinkRelation =
  | 'supports'
  | 'questions'
  | 'distills_to_concept'
  | 'supports_claim'
  | 'feeds_content'
  | 'references_source'
  | 'references_unit'
  | 'related_note'
  | 'about'
  | 'other';

export type KmapsConceptCategory =
  | 'epistemology'
  | 'morality'
  | 'law'
  | 'power'
  | 'narrative'
  | 'society'
  | 'theology'
  | 'history'
  | 'politics'
  | 'ethics'
  | 'ontology'
  | 'other';

export type KmapsClaimStatus = 'draft' | 'active' | 'published' | 'archived';

export type KmapsContentType = 'article' | 'podcast' | 'video' | 'newsletter' | 'script' | 'other';

export type KmapsContentStatus = 'draft' | 'active' | 'published' | 'archived';

export type KmapsContentBlockKind = 'intro' | 'main_point' | 'evidence' | 'reflection' | 'conclusion';

export interface KmapsSource {
  id: string;
  canonicalInput: string;
  userId: number | null;
  sourceType: KmapsSourceType;
  title: string;
  subtitle: string | null;
  creator: string | null;
  coverBlob?: string | null;
  coverMimeType?: string | null;
  publisher: string | null;
  publicationYear: number | null;
  language: string | null;
  sourceUrl: string | null;
  sourceRef: string | null;
  status: KmapsEntityStatus;
  description: string;
  progressPercent: number;
  lastOpenedAt: string;
  sourceJson: Record<string, unknown> | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsPerson {
  id: string;
  canonicalInput: string;
  displayName: string;
  sortName: string | null;
  personType: KmapsPersonType;
  bioShort: string | null;
  websiteUrl: string | null;
  avatarUrl?: string | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsSourcePerson {
  id: string;
  canonicalInput: string;
  sourceId: string;
  personId: string;
  role: KmapsSourcePersonRole;
  orderIndex: number;
  isPrimary: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsSourceDetail {
  id: string;
  canonicalInput: string;
  sourceId: string;
  detailKey: string;
  detailValue: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsSourceContributor {
  person: KmapsPerson;
  role: KmapsSourcePersonRole;
  orderIndex: number;
  isPrimary: boolean;
  note: string | null;
}

export interface KmapsSourceUnit {
  id: string;
  canonicalInput: string;
  sourceId: string;
  parentUnitId: string | null;
  unitType: KmapsUnitType;
  title: string;
  orderIndex: number;
  startRef: string | null;
  endRef: string | null;
  locatorLabel: string | null;
  anchorText: string | null;
  summary: string | null;
  readingMinutes: number;
  readingBody: string[];
  unitJson: Record<string, unknown> | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsNote {
  id: string;
  canonicalInput: string;
  userId: number | null;
  sourceId: string;
  sourceUnitId: string | null;
  noteKind: KmapsNoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
  locator: string | null;
  status: KmapsEntityStatus;
  noteJson: Record<string, unknown> | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsNoteLink {
  id: string;
  canonicalInput: string;
  noteId: string;
  targetType: KmapsLinkTargetType;
  targetId: string;
  relation: KmapsLinkRelation;
  note: string | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsConcept {
  id: string;
  canonicalInput: string;
  slug: string;
  label: string;
  summary: string;
  category: KmapsConceptCategory;
  status: KmapsEntityStatus;
  relatedConceptIds: string[];
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsClaim {
  id: string;
  canonicalInput: string;
  title: string;
  claimText: string;
  sourceId: string | null;
  sourceUnitId: string | null;
  noteIds: string[];
  conceptIds: string[];
  status: KmapsClaimStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsContentBlock {
  id: string;
  kind: KmapsContentBlockKind;
  title: string;
  body: string;
  orderIndex: number;
}

export interface KmapsContentItem {
  id: string;
  canonicalInput: string;
  title: string;
  contentType: KmapsContentType;
  status: KmapsContentStatus;
  noteIds: string[];
  claimIds: string[];
  conceptIds: string[];
  blocks: KmapsContentBlock[];
  createdAt: string;
  updatedAt: string | null;
}

export interface KmapsMetaItem {
  label: string;
  value: string;
}

export interface KmapsStatItem {
  label: string;
  value: string | number;
  emphasis?: boolean;
}

export interface KmapsActionItem {
  key: string;
  label: string;
  icon?: string;
  fill?: 'clear' | 'outline' | 'solid';
  disabled?: boolean;
}

export interface KmapsEvidenceItem {
  id: string;
  title: string;
  body: string;
  meta: string;
  noteKind?: KmapsNoteKind | null;
}

const TOKEN_LABEL_OVERRIDES: Record<string, string> = {
  claim_seed: 'Claim seed',
  main_point: 'Main point',
};

export function formatTokenLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (TOKEN_LABEL_OVERRIDES[normalized]) {
    return TOKEN_LABEL_OVERRIDES[normalized];
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatSourceTypeLabel(type: KmapsSourceType): string {
  return formatTokenLabel(type);
}

export function formatSourcePersonRoleLabel(role: KmapsSourcePersonRole): string {
  return formatTokenLabel(role);
}

export function formatUnitTypeLabel(type: KmapsUnitType): string {
  return formatTokenLabel(type);
}

export function formatNoteKindLabel(kind: KmapsNoteKind): string {
  return formatTokenLabel(kind);
}

export function formatContentBlockLabel(kind: KmapsContentBlockKind): string {
  return formatTokenLabel(kind);
}
