import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type SynonymWordEntry = {
  topic_id: string | null;
  word_norm: string | null;
  word_ar: string | null;
  word_en: string | null;
  root_norm: string | null;
  root_ar: string | null;
  order_index: number | null;
};

type SynonymTopicEntry = {
  topic_id: string;
  topic_en: string;
  topic_ur: string | null;
  meta: unknown;
};

type LexiconMorphologyPayload = {
  ar_u_lexicon: string;
  lemma_ar: string | null;
  lemma_norm: string | null;
  root_norm: string | null;
  pos: string | null;
  morph_pattern: string | null;
  morph_features: unknown;
  morph_derivations: unknown;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_TATWEEL_RE = /\u0640/g;
const ARABIC_NON_LETTERS_RE = /[^\u0621-\u063A\u0641-\u064A]/g;

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
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

function parseTopicIds(url: URL): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (value: unknown) => {
    const next = normalizeString(value);
    if (!next || seen.has(next)) return;
    seen.add(next);
    out.push(next);
  };

  const single = normalizeString(url.searchParams.get('topic_id'));
  if (single) {
    for (const part of single.split(',')) push(part);
  }

  const topicIdsParam = normalizeString(url.searchParams.get('topic_ids'));
  if (topicIdsParam) {
    for (const part of topicIdsParam.split(',')) push(part);
  }

  return out;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toSynonymWordEntry(value: unknown): SynonymWordEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (typeof value === 'string') {
      const text = normalizeString(value);
      if (!text) return null;
      return {
        topic_id: null,
        word_norm: normalizeSynonymWord(text) ?? text,
        word_ar: null,
        word_en: text,
        root_norm: null,
        root_ar: null,
        order_index: null,
      };
    }
    return null;
  }

  const row = value as Record<string, unknown>;
  return {
    topic_id: normalizeString(row['topic_id']) || null,
    word_norm: normalizeString(row['word_norm']) || null,
    word_ar: normalizeString(row['word_ar']) || null,
    word_en: normalizeString(row['word_en']) || null,
    root_norm: normalizeString(row['root_norm']) || null,
    root_ar: normalizeString(row['root_ar']) || null,
    order_index: toNumber(row['order_index']),
  };
}

function parseLexiconSynonymsJson(value: string | null): SynonymWordEntry[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry) => toSynonymWordEntry(entry)).filter((entry): entry is SynonymWordEntry => Boolean(entry));
}

function parseLexiconMorphologyRow(row: {
  ar_u_lexicon: string;
  lemma_norm: string | null;
  lemma_ar: string | null;
  root_norm: string | null;
  pos: string | null;
  morph_pattern: string | null;
  morph_features_json: string | null;
  morph_derivations_json: string | null;
}): LexiconMorphologyPayload {
  return {
    ar_u_lexicon: normalizeString(row.ar_u_lexicon),
    lemma_ar: normalizeString(row.lemma_ar) || null,
    lemma_norm: normalizeString(row.lemma_norm) || null,
    root_norm: normalizeString(row.root_norm) || null,
    pos: normalizeString(row.pos) || null,
    morph_pattern: normalizeString(row.morph_pattern) || null,
    morph_features: parseJson(row.morph_features_json),
    morph_derivations: parseJson(row.morph_derivations_json),
  };
}

function dedupeSynonymEntries(entries: SynonymWordEntry[]): SynonymWordEntry[] {
  const out: SynonymWordEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const hasWord = normalizeString(entry.word_norm) || normalizeString(entry.word_ar) || normalizeString(entry.word_en);
    if (!hasWord) continue;
    const key = [
      normalizeString(entry.topic_id),
      normalizeSynonymWord(entry.word_norm),
      normalizeString(entry.word_ar),
      normalizeString(entry.word_en),
      normalizeString(entry.root_norm),
      normalizeString(entry.root_ar),
    ].join('|');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }

  return out;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const arULexicon = normalizeString(url.searchParams.get('ar_u_lexicon'));
    const includeSelfRaw = normalizeString(url.searchParams.get('include_self')).toLowerCase();
    const includeSelf = includeSelfRaw === '1' || includeSelfRaw === 'true' || includeSelfRaw === 'yes';

    let lookupWordNorm =
      normalizeSynonymWord(url.searchParams.get('word_norm')) ??
      normalizeSynonymWord(url.searchParams.get('lemma_norm')) ??
      normalizeSynonymWord(url.searchParams.get('lemma_ar')) ??
      '';

    let lexiconSynonyms: SynonymWordEntry[] = [];
    let lexicon: LexiconMorphologyPayload | null = null;
    if (arULexicon) {
      const lexiconRow = await ctx.env.DB.prepare(
        `
        SELECT
          ar_u_lexicon,
          lemma_norm,
          lemma_ar,
          root_norm,
          pos,
          morph_pattern,
          morph_features_json,
          morph_derivations_json,
          synonyms_json
        FROM ar_u_lexicon
        WHERE ar_u_lexicon = ?1
      `
      ).bind(arULexicon).first<{
        ar_u_lexicon: string;
        lemma_norm: string | null;
        lemma_ar: string | null;
        root_norm: string | null;
        pos: string | null;
        morph_pattern: string | null;
        morph_features_json: string | null;
        morph_derivations_json: string | null;
        synonyms_json: string | null;
      }>();

      if (!lexiconRow) {
        return new Response(JSON.stringify({ ok: false, error: 'Lexicon row not found.' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }

      if (!lookupWordNorm) {
        lookupWordNorm = normalizeSynonymWord(lexiconRow.lemma_norm) ?? normalizeSynonymWord(lexiconRow.lemma_ar) ?? '';
      }
      lexicon = parseLexiconMorphologyRow(lexiconRow);
      lexiconSynonyms = parseLexiconSynonymsJson(lexiconRow.synonyms_json);
    }

    const requestedTopicIds = parseTopicIds(url);
    let topicIds = requestedTopicIds;
    if (!topicIds.length && lookupWordNorm) {
      const { results = [] } = await ctx.env.DB.prepare(
        `
        SELECT DISTINCT topic_id
        FROM ar_quran_synonym_topic_words
        WHERE word_norm = ?1
        ORDER BY topic_id ASC
      `
      ).bind(lookupWordNorm).all<{ topic_id: string | null }>();

      topicIds = results
        .map((row) => normalizeString(row?.topic_id))
        .filter(Boolean);
    }

    if (!topicIds.length && !lexiconSynonyms.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          query: {
            ar_u_lexicon: arULexicon || null,
            lookup_word_norm: lookupWordNorm || null,
            include_self: includeSelf,
          },
          topic_ids: [],
          topics: [],
          entries: [],
          synonyms_json: [],
          lexicon,
        }),
        { headers: jsonHeaders }
      );
    }

    let entries: SynonymWordEntry[] = [];
    let topics: SynonymTopicEntry[] = [];

    if (topicIds.length) {
      const placeholders = topicIds.map((_, idx) => `?${idx + 1}`).join(',');

      const wordRows = await ctx.env.DB.prepare(
        `
        SELECT topic_id, word_norm, word_ar, word_en, root_norm, root_ar, order_index
        FROM ar_quran_synonym_topic_words
        WHERE topic_id IN (${placeholders})
        ORDER BY topic_id ASC, order_index ASC, word_norm ASC
      `
      ).bind(...topicIds).all<SynonymWordEntry>();

      entries = (wordRows.results ?? []).map((row) => ({
        topic_id: normalizeString(row.topic_id) || null,
        word_norm: normalizeString(row.word_norm) || null,
        word_ar: normalizeString(row.word_ar) || null,
        word_en: normalizeString(row.word_en) || null,
        root_norm: normalizeString(row.root_norm) || null,
        root_ar: normalizeString(row.root_ar) || null,
        order_index: toNumber(row.order_index),
      }));

      const topicRows = await ctx.env.DB.prepare(
        `
        SELECT topic_id, topic_en, topic_ur, meta_json
        FROM ar_quran_synonym_topics
        WHERE topic_id IN (${placeholders})
        ORDER BY topic_id ASC
      `
      ).bind(...topicIds).all<{
        topic_id: string;
        topic_en: string;
        topic_ur: string | null;
        meta_json: string | null;
      }>();

      topics = (topicRows.results ?? []).map((row) => ({
        topic_id: normalizeString(row.topic_id),
        topic_en: normalizeString(row.topic_en),
        topic_ur: normalizeString(row.topic_ur) || null,
        meta: parseJson(row.meta_json),
      }));
    }

    const merged = dedupeSynonymEntries([...entries, ...lexiconSynonyms]);
    const filtered = includeSelf
      ? merged
      : merged.filter((entry) => {
          const normalizedWord = normalizeSynonymWord(entry.word_norm);
          return !lookupWordNorm || normalizedWord !== lookupWordNorm;
        });

    return new Response(
      JSON.stringify({
        ok: true,
        query: {
          ar_u_lexicon: arULexicon || null,
          lookup_word_norm: lookupWordNorm || null,
          include_self: includeSelf,
        },
        topic_ids: topicIds,
        topics,
        entries,
        synonyms_json: filtered,
        lexicon,
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
