import { requireAuth } from '../../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJsonParse(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeParseJsonRecord(text: string | null) {
  const parsed = safeJsonParse(text);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function parseSurahFromUnitId(unitId: string | null): number | null {
  if (!unitId) return null;
  const parts = unitId.split(':');
  if (parts.length < 3) return null;
  const surah = Number.parseInt(parts[2], 10);
  return Number.isFinite(surah) ? surah : null;
}

function parseAyahRange(unit: LessonUnitRow) {
  const start = typeof unit.ayah_from === 'number' ? Math.trunc(unit.ayah_from) : null;
  const end = typeof unit.ayah_to === 'number' ? Math.trunc(unit.ayah_to) : start;
  return {
    ayah_from: Number.isFinite(start!) ? start : null,
    ayah_to: Number.isFinite(end!) ? end : null,
  };
}

function parseMetaLabel(metaJson: string | null): string | null {
  const parsed = safeParseJsonRecord(metaJson);
  if (parsed && typeof parsed.label === 'string' && parsed.label.trim()) {
    return parsed.label.trim();
  }
  return null;
}

interface LessonUnitRow {
  container_id: string | null;
  unit_id: string | null;
  link_scope: string | null;
  order_index: number | null;
  role: string | null;
  unit_type: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  start_ref: string | null;
  end_ref: string | null;
  meta_json: string | null;
}

interface QuranVerseRow {
  surah: number;
  ayah: number;
  text: string;
  text_diacritics?: string | null;
  text_simple?: string | null;
  verse_mark?: string | null;
  verse_full?: string | null;
}

interface QuranLessonAyahUnit {
  unit_id: string;
  unit_type: 'ayah';
  arabic: string;
  arabic_diacritics?: string | null;
  translation: string | null;
  translations?: Record<string, string | null> | null;
  surah: number;
  ayah: number;
  notes?: string | null;
}

interface QuranTranslationRow {
  surah: number;
  ayah: number;
  translation_haleem: string | null;
  translation_asad: string | null;
  translation_sahih: string | null;
  translation_usmani: string | null;
  footnotes_sahih: string | null;
  footnotes_usmani: string | null;
  meta_json: string | null;
}

interface QuranSentenceRow {
  ar_sentence_occ_id: string;
  user_id: number | null;
  container_id: string;
  unit_id: string | null;
  sentence_order: number | null;
  text_ar: string | null;
  translation: string | null;
  notes: string | null;
  ar_u_sentence: string;
  sentence_kind: string | null;
  sequence_json: string | null;
  u_text_ar: string | null;
  u_meta_json: string | null;
  created_at: string;
  updated_at: string | null;
}

interface QuranTokenRow {
  ar_token_occ_id: string;
  user_id: number | null;
  container_id: string;
  unit_id: string | null;
  pos_index: number;
  surface_ar: string;
  norm_ar: string | null;
  lemma_ar: string | null;
  pos: string | null;
  ar_u_token: string;
  ar_u_root: string | null;
  features_json: string | null;
  created_at: string;
  updated_at: string | null;
}

interface SlotVocabularyCard {
  token_occ_id: string;
  u_token_id: string;
  u_root_id: string | null;
  pos_index: number;
  surface_ar: string;
  lemma_ar: string | null;
  features: Record<string, unknown> | null;
}

function safeJson(text: string | null) {
  return safeParseJsonRecord(text);
}

function buildUnitQueryPattern(unitId: string | null): string | null {
  if (!unitId) return null;
  const parts = unitId.split(':');
  if (parts.length < 3) return null;
  return `${parts[0]}:${parts[1]}:${parts[2]}:%`;
}

function parseTokenFeatures(text: string | null) {
  return safeJson(text);
}

function roleIsNoun(pos: string | null) {
  if (!pos) return false;
  const normalized = pos.toLowerCase();
  return normalized.includes('noun') || normalized.includes('pronoun') || normalized.includes('adj');
}

function roleIsVerb(pos: string | null) {
  if (!pos) return false;
  return pos.toLowerCase().includes('verb');
}

async function loadLessonUnits(db: D1Database, containerId: string, lessonUnitId: string | null) {
  const unitPrefix = buildUnitQueryPattern(lessonUnitId);
  const stmt = db
    .prepare(
      `
      SELECT
        id AS unit_id,
        unit_type,
        order_index,
        ayah_from,
        ayah_to,
        start_ref,
        end_ref,
        text_cache,
        meta_json
      FROM ar_container_units
      WHERE container_id = ?1
        AND (
          id = ?2
          OR (?3 IS NOT NULL AND id LIKE ?3)
        )
      ORDER BY
        CASE WHEN id = ?2 THEN -1 ELSE order_index END,
        order_index ASC
    `
    )
    .bind(containerId, lessonUnitId, unitPrefix);
  const result = (await stmt.all()) as { results?: LessonUnitRow[] };
  return result?.results ?? [];
}

function collectAyahRequests(units: LessonUnitRow[]) {
  const map = new Map<number, Set<number>>();
  for (const unit of units) {
    if (!unit.unit_id || unit.unit_type !== 'ayah') continue;
    const surah = parseSurahFromUnitId(unit.unit_id);
    if (!surah) continue;
    const ayahFromRaw = unit.ayah_from ?? null;
    const ayahToRaw = unit.ayah_to ?? ayahFromRaw;
    if (ayahFromRaw == null) continue;
    const ayahFrom = Math.trunc(ayahFromRaw);
    const ayahTo = ayahToRaw != null ? Math.trunc(ayahToRaw) : ayahFrom;
    const set = map.get(surah) ?? new Set<number>();
    for (let ayah = ayahFrom; ayah <= ayahTo; ayah += 1) {
      set.add(ayah);
    }
    map.set(surah, set);
  }
  return map;
}

async function fetchAyahRows(db: D1Database, requests: Map<number, Set<number>>) {
  const map = new Map<string, QuranVerseRow>();
  for (const [surah, ayahSet] of requests.entries()) {
    const ayahList = Array.from(ayahSet).sort((a, b) => a - b);
    if (!ayahList.length) continue;
    const placeholders = ayahList.map(() => '?').join(', ');
    const stmt = db
      .prepare(
        `
        SELECT
          surah,
          ayah,
          text,
          text_diacritics,
          text_simple,
          verse_mark,
          verse_full
        FROM ar_quran_ayah
        WHERE surah = ?1 AND ayah IN (${placeholders})
      `
      )
      .bind(surah, ...ayahList);
    const result = (await stmt.all()) as { results?: QuranVerseRow[] };
    const rows = result?.results ?? [];
    for (const row of rows) {
      map.set(`${row.surah}:${row.ayah}`, row);
    }
  }
  return map;
}

async function fetchTranslations(
  db: D1Database,
  surah: number | null,
  ayahSet: number[]
) {
  if (!surah || !ayahSet.length) return [];
  const placeholders = ayahSet.map(() => '?').join(', ');
  const stmt = db
    .prepare(
      `
      SELECT surah, ayah,
        translation_haleem,
        translation_asad,
        translation_sahih,
        translation_usmani,
        footnotes_sahih,
        footnotes_usmani,
        meta_json
      FROM ar_quran_translations
      WHERE surah = ?1 AND ayah IN (${placeholders})
      ORDER BY ayah ASC
    `
    )
    .bind(surah, ...ayahSet);
  const result = (await stmt.all()) as { results?: QuranTranslationRow[] };
  return result?.results ?? [];
}

async function fetchTokens(db: D1Database, containerId: string, ids: string[]) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const stmt = db
    .prepare(
      `
      SELECT
        ar_token_occ_id,
        user_id,
        container_id,
        unit_id,
        pos_index,
        surface_ar,
        norm_ar,
        lemma_ar,
        pos,
        ar_u_token,
        ar_u_root,
        features_json,
        created_at,
        updated_at
      FROM ar_occ_token
      WHERE container_id = ?1
        AND unit_id IN (${placeholders})
      ORDER BY unit_id, pos_index
    `
    )
    .bind(containerId, ...ids);
  const result = (await stmt.all()) as { results?: QuranTokenRow[] };
  return result?.results ?? [];
}

async function fetchSpans(db: D1Database, containerId: string, ids: string[]) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const stmt = db
    .prepare(
      `
      SELECT
        os.ar_span_occ_id,
        os.user_id,
        os.container_id,
        os.unit_id,
        os.start_index,
        os.end_index,
        os.text_cache,
        os.ar_u_span,
        os.created_at,
        os.updated_at,
        us.span_type,
        us.span_kind,
        us.token_ids_csv,
        us.meta_json AS u_meta_json
      FROM ar_occ_span os
      JOIN ar_u_spans us ON us.ar_u_span = os.ar_u_span
      WHERE os.container_id = ?1
        AND os.unit_id IN (${placeholders})
      ORDER BY os.unit_id, os.start_index, os.end_index
    `
    )
    .bind(containerId, ...ids);
  const result = (await stmt.all()) as { results?: any[] };
  return result?.results ?? [];
}

async function fetchSentences(db: D1Database, containerId: string, unitIds: string[], passageUnitId: string | null) {
  const hasUnits = unitIds.length > 0;
  const hasPassage = Boolean(passageUnitId);
  if (!hasPassage && !hasUnits) return [];
  const clauseParts: string[] = [];
  const bindings: (string | null)[] = [containerId];
  if (hasPassage) {
    clauseParts.push(`s.unit_id = ?${bindings.length + 1}`);
    bindings.push(passageUnitId);
  }
  if (hasUnits) {
    const placeholders = unitIds.map(() => '?').join(', ');
    clauseParts.push(`s.unit_id IN (${placeholders})`);
    bindings.push(...unitIds);
  }
  const clauseSql = clauseParts.length > 1 ? `(${clauseParts.join(' OR ')})` : clauseParts[0];
  const orderClause = hasPassage
    ? 'ORDER BY CASE WHEN s.unit_id = ?2 THEN -1 ELSE 0 END, s.unit_id, s.sentence_order'
    : 'ORDER BY s.unit_id, s.sentence_order';
  const sql = `
      SELECT
        s.ar_sentence_occ_id,
        s.user_id,
        s.container_id,
        s.unit_id,
        s.sentence_order,
        s.text_ar,
        s.translation,
        s.notes,
        s.ar_u_sentence,
        us.sentence_kind,
        us.sequence_json,
        us.text_ar AS u_text_ar,
        us.meta_json AS u_meta_json,
        s.created_at,
        s.updated_at
      FROM ar_occ_sentence s
      JOIN ar_u_sentences us ON us.ar_u_sentence = s.ar_u_sentence
      WHERE s.container_id = ?1
        AND ${clauseSql}
      ${orderClause}
    `;
  const stmt = db.prepare(sql);
  const result = (await stmt.bind(...bindings).all()) as { results?: QuranSentenceRow[] };
  return result?.results ?? [];
}

function buildVocabBuckets(tokens: QuranTokenRow[]) {
  const verbs: SlotVocabularyCard[] = [];
  const nouns: SlotVocabularyCard[] = [];
  for (const token of tokens) {
    const card: SlotVocabularyCard = {
      token_occ_id: token.ar_token_occ_id,
      u_token_id: token.ar_u_token,
      u_root_id: token.ar_u_root,
      pos_index: token.pos_index,
      surface_ar: token.surface_ar,
      lemma_ar: token.lemma_ar,
      features: parseTokenFeatures(token.features_json),
    };
    if (roleIsVerb(token.pos)) {
      verbs.push(card);
    }
    if (roleIsNoun(token.pos)) {
      nouns.push(card);
    }
  }
  return { verbs, nouns };
}


/* ========================= GET /arabic/lessons/quran/:id ========================= */

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
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

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT
          id,
          user_id,
          title,
          title_ar,
          lesson_type,
          subtype,
          status,
          difficulty,
          source,
          container_id,
          unit_id,
          created_at,
          updated_at,
          lesson_json
        FROM ar_lessons
        WHERE id = ?1 AND user_id = ?2 AND lesson_type = 'quran'
        LIMIT 1
        `
      )
      .bind(id, user.id)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const containerId = row.container_id;
    const lessonUnitId = row.unit_id ?? null;
    if (!containerId) {
      return new Response(JSON.stringify({ ok: false, error: 'Container missing' }), { status: 500, headers: jsonHeaders });
    }

    const containerRow = await ctx.env.DB
      .prepare('SELECT id, container_type, container_key, title, meta_json FROM ar_containers WHERE id = ?1')
      .bind(containerId)
      .first<any>();

    if (!containerRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Container not found' }), { status: 500, headers: jsonHeaders });
    }

    const unitRows = await loadLessonUnits(ctx.env.DB, containerId, lessonUnitId);
    const ayahMap = collectAyahRequests(unitRows);
    const verseMap = await fetchAyahRows(ctx.env.DB, ayahMap);
    const translationRows: QuranTranslationRow[] = [];
    for (const [surah, ayahSet] of ayahMap.entries()) {
      const ayahList = Array.from(ayahSet).sort((a, b) => a - b);
      const rows = await fetchTranslations(ctx.env.DB, surah, ayahList);
      translationRows.push(...rows);
    }
    const translationMap = new Map<string, QuranTranslationRow>();
    for (const translation of translationRows) {
      translationMap.set(`${translation.surah}:${translation.ayah}`, translation);
    }
    const ayat: QuranLessonAyahUnit[] = [];
    const seenVerseKeys = new Set<string>();
    for (const unit of unitRows) {
      if (!unit.unit_id || unit.unit_type !== 'ayah') continue;
      const surah = parseSurahFromUnitId(unit.unit_id);
      if (!surah) continue;
      const { ayah_from: rawFrom, ayah_to: rawTo } = parseAyahRange(unit);
      const start = rawFrom ?? parseAyahFromRef(unit.start_ref) ?? 0;
      const end = rawTo ?? parseAyahFromRef(unit.end_ref) ?? start;
      for (let ayah = start; ayah <= end; ayah += 1) {
        const key = `${surah}:${ayah}`;
        if (seenVerseKeys.has(key)) continue;
        seenVerseKeys.add(key);
        const verse = verseMap.get(key);
        if (!verse) continue;
        const translationRow = translationMap.get(key);
        const translationsPayload = translationRow
          ? {
              haleem: translationRow.translation_haleem,
              asad: translationRow.translation_asad,
              sahih: translationRow.translation_sahih,
              usmani: translationRow.translation_usmani,
              footnotes_sahih: translationRow.footnotes_sahih,
              footnotes_usmani: translationRow.footnotes_usmani,
            }
          : null;
        const translationText =
          translationRow?.translation_haleem ??
          translationRow?.translation_asad ??
          translationRow?.translation_sahih ??
          translationRow?.translation_usmani ??
          null;
        const cleanText =
          verse.text_simple ??
          verse.text ??
          verse.text_diacritics ??
          '';
        const diacText =
          verse.text ??
          verse.text_diacritics ??
          verse.text_simple ??
          '';
        const verseMarker =
          (verse.verse_mark ?? verse.verse_full ?? `﴿${ayah}﴾`).trim();
        ayat.push({
          unit_id: unit.unit_id,
          unit_type: 'ayah',
          arabic: cleanText,
          arabic_diacritics: diacText || null,
          arabic_non_diacritics: cleanText || null,
          translation: translationText,
          translations: translationsPayload,
          surah,
          ayah,
          notes: parseMetaLabel(unit.meta_json),
          verse_mark: verseMarker || null,
          verse_full: verse.verse_full ?? null,
        });
      }
    }

    const ayahUnitIds = unitRows.filter((u) => u.unit_type === 'ayah' && u.unit_id).map((u) => u.unit_id!) ?? [];
    const tokens = await fetchTokens(ctx.env.DB, containerId, ayahUnitIds);
    const spans = await fetchSpans(ctx.env.DB, containerId, ayahUnitIds);
    const sentences = await fetchSentences(ctx.env.DB, containerId, ayahUnitIds, lessonUnitId);

    const vocabBuckets = buildVocabBuckets(tokens);
    const spanVocab = spans.map((span) => ({
      kind: span.span_kind ?? null,
      text: span.text_cache ?? null,
      u_span_id: span.ar_u_span,
      token_u_ids: (span.token_ids_csv ?? '').split(',').filter(Boolean),
      meta: safeJson(span.u_meta_json),
    }));

    const lessonJson = safeJsonParse((row.lesson_json as string | null) ?? null) ?? {};

    const payload = {
      lesson_row: {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        title_ar: row.title_ar,
        lesson_type: row.lesson_type,
        subtype: row.subtype,
        status: row.status,
        difficulty: row.difficulty,
        source: row.source,
        container_id: row.container_id,
        unit_id: row.unit_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      container: containerRow,
      units: unitRows.map((unit) => ({
        id: unit.unit_id,
        unit_type: unit.unit_type,
        order_index: unit.order_index ?? 0,
        ayah_from: unit.ayah_from,
        ayah_to: unit.ayah_to,
        start_ref: unit.start_ref,
        end_ref: unit.end_ref,
        text_cache: unit.text_cache,
        meta_json: safeJson(unit.meta_json),
      })),
      ayat,
      sentences: sentences.map((sentence) => ({
        sentence_occ_id: sentence.ar_sentence_occ_id,
        u_sentence_id: sentence.ar_u_sentence,
        unit_id: sentence.unit_id ?? lessonUnitId ?? '',
        sentence_order: sentence.sentence_order ?? 0,
        text: {
          arabic: sentence.text_ar ?? sentence.u_text_ar ?? '',
          translation: sentence.translation,
        },
        notes: sentence.notes,
        ref: {
          unit_id: sentence.unit_id ?? lessonUnitId ?? undefined,
        },
        anchors: {},
        sentence_kind: sentence.sentence_kind ?? undefined,
        sequence: sentence.sequence_json ? safeJson(sentence.sequence_json) : null,
        created_at: sentence.created_at,
        updated_at: sentence.updated_at,
      })),
      tokens: tokens.map((token) => ({
        token_occ_id: token.ar_token_occ_id,
        u_token_id: token.ar_u_token,
        u_root_id: token.ar_u_root,
        container_id: token.container_id,
        unit_id: token.unit_id,
        pos_index: token.pos_index,
        surface_ar: token.surface_ar,
        norm_ar: token.norm_ar,
        lemma_ar: token.lemma_ar,
        pos: token.pos,
        features: parseTokenFeatures(token.features_json),
      })),
      spans: spans.map((span) => ({
        span_occ_id: span.ar_span_occ_id,
        u_span_id: span.ar_u_span,
        container_id: span.container_id,
        unit_id: span.unit_id,
        start_index: span.start_index,
        end_index: span.end_index,
        text_cache: span.text_cache,
        span_type: span.span_type,
        span_kind: span.span_kind,
        token_ids: (span.token_ids_csv ?? '').split(',').filter(Boolean),
        meta: safeJson(span.u_meta_json),
      })),
      vocab: {
        ...vocabBuckets,
        spans: spanVocab,
      },
      lesson_json: lessonJson,
    };

    const headers = { ...jsonHeaders, 'x-hit': 'ID /arabic/lessons/quran/:id' };

    return new Response(JSON.stringify({ ok: true, result: payload }), { headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= PUT /arabic/lessons/quran/:id ========================= */

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
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

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: 'Title is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const title_ar = normStr(body?.title_ar);
    const lesson_type = 'quran';
    const subtype = normStr(body?.subtype);
    const source = normStr(body?.source);
    const status = normLower(body?.status, 'draft');
    const difficulty = toInt(body?.difficulty, null);

    const lessonJsonObj = normalizeLessonJson(body?.lesson_json ?? body?.lessonJson);
    const lesson_json = JSON.stringify(lessonJsonObj ?? {});

    const res = await ctx.env.DB
      .prepare(
        `
        UPDATE ar_lessons
        SET
          title = ?1,
          title_ar = ?2,
          lesson_type = ?3,
          subtype = ?4,
          source = ?5,
          status = ?6,
          difficulty = ?7,
          lesson_json = ?8,
          updated_at = datetime('now')
        WHERE id = ?9 AND user_id = ?10 AND lesson_type = 'quran'
        RETURNING
          id, user_id, title, title_ar, lesson_type, subtype, source, status, difficulty,
          created_at, updated_at, lesson_json
        `
      )
      .bind(title, title_ar, lesson_type, subtype, source, status, difficulty, lesson_json, id, user.id)
      .first<any>();

    if (!res) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const parsed = safeJsonParse((res.lesson_json as string | null) ?? null);

    return new Response(JSON.stringify({ ok: true, result: { ...res, lesson_json: parsed ?? res.lesson_json } }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

/* ========================= DELETE /arabic/lessons/quran/:id ========================= */

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
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

    const res = await ctx.env.DB
      .prepare(`DELETE FROM ar_lessons WHERE id = ?1 AND user_id = ?2 AND lesson_type = 'quran' RETURNING id`)
      .bind(id, user.id)
      .first<{ id: number }>();

    if (!res?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true, id: res.id }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
