// ─── NearSynonymRepo — all SQL for ar_ling_near_synonym_* ─────────────────────

import { query, queryOne, paginate, executeBatch } from '../../../shared/src/db';
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
      `SELECT ${SET_COLS} FROM ar_ling_root_lemma_furuq_set ${where} ORDER BY set_name`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_lemma_furuq_set ${where}`,
      params,
      page,
    );
  }

  findSetById(id: string): Promise<NearSynonymSet | null> {
    return queryOne<NearSynonymSet>(
      this.db,
      `SELECT ${SET_COLS} FROM ar_ling_root_lemma_furuq_set WHERE id = ?`,
      [id],
    );
  }

  findSetBySlug(slug: string): Promise<NearSynonymSet | null> {
    return queryOne<NearSynonymSet>(
      this.db,
      `SELECT ${SET_COLS} FROM ar_ling_root_lemma_furuq_set WHERE slug = ?`,
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

  async patchSetDetail(
    id: string,
    patch: NearSynonymSetPatch,
  ): Promise<NearSynonymSetDetail | null> {
    const statements: Array<{ sql: string; params?: unknown[] }> = [];
    const now = new Date().toISOString();

    const setAssignments: string[] = ['updated_at = ?'];
    const setValues: unknown[] = [now];
    const setMap: [keyof NearSynonymSetPatch, string][] = [
      ['set_name', 'set_name = ?'],
      ['canonical_en', 'canonical_en = ?'],
      ['canonical_ar', 'canonical_ar = ?'],
      ['canonical_ur', 'canonical_ur = ?'],
      ['description_md', 'description_md = ?'],
      ['pos_hint', 'pos_hint = ?'],
    ];

    for (const [key, sql] of setMap) {
      if (key in patch) {
        setAssignments.push(sql);
        setValues.push(cleanNullable(patch[key]));
      }
    }

    if (setAssignments.length > 1) {
      setValues.push(id);
      statements.push({
        sql: `UPDATE ar_ling_root_lemma_furuq_set SET ${setAssignments.join(', ')} WHERE id = ?`,
        params: setValues,
      });
    }

    for (const member of patch.members ?? []) {
      if (!member.id) continue;
      const memberAssignments: string[] = [];
      const memberValues: unknown[] = [];
      const memberMap: [keyof NearSynonymMemberPatch, string][] = [
        ['arabic_display', 'arabic_display = ?'],
        ['basic_gloss', 'basic_gloss = ?'],
        ['basic_gloss_ur', 'basic_gloss_ur = ?'],
        ['nuance_note', 'nuance_note = ?'],
        ['nuance_note_ur', 'nuance_note_ur = ?'],
        ['contrast_note', 'contrast_note = ?'],
        ['contrast_note_ur', 'contrast_note_ur = ?'],
        ['usage_rule_ur', 'usage_rule_ur = ?'],
        ['quran_usage_pattern_ur', 'quran_usage_pattern_ur = ?'],
      ];

      for (const [key, sql] of memberMap) {
        if (key in member) {
          memberAssignments.push(sql);
          memberValues.push(cleanNullable(member[key]));
        }
      }

      if (memberAssignments.length) {
        memberValues.push(member.id, id);
        statements.push({
          sql: `UPDATE ar_ling_root_lemma_furuq_member SET ${memberAssignments.join(', ')} WHERE id = ? AND set_id = ?`,
          params: memberValues,
        });
      }
    }

    if (statements.length) await executeBatch(this.db, statements);
    return this.getSetDetail(id);
  }

  membersForSet(setId: string): Promise<NearSynonymMember[]> {
    return query<NearSynonymMember>(
      this.db,
      `SELECT ${MEMBER_COLS} FROM ar_ling_root_lemma_furuq_member
       WHERE set_id = ?
         AND NOT (arabic_display IS NULL AND source_status = 'ai_assisted')
       ORDER BY sort_order, arabic_display`,
      [setId],
    ).then(rows => rows.filter(isUsableNearSynonymMember));
  }

  evidenceForSet(setId: string): Promise<NearSynonymEvidence[]> {
    return query<NearSynonymEvidence>(
      this.db,
      `SELECT ${EVIDENCE_COLS} FROM ar_ling_root_lemma_furuq_evidence
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
      `SELECT ${EVIDENCE_COLS} FROM ar_ling_root_lemma_furuq_evidence
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
        .filter((s): s is NearSynonymSetDetail => s !== null && s.members.length > 0)
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
       FROM ar_ling_root_lemma_furuq_evidence e
       WHERE e.surah = ?
         AND EXISTS (
           SELECT 1 FROM ar_ling_root_lemma_furuq_member m
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
       FROM ar_ling_root_lemma_furuq_set s
       INNER JOIN ar_ling_root_lemma_furuq_member m ON m.set_id = s.id
       WHERE m.lemma_id = ?`,
      [lemmaId],
    );
  }
}

export interface NearSynonymMemberPatch {
  id: string;
  arabic_display?: string | null;
  basic_gloss?: string | null;
  basic_gloss_ur?: string | null;
  nuance_note?: string | null;
  nuance_note_ur?: string | null;
  contrast_note?: string | null;
  contrast_note_ur?: string | null;
  usage_rule_ur?: string | null;
  quran_usage_pattern_ur?: string | null;
}

export interface NearSynonymSetPatch {
  set_name?: string | null;
  canonical_en?: string | null;
  canonical_ar?: string | null;
  canonical_ur?: string | null;
  description_md?: string | null;
  pos_hint?: string | null;
  members?: NearSynonymMemberPatch[];
}

function cleanNullable(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

const URDU_ONLY_LETTERS_RE = /[\u0679\u0688\u0691\u067e\u0686\u0698\u06a9\u06af\u06ba\u06be\u06c1\u06c2\u06d2\u06cc]/;
const ARABIC_LETTER_RE = /[\u0621-\u063a\u0641-\u064a\u0670]/;
const LATIN_LETTER_RE = /[A-Za-z]/;
const ARABIC_DIACRITICS_RE = /[\u064b-\u065f\u0670\u06d6-\u06ed]/g;

function isUsableNearSynonymMember(member: NearSynonymMember): boolean {
  const display = member.arabic_display?.trim();
  if (!display) return false;
  if (LATIN_LETTER_RE.test(display) || URDU_ONLY_LETTERS_RE.test(display)) return false;
  if (!ARABIC_LETTER_RE.test(display)) return false;

  const bare = (member.arabic_bare || display)
    .replace(ARABIC_DIACRITICS_RE, '')
    .replace(/[^\u0621-\u063a\u0641-\u064a\u0670]+/g, '');
  if (bare.length < 2) return false;

  return !(member.claim_basis === 'inferred_from_source' && member.confidence === 'needs_review');
}
