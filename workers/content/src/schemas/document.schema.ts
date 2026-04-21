// ─── Document schemas & types ─────────────────────────────────────────────────
// Tables: cm_documents, cm_document_versions, cm_blocks, cm_block_refs,
//         cm_block_embeds, cm_resource_links.

export type CmPublicationState = 'draft' | 'review' | 'published' | 'archived';

export interface CmDocument {
  doc_id: string;             // CM:ULID
  core_user_ref: string;
  doc_type: string;
  title: string;
  title_ar: string | null;
  slug: string | null;
  language: string;
  word_count: number | null;
  reading_time_min: number | null;
  publication_state: CmPublicationState;
  policy_ref: string | null;
  workspace_ref: string | null;
  primary_source_ref: string | null;
  tags_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

export interface CmDocumentVersion {
  version_id: string;         // CM:ULID
  doc_id: string;
  version_number: number;
  version_label: string | null;
  snapshot_json: string;
  change_summary: string | null;
  core_user_ref: string;
  created_at: string;
}

export interface CmDocumentBlockRef {
  ref_id: string;
  block_id: string;
  target_ref: string;
  ref_type: string;
  anchor_text: string | null;
  note: string | null;
  seq_order: number;
  meta_json: string;
}

export interface CmDocumentBlockEmbed {
  embed_id: string;
  block_id: string;
  embed_type: string;
  target_ref: string | null;
  embed_config_json: string;
  caption: string | null;
  meta_json: string;
}

export interface CmDocumentBlock {
  block_id: string;           // CM:ULID
  doc_id: string;
  parent_block_id: string | null;
  block_type: string;
  seq_order: number;
  depth: number;
  content_text: string | null;
  content_ar: string | null;
  attrs_json: string;
  annotations_json: string;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

export interface CmDocumentBlockAggregate extends CmDocumentBlock {
  refs: CmDocumentBlockRef[];
  embeds: CmDocumentBlockEmbed[];
}

export interface CmDocumentResourceLink {
  link_id: string;
  source_ref: string;
  target_ref: string;
  link_type: string;
  anchor_text: string | null;
  note: string | null;
  core_user_ref: string | null;
  confidence: number;
  is_ai_suggested: number;
  meta_json: string;
  created_at: string;
}

export interface CmDocumentAggregate extends CmDocument {
  blocks?: CmDocumentBlockAggregate[];
  links?: {
    outgoing: CmDocumentResourceLink[];
    incoming: CmDocumentResourceLink[];
  };
  versions?: CmDocumentVersion[];
}

export interface CmDocumentBlockCreate {
  parent_block_id?: string | null;
  block_type?: string;
  seq_order?: number;
  depth?: number;
  content_text?: string | null;
  content_ar?: string | null;
  attrs_json?: string | Record<string, unknown>;
  annotations_json?: string | unknown[];
  meta_json?: string | Record<string, unknown>;
}

export interface CmDocumentBlockPatch {
  parent_block_id?: string | null;
  block_type?: string;
  seq_order?: number;
  depth?: number;
  content_text?: string | null;
  content_ar?: string | null;
  attrs_json?: string | Record<string, unknown>;
  annotations_json?: string | unknown[];
  meta_json?: string | Record<string, unknown>;
}

export interface CmDocumentCreate {
  core_user_ref: string;
  title: string;
  doc_type?: string;
  title_ar?: string | null;
  slug?: string | null;
  language?: string;
  word_count?: number | null;
  reading_time_min?: number | null;
  publication_state?: CmPublicationState;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  primary_source_ref?: string | null;
  tags_json?: string;
  meta_json?: string;
  blocks?: CmDocumentBlockCreate[];
}

export interface CmDocumentPatch {
  title?: string;
  doc_type?: string;
  title_ar?: string | null;
  slug?: string | null;
  language?: string;
  word_count?: number | null;
  reading_time_min?: number | null;
  publication_state?: CmPublicationState;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  primary_source_ref?: string | null;
  tags_json?: string;
  meta_json?: string;
  blocks?: CmDocumentBlockCreate[];
}

export interface CmDocumentVersionCreate {
  version_label?: string | null;
  change_summary?: string | null;
  core_user_ref?: string | null;
}

export interface CmDocumentBlockRefCreate {
  target_ref: string;
  ref_type?: string;
  anchor_text?: string | null;
  note?: string | null;
  seq_order?: number;
  meta_json?: string;
}

export interface CmDocumentBlockEmbedCreate {
  embed_type?: string;
  target_ref?: string | null;
  embed_config_json?: string;
  caption?: string | null;
  meta_json?: string;
}

export interface CmDocumentLinkCreate {
  target_ref: string;
  link_type?: string;
  anchor_text?: string | null;
  note?: string | null;
  core_user_ref?: string | null;
  confidence?: number;
  is_ai_suggested?: number;
  meta_json?: string;
}

type SchemaValidationResult<T> = { data: T } | { error: string };

const PUBLICATION_STATES: CmPublicationState[] = ['draft', 'review', 'published', 'archived'];

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

function isValidationError(value: unknown): value is { error: string } {
  return isRecord(value) && typeof value.error === 'string';
}

function hasKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readRequiredString(body: Record<string, unknown>, key: string): string | { error: string } {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `${key} is required and must be a non-empty string` };
  }
  return value.trim();
}

function readOptionalString(
  body: Record<string, unknown>,
  key: string,
  nullable = true,
): string | null | undefined | { error: string } {
  if (!hasKey(body, key)) return undefined;
  const value = body[key];
  if (value === null && nullable) return null;
  if (typeof value !== 'string') return { error: `${key} must be a string${nullable ? ' or null' : ''}` };
  return value.trim();
}

function readOptionalNumber(
  body: Record<string, unknown>,
  key: string,
  nullable = true,
): number | null | undefined | { error: string } {
  if (!hasKey(body, key)) return undefined;
  const value = body[key];
  if (value === null && nullable) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return { error: `${key} must be a finite number${nullable ? ' or null' : ''}` };
  return value;
}

function readJsonField(
  body: Record<string, unknown>,
  key: string,
  fallback: '[]' | '{}',
): string | undefined | { error: string } {
  if (!hasKey(body, key)) return undefined;
  const value = body[key];
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return { error: `${key} must be valid JSON` };
    }
  }
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  if (value === undefined) return undefined;
  return { error: `${key} must be valid JSON as a string or structured value` };
}

function assignIfPresent<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

function validateBlockPayload(body: unknown, requireAny = false): SchemaValidationResult<CmDocumentBlockCreate> {
  if (!isRecord(body)) return { error: 'Block body must be an object' };
  const data: CmDocumentBlockCreate = {};

  const parentBlockId = readOptionalString(body, 'parent_block_id');
  if (isValidationError(parentBlockId)) return parentBlockId;
  assignIfPresent(data, 'parent_block_id', parentBlockId);

  const blockType = readOptionalString(body, 'block_type', false);
  if (isValidationError(blockType)) return blockType;
  if (blockType !== undefined && !blockType) return { error: 'block_type must be non-empty when provided' };
  assignIfPresent(data, 'block_type', blockType);

  const seqOrder = readOptionalNumber(body, 'seq_order', false);
  if (isValidationError(seqOrder)) return seqOrder;
  if (seqOrder !== null) assignIfPresent(data, 'seq_order', seqOrder);

  const depth = readOptionalNumber(body, 'depth', false);
  if (isValidationError(depth)) return depth;
  if (depth !== null) assignIfPresent(data, 'depth', depth);

  const contentText = readOptionalString(body, 'content_text');
  if (isValidationError(contentText)) return contentText;
  assignIfPresent(data, 'content_text', contentText);

  const contentAr = readOptionalString(body, 'content_ar');
  if (isValidationError(contentAr)) return contentAr;
  assignIfPresent(data, 'content_ar', contentAr);

  const attrsJson = readJsonField(body, 'attrs_json', '{}');
  if (isValidationError(attrsJson)) return attrsJson;
  assignIfPresent(data, 'attrs_json', attrsJson);

  const annotationsJson = readJsonField(body, 'annotations_json', '[]');
  if (isValidationError(annotationsJson)) return annotationsJson;
  assignIfPresent(data, 'annotations_json', annotationsJson);

  const metaJson = readJsonField(body, 'meta_json', '{}');
  if (isValidationError(metaJson)) return metaJson;
  assignIfPresent(data, 'meta_json', metaJson);

  if (requireAny && Object.keys(data).length === 0) return { error: 'At least one block field is required' };
  return { data };
}

function readBlocks(body: Record<string, unknown>): CmDocumentBlockCreate[] | undefined | { error: string } {
  if (!hasKey(body, 'blocks')) return undefined;
  const blocks = body.blocks;
  if (!Array.isArray(blocks)) return { error: 'blocks must be an array' };
  const data: CmDocumentBlockCreate[] = [];
  for (const block of blocks) {
    const result = validateBlockPayload(block);
    if ('error' in result) return result;
    data.push(result.data);
  }
  return data;
}

function validateDocumentPayload(
  body: unknown,
  options: { requireCoreUserRef: boolean; requireTitle: boolean; requireAny: boolean },
): SchemaValidationResult<CmDocumentCreate | CmDocumentPatch> {
  if (!isRecord(body)) return { error: 'Body must be an object' };
  const data: CmDocumentCreate | CmDocumentPatch = {};

  if (options.requireCoreUserRef) {
    const coreUserRef = readRequiredString(body, 'core_user_ref');
    if (isValidationError(coreUserRef)) return coreUserRef;
    (data as CmDocumentCreate).core_user_ref = coreUserRef;
  }

  if (options.requireTitle) {
    const title = readRequiredString(body, 'title');
    if (isValidationError(title)) return title;
    data.title = title;
  } else {
    const title = readOptionalString(body, 'title', false);
    if (isValidationError(title)) return title;
    if (title !== undefined && !title) return { error: 'title must be non-empty when provided' };
    assignIfPresent(data, 'title', title);
  }

  const docType = readOptionalString(body, 'doc_type', false);
  if (isValidationError(docType)) return docType;
  if (docType !== undefined && !docType) return { error: 'doc_type must be non-empty when provided' };
  assignIfPresent(data, 'doc_type', docType);

  const titleAr = readOptionalString(body, 'title_ar');
  if (isValidationError(titleAr)) return titleAr;
  assignIfPresent(data, 'title_ar', titleAr);

  const slug = readOptionalString(body, 'slug');
  if (isValidationError(slug)) return slug;
  assignIfPresent(data, 'slug', slug);

  const language = readOptionalString(body, 'language', false);
  if (isValidationError(language)) return language;
  if (language !== undefined && !language) return { error: 'language must be non-empty when provided' };
  assignIfPresent(data, 'language', language);

  const wordCount = readOptionalNumber(body, 'word_count');
  if (isValidationError(wordCount)) return wordCount;
  assignIfPresent(data, 'word_count', wordCount);

  const readingTimeMin = readOptionalNumber(body, 'reading_time_min');
  if (isValidationError(readingTimeMin)) return readingTimeMin;
  assignIfPresent(data, 'reading_time_min', readingTimeMin);

  const publicationState = readOptionalString(body, 'publication_state', false);
  if (isValidationError(publicationState)) return publicationState;
  if (publicationState !== undefined) {
    if (!PUBLICATION_STATES.includes(publicationState as CmPublicationState)) {
      return { error: `publication_state must be one of: ${PUBLICATION_STATES.join(', ')}` };
    }
    data.publication_state = publicationState as CmPublicationState;
  }

  const policyRef = readOptionalString(body, 'policy_ref');
  if (isValidationError(policyRef)) return policyRef;
  assignIfPresent(data, 'policy_ref', policyRef);

  const workspaceRef = readOptionalString(body, 'workspace_ref');
  if (isValidationError(workspaceRef)) return workspaceRef;
  assignIfPresent(data, 'workspace_ref', workspaceRef);

  const primarySourceRef = readOptionalString(body, 'primary_source_ref');
  if (isValidationError(primarySourceRef)) return primarySourceRef;
  assignIfPresent(data, 'primary_source_ref', primarySourceRef);

  const tagsJson = readJsonField(body, 'tags_json', '[]');
  if (isValidationError(tagsJson)) return tagsJson;
  assignIfPresent(data, 'tags_json', tagsJson);

  const metaJson = readJsonField(body, 'meta_json', '{}');
  if (isValidationError(metaJson)) return metaJson;
  assignIfPresent(data, 'meta_json', metaJson);

  const blocks = readBlocks(body);
  if (isValidationError(blocks)) return blocks;
  assignIfPresent(data, 'blocks', blocks);

  if (options.requireAny && Object.keys(data).length === 0) {
    return { error: 'At least one field is required' };
  }
  return { data };
}

export function validateCmDocumentCreate(body: unknown): SchemaValidationResult<CmDocumentCreate> {
  const result = validateDocumentPayload(body, {
    requireCoreUserRef: true,
    requireTitle: true,
    requireAny: false,
  });
  return 'error' in result ? result : { data: result.data as CmDocumentCreate };
}

export function validateCmDocumentPatch(body: unknown): SchemaValidationResult<CmDocumentPatch> {
  const result = validateDocumentPayload(body, {
    requireCoreUserRef: false,
    requireTitle: false,
    requireAny: true,
  });
  return 'error' in result ? result : { data: result.data as CmDocumentPatch };
}

export function validateCmDocumentReplace(body: unknown): SchemaValidationResult<CmDocumentPatch> {
  const result = validateDocumentPayload(body, {
    requireCoreUserRef: false,
    requireTitle: true,
    requireAny: false,
  });
  return 'error' in result ? result : { data: result.data as CmDocumentPatch };
}

export function validateCmDocumentBlockCreate(body: unknown): SchemaValidationResult<CmDocumentBlockCreate> {
  return validateBlockPayload(body);
}

export function validateCmDocumentBlockPatch(body: unknown): SchemaValidationResult<CmDocumentBlockPatch> {
  const result = validateBlockPayload(body, true);
  return 'error' in result ? result : { data: result.data as CmDocumentBlockPatch };
}

export function validateCmDocumentVersionCreate(body: unknown): SchemaValidationResult<CmDocumentVersionCreate> {
  if (!isRecord(body)) return { error: 'Body must be an object' };
  const data: CmDocumentVersionCreate = {};

  const versionLabel = readOptionalString(body, 'version_label');
  if (isValidationError(versionLabel)) return versionLabel;
  assignIfPresent(data, 'version_label', versionLabel);

  const changeSummary = readOptionalString(body, 'change_summary');
  if (isValidationError(changeSummary)) return changeSummary;
  assignIfPresent(data, 'change_summary', changeSummary);

  const coreUserRef = readOptionalString(body, 'core_user_ref');
  if (isValidationError(coreUserRef)) return coreUserRef;
  assignIfPresent(data, 'core_user_ref', coreUserRef);

  return { data };
}

export function validateCmDocumentBlockRefCreate(body: unknown): SchemaValidationResult<CmDocumentBlockRefCreate> {
  if (!isRecord(body)) return { error: 'Body must be an object' };
  const data: CmDocumentBlockRefCreate = {
    target_ref: '',
  };

  const targetRef = readRequiredString(body, 'target_ref');
  if (isValidationError(targetRef)) return targetRef;
  data.target_ref = targetRef;

  const refType = readOptionalString(body, 'ref_type', false);
  if (isValidationError(refType)) return refType;
  data.ref_type = refType ?? 'link';

  const anchorText = readOptionalString(body, 'anchor_text');
  if (isValidationError(anchorText)) return anchorText;
  assignIfPresent(data, 'anchor_text', anchorText);

  const note = readOptionalString(body, 'note');
  if (isValidationError(note)) return note;
  assignIfPresent(data, 'note', note);

  const seqOrder = readOptionalNumber(body, 'seq_order', false);
  if (isValidationError(seqOrder)) return seqOrder;
  if (seqOrder !== null) assignIfPresent(data, 'seq_order', seqOrder);

  const metaJson = readJsonField(body, 'meta_json', '{}');
  if (isValidationError(metaJson)) return metaJson;
  assignIfPresent(data, 'meta_json', metaJson);

  return { data };
}

export function validateCmDocumentBlockEmbedCreate(body: unknown): SchemaValidationResult<CmDocumentBlockEmbedCreate> {
  if (!isRecord(body)) return { error: 'Body must be an object' };
  const data: CmDocumentBlockEmbedCreate = {};

  const embedType = readOptionalString(body, 'embed_type', false);
  if (isValidationError(embedType)) return embedType;
  data.embed_type = embedType ?? 'media';

  const targetRef = readOptionalString(body, 'target_ref');
  if (isValidationError(targetRef)) return targetRef;
  assignIfPresent(data, 'target_ref', targetRef);

  const embedConfigJson = readJsonField(body, 'embed_config_json', '{}');
  if (isValidationError(embedConfigJson)) return embedConfigJson;
  assignIfPresent(data, 'embed_config_json', embedConfigJson);

  const caption = readOptionalString(body, 'caption');
  if (isValidationError(caption)) return caption;
  assignIfPresent(data, 'caption', caption);

  const metaJson = readJsonField(body, 'meta_json', '{}');
  if (isValidationError(metaJson)) return metaJson;
  assignIfPresent(data, 'meta_json', metaJson);

  return { data };
}

export function validateCmDocumentLinkCreate(body: unknown): SchemaValidationResult<CmDocumentLinkCreate> {
  if (!isRecord(body)) return { error: 'Body must be an object' };
  const data: CmDocumentLinkCreate = {
    target_ref: '',
  };

  const targetRef = readRequiredString(body, 'target_ref');
  if (isValidationError(targetRef)) return targetRef;
  data.target_ref = targetRef;

  const linkType = readOptionalString(body, 'link_type', false);
  if (isValidationError(linkType)) return linkType;
  data.link_type = linkType ?? 'references';

  const anchorText = readOptionalString(body, 'anchor_text');
  if (isValidationError(anchorText)) return anchorText;
  assignIfPresent(data, 'anchor_text', anchorText);

  const note = readOptionalString(body, 'note');
  if (isValidationError(note)) return note;
  assignIfPresent(data, 'note', note);

  const coreUserRef = readOptionalString(body, 'core_user_ref');
  if (isValidationError(coreUserRef)) return coreUserRef;
  assignIfPresent(data, 'core_user_ref', coreUserRef);

  const confidence = readOptionalNumber(body, 'confidence', false);
  if (isValidationError(confidence)) return confidence;
  if (confidence !== undefined && confidence !== null && (confidence < 0 || confidence > 1)) {
    return { error: 'confidence must be between 0 and 1' };
  }
  if (confidence !== null) assignIfPresent(data, 'confidence', confidence);

  if (hasKey(body, 'is_ai_suggested')) {
    const value = body.is_ai_suggested;
    if (typeof value === 'boolean') data.is_ai_suggested = value ? 1 : 0;
    else if (value === 0 || value === 1) data.is_ai_suggested = value;
    else return { error: 'is_ai_suggested must be a boolean or 0/1' };
  }

  const metaJson = readJsonField(body, 'meta_json', '{}');
  if (isValidationError(metaJson)) return metaJson;
  assignIfPresent(data, 'meta_json', metaJson);

  return { data };
}
