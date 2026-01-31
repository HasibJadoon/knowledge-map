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

  span(spanType: string, tokenIds: string[]) {
    return `SPAN|${spanType}|${tokenIds.join(',')}`;
  },

  sentence(args: { kind: string; sequence: string[] }) {
    return `SENT|${args.kind}|${args.sequence.join(';')}`;
  },

  valency(args: {
    verbLemmaNorm: string;
    prepTokenId: string;
    frameType: 'REQ_PREP' | 'ALT_PREP' | 'OPTIONAL_PREP';
  }) {
    return `VAL|${args.verbLemmaNorm}|${args.prepTokenId}|${args.frameType}`;
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
  family?: string | null;
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

function mergeMeta(payload: ArURootPayload) {
  const base =
    typeof payload.meta === 'object' && payload.meta !== null && !Array.isArray(payload.meta)
      ? { ...payload.meta }
      : {};
  let dirty = Object.keys(base).length > 0;

  if (payload.family !== undefined) {
    dirty = true;
    if (payload.family === null) {
      delete base.family;
    } else {
      base.family = payload.family;
    }
  }

  if (!dirty) {
    return null;
  }

  return base;
}

export async function upsertArURoot(env: EnvCommon, payload: ArURootPayload) {
  if (!payload.rootNorm) {
    throw new Error('rootNorm is required to build canonical input');
  }

  const canonical = Canon.root(payload.rootNorm);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(mergeMeta(payload));
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

export interface ArUSpanPayload {
  spanType: string;
  tokenIds: string[];
  meta?: unknown;
}

export async function upsertArUSpan(env: EnvCommon, payload: ArUSpanPayload) {
  const canonical = Canon.span(payload.spanType, payload.tokenIds);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);
  const tokenCsv = payload.tokenIds.join(',');

  await env.DB.prepare(`
    INSERT INTO ar_u_spans (
      ar_u_span, canonical_input,
      span_type, token_ids_csv,
      meta_json
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(ar_u_span) DO UPDATE SET
      span_type = excluded.span_type,
      token_ids_csv = excluded.token_ids_csv,
      meta_json = excluded.meta_json,
      updated_at = datetime('now')
  `)
    .bind(id, canonical_input, payload.spanType, tokenCsv, metaJson)
    .run();

  return { ar_u_span: id, canonical_input };
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
  lemmaAr: string;
  lemmaNorm: string;
  pos: (typeof allowedPos)[number];
  rootNorm?: string | null;
  arURoot?: string | null;
  valencyId?: string | null;
  senseKey: string;
  glossPrimary?: string | null;
  glossSecondary?: string[] | null;
  usageNotes?: string | null;
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
  const glossSecondaryJson = toJsonOrNull(payload.glossSecondary);
  const cardsJson = toJsonOrNull(payload.cards);
  const metaJson = toJsonOrNull(payload.meta);

  await env.DB.prepare(`
    INSERT INTO ar_u_lexicon (
      ar_u_lexicon, canonical_input,
      lemma_ar, lemma_norm, pos,
      root_norm, ar_u_root,
      valency_id, sense_key, gloss_primary,
      gloss_secondary_json, usage_notes,
      cards_json, meta_json,
      status
    ) VALUES (
      ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?
    )
    ON CONFLICT(ar_u_lexicon) DO UPDATE SET
      lemma_ar = excluded.lemma_ar,
      lemma_norm = excluded.lemma_norm,
      pos = excluded.pos,
      root_norm = excluded.root_norm,
      ar_u_root = excluded.ar_u_root,
      valency_id = excluded.valency_id,
      sense_key = excluded.sense_key,
      gloss_primary = excluded.gloss_primary,
      gloss_secondary_json = excluded.gloss_secondary_json,
      usage_notes = excluded.usage_notes,
      cards_json = excluded.cards_json,
      meta_json = excluded.meta_json,
      status = excluded.status,
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
      payload.valencyId ?? null,
      payload.senseKey,
      payload.glossPrimary ?? null,
      glossSecondaryJson,
      payload.usageNotes ?? null,
      cardsJson,
      metaJson,
      payload.status ?? 'active'
    )
    .run();

  return { ar_u_lexicon: id, canonical_input };
}

export interface ArUValencyPayload {
  verbLemmaAr: string;
  verbLemmaNorm: string;
  prepTokenId: string;
  frameType: 'REQ_PREP' | 'ALT_PREP' | 'OPTIONAL_PREP';
  meta?: unknown;
}

export async function upsertArUValency(env: EnvCommon, payload: ArUValencyPayload) {
  const canonical = Canon.valency(payload);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);

  await env.DB.prepare(`
    INSERT INTO ar_u_valency (
      ar_u_valency, canonical_input,
      verb_lemma_ar, verb_lemma_norm,
      prep_ar_u_token, frame_type,
      meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ar_u_valency) DO UPDATE SET
      verb_lemma_ar = excluded.verb_lemma_ar,
      verb_lemma_norm = excluded.verb_lemma_norm,
      prep_ar_u_token = excluded.prep_ar_u_token,
      frame_type = excluded.frame_type,
      meta_json = excluded.meta_json,
      updated_at = datetime('now')
  `)
    .bind(
      id,
      canonical_input,
      payload.verbLemmaAr,
      payload.verbLemmaNorm,
      payload.prepTokenId,
      payload.frameType,
      metaJson
    )
    .run();

  return { ar_u_valency: id, canonical_input };
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
  const canonical = Canon.grammar(payload.grammarId);
  const { id, canonical_input } = await universalId(canonical);
  const metaJson = toJsonOrNull(payload.meta);

  await env.DB.prepare(`
    INSERT INTO ar_u_grammar (
      ar_u_grammar, canonical_input,
      grammar_id, category, title, title_ar,
      definition, definition_ar,
      meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ar_u_grammar) DO UPDATE SET
      grammar_id = excluded.grammar_id,
      category = excluded.category,
      title = excluded.title,
      title_ar = excluded.title_ar,
      definition = excluded.definition,
      definition_ar = excluded.definition_ar,
      meta_json = excluded.meta_json,
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
      metaJson
    )
    .run();

  return { ar_u_grammar: id, canonical_input };
}
