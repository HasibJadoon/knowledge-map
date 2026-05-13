// ─── /al/lexicon routes ───────────────────────────────────────────────────────
//
// Two sets of routes:
//
// 1. Classical source-chunk lexicon (ar_ling_source_chunks):
//      GET /al/lexicon/dict/sources            — list all lexicon source DBs
//      GET /al/lexicon/dict/root/:rootText      — entries for one root, grouped by source
//      GET /al/lexicon/dict/entry/:chunkId      — single chunk by id
//      GET /al/lexicon/dict/search?q=           — text + root search
//
// 2. Structured lexicon entries (ar_ling_lexicon_* tables via LexiconRepo):
//      GET /al/lexicon/search?q=                — search structured entries
//      GET /al/lexicon/:id                      — entry + senses
//      GET /al/lexicon?lemma=                   — entries by lemma

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { LexiconRepo } from '../repositories/lexicon.repo';

// ── display metadata for each source slug ────────────────────────────────────
const SOURCE_META: Record<string, { title_ar: string; title_en: string; author: string; period: string }> = {
  // Lane: new clean import (src_lane_lexicon / lane_lexicon)
  'lane_lexicon':                         { title_ar: 'معجم لين العربي الإنجليزي', title_en: "Lane's Arabic-English Lexicon", author: 'Edward William Lane', period: '19th century' },
  // Lane: legacy slug (lane_quranic_research_perseus) — kept for backward compat until removed
  'lane_quranic_research_perseus':        { title_ar: 'معجم لين',       title_en: "Lane's Arabic-English Lexicon", author: 'Edward William Lane',   period: '19th century' },
  'ketabonline_ibn_manzur_lisan_al_arab': { title_ar: 'لسان العرب',      title_en: 'Lisan al-Arab',                 author: 'ابن منظور',              period: 'classical'    },
  'ketabonline_al_zabidi_taj_al_arus':    { title_ar: 'تاج العروس',      title_en: 'Taj al-Arus',                   author: 'الزبيدي',                period: 'classical'    },
  'ketabonline_al_jawhari_al_sihah':      { title_ar: 'الصحاح',          title_en: 'al-Sihah',                      author: 'الجوهري',                period: 'classical'    },
  'ketabonline_al_raghib_mufradat':       { title_ar: 'مفردات القرآن',   title_en: 'Mufradat al-Quran',             author: 'الراغب الأصفهاني',       period: 'classical'    },
  'saaid_maqayis_al_lugha':               { title_ar: 'مقاييس اللغة',   title_en: 'Maqayis al-Lugha',              author: 'ابن فارس',               period: 'classical'    },
  'qomra_al_qamus_al_muhit':              { title_ar: 'القاموس المحيط',  title_en: 'Al-Qamus al-Muhit',             author: 'الفيروزآبادي',           period: 'classical'    },
  'qomra_al_ubab_al_zakhir':              { title_ar: 'العباب الزاخر',   title_en: 'Al-Ubab al-Zakhir',             author: 'الصاغاني',               period: 'classical'    },
  'qomra_al_misbah_al_munir':             { title_ar: 'المصباح المنير',  title_en: 'Al-Misbah al-Munir',            author: 'الفيومي',                period: 'classical'    },
  'qomra_jamharat_al_lugha':              { title_ar: 'جمهرة اللغة',     title_en: 'Jamharat al-Lugha',             author: 'ابن دريد',               period: 'classical'    },
};

// Raghib first — most Quran-focused; Lane (clean) second for English readers
const SOURCE_ORDER = [
  'ketabonline_al_raghib_mufradat',
  'lane_lexicon',
  'lane_quranic_research_perseus',
  'ketabonline_al_jawhari_al_sihah',
  'ketabonline_ibn_manzur_lisan_al_arab',
  'ketabonline_al_zabidi_taj_al_arus',
  'saaid_maqayis_al_lugha',
  'qomra_al_misbah_al_munir',
  'qomra_al_ubab_al_zakhir',
  'qomra_jamharat_al_lugha',
  'qomra_al_qamus_al_muhit',
];

function srcMeta(slug: string) {
  return SOURCE_META[slug] ?? { title_ar: slug, title_en: slug, author: '', period: '' };
}

function extractUrl(metaJson: string | null): string | null {
  if (!metaJson) return null;
  try { return (JSON.parse(metaJson) as { source_url?: string; locator?: { source_url?: string } }).source_url
              ?? (JSON.parse(metaJson) as { locator?: { source_url?: string } }).locator?.source_url
              ?? null; }
  catch { return null; }
}

function normArabic(t: string): string {
  return t
    .replace(/[ً-ٰٟ]/g, '')  // harakat
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

const BILINGUAL_SLUGS = new Set(['lane_lexicon', 'lane_quranic_research_perseus']);

interface DictEntry {
  id: string; source_slug: string; heading_norm: string | null; root_id: string | null;
  text_ar: string; text_en: string | null; page_no: number | null; volume_no: number | null;
  chunk_seq: number; source_url: string | null; is_bilingual: boolean;
}

function toEntry(r: Record<string, unknown>): DictEntry {
  const slug = (r.source_slug as string) ?? '';
  return {
    id:           r.id as string,
    source_slug:  slug,
    heading_norm: r.heading_norm as string | null,
    root_id:      r.root_id as string | null,
    text_ar:      r.text_ar as string,
    text_en:      r.text_en as string | null,
    page_no:      r.page_no as number | null,
    volume_no:    r.volume_no as number | null,
    chunk_seq:    (r.chunk_seq as number) ?? 0,
    source_url:   extractUrl(r.meta_json as string | null),
    is_bilingual: BILINGUAL_SLUGS.has(slug),
  };
}

interface LaneQualityScanRow {
  id: string;
  root_text: string | null;
  heading_norm: string | null;
  display_heading_ar: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  definition_en: string | null;
  cleaner_json: string | null;
  has_arabic_form_block: number;
}

interface LaneQualityRow {
  lexicon_entry_id: string;
  root_text: string;
  heading_norm: string | null;
  display_heading_ar: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  has_empty_aor: number;
  has_empty_infinitive: number;
  has_empty_synonym: number;
  has_circle_placeholder: number;
  has_form_missing: number;
  has_duplicate_and: number;
  has_bare_cross_ref: number;
  has_orphan_syn: number;
  has_quran_marker: number;
  has_arabic_form_block: number;
  entry_type: string | null;
  broken_patterns_json: string;
  repair_priority: number;
  issue_count: number;
  suggested_patch_types_json: string;
}

function safeParseObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function hasLaneQuranMarker(text: string): boolean {
  return /\b(?:Kur|Qur|Ḳur)\b|Ḳur,|Kur,|Qur,|lxxviii|lxvi|xxviii|xliii|xii|xv\.|xxxviii|xxii/i.test(text);
}

function scanLaneQuality(row: LaneQualityScanRow): LaneQualityRow {
  const def = row.definition_en ?? '';
  const cleaner = safeParseObject(row.cleaner_json);
  const defClean = typeof cleaner.definition_clean === 'string' ? cleaner.definition_clean : '';
  const brokenPatterns = asStringArray(cleaner.broken_patterns);

  const hasEmptyAor = /aor\.\s*,/.test(def) || /aor\.\s*\[form missing\]/i.test(defClean);
  const hasEmptyInf = /inf\. n\.\s*,/.test(def) || /inf\. n\.\s*\[form missing\]/i.test(defClean);
  const hasEmptySyn = /syn\.\s*:/.test(def) || /syn\.\s*\[form missing\]/i.test(defClean);
  const hasCircle = def.includes('[◌]');
  const hasFormMissing = defClean.includes('[form missing]');
  const hasDuplicateAnd = /\band\s+and\b/i.test(def) || /\band\s+and\b/i.test(defClean);
  const hasBareCrossRef = brokenPatterns.includes('bare_cross_ref') || /see\s+\[related entry\]/i.test(defClean);
  const hasOrphanSyn = brokenPatterns.includes('orphan_syn') || /syn\.\s*\[form missing\]/i.test(defClean);
  const hasQuran = hasLaneQuranMarker(def) || hasLaneQuranMarker(defClean);

  const suggested = new Set<string>();
  if (hasEmptyAor || hasEmptyInf || hasFormMissing || hasCircle) suggested.add('missing_form');
  if (hasEmptySyn || hasOrphanSyn || hasBareCrossRef) suggested.add('cross_reference');
  if (hasQuran) suggested.add('quran_ref');
  if (hasDuplicateAnd || hasCircle) suggested.add('parser_noise');

  const issueCount = [
    hasEmptyAor,
    hasEmptyInf,
    hasEmptySyn,
    hasCircle,
    hasFormMissing,
    hasDuplicateAnd,
    hasBareCrossRef,
    hasOrphanSyn,
    hasQuran,
    row.has_arabic_form_block ? false : true,
  ].filter(Boolean).length;

  const repairPriority =
    (hasFormMissing ? 40 : 0) +
    (hasCircle ? 35 : 0) +
    (hasEmptyAor ? 20 : 0) +
    (hasEmptyInf ? 20 : 0) +
    (hasEmptySyn ? 12 : 0) +
    (hasBareCrossRef ? 10 : 0) +
    (hasQuran ? 8 : 0) +
    (hasDuplicateAnd ? 5 : 0) +
    (row.has_arabic_form_block ? 0 : 4);

  return {
    lexicon_entry_id: row.id,
    root_text: row.root_text ?? '',
    heading_norm: row.heading_norm,
    display_heading_ar: row.display_heading_ar,
    page_no: row.page_no,
    source_entry_seq: row.source_entry_seq,
    has_empty_aor: hasEmptyAor ? 1 : 0,
    has_empty_infinitive: hasEmptyInf ? 1 : 0,
    has_empty_synonym: hasEmptySyn ? 1 : 0,
    has_circle_placeholder: hasCircle ? 1 : 0,
    has_form_missing: hasFormMissing ? 1 : 0,
    has_duplicate_and: hasDuplicateAnd ? 1 : 0,
    has_bare_cross_ref: hasBareCrossRef ? 1 : 0,
    has_orphan_syn: hasOrphanSyn ? 1 : 0,
    has_quran_marker: hasQuran ? 1 : 0,
    has_arabic_form_block: row.has_arabic_form_block ? 1 : 0,
    entry_type: typeof cleaner.entry_type === 'string' ? cleaner.entry_type : null,
    broken_patterns_json: JSON.stringify(brokenPatterns),
    repair_priority: repairPriority,
    issue_count: issueCount,
    suggested_patch_types_json: JSON.stringify([...suggested]),
  };
}

const LANE_PROBLEM_COLUMNS: Record<string, string> = {
  empty_aor: 'has_empty_aor',
  empty_infinitive: 'has_empty_infinitive',
  empty_synonym: 'has_empty_synonym',
  circle_placeholder: 'has_circle_placeholder',
  form_missing: 'has_form_missing',
  duplicate_and: 'has_duplicate_and',
  bare_cross_ref: 'has_bare_cross_ref',
  orphan_syn: 'has_orphan_syn',
  quran_marker: 'has_quran_marker',
  missing_arabic_form_block: 'has_arabic_form_block',
};

async function rebuildLaneQualityForRoot(
  env: ArLinguisticsEnv,
  rootText: string,
  limit: number,
): Promise<{ scanned: number; indexed: number; with_issues: number }> {
  const { results } = await env.DB_AL
    .prepare(`
      SELECT e.id,
             e.root_text,
             e.heading_norm,
             e.display_heading_ar,
             e.page_no,
             e.source_entry_seq,
             e.definition_en,
             e.cleaner_json,
             EXISTS (
               SELECT 1
               FROM ar_ling_source_lexicon_display_blocks b
               WHERE b.lexicon_entry_id = e.id
                 AND b.block_type = 'arabic_form'
             ) AS has_arabic_form_block
      FROM ar_ling_lexicon_entries e
      WHERE e.source_slug = 'lane_lexicon'
        AND e.root_text = ?
      ORDER BY e.page_no ASC, e.source_entry_seq ASC
      LIMIT ?
    `)
    .bind(rootText, limit)
    .all<LaneQualityScanRow>();

  if (!results.length) return { scanned: 0, indexed: 0, with_issues: 0 };

  const statements = results.map(row => {
    const q = scanLaneQuality(row);
    return env.DB_AL.prepare(`
      INSERT OR REPLACE INTO ar_ling_lane_quality_index (
        lexicon_entry_id,
        root_text,
        heading_norm,
        display_heading_ar,
        page_no,
        source_entry_seq,
        has_empty_aor,
        has_empty_infinitive,
        has_empty_synonym,
        has_circle_placeholder,
        has_form_missing,
        has_duplicate_and,
        has_bare_cross_ref,
        has_orphan_syn,
        has_quran_marker,
        has_arabic_form_block,
        entry_type,
        broken_patterns_json,
        repair_priority,
        issue_count,
        suggested_patch_types_json,
        last_scanned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, json(?), ?, ?, json(?), datetime('now'))
    `).bind(
      q.lexicon_entry_id,
      q.root_text,
      q.heading_norm,
      q.display_heading_ar,
      q.page_no,
      q.source_entry_seq,
      q.has_empty_aor,
      q.has_empty_infinitive,
      q.has_empty_synonym,
      q.has_circle_placeholder,
      q.has_form_missing,
      q.has_duplicate_and,
      q.has_bare_cross_ref,
      q.has_orphan_syn,
      q.has_quran_marker,
      q.has_arabic_form_block,
      q.entry_type,
      q.broken_patterns_json,
      q.repair_priority,
      q.issue_count,
      q.suggested_patch_types_json,
    );
  });

  await env.DB_AL.batch(statements);

  return {
    scanned: results.length,
    indexed: statements.length,
    with_issues: results.map(scanLaneQuality).filter(q => q.issue_count > 0).length,
  };
}

export function lexiconRoutes(router: Router<ArLinguisticsEnv>) {

  // ── /al/lexicon/lane/* — Lane repair inspection/admin ─────────────────────

  router.get('/al/lexicon/lane/health', async (_req, env) => {
    const [entries, quality, patches] = await Promise.all([
      env.DB_AL.prepare(`
        SELECT COUNT(*) AS entries,
               COUNT(DISTINCT root_text) AS roots,
               SUM(CASE WHEN morphology_json IS NOT NULL THEN 1 ELSE 0 END) AS morphology_json,
               SUM(CASE WHEN sense_json IS NOT NULL THEN 1 ELSE 0 END) AS sense_json,
               SUM(CASE WHEN examples_json IS NOT NULL THEN 1 ELSE 0 END) AS examples_json,
               SUM(CASE WHEN citations_json IS NOT NULL THEN 1 ELSE 0 END) AS citations_json
        FROM ar_ling_lexicon_entries
        WHERE source_slug = 'lane_lexicon'
      `).first<Record<string, unknown>>(),
      env.DB_AL.prepare(`
        SELECT COUNT(*) AS indexed,
               SUM(CASE WHEN issue_count > 0 THEN 1 ELSE 0 END) AS with_issues,
               SUM(has_empty_aor) AS empty_aor,
               SUM(has_empty_infinitive) AS empty_infinitive,
               SUM(has_empty_synonym) AS empty_synonym,
               SUM(has_circle_placeholder) AS circle_placeholder,
               SUM(has_form_missing) AS form_missing,
               SUM(has_duplicate_and) AS duplicate_and,
               SUM(has_bare_cross_ref) AS bare_cross_ref,
               SUM(has_quran_marker) AS quran_marker,
               MAX(last_scanned_at) AS last_scanned_at
        FROM ar_ling_lane_quality_index
      `).first<Record<string, unknown>>(),
      env.DB_AL.prepare(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
               SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied,
               SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM ar_ling_lane_patch_log
      `).first<Record<string, unknown>>(),
    ]);

    return ok({ entries, quality, patches });
  });

  router.get('/al/lexicon/lane/problems', async (req, env) => {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const root = url.searchParams.get('root')?.trim() ?? '';
    const problem = url.searchParams.get('problem')?.trim() ?? '';

    const where: string[] = ['q.issue_count > 0'];
    const binds: unknown[] = [];
    if (root) {
      where.push('q.root_text = ?');
      binds.push(root);
    }
    if (problem) {
      const column = LANE_PROBLEM_COLUMNS[problem];
      if (!column) return badRequest(`Unknown Lane problem: ${problem}`);
      where.push(problem === 'missing_arabic_form_block' ? `q.${column} = 0` : `q.${column} = 1`);
    }

    const { results } = await env.DB_AL
      .prepare(`
        SELECT q.*,
               e.status,
               e.ai_fill_state,
               substr(e.definition_en, 1, 360) AS definition_preview
        FROM ar_ling_lane_quality_index q
        JOIN ar_ling_lexicon_entries e ON e.id = q.lexicon_entry_id
        WHERE ${where.join(' AND ')}
        ORDER BY q.repair_priority DESC, q.page_no ASC, q.source_entry_seq ASC
        LIMIT ? OFFSET ?
      `)
      .bind(...binds, limit, offset)
      .all<Record<string, unknown>>();

    return ok({ total: results.length, limit, offset, entries: results });
  });

  router.get('/al/lexicon/lane/problems/:rootText', async (req, env, params) => {
    const rootText = decodeURIComponent((params as Record<string, string>).rootText ?? '');
    if (!rootText) return badRequest('rootText required');

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 300);

    const { results } = await env.DB_AL
      .prepare(`
        SELECT q.*,
               e.status,
               e.ai_fill_state,
               substr(e.definition_en, 1, 420) AS definition_preview
        FROM ar_ling_lane_quality_index q
        JOIN ar_ling_lexicon_entries e ON e.id = q.lexicon_entry_id
        WHERE q.root_text = ?
          AND q.issue_count > 0
        ORDER BY q.repair_priority DESC, q.page_no ASC, q.source_entry_seq ASC
        LIMIT ?
      `)
      .bind(rootText, limit)
      .all<Record<string, unknown>>();

    return ok({ root: rootText, total: results.length, entries: results });
  });

  router.post('/al/lexicon/lane/quality/rebuild', async (req, env) => {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try { body = await req.json<Record<string, unknown>>(); } catch { /* optional body */ }

    const rootText = String(body.rootText ?? url.searchParams.get('root') ?? '').trim();
    if (!rootText) return badRequest('rootText is required. Full rebuilds must use npm run lane:quality-index.');

    const limitRaw = Number(body.limit ?? url.searchParams.get('limit') ?? 300);
    const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 300, 500);
    const result = await rebuildLaneQualityForRoot(env, rootText, limit);
    return ok({ root: rootText, ...result });
  });

  // ── /al/lexicon/dict/* — classical source-chunk dictionary ─────────────────

  // GET /al/lexicon/dict/sources
  // List all registered lexicon sources with chunk + root counts.
  router.get('/al/lexicon/dict/sources', async (_req, env) => {
    const { results } = await env.DB_AL
      .prepare(`
        SELECT source_slug,
               COUNT(*)                                              AS total,
               COUNT(DISTINCT heading_norm)                         AS roots,
               SUM(CASE WHEN is_embedded = 1 THEN 1 ELSE 0 END)    AS embedded
        FROM   ar_ling_source_chunks
        WHERE  chunk_kind IN ('lexical_entry', 'lexical_word_entry', 'lexicon_entry', 'root_entry')
          AND  source_slug IS NOT NULL
        GROUP BY source_slug
        ORDER BY total DESC
      `)
      .all<{ source_slug: string; total: number; roots: number; embedded: number }>();

    const sources = results.map(r => ({
      ...srcMeta(r.source_slug),
      slug:     r.source_slug,
      total:    r.total,
      roots:    r.roots,
      embedded: r.embedded,
    }));
    return ok({ sources, total: sources.length });
  });

  // GET /al/lexicon/dict/root/:rootText
  // All lexicon entries for an Arabic root, grouped by source.
  // Params: sources (comma-sep slugs), limit (per source, default 20)
  router.get('/al/lexicon/dict/root/:rootText', async (req, env, params) => {
    const rootRaw  = decodeURIComponent((params as Record<string, string>).rootText ?? '');
    if (!rootRaw)  return badRequest('rootText required');

    const url       = new URL(req.url);
    const rootNorm  = normArabic(rootRaw);
    const perSource = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const slugFilter = (url.searchParams.get('sources') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);

    const ph    = slugFilter.length ? `AND source_slug IN (${slugFilter.map(() => '?').join(',')})` : '';
    const params2 = [rootNorm, ...slugFilter];

    const { results } = await env.DB_AL
      .prepare(`
        SELECT id, source_slug, heading_norm, root_id,
               text_ar, text_en, page_no, volume_no, chunk_seq, meta_json
        FROM   ar_ling_source_chunks
        WHERE  chunk_kind IN ('lexical_entry', 'lexical_word_entry', 'lexicon_entry', 'root_entry')
          AND  heading_norm = ?
          ${ph}
        ORDER BY source_slug, chunk_seq
        LIMIT ${perSource * Math.max(SOURCE_ORDER.length, 6)}
      `)
      .bind(...params2)
      .all<Record<string, unknown>>();

    // Group and order by source
    const bySlug: Record<string, DictEntry[]> = {};
    for (const r of results) {
      const slug = (r.source_slug as string) ?? 'unknown';
      (bySlug[slug] ??= []).push(toEntry(r));
    }

    const ordered = [
      ...SOURCE_ORDER.filter(s => bySlug[s]),
      ...Object.keys(bySlug).filter(s => !SOURCE_ORDER.includes(s)),
    ];

    const sources = ordered.map(slug => ({
      slug,
      ...srcMeta(slug),
      entries:     bySlug[slug].slice(0, perSource),
      entry_count: bySlug[slug].length,
    }));

    // ── Root + lemma metadata (dictionary-style: root → lemmas → forms) ──
    // Mirrors quranmorphology.com / lexicon.quranic-research.net layout:
    //   root header (ر ج ع) → lemmas (رَجَعَ, رَاجِع, مَرْجِع, …) → POS + Quran freq
    const rootRow = await env.DB_AL
      .prepare(`SELECT id, root_text, root_letters, root_type, weak_pattern,
                       frequency_quran, meaning_core_ar, meaning_core_en
                FROM   ar_ling_roots
                WHERE  root_text = ? OR root_letters = ?
                LIMIT 1`)
      .bind(rootRaw, rootRaw)
      .first<Record<string, unknown>>();

    let lemmas: Array<Record<string, unknown>> = [];
    if (rootRow) {
      const { results: lemmaRows } = await env.DB_AL
        .prepare(`SELECT l.id, l.lemma_text, l.lemma_text_bare, l.part_of_speech,
                         l.verb_form, l.is_quran_word, l.frequency_quran
                  FROM   ar_ling_lemmas l
                  WHERE  l.root_id = ?
                  UNION
                  SELECT l.id, l.lemma_text, l.lemma_text_bare, l.part_of_speech,
                         l.verb_form, l.is_quran_word, l.frequency_quran
                  FROM   ar_ling_lemmas l
                  JOIN   ar_ling_lemma_root_links lr ON lr.lemma_id = l.id
                  WHERE  lr.root_id = ?
                  ORDER BY frequency_quran DESC, lemma_text`)
        .bind(rootRow.id, rootRow.id)
        .all<Record<string, unknown>>();
      lemmas = lemmaRows;
    }

    if (!sources.length && !lemmas.length && !rootRow) {
      return notFound(`No entries or lemmas for root: ${rootRaw}`);
    }

    return ok({
      root: {
        text_ar:        (rootRow?.root_text as string) ?? rootRaw,
        letters:        (rootRow?.root_letters as string) ?? null,
        type:           (rootRow?.root_type as string) ?? null,
        weak_pattern:   (rootRow?.weak_pattern as string) ?? null,
        frequency_quran:(rootRow?.frequency_quran as number) ?? null,
        meaning_ar:     (rootRow?.meaning_core_ar as string) ?? null,
        meaning_en:     (rootRow?.meaning_core_en as string) ?? null,
        norm:           rootNorm,
      },
      lemmas: lemmas.map(l => ({
        id:              l.id,
        text_ar:         l.lemma_text,           // vocalized standard Arabic
        text_bare:       l.lemma_text_bare,
        part_of_speech:  l.part_of_speech,
        verb_form:       l.verb_form,
        is_quran_word:   !!l.is_quran_word,
        frequency_quran: l.frequency_quran,
      })),
      lemma_count:   lemmas.length,
      sources,
      source_count:  sources.length,
      total_entries: results.length,
    });
  });

  // GET /al/lexicon/dict/entry/:chunkId
  // Single lexicon chunk by D1 id.
  router.get('/al/lexicon/dict/entry/:chunkId', async (req, env, params) => {
    const chunkId = decodeURIComponent((params as Record<string, string>).chunkId ?? '');
    if (!chunkId) return badRequest('chunkId required');

    const row = await env.DB_AL
      .prepare(`SELECT id, source_slug, heading_norm, root_id,
                       text_ar, text_en, page_no, volume_no, chunk_seq, meta_json
                FROM   ar_ling_source_chunks WHERE id = ?`)
      .bind(chunkId)
      .first<Record<string, unknown>>();

    if (!row) return notFound(`Entry not found: ${chunkId}`);
    const entry = toEntry(row);
    return ok({ ...entry, source: srcMeta(entry.source_slug) });
  });

  // GET /al/lexicon/dict/search?q=
  // Text search across all lexicon source chunks.
  // Returns: exact root matches first, then content matches.
  // Params: q (required), sources (comma-sep), limit (default 30)
  router.get('/al/lexicon/dict/search', async (req, env) => {
    const url   = new URL(req.url);
    const query = (url.searchParams.get('q') ?? '').trim();
    if (!query) return badRequest('q param required');

    const qNorm  = normArabic(query);
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
    const slugFilter = (url.searchParams.get('sources') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);

    const ph    = slugFilter.length ? `AND source_slug IN (${slugFilter.map(() => '?').join(',')})` : '';

    const [exactRes, contentRes] = await Promise.all([
      env.DB_AL.prepare(`
        SELECT id, source_slug, heading_norm, root_id,
               text_ar, text_en, page_no, volume_no, chunk_seq, meta_json
        FROM   ar_ling_source_chunks
        WHERE  chunk_kind IN ('lexical_entry', 'lexical_word_entry', 'lexicon_entry', 'root_entry')
          AND  heading_norm = ? ${ph}
        LIMIT ?
      `).bind(qNorm, ...slugFilter, limit).all<Record<string, unknown>>(),

      env.DB_AL.prepare(`
        SELECT id, source_slug, heading_norm, root_id,
               text_ar, text_en, page_no, volume_no, chunk_seq, meta_json
        FROM   ar_ling_source_chunks
        WHERE  chunk_kind IN ('lexical_entry', 'lexical_word_entry', 'lexicon_entry', 'root_entry')
          AND  heading_norm != ?
          AND  (text_ar LIKE ? OR text_en LIKE ? OR heading_norm LIKE ?)
          ${ph}
        ORDER BY source_slug, chunk_seq
        LIMIT ?
      `).bind(qNorm, `%${query}%`, `%${query}%`, `%${qNorm}%`, ...slugFilter, limit).all<Record<string, unknown>>(),
    ]);

    return ok({
      query,
      query_norm:      qNorm,
      root_matches:    exactRes.results.map(toEntry),
      content_matches: contentRes.results.map(toEntry),
      total:           exactRes.results.length + contentRes.results.length,
    });
  });

  // ── /al/lexicon/entries/* — structured lexicon entries, UI-ready ─────────────
  //
  // Reads ar_ling_lexicon_entries + cleaner_json (cleanup pipeline v2).
  // Returns a flat, display-ready shape — no internal fields.
  //
  //   GET /al/lexicon/entries/root/:rootText   ?source=<slug>  ?limit=
  //   GET /al/lexicon/entries/search           ?q=  ?source=   ?limit=
  //   GET /al/lexicon/entries/:id

  interface CitationChip { abbr: string; label: string; label_ar: string; author: string }

  interface LexEntry {
    id:           string;
    heading_ar:   string | null;  // from heading display block
    page_label:   string | null;  // "Lane p. 2139" — from page_ref block
    page:         number | null;
    type:         string;          // definition | cross_ref | grammar_note | stub
    definition:   string | null;   // definition_clean — display-ready
    has_gaps:     boolean;         // true → [◌] placeholders in definition
    arabic_forms: string[];        // related Arabic forms from arabic_form block
    ref_sources:  CitationChip[];  // citation chips for display
  }

  function toUiEntry(row: Record<string, unknown>): LexEntry {
    let cj: Record<string, unknown> = {};
    try { cj = JSON.parse(row.cleaner_json as string ?? '{}') as Record<string, unknown>; } catch { /* */ }

    const details = (cj.citation_details as Array<Record<string, string>> | undefined) ?? [];
    const ref_sources: CitationChip[] = details.map(d => ({
      abbr:     d.abbr     ?? '',
      label:    d.name_en  ?? d.abbr ?? '',
      label_ar: d.name_ar  ?? '',
      author:   d.author   ?? '',
    }));

    // arabic_forms_raw comes from the arabic_form display block, dot-separated
    const arabic_forms = ((row.arabic_forms_raw as string) ?? '')
      .split('·').map((f: string) => f.trim()).filter(Boolean);

    const defClean = (cj.definition_clean as string) ?? null;
    return {
      id:           row.id              as string,
      heading_ar:   (row.heading_ar     ?? row.display_heading_ar) as string | null,
      page_label:   row.page_label      as string | null,
      page:         row.page_no         as number | null,
      type:         (cj.entry_type      as string) ?? 'definition',
      definition:   defClean,
      has_gaps:     !!(cj.has_stripped_arabic) ||
                    (!!defClean && (defClean.includes('[◌]') || defClean.includes('[form missing]'))),
      arabic_forms,
      ref_sources,
    };
  }

  // GET /al/lexicon/entries/lane/:rootText
  // Returns raw LaneGroupedRow shape for the Lane table/clean UI.
  // Runs the canonical grouped SQL: one row per entry, all block pivots.
  // ?limit=100
  router.get('/al/lexicon/entries/lane/:rootText', async (req, env, params) => {
    const rootRaw = decodeURIComponent((params as Record<string, string>).rootText ?? '');
    if (!rootRaw) return badRequest('rootText required');

    const url   = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 300);

    const { results } = await env.DB_AL
      .prepare(`
        SELECT
          e.id              AS entry_id,
          e.display_heading_ar,
          e.lemma_text,
          e.heading_norm,
          e.page_no,
          e.source_entry_seq,
          e.definition_en,
          e.status,
          e.ui_json,
          e.cleaner_json,
          MAX(CASE WHEN b.block_type = 'heading'         THEN b.text_ar  END) AS heading_block_ar,
          MAX(CASE WHEN b.block_type = 'definition'      THEN b.text_en  END) AS definition_block_en,
          MAX(CASE WHEN b.block_type = 'arabic_form'     THEN b.text_ar  END) AS arabic_forms_text,
          MAX(CASE WHEN b.block_type = 'page_ref'        THEN b.text_en  END) AS page_label,
          MAX(CASE WHEN b.block_type = 'raw_collapsible' THEN b.text_en  END) AS raw_label,
          COUNT(b.id)                                                          AS block_count
        FROM  ar_ling_lexicon_entries e
        JOIN  ar_ling_roots r ON r.id = e.root_id
        LEFT JOIN ar_ling_source_lexicon_display_blocks b ON b.lexicon_entry_id = e.id
        WHERE r.root_text = ?
          AND e.source_slug = 'lane_lexicon'
        GROUP BY
          e.id, e.display_heading_ar, e.lemma_text, e.heading_norm,
          e.page_no, e.source_entry_seq, e.definition_en, e.status, e.ui_json, e.cleaner_json
        ORDER BY e.page_no ASC, e.source_entry_seq ASC
        LIMIT ?
      `)
      .bind(rootRaw, limit)
      .all<Record<string, unknown>>();

    return ok({ root: rootRaw, total: results.length, entries: results });
  });

  // GET /al/lexicon/entries/root/:rootText
  // Returns all structured entries for a root, grouped by lexicon source.
  // ?source=lane_lexicon  — filter to one lexicon (optional)
  // ?limit=50             — max entries per source (default 50, max 200)
  router.get('/al/lexicon/entries/root/:rootText', async (req, env, params) => {
    const rootRaw = decodeURIComponent((params as Record<string, string>).rootText ?? '');
    if (!rootRaw) return badRequest('rootText required');

    const url    = new URL(req.url);
    const source = url.searchParams.get('source') ?? '';
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    const sourceCond = source ? 'AND e.source_slug = ?' : '';
    const binds: unknown[] = source
      ? [rootRaw, rootRaw, source, limit]
      : [rootRaw, rootRaw, limit];

    const { results } = await env.DB_AL
      .prepare(`
        SELECT e.id, e.source_slug, e.page_no, e.cleaner_json,
               MAX(CASE WHEN b.block_type = 'heading'     THEN b.text_ar END) AS heading_ar,
               MAX(CASE WHEN b.block_type = 'arabic_form' THEN b.text_ar END) AS arabic_forms_raw,
               MAX(CASE WHEN b.block_type = 'page_ref'    THEN b.text_en END) AS page_label
        FROM   ar_ling_lexicon_entries e
        LEFT JOIN ar_ling_source_lexicon_display_blocks b ON b.lexicon_entry_id = e.id
        LEFT JOIN ar_ling_lemmas l ON l.id = e.lemma_id
        LEFT JOIN ar_ling_roots  r ON r.id = e.root_id
        WHERE  (r.root_text = ? OR l.lemma_text = ?)
          ${sourceCond}
        GROUP BY e.id
        ORDER BY e.page_no ASC, e.source_entry_seq ASC
        LIMIT ?
      `)
      .bind(...binds)
      .all<Record<string, unknown>>();

    if (!results.length) return notFound(`No entries for root: ${rootRaw}`);

    // Group by source, preserve canonical order
    const bySlug: Record<string, LexEntry[]> = {};
    for (const row of results) {
      const slug = (row.source_slug as string) ?? 'unknown';
      (bySlug[slug] ??= []).push(toUiEntry(row));
    }

    const ordered = [
      ...SOURCE_ORDER.filter(s => bySlug[s]),
      ...Object.keys(bySlug).filter(s => !SOURCE_ORDER.includes(s)),
    ];

    const lexicons = ordered.map(slug => {
      const m = srcMeta(slug);
      return {
        slug,
        title:    m.title_en,
        title_ar: m.title_ar,
        author:   m.author,
        period:   m.period,
        count:    bySlug[slug].length,
        entries:  bySlug[slug],
      };
    });

    return ok({
      root:         rootRaw,
      source:       source || null,
      total:        results.length,
      lexicons,
    });
  });

  // GET /al/lexicon/entries/search?q=&source=&limit=
  // Searches heading_ar and definition_clean.
  // Results are flat (not grouped) — suitable for search results list.
  router.get('/al/lexicon/entries/search', async (req, env) => {
    const url    = new URL(req.url);
    const q      = (url.searchParams.get('q') ?? '').trim();
    if (!q) return badRequest('q param required');

    const source = url.searchParams.get('source') ?? '';
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);

    const sourceCond = source ? 'AND e.source_slug = ?' : '';
    const pattern    = `%${q}%`;
    const binds: unknown[] = source
      ? [q, pattern, pattern, source, limit]
      : [q, pattern, pattern, limit];

    const { results } = await env.DB_AL
      .prepare(`
        SELECT e.id, e.source_slug, e.page_no, e.cleaner_json,
               MAX(CASE WHEN b.block_type = 'heading'     THEN b.text_ar END) AS heading_ar,
               MAX(CASE WHEN b.block_type = 'arabic_form' THEN b.text_ar END) AS arabic_forms_raw,
               MAX(CASE WHEN b.block_type = 'page_ref'    THEN b.text_en END) AS page_label
        FROM   ar_ling_lexicon_entries e
        LEFT JOIN ar_ling_source_lexicon_display_blocks b ON b.lexicon_entry_id = e.id
        WHERE  (e.display_heading_ar = ?
             OR json_extract(e.cleaner_json, '$.definition_clean') LIKE ?
             OR e.definition_en LIKE ?)
          ${sourceCond}
        GROUP BY e.id
        ORDER BY e.page_no ASC
        LIMIT ?
      `)
      .bind(...binds)
      .all<Record<string, unknown>>();

    return ok({
      q,
      source:  source || null,
      total:   results.length,
      entries: results.map(row => ({
        ...toUiEntry(row),
        lexicon: srcMeta(row.source_slug as string),
      })),
    });
  });

  // GET /al/lexicon/entries/:id
  // Single structured entry — full display payload including original text for drawer/detail view.
  router.get('/al/lexicon/entries/:id', async (_req, env, { id }) => {
    const row = await env.DB_AL
      .prepare(`
        SELECT e.id, e.source_slug, e.page_no, e.cleaner_json, e.meta_json,
               r.root_text,
               MAX(CASE WHEN b.block_type = 'heading'     THEN b.text_ar END) AS heading_ar,
               MAX(CASE WHEN b.block_type = 'arabic_form' THEN b.text_ar END) AS arabic_forms_raw,
               MAX(CASE WHEN b.block_type = 'page_ref'    THEN b.text_en END) AS page_label
        FROM   ar_ling_lexicon_entries e
        LEFT JOIN ar_ling_source_lexicon_display_blocks b ON b.lexicon_entry_id = e.id
        LEFT JOIN ar_ling_lemmas l ON l.id = e.lemma_id
        LEFT JOIN ar_ling_roots  r ON r.id = e.root_id
        WHERE  e.id = ?
        GROUP BY e.id
      `)
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) return notFound(`Entry not found: ${id}`);

    let mj: Record<string, unknown> = {};
    try { mj = JSON.parse(row.meta_json as string ?? '{}') as Record<string, unknown>; } catch { /* */ }

    return ok({
      ...toUiEntry(row),
      root:     row.root_text ?? null,
      lexicon:  srcMeta(row.source_slug as string),
      // Scholarly layer — shown in detail drawer only
      definition_scholarly: (mj.definition_original as string) ?? null,
    });
  });

  // ── /al/lexicon/* — structured lexicon (LexiconRepo) ──────────────────────

  // GET /al/lexicon/search?q=كتاب
  router.get('/al/lexicon/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new LexiconRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/lexicon/:id — entry + senses
  router.get('/al/lexicon/:id', async (_req, env, { id }) => {
    const repo = new LexiconRepo(env.DB_AL);
    const entry = await repo.findById(id);
    if (!entry) return notFound(`lexicon entry ${id}`);
    const senses = await repo.sensesByEntry(id);
    return ok({ ...entry, senses });
  });

  // GET /al/lexicon?lemma=AL:ULID — all entries for a lemma
  router.get('/al/lexicon', async (req, env) => {
    const url = new URL(req.url);
    const lemmaId = url.searchParams.get('lemma');
    if (!lemmaId) return badRequest('lemma (AL:ULID) param required');
    return ok(await new LexiconRepo(env.DB_AL).byLemma(lemmaId));
  });
}
