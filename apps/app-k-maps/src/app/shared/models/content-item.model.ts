/**
 * CANONICAL CONTENT ITEM
 * Matches `wv_content_items` table exactly.
 * Purpose: your publishing/production layer (podcast/youtube/article/slides/script/etc.)
 * Can be linked to any knowledge object via related_type + related_id.
 */

export interface ContentItem {
  entity_type: 'content_item';
  id: number;

  user_id: number | null;

  title: string;

  content_type: ContentType;
  status: ContentStatus;

  related_type: ContentRelatedType | null;
  related_id: string | null;

  refs_json: ContentRefs;
  content_json: ContentBody;

  created_at: string;
  updated_at: string | null;
}

export type ContentType =
  | 'podcast'
  | 'youtube'
  | 'article'
  | 'newsletter'
  | 'short'
  | 'slides'
  | 'script'
  | 'note'
  | 'other';

export type ContentStatus = 'draft' | 'active' | 'published' | 'archived';

export type ContentRelatedType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'concept'
  | 'library_entry'
  | 'brainstorm_session';

export interface ContentRefs {
  primary: ContentPrimaryRef | null;
  references: ContentRef[];
}

export interface ContentPrimaryRef {
  related_type: ContentRelatedType;
  related_id: string;
  label: string | null;
  citation: string | null;
}

export interface ContentRef {
  related_type: ContentRelatedType | 'external';
  related_id: string | null;
  label: string;
  locator: ContentLocator | null;
  citation: string | null;
  tags: string[];
}

export type ContentLocatorType =
  | 'timestamp'
  | 'page'
  | 'section'
  | 'chapter'
  | 'verse'
  | 'line'
  | 'url'
  | 'other';

export interface ContentLocator {
  type: ContentLocatorType;
  value: string;
}

export interface ContentBody {
  kind: ContentBodyKind;
  data: Record<string, unknown>;
}

export type ContentBodyKind =
  | 'outline'
  | 'script'
  | 'slides_plan'
  | 'shot_list'
  | 'asset_bundle'
  | 'render_plan'
  | 'notes'
  | 'mixed';

export class ContentItemModel {
  constructor(public data: ContentItem) {}
}
