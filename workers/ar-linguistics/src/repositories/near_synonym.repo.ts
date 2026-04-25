// ─── NearSynonymRepo — all SQL for ar_ling_near_synonym_* ─────────────────────

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';
import type {
  NearSynonymSet,
  NearSynonymMember,
  NearSynonymEvidence,
  NearSynonymSetDetail,
  QuranNearSynonymResult,
} from '../schemas/near_synonym.schema';

const SET_COLS = `
  id, set_name, description_md, slug, canonical_en, canonical_ar, canonical_ur,
  semantic_domain_id, pos_hint, short_summary, source_status,
  confidence, review_status, created_at`;

const MEMBER_COLS = `
  id, set_id, lemma_id, nuance_note, arabic_display, arabic_bare,
  basic_gloss, basic_gloss_ur, contrast_note, contrast_note_ur,
  usage_rule, usage_rule_ur, quran_usage_pattern, quran_usage_pattern_ur,
  nuance_note_ur,
  source_status, claim_basis, confidence, sort_order`;

const EVIDENCE_COLS = `
  id, set_id, member_id, lemma_id, qr_ref, surah, ayah, word_index,
  arabic_quote, translation_quote, explanation_md, evidence_type,
  confidence, validation_status`;

export class NearSynonymRepo {
  constructor(private db: D1Database) {}

  listSets(opts: PaginateOptions & { domain?: string } = {}) {
    const { domain, ...page } = opts;
    const where = domain ? `WHERE semantic_domain_id = ?` : '';
    const params = domain ? [domain] : [];
    return paginate<NearSynonymSet>(
      this.db,
      `SELECT ${SET_COLS} FROM ar_ling_near_synonym_sets ${where} ORDER BY set_name`,
      `SELECT COUNT(*) AS count FROM ar_ling_near_synonym_sets ${where}`,
      params,
      page,
    );
  }

  findSetById(id: string): Promise<NearSynonymSet | null> {
    return queryOne<NearSynonymSet>(
      this.db,
      `SELECT ${SET_COLS} FROM ar_ling_near_synonym_sets WHERE id = ?`,
      [id],
    );
  }

  findSetBySlug(slug: string): Promise<NearSynonymSet | null> {
    return queryOne<NearSynonymSet>(
      this.db,
      `SELECT ${SET_COLS} FROM ar_ling_near_synonym_sets WHERE slug = ?`,
      [slug],
    );
  }

  async getSetDetail(id: string): Promise<NearSynonymSetDetail | null> {
    const [set, members] = await Promise.all([
      this.findSetById(id),
      this.membersForSet(id),
    ]);
    if (!set) return null;
    return { ...set, members };
  }

  membersForSet(setId: string): Promise<NearSynonymMember[]> {
    return query<NearSynonymMember>(
      this.db,
      `SELECT ${MEMBER_COLS} FROM ar_ling_near_synonym_members
       WHERE set_id = ?
         AND NOT (arabic_display IS NULL AND source_status = 'ai_assisted')
       ORDER BY sort_order, arabic_display`,
      [setId],
    );
  }

  evidenceForSet(setId: string): Promise<NearSynonymEvidence[]> {
    return query<NearSynonymEvidence>(
      this.db,
      `SELECT ${EVIDENCE_COLS} FROM ar_ling_near_synonym_evidence
       WHERE set_id = ? ORDER BY surah, ayah`,
      [setId],
    );
  }

  // All near-synonym sets that have evidence in a specific ayah (e.g. "2:4")
  async byQuranRef(qrRef: string): Promise<QuranNearSynonymResult | null> {
    const [surahStr, ayahStr] = qrRef.split(':');
    const surah = parseInt(surahStr, 10);
    const ayah = parseInt(ayahStr, 10);
    if (!surah || !ayah) return null;

    const evidence = await query<NearSynonymEvidence>(
      this.db,
      `SELECT ${EVIDENCE_COLS} FROM ar_ling_near_synonym_evidence
       WHERE surah = ? AND ayah = ? ORDER BY set_id`,
      [surah, ayah],
    );
    if (!evidence.length) return null;

    const setIds = [...new Set(evidence.map(e => e.set_id))];
    const sets = await Promise.all(setIds.map(id => this.getSetDetail(id)));

    return {
      qr_ref: qrRef,
      surah,
      ayah,
      sets: sets
        .filter((s): s is NearSynonymSetDetail => s !== null)
        .map(s => ({
          ...s,
          evidence: evidence.filter(e => e.set_id === s.id),
        })),
    };
  }

  // All near-synonym sets that have evidence anywhere in a surah,
  // restricted to sets that have at least one valid (Arabic) member.
  async bySurah(surah: number): Promise<{ surah: number; sets: NearSynonymSetDetail[] }> {
    const rows = await query<{ set_id: string }>(
      this.db,
      `SELECT DISTINCT e.set_id
       FROM ar_ling_near_synonym_evidence e
       WHERE e.surah = ?
         AND EXISTS (
           SELECT 1 FROM ar_ling_near_synonym_members m
           WHERE m.set_id = e.set_id
             AND NOT (m.arabic_display IS NULL AND m.source_status = 'ai_assisted')
         )
       ORDER BY e.set_id`,
      [surah],
    );
    const sets = await Promise.all(rows.map(r => this.getSetDetail(r.set_id)));
    return {
      surah,
      // Belt-and-suspenders: also drop any set that resolved to null or has no members
      sets: sets.filter((s): s is NearSynonymSetDetail => s !== null && s.members.length > 0),
    };
  }

  // Near-synonym sets for a lemma
  byLemma(lemmaId: string): Promise<NearSynonymSet[]> {
    return query<NearSynonymSet>(
      this.db,
      `SELECT s.id, s.set_name, s.description_md, s.slug, s.canonical_en, s.canonical_ar, s.canonical_ur,
              s.semantic_domain_id, s.pos_hint, s.short_summary, s.source_status,
              s.confidence, s.review_status, s.created_at
       FROM ar_ling_near_synonym_sets s
       INNER JOIN ar_ling_near_synonym_members m ON m.set_id = s.id
       WHERE m.lemma_id = ?`,
      [lemmaId],
    );
  }
}
