/**
 * CANONICAL LIBRARY ENTRY
 * Matches `library_entries` table.
 * - Lightweight table columns + structured JSON fields
 * - `entry_json` can store the full canonical payload (optional)
 */

export interface LibraryEntry {
  entity_type: 'library_entry';
  id: number;

  user_id: number | null;

  entry_type: LibraryEntryType;
  category: LibraryEntryCategory | null;

  title: string;
  title_ar: string | null;
  summary: string | null;

  url: string | null;

  language: LibraryLanguage | null;
  format: LibraryFormat | null;

  topics: string[] | null;
  qa: LibraryQAItem[] | null;

  entry_json: Record<string, unknown> | null;

  status: LibraryEntryStatus;

  created_at: string;
  updated_at: string | null;
}

export type LibraryEntryType =
  | 'author'
  | 'book'
  | 'chapter'
  | 'paper'
  | 'video'
  | 'podcast'
  | 'episode'
  | 'debate'
  | 'organization'
  | 'journal'
  | 'movement'
  | 'event';

export type LibraryEntryCategory =
  | 'quranic'
  | 'hadith'
  | 'theology'
  | 'biblical'
  | 'ancient'
  | 'history'
  | 'modern'
  | 'other';

export type LibraryLanguage = 'en' | 'ar' | 'ur' | 'mixed';

export type LibraryFormat = 'text' | 'pdf' | 'video' | 'audio' | 'web';

export type LibraryEntryStatus = 'active' | 'archived';

export interface LibraryQAItem {
  q: string;
  a: string;
}

export class LibraryEntryModel {
  constructor(public data: LibraryEntry) {}
}
