/**
 * Buckwalter-to-Arabic converter for Lane Lexicon form recovery.
 *
 * Covers the standard Buckwalter transliteration scheme used in
 * Lane's Arabic-English Lexicon source data.
 */

// ── Buckwalter character map ──────────────────────────────────────────────────

const BW_CONSONANTS: Record<string, string> = {
  'A': 'ا',  'b': 'ب',  't': 'ت',  'v': 'ث',  'j': 'ج',
  'H': 'ح',  'x': 'خ',  'd': 'د',  '*': 'ذ',  'r': 'ر',
  'z': 'ز',  's': 'س',  '$': 'ش',  'S': 'ص',  'D': 'ض',
  'T': 'ط',  'Z': 'ظ',  'E': 'ع',  'g': 'غ',  'f': 'ف',
  'q': 'ق',  'k': 'ك',  'l': 'ل',  'm': 'م',  'n': 'ن',
  'h': 'ه',  'w': 'و',  'y': 'ي',  'p': 'ة',  'Y': 'ى',
  "'": 'ء',  '>': 'أ',  '<': 'إ',  '&': 'ؤ',  '}': 'ئ',
  '|': 'آ',
};

const BW_DIACRITICS: Record<string, string> = {
  'a': 'َ',   // fatha
  'u': 'ُ',   // damma
  'i': 'ِ',   // kasra
  'F': 'ً',   // tanwin fath
  'N': 'ٌ',   // tanwin damm
  'K': 'ٍ',   // tanwin kasr
  'o': 'ْ',   // sukun
  '~': 'ّ',   // shadda
  '`': 'ٰ',   // superscript alef
};

// Lane structural markers that are NOT Arabic forms — skip conversion for these
const LANE_ABBREVIATION_RE = /^(?:q\.v\.|&c\.|etc\.|[A-Z]{1,5}(?:, ?[A-Z]{1,5})*|-[A-Za-z0-9]+-?)$/;

export interface BuckwalterResult {
  arabic: string;
  confidence: number;  // 0–1: fraction of input chars successfully converted
}

/**
 * Convert a Buckwalter-encoded token to Arabic.
 * Returns null if the token looks like a Lane abbreviation or structural marker.
 */
export function convertBuckwalterToArabic(token: string): BuckwalterResult | null {
  if (!token || !token.trim()) return null;

  const t = token.trim();

  // Reject Lane abbreviations and non-Buckwalter patterns
  if (LANE_ABBREVIATION_RE.test(t)) return null;
  if (/^[0-9]+$/.test(t)) return null;

  let arabic = '';
  let converted = 0;
  let total = t.length;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (BW_CONSONANTS[ch] !== undefined) {
      arabic += BW_CONSONANTS[ch];
      converted++;
    } else if (BW_DIACRITICS[ch] !== undefined) {
      arabic += BW_DIACRITICS[ch];
      converted++;
    } else if (ch === ' ' || ch === '-') {
      arabic += ch;
      converted++;
    } else {
      // Unknown char — pass through but mark as lower confidence
      arabic += ch;
    }
  }

  const confidence = total > 0 ? converted / total : 0;
  return { arabic, confidence };
}

/**
 * Returns true if the token is a known Lane structural abbreviation
 * and should NOT be treated as an Arabic form.
 */
export function isLaneAbbreviation(token: string): boolean {
  return LANE_ABBREVIATION_RE.test(token.trim());
}
