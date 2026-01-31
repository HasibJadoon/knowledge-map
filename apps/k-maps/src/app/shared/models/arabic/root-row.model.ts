import { RootCard } from './root-card.model';

export interface RootRow {
  id?: string;
  root: string;
  cards?: RootCard[] | null;
  meta?: Record<string, unknown> | null;
  status?: string;
  frequency?: string;
  difficulty?: number | null;
  root_latn?: string | null;
  root_norm?: string | null;
  alt_latn_json?: string[] | null;
  romanization_sources_json?: Record<string, unknown> | null;
  search_keys_norm?: string | null;
  canonical_input?: string | null;
  extracted_at?: string | null;
  arabic_trilateral?: string | null;
  english_trilateral?: string | null;
}

export interface RootsApiResponse {
  ok?: boolean;
  results?: RootRow[];
  error?: string;
}
