// ─── Srs schemas & types ───────────────────────────────────────────────

export type SrsFilter = 'due' | 'upcoming' | 'all' | 'suspended';

export interface SrsItem {
  id: string;
  item_type: string;
  item_key: string;
  surah_id: number | null;       // extracted from item_key
  card_json: string | null;
  status: string;
  due_at: string | null;
  last_review_at: string | null;
  interval_days: number | null;
  ease: number | null;
  reps: number | null;
  lapses: number | null;
  last_rating: string | null;
  created_at: string;
  updated_at: string;
}

export interface SrsSummary {
  due: number;
  upcoming: number;
  suspended: number;
  total: number;
}
