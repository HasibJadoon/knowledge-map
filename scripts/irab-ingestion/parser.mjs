import { createHash, randomUUID } from 'node:crypto';
import { load } from 'cheerio';

export const PARSER_VERSION = 'qul-jadwal-irab-html-v2';
export const PARSER_VERSION_DAAS = 'qul-daas-irab-html-v1';
export const PARSER_VERSION_MUYASSAR = 'qul-muyassar-irab-html-v1';
export const PARSER_VERSION_DARWISH = 'qul-darwish-irab-h3-v1';
export const PARSER_VERSION_DEP_GRAPHS = 'qul-dep-graphs-svg-v1';
export const PARSER_VERSION_TIBYAN = 'openiti-shamela-tibyan-v1';

const SECTION_MAP = [
  [/الإعراب/, 'irab'],
  [/الصرف/, 'sarf'],
  [/البلاغة/, 'balagha'],
  [/الفوائد/, 'fawaid'],
  [/اللغة/, 'language'],
];

const CORE_LABELS = [
  'جار ومجرور',
  'مفعول مطلق',
  'مفعول لأجله',
  'مفعول معه',
  'مفعول فيه',
  'مفعول به',
  'مضاف إليه',
  'نائب فاعل',
  'صلة الموصول',
  'جواب الشرط',
  'جواب القسم',
  'جواب النداء',
  'لا محل لها',
  'في محل رفع',
  'في محل نصب',
  'في محل جر',
  'في محل جزم',
  'مستثنى',
  'مبتدأ',
  'فاعل',
  'خبر',
  'نعت',
  'بدل',
  'عطف',
  'توكيد',
  'حال',
  'تمييز',
  'منادى',
  'ظرف',
  'متعلق',
];

const CASE_LABELS = [
  ['مجزوم', 'AL:case:jazm'],
  ['مرفوع', 'AL:case:raf'],
  ['منصوب', 'AL:case:nasb'],
  ['مجرور', 'AL:case:jarr'],
  ['مبني', 'AL:case:mabni'],
];

const MAHAL_LABELS = [
  ['في محل رفع', 'AL:mahal:raf'],
  ['في محل نصب', 'AL:mahal:nasb'],
  ['في محل جر', 'AL:mahal:jarr'],
  ['في محل جزم', 'AL:mahal:jazm'],
  ['لا محل لها', 'AL:mahal:la_mahalla_laha'],
];

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function makeRunId(sourceSlug) {
  return `QR:IRAB:RUN:${sourceSlug}:${new Date().toISOString()}:${randomUUID()}`;
}

export function makeId(...parts) {
  return `QR:IRAB:${sha256(parts.join(':')).slice(0, 32)}`;
}

export function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeBareArabic(value) {
  return normalizeWhitespace(String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا'));
}

export function normalizeMatchKey(value) {
  return normalizeBareArabic(value)
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[()[\]«»".،:؛]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyHeading(text) {
  const clean = normalizeWhitespace(text).replace(/[*:：]/g, '');
  return SECTION_MAP.find(([pattern]) => pattern.test(clean))?.[1] ?? null;
}

function paragraphText($, paragraph) {
  return normalizeWhitespace($(paragraph).text());
}

function paragraphHtml($, paragraph) {
  return normalizeWhitespace($.html(paragraph));
}

export function parseHtmlSections(html) {
  const $ = load(String(html ?? ''), { decodeEntities: false });
  const paragraphs = $('div.ar p, p').toArray();
  const sections = [];
  let current = null;

  for (const paragraph of paragraphs) {
    const heading = $(paragraph).find('b').first();
    const sectionKind = heading.length ? classifyHeading(heading.text()) : null;
    if (sectionKind) {
      current = {
        section_kind: sectionKind,
        section_order: sections.length,
        raw_html_parts: [],
        raw_text_parts: [],
      };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const text = paragraphText($, paragraph);
    if (!text) continue;
    current.raw_html_parts.push(paragraphHtml($, paragraph));
    current.raw_text_parts.push(text);
  }

  return sections.map((section) => ({
    section_kind: section.section_kind,
    section_order: section.section_order,
    raw_html: section.raw_html_parts.join('\n'),
    raw_text: section.raw_text_parts.join('\n'),
    clean_text: normalizeWhitespace(section.raw_text_parts.join('\n')),
  }));
}

function annotationsFor(sourceQuote) {
  const notes = [...String(sourceQuote).matchAll(/\[\[([\s\S]*?)\]\]/g)].map((match) => normalizeWhitespace(match[1]));
  const alternatives = [];
  const inline = [];
  for (const note of notes) {
    if (/(ويجوز|(?:^|\s)أو(?:\s|$)|وقيل|وجه)/u.test(note)) alternatives.push({ note });
    else inline.push(note);
  }
  return {
    raw_annotation_ar: notes.length ? notes.join('\n') : null,
    inline_note_ar: inline.length ? inline.join('\n') : null,
    alternative_json: alternatives.length ? JSON.stringify(alternatives) : null,
  };
}

function cleanMainIrab(sourceQuote) {
  return normalizeWhitespace(String(sourceQuote).replace(/\[\[[\s\S]*?\]\]/g, ''));
}

export function roleFromText(text) {
  const matchKey = normalizeMatchKey(text);
  return CORE_LABELS.find((label) => matchKey.includes(normalizeMatchKey(label))) ?? null;
}

export function caseFromText(text) {
  const matchKey = normalizeMatchKey(text);
  return CASE_LABELS.find(([label]) => matchKey.includes(normalizeMatchKey(label))) ?? null;
}

export function mahalFromText(text) {
  const matchKey = normalizeMatchKey(text);
  return MAHAL_LABELS.find(([label]) => matchKey.includes(normalizeMatchKey(label))) ?? null;
}

function targetMarkers(text) {
  const markers = [];
  const parenthesized = /(^|[.،]\s*)\(([^()[\]\n]{1,60})\)\s*/gu;
  for (const match of text.matchAll(parenthesized)) {
    markers.push({
      index: match.index + match[1].length,
      target: normalizeWhitespace(match[2]),
      markerLength: match[0].length - match[1].length,
      entryKind: 'token_or_phrase',
    });
  }

  const sentence = /(?:^|\s)(?:و?جملة):\s*«([^»]+)»/gu;
  for (const match of text.matchAll(sentence)) {
    markers.push({
      index: match.index + match[0].indexOf('«'),
      target: normalizeWhitespace(match[1].replace(/[.]+$/g, '')),
      markerLength: match[0].length - match[0].indexOf('«'),
      entryKind: 'sentence',
    });
  }

  return markers.sort((a, b) => a.index - b.index);
}

export function extractIrabEntriesFromSection(section) {
  if (section.section_kind !== 'irab') return [];
  const entries = [];
  const paragraphs = String(section.raw_text ?? '')
    .split(/\n+/)
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const markers = targetMarkers(paragraph);
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const next = markers[index + 1];
      const sourceQuote = normalizeWhitespace(paragraph.slice(marker.index, next?.index ?? paragraph.length));
      if (!sourceQuote) continue;
      const irabText = cleanMainIrab(sourceQuote);
      const [caseAr, caseRef] = caseFromText(irabText) ?? [null, null];
      const [mahalAr, mahalRef] = mahalFromText(irabText) ?? [null, null];
      entries.push({
        entry_order: entries.length,
        entry_kind: marker.entryKind,
        target_text_ar: marker.target,
        target_text_bare: normalizeBareArabic(marker.target),
        target_text_match_key: normalizeMatchKey(marker.target),
        source_quote_ar: sourceQuote,
        source_quote_hash: sha256(sourceQuote),
        irab_text_ar: irabText,
        grammar_role_ar: roleFromText(irabText),
        grammar_role_norm: normalizeMatchKey(roleFromText(irabText) ?? ''),
        grammar_case_ar: caseAr,
        case_concept_ref: caseRef,
        mahal_ar: mahalAr,
        mahal_concept_ref: mahalRef,
        ...annotationsFor(sourceQuote),
      });
    }
  }

  return entries;
}

// ─── Tibyan (OpenITI/Shamela) entry extractor ──────────────────────────────
// Tibyan uses "قوله تعالى: (TOKEN)" pattern — colon precedes the target token.
// The standard targetMarkers only matches after sentence-end punctuation or start-of-line,
// so this variant also matches after colons and semicolons (؛ / :).
export function extractTibyanIrabEntries(section) {
  if (section.section_kind !== 'irab') return [];
  const entries = [];
  const paragraphs = String(section.raw_text ?? '')
    .split(/\n+/)
    .map((t) => normalizeWhitespace(t))
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const markers = [];
    // Match (TOKEN) after start-of-line, sentence punctuation, or colon/semicolon
    const parenthesized = /(^|[.،؛:]\s*)\(([^()[\]\n]{1,80})\)\s*/gu;
    for (const match of paragraph.matchAll(parenthesized)) {
      markers.push({
        index: match.index + match[1].length,
        target: normalizeWhitespace(match[2]),
        markerLength: match[0].length - match[1].length,
        entryKind: 'token_or_phrase',
      });
    }

    markers.sort((a, b) => a.index - b.index);

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const next = markers[i + 1];
      const sourceQuote = normalizeWhitespace(paragraph.slice(marker.index, next?.index ?? paragraph.length));
      if (!sourceQuote) continue;
      // Skip if target is just a number (ayah citation, not a token)
      if (/^\d+$/.test(marker.target.trim())) continue;
      const irabText = sourceQuote;
      const [caseAr, caseRef] = caseFromText(irabText) ?? [null, null];
      const [mahalAr, mahalRef] = mahalFromText(irabText) ?? [null, null];
      entries.push({
        entry_order: entries.length,
        entry_kind: marker.entryKind,
        target_text_ar: marker.target,
        target_text_bare: normalizeBareArabic(marker.target),
        target_text_match_key: normalizeMatchKey(marker.target),
        source_quote_ar: sourceQuote,
        source_quote_hash: sha256(sourceQuote),
        irab_text_ar: irabText,
        grammar_role_ar: roleFromText(irabText),
        grammar_role_norm: normalizeMatchKey(roleFromText(irabText) ?? ''),
        grammar_case_ar: caseAr,
        case_concept_ref: caseRef,
        mahal_ar: mahalAr,
        mahal_concept_ref: mahalRef,
        raw_annotation_ar: null,
        inline_note_ar: null,
        alternative_json: null,
      });
    }
  }
  return entries;
}

// ─── Darwish <h3>-sectioned parser ─────────────────────────────────────────
// Darwish uses <h3> headings (اللغة / الإعراب / البلاغة) instead of <b>.
// The irab section uses (TOKEN) parenthetical anchors like jadwal.
export function parseDarwishHtml(html) {
  const $ = load(String(html ?? ''), { decodeEntities: false });
  const nodes = $('div.ar').children().toArray();
  const sections = [];
  let current = null;

  for (const node of nodes) {
    const tag = node.tagName?.toLowerCase();
    if (tag === 'h3') {
      const kind = classifyHeading($(node).text());
      if (kind) {
        current = { section_kind: kind, section_order: sections.length, raw_html_parts: [], raw_text_parts: [] };
        sections.push(current);
      }
      continue;
    }
    if (!current || tag !== 'p') continue;
    const text = normalizeWhitespace($(node).text());
    if (!text) continue;
    current.raw_html_parts.push(normalizeWhitespace($.html(node)));
    current.raw_text_parts.push(text);
  }

  return sections.map((s) => ({
    section_kind: s.section_kind,
    section_order: s.section_order,
    raw_html: s.raw_html_parts.join('\n'),
    raw_text: s.raw_text_parts.join('\n'),
    clean_text: normalizeWhitespace(s.raw_text_parts.join('\n')),
  }));
}

// ─── Muyassar per-paragraph extractor ──────────────────────────────────────
// Muyassar puts one token per <p>: first hlt span = source token, rest = irab.
// hlt spans also appear inside explanations, so cross-paragraph split is wrong.
export function extractMuyassarIrabEntries(section) {
  if (section.section_kind !== 'irab') return [];
  const $ = load(String(section.raw_html ?? ''), { decodeEntities: false });
  const entries = [];

  $('p').each((_, p) => {
    const firstHlt = $(p).find('span.hlt').first();
    if (!firstHlt.length) return;

    const tokenText = normalizeWhitespace(firstHlt.find('span.qpc-hafs').text()).replace(/[﴿﴾]/g, '').trim();
    if (!tokenText) return;

    const cloned = $(p).clone();
    cloned.find('span.hlt').first().remove();
    const irabText = normalizeWhitespace(cloned.text()).replace(/^[:\s.،]+/, '').trim();
    if (!irabText) return;

    const sourceQuote = `﴿${tokenText}﴾: ${irabText}`;
    const [caseAr, caseRef] = caseFromText(irabText) ?? [null, null];
    const [mahalAr, mahalRef] = mahalFromText(irabText) ?? [null, null];

    entries.push({
      entry_order: entries.length,
      target_text_ar: tokenText,
      target_text_bare: normalizeBareArabic(tokenText),
      target_text_match_key: normalizeMatchKey(tokenText),
      source_quote_ar: sourceQuote,
      source_quote_hash: sha256(sourceQuote),
      irab_text_ar: irabText,
      grammar_role_ar: roleFromText(irabText),
      grammar_role_norm: normalizeMatchKey(roleFromText(irabText) ?? ''),
      grammar_case_ar: caseAr,
      case_concept_ref: caseRef,
      mahal_ar: mahalAr,
      mahal_concept_ref: mahalRef,
      raw_annotation_ar: null,
      inline_note_ar: null,
      alternative_json: null,
    });
  });

  return entries;
}

// ─── Da'as inline-token parser ─────────────────────────────────────────────

// Da'as HTML has no section headings — the whole text is one irab block.
// <span class="hlt"><span class="qpc-hafs">﴿TOKEN﴾</span></span> anchors each token.
export function parseDaasHtml(html) {
  const $ = load(String(html ?? ''), { decodeEntities: false });
  const rawHtmlParts = [];
  const rawTextParts = [];

  $('div.ar p, p').each((_, p) => {
    const text = normalizeWhitespace($(p).text());
    if (text) {
      rawHtmlParts.push(normalizeWhitespace($.html(p)));
      rawTextParts.push(text);
    }
  });

  if (!rawHtmlParts.length) return [];
  return [{
    section_kind: 'irab',
    section_order: 0,
    raw_html: rawHtmlParts.join('\n'),
    raw_text: rawTextParts.join('\n'),
    clean_text: normalizeWhitespace(rawTextParts.join('\n')),
  }];
}

export function extractDaasIrabEntries(section) {
  if (section.section_kind !== 'irab') return [];
  const html = String(section.raw_html ?? '');

  // Split the HTML stream on each hlt token anchor.
  const HLT_RE = /<span\s+class="hlt">\s*<span\s+class="qpc-hafs">([\s\S]*?)<\/span>\s*<\/span>/g;
  const tokens = [];
  let match;

  while ((match = HLT_RE.exec(html)) !== null) {
    if (tokens.length > 0) {
      tokens[tokens.length - 1].textHtml = html.slice(tokens[tokens.length - 1].end, match.index);
    }
    tokens.push({ tokenHtml: match[1], end: HLT_RE.lastIndex, textHtml: '' });
  }
  if (tokens.length > 0) {
    tokens[tokens.length - 1].textHtml = html.slice(tokens[tokens.length - 1].end);
  }

  const entries = [];
  for (const token of tokens) {
    const tokenText = normalizeWhitespace(token.tokenHtml).replace(/[﴿﴾]/g, '').trim();
    if (!tokenText) continue;
    const irabText = normalizeWhitespace(load(`<div>${token.textHtml}</div>`, { decodeEntities: false })('div').text());
    if (!irabText) continue;

    const sourceQuote = `﴿${tokenText}﴾ ${irabText}`;
    const [caseAr, caseRef] = caseFromText(irabText) ?? [null, null];
    const [mahalAr, mahalRef] = mahalFromText(irabText) ?? [null, null];

    entries.push({
      entry_order: entries.length,
      target_text_ar: tokenText,
      target_text_bare: normalizeBareArabic(tokenText),
      target_text_match_key: normalizeMatchKey(tokenText),
      source_quote_ar: sourceQuote,
      source_quote_hash: sha256(sourceQuote),
      irab_text_ar: irabText,
      grammar_role_ar: roleFromText(irabText),
      grammar_role_norm: normalizeMatchKey(roleFromText(irabText) ?? ''),
      grammar_case_ar: caseAr,
      case_concept_ref: caseRef,
      mahal_ar: mahalAr,
      mahal_concept_ref: mahalRef,
      raw_annotation_ar: null,
      inline_note_ar: null,
      alternative_json: null,
    });
  }
  return entries;
}
