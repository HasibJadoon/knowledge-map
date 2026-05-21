// ─── SRS models — mirror workers/arabic/src/routes/srs.ts ─────────────────────

export type SrsDeckType =
  | 'vocabulary' | 'morphology' | 'translation' | 'theology' | 'topic' | 'idiom'
  | 'poetry' | 'literature' | 'quote' | 'concept' | 'hadith' | 'fiqh'
  | 'brainstorm' | 'mixed';

export type SrsCardTemplate =
  | 'qr_vocab' | 'qr_morph' | 'qr_translation' | 'qr_theology' | 'qr_topic' | 'qr_idiom'
  | 'ar_poetry' | 'ar_literature' | 'wv_quote' | 'wv_concept' | 'hd_hadith' | 'hd_fiqh'
  | 'freeform';

export type SrsCardState = 'new' | 'learning' | 'review' | 'relearning';

/** 1 Again · 2 Hard · 3 Good · 4 Easy */
export type SrsRating = 1 | 2 | 3 | 4;

export interface SrsDeck {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  title: string;
  deck_type: SrsDeckType;
  description: string | null;
  card_count: number;
  is_shared: number;
  meta_json: string | null;
  created_at: string;
}

export interface SrsDeckSummary extends SrsDeck {
  due_count: number;
  new_count: number;
}

export interface SrsCard {
  id: string;
  deck_id: string;
  resource_ref: string | null;
  resource_type: string;
  card_template: SrsCardTemplate;
  front_text: string;
  back_text: string;
  extra: unknown;
  tags: string[];
  suspended: boolean;
  card_state: SrsCardState;
  reps: number;
  lapses: number;
  difficulty: number;
  scheduled_days: number;
  due_at: string | null;
  last_review_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A review-queue card carries the interval each rating would schedule. */
export interface SrsReviewCard extends SrsCard {
  preview: Record<SrsRating, number>;
}

export interface SrsStats {
  decks: number;
  cards: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  suspended: number;
}

export interface SrsDeckCreatePayload {
  title: string;
  deck_type?: SrsDeckType;
  description?: string | null;
}

export interface SrsDeckPatchPayload {
  title?: string;
  deck_type?: SrsDeckType;
  description?: string | null;
}

export interface SrsCardCreatePayload {
  deck_id: string;
  front_text: string;
  back_text: string;
  card_template?: SrsCardTemplate;
  resource_ref?: string | null;
  resource_type?: string;
  tags?: string[];
  extra?: unknown;
}

export interface SrsCardPatchPayload {
  front_text?: string;
  back_text?: string;
  tags?: string[];
  extra?: unknown;
  suspended?: boolean;
}

export const SRS_DECK_TYPE_LABELS: Readonly<Record<SrsDeckType, string>> = {
  vocabulary: 'Vocabulary',
  morphology: 'Morphology',
  translation: 'Translation',
  theology: 'Theology',
  topic: 'Topic',
  idiom: 'Idiom',
  poetry: 'Poetry',
  literature: 'Literature',
  quote: 'Quote',
  concept: 'Concept',
  hadith: 'Hadith',
  fiqh: 'Fiqh',
  brainstorm: 'Brainstorm',
  mixed: 'Mixed',
};

/** Accent colour per deck type — drives the dashboard card glow. */
export const SRS_DECK_TYPE_COLORS: Readonly<Record<SrsDeckType, string>> = {
  vocabulary: '#c9a84c',
  morphology: '#e8c96a',
  translation: '#6bbaff',
  theology: '#a78bfa',
  topic: '#4dd9a8',
  idiom: '#ff9f6b',
  poetry: '#f0709a',
  literature: '#f5b342',
  quote: '#8fc1ec',
  concept: '#c084f5',
  hadith: '#5ea86e',
  fiqh: '#56b3a6',
  brainstorm: '#ff7bac',
  mixed: '#9aa0a6',
};

export const SRS_RATING_LABELS: Readonly<Record<SrsRating, string>> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

/** Human "in N days" / "now" label for a scheduled interval in days. */
export function srsIntervalLabel(days: number): string {
  if (days <= 0) return 'now';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
