/**
 * CANONICAL ROOT
 * Matches `roots` table.
 * - Root-centric (triliteral/quadriliteral root node)
 * - Stores romanization variants + sources
 * - Cards JSON is Anki/SRS cards array (root-level)
 */

export interface Root {
  entity_type: 'root';
  id: number;

  user_id: number | null;

  root: string;
  meta?: Record<string, unknown> | null;

  root_latn: string | null;
  root_norm: string | null;

  alt_latn: string[] | null;

  romanization_sources: RomanizationSources | null;

  cards: RootAnkiCard[];

  status: RootStatus;

  difficulty: Difficulty | null;

  frequency: RootFrequency | null;

  created_at: string;
  updated_at: string | null;
  extracted_at: string | null;
}

export type RootStatus = 'active' | 'draft' | 'reviewed' | 'archived';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type RootFrequency = 'high' | 'medium' | 'low';

export interface RomanizationSources {
  lane?: string;
  key_terms?: string;
  hans_wehr?: string;
  other?: Record<string, string>;
}

export interface RootAnkiCard {
  card_id: string;
  card_type: RootCardType;
  front: string;
  back: string;
  tags: string[];
}

export type RootCardType =
  | 'root_overview'
  | 'root_family'
  | 'root_examples'
  | 'cloze';

export class RootModel {
  constructor(public data: Root) {}
}
