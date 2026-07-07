// ─── MorphDisplayRepo — the word view, straight from the display layer ────────
// The Morphology step is WORD-focused. This repo reads the render-ready display
// tables (qr_morph_display_words / _blocks / _sources) and merges the three
// block tiers for one word so the UI renders a dumb list of typed blocks:
//   occurrence (this word's ṣarf + SML iʿrāb) · ayah (context) · root (universal
//   meaning, family, hook, five-lens, lexicon shades, senses, SS-grounded
//   examples, word-focused tafsīr). Everything trilingual (en/ar/ur); Arabic
//   terms stay Arabic. No shaping logic here beyond JSON hydration + ordering.

import { query, queryOne } from '../../../shared/src/db';
import { buildFeats, rangeOf, waznOf } from '../lib/morph-card';

function hydrate(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s || (s[0] !== '{' && s[0] !== '[')) return v;
  try { return JSON.parse(s); } catch { return v; }
}

interface WordRow {
  id: string; word_occ_ref: string | null; surah_no: number; ayah_no: number; word_index: number;
  ayah_key: string | null; surface_ar: string; surface_bare: string | null; lemma_ar: string | null;
  root_ar: string | null; root_display: string | null; word_group: string;
  pos_ar: string | null; pos_en: string | null; pos_ur: string | null;
  gloss_ar: string | null; gloss_en: string | null; gloss_ur: string | null; badge_color: string | null;
  derived_type_ar: string | null; derived_type_en: string | null; derived_type_ur: string | null;
  wazn_ar: string | null; form_roman: string | null; form_ar: string | null; features_json: string | null;
  is_anchor: number; importance: number; difficulty: number | null; frequency_quran: number | null;
  root_meaning_ar: string | null; root_meaning_en: string | null; quran_meanings_json: string | null;
}
interface BlockRow {
  scope_level: string; scope_key: string | null; ayah_key: string | null;
  block_type: string; block_subtype: string | null; display_order: number;
  title_ar: string | null; title_en: string | null; title_ur: string | null;
  text_ar: string | null; text_en: string | null; text_ur: string | null;
  data_json: string | null; source_slug: string | null; source_ref: string | null; source_page: string | null;
  is_synthesis: number; register: string | null; meta_json: string | null;
  registers_json: string | null; media_r2_key: string | null; media_kind: string | null; media_alt: string | null;
}
interface SourceRow {
  source_slug: string; kind: string; title_ar: string | null; title_en: string | null;
  author_name_ar: string | null; author_name_en: string | null; author_name_ur: string | null;
  death_year_hijri: number | null; register: string | null; badge_color: string | null;
  badge_glyph: string | null; display_order: number;
}

export class MorphDisplayRepo {
  constructor(private db: D1Database) {}

  /** Full word view: head + ordered tier-merged blocks + the sources they cite. */
  async wordView(surah: number, ayah: number, wordIndex: number): Promise<unknown | null> {
    const w = await queryOne<WordRow>(
      this.db,
      `SELECT * FROM qr_morph_display_words
        WHERE surah_no = ? AND ayah_no = ? AND word_index = ? AND status = 'live'`,
      [surah, ayah, wordIndex],
    );
    if (!w) return null;

    // All display blocks for this root: scope_level='root' → CORE (static, shared by every
    // context); scope_level='context' → TEMPORAL (belongs to one Qurʾānic occurrence, keyed
    // by scope_key = ayah_key). Legacy 'occurrence'/'ayah' rows fold into TEMPORAL too.
    const blocks = await query<BlockRow>(
      this.db,
      `SELECT scope_level, scope_key, ayah_key, block_type, block_subtype, display_order,
              title_ar, title_en, title_ur, text_ar, text_en, text_ur,
              data_json, source_slug, source_ref, source_page, is_synthesis, register, meta_json,
              registers_json, media_r2_key, media_kind, media_alt
         FROM qr_morph_display_blocks
        WHERE status = 'live' AND root_ar = ?
        ORDER BY display_order`,
      [w.root_ar ?? ''],
    ).catch(() => [] as BlockRow[]);

    const slugs = [...new Set(blocks.map(b => b.source_slug).filter(Boolean))] as string[];
    let sources: SourceRow[] = [];
    if (slugs.length) {
      const sph = slugs.map(() => '?').join(',');
      sources = await query<SourceRow>(
        this.db,
        `SELECT source_slug, kind, title_ar, title_en, author_name_ar, author_name_en, author_name_ur,
                death_year_hijri, register, badge_color, badge_glyph, display_order
           FROM qr_morph_display_sources WHERE source_slug IN (${sph}) AND is_visible = 1`,
        slugs,
      ).catch(() => []);
    }

    // Prev/next promoted word in the surah (for full-page word navigation).
    const sibs = await query<{ ayah_no: number; word_index: number; surface_ar: string }>(
      this.db,
      `SELECT ayah_no, word_index, surface_ar FROM qr_morph_display_words
        WHERE surah_no = ? AND is_promoted = 1 AND status = 'live'
        ORDER BY ayah_no, word_index`,
      [surah],
    ).catch(() => []);
    const idx = sibs.findIndex(s => s.ayah_no === ayah && s.word_index === wordIndex);
    const mkNav = (s: { ayah_no: number; word_index: number; surface_ar: string } | undefined) =>
      s ? { surah, ayah: s.ayah_no, word_index: s.word_index, surface_ar: s.surface_ar } : null;

    // ── shape one block for the client ──
    const mapBlock = (b: BlockRow) => ({
      type: b.block_type, subtype: b.block_subtype,
      tier: b.scope_level, scope: b.scope_level === 'root' ? 'root' : 'word',
      order: b.display_order,
      title: { ar: b.title_ar, en: b.title_en, ur: b.title_ur },
      text: { ar: b.text_ar, en: b.text_en, ur: b.text_ur },
      data: hydrate(b.data_json), source_slug: b.source_slug, source_ref: b.source_ref,
      source_page: b.source_page, is_synthesis: !!b.is_synthesis, register: b.register,
      registers: (hydrate(b.registers_json) as string[] | null) ?? (b.register ? [b.register] : []),
      icon: (hydrate(b.meta_json) as { icon?: string } | null)?.icon ?? null,
      illustration: b.media_r2_key
        ? { url: `/assets/morph-media/${b.block_type}.png`, alt: b.media_alt, kind: b.media_kind }
        : ((hydrate(b.meta_json) as { illustration?: unknown })?.illustration ?? null),
    });

    // CORE (scope root) renders top; TEMPORAL (context) is grouped by its ayah_key.
    const coreBlocks = blocks.filter(b => b.scope_level === 'root').map(mapBlock);
    const tempByKey = new Map<string, ReturnType<typeof mapBlock>[]>();
    for (const b of blocks) {
      if (b.scope_level === 'root') continue;
      const key = b.scope_key ?? b.ayah_key ?? '';
      if (!tempByKey.has(key)) tempByKey.set(key, []);
      tempByKey.get(key)!.push(mapBlock(b));
    }

    // The occurrences block enumerates the contexts; attach each context's temporal blocks.
    const occ = coreBlocks.find(b => b.type === 'occurrences');
    const occItems: any[] = (occ?.data as { items?: any[] })?.items ?? [];
    const contexts = occItems.map(it => ({
      key: it.ayah_key, ayah_key: it.ayah_key, kind_ar: it.kind_ar, en: it.en,
      text_ar: it.text_ar, note: it.note ?? '', source: it.source ?? 'Qurʾān', focus: !!it.focus,
      blocks: tempByKey.get(it.ayah_key) ?? [],
    }));

    // Distinct language-world registers present (drives the sidebar filter).
    const regsAvail = [...new Set(
      [...coreBlocks, ...contexts.flatMap(c => c.blocks)].flatMap(b => b.registers ?? []),
    )];

    return {
      nav: { prev: mkNav(sibs[idx - 1]), next: mkNav(sibs[idx + 1]), index: idx, total: sibs.length },
      word: {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index, ayah_key: w.ayah_key,
        surface_ar: w.surface_ar, surface_bare: w.surface_bare, lemma_ar: w.lemma_ar,
        root_ar: w.root_ar, root_display: w.root_display, group: w.word_group,
        pos: { ar: w.pos_ar, en: w.pos_en, ur: w.pos_ur },
        gloss: { ar: w.gloss_ar, en: w.gloss_en, ur: w.gloss_ur },
        sarf: { derived_ar: w.derived_type_ar, derived_en: w.derived_type_en, derived_ur: w.derived_type_ur,
                wazn_ar: w.wazn_ar, form_roman: w.form_roman, form_ar: w.form_ar, features: hydrate(w.features_json) },
        badge_color: w.badge_color, is_anchor: !!w.is_anchor,
        importance: w.importance, difficulty: w.difficulty, frequency_quran: w.frequency_quran,
      },
      registers_available: regsAvail,
      blocks: coreBlocks,
      contexts,
      sources: Object.fromEntries(sources.map(s => [s.source_slug, {
        kind: s.kind, title_ar: s.title_ar, title_en: s.title_en,
        author_ar: s.author_name_ar, author_en: s.author_name_en, author_ur: s.author_name_ur,
        death_h: s.death_year_hijri, register: s.register,
        badge_color: s.badge_color, badge_glyph: s.badge_glyph, order: s.display_order,
      }])),
    };
  }

  /** Grid: promoted content words for a surah (noun/verb cards, never ḥarf).
   *  The card matches the full-surah morphology grid: the QAC occurrence tag is
   *  joined so the same grammatical-feature chips + range synopsis are shaped. */
  async grid(surah: number): Promise<unknown[]> {
    type GridRow = WordRow & {
      sense_arc_en: string | null;
      sense_range_en: string | null;
      verb_form_ar: string | null;
      morphology_tag_json: string | null;
    };
    const rows = await query<GridRow>(
      this.db,
      `SELECT d.*, o.morphology_tag_json AS morphology_tag_json
         FROM qr_morph_display_words d
         LEFT JOIN qr_word_occurrences o
           ON o.surah = d.surah_no AND o.ayah = d.ayah_no AND o.word_index = d.word_index
        WHERE d.surah_no = ? AND d.is_promoted = 1 AND d.status = 'live'
        ORDER BY d.ayah_no, d.word_index`,
      [surah],
    ).catch(() => [] as GridRow[]);
    return rows.map(w => {
      const meanings = (hydrate(w.quran_meanings_json) as Array<{ ar: string; en: string }> | null) ?? null;
      const bucket = w.word_group === 'verb' ? 'verb' : 'noun';
      return {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index,
        surface_ar: w.surface_ar, lemma_ar: w.lemma_ar, root_ar: w.root_ar, root_display: w.root_display,
        group: w.word_group, pos_ar: w.pos_ar, pos_en: w.pos_en,
        gloss: { ar: w.gloss_ar, en: w.gloss_en, ur: w.gloss_ur },
        derived_type_ar: w.derived_type_ar, derived_type_en: w.derived_type_en,
        wazn_ar: waznOf(w.wazn_ar, w.morphology_tag_json, w.lemma_ar, w.root_ar, bucket), form_roman: w.form_roman, form_ar: w.form_ar,
        root_meaning: { ar: w.root_meaning_ar, en: w.root_meaning_en },
        quran_meanings: meanings,
        badge_color: w.badge_color, is_anchor: !!w.is_anchor, frequency_quran: w.frequency_quran,
        feats: buildFeats(bucket, w.morphology_tag_json, w.derived_type_ar, w.derived_type_en, w.verb_form_ar ?? null),
        sense_arc_en: w.sense_arc_en ?? null,
        sense_range_en: rangeOf(w.sense_range_en, meanings),
      };
    });
  }
}
