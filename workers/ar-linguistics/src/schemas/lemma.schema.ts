// ─── Lemma schemas & types ────────────────────────────────────────────────────

export interface Lemma {
  id: string;               // AL:ULID
  lemma_ar: string;
  root_id: string | null;   // AL:ULID → ar_ling_roots
  root_text: string | null; // denormalized for joins
  pos: string | null;       // noun | verb | particle | ...
  gloss_en: string | null;
  gloss_ar: string | null;
  frequency: number | null;
}

export interface LemmaCreate {
  lemma_ar: string;
  root_id?: string;
  pos?: string;
  gloss_en?: string;
  gloss_ar?: string;
}

export function validateLemmaCreate(body: unknown): { data: LemmaCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lemma_ar !== 'string' || !b.lemma_ar.trim())
    return { error: 'lemma_ar is required' };
  return {
    data: {
      lemma_ar: b.lemma_ar.trim(),
      root_id: typeof b.root_id === 'string' ? b.root_id : undefined,
      pos: typeof b.pos === 'string' ? b.pos : undefined,
      gloss_en: typeof b.gloss_en === 'string' ? b.gloss_en : undefined,
      gloss_ar: typeof b.gloss_ar === 'string' ? b.gloss_ar : undefined,
    },
  };
}
