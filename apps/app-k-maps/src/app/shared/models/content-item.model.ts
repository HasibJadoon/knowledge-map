/**
 * CANONICAL CONTENT ITEM
 * Matches `wv_content_items` table exactly.
 * Purpose: your publishing/production layer (podcast/youtube/article/slides/script/etc.)
 * Can be linked to any knowledge object via related_type + related_id.
 */

export interface ContentItem {
  entity_type: 'content_item';
  id: string;

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
  | 'podcast_episode'
  | 'youtube_episode'
  | 'article'
  | 'newsletter'
  | 'short'
  | 'slides'
  | 'script'
  | 'study_note'
  | 'note'
  | 'other';

export type ContentStatus = 'draft' | 'active' | 'published' | 'archived';

export type ContentRelatedType =
  | 'ar_lesson'
  | 'wv_claim'
  | 'concept'
  | 'library_entry'
  | 'brainstorm_session'
  | 'wv_source_unit'
  | 'wv_distill_batch'
  | 'sp_weekly_tasks'
  | 'sp_weekly_plans';

export type ContentRefs = Record<string, unknown>;

export type ContentBody = Record<string, unknown>;

export class ContentItemModel {
  constructor(public data: ContentItem) {}
}
