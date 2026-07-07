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
  // nakira (INDEF, tanwīn) on the stem; maʿrifa is inferred from the ال (DET)
  // prefix, a proper noun, or a pronoun suffix (definite by annexation). A bare
  // muḍāf with none of these stays contextual → no chip.
  const definite =
    m.pos === 'PN' ||
    m.prefixes.some((p) => (p.tag ?? '').toUpperCase() === 'DET') ||
    m.suffixes.some((sf) => (sf.tag ?? '').toUpperCase() === 'PRON');
  const stateAr = m.state_ar ?? (definite ? 'معرفة' : null);
  const stateEn = m.state ?? (definite ? 'definite' : null);
  push('state', stateAr, stateEn);
  push('number', m.number_ar ?? (m.gender_ar ? 'مفرد' : null), m.number ?? (m.gender_ar ? 'singular' : null));
  push('gender', m.gender_ar, m.gender);
  push('type', typeAr, typeEn);
  return out;
}

// ── plain-noun mīzān derivation ───────────────────────────────────────────────
// QAC gives no pattern for plain nouns, so we derive it from the vocalised lemma
// by aligning the root letters to ف/ع/ل. Sound triliteral/quadriliteral roots
// only — doubled and weak roots (where a root letter is assimilated/transformed)
// return null rather than a guessed pattern.

const HARAKAT = new Set([...'ًٌٍَُِّْٰـ']);
const isHarakah = (c: string): boolean => HARAKAT.has(c);
const MIZAN = ['ف', 'ع', 'ل', 'ل', 'ل'];

/** Normalise a consonant for root matching (hamza/alif family, yā/ā-maqṣūra, tā-marbūṭa). */
function normLetter(c: string): string {
  if ('أإآاٱءؤئ'.includes(c)) return 'ء';
  if (c === 'ى') return 'ي';
  if (c === 'ة') return 'ت';
  return c;
}

function rootLetters(root: string | null | undefined): string[] {
  return Array.from((root ?? '').replace(/[ـ\s]/g, '')).filter((c) => !isHarakah(c));
}

/**
 * Derive a plain-noun wazn from its vocalised lemma + root. Walk the lemma;
 * consonants matching the next root letter (in order) become ف/ع/ل keeping their
 * harakah, other consonants are copied literally. Doubled roots are skipped, and
 * if any root letter isn't placed in order (weak/irregular) → null.
 */
export function deriveNounWazn(lemma: string | null | undefined, root: string | null | undefined): string | null {
  const R = rootLetters(root);
  if (R.length < 3 || R.length > 4) return null;
  let ri = 0;
  let out = '';
  let dbl = false;   // last-matched letter is the first of an identical pair (gemination)
  for (const c of Array.from(lemma ?? '')) {
    if (isHarakah(c)) {
      // a shadda over a geminated radical spells the pair out as عْل (رَبّ → فَعْل)
      if (c === 'ّ' && dbl) { out += 'ْ' + MIZAN[ri]; ri++; dbl = false; }
      else out += c;
      continue;
    }
    if (ri < R.length && normLetter(c) === normLetter(R[ri])) {
      out += MIZAN[ri];
      dbl = ri + 1 < R.length && normLetter(R[ri]) === normLetter(R[ri + 1]);
      ri++;
    } else { out += c; dbl = false; }
  }
  return ri === R.length ? out : null;   // weak/irregular roots don't fully align → null
}

/**
 * Best available wazn (pattern) for a word: the curated value, else what QAC
 * gives for the forms it covers — participles (مُفْعِل / مَفْعُول), finite verbs
 * (أَفْعَلَ / فَعَلَ …), verbal nouns — else, for a plain noun, the mīzān derived
 * from its lemma + root (sound roots only). Null when nothing is derivable.
 */
// Verbal-noun (maṣdar) pattern by verb form — regular for the augmented forms.
// Form I maṣdars and Form III (فِعَال vs مُفَاعَلَة) are irregular → not derived.
const MASDAR_AR: Record<string, string> = {
  II: 'تَفْعِيل', IV: 'إِفْعَال', V: 'تَفَعُّل', VI: 'تَفَاعُل',
  VII: 'اِنْفِعَال', VIII: 'اِفْتِعَال', IX: 'اِفْعِلَال', X: 'اِسْتِفْعَال',
};

export function waznOf(
  curated: string | null | undefined,
  tagJson: unknown,
  lemma: string | null = null,
  root: string | null = null,
  bucket: Bucket = 'noun',
): string | null {
  const c = typeof curated === 'string' ? curated.trim() : '';
  if (c) return c;
  const m = parseQacMorphology(tagJson);
  if (m.wazn_ar && m.wazn_ar.trim()) return m.wazn_ar.trim();
  // maṣdar of an augmented verb → its regular pattern
  if (m.derived === 'verbal_noun' && m.form && MASDAR_AR[m.form]) return MASDAR_AR[m.form];
  if (bucket === 'noun') {
    // Derive from the passed (column) lemma; if that fails — because the lemma
    // column is misaligned to another word, or unvocalised — fall back to the
    // QAC tag's own lemma, which is position-correct and vocalised.
    return deriveNounWazn(lemma, root) ?? deriveNounWazn(m.lemma_ar, root);
  }
  return null;
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
