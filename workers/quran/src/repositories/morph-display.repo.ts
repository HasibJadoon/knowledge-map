// ─── MorphDisplayRepo — the word view, straight from the display layer ────────
// The Morphology step is WORD-focused. This repo reads the render-ready display
// tables (qr_morph_display_words / _blocks / _sources) and merges the three
// block tiers for one word so the UI renders a dumb list of typed blocks:
//   occurrence (this word's ṣarf + SML iʿrāb) · ayah (context) · root (universal
//   meaning, family, hook, five-lens, lexicon shades, senses, SS-grounded
//   examples, word-focused tafsīr). Everything trilingual (en/ar/ur); Arabic
//   terms stay Arabic. No shaping logic here beyond JSON hydration + ordering.

import { query, queryOne } from '../../../shared/src/db';

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
  wazn_ar: string | null; form_roman: string | null; features_json: string | null;
  is_anchor: number; importance: number; difficulty: number | null; frequency_quran: number | null;
}
interface BlockRow {
  scope_level: string; block_type: string; block_subtype: string | null; display_order: number;
  title_ar: string | null; title_en: string | null; title_ur: string | null;
  text_ar: string | null; text_en: string | null; text_ur: string | null;
  data_json: string | null; source_slug: string | null; source_ref: string | null; source_page: string | null;
  is_synthesis: number; register: string | null;
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

    const scopeKeys = [w.word_occ_ref, w.ayah_key, w.root_ar].filter(Boolean) as string[];
    const ph = scopeKeys.map(() => '?').join(',');
    const blocks = await query<BlockRow>(
      this.db,
      `SELECT scope_level, block_type, block_subtype, display_order,
              title_ar, title_en, title_ur, text_ar, text_en, text_ur,
              data_json, source_slug, source_ref, source_page, is_synthesis, register
         FROM qr_morph_display_blocks
        WHERE status = 'live'
          AND ( (scope_level = 'occurrence' AND scope_key = ?)
             OR (scope_level = 'ayah'       AND scope_key = ?)
             OR (scope_level = 'root'       AND scope_key = ?) )
        ORDER BY display_order`,
      [w.word_occ_ref ?? '', w.ayah_key ?? '', w.root_ar ?? ''],
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

    return {
      word: {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index, ayah_key: w.ayah_key,
        surface_ar: w.surface_ar, surface_bare: w.surface_bare, lemma_ar: w.lemma_ar,
        root_ar: w.root_ar, root_display: w.root_display, group: w.word_group,
        pos: { ar: w.pos_ar, en: w.pos_en, ur: w.pos_ur },
        gloss: { ar: w.gloss_ar, en: w.gloss_en, ur: w.gloss_ur },
        sarf: { derived_ar: w.derived_type_ar, derived_en: w.derived_type_en, derived_ur: w.derived_type_ur,
                wazn_ar: w.wazn_ar, form_roman: w.form_roman, features: hydrate(w.features_json) },
        badge_color: w.badge_color, is_anchor: !!w.is_anchor,
        importance: w.importance, difficulty: w.difficulty, frequency_quran: w.frequency_quran,
      },
      blocks: blocks.map(b => ({
        type: b.block_type, subtype: b.block_subtype, tier: b.scope_level, order: b.display_order,
        title: { ar: b.title_ar, en: b.title_en, ur: b.title_ur },
        text: { ar: b.text_ar, en: b.text_en, ur: b.text_ur },
        data: hydrate(b.data_json), source_slug: b.source_slug, source_ref: b.source_ref,
        source_page: b.source_page, is_synthesis: !!b.is_synthesis, register: b.register,
      })),
      sources: Object.fromEntries(sources.map(s => [s.source_slug, {
        kind: s.kind, title_ar: s.title_ar, title_en: s.title_en,
        author_ar: s.author_name_ar, author_en: s.author_name_en, author_ur: s.author_name_ur,
        death_h: s.death_year_hijri, register: s.register,
        badge_color: s.badge_color, badge_glyph: s.badge_glyph, order: s.display_order,
      }])),
    };
  }

  /** Grid: promoted content words for a surah (noun/verb cards, never ḥarf). */
  async grid(surah: number): Promise<unknown[]> {
    const rows = await query<WordRow>(
      this.db,
      `SELECT * FROM qr_morph_display_words
        WHERE surah_no = ? AND is_promoted = 1 AND status = 'live'
        ORDER BY ayah_no, word_index`,
      [surah],
    ).catch(() => [] as WordRow[]);
    return rows.map(w => ({
      id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index,
      surface_ar: w.surface_ar, lemma_ar: w.lemma_ar, root_ar: w.root_ar, root_display: w.root_display,
      group: w.word_group, pos_ar: w.pos_ar,
      gloss: { ar: w.gloss_ar, en: w.gloss_en, ur: w.gloss_ur },
      derived_type_ar: w.derived_type_ar, wazn_ar: w.wazn_ar, badge_color: w.badge_color,
      is_anchor: !!w.is_anchor, frequency_quran: w.frequency_quran,
    }));
  }
}
