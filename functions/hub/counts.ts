import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

async function countTable(db: D1Database, table: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function tryCountTable(db: D1Database, table: string): Promise<number> {
  try {
    return await countTable(db, table);
  } catch {
    return 0;
  }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const db = ctx.env.DB;

    const [
      containers,
      containerUnits,
      containerUnitTasks,
      srs,
      quranSurah,
      quranPassages,
      wvSources,
      wvSourceUnits,
      wvHighlights,
      wvNotes,
      wvWorldviews,
      wvTopics,
      wvComparisons,
      wvPeople,
      wvPodcasts,
      wvPlans,
      arBalagha,
      arDomains,
      arDomainPhrases,
      arGrammarConcepts,
    ] = await Promise.all([
      tryCountTable(db, 'ar_containers'),
      tryCountTable(db, 'ar_container_units'),
      tryCountTable(db, 'ar_container_unit_task'),
      bestCountTable(db, ['km_srs', 'ar_srs']),
      tryCountTable(db, 'ar_quran_surah'),
      tryCountTable(db, 'ar_quran_surah_passage'),
      tryCountTable(db, 'wv_sources'),
      tryCountTable(db, 'wv_source_units'),
      tryCountTable(db, 'wv_highlights'),
      tryCountTable(db, 'wv_notes'),
      tryCountTable(db, 'wv_worldview'),
      tryCountTable(db, 'wv_topic'),
      tryCountTable(db, 'wv_comparison'),
      tryCountTable(db, 'wv_person'),
      tryCountTable(db, 'wv_podcast'),
      tryCountTable(db, 'wv_plan'),
      tryCountTable(db, 'ar_balagha'),
      tryCountTable(db, 'ar_domain'),
      tryCountTable(db, 'ar_domain_phrase'),
      tryCountTable(db, 'ar_grammar_concepts'),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        counts: {
          // Arabic cards (countKey must match exactly)
          containers,
          container_units: containerUnits,
          tasks: containerUnitTasks,
          srs,
          grammar: arGrammarConcepts,
          balagha: arBalagha,
          domains: arDomains,
          // Quran cards
          surahs: quranSurah,
          passages: quranPassages,
          // Worldview cards
          worldviews: wvWorldviews,
          topics: wvTopics,
          sources: wvSources,
          source_units: wvSourceUnits,
          highlights: wvHighlights,
          notes: wvNotes,
          comparisons: wvComparisons,
          people: wvPeople,
          podcasts: wvPodcasts,
          plans: wvPlans,
          // raw camelCase also kept for backwards compat
          arDomainPhrases,
        },
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
