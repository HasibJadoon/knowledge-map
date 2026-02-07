import { requireAuth } from '../../../_utils/auth';
import {
  canonicalize,
  sha256Hex,
  toJsonOrNull,
  upsertArUGrammar,
  upsertArURoot,
  upsertArUSentence,
  upsertArUSpan,
  upsertArUToken,
} from '../../../_utils/universal';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const commitSteps = [
  'meta',
  'container',
  'units',
  'lemmas',
  'tokens',
  'spans',
  'grammar',
  'sentences',
  'expressions',
  'links',
] as const;

type CommitStep = (typeof commitSteps)[number];
type JsonRecord = Record<string, unknown>;
type Counts = Record<string, number>;

type CommitRequestBody = {
  step?: string;
  container_id?: string | null;
  unit_id?: string | null;
  payload?: JsonRecord | null;
};

type LessonRow = {
  id: number;
  title: string;
  title_ar: string | null;
  lesson_type: string;
  subtype: string | null;
  source: string | null;
  status: string;
  difficulty: number | null;
  container_id: string | null;
  unit_id: string | null;
  lesson_json: string;
};

const allowedPos = new Set(['verb', 'noun', 'adj', 'particle', 'phrase']);

function badRequest(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 400,
    headers: jsonHeaders,
  });
}

function bump(counts: Counts, key: string, delta = 1) {
  counts[key] = (counts[key] ?? 0) + delta;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asRecordFromJson(value: unknown): JsonRecord | null {
  const record = asRecord(value);
  if (record) return record;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function asInteger(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function normalizePos(value: unknown): 'verb' | 'noun' | 'adj' | 'particle' | 'phrase' {
  const raw = asString(value)?.toLowerCase();
  if (raw && allowedPos.has(raw)) {
    return raw as 'verb' | 'noun' | 'adj' | 'particle' | 'phrase';
  }
  return 'noun';
}

function normalizeDifficulty(value: unknown): number | null {
  const parsed = asInteger(value);
  if (parsed == null) return null;
  return Math.max(1, parsed);
}

function normalizeTextNorm(value: string) {
  return canonicalize(value)
    .replace(/\s+/g, '_')
    .replace(/[|]/g, '_');
}

function pickFeatureValue(features: JsonRecord | null, key: string): string | null {
  if (!features) return null;
  const raw = features[key];
  return typeof raw === 'string' ? raw.trim() || null : null;
}

function extractTokenMorph(pos: string, features: JsonRecord | null) {
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

async function upsertTokenMorph(
  db: D1Database,
  tokenOccId: string,
  pos: string,
  features: JsonRecord | null
) {
  const morph = extractTokenMorph(pos, features);
  if (!morph) {
    await db.prepare(`DELETE FROM ar_occ_token_morph WHERE ar_token_occ_id = ?1`).bind(tokenOccId).run();
    return;
  }

  await db
    .prepare(
      `
      INSERT INTO ar_occ_token_morph (
        ar_token_occ_id,
        pos,
        noun_case,
        noun_number,
        noun_gender,
        noun_definiteness,
        verb_tense,
        verb_mood,
        verb_voice,
        verb_person,
        verb_number,
        verb_gender,
        particle_type,
        extra_json,
        created_at,
        updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6,
        ?7, ?8, ?9, ?10, ?11, ?12,
        ?13, NULL, datetime('now'), datetime('now')
      )
      ON CONFLICT(ar_token_occ_id) DO UPDATE SET
        pos = excluded.pos,
        noun_case = excluded.noun_case,
        noun_number = excluded.noun_number,
        noun_gender = excluded.noun_gender,
        noun_definiteness = excluded.noun_definiteness,
        verb_tense = excluded.verb_tense,
        verb_mood = excluded.verb_mood,
        verb_voice = excluded.verb_voice,
        verb_person = excluded.verb_person,
        verb_number = excluded.verb_number,
        verb_gender = excluded.verb_gender,
        particle_type = excluded.particle_type,
        extra_json = excluded.extra_json,
        updated_at = datetime('now')
    `
    )
    .bind(
      tokenOccId,
      morph.pos,
      morph.nounCase,
      morph.nounNumber,
      morph.nounGender,
      morph.nounDefiniteness,
      morph.verbTense,
      morph.verbMood,
      morph.verbVoice,
      morph.verbPerson,
      morph.verbNumber,
      morph.verbGender,
      morph.particleType
    )
    .run();
}

function parseStep(stepValue: string | undefined): CommitStep | null {
  if (!stepValue) return null;
  const normalized = stepValue.trim().toLowerCase();
  for (const step of commitSteps) {
    if (step === normalized) return step;
  }
  return null;
}

function stableLemmaId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  const normalized = hash % 2147483647;
  return Math.max(1, normalized);
}

async function withTransaction<T>(_db: D1Database, fn: () => Promise<T>) {
  // D1 on this Pages setup rejects explicit BEGIN/COMMIT statements.
  // Run step writes sequentially; each statement is still committed safely.
  return fn();
}

function buildCommitId(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? ''))
    .join('|');
}

function resolveContainerId(
  bodyContainerId: string | null,
  payload: JsonRecord,
  lesson: LessonRow
) {
  return (
    bodyContainerId ??
    asString(payload['container_id']) ??
    asString(payload['containerId']) ??
    lesson.container_id
  );
}

function resolveUnitId(bodyUnitId: string | null, payload: JsonRecord, lesson: LessonRow) {
  return bodyUnitId ?? asString(payload['unit_id']) ?? asString(payload['unitId']) ?? lesson.unit_id;
}

function validateStepPayload(
  step: CommitStep,
  payload: JsonRecord,
  containerId: string | null
): string | null {
  switch (step) {
    case 'meta': {
      const title = asString(payload['title']);
      return title ? null : 'Meta step requires a non-empty title.';
    }
    case 'container': {
      const container = asRecord(payload['container']) ?? payload;
      const containerType = asString(container['container_type']) ?? asString(container['containerType']);
      const containerKey = asString(container['container_key']) ?? asString(container['containerKey']);
      if (!containerType || !containerKey) return 'Container step requires container_type and container_key.';
      return null;
    }
    case 'units': {
      const units = asArray(payload['units']);
      if (!units.length) return 'Units step requires at least one unit.';
      if (!containerId) return 'Units step requires container_id.';
      return null;
    }
    case 'lemmas': {
      const lemmas = asArray(payload['lemmas']);
      if (!lemmas.length) return 'Lemmas step requires lemma rows.';
      return null;
    }
    case 'tokens': {
      const occTokens = asArray(payload['occ_tokens']);
      if (!occTokens.length) return 'Tokens step requires occurrence tokens.';
      if (!containerId) return 'Tokens step requires container_id.';
      return null;
    }
    case 'spans': {
      const occSpans = asArray(payload['occ_spans']);
      if (!occSpans.length) return 'Spans step requires occurrence spans.';
      if (!containerId) return 'Spans step requires container_id.';
      return null;
    }
    case 'grammar': {
      const occGrammar = asArray(payload['occ_grammar']);
      if (!occGrammar.length) return 'Grammar step requires occurrence grammar links.';
      if (!containerId) return 'Grammar step requires container_id.';
      return null;
    }
    case 'sentences': {
      const occSentences = asArray(payload['occ_sentences']);
      if (!occSentences.length) return 'Sentences step requires occurrence sentences.';
      if (!containerId) return 'Sentences step requires container_id.';
      return null;
    }
    case 'expressions': {
      const occExpressions = asArray(payload['occ_expressions']);
      if (!occExpressions.length) return 'Expressions step requires occurrence expressions.';
      if (!containerId) return 'Expressions step requires container_id.';
      return null;
    }
    case 'links': {
      const hasLinks =
        asArray(payload['lexicon_links']).length > 0 ||
        asArray(payload['valency_links']).length > 0 ||
        asArray(payload['pair_links']).length > 0;
      if (!hasLinks) return 'Links step requires at least one link row.';
      return null;
    }
    default:
      return 'Invalid step.';
  }
}

async function ensureLesson(db: D1Database, lessonId: number, userId: number) {
  const lesson = await db
    .prepare(
      `
      SELECT
        id,
        title,
        title_ar,
        lesson_type,
        subtype,
        source,
        status,
        difficulty,
        container_id,
        unit_id,
        lesson_json
      FROM ar_lessons
      WHERE id = ?1 AND user_id = ?2
      LIMIT 1
    `
    )
    .bind(lessonId, userId)
    .first<LessonRow>();

  return lesson ?? null;
}

async function ensureContainerExists(db: D1Database, containerId: string) {
  const row = await db
    .prepare('SELECT id FROM ar_containers WHERE id = ?1 LIMIT 1')
    .bind(containerId)
    .first<{ id: string }>();
  return !!row?.id;
}

async function ensureUnitExists(db: D1Database, unitId: string, containerId: string) {
  const row = await db
    .prepare('SELECT id FROM ar_container_units WHERE id = ?1 AND container_id = ?2 LIMIT 1')
    .bind(unitId, containerId)
    .first<{ id: string }>();
  return !!row?.id;
}

async function commitMetaStep(
  db: D1Database,
  lesson: LessonRow,
  payload: JsonRecord,
  counts: Counts
) {
  const title = asString(payload['title']);
  if (!title) {
    throw new Error('Meta step requires title.');
  }

  const lessonJsonCandidate = asRecord(payload['lesson_json']) ?? asRecord(payload['lessonJson']);
  const lessonJsonText = JSON.stringify(lessonJsonCandidate ?? JSON.parse(lesson.lesson_json || '{}'));

  await db
    .prepare(
      `
      UPDATE ar_lessons
      SET
        title = ?2,
        title_ar = ?3,
        lesson_type = ?4,
        subtype = ?5,
        source = ?6,
        status = ?7,
        difficulty = ?8,
        lesson_json = ?9,
        updated_at = datetime('now')
      WHERE id = ?1
    `
    )
    .bind(
      lesson.id,
      title,
      asString(payload['title_ar']) ?? lesson.title_ar,
      asString(payload['lesson_type']) ?? lesson.lesson_type,
      asString(payload['subtype']) ?? lesson.subtype,
      asString(payload['source']) ?? lesson.source,
      asString(payload['status']) ?? lesson.status,
      normalizeDifficulty(payload['difficulty']) ?? lesson.difficulty,
      lessonJsonText
    )
    .run();

  bump(counts, 'ar_lessons');
}

async function commitContainerStep(
  db: D1Database,
  lessonId: number,
  containerIdFromBody: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const container = asRecord(payload['container']) ?? payload;
  const containerType = asString(container['container_type']) ?? asString(container['containerType']);
  const containerKey = asString(container['container_key']) ?? asString(container['containerKey']);
  if (!containerType || !containerKey) {
    throw new Error('Container step requires container_type and container_key.');
  }

  const containerId =
    asString(container['id']) ??
    asString(container['container_id']) ??
    asString(container['containerId']) ??
    containerIdFromBody ??
    `C:${containerType.toUpperCase()}:${containerKey.toUpperCase()}`;

  await db
    .prepare(
      `
      INSERT INTO ar_containers (
        id, container_type, container_key, title, meta_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        container_type = excluded.container_type,
        container_key = excluded.container_key,
        title = excluded.title,
        meta_json = excluded.meta_json,
        updated_at = datetime('now')
    `
    )
    .bind(
      containerId,
      containerType,
      containerKey,
      asString(container['title']) ?? null,
      toJsonOrNull(container['meta_json'] ?? container['metaJson'])
    )
    .run();

  await db
    .prepare(
      `
      UPDATE ar_lessons
      SET container_id = ?2, updated_at = datetime('now')
      WHERE id = ?1
    `
    )
    .bind(lessonId, containerId)
    .run();

  bump(counts, 'ar_containers');
  bump(counts, 'ar_lessons');
  return containerId;
}

async function commitUnitsStep(
  db: D1Database,
  lessonId: number,
  containerId: string,
  payload: JsonRecord,
  counts: Counts
) {
  const units = asArray(payload['units']);
  if (!units.length) {
    throw new Error('Units step requires units.');
  }

  const resolvedUnits: Array<{ unitId: string; orderIndex: number; unitType: string }> = [];

  for (const item of units) {
    const row = asRecord(item);
    if (!row) continue;

    const unitId =
      asString(row['id']) ??
      asString(row['unit_id']) ??
      asString(row['unitId']) ??
      asString(row['start_ref']) ??
      `${containerId}:unit:${asInteger(row['order_index']) ?? 0}`;

    const unitType = asString(row['unit_type']) ?? asString(row['unitType']);
    const orderIndex = asInteger(row['order_index']) ?? 0;
    if (!unitType) {
      throw new Error(`Unit ${unitId} is missing unit_type.`);
    }
    if (unitType === 'ayah') {
      const ayahFrom = asInteger(row['ayah_from']);
      const ayahTo = asInteger(row['ayah_to']);
      if (ayahFrom == null || ayahTo == null) {
        throw new Error(`Ayah unit ${unitId} requires ayah_from and ayah_to.`);
      }
    }

    await db
      .prepare(
        `
        INSERT INTO ar_container_units (
          id, container_id, unit_type, order_index, ayah_from, ayah_to,
          start_ref, end_ref, text_cache, meta_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          container_id = excluded.container_id,
          unit_type = excluded.unit_type,
          order_index = excluded.order_index,
          ayah_from = excluded.ayah_from,
          ayah_to = excluded.ayah_to,
          start_ref = excluded.start_ref,
          end_ref = excluded.end_ref,
          text_cache = excluded.text_cache,
          meta_json = excluded.meta_json,
          updated_at = datetime('now')
      `
      )
      .bind(
        unitId,
        containerId,
        unitType,
        orderIndex,
        asInteger(row['ayah_from']),
        asInteger(row['ayah_to']),
        asString(row['start_ref']),
        asString(row['end_ref']),
        asString(row['text_cache']),
        toJsonOrNull(row['meta_json'] ?? row['metaJson'])
      )
      .run();

    resolvedUnits.push({ unitId, orderIndex, unitType });
    bump(counts, 'ar_container_units');
  }

  const links = asArray(payload['links']);
  if (links.length) {
    for (const item of links) {
      const row = asRecord(item);
      if (!row) continue;
      const linkScope = asString(row['link_scope']) ?? asString(row['linkScope']) ?? 'unit';
      const unitId =
        linkScope === 'container'
          ? ''
          : asString(row['unit_id']) ?? asString(row['unitId']) ?? '';
      if (linkScope !== 'container' && !unitId) continue;
      await db
        .prepare(
          `
          INSERT INTO ar_lesson_unit_link (
            lesson_id, container_id, unit_id, order_index, link_scope, role, note, link_json, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
          ON CONFLICT(lesson_id, container_id, link_scope, unit_id) DO UPDATE SET
            order_index = excluded.order_index,
            role = excluded.role,
            note = excluded.note,
            link_json = excluded.link_json
        `
        )
        .bind(
          lessonId,
          containerId,
          unitId,
          asInteger(row['order_index']) ?? 0,
          linkScope,
          asString(row['role']),
          asString(row['note']),
          toJsonOrNull(row['link_json'] ?? row['linkJson'])
        )
        .run();
      bump(counts, 'ar_lesson_unit_link');
    }
  } else {
    for (const unit of resolvedUnits) {
      await db
        .prepare(
          `
          INSERT INTO ar_lesson_unit_link (
            lesson_id, container_id, unit_id, order_index, link_scope, role, note, link_json, created_at
          ) VALUES (?1, ?2, ?3, ?4, 'unit', ?5, ?6, ?7, datetime('now'))
          ON CONFLICT(lesson_id, container_id, link_scope, unit_id) DO UPDATE SET
            order_index = excluded.order_index,
            role = excluded.role,
            note = excluded.note,
            link_json = excluded.link_json
        `
        )
        .bind(
          lessonId,
          containerId,
          unit.unitId,
          unit.orderIndex,
          unit.unitType,
          null,
          null
        )
        .run();
      bump(counts, 'ar_lesson_unit_link');
    }
  }
}

async function commitLemmaStep(db: D1Database, payload: JsonRecord, counts: Counts) {
  const lemmas = asArray(payload['lemmas']);
  for (const item of lemmas) {
    const row = asRecord(item);
    if (!row) continue;
    const lemmaText = asString(row['lemma_text']) ?? '';
    const lemmaTextClean = asString(row['lemma_text_clean']) ?? normalizeTextNorm(lemmaText);
    if (!lemmaTextClean) continue;
    const providedLemmaId = asInteger(row['lemma_id']);
    const lemmaId = providedLemmaId && providedLemmaId > 0 ? providedLemmaId : stableLemmaId(lemmaTextClean);

    await db
      .prepare(
        `
        INSERT INTO quran_ayah_lemmas (
          lemma_id, lemma_text, lemma_text_clean, words_count, uniq_words_count, primary_ar_u_token, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
        ON CONFLICT(lemma_id) DO UPDATE SET
          lemma_text = excluded.lemma_text,
          lemma_text_clean = excluded.lemma_text_clean,
          words_count = excluded.words_count,
          uniq_words_count = excluded.uniq_words_count,
          primary_ar_u_token = excluded.primary_ar_u_token
      `
      )
      .bind(
        lemmaId,
        lemmaText || lemmaTextClean,
        lemmaTextClean,
        asInteger(row['words_count']),
        asInteger(row['uniq_words_count']),
        asString(row['primary_ar_u_token'])
      )
      .run();
    bump(counts, 'quran_ayah_lemmas');

    const locations = asArray(row['locations']);
    for (const locationItem of locations) {
      const location = asRecord(locationItem);
      if (!location) continue;
      const wordLocation = asString(location['word_location']);
      const surah = asInteger(location['surah']);
      const ayah = asInteger(location['ayah']);
      const tokenIndex = asInteger(location['token_index']);
      if (!wordLocation || surah == null || ayah == null || tokenIndex == null) continue;

      await db
        .prepare(
          `
          INSERT INTO quran_ayah_lemma_location (
            lemma_id, word_location, surah, ayah, token_index,
            ar_token_occ_id, ar_u_token, word_simple, word_diacritic, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
          ON CONFLICT(lemma_id, word_location) DO UPDATE SET
            surah = excluded.surah,
            ayah = excluded.ayah,
            token_index = excluded.token_index,
            ar_token_occ_id = excluded.ar_token_occ_id,
            ar_u_token = excluded.ar_u_token,
            word_simple = excluded.word_simple,
            word_diacritic = excluded.word_diacritic
        `
        )
        .bind(
          lemmaId,
          wordLocation,
          surah,
          ayah,
          tokenIndex,
          asString(location['ar_token_occ_id']),
          asString(location['ar_u_token']),
          asString(location['word_simple']),
          asString(location['word_diacritic'])
        )
        .run();
      bump(counts, 'quran_ayah_lemma_location');
    }
  }
}

async function commitTokensStep(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  if (asArray(payload['lemmas']).length > 0) {
    await commitLemmaStep(db, payload, counts);
  }

  const rootMap = new Map<string, string>();
  const tokenMap = new Map<string, string>();

  const roots = asArray(payload['roots']);
  for (const item of roots) {
    const row = asRecord(item);
    if (!row) continue;
    const rootNormRaw = asString(row['root_norm']) ?? asString(row['rootNorm']) ?? asString(row['root']);
    const rootNorm = rootNormRaw ? normalizeTextNorm(rootNormRaw) : null;
    if (!rootNorm) continue;
    const root = asString(row['root']) ?? rootNorm;

    const result = await upsertArURoot(
      { DB: db },
      {
        root,
        rootNorm,
        rootLatn: asString(row['root_latn']) ?? asString(row['rootLatn']),
        arabicTrilateral: asString(row['arabic_trilateral']) ?? null,
        englishTrilateral: asString(row['english_trilateral']) ?? null,
        altLatn: asArray(row['alt_latn_json']),
        searchKeys: asString(row['search_keys_norm']) ?? null,
        status: asString(row['status']) ?? 'active',
        difficulty: normalizeDifficulty(row['difficulty']),
        frequency: asString(row['frequency']),
        extractedAt: asString(row['extracted_at']),
        meta: asRecord(row['meta_json']) ?? row['meta_json'],
      }
    );
    rootMap.set(rootNorm, result.ar_u_root);
    const providedRootId = asString(row['ar_u_root']) ?? asString(row['u_root_id']);
    if (providedRootId) {
      rootMap.set(providedRootId, result.ar_u_root);
    }
    bump(counts, 'ar_u_roots');
  }

  const uTokens = asArray(payload['u_tokens']);
  for (const item of uTokens) {
    const row = asRecord(item);
    if (!row) continue;

    const lemmaAr =
      asString(row['lemma_ar']) ??
      asString(row['surface_ar']) ??
      asString(row['surface']) ??
      asString(row['lemma']) ??
      '';
    if (!lemmaAr) continue;
    const lemmaNorm = normalizeTextNorm(asString(row['lemma_norm']) ?? lemmaAr);
    const pos = normalizePos(row['pos']);
    const rootNormRaw = asString(row['root_norm']) ?? null;
    const rootNorm = rootNormRaw ? normalizeTextNorm(rootNormRaw) : null;
    const requestedRootId = asString(row['ar_u_root']) ?? asString(row['u_root_id']);
    const arURoot = requestedRootId ? rootMap.get(requestedRootId) ?? requestedRootId : rootNorm ? rootMap.get(rootNorm) ?? null : null;

    const result = await upsertArUToken(
      { DB: db },
      {
        lemmaAr,
        lemmaNorm,
        pos,
        rootNorm,
        arURoot,
        features: asRecord(row['features_json']) ?? row['features_json'],
        meta: asRecord(row['meta_json']) ?? row['meta_json'],
      }
    );
    tokenMap.set(`${lemmaNorm}|${pos}|${rootNorm ?? ''}`, result.ar_u_token);
    const providedTokenId = asString(row['ar_u_token']) ?? asString(row['u_token_id']);
    if (providedTokenId) {
      tokenMap.set(providedTokenId, result.ar_u_token);
    }
    bump(counts, 'ar_u_tokens');
  }

  const occTokens = asArray(payload['occ_tokens']);
  for (const item of occTokens) {
    const row = asRecord(item);
    if (!row) continue;

    const surfaceAr = asString(row['surface_ar']) ?? asString(row['surface']) ?? '';
    const posIndex = asInteger(row['pos_index']);
    if (!surfaceAr || posIndex == null) continue;

    const tokenContainerId = asString(row['container_id']) ?? containerId;
    const tokenUnitId = asString(row['unit_id']) ?? unitId;
    const lemmaAr = asString(row['lemma_ar']) ?? surfaceAr;
    const lemmaNorm = normalizeTextNorm(asString(row['lemma_norm']) ?? asString(row['norm_ar']) ?? lemmaAr);
    const pos = normalizePos(row['pos']);
    const rootNormRaw = asString(row['root_norm']);
    const rootNorm = rootNormRaw ? normalizeTextNorm(rootNormRaw) : null;
    const requestedRootId = asString(row['ar_u_root']) ?? asString(row['u_root_id']);
    const arURoot = requestedRootId ? rootMap.get(requestedRootId) ?? requestedRootId : rootNorm ? rootMap.get(rootNorm) ?? null : null;

    let arUToken =
      asString(row['ar_u_token']) ??
      asString(row['u_token_id']) ??
      tokenMap.get(`${lemmaNorm}|${pos}|${rootNorm ?? ''}`) ??
      null;

    if (arUToken) {
      arUToken = tokenMap.get(arUToken) ?? arUToken;
    }

    if (!arUToken) {
      const generated = await upsertArUToken(
        { DB: db },
        {
          lemmaAr,
          lemmaNorm,
          pos,
          rootNorm,
          arURoot,
          features: asRecord(row['features_json']) ?? row['features_json'],
          meta: asRecord(row['meta_json']) ?? row['meta_json'],
        }
      );
      arUToken = generated.ar_u_token;
      tokenMap.set(`${lemmaNorm}|${pos}|${rootNorm ?? ''}`, arUToken);
      bump(counts, 'ar_u_tokens');
    }

    const providedOccId = asString(row['ar_token_occ_id']) ?? asString(row['token_occ_id']);
    const tokenOccId =
      providedOccId ??
      (await sha256Hex(
        buildCommitId(['occ_token', tokenContainerId, tokenUnitId, posIndex, surfaceAr])
      ));

    await db
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
        userId,
        tokenContainerId,
        tokenUnitId,
        posIndex,
        surfaceAr,
        asString(row['norm_ar']) ?? normalizeTextNorm(surfaceAr),
        lemmaAr,
        pos,
        arUToken,
        arURoot,
        toJsonOrNull(asRecord(row['features_json']) ?? row['features_json'])
      )
      .run();

    await upsertTokenMorph(db, tokenOccId, pos, asRecordFromJson(row['features_json']));
    bump(counts, 'ar_occ_token');
  }
}

async function commitSpansStep(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const spanMap = new Map<string, string>();

  const uSpans = asArray(payload['u_spans']);
  for (const item of uSpans) {
    const row = asRecord(item);
    if (!row) continue;
    const spanType = asString(row['span_type']) ?? 'phrase';
    const tokenIds = asArray(row['token_u_ids'] ?? row['token_ids'])
      .map((entry) => asString(entry))
      .filter((entry): entry is string => !!entry);
    if (!tokenIds.length) continue;

    const result = await upsertArUSpan(
      { DB: db },
      {
        spanType,
        tokenIds,
        meta: asRecord(row['meta_json']) ?? row['meta_json'],
      }
    );

    const providedSpanId = asString(row['ar_u_span']) ?? asString(row['u_span_id']);
    if (providedSpanId) spanMap.set(providedSpanId, result.ar_u_span);
    spanMap.set(`${spanType}|${tokenIds.join(',')}`, result.ar_u_span);
    bump(counts, 'ar_u_spans');
  }

  const occSpans = asArray(payload['occ_spans']);
  for (const item of occSpans) {
    const row = asRecord(item);
    if (!row) continue;
    const startIndex = asInteger(row['start_index']);
    const endIndex = asInteger(row['end_index']);
    if (startIndex == null || endIndex == null) continue;

    const spanType = asString(row['span_type']) ?? 'phrase';
    const tokenIds = asArray(row['token_u_ids'] ?? row['token_ids'])
      .map((entry) => asString(entry))
      .filter((entry): entry is string => !!entry);

    const providedUSpan = asString(row['ar_u_span']) ?? asString(row['u_span_id']);
    let arUSpan =
      (providedUSpan ? spanMap.get(providedUSpan) ?? providedUSpan : null) ??
      spanMap.get(`${spanType}|${tokenIds.join(',')}`) ??
      null;

    if (!arUSpan) {
      const created = await upsertArUSpan(
        { DB: db },
        {
          spanType,
          tokenIds,
          meta: asRecord(row['meta_json']) ?? row['meta_json'],
        }
      );
      arUSpan = created.ar_u_span;
      spanMap.set(`${spanType}|${tokenIds.join(',')}`, arUSpan);
      bump(counts, 'ar_u_spans');
    }

    const spanContainerId = asString(row['container_id']) ?? containerId;
    const spanUnitId = asString(row['unit_id']) ?? unitId;
    const spanText = asString(row['text_cache']) ?? asString(row['text']) ?? null;
    const providedOccId = asString(row['ar_span_occ_id']) ?? asString(row['span_occ_id']);
    const occSpanId =
      providedOccId ??
      (await sha256Hex(
        buildCommitId(['occ_span', spanContainerId, spanUnitId, startIndex, endIndex, spanText ?? ''])
      ));

    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_occ_span (
          ar_span_occ_id, user_id, container_id, unit_id, start_index, end_index,
          text_cache, ar_u_span, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
      `
      )
      .bind(
        occSpanId,
        userId,
        spanContainerId,
        spanUnitId,
        startIndex,
        endIndex,
        spanText,
        arUSpan
      )
      .run();

    bump(counts, 'ar_occ_span');
  }
}

async function commitGrammarStep(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const grammarMap = new Map<string, string>();
  const uGrammar = asArray(payload['u_grammar']);
  for (const item of uGrammar) {
    const row = asRecord(item);
    if (!row) continue;
    const grammarId = asString(row['grammar_id']) ?? asString(row['id']);
    if (!grammarId) continue;

    const result = await upsertArUGrammar(
      { DB: db },
      {
        grammarId,
        category: asString(row['category']),
        title: asString(row['title']),
        titleAr: asString(row['title_ar']),
        definition: asString(row['definition']),
        definitionAr: asString(row['definition_ar']),
        meta: asRecord(row['meta_json']) ?? row['meta_json'],
      }
    );
    grammarMap.set(grammarId, result.ar_u_grammar);
    const providedGrammarId = asString(row['ar_u_grammar']);
    if (providedGrammarId) grammarMap.set(providedGrammarId, result.ar_u_grammar);
    bump(counts, 'ar_u_grammar');
  }

  const occGrammar = asArray(payload['occ_grammar']);
  for (const item of occGrammar) {
    const row = asRecord(item);
    if (!row) continue;
    const targetType = asString(row['target_type']);
    const targetId = asString(row['target_id']);
    if (!targetType || !targetId) continue;

    const grammarId =
      asString(row['ar_u_grammar']) ??
      asString(row['grammar_id']) ??
      null;
    if (!grammarId) continue;

    let arUGrammar = grammarMap.get(grammarId) ?? grammarId;
    if (!grammarMap.has(grammarId) && !grammarId.startsWith('gram|')) {
      const created = await upsertArUGrammar(
        { DB: db },
        {
          grammarId,
          category: null,
          title: grammarId,
          definition: null,
          meta: null,
        }
      );
      arUGrammar = created.ar_u_grammar;
      grammarMap.set(grammarId, arUGrammar);
      bump(counts, 'ar_u_grammar');
    }

    const linkId =
      asString(row['id']) ??
      (await sha256Hex(buildCommitId(['occ_grammar', containerId, unitId, targetType, targetId, arUGrammar])));

    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_occ_grammar (
          id, user_id, container_id, unit_id, ar_u_grammar, target_type, target_id, note, meta_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
      `
      )
      .bind(
        linkId,
        userId,
        asString(row['container_id']) ?? containerId,
        asString(row['unit_id']) ?? unitId,
        arUGrammar,
        targetType,
        targetId,
        asString(row['note']),
        toJsonOrNull(asRecord(row['meta_json']) ?? row['meta_json'])
      )
      .run();
    bump(counts, 'ar_occ_grammar');
  }
}

async function commitSentencesStep(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const sentenceMap = new Map<string, string>();
  const uSentences = asArray(payload['u_sentences']);
  for (const item of uSentences) {
    const row = asRecord(item);
    if (!row) continue;

    const sequence = asArray(row['sequence'])
      .map((entry) => asString(entry))
      .filter((entry): entry is string => !!entry);
    const sentenceKind = asString(row['sentence_kind']) ?? 'nominal';
    const textAr = asString(row['text_ar']);

    const result = await upsertArUSentence(
      { DB: db },
      {
        kind: sentenceKind,
        sequence,
        textAr,
        meta: asRecord(row['meta_json']) ?? row['meta_json'],
      }
    );
    const providedSentenceId = asString(row['ar_u_sentence']) ?? asString(row['u_sentence_id']);
    if (providedSentenceId) sentenceMap.set(providedSentenceId, result.ar_u_sentence);
    sentenceMap.set(`${sentenceKind}|${sequence.join(';')}`, result.ar_u_sentence);
    bump(counts, 'ar_u_sentences');
  }

  const occSentences = asArray(payload['occ_sentences']);
  for (const item of occSentences) {
    const row = asRecord(item);
    if (!row) continue;
    const textAr = asString(row['text_ar']) ?? asString(row['arabic']) ?? '';
    const sentenceOrder = asInteger(row['sentence_order']) ?? 1;
    const sequence = asArray(row['sequence'])
      .map((entry) => asString(entry))
      .filter((entry): entry is string => !!entry);
    const sentenceKind = asString(row['sentence_kind']) ?? 'nominal';

    const providedUSentence = asString(row['ar_u_sentence']) ?? asString(row['u_sentence_id']);
    let arUSentence =
      (providedUSentence ? sentenceMap.get(providedUSentence) ?? providedUSentence : null) ??
      sentenceMap.get(`${sentenceKind}|${sequence.join(';')}`) ??
      null;

    if (!arUSentence) {
      const created = await upsertArUSentence(
        { DB: db },
        {
          kind: sentenceKind,
          sequence,
          textAr,
          meta: asRecord(row['meta_json']) ?? row['meta_json'],
        }
      );
      arUSentence = created.ar_u_sentence;
      sentenceMap.set(`${sentenceKind}|${sequence.join(';')}`, arUSentence);
      bump(counts, 'ar_u_sentences');
    }

    const occContainerId = asString(row['container_id']) ?? containerId;
    const occUnitId = asString(row['unit_id']) ?? unitId;
    const sentenceOccId =
      asString(row['ar_sentence_occ_id']) ??
      asString(row['sentence_occ_id']) ??
      (await sha256Hex(buildCommitId(['occ_sentence', occContainerId, occUnitId, sentenceOrder, textAr])));

    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_occ_sentence (
          ar_sentence_occ_id, user_id, container_id, unit_id, sentence_order,
          text_ar, translation, notes, ar_u_sentence, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
      `
      )
      .bind(
        sentenceOccId,
        userId,
        occContainerId,
        occUnitId,
        sentenceOrder,
        textAr,
        asString(row['translation']),
        asString(row['notes']),
        arUSentence
      )
      .run();
    bump(counts, 'ar_occ_sentence');
  }
}

async function upsertExpression(
  db: D1Database,
  row: JsonRecord
) {
  const sequence = asArray(row['sequence'])
    .map((entry) => asString(entry))
    .filter((entry): entry is string => !!entry);
  const textAr = asString(row['text_ar']) ?? asString(row['text']) ?? '';
  const label = asString(row['label']) ?? textAr;

  const canonicalInput = canonicalize(
    asString(row['canonical_input']) ??
      `EXP|${normalizeTextNorm(label ?? textAr)}|${sequence.join(';')}`
  );
  const id = asString(row['ar_u_expression']) ?? (await sha256Hex(canonicalInput));

  await db
    .prepare(
      `
      INSERT INTO ar_u_expressions (
        ar_u_expression, canonical_input, label, text_ar, sequence_json, meta_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
      ON CONFLICT(ar_u_expression) DO UPDATE SET
        canonical_input = excluded.canonical_input,
        label = excluded.label,
        text_ar = excluded.text_ar,
        sequence_json = excluded.sequence_json,
        meta_json = excluded.meta_json,
        updated_at = datetime('now')
    `
    )
    .bind(id, canonicalInput, label, textAr, JSON.stringify(sequence), toJsonOrNull(row['meta_json']))
    .run();

  return id;
}

async function commitExpressionsStep(
  db: D1Database,
  userId: number,
  containerId: string,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const expressionMap = new Map<string, string>();

  const uExpressions = asArray(payload['u_expressions']);
  for (const item of uExpressions) {
    const row = asRecord(item);
    if (!row) continue;
    const expressionId = await upsertExpression(db, row);
    const provided = asString(row['ar_u_expression']) ?? asString(row['u_expression_id']);
    if (provided) expressionMap.set(provided, expressionId);
    expressionMap.set(expressionId, expressionId);
    bump(counts, 'ar_u_expressions');
  }

  const occExpressions = asArray(payload['occ_expressions']);
  for (const item of occExpressions) {
    const row = asRecord(item);
    if (!row) continue;
    const providedExpression = asString(row['ar_u_expression']) ?? asString(row['u_expression_id']);
    let expressionId =
      (providedExpression ? expressionMap.get(providedExpression) ?? providedExpression : null) ??
      null;
    if (!expressionId) {
      expressionId = await upsertExpression(db, row);
      expressionMap.set(expressionId, expressionId);
      bump(counts, 'ar_u_expressions');
    }

    const occContainerId = asString(row['container_id']) ?? containerId;
    const occUnitId = asString(row['unit_id']) ?? unitId;
    const textCache = asString(row['text_cache']) ?? asString(row['text']) ?? null;
    const expressionOccId =
      asString(row['ar_expression_occ_id']) ??
      asString(row['expression_occ_id']) ??
      (await sha256Hex(buildCommitId(['occ_expression', occContainerId, occUnitId, expressionId, textCache])));

    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_occ_expression (
          ar_expression_occ_id, user_id, container_id, unit_id,
          start_index, end_index, text_cache, ar_u_expression,
          note, meta_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
      `
      )
      .bind(
        expressionOccId,
        userId,
        occContainerId,
        occUnitId,
        asInteger(row['start_index']),
        asInteger(row['end_index']),
        textCache,
        expressionId,
        asString(row['note']),
        toJsonOrNull(row['meta_json'])
      )
      .run();
    bump(counts, 'ar_occ_expression');
  }
}

async function commitLinksStep(
  db: D1Database,
  userId: number,
  containerId: string | null,
  unitId: string | null,
  payload: JsonRecord,
  counts: Counts
) {
  const lexiconLinks = asArray(payload['lexicon_links']);
  for (const item of lexiconLinks) {
    const row = asRecord(item);
    if (!row) continue;
    const tokenOccId = asString(row['ar_token_occ_id']) ?? asString(row['token_occ_id']);
    const lexiconId = asString(row['ar_u_lexicon']) ?? asString(row['u_lexicon_id']);
    if (!tokenOccId || !lexiconId) continue;
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_token_lexicon_link (
          ar_token_occ_id, ar_u_lexicon, confidence, is_primary, source, note, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
      `
      )
      .bind(
        tokenOccId,
        lexiconId,
        asNumber(row['confidence']),
        asInteger(row['is_primary']) ?? 1,
        asString(row['source']),
        asString(row['note'])
      )
      .run();
    bump(counts, 'ar_token_lexicon_link');
  }

  const valencyLinks = asArray(payload['valency_links']);
  for (const item of valencyLinks) {
    const row = asRecord(item);
    if (!row) continue;
    const tokenOccId = asString(row['ar_token_occ_id']) ?? asString(row['token_occ_id']);
    const valencyId = asString(row['ar_u_valency']) ?? asString(row['u_valency_id']);
    if (!tokenOccId || !valencyId) continue;
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_token_valency_link (
          ar_token_occ_id, ar_u_valency, role, note, created_at
        ) VALUES (?1, ?2, ?3, ?4, datetime('now'))
      `
      )
      .bind(tokenOccId, valencyId, asString(row['role']), asString(row['note']))
      .run();
    bump(counts, 'ar_token_valency_link');
  }

  const pairLinks = asArray(payload['pair_links']);
  for (const item of pairLinks) {
    const row = asRecord(item);
    if (!row) continue;
    const linkType = asString(row['link_type']);
    const fromTokenOcc = asString(row['from_token_occ']);
    const toTokenOcc = asString(row['to_token_occ']);
    if (!linkType || !fromTokenOcc || !toTokenOcc) continue;
    const pairId =
      asString(row['id']) ??
      (await sha256Hex(buildCommitId(['pair', linkType, fromTokenOcc, toTokenOcc])));
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ar_token_pair_links (
          id, user_id, container_id, unit_id, link_type, from_token_occ, to_token_occ,
          ar_u_valency, note, meta_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
      `
      )
      .bind(
        pairId,
        userId,
        asString(row['container_id']) ?? containerId,
        asString(row['unit_id']) ?? unitId,
        linkType,
        fromTokenOcc,
        toTokenOcc,
        asString(row['ar_u_valency']),
        asString(row['note']),
        toJsonOrNull(row['meta_json'])
      )
      .run();
    bump(counts, 'ar_token_pair_links');
  }
}

async function touchLesson(
  db: D1Database,
  lessonId: number,
  containerId: string | null,
  unitId: string | null
) {
  await db
    .prepare(
      `
      UPDATE ar_lessons
      SET
        container_id = COALESCE(?2, container_id),
        unit_id = COALESCE(?3, unit_id),
        updated_at = datetime('now')
      WHERE id = ?1
    `
    )
    .bind(lessonId, containerId, unitId)
    .run();
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

    const lessonId = Number(ctx.params?.id);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return badRequest('Invalid lesson id.');
    }

    let body: CommitRequestBody;
    try {
      body = await ctx.request.json<CommitRequestBody>();
    } catch {
      return badRequest('Invalid JSON body.');
    }

    const step = parseStep(body.step);
    if (!step) return badRequest('Invalid commit step.');

    const payload = asRecord(body.payload) ?? {};
    const lesson = await ensureLesson(ctx.env.DB, lessonId, user.id);
    if (!lesson) {
      return new Response(JSON.stringify({ ok: false, error: 'Lesson not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const containerId = resolveContainerId(asString(body.container_id), payload, lesson);
    const unitId = resolveUnitId(asString(body.unit_id), payload, lesson);
    const validationError = validateStepPayload(step, payload, containerId);
    if (validationError) {
      return badRequest(validationError);
    }

    if (containerId) {
      const containerExists = await ensureContainerExists(ctx.env.DB, containerId);
      if (
        !containerExists &&
        step !== 'container'
      ) {
        return badRequest(`Container '${containerId}' does not exist yet.`);
      }
    }

    if (unitId && containerId) {
      const unitExists = await ensureUnitExists(ctx.env.DB, unitId, containerId);
      if (!unitExists && !['container', 'units'].includes(step)) {
        return badRequest(`Unit '${unitId}' does not exist in container '${containerId}'.`);
      }
    }

    let resolvedContainerId = containerId;
    const resolvedUnitId = unitId;
    const counts: Counts = {};
    await withTransaction(ctx.env.DB, async () => {
      switch (step) {
        case 'meta':
          await commitMetaStep(ctx.env.DB, lesson, payload, counts);
          break;
        case 'container':
          resolvedContainerId = await commitContainerStep(
            ctx.env.DB,
            lessonId,
            resolvedContainerId,
            payload,
            counts
          );
          break;
        case 'units':
          if (!resolvedContainerId) throw new Error('Units step requires container_id.');
          await commitUnitsStep(ctx.env.DB, lessonId, resolvedContainerId, payload, counts);
          break;
        case 'lemmas':
          await commitLemmaStep(ctx.env.DB, payload, counts);
          break;
        case 'tokens':
          if (!resolvedContainerId) throw new Error('Tokens step requires container_id.');
          await commitTokensStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
        case 'spans':
          if (!resolvedContainerId) throw new Error('Spans step requires container_id.');
          await commitSpansStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
        case 'grammar':
          if (!resolvedContainerId) throw new Error('Grammar step requires container_id.');
          await commitGrammarStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
        case 'sentences':
          if (!resolvedContainerId) throw new Error('Sentences step requires container_id.');
          await commitSentencesStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
        case 'expressions':
          if (!resolvedContainerId) throw new Error('Expressions step requires container_id.');
          await commitExpressionsStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
        case 'links':
          await commitLinksStep(
            ctx.env.DB,
            user.id,
            resolvedContainerId,
            resolvedUnitId,
            payload,
            counts
          );
          break;
      }

      await touchLesson(ctx.env.DB, lessonId, resolvedContainerId, resolvedUnitId);
      bump(counts, 'ar_lessons');
    });

    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          lesson_id: lessonId,
          step,
          container_id: resolvedContainerId,
          unit_id: resolvedUnitId,
          counts,
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
