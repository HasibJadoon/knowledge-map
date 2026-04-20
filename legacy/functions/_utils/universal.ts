/**
 * Shared helpers for the `ar_u_*` tables in Workers/D1.
 * Provides canonicalization, SHA-256 IDs, and helper helpers for inserts/upserts.
 */
import { D1Database } from '@cloudflare/workers-types';

const allowedPos = ['verb', 'noun', 'adj', 'particle', 'phrase'] as const;

export type EnvCommon = {
  DB: D1Database;
};

export function canonicalize(input: string): string {
  let s = input.replace(/\s+/g, ' ').trim();
  s = s.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
  return s;
}

const GRAMMAR_LATN_DIACRITICS_RE = /[\u0300-\u036f]/g;
const GRAMMAR_LATN_PUNCT_RE = /[\u02bb\u02bf\u02bc\u02b9\u02ca\u02cb\u02c8\u02cc\u2018\u2019\u2032\u0060\u00b4]/g;

export function normalizeGrammarKey(input: string): string {
  const raw = input.split('|').pop() ?? input;
  return raw
    .normalize('NFKD')
    .replace(GRAMMAR_LATN_DIACRITICS_RE, '')
    .replace(GRAMMAR_LATN_PUNCT_RE, '')
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-z0-9_]+/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeLookupKey(input: string): string {
  const ascii = normalizeGrammarKey(input);
  if (ascii) return ascii;
  return input.normalize('NFKC').trim();
}

function mergeLookupKeys(existingJson: string | null, keys: string[]): string | null {
  const merged = new Set<string>();
  if (existingJson) {
    try {
      const parsed = JSON.parse(existingJson);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (typeof entry === 'string' && entry.trim()) {
            merged.add(entry.trim());
          }
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }
  for (const key of keys) {
    if (key) merged.add(key);
  }
  if (!merged.size) return null;
  return JSON.stringify(Array.from(merged));
}

function buildGrammarLookupKeys(payload: ArUGrammarPayload, canonicalNorm: string | null) {
  const keys = new Set<string>();
  if (canonicalNorm) keys.add(canonicalNorm);
  const grammarKey = normalizeLookupKey(payload.grammarId);
  if (grammarKey) keys.add(grammarKey);
  if (payload.title) {
    const titleKey = normalizeLookupKey(payload.title);
    if (titleKey) keys.add(titleKey);
  }
  if (payload.titleAr) {
    const titleArKey = normalizeLookupKey(payload.titleAr);
    if (titleArKey) keys.add(titleArKey);
  }
  return Array.from(keys);
}

export async function sha256Hex(input: string): Promise<string> {
  const canonical = canonicalize(input);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const Canon = {
  root(rootNorm: string) {
    return `ROOT|${rootNorm}`;
  },

  token(args: {
    lemmaNorm: string;
    pos: (typeof allowedPos)[number];
    rootNorm?: string | null;
  }) {
    return `TOK|${args.lemmaNorm}|${args.pos}|${args.rootNorm ?? ''}`;
  },

  sentence(args: { kind: string; sequence: string[] }) {
    return `SENT|${args.kind}|${args.sequence.join(';')}`;
  },

  lexicon(args: {
    lemmaNorm: string;
    pos: (typeof allowedPos)[number];
    rootNorm?: string | null;
    valencyId?: string | null;
    senseKey: string;
  }) {
    return `LEX|${args.lemmaNorm}|${args.pos}|${args.rootNorm ?? ''}|${args.valencyId ?? ''}|${args.senseKey}`;
  },

  grammar(grammarId: string) {
    return `GRAM|${grammarId}`;
  },

  synset(args: { synsetKey: string }) {
    return `SYN|${args.synsetKey}`;
  },

  synsetMember(args: { synsetId: string; tokenId: string }) {
    return `SYNM|${args.synsetId}|${args.tokenId}`;
  },
} as const;

export async function universalId(canonicalInput: string) {
  const canonical = canonicalize(canonicalInput);
  const id = await sha256Hex(canonical);
  return { id, canonical_input: canonical };
}

export function toJsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.stringify(value);
}

export interface ArURootPayload {
  root: string;
  rootLatn?: string | null;
  rootNorm: string;
  arabicTrilateral?: string | null;
  englishTrilateral?: string | null;
  altLatn?: unknown[] | null;
  searchKeys?: string | null;
  status?: string;
  difficulty?: number | null;
  frequency?: string | null;
  extractedAt?: string | null;
  meta?: unknown;
}

export async function upsertArURoot(env: EnvCommon, payload: ArURootPayload) {
  if (!payload.rootNorm) {
    throw new Error('rootNorm is required to build canonical input');
  }

  const canonical = Canon.root(payload.rootNorm);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);
  const altJson = toJsonOrNull(payload.altLatn);

  await env.DB.prepare(`
    INSERT INTO ar_u_roots (
      ar_u_root, canonical_input, root,
      arabic_trilateral, english_trilateral,
      root_latn, root_norm, alt_latn_json, search_keys_norm,
      status, difficulty, frequency,
      extracted_at, meta_json
    ) VALUES (
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(ar_u_root) DO UPDATE SET
      root = excluded.root,
      arabic_trilateral = excluded.arabic_trilateral,
      english_trilateral = excluded.english_trilateral,
      root_latn = excluded.root_latn,
      root_norm = excluded.root_norm,
      alt_latn_json = excluded.alt_latn_json,
      search_keys_norm = excluded.search_keys_norm,
      status = excluded.status,
      difficulty = excluded.difficulty,
      frequency = excluded.frequency,
      extracted_at = excluded.extracted_at,
      meta_json = excluded.meta_json,
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      payload.root,
      payload.arabicTrilateral ?? null,
      payload.englishTrilateral ?? null,
      payload.rootLatn ?? null,
      payload.rootNorm,
      altJson,
      payload.searchKeys ?? null,
      payload.status ?? 'active',
      payload.difficulty ?? null,
      payload.frequency ?? null,
      payload.extractedAt ?? null,
      metaJson
    )
    .run();

  return { ar_u_root: id, canonical_input };
}

export interface ArUTokenPayload {
  lemmaAr: string;
  lemmaNorm: string;
  pos: (typeof allowedPos)[number];
  rootNorm?: string | null;
  arURoot?: string | null;
  features?: unknown;
  meta?: unknown;
}

export async function upsertArUToken(env: EnvCommon, payload: ArUTokenPayload) {
  const canonical = Canon.token({
    lemmaNorm: payload.lemmaNorm,
    pos: payload.pos,
    rootNorm: payload.rootNorm ?? '',
  });
  const { id, canonical_input } = await universalId(canonical);
  const featuresJson = toJsonOrNull(payload.features);
  const metaJson = toJsonOrNull(payload.meta);

  await env.DB.prepare(`
    INSERT INTO ar_u_tokens (
      ar_u_token, canonical_input,
      lemma_ar, lemma_norm, pos,
      root_norm, ar_u_root,
      features_json, meta_json
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?
    )
    ON CONFLICT(ar_u_token) DO UPDATE SET
      lemma_ar = excluded.lemma_ar,
      lemma_norm = excluded.lemma_norm,
      pos = excluded.pos,
      root_norm = excluded.root_norm,
      ar_u_root = excluded.ar_u_root,
      features_json = excluded.features_json,
      meta_json = excluded.meta_json,
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      payload.lemmaAr,
      payload.lemmaNorm,
      payload.pos,
      payload.rootNorm ?? null,
      payload.arURoot ?? null,
      featuresJson,
      metaJson
    )
    .run();

  return { ar_u_token: id, canonical_input };
}

export interface ArUSentencePayload {
  kind: string;
  sequence: string[];
  textAr?: string | null;
  meta?: unknown;
}

export async function upsertArUSentence(env: EnvCommon, payload: ArUSentencePayload) {
  const canonical = Canon.sentence({ kind: payload.kind, sequence: payload.sequence });
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);
  const sequenceJson = JSON.stringify(payload.sequence);

  await env.DB.prepare(`
    INSERT INTO ar_u_sentences (
      ar_u_sentence, canonical_input,
      sentence_kind, sequence_json, text_ar,
      meta_json
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(ar_u_sentence) DO UPDATE SET
      sentence_kind = excluded.sentence_kind,
      sequence_json = excluded.sequence_json,
      text_ar = excluded.text_ar,
      meta_json = excluded.meta_json,
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      payload.kind,
      sequenceJson,
      payload.textAr ?? null,
      metaJson
    )
    .run();

  return { ar_u_sentence: id, canonical_input };
}

export interface ArULexiconPayload {
  unitType?: 'word' | 'key_term' | 'verbal_idiom' | 'expression';
  surfaceAr?: string;
  surfaceNorm?: string;
  lemmaAr: string;
  lemmaNorm: string;
  pos: (typeof allowedPos)[number];
  rootNorm?: string | null;
  arURoot?: string | null;
  valencyId?: string | null;
  senseKey: string;
  meanings?: unknown[] | null;
  synonyms?: unknown[] | null;
  antonyms?: unknown[] | null;
  glossPrimary?: string | null;
  glossSecondary?: string[] | null;
  usageNotes?: string | null;
  morphPattern?: string | null;
  morphFeatures?: unknown | null;
  morphDerivations?: unknown[] | null;
  expressionType?: string | null;
  expressionText?: string | null;
  expressionTokenRange?: unknown | null;
  expressionMeaning?: string | null;
  references?: unknown[] | null;
  flags?: unknown[] | null;
  cards?: unknown[] | null;
  status?: string;
  meta?: unknown;
}

export async function upsertArULexicon(env: EnvCommon, payload: ArULexiconPayload) {
  const canonical = Canon.lexicon({
    lemmaNorm: payload.lemmaNorm,
    pos: payload.pos,
    rootNorm: payload.rootNorm ?? '',
    valencyId: payload.valencyId ?? '',
    senseKey: payload.senseKey,
  });
  const { id, canonical_input } = await universalId(canonical);
  const unitType = payload.unitType ?? 'word';
  const surfaceAr = payload.surfaceAr ?? payload.lemmaAr;
  const surfaceNorm = payload.surfaceNorm ?? payload.lemmaNorm;
  const meaningsJson = toJsonOrNull(payload.meanings);
  const synonymsJson = toJsonOrNull(payload.synonyms);
  const antonymsJson = toJsonOrNull(payload.antonyms);
  const glossSecondaryJson = toJsonOrNull(payload.glossSecondary);
  const cardsJson = toJsonOrNull(payload.cards);
  const metaJson = toJsonOrNull(payload.meta);
  const morphFeaturesJson = toJsonOrNull(payload.morphFeatures);
  const morphDerivationsJson = toJsonOrNull(payload.morphDerivations);
  const expressionTokenRangeJson = toJsonOrNull(payload.expressionTokenRange);
  const referencesJson = toJsonOrNull(payload.references);
  const flagsJson = toJsonOrNull(payload.flags);

  await env.DB.prepare(`
    INSERT INTO ar_u_lexicon (
      ar_u_lexicon, canonical_input,
      unit_type, surface_ar, surface_norm,
      lemma_ar, lemma_norm, pos,
      root_norm, ar_u_root,
      valency_id, sense_key,
      meanings_json, synonyms_json, antonyms_json,
      gloss_primary, gloss_secondary_json, usage_notes,
      morph_pattern, morph_features_json, morph_derivations_json,
      expression_type, expression_text, expression_token_range_json, expression_meaning,
      references_json, flags_json,
      cards_json, meta_json,
      status
    ) VALUES (
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?
    )
    ON CONFLICT(ar_u_lexicon) DO UPDATE SET
      unit_type = excluded.unit_type,
      surface_ar = excluded.surface_ar,
      surface_norm = excluded.surface_norm,
      lemma_ar = excluded.lemma_ar,
      lemma_norm = excluded.lemma_norm,
      pos = excluded.pos,
      root_norm = excluded.root_norm,
      ar_u_root = excluded.ar_u_root,
      valency_id = excluded.valency_id,
      sense_key = excluded.sense_key,
      meanings_json = excluded.meanings_json,
      synonyms_json = excluded.synonyms_json,
      antonyms_json = excluded.antonyms_json,
      gloss_primary = excluded.gloss_primary,
      gloss_secondary_json = excluded.gloss_secondary_json,
      usage_notes = excluded.usage_notes,
      morph_pattern = excluded.morph_pattern,
      morph_features_json = excluded.morph_features_json,
      morph_derivations_json = excluded.morph_derivations_json,
      expression_type = excluded.expression_type,
      expression_text = excluded.expression_text,
      expression_token_range_json = excluded.expression_token_range_json,
      expression_meaning = excluded.expression_meaning,
      references_json = excluded.references_json,
      flags_json = excluded.flags_json,
      cards_json = excluded.cards_json,
      meta_json = excluded.meta_json,
      status = excluded.status,
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      unitType,
      surfaceAr,
      surfaceNorm,
      payload.lemmaAr,
      payload.lemmaNorm,
      payload.pos,
      payload.rootNorm ?? null,
      payload.arURoot ?? null,
      payload.valencyId ?? null,
      payload.senseKey,
      meaningsJson,
      synonymsJson,
      antonymsJson,
      payload.glossPrimary ?? null,
      glossSecondaryJson,
      payload.usageNotes ?? null,
      payload.morphPattern ?? null,
      morphFeaturesJson,
      morphDerivationsJson,
      payload.expressionType ?? null,
      payload.expressionText ?? null,
      expressionTokenRangeJson,
      payload.expressionMeaning ?? null,
      referencesJson,
      flagsJson,
      cardsJson,
      metaJson,
      payload.status ?? 'active'
    )
    .run();

  return { ar_u_lexicon: id, canonical_input };
}

export interface ArUGrammarPayload {
  grammarId: string;
  category?: string | null;
  title?: string | null;
  titleAr?: string | null;
  definition?: string | null;
  definitionAr?: string | null;
  meta?: unknown;
}

export async function upsertArUGrammar(env: EnvCommon, payload: ArUGrammarPayload) {
  if (!payload.grammarId) {
    throw new Error('grammarId is required');
  }
  const canonicalNormRaw = normalizeGrammarKey(payload.grammarId);
  const canonicalNorm = canonicalNormRaw ? canonicalNormRaw : null;
  const lookupKeys = buildGrammarLookupKeys(payload, canonicalNorm);
  const lookupKeysJson = lookupKeys.length ? JSON.stringify(lookupKeys) : null;
  const existing = await env.DB.prepare(
    `SELECT ar_u_grammar, canonical_input, canonical_norm, lookup_keys_json
     FROM ar_u_grammar WHERE grammar_id = ?1`
  )
    .bind(payload.grammarId)
    .first<{ ar_u_grammar: string; canonical_input: string; canonical_norm: string | null; lookup_keys_json: string | null }>();
  if (existing?.ar_u_grammar) {
    const metaJson = toJsonOrNull(payload.meta);
    const nextCanonicalNorm = existing.canonical_norm || canonicalNorm;
    const nextLookupJson = mergeLookupKeys(existing.lookup_keys_json, lookupKeys);
    await env.DB.prepare(
      `
      UPDATE ar_u_grammar
      SET category = COALESCE(?2, category),
          title = COALESCE(?3, title),
          title_ar = COALESCE(?4, title_ar),
          definition = COALESCE(?5, definition),
          definition_ar = COALESCE(?6, definition_ar),
          meta_json = COALESCE(?7, meta_json),
          canonical_norm = COALESCE(?8, canonical_norm),
          lookup_keys_json = COALESCE(?9, lookup_keys_json),
          updated_at = datetime('now')
      WHERE ar_u_grammar = ?1
    `
    )
      .bind(
        existing.ar_u_grammar,
        payload.category ?? null,
        payload.title ?? null,
        payload.titleAr ?? null,
        payload.definition ?? null,
        payload.definitionAr ?? null,
        metaJson,
        nextCanonicalNorm,
        nextLookupJson
      )
      .run();
    return { ar_u_grammar: existing.ar_u_grammar, canonical_input: existing.canonical_input };
  }
  const lookupKey = canonicalNorm ?? normalizeLookupKey(payload.grammarId);
  if (lookupKey) {
    const byNorm = await env.DB.prepare(
      `
      SELECT ar_u_grammar, canonical_input, canonical_norm, lookup_keys_json
      FROM ar_u_grammar
      WHERE canonical_norm = ?1
         OR (lookup_keys_json IS NOT NULL AND EXISTS (
              SELECT 1 FROM json_each(lookup_keys_json) WHERE value = ?1
            ))
      LIMIT 1
    `
    )
      .bind(lookupKey)
      .first<{ ar_u_grammar: string; canonical_input: string; canonical_norm: string | null; lookup_keys_json: string | null }>();
    if (byNorm?.ar_u_grammar) {
      const metaJson = toJsonOrNull(payload.meta);
      const nextCanonicalNorm = byNorm.canonical_norm || canonicalNorm;
      const nextLookupJson = mergeLookupKeys(byNorm.lookup_keys_json, lookupKeys);
      await env.DB.prepare(
        `
        UPDATE ar_u_grammar
        SET category = COALESCE(?2, category),
            title = COALESCE(?3, title),
            title_ar = COALESCE(?4, title_ar),
            definition = COALESCE(?5, definition),
            definition_ar = COALESCE(?6, definition_ar),
            meta_json = COALESCE(?7, meta_json),
            canonical_norm = COALESCE(?8, canonical_norm),
            lookup_keys_json = COALESCE(?9, lookup_keys_json),
            updated_at = datetime('now')
        WHERE ar_u_grammar = ?1
      `
      )
        .bind(
          byNorm.ar_u_grammar,
          payload.category ?? null,
          payload.title ?? null,
          payload.titleAr ?? null,
          payload.definition ?? null,
          payload.definitionAr ?? null,
          metaJson,
          nextCanonicalNorm,
          nextLookupJson
        )
        .run();
      return { ar_u_grammar: byNorm.ar_u_grammar, canonical_input: byNorm.canonical_input };
    }
  }
  const canonical = Canon.grammar(payload.grammarId);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);

  await env.DB.prepare(`
    INSERT INTO ar_u_grammar (
      ar_u_grammar, canonical_input,
      grammar_id, category, title, title_ar,
      definition, definition_ar,
      meta_json, canonical_norm, lookup_keys_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(grammar_id) DO UPDATE SET
      category = COALESCE(excluded.category, category),
      title = COALESCE(excluded.title, title),
      title_ar = COALESCE(excluded.title_ar, title_ar),
      definition = COALESCE(excluded.definition, definition),
      definition_ar = COALESCE(excluded.definition_ar, definition_ar),
      meta_json = COALESCE(excluded.meta_json, meta_json),
      canonical_norm = COALESCE(canonical_norm, excluded.canonical_norm),
      lookup_keys_json = COALESCE(lookup_keys_json, excluded.lookup_keys_json),
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      payload.grammarId,
      payload.category ?? null,
      payload.title ?? null,
      payload.titleAr ?? null,
      payload.definition ?? null,
      payload.definitionAr ?? null,
      metaJson,
      canonicalNorm,
      lookupKeysJson
    )
    .run();

  return { ar_u_grammar: id, canonical_input };
}
