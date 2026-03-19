import { requireAuth } from '../../../../../_utils/auth';
import {
  canonicalize,
  sha256Hex,
  upsertArUGrammar,
  upsertArULexicon,
  upsertArURoot,
  upsertArUSentence,
  upsertArUToken,
} from '../../../../../_utils/universal';
import { computeWeekStartSydney, ensureLessonWeeklyTask, normalizeIsoDate } from '../../../../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const TASK_LABELS: Record<string, string> = {
  sentence_structure: 'Sentence Structure',
  morphology: 'Morphology',
  expressions: 'Expressions',
};

const MORPH_POS_MAP: Record<string, 'noun' | 'verb' | 'particle' | 'adj'> = {
  اسم: 'noun',
  فعل: 'verb',
  حرف: 'particle',
  صفة: 'adj',
};

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_TATWEEL_RE = /\u0640/g;
const ARABIC_NON_LETTERS_RE = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;

const MORPH_POS2_VALUES = new Set(['verb', 'noun', 'prep', 'particle']);
const MORPH_DERIVATION_VALUES = new Set(['jamid', 'mushtaq']);
const MORPH_NOUN_NUMBER_VALUES = new Set(['singular', 'plural', 'dual']);
const MORPH_VERB_FORM_VALUES = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);
const MORPH_DERIVED_PATTERN_VALUES = new Set([
  'ism_fael',
  'ism_mafool',
  'masdar',
  'sifah_mushabbahah',
  'ism_mubalaghah',
  'ism_zaman',
  'ism_makan',
  'ism_ala',
  'tafdeel',
  'nisbah',
  'other',
]);
const MORPH_TRANSITIVITY_VALUES = new Set(['lazim', 'mutaaddi', 'both']);
const LEXICON_MORPH_ROLE_VALUES = new Set(['primary', 'inflection', 'derived', 'variant']);

const EVIDENCE_LOCATOR_VALUES = new Set(['chunk', 'app', 'url']);
const EVIDENCE_SOURCE_TYPE_VALUES = new Set([
  'book',
  'tafsir',
  'quran',
  'hadith',
  'paper',
  'website',
  'notes',
  'app',
]);
const EVIDENCE_LINK_ROLE_VALUES = new Set([
  'headword',
  'definition',
  'usage',
  'example',
  'mentions',
  'grouped_with',
  'crossref_target',
  'index_redirect',
  'supports',
  'disputes',
  'variant',
]);
const EVIDENCE_KIND_VALUES = new Set([
  'lexical',
  'morphological',
  'semantic',
  'thematic',
  'valency',
  'historical',
  'comparative',
  'editorial',
]);
const EVIDENCE_STRENGTH_VALUES = new Set(['primary', 'supporting', 'contextual', 'weak']);

type CommitBody = {
  container_id?: string | null;
  unit_id?: string | null;
  task_type?: string;
  task_json?: unknown;
};

type SentenceItem = {
  sentence_order?: number;
  canonical_sentence?: string;
  ar_u_sentence?: string;
  steps?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

type GrammarRef = {
  grammarId?: string;
  arUGrammar?: string;
  record?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function withWeeklyMeta(
  taskJson: Record<string, unknown>,
  userId: number,
  lessonId: number
): Record<string, unknown> {
  const weekStart = computeWeekStartSydney(normalizeIsoDate(asString(taskJson['week_start'])));
  return {
    ...taskJson,
    auto_weekly: true,
    user_id: userId,
    week_start: weekStart,
    ar_lesson_id: lessonId,
  };
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return items.length ? items : null;
}

function normalizeArabic(input: string): string {
  return input.normalize('NFKC').replace(ARABIC_DIACRITICS_RE, '').trim();
}

function normalizeMorphPos(value: string | null): 'verb' | 'noun' | 'adj' | 'particle' | 'phrase' | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (['verb', 'noun', 'adj', 'particle', 'phrase'].includes(lower)) {
    return lower as 'verb' | 'noun' | 'adj' | 'particle' | 'phrase';
  }
  return MORPH_POS_MAP[trimmed] ?? null;
}

function normalizeRootValue(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = normalizeArabic(raw).replace(/\s+/g, '');
  return cleaned || null;
}

function normalizeSynonymWord(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS_RE, '')
    .replace(ARABIC_TATWEEL_RE, '')
    .replace(ARABIC_NON_LETTERS_RE, '')
    .trim();
  return cleaned || null;
}

function toJsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function toJsonTextOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(trimmed);
    }
  }
  return JSON.stringify(value);
}

function parseWordLocationIndex(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(':').map((entry) => entry.trim());
  const last = Number(parts[parts.length - 1]);
  return Number.isFinite(last) ? last : null;
}

function asInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function pickEnum(value: string | null, allowed: Set<string>, fallback: string): string {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeMorphPos2(value: string | null): 'verb' | 'noun' | 'prep' | 'particle' | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'adj') return 'noun';
  return MORPH_POS2_VALUES.has(normalized)
    ? (normalized as 'verb' | 'noun' | 'prep' | 'particle')
    : null;
}

function normalizeVerbFormCode(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/^FORM[\s:=]*/i, '');
  return MORPH_VERB_FORM_VALUES.has(cleaned) ? cleaned : null;
}

function buildMorphologyCanonicalInput(args: {
  pos2: string;
  surfaceNorm: string;
  nounNumber: string | null;
  derivationType: string | null;
  verbForm: string | null;
  derivedFromVerbForm: string | null;
  derivedPattern: string | null;
  transitivity: string | null;
  objCount: number | null;
}) {
  return canonicalize(
    [
      'morph',
      'global',
      args.pos2,
      args.surfaceNorm,
      args.nounNumber ?? '',
      args.derivationType ?? '',
      `form=${args.verbForm ?? ''}`,
      `from=${args.derivedFromVerbForm ?? ''}`,
      `pattern=${args.derivedPattern ?? ''}`,
      `trans=${args.transitivity ?? ''}`,
      `obj=${args.objCount ?? ''}`,
    ].join('|')
  );
}

function buildCommitId(parts: Array<string | number | null | undefined>) {
  return parts.map((part) => String(part ?? '')).join('|');
}

function pickFeatureValue(features: Record<string, unknown> | null, key: string): string | null {
  if (!features) return null;
  const raw = features[key];
  return typeof raw === 'string' ? raw.trim() || null : null;
}

function extractTokenMorph(pos: string, features: Record<string, unknown> | null) {
  if (!features) return null;

  let nounCase: string | null = null;
  let nounNumber: string | null = null;
  let nounGender: string | null = null;
  let nounDefiniteness: string | null = null;
  let verbTense: string | null = null;
  let verbMood: string | null = null;
  let verbVoice: string | null = null;
  let verbPerson: string | null = null;
  let verbNumber: string | null = null;
  let verbGender: string | null = null;
  let particleType: string | null = null;

  if (pos === 'noun' || pos === 'adj') {
    nounCase = pickFeatureValue(features, 'status');
    nounNumber = pickFeatureValue(features, 'number');
    nounGender = pickFeatureValue(features, 'gender');
    nounDefiniteness = pickFeatureValue(features, 'type');
  } else if (pos === 'verb') {
    verbTense = pickFeatureValue(features, 'tense');
    verbMood = pickFeatureValue(features, 'mood');
    verbVoice = pickFeatureValue(features, 'voice');
    verbPerson = pickFeatureValue(features, 'person');
    verbNumber = pickFeatureValue(features, 'number');
    verbGender = pickFeatureValue(features, 'gender');
  } else if (pos === 'particle') {
    particleType = pickFeatureValue(features, 'particle_type');
  }

  const hasValues = [
    nounCase,
    nounNumber,
    nounGender,
    nounDefiniteness,
    verbTense,
    verbMood,
    verbVoice,
    verbPerson,
    verbNumber,
    verbGender,
    particleType,
  ].some(Boolean);

  if (!hasValues) return null;

  return {
    pos,
    nounCase,
    nounNumber,
    nounGender,
    nounDefiniteness,
    verbTense,
    verbMood,
    verbVoice,
    verbPerson,
    verbNumber,
    verbGender,
    particleType,
  };
}

function isLikelyHexId(value: string | null): boolean {
  if (!value) return false;
  return /^[a-f0-9]{64}$/i.test(value);
}

async function upsertTokenMorph(
  _db: D1Database,
  _tokenOccId: string,
  _pos: string,
  _features: Record<string, unknown> | null
) {
  // Occurrence-level morphology table was removed.
  return;
}

async function insertTokenLexiconLink(db: D1Database, tokenOccId: string, lexiconId: string) {
  await db
    .prepare(
      `
      INSERT OR IGNORE INTO ar_token_lexicon_link (
        ar_token_occ_id, ar_u_lexicon, created_at
      ) VALUES (?1, ?2, datetime('now'))
    `
    )
    .bind(tokenOccId, lexiconId)
    .run();
}

type SynonymLookup = {
  topicIds: string[];
  entries: Array<Record<string, unknown>>;
};

async function fetchSynonymLookup(
  db: D1Database,
  lemmaNorm: string | null,
  lemmaAr: string | null
): Promise<SynonymLookup> {
  const normalized = normalizeSynonymWord(lemmaNorm) ?? normalizeSynonymWord(lemmaAr);
  if (!normalized) return { topicIds: [], entries: [] };

  const topicRows = await db
    .prepare(
      `
      SELECT DISTINCT topic_id
      FROM ar_quran_synonym_topic_words
      WHERE word_norm = ?1
    `
    )
    .bind(normalized)
    .all<any>();

  const topicIds = (topicRows?.results ?? [])
    .map((row: any) => (row?.topic_id ? String(row.topic_id) : ''))
    .filter(Boolean);
  if (!topicIds.length) return { topicIds: [], entries: [] };

  const placeholders = topicIds.map((_, idx) => `?${idx + 1}`).join(',');
  const entriesRows = await db
    .prepare(
      `
      SELECT topic_id, word_norm, word_ar, word_en, root_norm, root_ar, order_index
      FROM ar_quran_synonym_topic_words
      WHERE topic_id IN (${placeholders})
      ORDER BY topic_id, order_index
    `
    )
    .bind(...topicIds)
    .all<any>();

  const entries = (entriesRows?.results ?? []).map((row: any) => ({
    topic_id: row?.topic_id ?? null,
    word_norm: row?.word_norm ?? null,
    word_ar: row?.word_ar ?? null,
    word_en: row?.word_en ?? null,
    root_norm: row?.root_norm ?? null,
    root_ar: row?.root_ar ?? null,
    order_index: row?.order_index ?? null,
  }));

  return { topicIds, entries };
}

function nextOrder(items: SentenceItem[]): number {
  const orders = items.map((item) => asNumber(item.sentence_order)).filter((n): n is number => n != null);
  if (!orders.length) return 1;
  return Math.max(...orders) + 1;
}

function isLikelyArUGrammar(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function parseGrammarString(value: string): { grammarId?: string; arUGrammar?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (isLikelyArUGrammar(trimmed)) return { arUGrammar: trimmed };
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('gram|') || lower.startsWith('grammar|')) {
    const parts = trimmed.split('|');
    const last = parts[parts.length - 1];
    if (last && last !== trimmed) return { grammarId: last };
  }
  return { grammarId: trimmed };
}

function extractGrammarRef(entry: unknown): GrammarRef | null {
  if (typeof entry === 'string') {
    const parsed = parseGrammarString(entry);
    if (parsed.grammarId || parsed.arUGrammar) return { ...parsed };
    return null;
  }
  const record = asRecord(entry);
  if (!record) return null;
  const arUGrammar = asString(record['ar_u_grammar']);
  const grammarId =
    asString(record['grammar_id']) ??
    asString(record['id']) ??
    asString(record['grammar']);
  if (arUGrammar) {
    return { arUGrammar, record };
  }
  if (grammarId) {
    const parsed = parseGrammarString(grammarId);
    if (parsed.grammarId || parsed.arUGrammar) return { ...parsed, record };
  }
  return null;
}

function collectGrammarRefs(list: unknown, out: GrammarRef[]) {
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    const ref = extractGrammarRef(entry);
    if (ref) out.push(ref);
  }
}

function looksLikeStructureSummary(record: Record<string, unknown>): boolean {
  return (
    'sentence_type' in record ||
    'core_pattern' in record ||
    'main_components' in record ||
    'expansions' in record ||
    'grammar_flow' in record
  );
}

function collectGrammarFromSummary(summary: Record<string, unknown> | null, out: GrammarRef[]) {
  if (!summary) return;
  collectGrammarRefs(summary['grammar_flow'], out);
  const main = Array.isArray(summary['main_components']) ? summary['main_components'] : [];
  for (const component of main) {
    const compRecord = asRecord(component);
    if (!compRecord) continue;
    collectGrammarRefs(compRecord['grammar'], out);
  }
  const expansions = Array.isArray(summary['expansions']) ? summary['expansions'] : [];
  for (const expansion of expansions) {
    const expRecord = asRecord(expansion);
    if (!expRecord) continue;
    collectGrammarRefs(expRecord['grammar'], out);
  }
}

function normalizeRoot(raw: string): string {
  return canonicalize(raw).replace(/\s+/g, '');
}

function normalizeSentencePos(
  raw?: string | null,
  detail?: string | null
): 'noun' | 'verb' | 'adj' | 'particle' | 'phrase' {
  const rawTrim = raw?.trim() ?? '';
  const rawLower = rawTrim.toLowerCase();
  if (['noun', 'verb', 'adj', 'particle', 'phrase'].includes(rawLower)) {
    return rawLower as 'noun' | 'verb' | 'adj' | 'particle' | 'phrase';
  }
  const combined = `${rawTrim} ${detail ?? ''}`.toLowerCase();
  if (combined.includes('فعل') || combined.includes('verb')) return 'verb';
  if (combined.includes('صفة') || combined.includes('adj')) return 'adj';
  if (combined.includes('حرف') || combined.includes('particle')) return 'particle';
  return 'noun';
}

type ArUMorphologyUpsertPayload = {
  id?: string | null;
  canonicalInput?: string | null;
  surfaceAr: string;
  surfaceNorm: string;
  pos2: 'verb' | 'noun' | 'prep' | 'particle';
  derivationType?: string | null;
  nounNumber?: string | null;
  verbForm?: string | null;
  derivedFromVerbForm?: string | null;
  derivedPattern?: string | null;
  transitivity?: string | null;
  objCount?: number | null;
  tagsAr?: unknown;
  tagsEn?: unknown;
  notes?: string | null;
  meta?: unknown;
};

async function upsertArUMorphology(db: D1Database, payload: ArUMorphologyUpsertPayload) {
  const nounNumber = payload.nounNumber ?? null;
  const derivationType = payload.derivationType ?? null;
  const verbForm = payload.verbForm ?? null;
  const derivedFromVerbForm = payload.derivedFromVerbForm ?? null;
  const derivedPattern = payload.derivedPattern ?? null;
  const transitivity = payload.transitivity ?? null;
  const objCount = payload.objCount ?? null;

  const canonicalInput =
    payload.canonicalInput ??
    buildMorphologyCanonicalInput({
      pos2: payload.pos2,
      surfaceNorm: payload.surfaceNorm,
      nounNumber,
      derivationType,
      verbForm,
      derivedFromVerbForm,
      derivedPattern,
      transitivity,
      objCount,
    });
  const id = payload.id ?? (await sha256Hex(canonicalInput));

  await db
    .prepare(
      `
      INSERT INTO ar_u_morphology (
        ar_u_morphology,
        canonical_input,
        surface_ar,
        surface_norm,
        pos2,
        derivation_type,
        noun_number,
        verb_form,
        derived_from_verb_form,
        derived_pattern,
        transitivity,
        obj_count,
        tags_ar_json,
        tags_en_json,
        notes,
        meta_json
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
      )
      ON CONFLICT(ar_u_morphology) DO UPDATE SET
        surface_ar = excluded.surface_ar,
        tags_ar_json = excluded.tags_ar_json,
        tags_en_json = excluded.tags_en_json,
        notes = excluded.notes,
        meta_json = excluded.meta_json,
        updated_at = datetime('now')
    `
    )
    .bind(
      id,
      canonicalInput,
      payload.surfaceAr,
      payload.surfaceNorm,
      payload.pos2,
      derivationType,
      nounNumber,
      verbForm,
      derivedFromVerbForm,
      derivedPattern,
      transitivity,
      objCount,
      toJsonOrNull(payload.tagsAr),
      toJsonOrNull(payload.tagsEn),
      payload.notes ?? null,
      toJsonOrNull(payload.meta)
    )
    .run();

  return { ar_u_morphology: id, canonical_input: canonicalInput };
}

function taskJsonObject(taskJson: unknown): Record<string, unknown> | null {
  const record = asRecord(taskJson);
  if (record) return record;
  if (typeof taskJson === 'string') {
    try {
      const parsed = JSON.parse(taskJson);
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

function taskJsonValue(taskJson: unknown): unknown | null {
  if (taskJson === undefined || taskJson === null) return null;
  if (typeof taskJson === 'string') {
    const trimmed = taskJson.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return taskJson;
}

function asJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  const direct = asRecord(value);
  if (direct) return direct;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function looksLikeExpressionEntry(row: Record<string, unknown>): boolean {
  return !!(
    asString(row['ar_u_expression']) ??
    asString(row['id']) ??
    asString(row['canonical_input']) ??
    asString(row['text_ar']) ??
    asString(row['expression_ar']) ??
    asString(row['label'])
  );
}

function expressionSequenceFromRow(row: Record<string, unknown>, textAr: string): unknown[] {
  const fromSequenceJson = row['sequence_json'];
  if (Array.isArray(fromSequenceJson)) return fromSequenceJson;
  const fromSequence = row['sequence'];
  if (Array.isArray(fromSequence)) return fromSequence;
  const tokens = textAr
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return tokens;
}

function expressionTokenList(sequence: unknown[]): string[] {
  return sequence
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      const record = asRecord(entry);
      if (!record) return '';
      return asString(record['token']) ?? asString(record['text']) ?? '';
    })
    .filter(Boolean);
}

async function upsertExpressionRow(
  db: D1Database,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const textAr = asString(row['text_ar']) ?? asString(row['expression_ar']) ?? asString(row['text']) ?? '';
  const label = asString(row['label']) ?? asString(row['expression_norm']) ?? textAr;
  const requestedLexicon =
    asString(row['ar_u_lexicon']) ??
    asString(row['u_lexicon_id']) ??
    asString(row['lexicon_id']);
  const baseMeta = asJsonRecord(row['meta_json']) ?? asJsonRecord(row['meta']) ?? {};
  const lemmaNorm = asString(row['lemma_norm']) ?? asString(baseMeta['lemma_norm']);
  const lemmaAr = asString(row['lemma_ar']) ?? asString(baseMeta['lemma_ar']);
  let arULexicon = requestedLexicon;
  if (!arULexicon && (lemmaNorm || lemmaAr)) {
    const byLemma = await db
      .prepare(
        `
      SELECT ar_u_lexicon
      FROM ar_u_lexicon
      WHERE status <> 'deprecated'
        AND (
          (?1 IS NOT NULL AND lemma_norm = ?1)
          OR (?2 IS NOT NULL AND lemma_ar = ?2)
        )
      ORDER BY
        CASE
          WHEN ?1 IS NOT NULL AND lemma_norm = ?1 THEN 0
          WHEN ?2 IS NOT NULL AND lemma_ar = ?2 THEN 1
          ELSE 2
        END,
        CASE unit_type
          WHEN 'word' THEN 0
          WHEN 'key_term' THEN 1
          WHEN 'verbal_idiom' THEN 2
          WHEN 'expression' THEN 3
          ELSE 4
        END,
        CASE status
          WHEN 'active' THEN 0
          WHEN 'draft' THEN 1
          ELSE 2
        END,
        updated_at DESC,
        created_at DESC,
        ar_u_lexicon ASC
      LIMIT 1
      `
      )
      .bind(lemmaNorm, lemmaAr)
      .first<{ ar_u_lexicon: string }>();
    arULexicon = byLemma?.ar_u_lexicon ?? null;
  }
  const sequence = expressionSequenceFromRow(row, textAr);
  const tokens = expressionTokenList(sequence);

  const canonicalInput = canonicalize(
    asString(row['canonical_input']) ??
      `EXP|${normalizeArabic(label || textAr)}|${tokens.join(';')}`
  );
  const requestedId = asString(row['ar_u_expression']) ?? asString(row['id']);
  const arUExpression = requestedId ?? (await sha256Hex(canonicalInput));

  const surahCandidate = asInteger(row['surah']) ?? asInteger(baseMeta['surah']);
  const ayahCandidate = asInteger(row['ayah']) ?? asInteger(baseMeta['ayah']);
  const surah = surahCandidate != null && ayahCandidate != null ? surahCandidate : null;
  const ayah = surahCandidate != null && ayahCandidate != null ? ayahCandidate : null;
  const topLevelMeta: Record<string, unknown> = {};
  if (surah != null) topLevelMeta['surah'] = surah;
  if (ayah != null) topLevelMeta['ayah'] = ayah;
  if (asString(row['category'])) topLevelMeta['category'] = asString(row['category']);
  if (asString(row['scholarly_status'])) topLevelMeta['scholarly_status'] = asString(row['scholarly_status']);
  if (asString(row['significance_summary'])) topLevelMeta['significance_summary'] = asString(row['significance_summary']);
  if (Array.isArray(row['primary_sources'])) topLevelMeta['primary_sources'] = row['primary_sources'];
  if (Array.isArray(row['secondary_sources'])) topLevelMeta['secondary_sources'] = row['secondary_sources'];
  if (asString(row['notes'])) topLevelMeta['notes'] = asString(row['notes']);
  const mergedMeta = {
    ...topLevelMeta,
    ...baseMeta,
  };
  const sequenceJson = toJsonOrNull(sequence);
  const metaJson = toJsonOrNull(mergedMeta);

  const existingByCanonical = await db
    .prepare(
      `
      SELECT ar_u_expression
      FROM ar_u_expressions
      WHERE canonical_input = ?1
      LIMIT 1
      `
    )
    .bind(canonicalInput)
    .first<{ ar_u_expression: string }>();

  const resolvedExpressionId = existingByCanonical?.ar_u_expression ?? arUExpression;

  if (existingByCanonical?.ar_u_expression) {
    await db
      .prepare(
        `
        UPDATE ar_u_expressions
        SET
          ar_u_lexicon = ?2,
          surah = ?3,
          ayah = ?4,
          label = ?5,
          text_ar = ?6,
          sequence_json = ?7,
          meta_json = ?8,
          updated_at = datetime('now')
        WHERE ar_u_expression = ?1
      `
      )
      .bind(
        resolvedExpressionId,
        arULexicon,
        surah,
        ayah,
        label,
        textAr,
        sequenceJson,
        metaJson
      )
      .run();
  } else {
    await db
      .prepare(
        `
      INSERT INTO ar_u_expressions (
        ar_u_expression, canonical_input, ar_u_lexicon, surah, ayah, label, text_ar, sequence_json, meta_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
      ON CONFLICT(ar_u_expression) DO UPDATE SET
        canonical_input = excluded.canonical_input,
        ar_u_lexicon = excluded.ar_u_lexicon,
        surah = excluded.surah,
        ayah = excluded.ayah,
        label = excluded.label,
        text_ar = excluded.text_ar,
        sequence_json = excluded.sequence_json,
        meta_json = excluded.meta_json,
        updated_at = datetime('now')
      `
      )
      .bind(
        arUExpression,
        canonicalInput,
        arULexicon,
        surah,
        ayah,
        label,
        textAr,
        sequenceJson,
        metaJson
      )
      .run();
  }

  return {
    ...row,
    ar_u_expression: resolvedExpressionId,
    ar_u_lexicon: arULexicon,
    surah,
    ayah,
    canonical_input: canonicalInput,
    label,
    text_ar: textAr,
    sequence_json: sequence,
    meta_json: mergedMeta,
  };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Admin role required' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid id' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let body: CommitBody;
    try {
      body = await ctx.request.json<CommitBody>();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const taskType = asString(body.task_type);
    if (!taskType || (taskType !== 'sentence_structure' && taskType !== 'morphology' && taskType !== 'expressions')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unsupported task_type.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const lessonRow = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, container_id, unit_id
        FROM ar_lessons
        WHERE id = ?1 AND user_id = ?2 AND lesson_type = 'quran'
        LIMIT 1
      `
      )
      .bind(id, user.id)
      .first<any>();

    if (!lessonRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const containerId = body.container_id ?? lessonRow.container_id ?? null;
    const unitId = body.unit_id ?? lessonRow.unit_id ?? null;
    if (!containerId || !unitId) {
      return new Response(JSON.stringify({ ok: false, error: 'container_id and unit_id required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const parsedTaskJson = taskJsonValue(body.task_json);
    if (parsedTaskJson === null) {
      return new Response(JSON.stringify({ ok: false, error: 'task_json must be valid JSON.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (taskType === 'expressions') {
      const taskRecord = asRecord(parsedTaskJson);
      const rawItems = Array.isArray(parsedTaskJson)
        ? parsedTaskJson
        : Array.isArray(taskRecord?.['u_expressions'])
          ? (taskRecord?.['u_expressions'] as unknown[])
          : Array.isArray(taskRecord?.['items'])
            ? (taskRecord?.['items'] as unknown[])
            : looksLikeExpressionEntry(taskRecord ?? {})
              ? [taskRecord]
              : [];

      const expressionRows = rawItems
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => !!item);
      if (!expressionRows.length) {
        return new Response(JSON.stringify({ ok: false, error: 'task_json.u_expressions[] is required.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const normalizedRows: Array<Record<string, unknown>> = [];
      for (const row of expressionRows) {
        const normalized = await upsertExpressionRow(ctx.env.DB, row);
        normalizedRows.push(normalized);
      }

      const enriched = {
        ...(taskRecord ?? {}),
        schema_version: asInteger(taskRecord?.['schema_version']) ?? 1,
        task_type: 'expressions',
        u_expressions: normalizedRows,
      };

      const taskId = `UT:${unitId}:${taskType}`;
      const enrichedForStorage = withWeeklyMeta(enriched, user.id, id);
      const taskJsonText = JSON.stringify(enrichedForStorage);
      const taskName = TASK_LABELS[taskType] ?? taskType;

      await ctx.env.DB
        .prepare(
          `
          INSERT INTO ar_container_unit_task (
            task_id, unit_id, task_type, task_name, task_json, status
          ) VALUES (?1, ?2, ?3, ?4, json(?5), 'draft')
          ON CONFLICT(unit_id, task_type)
          DO UPDATE SET
            task_name = excluded.task_name,
            task_json = excluded.task_json,
            status = excluded.status
        `
        )
        .bind(taskId, unitId, taskType, taskName, taskJsonText)
        .run();

      await ensureLessonWeeklyTask({
        db: ctx.env.DB,
        userId: user.id,
        lessonId: id,
        taskId,
        taskName,
        taskType,
        unitId,
        taskJson: enrichedForStorage,
        linkContext: {
          containerId,
          unitId,
          ref: asString(taskRecord?.['ref']),
        },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          result: {
            task_json: enriched,
            expression_summary: {
              upserted: normalizedRows.length,
            },
          },
        }),
        { headers: jsonHeaders }
      );
    }

    const taskJson = taskJsonObject(parsedTaskJson);
    if (!taskJson) {
      return new Response(JSON.stringify({ ok: false, error: 'task_json must be an object.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (taskType === 'morphology') {
      const rawItems = Array.isArray(taskJson.items) ? taskJson.items : [];
      const rawLexiconEvidence = Array.isArray(taskJson['lexicon_evidence']) ? taskJson['lexicon_evidence'] : [];
      const rawLexiconMorphology = Array.isArray(taskJson['lexicon_morphology'])
        ? taskJson['lexicon_morphology']
        : [];
      if (!rawItems.length) {
        return new Response(JSON.stringify({ ok: false, error: 'task_json.items[] is required.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      let lexiconUpserted = 0;
      let lexiconSkipped = 0;
      let morphologyUpserted = 0;
      let morphologySkipped = 0;
      let lexiconMorphologyUpserted = 0;
      let lexiconMorphologySkipped = 0;
      let lexiconEvidenceUpserted = 0;
      let lexiconEvidenceSkipped = 0;
      const items: Array<Record<string, unknown>> = [];
      const evidenceItems: Array<Record<string, unknown>> = [];
      const lexiconMorphologyItems: Array<Record<string, unknown>> = [];
      const synonymCache = new Map<string, SynonymLookup>();
      const lexiconByWordLocation = new Map<string, string>();
      const lexiconByLemmaPos = new Map<string, string>();
      const morphologyItemByWordLocation = new Map<string, Record<string, unknown>>();

      for (const rawItem of rawItems) {
        const item = asRecord(rawItem) ?? {};
        const surfaceAr =
          asString(item['surface_ar']) ??
          asString(item['surface']) ??
          asString(item['text']) ??
          '';
        const surfaceNorm =
          asString(item['surface_norm']) ??
          asString(item['simple']) ??
          normalizeArabic(surfaceAr);
        const lemmaAr =
          asString(item['lemma_ar']) ??
          asString(item['lemma']) ??
          asString(item['lemma_text']) ??
          surfaceAr;
        const lemmaNorm =
          asString(item['lemma_norm']) ??
          asString(item['lemma_text_clean']) ??
          normalizeArabic(lemmaAr || surfaceAr);
        const rootRaw = asString(item['root_ar']) ?? asString(item['root']) ?? null;
        const rootNorm = normalizeRootValue(asString(item['root_norm']) ?? rootRaw);
        const pos = normalizeMorphPos(asString(item['pos']));
        const morphology = asRecord(item['morphology']);
        const singular = asRecord(morphology?.['singular']);
        const plural = asRecord(morphology?.['plural']);
        const morphPattern =
          asString(item['morph_pattern']) ??
          asString(item['pattern']) ??
          asString(singular?.['pattern']) ??
          asString(plural?.['pattern']);
        const morphFeatures =
          asRecord(item['morph_features']) ??
          asRecord(item['features']) ??
          asRecord(morphology?.['morph_features']);
        const morphDerivationsRaw = Array.isArray(item['morph_derivations'])
          ? item['morph_derivations']
          : Array.isArray(item['derivations'])
            ? item['derivations']
            : null;
        const morphDerivations =
          morphDerivationsRaw ??
          [
            ...(singular ? [{ kind: 'singular', ...singular }] : []),
            ...(plural ? [{ kind: 'plural', ...plural }] : []),
          ].filter((entry) => Object.keys(entry).length);
        const translationRecord = asRecord(item['translation']);
        const translationPrimary =
          asString(translationRecord?.['primary']) ??
          asString(item['translation']) ??
          asString(item['gloss']) ??
          null;
        const translationAlternatives = asStringArray(translationRecord?.['alternatives']);
        let translationNotes: string | null = null;
        if (translationRecord) {
          const { primary, alternatives, ...rest } = translationRecord as Record<string, unknown>;
          const restKeys = Object.keys(rest);
          if (restKeys.length) {
            try {
              translationNotes = JSON.stringify(rest);
            } catch {
              translationNotes = null;
            }
          }
        }
        const wordLocation = asString(item['word_location']);
        const tokenIndex =
          asNumber(item['token_index']) ??
          parseWordLocationIndex(wordLocation) ??
          null;

        const lexiconRaw =
          asString(item['lexicon_id']) ??
          asString(item['ar_u_lexicon']) ??
          null;
        let lexiconId = isLikelyHexId(lexiconRaw) ? lexiconRaw : null;

        let arURoot: string | null =
          asString(item['ar_u_root']) ?? asString(item['u_root_id']) ?? null;

        if (!arURoot && rootNorm) {
          const rootRow = await upsertArURoot(
            { DB: ctx.env.DB },
            {
              root: rootRaw ?? rootNorm,
              rootNorm,
              meta: { source: 'morphology-task' },
            }
          );
          arURoot = rootRow.ar_u_root;
        }

        let synonymTopicIds: string[] = [];
        let synonymEntries: Array<Record<string, unknown>> = [];
        const synonymKey = normalizeSynonymWord(lemmaNorm) ?? normalizeSynonymWord(lemmaAr);
        if (synonymKey) {
          const cached = synonymCache.get(synonymKey);
          const lookup = cached ?? (await fetchSynonymLookup(ctx.env.DB, lemmaNorm, lemmaAr));
          if (!cached) synonymCache.set(synonymKey, lookup);
          synonymTopicIds = lookup.topicIds;
          synonymEntries = lookup.entries;
        }
        const lexiconSynonyms =
          synonymKey && synonymEntries.length
            ? synonymEntries.filter((entry) => {
                const entryNorm =
                  typeof entry['word_norm'] === 'string'
                    ? normalizeSynonymWord(entry['word_norm'])
                    : null;
                return entryNorm && entryNorm !== synonymKey;
              })
            : [];

        if (!lexiconId && lemmaAr && pos) {
          const meta: Record<string, unknown> = {
            source: 'morphology-task',
            container_id: containerId,
            unit_id: unitId,
          };
          if (synonymTopicIds.length) {
            meta['synonym_topic_ids'] = synonymTopicIds;
          }
          const lexiconRow = await upsertArULexicon(
            { DB: ctx.env.DB },
            {
              unitType: 'word',
              surfaceAr: surfaceAr || lemmaAr,
              surfaceNorm: surfaceNorm || lemmaNorm,
              lemmaAr: lemmaAr,
              lemmaNorm: lemmaNorm,
              pos,
              rootNorm: rootNorm ?? null,
              arURoot,
              senseKey: 'sense-1',
              meanings: null,
              synonyms: lexiconSynonyms.length ? lexiconSynonyms : null,
              glossPrimary: translationPrimary,
              glossSecondary: translationAlternatives ?? null,
              usageNotes: translationNotes,
              morphPattern: morphPattern ?? null,
              morphFeatures: morphFeatures,
              morphDerivations: morphDerivations?.length ? morphDerivations : null,
              meta,
            }
          );
          lexiconId = lexiconRow.ar_u_lexicon;
          lexiconUpserted += 1;
        } else if (!lexiconId) {
          lexiconSkipped += 1;
        }

        let arUToken: string | null =
          asString(item['ar_u_token']) ?? asString(item['u_token_id']) ?? null;

        if (lemmaAr && pos) {
          const tokenRow = await upsertArUToken(
            { DB: ctx.env.DB },
            {
              lemmaAr,
              lemmaNorm,
              pos,
              rootNorm: rootNorm ?? null,
              arURoot,
              features: morphFeatures ?? undefined,
              meta: {
                source: 'morphology-task',
                container_id: containerId,
                unit_id: unitId,
              },
            }
          );
          arUToken = tokenRow.ar_u_token;
        }

        let tokenOccId: string | null =
          asString(item['ar_token_occ_id']) ?? asString(item['token_occ_id']) ?? null;
        if (tokenIndex != null && surfaceAr && arUToken) {
          if (!tokenOccId) {
            tokenOccId = await sha256Hex(
              buildCommitId(['occ_token', containerId, unitId, tokenIndex, surfaceAr])
            );
          }

          await ctx.env.DB
            .prepare(
              `
              INSERT OR REPLACE INTO ar_occ_token (
                ar_token_occ_id, user_id, container_id, unit_id, pos_index,
                surface_ar, norm_ar, lemma_ar, pos, ar_u_token, ar_u_root,
                features_json, created_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10, ?11,
                ?12, datetime('now')
              )
            `
            )
            .bind(
              tokenOccId,
              user.id,
              containerId,
              unitId,
              tokenIndex,
              surfaceAr,
              surfaceNorm || normalizeArabic(surfaceAr),
              lemmaAr,
              pos,
              arUToken,
              arURoot,
              toJsonOrNull(morphFeatures)
            )
            .run();

          await upsertTokenMorph(ctx.env.DB, tokenOccId, pos ?? '', morphFeatures);

          if (lexiconId) {
            await insertTokenLexiconLink(ctx.env.DB, tokenOccId, lexiconId);
          }
        }

        if (surfaceAr) item['surface_ar'] = surfaceAr;
        if (surfaceNorm) item['surface_norm'] = surfaceNorm;
        if (lemmaAr) item['lemma_ar'] = lemmaAr;
        if (lemmaNorm) item['lemma_norm'] = lemmaNorm;
        if (rootNorm) item['root_norm'] = rootNorm;
        if (rootRaw && !item['root_ar']) item['root_ar'] = rootRaw;
        if (pos) item['pos'] = pos;
        if (morphPattern) item['morph_pattern'] = morphPattern;
        if (morphFeatures) item['morph_features'] = morphFeatures;
        if (synonymTopicIds.length && !item['topic_id'] && !item['topic_ids']) {
          if (synonymTopicIds.length === 1) {
            item['topic_id'] = synonymTopicIds[0];
          } else {
            item['topic_ids'] = synonymTopicIds;
          }
        }
        if (tokenIndex != null) item['token_index'] = tokenIndex;
        if (!item['word_location'] && tokenIndex != null) {
          const surah = asNumber(item['surah']);
          const ayah = asNumber(item['ayah']);
          if (surah != null && ayah != null) {
            item['word_location'] = `${surah}:${ayah}:${tokenIndex}`;
          }
        }
        if (arURoot) item['ar_u_root'] = arURoot;
        if (arUToken) item['ar_u_token'] = arUToken;
        if (tokenOccId) item['ar_token_occ_id'] = tokenOccId;
        if (lexiconId) {
          item['lexicon_id'] = lexiconId;
          item['ar_u_lexicon'] = lexiconId;
        }

        const rowWordLocation = asString(item['word_location']);
        if (rowWordLocation) {
          morphologyItemByWordLocation.set(rowWordLocation, item);
          if (lexiconId) {
            lexiconByWordLocation.set(rowWordLocation, lexiconId);
          }
        }
        if (lexiconId && lemmaNorm && pos) {
          lexiconByLemmaPos.set(`${lemmaNorm}|${pos}`, lexiconId);
        }

        items.push(item);
      }

      const resolveLexiconId = (row: Record<string, unknown>): string | null => {
        const direct = asString(row['ar_u_lexicon']) ?? asString(row['lexicon_id']);
        if (direct && isLikelyHexId(direct)) return direct;

        const wordLocation = asString(row['word_location']);
        if (wordLocation) {
          const byWordLocation = lexiconByWordLocation.get(wordLocation);
          if (byWordLocation) return byWordLocation;
        }

        const lemmaNorm =
          asString(row['lemma_norm']) ??
          asString(row['surface_norm']) ??
          null;
        const pos = normalizeMorphPos(asString(row['pos']));
        if (lemmaNorm && pos) {
          const byLemmaPos = lexiconByLemmaPos.get(`${lemmaNorm}|${pos}`);
          if (byLemmaPos) return byLemmaPos;
        }
        if (lemmaNorm) {
          for (const [key, value] of lexiconByLemmaPos.entries()) {
            if (key.startsWith(`${lemmaNorm}|`)) return value;
          }
        }
        return null;
      };

      const markSkipped = (row: Record<string, unknown>, reason: string) => {
        row['_commit_status'] = 'skipped';
        row['_commit_reason'] = reason;
      };

      for (const rawLink of rawLexiconMorphology) {
        const row = asRecord(rawLink);
        if (!row) continue;

        const lexiconId = resolveLexiconId(row);
        if (!lexiconId) {
          lexiconMorphologySkipped += 1;
          markSkipped(row, 'Missing ar_u_lexicon (direct or resolvable from morphology items).');
          lexiconMorphologyItems.push(row);
          continue;
        }

        let arUMorphology = asString(row['ar_u_morphology']);
        if (arUMorphology && !isLikelyHexId(arUMorphology)) {
          arUMorphology = null;
        }

        if (!arUMorphology) {
          const wordLocation = asString(row['word_location']);
          const sourceItem = wordLocation ? morphologyItemByWordLocation.get(wordLocation) ?? null : null;
          const sourceMorphology = asRecord(sourceItem?.['morphology']);
          const sourceMorphFeatures = asRecord(sourceMorphology?.['morph_features']);

          const surfaceAr =
            asString(row['surface_ar']) ??
            asString(sourceItem?.['surface_ar']) ??
            asString(sourceItem?.['lemma_ar']) ??
            '';
          const surfaceNorm =
            asString(row['surface_norm']) ??
            asString(sourceItem?.['surface_norm']) ??
            normalizeArabic(surfaceAr);
          const pos2 =
            normalizeMorphPos2(asString(row['pos2'])) ??
            normalizeMorphPos2(normalizeMorphPos(asString(row['pos']))) ??
            normalizeMorphPos2(normalizeMorphPos(asString(sourceItem?.['pos']))) ??
            'noun';
          const derivationTypeRaw = asString(row['derivation_type']);
          const derivationType =
            derivationTypeRaw && MORPH_DERIVATION_VALUES.has(derivationTypeRaw.toLowerCase())
              ? derivationTypeRaw.toLowerCase()
              : null;
          const nounNumberRaw = asString(row['noun_number']);
          const nounNumber =
            nounNumberRaw && MORPH_NOUN_NUMBER_VALUES.has(nounNumberRaw.toLowerCase())
              ? nounNumberRaw.toLowerCase()
              : null;
          const verbForm =
            normalizeVerbFormCode(asString(row['verb_form'])) ??
            normalizeVerbFormCode(asString(sourceMorphFeatures?.['form'])) ??
            null;
          const derivedFromVerbForm = normalizeVerbFormCode(asString(row['derived_from_verb_form']));
          const derivedPatternRaw = asString(row['derived_pattern']);
          const derivedPattern =
            derivedPatternRaw && MORPH_DERIVED_PATTERN_VALUES.has(derivedPatternRaw.toLowerCase())
              ? derivedPatternRaw.toLowerCase()
              : null;
          const transitivityRaw = asString(row['transitivity']);
          const transitivity =
            transitivityRaw && MORPH_TRANSITIVITY_VALUES.has(transitivityRaw.toLowerCase())
              ? transitivityRaw.toLowerCase()
              : null;
          const objCount = asInteger(row['obj_count']);
          const canonicalInput =
            asString(row['canonical_input']) ??
            buildMorphologyCanonicalInput({
              pos2,
              surfaceNorm,
              nounNumber,
              derivationType,
              verbForm,
              derivedFromVerbForm,
              derivedPattern,
              transitivity,
              objCount,
            });

          if (!surfaceAr || !surfaceNorm) {
            morphologySkipped += 1;
            lexiconMorphologySkipped += 1;
            markSkipped(row, 'surface_ar/surface_norm required to create ar_u_morphology.');
            lexiconMorphologyItems.push(row);
            continue;
          }

          const morphologyRow = await upsertArUMorphology(ctx.env.DB, {
            id: asString(row['ar_u_morphology']),
            canonicalInput,
            surfaceAr,
            surfaceNorm,
            pos2,
            derivationType,
            nounNumber,
            verbForm,
            derivedFromVerbForm,
            derivedPattern,
            transitivity,
            objCount,
            tagsAr: row['tags_ar'],
            tagsEn: row['tags_en'],
            notes: asString(row['notes']),
            meta: asRecord(row['meta']) ?? row['meta'],
          });
          arUMorphology = morphologyRow.ar_u_morphology;
          morphologyUpserted += 1;

          row['surface_ar'] = surfaceAr;
          row['surface_norm'] = surfaceNorm;
          row['pos2'] = pos2;
          if (canonicalInput) row['canonical_input'] = canonicalInput;
          if (derivationType) row['derivation_type'] = derivationType;
          if (nounNumber) row['noun_number'] = nounNumber;
          if (verbForm) row['verb_form'] = verbForm;
          if (derivedFromVerbForm) row['derived_from_verb_form'] = derivedFromVerbForm;
          if (derivedPattern) row['derived_pattern'] = derivedPattern;
          if (transitivity) row['transitivity'] = transitivity;
          if (objCount != null) row['obj_count'] = objCount;
        }

        if (!arUMorphology) {
          lexiconMorphologySkipped += 1;
          markSkipped(row, 'Missing ar_u_morphology.');
          lexiconMorphologyItems.push(row);
          continue;
        }

        const morphologyExists = await ctx.env.DB
          .prepare(`SELECT ar_u_morphology FROM ar_u_morphology WHERE ar_u_morphology = ?1 LIMIT 1`)
          .bind(arUMorphology)
          .first<any>();
        if (!morphologyExists) {
          lexiconMorphologySkipped += 1;
          markSkipped(row, 'Referenced ar_u_morphology does not exist.');
          lexiconMorphologyItems.push(row);
          continue;
        }

        const linkRole = pickEnum(asString(row['link_role']), LEXICON_MORPH_ROLE_VALUES, 'primary');
        await ctx.env.DB
          .prepare(
            `
            INSERT INTO ar_u_lexicon_morphology (
              ar_u_lexicon,
              ar_u_morphology,
              link_role
            ) VALUES (?1, ?2, ?3)
            ON CONFLICT(ar_u_lexicon, ar_u_morphology) DO UPDATE SET
              link_role = excluded.link_role
          `
          )
          .bind(lexiconId, arUMorphology, linkRole)
          .run();

        lexiconMorphologyUpserted += 1;
        delete row['_commit_status'];
        delete row['_commit_reason'];
        row['ar_u_lexicon'] = lexiconId;
        row['ar_u_morphology'] = arUMorphology;
        row['link_role'] = linkRole;
        lexiconMorphologyItems.push(row);
      }

      for (const rawEvidence of rawLexiconEvidence) {
        const row = asRecord(rawEvidence);
        if (!row) continue;

        const lexiconId = resolveLexiconId(row);
        if (!lexiconId) {
          lexiconEvidenceSkipped += 1;
          markSkipped(row, 'Missing ar_u_lexicon (direct or resolvable from morphology items).');
          evidenceItems.push(row);
          continue;
        }

        const locatorType = pickEnum(asString(row['locator_type']), EVIDENCE_LOCATOR_VALUES, 'chunk');
        const sourceId = asString(row['source_id']) ?? asString(row['ar_u_source']);
        const chunkId = asString(row['chunk_id']);
        const pageNo = asInteger(row['page_no']);
        const headingRaw = asString(row['heading_raw']);
        const headingNorm = asString(row['heading_norm']) ?? (headingRaw ? canonicalize(headingRaw) : null);
        const url = asString(row['url']);
        const appPayload = row['app_payload_json'] ?? row['app_payload'] ?? null;
        const sourceType = pickEnum(asString(row['source_type']), EVIDENCE_SOURCE_TYPE_VALUES, 'book');
        const rawLinkRole = asString(row['link_role']);
        const normalizedLinkRole =
          rawLinkRole && rawLinkRole.trim().toLowerCase() === 'verbal_idiom_note'
            ? 'usage'
            : rawLinkRole;
        const linkRole = pickEnum(normalizedLinkRole, EVIDENCE_LINK_ROLE_VALUES, 'supports');
        const evidenceKind = pickEnum(asString(row['evidence_kind']), EVIDENCE_KIND_VALUES, 'lexical');
        const evidenceStrength = pickEnum(
          asString(row['evidence_strength']),
          EVIDENCE_STRENGTH_VALUES,
          'supporting'
        );
        const extractText = asString(row['extract_text']);
        const noteMd = asString(row['note_md']) ?? asString(row['notes']);
        const meta = asRecord(row['meta']) ?? row['meta_json'] ?? null;

        if (locatorType === 'chunk' && (!sourceId || !chunkId)) {
          lexiconEvidenceSkipped += 1;
          markSkipped(row, 'chunk locator requires source_id and chunk_id.');
          evidenceItems.push(row);
          continue;
        }
        if (locatorType === 'url' && !url) {
          lexiconEvidenceSkipped += 1;
          markSkipped(row, 'url locator requires url.');
          evidenceItems.push(row);
          continue;
        }
        if (locatorType === 'app' && appPayload == null) {
          lexiconEvidenceSkipped += 1;
          markSkipped(row, 'app locator requires app_payload_json.');
          evidenceItems.push(row);
          continue;
        }

        let evidenceId = asString(row['evidence_id']);
        if (!evidenceId) {
          const canonicalEvidence = canonicalize(
            [
              'lexev',
              lexiconId,
              locatorType,
              sourceId ?? '',
              chunkId ?? '',
              pageNo ?? '',
              url ?? '',
              linkRole,
              evidenceKind,
              evidenceStrength,
              extractText ?? '',
            ].join('|')
          );
          evidenceId = await sha256Hex(canonicalEvidence);
        }

        await ctx.env.DB
          .prepare(
            `
            INSERT INTO ar_u_lexicon_evidence (
              ar_u_lexicon,
              evidence_id,
              locator_type,
              source_id,
              source_type,
              chunk_id,
              page_no,
              heading_raw,
              heading_norm,
              url,
              app_payload_json,
              link_role,
              evidence_kind,
              evidence_strength,
              extract_text,
              note_md,
              meta_json
            ) VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
            )
            ON CONFLICT(ar_u_lexicon, evidence_id) DO UPDATE SET
              locator_type = excluded.locator_type,
              source_id = excluded.source_id,
              source_type = excluded.source_type,
              chunk_id = excluded.chunk_id,
              page_no = excluded.page_no,
              heading_raw = excluded.heading_raw,
              heading_norm = excluded.heading_norm,
              url = excluded.url,
              app_payload_json = excluded.app_payload_json,
              link_role = excluded.link_role,
              evidence_kind = excluded.evidence_kind,
              evidence_strength = excluded.evidence_strength,
              extract_text = excluded.extract_text,
              note_md = excluded.note_md,
              meta_json = excluded.meta_json,
              updated_at = datetime('now')
          `
          )
          .bind(
            lexiconId,
            evidenceId,
            locatorType,
            sourceId,
            sourceType,
            chunkId,
            pageNo,
            headingRaw,
            headingNorm,
            url,
            toJsonTextOrNull(appPayload),
            linkRole,
            evidenceKind,
            evidenceStrength,
            extractText,
            noteMd,
            toJsonTextOrNull(meta)
          )
          .run();

        lexiconEvidenceUpserted += 1;
        delete row['_commit_status'];
        delete row['_commit_reason'];
        row['ar_u_lexicon'] = lexiconId;
        row['evidence_id'] = evidenceId;
        row['locator_type'] = locatorType;
        row['source_type'] = sourceType;
        row['link_role'] = linkRole;
        row['evidence_kind'] = evidenceKind;
        row['evidence_strength'] = evidenceStrength;
        evidenceItems.push(row);
      }

      const enriched = {
        ...taskJson,
        schema_version: taskJson.schema_version ?? 1,
        task_type: 'morphology',
        items,
        lexicon_evidence: evidenceItems,
        lexicon_morphology: lexiconMorphologyItems,
      };

      const taskId = `UT:${unitId}:${taskType}`;
      const enrichedForStorage = withWeeklyMeta(enriched, user.id, id);
      const taskJsonText = JSON.stringify(enrichedForStorage);
      const taskName = TASK_LABELS[taskType] ?? taskType;

      await ctx.env.DB
        .prepare(
          `
          INSERT INTO ar_container_unit_task (
            task_id, unit_id, task_type, task_name, task_json, status
          ) VALUES (?1, ?2, ?3, ?4, json(?5), 'draft')
          ON CONFLICT(unit_id, task_type)
          DO UPDATE SET
            task_name = excluded.task_name,
            task_json = excluded.task_json,
            status = excluded.status
        `
        )
        .bind(taskId, unitId, taskType, taskName, taskJsonText)
        .run();

      await ensureLessonWeeklyTask({
        db: ctx.env.DB,
        userId: user.id,
        lessonId: id,
        taskId,
        taskName,
        taskType,
        unitId,
        taskJson: enrichedForStorage,
        linkContext: {
          containerId,
          unitId,
          ref: asString(taskJson['ref']),
        },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          result: {
            task_json: enriched,
            lexicon_summary: {
              upserted: lexiconUpserted,
              skipped: lexiconSkipped,
              morphology_upserted: morphologyUpserted,
              morphology_skipped: morphologySkipped,
              lexicon_morphology_upserted: lexiconMorphologyUpserted,
              lexicon_morphology_skipped: lexiconMorphologySkipped,
              lexicon_evidence_upserted: lexiconEvidenceUpserted,
              lexicon_evidence_skipped: lexiconEvidenceSkipped,
            },
          },
        }),
        { headers: jsonHeaders }
      );
    }

    const rawItems = Array.isArray(taskJson.items) ? taskJson.items : [];
    if (!rawItems.length) {
      return new Response(JSON.stringify({ ok: false, error: 'task_json.items[] is required.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const items: SentenceItem[] = [];
    const occSentenceIds: string[] = [];
    const occGrammarIds: string[] = [];

    for (const rawItem of rawItems) {
      const item = asRecord(rawItem) ?? {};
      let canonicalSentence = asString(item.canonical_sentence) ?? '';
      if (!canonicalSentence) {
        const summary = asRecord(item.structure_summary) ?? {};
        canonicalSentence = asString(summary.full_text) ?? '';
      }
      if (!canonicalSentence) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Each item requires canonical_sentence.' }),
          { status: 400, headers: jsonHeaders }
        );
      }
      item.canonical_sentence = canonicalSentence;
      const summary = asRecord(item.structure_summary);
      if (summary && !asString(summary.full_text)) {
        summary.full_text = canonicalSentence;
      }
      const summaryForGrammar = summary ?? (looksLikeStructureSummary(item) ? item : null);

      const textNorm = canonicalize(canonicalSentence);
      const resolved = await upsertArUSentence(
        { DB: ctx.env.DB },
        {
          kind: 'surface',
          sequence: [textNorm],
          textAr: canonicalSentence,
          meta: { source: 'lesson-authoring', container_id: containerId, unit_id: unitId },
        }
      );
      const arUSentence = resolved.ar_u_sentence;

      const stepsRaw = Array.isArray(item.steps) ? item.steps : [];
      const steps: Array<Record<string, unknown>> = [];
      for (const rawStep of stepsRaw) {
        const step = asRecord(rawStep) ?? {};
        const grammarId = asString(step.grammar_id);
        let arUGrammar = asString(step.ar_u_grammar);
        if (grammarId) {
          if (!arUGrammar) {
            const resolvedGrammar = await upsertArUGrammar(
              { DB: ctx.env.DB },
              {
                grammarId,
                category: null,
                title: grammarId,
                titleAr: null,
                definition: null,
                definitionAr: null,
                meta: { source: 'lesson-authoring' },
              }
            );
            arUGrammar = resolvedGrammar.ar_u_grammar;
          }
          step.ar_u_grammar = arUGrammar;
        }
        steps.push(step);
      }

      const tokensRaw = Array.isArray(item.tokens) ? item.tokens : [];
      const tokens: Array<Record<string, unknown>> = [];
      for (let i = 0; i < tokensRaw.length; i += 1) {
        const token = asRecord(tokensRaw[i]) ?? {};
        const lemmaAr = asString(token.lemma) ?? asString(token.surface) ?? '';
        const lemmaNorm = canonicalize(lemmaAr || '');
        const pos = normalizeSentencePos(asString(token.pos), asString(token.pos_detail));
        const rootRaw = asString(token.root);
        let arURoot = asString(token.ar_u_root);
        let rootNorm: string | null = asString(token.root_norm);
        if (!rootNorm && rootRaw) {
          rootNorm = normalizeRoot(rootRaw);
          token.root_norm = rootNorm;
        }
        if (rootRaw && !arURoot) {
          const resolvedRoot = await upsertArURoot(
            { DB: ctx.env.DB },
            {
              root: rootRaw,
              rootNorm: rootNorm ?? normalizeRoot(rootRaw),
              meta: { source: 'lesson-authoring' },
            }
          );
          arURoot = resolvedRoot.ar_u_root;
          token.ar_u_root = arURoot;
        }
        let arUToken = asString(token.ar_u_token);
        if (!arUToken && lemmaAr) {
          const resolvedToken = await upsertArUToken(
            { DB: ctx.env.DB },
            {
              lemmaAr,
              lemmaNorm: lemmaNorm || lemmaAr,
              pos,
              rootNorm: rootNorm ?? null,
              arURoot: arURoot ?? null,
              features: token,
              meta: { source: 'lesson-authoring' },
            }
          );
          arUToken = resolvedToken.ar_u_token;
          token.ar_u_token = arUToken;
        }
        tokens.push(token);
      }

      const spansRaw = Array.isArray(item.spans) ? item.spans : [];
      const spans: Array<Record<string, unknown>> = [];
      for (let i = 0; i < spansRaw.length; i += 1) {
        const span = asRecord(spansRaw[i]) ?? {};
        spans.push(span);
      }

      const order = Number.isFinite(Number(item.sentence_order)) ? Number(item.sentence_order) : nextOrder(items);
      const occSentenceId = await sha256Hex(`occ_sentence|${containerId}|${unitId}|${order}|${canonicalSentence}`);

      await ctx.env.DB
        .prepare(
          `
          INSERT OR REPLACE INTO ar_occ_sentence (
            ar_sentence_occ_id, user_id, container_id, unit_id, sentence_order,
            text_ar, translation, notes, ar_u_sentence
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        `
        )
        .bind(
          occSentenceId,
          user.id,
          containerId,
          unitId,
          order,
          canonicalSentence,
          null,
          null,
          arUSentence
        )
        .run();

      const grammarRefs: GrammarRef[] = [];
      collectGrammarRefs(steps, grammarRefs);
      collectGrammarRefs(item['grammar_flow'], grammarRefs);
      collectGrammarFromSummary(summaryForGrammar, grammarRefs);
      const resolvedGrammar = new Map<string, string>();
      const insertedGrammar = new Set<string>();

      for (const ref of grammarRefs) {
        let arUGrammar = ref.arUGrammar;
        if (arUGrammar && !isLikelyArUGrammar(arUGrammar)) {
          if (!ref.grammarId) {
            ref.grammarId = arUGrammar;
          }
          arUGrammar = undefined;
        }
        if (!arUGrammar && ref.grammarId) {
          const cacheKey = `grammar:${ref.grammarId}`;
          arUGrammar = resolvedGrammar.get(cacheKey);
          if (!arUGrammar) {
            const resolvedGrammarRow = await upsertArUGrammar(
              { DB: ctx.env.DB },
              {
                grammarId: ref.grammarId,
                category: null,
                title: ref.grammarId,
                titleAr: null,
                definition: null,
                definitionAr: null,
                meta: { source: 'lesson-authoring' },
              }
            );
            arUGrammar = resolvedGrammarRow.ar_u_grammar;
            resolvedGrammar.set(cacheKey, arUGrammar);
          }
        }
        if (!arUGrammar) continue;
        if (ref.record && !asString(ref.record['ar_u_grammar'])) {
          ref.record['ar_u_grammar'] = arUGrammar;
        }
        if (insertedGrammar.has(arUGrammar)) continue;
        insertedGrammar.add(arUGrammar);
        const occGrammarId = await sha256Hex(`occ_grammar|${containerId}|${unitId}|occ_sentence|${occSentenceId}|${arUGrammar}`);
        await ctx.env.DB
          .prepare(
            `
            INSERT OR REPLACE INTO ar_occ_grammar (
              id, user_id, container_id, unit_id, ar_u_grammar, target_type, target_id, note, meta_json, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
          `
          )
          .bind(
            occGrammarId,
            user.id,
            containerId,
            unitId,
            arUGrammar,
            'occ_sentence',
            occSentenceId,
            null,
            null
          )
          .run();
        occGrammarIds.push(occGrammarId);
      }

      occSentenceIds.push(occSentenceId);

      items.push({
        ...item,
        sentence_order: order,
        canonical_sentence: canonicalSentence,
        ar_u_sentence: arUSentence,
        steps,
        text_norm: textNorm,
        tokens,
        spans,
      });
    }

    if (occSentenceIds.length) {
      const placeholders = occSentenceIds.map(() => '?').join(',');
      await ctx.env.DB
        .prepare(
          `
          DELETE FROM ar_occ_sentence
          WHERE container_id = ?1 AND unit_id = ?2
          AND ar_sentence_occ_id NOT IN (${placeholders})
        `
        )
        .bind(containerId, unitId, ...occSentenceIds)
        .run();

      await ctx.env.DB
        .prepare(
          `
          DELETE FROM ar_occ_grammar
          WHERE container_id = ?1 AND unit_id = ?2 AND target_type = 'occ_sentence'
          AND target_id NOT IN (${placeholders})
        `
        )
        .bind(containerId, unitId, ...occSentenceIds)
        .run();
    } else {
      await ctx.env.DB
        .prepare(
          `
          DELETE FROM ar_occ_sentence
          WHERE container_id = ?1 AND unit_id = ?2
        `
        )
        .bind(containerId, unitId)
        .run();
      await ctx.env.DB
        .prepare(
          `
          DELETE FROM ar_occ_grammar
          WHERE container_id = ?1 AND unit_id = ?2 AND target_type = 'occ_sentence'
        `
        )
        .bind(containerId, unitId)
        .run();
    }

    const enriched = {
      ...taskJson,
      schema_version: taskJson.schema_version ?? 1,
      task_type: 'sentence_structure',
      items,
    };

    const taskId = `UT:${unitId}:${taskType}`;
    const enrichedForStorage = withWeeklyMeta(enriched, user.id, id);
    const taskJsonText = JSON.stringify(enrichedForStorage);
    const taskName = TASK_LABELS[taskType] ?? taskType;

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_container_unit_task (
          task_id, unit_id, task_type, task_name, task_json, status
        ) VALUES (?1, ?2, ?3, ?4, json(?5), 'draft')
        ON CONFLICT(unit_id, task_type)
        DO UPDATE SET
          task_name = excluded.task_name,
          task_json = excluded.task_json,
          status = excluded.status
      `
      )
      .bind(taskId, unitId, taskType, taskName, taskJsonText)
      .run();

    await ensureLessonWeeklyTask({
      db: ctx.env.DB,
      userId: user.id,
      lessonId: id,
      taskId,
      taskName,
      taskType,
      unitId,
      taskJson: enrichedForStorage,
      linkContext: {
        containerId,
        unitId,
        ref: asString(taskJson['ref']),
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          task_json: enriched,
          occ_summary: {
            sentences_upserted: items.length,
            grammar_upserted: occGrammarIds.length,
          },
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
