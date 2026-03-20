interface Env {
  DB: D1Database;
}

type StudyGridRow = {
  unit_id: string;
  container_id: string;
  order_index: number;
  ayah_from: number;
  ayah_to: number;
  start_ref: string | null;
  end_ref: string | null;
  text_cache: string | null;
  label: string | null;
  theme: string | null;
  has_reading: number | null;
  has_sentence_structure: number | null;
  has_expressions: number | null;
  has_passage_structure: number | null;
  noun_count: number | null;
  verb_count: number | null;
  total_word_count: number | null;
};

const SQL = `
WITH surah_container AS (
  SELECT
    id AS container_id,
    container_type,
    container_key,
    title,
    meta_json
  FROM ar_containers
  WHERE id = 'C:QURAN:' || ?1
    AND container_type = 'quran_surah'
  LIMIT 1
)
SELECT
  u.id AS unit_id,
  u.container_id,
  u.order_index,
  u.ayah_from,
  u.ayah_to,
  u.start_ref,
  u.end_ref,
  u.text_cache,
  json_extract(u.meta_json, '$.label') AS label,
  json_extract(u.meta_json, '$.theme') AS theme,

  MAX(CASE WHEN t.task_type = 'reading' THEN 1 ELSE 0 END) AS has_reading,
  MAX(CASE WHEN t.task_type = 'sentence_structure' THEN 1 ELSE 0 END) AS has_sentence_structure,
  MAX(CASE WHEN t.task_type = 'expressions' THEN 1 ELSE 0 END) AS has_expressions,
  MAX(CASE WHEN t.task_type = 'passage_structure' THEN 1 ELSE 0 END) AS has_passage_structure,

  COUNT(DISTINCT CASE
    WHEN lower(ifnull(qw.class_name, '')) LIKE '%noun%' THEN qw.word_id
  END) AS noun_count,

  COUNT(DISTINCT CASE
    WHEN lower(ifnull(qw.class_name, '')) LIKE '%verb%' THEN qw.word_id
  END) AS verb_count,

  COUNT(DISTINCT qw.word_id) AS total_word_count

FROM surah_container c
JOIN ar_container_units u
  ON u.container_id = c.container_id
LEFT JOIN ar_container_unit_task t
  ON t.unit_id = u.id
LEFT JOIN ar_u_quran_ayah_words qw
  ON qw.surah = ?1
 AND qw.ayah BETWEEN u.ayah_from AND u.ayah_to
GROUP BY
  u.id,
  u.container_id,
  u.order_index,
  u.ayah_from,
  u.ayah_to,
  u.start_ref,
  u.end_ref,
  u.text_cache,
  u.meta_json
ORDER BY u.order_index
`;

const SURAH_SQL = `
SELECT
  id AS container_id,
  container_type,
  container_key,
  title,
  meta_json
FROM ar_containers
WHERE id = 'C:QURAN:' || ?1
  AND container_type = 'quran_surah'
LIMIT 1
`;

function parseJsonSafe(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId = Number(ctx.params['surahId']);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return Response.json(
      { ok: false, error: 'Invalid surahId' },
      { status: 400 }
    );
  }

  try {
    const surah = await ctx.env.DB
      .prepare(SURAH_SQL)
      .bind(surahId)
      .first<{
        container_id: string;
        container_type: string;
        container_key: string | null;
        title: string | null;
        meta_json: string | null;
      }>();

    if (!surah) {
      return Response.json(
        { ok: false, error: 'Surah not found' },
        { status: 404 }
      );
    }

    const { results } = await ctx.env.DB
      .prepare(SQL)
      .bind(surahId)
      .all<StudyGridRow>();

    const meta = parseJsonSafe(surah.meta_json);

    const units = (results ?? []).map((r) => ({
      unit_id: r.unit_id,
      container_id: r.container_id,
      order_index: r.order_index,
      ayah_from: r.ayah_from,
      ayah_to: r.ayah_to,
      start_ref: r.start_ref,
      end_ref: r.end_ref,
      text_cache: r.text_cache,
      label: r.label ?? `Passage ${r.order_index}`,
      theme: r.theme,
      reading: {
        has: !!r.has_reading,
      },
      vocabulary: {
        nouns: r.noun_count ?? 0,
        verbs: r.verb_count ?? 0,
        total_words: r.total_word_count ?? 0,
      },
      sentence_structure: {
        has: !!r.has_sentence_structure,
      },
      expressions: {
        has: !!r.has_expressions,
      },
      passage_structure: {
        has: !!r.has_passage_structure,
      },
    }));

    return Response.json({
      ok: true,
      surahId,
      containerId: surah.container_id,
      surah: {
        container_id: surah.container_id,
        container_type: surah.container_type,
        container_key: surah.container_key,
        title: surah.title,
        ...meta,
      },
      total: units.length,
      units,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
};