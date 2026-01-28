import { RootCard } from './root-card.model';

export interface RootRow {
  id?: number;
  root: string;
  family: string;
  cards?: string | RootCard[];
  status?: string;
  frequency?: string;
  difficulty?: number | null;
  extract_date?: string | null;
  root_latn?: string | null;
  root_norm?: string | null;
  alt_latn_json?: string[] | null;
  romanization_sources_json?: Record<string, unknown> | null;
  search_keys_norm?: string | null;
}

export interface RootsApiResponse {
  ok?: boolean;
  results?: RootRow[];
  error?: string;
}
