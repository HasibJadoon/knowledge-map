/**
 * CANONICAL CONTENT ↔ LIBRARY LINK
 * Purpose:
 * - Links any knowledge/content object to a library entry
 * - Supports Q&A / justification / extraction notes via link_qa_json
 * - Mirrors wv_content_library_links table exactly
 */

export interface ContentLibraryLink {
  entity_type: 'content_library_link';
  id: number;

  user_id: number | null;

  library_id: number;

  target_type: ContentLibraryTargetType;
  target_id: number;

  note: string | null;

  link_qa_json: ContentLibraryLinkQA | null;

  created_at: string;
  updated_at: string | null;
}

export type ContentLibraryTargetType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'content_item';

export interface ContentLibraryLinkQA {
  why_linked?: string;
  key_quotes?: LinkedQuote[];
  questions?: LinkedQuestion[];
  notes?: string;
}

export interface LinkedQuote {
  quote: string;
  locator: ContentLibraryLocator | null;
  note?: string;
}

export interface LinkedQuestion {
  question: string;
  answer_hint?: string;
  note?: string;
}

export type ContentLibraryLocatorType =
  | 'page'
  | 'section'
  | 'chapter'
  | 'timestamp'
  | 'verse'
  | 'line'
  | 'url'
  | 'other';

export interface ContentLibraryLocator {
  type: ContentLibraryLocatorType;
  value: string;
}

export class ContentLibraryLinkModel {
  constructor(public data: ContentLibraryLink) {}
}
