/**
 * parse-lane-source-page.ts
 *
 * Parses a structured Lane root page from lexicon.quranic-research.net into
 * source-clean JSON. This does not modify Lane entries. With --cache-remote it
 * records page-level cache metadata in ar_ling_lane_source_pages.
 *
 * Usage:
 *   npm run lane:parse-source -- --url https://lexicon.quranic-research.net/data/25_n/011_nbO.html
 *   npm run lane:parse-source -- --url https://lexicon.quranic-research.net/data/25_n/011_nbO.html --cache-remote
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import * as cheerio from 'cheerio';
import { d1ExecuteSql } from './utils/wrangler.ts';

const OUT_DIR = resolve('out/lane/source-pages');
const PARSER_VERSION = 'lane_source_html_v1';

interface LaneParsedSense {
  sense_id: string | null;
  relation_type: 'sense' | 'dissociation' | 'signification';
  relation_code: string | null;
  text_en: string;
  text_ar: string[];
  source_abbreviations: string[];
  quran_refs: string[];
  cross_refs: Array<{ href: string | null; label: string }>;
  examples: Array<{ text_ar: string; text_en: string | null }>;
}

interface LaneParsedEntry {
  source_entry_id: string;
  entry_label: string;
  heading_ar: string | null;
  entry_kind: string[];
  forms: string[];
  senses: LaneParsedSense[];
}

interface LaneParsedPage {
  source_url: string;
  source_path: string;
  html_sha256: string;
  parser_version: string;
  root_text: string;
  prev_root_text: string | null;
  next_root_text: string | null;
  page_refs: number[];
  entries: LaneParsedEntry[];
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;])/g, '$1')
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(v => cleanText(v)).filter(Boolean))];
}

function extractQuranRefs(text: string): string[] {
  const refs: string[] = [];
  const patterns = [
    /\b(?:Ḳur|Kur|Qur),?\s+([ivxlcdm]+)\.\s*(\d+)/gi,
    /\b(?:Ḳur|Kur|Qur),?\s+(\d+)[.:]\s*(\d+)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      refs.push(`${match[1]}:${match[2]}`);
    }
  }
  return unique(refs);
}

function parseRelation(text: string): { type: 'dissociation' | 'signification'; code: string | null } | null {
  const dissociation = text.match(/Dissociation:\s*([A-Z0-9]+)/i);
  if (dissociation) return { type: 'dissociation', code: dissociation[1] };
  const signification = text.match(/Signification:\s*([A-Z0-9]+)/i);
  if (signification) return { type: 'signification', code: signification[1] };
  return null;
}

function parseHtml(sourceUrl: string, html: string): LaneParsedPage {
  const $ = cheerio.load(html);
  const rootText = cleanText($('article.root h2.root span.ar').first().text());
  const prevRootText = cleanText($('article.root h2.root span.prev a').first().text()) || null;
  const nextRootText = cleanText($('article.root h2.root span.next a').first().text()) || null;
  const pageRefs = unique($('span.pb[id^="Page_"]').map((_, el) => $(el).attr('id')?.replace(/^Page_/, '') ?? '').get())
    .map(x => Number(x))
    .filter(n => Number.isFinite(n));

  const entries: LaneParsedEntry[] = [];

  $('section.entry').each((_, section) => {
    const $section = $(section);
    const sourceEntryId = $section.attr('id') ?? '';
    const heading = cleanText($section.find('h3.entry').first().text());
    const headingAr = cleanText($section.find('h3.entry span.ar').first().text()) || null;
    const entryKind = ($section.attr('class') ?? '')
      .split(/\s+/)
      .filter(cls => cls && cls !== 'entry');
    const forms = unique($section.find('span.ar').map((__, el) => $(el).text()).get());
    const senses: LaneParsedSense[] = [];
    let activeRelation: { type: 'dissociation' | 'signification'; code: string | null } | null = null;

    $section.children().each((__, child) => {
      const $child = $(child);
      const className = $child.attr('class') ?? '';

      if (className.includes('dissociation') || className.includes('signification')) {
        activeRelation = parseRelation(cleanText($child.text()));
        return;
      }

      if (!className.includes('sense')) return;

      const paragraphText = cleanText($child.find('p').map((___, p) => $(p).text()).get().join(' '));
      const arabic = unique($child.find('span.ar').map((___, el) => $(el).text()).get());
      const auths = unique($child.find('span.auth').map((___, el) => $(el).text().replace(/[().:،]/g, '')).get());
      const crossRefs = $child.find('a[href]').map((___, a) => ({
        href: $(a).attr('href') ?? null,
        label: cleanText($(a).text()),
      })).get();
      const examples = $child.find('blockquote.quote').map((___, quote) => ({
        text_ar: cleanText($(quote).find('.ar').map((____, ar) => $(ar).text()).get().join(' / ')),
        text_en: null,
      })).get();

      senses.push({
        sense_id: $child.attr('id') ?? null,
        relation_type: activeRelation?.type ?? 'sense',
        relation_code: activeRelation?.code ?? null,
        text_en: paragraphText,
        text_ar: arabic,
        source_abbreviations: auths,
        quran_refs: extractQuranRefs(paragraphText),
        cross_refs: crossRefs,
        examples,
      });
    });

    entries.push({
      source_entry_id: sourceEntryId,
      entry_label: heading,
      heading_ar: headingAr,
      entry_kind: entryKind,
      forms,
      senses,
    });
  });

  return {
    source_url: sourceUrl,
    source_path: new URL(sourceUrl).pathname,
    html_sha256: createHash('sha256').update(html).digest('hex'),
    parser_version: PARSER_VERSION,
    root_text: rootText,
    prev_root_text: prevRootText,
    next_root_text: nextRootText,
    page_refs: pageRefs,
    entries,
  };
}

function sqlString(value: string | null | undefined): string {
  if (value == null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  const sourceUrl = urlIdx >= 0 ? args[urlIdx + 1] : '';
  const cacheRemote = args.includes('--cache-remote');
  if (!sourceUrl) throw new Error('--url is required');

  mkdirSync(OUT_DIR, { recursive: true });

  const res = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'km-lane-repair/1.0' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);
  const html = await res.text();
  const parsed = parseHtml(sourceUrl, html);

  const outPath = resolve(OUT_DIR, `${basename(parsed.source_path, '.html')}.json`);
  writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');

  console.log(`Parsed Lane source page: ${parsed.root_text}`);
  console.log(`  entries: ${parsed.entries.length}`);
  console.log(`  senses: ${parsed.entries.reduce((sum, e) => sum + e.senses.length, 0)}`);
  console.log(`  page refs: ${parsed.page_refs.join(', ')}`);
  console.log(`  output: ${outPath}`);

  if (cacheRemote) {
    const id = `lane_source_page_${parsed.root_text}`;
    d1ExecuteSql(`
      INSERT OR REPLACE INTO ar_ling_lane_source_pages (
        id,
        root_text,
        root_norm,
        source_url,
        source_path,
        title_ar,
        prev_root_text,
        next_root_text,
        page_refs_json,
        html_sha256,
        fetched_at,
        parsed_at,
        parser_version,
        parse_status,
        issue_json,
        updated_at
      ) VALUES (
        ${sqlString(id)},
        ${sqlString(parsed.root_text)},
        ${sqlString(parsed.root_text)},
        ${sqlString(parsed.source_url)},
        ${sqlString(parsed.source_path)},
        ${sqlString(parsed.root_text)},
        ${sqlString(parsed.prev_root_text)},
        ${sqlString(parsed.next_root_text)},
        json(${sqlString(JSON.stringify(parsed.page_refs))}),
        ${sqlString(parsed.html_sha256)},
        datetime('now'),
        datetime('now'),
        ${sqlString(PARSER_VERSION)},
        'parsed',
        json('[]'),
        datetime('now')
      );
    `, 'remote');
    console.log('  cached remote source page metadata');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
