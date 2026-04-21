// ─── Vocabulary schemas & types ───────────────────────────────────────────────

export type ArWordClass = 'noun' | 'verb' | 'particle' | 'adjective' | 'adverb' | 'other';
export type ArCefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ArVocabulary {
  id: string;                        // AR:ULID
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  meaning_notes: string | null;
  al_lemma_ref: string | null;       // AL:<ar_ling_lemma_id>
  al_root_ref: string | null;        // AL:<ar_ling_root_id>
  al_morph_ref: string | null;       // AL:<ar_ling_morphology_id>
  word_class: ArWordClass;
  level: ArCefrLevel | null;
  domain_id: string | null;
  frequency_rank: number | null;
  qr_scope_ref: string | null;
  tags_json: string | null;          // JSON [string]
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArVocabularyCreate {
  arabic: string;
  meaning_en: string;
  word_class?: ArWordClass;
  transliteration?: string | null;
  al_lemma_ref?: string | null;
  al_root_ref?: string | null;
  level?: ArCefrLevel | null;
  domain_id?: string | null;
  qr_scope_ref?: string | null;
  tags_json?: string | null;
}

export interface ArVocabularyPatch {
  arabic?: string;
  transliteration?: string | null;
  meaning_en?: string;
  meaning_notes?: string | null;
  al_lemma_ref?: string | null;
  al_root_ref?: string | null;
  al_morph_ref?: string | null;
  word_class?: ArWordClass;
  level?: ArCefrLevel | null;
  domain_id?: string | null;
  frequency_rank?: number | null;
  qr_scope_ref?: string | null;
  tags_json?: string | null;
  meta_json?: string | null;
}

// ─── Vocabulary Evidence ──────────────────────────────────────────────────────

export type ArEvidenceType = 'text' | 'quran' | 'hadith' | 'classical' | 'modern' | 'other';

export interface ArVocabularyEvidence {
  id: string;                        // AR:ULID
  vocab_id: string;
  source_ref: string | null;         // AL:<source_id> | CM:<source_id>
  locator: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  qr_scope_ref: string | null;
  evidence_type: ArEvidenceType;
  created_at: string;
}

export interface ArVocabularyEvidenceCreate {
  vocab_id: string;
  evidence_type?: ArEvidenceType;
  source_ref?: string | null;
  locator?: string | null;
  excerpt_ar?: string | null;
  excerpt_en?: string | null;
  qr_scope_ref?: string | null;
}

// ─── Vocabulary Relations ─────────────────────────────────────────────────────

export type ArVocabRelationType = 'synonym' | 'antonym' | 'related' | 'derived';

export interface ArVocabularyRelation {
  id: string;                        // AR:ULID
  from_vocab_id: string;
  to_vocab_id: string;
  relation_type: ArVocabRelationType;
  note: string | null;
  created_at: string;
}

export interface ArVocabularyRelationCreate {
  from_vocab_id: string;
  to_vocab_id: string;
  relation_type?: ArVocabRelationType;
  note?: string | null;
}

// ─── Unit Vocabulary Map ──────────────────────────────────────────────────────

export interface ArUnitVocabularyMap {
  id: string;
  unit_id: string;
  vocab_id: string;
  sort_order: number;
  is_key_word: boolean;
  created_at: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_WORD_CLASSES: ArWordClass[] = ['noun', 'verb', 'particle', 'adjective', 'adverb', 'other'];
const VALID_CEFR: ArCefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_EVIDENCE_TYPES: ArEvidenceType[] = ['text', 'quran', 'hadith', 'classical', 'modern', 'other'];
const VALID_RELATION_TYPES: ArVocabRelationType[] = ['synonym', 'antonym', 'related', 'derived'];

export function validateArVocabularyCreate(
  body: unknown,
): { data: ArVocabularyCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.arabic || typeof b.arabic !== 'string' || b.arabic.trim() === '') {
    return { error: 'arabic is required and must be a non-empty string' };
  }
  if (!b.meaning_en || typeof b.meaning_en !== 'string' || b.meaning_en.trim() === '') {
    return { error: 'meaning_en is required and must be a non-empty string' };
  }
  if (b.word_class !== undefined && !VALID_WORD_CLASSES.includes(b.word_class as ArWordClass)) {
    return { error: `word_class must be one of: ${VALID_WORD_CLASSES.join(', ')}` };
  }
  if (b.level !== undefined && b.level !== null && !VALID_CEFR.includes(b.level as ArCefrLevel)) {
    return { error: `level must be one of: ${VALID_CEFR.join(', ')}` };
  }

  return {
    data: {
      arabic: (b.arabic as string).trim(),
      meaning_en: (b.meaning_en as string).trim(),
      word_class: b.word_class !== undefined ? (b.word_class as ArWordClass) : undefined,
      transliteration: typeof b.transliteration === 'string' ? b.transliteration : b.transliteration === null ? null : undefined,
      al_lemma_ref: typeof b.al_lemma_ref === 'string' ? b.al_lemma_ref : b.al_lemma_ref === null ? null : undefined,
      al_root_ref: typeof b.al_root_ref === 'string' ? b.al_root_ref : b.al_root_ref === null ? null : undefined,
      level: b.level !== undefined ? (b.level as ArCefrLevel | null) : undefined,
      domain_id: typeof b.domain_id === 'string' ? b.domain_id : b.domain_id === null ? null : undefined,
      qr_scope_ref: typeof b.qr_scope_ref === 'string' ? b.qr_scope_ref : b.qr_scope_ref === null ? null : undefined,
      tags_json: typeof b.tags_json === 'string' ? b.tags_json : b.tags_json === null ? null : undefined,
    },
  };
}

export function validateArVocabularyEvidenceCreate(
  body: unknown,
): { data: ArVocabularyEvidenceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.vocab_id || typeof b.vocab_id !== 'string') {
    return { error: 'vocab_id is required and must be a string' };
  }
  if (b.evidence_type !== undefined && !VALID_EVIDENCE_TYPES.includes(b.evidence_type as ArEvidenceType)) {
    return { error: `evidence_type must be one of: ${VALID_EVIDENCE_TYPES.join(', ')}` };
  }

  return {
    data: {
      vocab_id: b.vocab_id as string,
      evidence_type: b.evidence_type !== undefined ? (b.evidence_type as ArEvidenceType) : undefined,
      source_ref: typeof b.source_ref === 'string' ? b.source_ref : b.source_ref === null ? null : undefined,
      locator: typeof b.locator === 'string' ? b.locator : b.locator === null ? null : undefined,
      excerpt_ar: typeof b.excerpt_ar === 'string' ? b.excerpt_ar : b.excerpt_ar === null ? null : undefined,
      excerpt_en: typeof b.excerpt_en === 'string' ? b.excerpt_en : b.excerpt_en === null ? null : undefined,
      qr_scope_ref: typeof b.qr_scope_ref === 'string' ? b.qr_scope_ref : b.qr_scope_ref === null ? null : undefined,
    },
  };
}

export function validateArVocabularyRelationCreate(
  body: unknown,
): { data: ArVocabularyRelationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.from_vocab_id || typeof b.from_vocab_id !== 'string') {
    return { error: 'from_vocab_id is required and must be a string' };
  }
  if (!b.to_vocab_id || typeof b.to_vocab_id !== 'string') {
    return { error: 'to_vocab_id is required and must be a string' };
  }
  if (b.relation_type !== undefined && !VALID_RELATION_TYPES.includes(b.relation_type as ArVocabRelationType)) {
    return { error: `relation_type must be one of: ${VALID_RELATION_TYPES.join(', ')}` };
  }

  return {
    data: {
      from_vocab_id: b.from_vocab_id as string,
      to_vocab_id: b.to_vocab_id as string,
      relation_type: b.relation_type !== undefined ? (b.relation_type as ArVocabRelationType) : undefined,
      note: typeof b.note === 'string' ? b.note : b.note === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface VocabCard {
  id: string;               // AR:ULID
  container_id: string;     // AR:ULID
  lx_lemma_ref: string;     // AL:ULID → ar_ling_lemmas
  display_ar: string;
  gloss_en: string | null;
  sort_order: number;
  srs_level: number;        // 0-5
  next_review_at: string | null;
  created_at: string;
}

export interface VocabCreate {
  container_id: string;
  lx_lemma_ref: string;
  display_ar: string;
  gloss_en?: string | null;
  sort_order?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArVocabularyPatch(body: unknown): SchemaValidationResult<ArVocabularyPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('arabic' in b) {
    if (typeof b.arabic !== 'string') return { error: 'arabic must be a string' };
    data.arabic = b.arabic;
  }
  if ('transliteration' in b) {
    if (b.transliteration !== null && typeof b.transliteration !== 'string') return { error: 'transliteration must be a string or null' };
    data.transliteration = b.transliteration;
  }
  if ('meaning_en' in b) {
    if (typeof b.meaning_en !== 'string') return { error: 'meaning_en must be a string' };
    data.meaning_en = b.meaning_en;
  }
  if ('meaning_notes' in b) {
    if (b.meaning_notes !== null && typeof b.meaning_notes !== 'string') return { error: 'meaning_notes must be a string or null' };
    data.meaning_notes = b.meaning_notes;
  }
  if ('al_lemma_ref' in b) {
    if (b.al_lemma_ref !== null && typeof b.al_lemma_ref !== 'string') return { error: 'al_lemma_ref must be a string or null' };
    data.al_lemma_ref = b.al_lemma_ref;
  }
  if ('al_root_ref' in b) {
    if (b.al_root_ref !== null && typeof b.al_root_ref !== 'string') return { error: 'al_root_ref must be a string or null' };
    data.al_root_ref = b.al_root_ref;
  }
  if ('al_morph_ref' in b) {
    if (b.al_morph_ref !== null && typeof b.al_morph_ref !== 'string') return { error: 'al_morph_ref must be a string or null' };
    data.al_morph_ref = b.al_morph_ref;
  }
  if ('word_class' in b) {
    data.word_class = b.word_class;
  }
  if ('level' in b) {
    data.level = b.level;
  }
  if ('domain_id' in b) {
    if (b.domain_id !== null && typeof b.domain_id !== 'string') return { error: 'domain_id must be a string or null' };
    data.domain_id = b.domain_id;
  }
  if ('frequency_rank' in b) {
    if (b.frequency_rank !== null && (typeof b.frequency_rank !== 'number' || !Number.isFinite(b.frequency_rank))) return { error: 'frequency_rank must be a number or null' };
    data.frequency_rank = b.frequency_rank;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('tags_json' in b) {
    if (b.tags_json !== null && typeof b.tags_json !== 'string') return { error: 'tags_json must be a string or null' };
    data.tags_json = b.tags_json;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArVocabularyPatch };
}

export function validateVocabCreate(body: unknown): SchemaValidationResult<VocabCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.container_id !== 'string' || !b.container_id.trim()) return { error: 'container_id is required and must be a non-empty string' };
  data.container_id = b.container_id.trim();
  if (typeof b.lx_lemma_ref !== 'string' || !b.lx_lemma_ref.trim()) return { error: 'lx_lemma_ref is required and must be a non-empty string' };
  data.lx_lemma_ref = b.lx_lemma_ref.trim();
  if (typeof b.display_ar !== 'string' || !b.display_ar.trim()) return { error: 'display_ar is required and must be a non-empty string' };
  data.display_ar = b.display_ar.trim();
  if ('gloss_en' in b) {
    if (b.gloss_en !== null && typeof b.gloss_en !== 'string') return { error: 'gloss_en must be a string or null' };
    data.gloss_en = b.gloss_en;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as VocabCreate };
}
