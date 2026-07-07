// ─── Morphology card shaping — shared by both word-card grids ─────────────────
// The full-surah grid (/qr/surahs/:id/morphology) and the passage study grid
// (/qr/study/morph/grid/:id) paint the SAME card. This module derives the two
// card fields that come from the QAC morphology tag / sense list so both
// endpoints stay identical: the grammatical-feature chips and the compact
// range-of-meanings line. Pure, I/O-free.

import { parseQacMorphology } from './qac-morph';

/** A grammatical-feature chip. `cat` drives the card colour; `ar` is the label. */
export type FeatCat = 'status' | 'state' | 'number' | 'gender' | 'type' | 'tense' | 'voice' | 'form';
export interface MorphFeat { cat: FeatCat; ar: string; en: string | null }

type Bucket = 'noun' | 'verb';

/** Augmented verb forms (II–X) → model verb. Form I is authored per word (its
 *  family depends on the present-tense vowel, which the QAC tag doesn't give). */
const FORM_MODEL_AR: Record<string, string> = {
  II: 'فَعَّلَ', III: 'فَاعَلَ', IV: 'أَفْعَلَ', V: 'تَفَعَّلَ', VI: 'تَفَاعَلَ',
  VII: 'اِنْفَعَلَ', VIII: 'اِفْتَعَلَ', IX: 'اِفْعَلَّ', X: 'اِسْتَفْعَلَ',
};

/**
 * Grammatical-feature chips from the QAC stem, ordered as the card reads them.
 * Nouns: case (iʿrāb) · number · gender · type. Verbs: tense · voice.
 * `typeAr`/`typeEn` are the curated/parsed derived type (اسم فاعل / مصدر …).
 *
 * QAC leaves the unmarked defaults implicit, so we restore them: a noun with a
 * gender but no number token is singular (مفرد); a finite verb with no voice
 * token is active (معلوم) — the Arabic defaults.
 */
export function buildFeats(
  bucket: Bucket,
  tagJson: unknown,
  typeAr: string | null,
  typeEn: string | null,
  verbFormAr: string | null = null,
): MorphFeat[] {
  const m = parseQacMorphology(tagJson);
  const out: MorphFeat[] = [];
  const push = (cat: FeatCat, ar: string | null, en: string | null): void => {
    if (ar) out.push({ cat, ar, en: en ?? null });
  };

  if (bucket === 'verb') {
    push('tense', m.aspect_ar, m.aspect);
    // voice as maʿlūm / majhūl (short Arabic names). Active is unmarked in QAC.
    const voiceAr = m.voice === 'passive' ? 'مجهول' : (m.voice_ar ?? (m.aspect_ar ? 'معلوم' : null));
    push('voice', voiceAr, m.voice ?? (m.aspect_ar ? 'active' : null));
    // form / family: authored (Form I family) else the augmented model from QAC.
    const formAr = verbFormAr ?? (m.form && m.form !== 'I' ? (FORM_MODEL_AR[m.form] ?? null) : null);
    push('form', formAr, m.form ?? null);
    return out;
  }

  push('status', m.case_ar, m.case);
  // definiteness (maʿrifa / nakira) — Arabic-only noun property. QAC flags
  // nakira (INDEF) on the stem but marks maʿrifa via the ال (DET) prefix, so
  // infer معرفة from a determiner prefix when no stem flag is present.
  const hasDet = m.prefixes.some((p) => (p.tag ?? '').toUpperCase() === 'DET');
  const stateAr = m.state_ar ?? (hasDet ? 'معرفة' : null);
  const stateEn = m.state ?? (hasDet ? 'definite' : null);
  push('state', stateAr, stateEn);
  push('number', m.number_ar ?? (m.gender_ar ? 'مفرد' : null), m.number ?? (m.gender_ar ? 'singular' : null));
  push('gender', m.gender_ar, m.gender);
  push('type', typeAr, typeEn);
  return out;
}

/** Compact range of meanings — authored range, else the sense list joined. */
export function rangeOf(
  senseRange: string | null,
  meanings: Array<{ en?: string | null }> | null,
): string | null {
  if (senseRange && senseRange.trim()) return senseRange.trim();
  const joined = (meanings ?? []).map((m) => (m?.en ?? '').trim()).filter(Boolean).join(' · ');
  return joined || null;
}
