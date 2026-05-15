// ─── Word occurrence schemas & types ──────────────────────────────────────────
// Field names mirror the qr_word_occurrences D1 columns exactly. Older names
// (word_position, text_uthmani, text_clean, lx_lemma_ref, root_text, pos_tag)
// were retired during the morphology import; do not reintroduce them here.

export interface WordOccurrence {
  id: string;
  surah: number;
  ayah: number;
  word_index: number;
  word_text: string;
  word_text_bare: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
  morphology_tag_json: string | null;
}

export interface WordQuery {
  surah?: number;
  ayah?: number;
  lemma?: string;
  root?: string;
}
