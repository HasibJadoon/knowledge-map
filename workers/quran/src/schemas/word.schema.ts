// ─── Word occurrence schemas & types ──────────────────────────────────────────

export interface WordOccurrence {
  id: string;           // QR:ULID
  surah: number;
  ayah: number;
  word_position: number;
  text_uthmani: string;
  text_clean: string | null;
  lx_lemma_ref: string | null;   // AL:ULID → ar_ling_lemmas
  root_text: string | null;
  pos_tag: string | null;        // part-of-speech
  morphology_tag: string | null;
  morphology_tag_json: string | null;
}

export interface WordQuery {
  surah?: number;
  ayah?: number;
  lx_lemma_ref?: string;         // filter by lemma
  root_text?: string;
}
