/**
 * Arabic normalization and Buckwalter transliteration utilities.
 *
 * Buckwalter → Arabic Unicode mapping follows the standard encoding used by
 * the Lane lexicon digital project (laneslexicon/lexicon).
 */

const BW_MAP: Record<string, string> = {
  "'": 'ء', // ء hamza
  '|': 'آ', // آ alef madda
  '>': 'أ', // أ alef with hamza above
  '&': 'إ', // إ alef with hamza below (some encodings use &)
  '<': 'إ', // إ alef with hamza below
  '}': 'ئ', // ئ yeh with hamza above
  A:   'ا', // ا alef
  b:   'ب', // ب
  p:   'ة', // ة teh marbuta
  t:   'ت', // ت
  v:   'ث', // ث
  j:   'ج', // ج
  H:   'ح', // ح
  x:   'خ', // خ
  d:   'د', // د
  '*': 'ذ', // ذ
  r:   'ر', // ر
  z:   'ز', // ز
  s:   'س', // س
  $:   'ش', // ش
  S:   'ص', // ص
  D:   'ض', // ض
  T:   'ط', // ط
  Z:   'ظ', // ظ
  E:   'ع', // ع
  g:   'غ', // غ
  f:   'ف', // ف
  q:   'ق', // ق
  k:   'ك', // ك
  l:   'ل', // ل
  m:   'م', // م
  n:   'ن', // ن
  h:   'ه', // ه
  w:   'و', // و
  Y:   'ى', // ى alef maqsura
  y:   'ي', // ي
  // Diacritics
  F:   'ً', // ً tanwin fath
  N:   'ٌ', // ٌ tanwin damm
  K:   'ٍ', // ٍ tanwin kasr
  a:   'َ', // َ fatha
  u:   'ُ', // ُ damma
  i:   'ِ', // ِ kasra
  '~': 'ّ', // ّ shadda
  o:   'ْ', // ْ sukun
  '`': 'ـ', // ـ tatweel
  '{': 'ٱ', // ٱ alef wasla
};

/** Convert Buckwalter transliteration string to Arabic Unicode. */
export function buckwalterToArabic(bw: string): string {
  if (!bw) return '';
  let out = '';
  for (const ch of bw) {
    out += BW_MAP[ch] ?? '';
  }
  return out.trim();
}

/** Check if a string looks like Buckwalter (ASCII non-Arabic). */
export function looksLikeBuckwalter(text: string): boolean {
  if (!text) return false;
  const arabic = /[؀-ۿ]/;
  const bwChars = /[A-Za-z*>&<'|{}~`$]/;
  return !arabic.test(text) && bwChars.test(text);
}

/** Return true if string contains any Arabic Unicode characters. */
export function containsArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/**
 * Normalize Arabic text for search/comparison.
 * Strips tashkīl, normalizes hamza variants to alef, ى → ي.
 * Does NOT modify the text for display — keep originals for display.
 */
export function normalizeArabicForSearch(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, '') // tashkīl + superscript alef
    .replace(/ـ/g, '')                 // tatweel
    .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ → ا
    .replace(/ى/g, 'ي')           // ى → ي
    .trim();
}

/**
 * Compact heading key: normalized + no spaces, for deduplication.
 * ة is kept as ة (not normalized to ه) unless you need that variant.
 */
export function makeHeadingKey(text: string): string {
  return normalizeArabicForSearch(text).replace(/\s+/g, '');
}

/**
 * Strip HTML/XML tags from text, returning plain text.
 * Also collapses whitespace.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract Arabic text segments from a mixed Arabic/Buckwalter/English string.
 * Returns the first continuous Arabic segment found.
 */
export function extractFirstArabicSegment(text: string): string {
  const match = text.match(/[؀-ۿ\s،؟!،.]{2,}/);
  return match ? match[0].trim() : '';
}

/** Approximate token count (word split). */
export function approxTokens(text: string): number {
  return text ? text.trim().split(/\s+/).length : 0;
}
