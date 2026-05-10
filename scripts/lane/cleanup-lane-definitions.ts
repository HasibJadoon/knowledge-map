/**
 * cleanup-lane-definitions.ts
 *
 * Deep cleanup of Lane Lexicon definition_en data already stored in D1.
 *
 * Strategy (three layers):
 *
 *   definition_en (UPDATED in-place — light mechanical fixes only)
 *     - HTML entity decode  (&amp; → &)
 *     - Empty paren placeholder  ( ) → [◌]
 *     - Deduplicate commas/semicolons
 *     - Collapse multiple spaces
 *     Citations and broken grammar markers are LEFT IN definition_en
 *     so it remains a faithful scholarly representation.
 *
 *   cleaner_json (MERGED — new keys added)
 *     - definition_clean   → citations stripped + broken markers cleaned
 *     - citations          → ["S","M","K","TA"] unique abbrevs
 *     - citation_details   → [{abbr, name_en, name_ar, full_title}]
 *     - broken_patterns    → ["empty_parens","orphan_aor",...] for status badge
 *     - entry_type         → "definition"|"cross_ref"|"stub"|"grammar_note"
 *     - has_stripped_arabic → true if Arabic forms were stripped from XML
 *     - cleanup_version    → "1.0"
 *
 *   meta_json (MERGED — original preserved)
 *     - definition_original → verbatim string before any cleanup
 *     - lane_cleanup_ts     → ISO timestamp
 *
 * Usage:
 *   npm run lane:cleanup -- --dry-run --limit 20
 *   npm run lane:cleanup -- --remote --page-size 300
 *   npm run lane:cleanup -- --remote
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { d1Query, d1ExecuteFile, type D1Target } from './utils/wrangler.ts';

// ── Lane citation abbreviation registry ──────────────────────────────────────
// Sourced from Lane's own Preface to the Arabic-English Lexicon (1863).

interface CitationSource {
  abbr: string;
  name_en: string;
  name_ar: string;
  full_title: string;
  author?: string;
}

const CITATION_REGISTRY: CitationSource[] = [
  { abbr: 'S',    name_en: 'Ṣiḥāḥ',          name_ar: 'الصحاح',         full_title: 'Tāj al-Lugha wa-Ṣiḥāḥ al-ʿArabīya',     author: 'Al-Jawharī' },
  { abbr: 'M',    name_en: 'Muḥkam',          name_ar: 'المحكم',         full_title: 'Al-Muḥkam wa-l-Muḥīṭ al-Aʿẓam',          author: 'Ibn Sīdah' },
  { abbr: 'K',    name_en: 'Kāmūs',           name_ar: 'القاموس',        full_title: 'Al-Qāmūs al-Muḥīṭ',                       author: 'Al-Fīrūzābādī' },
  { abbr: 'T',    name_en: 'Tahdhīb',         name_ar: 'التهذيب',        full_title: 'Tahdhīb al-Lugha',                         author: 'Al-Azharī' },
  { abbr: 'A',    name_en: 'Asās',            name_ar: 'الأساس',         full_title: 'Asās al-Balāgha',                          author: 'Al-Zamakhsharī' },
  { abbr: 'L',    name_en: 'Lisān',           name_ar: 'لسان العرب',     full_title: 'Lisān al-ʿArab',                           author: 'Ibn Manẓūr' },
  { abbr: 'O',    name_en: 'ʿUbāb',           name_ar: 'العباب',         full_title: 'Al-ʿUbāb al-Zākhir',                      author: 'Al-Ṣaghānī' },
  { abbr: 'TA',   name_en: 'Tāj al-ʿArūs',   name_ar: 'تاج العروس',    full_title: 'Tāj al-ʿArūs min Jawāhir al-Qāmūs',       author: 'Al-Zabīdī' },
  { abbr: 'Msb',  name_en: 'Miṣbāḥ',         name_ar: 'المصباح',        full_title: 'Al-Miṣbāḥ al-Munīr',                      author: 'Al-Fayyūmī' },
  { abbr: 'Mgh',  name_en: 'Mughrib',         name_ar: 'المغرب',         full_title: 'Al-Mughrib fī Tartīb al-Muʿrib',           author: 'Al-Muṭarrizī' },
  { abbr: 'KL',   name_en: 'Kullīyāt',        name_ar: 'الكليات',        full_title: 'Al-Kullīyāt',                              author: 'Abū al-Baqāʾ' },
  { abbr: 'Bd',   name_en: 'Bayḍāwī',         name_ar: 'البيضاوي',       full_title: 'Anwār al-Tanzīl (Tafsīr al-Bayḍāwī)',      author: 'Al-Bayḍāwī' },
  { abbr: 'Ksh',  name_en: 'Kashshāf',        name_ar: 'الكشاف',         full_title: 'Al-Kashshāf',                              author: 'Al-Zamakhsharī' },
  { abbr: 'Jel',  name_en: 'Jalālayn',        name_ar: 'الجلالين',       full_title: 'Tafsīr al-Jalālayn' },
  { abbr: 'Sb',   name_en: 'Sībawayhi',       name_ar: 'سيبويه',         full_title: 'Al-Kitāb',                                 author: 'Sībawayhi' },
  { abbr: 'Az',   name_en: 'Al-Azharī',       name_ar: 'الأزهري',        full_title: 'Attribution to Al-Azharī directly' },
  { abbr: 'AZ',   name_en: 'Abū Zayd',        name_ar: 'أبو زيد',        full_title: 'Abū Zayd al-Anṣārī' },
  { abbr: 'AHn',  name_en: 'Abū Ḥanīfa',     name_ar: 'أبو حنيفة',      full_title: 'Abū Ḥanīfa al-Dīnawarī (Al-Nabāt)' },
  { abbr: 'Fr',   name_en: 'Al-Farrāʾ',       name_ar: 'الفراء',         full_title: 'Maʿānī al-Qurʾān',                        author: 'Al-Farrāʾ' },
  { abbr: 'Lh',   name_en: 'Al-Liḥyānī',     name_ar: 'اللحياني',       full_title: 'Attribution to Al-Liḥyānī' },
  { abbr: 'Lth',  name_en: 'Al-Layth',        name_ar: 'الليث',          full_title: 'Attribution to Al-Layth ibn al-Muẓaffar' },
  { abbr: 'IAar', name_en: 'Ibn al-Aʿrābī',  name_ar: 'ابن الأعرابي',   full_title: 'Attribution to Ibn al-Aʿrābī' },
  { abbr: 'IDrd', name_en: 'Ibn Durayd',      name_ar: 'ابن دريد',        full_title: 'Jamharat al-Lugha',                        author: 'Ibn Durayd' },
  { abbr: 'AA',   name_en: 'Abū ʿAmr',        name_ar: 'أبو عمرو',       full_title: 'Abū ʿAmr ibn al-ʿAlāʾ' },
  { abbr: 'Ks',   name_en: 'Al-Kisāʾī',       name_ar: 'الكسائي',        full_title: 'Attribution to Al-Kisāʾī' },
  { abbr: 'MF',   name_en: 'Muḥammad al-Fāsī', name_ar: 'الفاسي',       full_title: 'Commentator on Al-Qāmūs' },
  { abbr: 'ISh',  name_en: 'Ibn Shummāyl',    name_ar: 'ابن شميل',        full_title: 'Attribution to Ibn Shummāyl' },
  { abbr: 'IF',   name_en: 'Ibn Fāris',       name_ar: 'ابن فارس',        full_title: 'Maqāyīs al-Lugha',                         author: 'Ibn Fāris' },
  { abbr: 'ISd',  name_en: 'Ibn Sīdah',       name_ar: 'ابن سيده',        full_title: 'Al-Muḥkam / Al-Mukhaṣṣaṣ',                author: 'Ibn Sīdah' },
  { abbr: 'IJ',   name_en: 'Ibn Jinnī',       name_ar: 'ابن جني',         full_title: 'Al-Khaṣāʾiṣ',                             author: 'Ibn Jinnī' },
  { abbr: 'ISk',  name_en: 'Ibn al-Sikkīt',   name_ar: 'ابن السكيت',     full_title: 'Iṣlāḥ al-Manṭiq',                         author: 'Ibn al-Sikkīt' },
  { abbr: 'IAth', name_en: 'Ibn al-Athīr',    name_ar: 'ابن الأثير',     full_title: 'Al-Nihāya fī Gharīb al-Ḥadīth',           author: 'Ibn al-Athīr' },
  { abbr: 'Har',  name_en: 'Al-Ḥarīrī',       name_ar: 'الحريري',        full_title: 'Commentary on Maqāmāt al-Ḥarīrī' },
  { abbr: 'Ham',  name_en: 'Ḥamāsa',          name_ar: 'الحماسة',        full_title: 'Commentary on Ḥamāsat Abī Tammām' },
  { abbr: 'As',   name_en: 'Al-Aṣmaʿī',       name_ar: 'الأصمعي',        full_title: 'Attribution to Al-Aṣmaʿī' },
  { abbr: 'IB',   name_en: 'Ibn Barrī',        name_ar: 'ابن بري',         full_title: 'Annotations on Ṣiḥāḥ',                    author: 'Ibn Barrī' },
  { abbr: 'Kull', name_en: 'Kullīyāt',         name_ar: 'الكليات',        full_title: 'Al-Kullīyāt (variant ref)' },
  { abbr: 'MA',   name_en: 'Misbāḥ (alt)',     name_ar: 'المصباح',        full_title: 'Al-Misbāḥ (alternate ref)' },
  { abbr: 'JK',   name_en: 'Al-Jāmiʿ al-Kabīr', name_ar: 'الجامع الكبير', full_title: 'Al-Jāmiʿ al-Kabīr' },
  { abbr: 'Er',   name_en: 'Er-Rāghib',        name_ar: 'الراغب',         full_title: 'Al-Mufradāt fī Gharīb al-Qurʾān',         author: 'Al-Rāghib al-Iṣfahānī' },
  { abbr: 'Muj',  name_en: 'Mujāhid',          name_ar: 'مجاهد',          full_title: 'Tafsīr Mujāhid' },
  { abbr: 'Suh',  name_en: 'Al-Suhaylī',       name_ar: 'السهيلي',        full_title: 'Al-Rawḍ al-Unuf' },
  { abbr: 'IKh',  name_en: 'Ibn Khālawayh',   name_ar: 'ابن خالويه',     full_title: 'Attribution to Ibn Khālawayh' },
  { abbr: 'CK',   name_en: 'CK (ed. variant)', name_ar: 'نسخة',           full_title: 'Variant reading in printed Kāmūs editions' },
  { abbr: 'PS',   name_en: 'PS',               name_ar: '',               full_title: 'Lane citation abbreviation' },
  { abbr: 'TK',   name_en: 'TK',               name_ar: '',               full_title: 'Lane citation abbreviation' },
  { abbr: 'HL',   name_en: 'HL',               name_ar: '',               full_title: 'Lane citation abbreviation' },
  { abbr: 'Kr',   name_en: 'Kr',               name_ar: '',               full_title: 'Lane citation abbreviation' },
];

// Build lookup maps
const ABBREV_SET = new Set(CITATION_REGISTRY.map(c => c.abbr));
const ABBREV_MAP = new Map(CITATION_REGISTRY.map(c => [c.abbr, c]));

// ── Citation extraction ───────────────────────────────────────────────────────

/**
 * A parenthetical is a Lane citation if ALL tokens within it are either:
 * - Known Lane abbreviations
 * - Pure uppercase sequences (single-letter abbrevs like A, L, O)
 * - Punctuation modifiers: *, voce (treated as editorial — kept)
 *
 * Returns { cleaned: text with citations removed, citations: unique abbrevs found }
 */
function extractCitations(text: string): { cleaned: string; citations: string[] } {
  const found = new Set<string>();

  // Pre-normalise Lane's "et cetera" variants so they pass the citation filter
  const normalised = text
    .replace(/&amp;c\./g, 'Etc')
    .replace(/&c\./g,     'Etc')
    .replace(/etc\./gi,   'Etc');

  const cleaned = normalised.replace(/\(([^)]{1,140})\)/g, (match, inner: string) => {
    const raw = inner.trim();

    // Tokenise on all separator chars; also allow bare '*' modifier
    const tokens = raw
      .replace(/[*.:;,\s]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0);

    if (tokens.length === 0 || tokens.length > 14) return match;

    const allCitations = tokens.every(t => {
      if (t === 'Etc') return true;               // &c. / etc.
      if (ABBREV_SET.has(t)) return true;         // known abbrev
      if (/^[A-Z]$/.test(t)) return true;         // single uppercase letter
      if (/^[A-Z][A-Za-z-]{0,7}$/.test(t)) return true; // uppercase-led abbrev
      return false;
    });

    if (!allCitations) return match; // Keep editorial parens intact

    tokens.forEach(t => {
      if (t !== 'Etc' && ABBREV_SET.has(t)) found.add(t);
    });

    return ''; // Strip citation from display
  });

  return {
    cleaned: cleaned.replace(/\s{2,}/g, ' ').trim(),
    citations: [...found],
  };
}

// ── Broken pattern detection ──────────────────────────────────────────────────

type BrokenPattern =
  | 'empty_parens'
  | 'orphan_aor'
  | 'orphan_inf_n'
  | 'orphan_and'
  | 'orphan_or'
  | 'orphan_as_also'
  | 'orphan_syn'
  | 'orphan_like'
  | 'bare_cross_ref'
  | 'double_punct'
  | 'html_entities';

function detectBrokenPatterns(text: string): BrokenPattern[] {
  const patterns: BrokenPattern[] = [];
  if (/\(\s*\)/.test(text))                             patterns.push('empty_parens');
  if (/aor\.\s*[,.]/.test(text))                        patterns.push('orphan_aor');
  if (/inf\.\s*n\.\s*,/.test(text))                     patterns.push('orphan_inf_n');
  if (/inf\.\s*n\.\s+(and\s+){2,}/.test(text))         patterns.push('orphan_inf_n');
  if (/ and\s*[,;]/.test(text))                         patterns.push('orphan_and');
  if (/ or\s*[,;]/.test(text))                          patterns.push('orphan_or');
  if (/as also\s*,/.test(text))                         patterns.push('orphan_as_also');
  if (/(?:syn\.|i\.\s*q\.|like)\s*[;,:]/.test(text))   patterns.push('orphan_syn');
  if (/\bsee\s+(?:art\.\s+)?\./.test(text))            patterns.push('bare_cross_ref');
  if (/,\s*,|;\s*;/.test(text))                         patterns.push('double_punct');
  if (/&amp;|&lt;|&gt;/.test(text))                    patterns.push('html_entities');
  return patterns;
}

// ── Entry type classification ─────────────────────────────────────────────────

type EntryType = 'definition' | 'cross_ref' | 'stub' | 'grammar_note';

function classifyEntryType(text: string): EntryType {
  const t = text.trim();
  if (!t || t.length < 5) return 'stub';

  // Pure cross-reference: starts with "see" and is short
  if (/^see\b/i.test(t) && t.length < 120) return 'cross_ref';
  if (/^see art\b/i.test(t)) return 'cross_ref';

  // Grammar-heavy: mostly aor./inf. n. patterns with little meaning text
  const grammarTokens = (t.match(/\b(?:aor|inf\.?\s*n|imp|pass|act\.?\s*part|conj|verb|masc|fem)\b/gi) ?? []).length;
  const words = t.split(/\s+/).length;
  if (grammarTokens > 3 && words < 30) return 'grammar_note';

  return 'definition';
}

// ── definition_en: light mechanical fixes (faithful scholarly layer) ──────────

function applyMechanicalFixes(text: string): string {
  return text
    // HTML entity decode
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Empty parens → placeholder (Arabic form was here)
    .replace(/\(\s*\)/g, '[◌]')
    // Deduplicate commas and semicolons
    .replace(/,\s*,+/g, ',')
    .replace(/;\s*;+/g, ';')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── definition_clean: full cleanup for display ────────────────────────────────

function buildDefinitionClean(text: string): string {
  // Step 1: mechanical fixes
  let t = applyMechanicalFixes(text);

  // Step 2: strip citations → this is the main display text
  const { cleaned } = extractCitations(t);
  t = cleaned;

  // Step 2b: reverse the Etc normalisation (was only needed for citation matching)
  t = t.replace(/\bEtc\b/g, '&c.');

  // Step 3: clean orphaned grammar markers left after Arabic form stripping
  t = t
    // aor. , → aor. [◌],   |   aor. . → aor. [◌].
    .replace(/\baor\.\s*,/g, 'aor. [◌],')
    .replace(/\baor\.\s+\./g, 'aor. [◌].')
    // inf. n. , → inf. n. [◌],  (Arabic form stripped immediately after)
    .replace(/\binf\.\s*n\.\s*,/g, 'inf. n. [◌],')
    // inf. n. and and → inf. n. [◌] and [◌]
    .replace(/\binf\.\s*n\.\s+and\s+and\b/g, 'inf. n. [◌] and [◌]')
    // inf. n. and , → inf. n. [◌],
    .replace(/\binf\.\s*n\.\s+and\s*,/g, 'inf. n. [◌],')
    // as also , / as also ; → as also [◌]
    .replace(/\bas also\s*,/g, 'as also [◌]')
    .replace(/\bas also\s*;/g, 'as also [◌];')
    // and , or and ; → [◌],
    .replace(/\band\s*,/g, '[◌],')
    .replace(/\band\s*;/g, '[◌];')
    // or , or or ; → [◌],
    .replace(/\bor\s*,/g, '[◌],')
    .replace(/\bor\s*;/g, '[◌];')
    // syn. ; / syn. , / syn. : → syn. [◌]
    .replace(/\bsyn\.\s*[;,:]/g, 'syn. [◌]')
    // i. q. ; / i.q., / i.q.: → i.q. [◌]
    .replace(/\bi\.\s*q\.\s*[;,:]/g, 'i.q. [◌]')
    // like ; / like , → like [◌]
    .replace(/\blike\s*[;,]/g, 'like [◌]')
    // ↓ → → (cross-ref arrow)
    .replace(/↓\s*/g, '→ ')
    // "see ." → "see [related entry]"
    .replace(/\bsee\s+art\.\s+\./g, 'see [related entry]')
    .replace(/\bsee\s+\./g, 'see [related entry]');

  // Step 4: artifact cleanup from citation removal
  t = t
    // Double period: ". ." → "." — applied twice to handle consecutive orphaned forms
    .replace(/\.\s+\./g, '.').replace(/\.\s+\./g, '.')
    // Comma-space-period: ", ." → ","  (orphaned period after list comma)
    .replace(/,\s+\./g, ',')
    // Floating period after word: "word ." → "word."  (citation before period)
    .replace(/(\w)\s+\./g, '$1.')
    // Comma then colon: ", :" → ":"  (citation between comma and colon)
    .replace(/,\s*:/g, ':')
    // Space before colon: "word :" → "word:"  (citation before a colon clause)
    .replace(/(\w)\s+:/g, '$1:')
    // Stray space before close paren: "text )" → "text)"
    .replace(/\s+\)/g, ')')
    // Collapse consecutive placeholders: "[◌] [◌]" → "[◌]"
    .replace(/\[◌\](\s*\[◌\])+/g, '[◌]')
    // Second pass: orphan markers uncovered after double-period / citation collapse
    .replace(/\baor\.\s*,/g, 'aor. [◌],')
    .replace(/\baor\.\s+\./g, 'aor. [◌].')
    .replace(/\binf\.\s*n\.\s*,/g, 'inf. n. [◌],')
    .replace(/\bsyn\.\s*[;,:]/g, 'syn. [◌]')
    .replace(/\bi\.\s*q\.\s*[;,:]/g, 'i.q. [◌]');

  // Step 5: final punctuation cleanup
  t = t
    .replace(/,\s*,+/g, ',')
    .replace(/;\s*;+/g, ';')
    .replace(/\s*,\s*\)/g, ')')
    .replace(/\(\s*,/g, '(')
    .replace(/\s{2,}/g, ' ')
    // Strip leading punctuation artifacts
    .replace(/^[\s,;.:—–\-]+/, '')
    .trim();

  // Step 6: replace all remaining [◌] with [form missing] — display layer must
  // never show the dotted-circle placeholder; that stays only in definition_en.
  t = t.replace(/\[◌\]/g, '[form missing]');

  return t;
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function escJson(obj: unknown): string {
  return esc(JSON.stringify(obj));
}

// ── Row shape from D1 ─────────────────────────────────────────────────────────

interface LaneEntryRow {
  id: string;
  display_heading_ar: string | null;
  definition_en: string | null;
  page_no: number | null;
  meta_json: string | null;
  cleaner_json: string | null;
}

// ── Generate UPDATE SQL for one row ──────────────────────────────────────────

function buildUpdateSql(row: LaneEntryRow): string | null {
  const original = row.definition_en;
  if (!original) return null;

  // Preserve original before any change
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(row.meta_json ?? '{}') as Record<string, unknown>; } catch { /* */ }
  if (!meta.definition_original) {
    meta.definition_original = original;
  }
  meta.lane_cleanup_ts = new Date().toISOString();

  // Apply mechanical fixes to definition_en
  const defFixed = applyMechanicalFixes(original);

  // Extract citations from the mechanically-fixed version
  const { citations } = extractCitations(defFixed);
  const citationDetails = citations
    .map(abbr => ABBREV_MAP.get(abbr))
    .filter((c): c is CitationSource => c !== undefined);

  // Build definition_clean
  const defClean = buildDefinitionClean(original);

  // Detect broken patterns on original
  const brokenPatterns = detectBrokenPatterns(original);

  // Classify entry type
  const entryType = classifyEntryType(defClean);

  // Merge cleaner_json
  let cleaner: Record<string, unknown> = {};
  try { cleaner = JSON.parse(row.cleaner_json ?? '{}') as Record<string, unknown>; } catch { /* */ }
  cleaner.definition_clean    = defClean;
  cleaner.citations           = citations;
  cleaner.citation_details    = citationDetails;
  cleaner.broken_patterns     = brokenPatterns;
  cleaner.entry_type          = entryType;
  cleaner.has_stripped_arabic = brokenPatterns.length > 0 &&
    brokenPatterns.some(p => ['empty_parens','orphan_aor','orphan_and','orphan_or','orphan_as_also','orphan_syn','orphan_like','orphan_inf_n'].includes(p));
  cleaner.cleanup_version     = '3.0';

  return (
    `UPDATE ar_ling_lexicon_entries ` +
    `SET definition_en = ${esc(defFixed)}, ` +
    `cleaner_json = ${escJson(cleaner)}, ` +
    `meta_json = ${escJson(meta)} ` +
    `WHERE id = ${esc(row.id)};`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const OUT_DIR = resolve('out/lane');

async function main(): Promise<void> {
  const args       = process.argv.slice(2);
  const dryRun     = args.includes('--dry-run');
  const remote     = args.includes('--remote');
  const target: D1Target = remote ? 'remote' : 'local';

  const pageSizeIdx = args.indexOf('--page-size');
  const pageSize    = pageSizeIdx >= 0 ? parseInt(args[pageSizeIdx + 1], 10) : 300;

  const limitIdx = args.indexOf('--limit');
  const hardLimit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  console.log(`Lane definition cleanup — ${target}${dryRun ? ' [DRY RUN]' : ''}`);
  console.log(`Page size: ${pageSize}${isFinite(hardLimit) ? `  Hard limit: ${hardLimit}` : ''}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  // Count total
  const countRows = d1Query(
    `SELECT COUNT(*) as n FROM ar_ling_lexicon_entries WHERE source_slug = 'lane_lexicon'`,
    target,
  );
  const total = (countRows[0]?.n as number) ?? 0;
  const toProcess = Math.min(total, isFinite(hardLimit) ? hardLimit : total);
  console.log(`Total Lane entries in D1: ${total.toLocaleString()}`);
  console.log(`Will process: ${toProcess.toLocaleString()}\n`);

  // Stats
  const stats = {
    processed: 0, skipped: 0, updated: 0,
    clean: 0, needs_review: 0, broken: 0, cross_ref: 0,
    citations_extracted: 0,
    broken_pattern_counts: {} as Record<string, number>,
    files_written: [] as string[],
  };

  let offset = 0;
  let fileIdx = 1;
  const allSql: string[] = [];

  while (stats.processed < toProcess) {
    const limit = Math.min(pageSize, toProcess - stats.processed);

    const rows = d1Query(
      `SELECT id, display_heading_ar, definition_en, page_no, meta_json, cleaner_json ` +
      `FROM ar_ling_lexicon_entries ` +
      `WHERE source_slug = 'lane_lexicon' ` +
      `ORDER BY page_no ASC, id ASC ` +
      `LIMIT ${limit} OFFSET ${offset}`,
      target,
    ) as LaneEntryRow[];

    if (rows.length === 0) break;

    for (const row of rows) {
      stats.processed++;

      if (!row.definition_en) {
        stats.skipped++;
        continue;
      }

      const sql = buildUpdateSql(row);
      if (!sql) { stats.skipped++; continue; }

      allSql.push(sql);
      stats.updated++;

      // Accumulate stats
      const patterns = detectBrokenPatterns(row.definition_en);
      for (const p of patterns) {
        stats.broken_pattern_counts[p] = (stats.broken_pattern_counts[p] ?? 0) + 1;
      }

      const { citations } = extractCitations(row.definition_en);
      if (citations.length > 0) stats.citations_extracted++;

      const entryType = classifyEntryType(buildDefinitionClean(row.definition_en));
      if (entryType === 'cross_ref')       stats.cross_ref++;
      else if (patterns.length === 0)      stats.clean++;
      else if (patterns.includes('empty_parens') || patterns.includes('orphan_aor'))
                                           stats.broken++;
      else                                 stats.needs_review++;
    }

    offset += rows.length;

    if (dryRun && stats.processed >= Math.min(20, toProcess)) break;

    process.stdout.write(`\r  Processed ${stats.processed.toLocaleString()} / ${toProcess.toLocaleString()}…`);
  }

  console.log(`\n`);

  // Write SQL files (3000 statements per file)
  const CHUNK = 3000;
  for (let i = 0; i < allSql.length; i += CHUNK) {
    const file = `${OUT_DIR}/lane_cleanup_${String(fileIdx).padStart(3, '0')}.sql`;
    writeFileSync(file, allSql.slice(i, i + CHUNK).join('\n') + '\n', 'utf8');
    stats.files_written.push(file);
    fileIdx++;
  }

  // Print analysis report
  console.log('═══════════════════════════════════════════════');
  console.log('  LANE DEFINITION CLEANUP REPORT');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Processed:          ${stats.processed.toLocaleString()}`);
  console.log(`  Updated:            ${stats.updated.toLocaleString()}`);
  console.log(`  Skipped (no def):   ${stats.skipped.toLocaleString()}`);
  console.log(`  With citations:     ${stats.citations_extracted.toLocaleString()}`);
  console.log(``);
  console.log(`  Entry classification:`);
  console.log(`    Clean definitions:  ${stats.clean.toLocaleString()}`);
  console.log(`    Needs review:       ${stats.needs_review.toLocaleString()}`);
  console.log(`    Broken forms:       ${stats.broken.toLocaleString()}`);
  console.log(`    Cross-references:   ${stats.cross_ref.toLocaleString()}`);
  console.log(``);
  console.log(`  Broken pattern breakdown:`);
  const sorted = Object.entries(stats.broken_pattern_counts).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sorted) {
    console.log(`    ${pattern.padEnd(28)} ${count.toLocaleString()}`);
  }
  console.log(``);
  console.log(`  SQL files (${stats.files_written.length}):`);
  for (const f of stats.files_written) console.log(`    ${f}`);

  if (dryRun) {
    console.log(`\n[DRY RUN] — no changes applied.`);
    // Print sample of what first 3 rows would look like
    console.log(`\nSample transformations (first 3 entries):`);
    const sampleRows = d1Query(
      `SELECT id, display_heading_ar, definition_en, page_no, meta_json, cleaner_json ` +
      `FROM ar_ling_lexicon_entries WHERE source_slug = 'lane_lexicon' ` +
      `ORDER BY page_no ASC LIMIT 3`,
      target,
    ) as LaneEntryRow[];
    for (const row of sampleRows) {
      if (!row.definition_en) continue;
      const defClean = buildDefinitionClean(row.definition_en);
      const { citations } = extractCitations(row.definition_en);
      const patterns = detectBrokenPatterns(row.definition_en);
      const entryType = classifyEntryType(defClean);
      console.log(`\n  ── ${row.display_heading_ar} (p. ${row.page_no}) ──`);
      console.log(`  entry_type:      ${entryType}`);
      console.log(`  citations:       [${citations.join(', ')}]`);
      console.log(`  broken_patterns: [${patterns.join(', ')}]`);
      console.log(`  original (120):  ${row.definition_en.slice(0, 120)}`);
      console.log(`  clean    (120):  ${defClean.slice(0, 120)}`);
    }
    return;
  }

  if (stats.files_written.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  console.log(`\nApplying ${stats.files_written.length} SQL file(s) to ${target} D1…`);
  for (const file of stats.files_written) {
    console.log(`  Applying ${file}…`);
    d1ExecuteFile(file, target);
  }

  console.log('\nCleanup complete.');
  console.log('Next: npm run lane:fts-rebuild -- --remote');
}

main().catch(err => { console.error(err); process.exit(1); });
