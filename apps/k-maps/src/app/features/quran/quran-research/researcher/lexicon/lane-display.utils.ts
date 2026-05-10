import type { LaneGroupedRow } from '../../../../../shared/services/al-dictionary-api.service';
import type { LaneDisplayEntry, LaneStatus } from './lane-display.types';

// ── Arabic-script helpers ─────────────────────────────────────────────────────

const ARABIC_RE = /[؀-ۿ]/;
const TASHKIL_RE = /[ً-ٰٟـ]/g;

export function stripTashkil(text: string): string {
  return text.replace(TASHKIL_RE, '').replace(/ـ/g, '');
}

function isMostlyLatin(text: string): boolean {
  const ar  = (text.match(/[؀-ۿ]/g) ?? []).length;
  const lat = (text.match(/[A-Za-z]/g) ?? []).length;
  return lat > ar;
}

function firstArabic(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (v && ARABIC_RE.test(v) && !isMostlyLatin(v)) return v.trim();
  }
  return null;
}

// ── Form parsing ──────────────────────────────────────────────────────────────

function parseArabicForms(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('·').map(x => x.trim()).filter(x => x && ARABIC_RE.test(x));
}

function looksLikeVerb(form: string): boolean {
  const bare = stripTashkil(form);
  return (
    bare.startsWith('ي') ||
    bare.startsWith('ت') ||
    bare.startsWith('ن') ||
    bare.startsWith('أ') ||
    /َ.+َ/.test(form)
  );
}

function looksLikeNounOrMasdar(form: string): boolean {
  return /[ًٌٍةال]/.test(form) || stripTashkil(form).length >= 3;
}

function pickAoristForm(forms: string[]): string | null {
  return forms.find(f => stripTashkil(f).startsWith('ي')) ?? null;
}

function pickInfinitiveForm(forms: string[]): string | null {
  return forms.find(looksLikeNounOrMasdar) ?? null;
}

function pickSynonymForm(forms: string[], infinitive: string | null): string | null {
  return forms.find(f => f !== infinitive) ?? null;
}

// ── Definition display repair ─────────────────────────────────────────────────

const MISSING_AR = '[صيغة ناقصة]';

export function buildLaneDefinitionDisplay(raw: string, forms: string[]): string {
  let t = raw.trim();

  // Step 1: HTML entity decode
  t = t
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Step 2: normalise existing placeholder variants to empty-paren sentinel
  // so all downstream rules see a single pattern
  t = t.replace(/\[◌\]|\[form missing\]/g, '( )');

  // Step 3: Rule E — "and and" → "and"
  t = t.replace(/\band\s+and\b/g, 'and');

  // Step 4: form slot repairs — requires at least one form
  const aorist    = pickAoristForm(forms);
  const infinitive = pickInfinitiveForm(forms);
  const synonym   = pickSynonymForm(forms, infinitive);

  // Rule A — "aor. ," or "aor. ( ),"
  t = t.replace(/\baor\.\s+(?:\(\s*\)\s*)?(,)/g, `aor. ${aorist ?? MISSING_AR}$1`);

  // Rule B — "inf. n. ," or "inf. n. ( ),"
  t = t.replace(/\binf\.\s*n\.\s+(?:\(\s*\)\s*)?(,)/g, `inf. n. ${infinitive ?? MISSING_AR}$1`);

  // Rule C — "syn. :" or "syn. ( ):"
  t = t.replace(/\bsyn\.\s+(?:\(\s*\)\s*)?(:)/g, `syn. ${synonym ?? MISSING_AR}$1`);

  // Rule D — remaining empty parens
  t = t.replace(/\(\s*\)/g, MISSING_AR);

  // Rule F — punctuation cleanup
  t = t.replace(/,\s*,+/g, ',');
  t = t.replace(/;\s*;+/g, ';');
  t = t.replace(/(\w)\s+:/g, '$1:');
  t = t.replace(/\s{2,}/g, ' ');

  return t.trim();
}

// ── Source reference extraction ───────────────────────────────────────────────

const LANE_ABBREVS = new Set([
  'S', 'M', 'K', 'T', 'A', 'L', 'O', 'TA', 'Msb', 'Mgh', 'KL',
  'Bd', 'Ksh', 'Jel', 'Sb', 'Az', 'AZ', 'AHn', 'Fr', 'Lh', 'Lth',
  'IAar', 'IDrd', 'AA', 'Ks', 'MF', 'ISh', 'IF', 'ISd', 'IJ', 'ISk',
  'IAth', 'Har', 'Ham', 'As', 'IB', 'B',
]);

function extractLaneSourceRefs(definitionRaw: string, cleanerJsonStr: string | null): string[] {
  if (cleanerJsonStr) {
    try {
      const cj = JSON.parse(cleanerJsonStr) as Record<string, unknown>;
      const citations = cj['citations'] as string[] | undefined;
      if (citations && citations.length > 0) return citations;
    } catch { /* */ }
  }
  const found = new Set<string>();
  for (const match of definitionRaw.matchAll(/\(([^)]{1,80})\)/g)) {
    for (const token of match[1].split(/[,;:\s]+/).filter(Boolean)) {
      if (LANE_ABBREVS.has(token)) found.add(token);
    }
  }
  return [...found];
}

// ── Preview ───────────────────────────────────────────────────────────────────

function makeLanePreview(text: string, maxLen = 200): string {
  if (!text) return '';
  const compact = text.replace(/\[صيغة ناقصة\]/g, '…');
  if (compact.length <= maxLen) return compact;
  return compact.slice(0, maxLen).trimEnd() + '…';
}

// ── Warning detection ─────────────────────────────────────────────────────────

interface WarningArgs {
  headingAr: string;
  definitionRaw: string;
  definitionDisplay: string;
}

export function getLaneWarnings(args: WarningArgs): string[] {
  const w: string[] = [];
  if (!args.headingAr || args.headingAr === 'عنوان غير متوفر') w.push('missing_heading');
  if (!args.definitionRaw || args.definitionRaw.trim().length < 20)  w.push('missing_definition');
  if (/\baor\.\s+,/.test(args.definitionRaw))                        w.push('empty_aor_slot');
  if (/\binf\.\s*n\.\s*,/.test(args.definitionRaw))                  w.push('empty_infinitive_slot');
  if (/\bsyn\.\s*:/.test(args.definitionRaw))                        w.push('empty_synonym_slot');
  if (/\(\s*\)/.test(args.definitionRaw))                            w.push('empty_parentheses');
  if (/\band\s+and\b/.test(args.definitionRaw))                      w.push('duplicate_and');
  if (args.definitionDisplay.includes('[صيغة ناقصة]'))               w.push('remaining_missing_form');
  return w;
}

function classifyLaneStatus(warnings: string[], definitionDisplay: string, headingAr: string): LaneStatus {
  if (!headingAr || headingAr === 'عنوان غير متوفر') return 'broken';
  if (!definitionDisplay || definitionDisplay.length < 20)           return 'raw';
  if (
    warnings.includes('remaining_missing_form') ||
    warnings.includes('empty_aor_slot') ||
    warnings.includes('empty_infinitive_slot') ||
    warnings.includes('empty_synonym_slot') ||
    warnings.includes('duplicate_and')
  ) return 'needs_review';
  return 'clean';
}

const STATUS_LABELS: Record<LaneStatus, string> = {
  clean:        'قابل للعرض',
  needs_review: 'يحتاج مراجعة',
  raw:          'خام',
  broken:       'ناقص',
};

export const WARNING_LABELS: Record<string, string> = {
  missing_heading:       'عنوان غير متوفر',
  missing_definition:    'تعريف غير متوفر',
  empty_aor_slot:        'خانة المضارع ناقصة',
  empty_infinitive_slot: 'خانة المصدر ناقصة',
  empty_synonym_slot:    'خانة المرادف ناقصة',
  empty_parentheses:     'أقواس فارغة',
  duplicate_and:         'تكرار لغوي أُصلح للعرض',
  remaining_missing_form:'بقيت صيغة ناقصة',
};

// ── Main mapping function ─────────────────────────────────────────────────────

export function mapLaneGroupedRow(row: LaneGroupedRow): LaneDisplayEntry {
  const headingAr =
    firstArabic(row.heading_block_ar, row.display_heading_ar, row.lemma_text) ??
    'عنوان غير متوفر';

  const definitionRaw = row.definition_block_en ?? row.definition_en ?? '';

  const forms      = parseArabicForms(row.arabic_forms_text);
  const sourceRefs = extractLaneSourceRefs(definitionRaw, row.cleaner_json);

  const definitionDisplay = buildLaneDefinitionDisplay(definitionRaw, forms);

  const warnings = getLaneWarnings({ headingAr, definitionRaw, definitionDisplay });
  const status   = classifyLaneStatus(warnings, definitionDisplay, headingAr);

  return {
    id:                row.entry_id,
    headingAr,
    pageLabel:         row.page_label ?? (row.page_no ? `Lane p. ${row.page_no}` : null),
    pageNo:            row.page_no,
    definitionRaw,
    definitionDisplay,
    definitionPreview: makeLanePreview(definitionDisplay),
    forms,
    sourceRefs,
    status,
    statusLabelAr:     STATUS_LABELS[status],
    warnings,
    blockCount:        Number(row.block_count ?? 0),
    rawLabel:          row.raw_label ?? null,
    cleanerJson:       row.cleaner_json,
    uiJson:            row.ui_json,
  };
}
