export interface TokenRow {
  id: string;
  canonical_input: string;
  lemma_ar: string;
  lemma_norm: string;
  pos: string;
  root_norm: string | null;
  ar_u_root: string | null;
  root: string | null;
  root_latn: string | null;
  meta: Record<string, unknown>;
  root_meta: Record<string, unknown>;
}

export interface TokenListResponse {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  results: TokenRow[];
}
