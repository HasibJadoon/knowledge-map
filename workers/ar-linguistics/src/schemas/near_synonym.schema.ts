// ─── Near synonym schemas & types ─────────────────────────────────────────────

export interface NearSynonymSet {
  id: string;
  set_name: string;
  description_md: string;
  slug: string | null;
  canonical_en: string | null;
  canonical_ar: string | null;
  canonical_ur: string | null;
  semantic_domain_id: string | null;
  pos_hint: string | null;
  short_summary: string | null;
  source_status: string;
  confidence: string;
  review_status: string;
  created_at: string;
}

export interface NearSynonymMember {
  id: string;
  set_id: string;
  lemma_id: string;
  nuance_note: string;
  arabic_display: string | null;
  arabic_bare: string | null;
  basic_gloss: string | null;
  basic_gloss_ur: string | null;
  contrast_note: string | null;
  contrast_note_ur: string | null;
  usage_rule: string | null;
  usage_rule_ur: string | null;
  quran_usage_pattern: string | null;
  quran_usage_pattern_ur: string | null;
  nuance_note_ur: string | null;
  source_status: string;
  claim_basis: string;
  confidence: string;
  sort_order: number;
}

export interface NearSynonymEvidence {
  id: string;
  set_id: string;
  member_id: string | null;
  lemma_id: string | null;
  qr_ref: string;
  surah: number;
  ayah: number;
  word_index: number | null;
  arabic_quote: string | null;
  translation_quote: string | null;
  explanation_md: string | null;
  evidence_type: string;
  confidence: string;
  validation_status: string;
}

export interface NearSynonymSetDetail extends NearSynonymSet {
  members: NearSynonymMember[];
}

export interface QuranNearSynonymResult {
  qr_ref: string;
  surah: number;
  ayah: number;
  sets: Array<NearSynonymSet & { members: NearSynonymMember[]; evidence: NearSynonymEvidence[] }>;
}
