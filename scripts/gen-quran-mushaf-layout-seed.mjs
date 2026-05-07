#!/usr/bin/env node

/**
 * Generate QUL/QPC V2 Mushaf layout seed data.
 *
 * Sources:
 * - Layout: data/quran-layouts/digital-khatt-15-lines.db
 *   This is the QUL KFGQPC V2 15-line pages table shape:
 *   page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number.
 * - Script tokens: QUL resource 10 page preview HTML. Its rendered spans provide the
 *   exact QPC V2 glyph tokens needed by the page-specific QPC V2 font. The generated
 *   first_token_id/last_token_id values describe those visual tokens per line.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const LAYOUT_DB = path.join(ROOT, 'data/quran-layouts/digital-khatt-15-lines.db');
const OUT = path.join(ROOT, 'database/seeds/seed-qr-mushaf-layout-lines.sql');
const LAYOUT_KEY = 'qpc-v2-15-lines';
const MAX_PAGE = Number(process.argv.find((arg) => arg.startsWith('--pages='))?.split('=')[1] ?? 604);
const QUL_LAYOUT_PAGE_URL = 'https://qul.tarteel.ai/resources/mushaf-layout/10?page=__PAGE__';
const QURAN_COM_CHAPTERS_URL = 'https://api.quran.com/api/v4/chapters?language=en';
const BISMILLAH = '﷽';

function sqliteJson(sql) {
  const raw = execFileSync('sqlite3', ['-json', LAYOUT_DB, sql], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(raw || '[]');
}

async function fetchJson(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'K-MAPS Quran Mushaf seed generator',
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function fetchText(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'text/html',
          'user-agent': 'K-MAPS Quran Mushaf seed generator',
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function compactJson(value) {
  return JSON.stringify(value);
}

function nullableInt(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

function uniqueRefs(tokens) {
  const seen = new Set();
  const refs = [];
  for (const token of tokens) {
    const key = `${token.surah}:${token.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ surah: token.surah, ayah: token.ayah });
  }
  return refs;
}

function attr(fragment, name) {
  return fragment.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
}

function parseQulPageTokens(html) {
  const lines = new Map();
  const lineRe = /<div class="line-container" data-line="(\d+)">([\s\S]*?)(?=<div class="line-container" data-line="|\n\s*<div class="d-flex|<\/section>)/g;
  for (const lineMatch of html.matchAll(lineRe)) {
    const lineNumber = Number(lineMatch[1]);
    const block = lineMatch[2];
    const tokens = [];

    for (const spanMatch of block.matchAll(/<span class="char[\s\S]*?<\/span>/g)) {
      const span = spanMatch[0];
      const klass = attr(span, 'class') ?? '';
      if (!klass.includes('char-word') && !klass.includes('char-end')) continue;
      const location = attr(span, 'data-location')?.split(':').map(Number);
      if (!location || location.length < 3) continue;
      const text = span.match(/<a\b[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/\s+/g, '').trim() ?? '';
      if (!text) continue;

      tokens.push({
        token_id: 0,
        char_type: klass.includes('char-end') ? 'end' : 'word',
        surah: location[0],
        ayah: location[1],
        position: location[2],
        text_qpc_hafs: text,
      });
    }

    lines.set(lineNumber, tokens);
  }
  return lines;
}

function toInsertRows(rows) {
  return rows.map((row) => `(${[
    row.id,
    row.layout_key,
    row.page_number,
    row.line_number,
    row.line_type,
    row.is_centered,
    row.first_token_id,
    row.last_token_id,
    row.surah_number,
    row.text_qpc_hafs,
    row.tokens_json,
    row.refs_json,
  ].map(sqlValue).join(', ')})`);
}

async function main() {
  const layoutRows = sqliteJson(`
    SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number
    FROM pages
    WHERE page_number BETWEEN 1 AND ${MAX_PAGE}
    ORDER BY page_number, line_number
  `);

  const chapterPayload = await fetchJson(QURAN_COM_CHAPTERS_URL);
  const surahNames = new Map(
    (chapterPayload.chapters ?? []).map((chapter) => [chapter.id, chapter.name_arabic]),
  );

  const rows = [];
  let tokenIndex = 1;

  for (let page = 1; page <= MAX_PAGE; page += 1) {
    const pageLayout = layoutRows.filter((row) => row.page_number === page);
    const tokensByLine = parseQulPageTokens(await fetchText(QUL_LAYOUT_PAGE_URL.replace('__PAGE__', String(page))));

    for (const line of pageLayout) {
      let lineTokens = [];
      if (line.line_type === 'ayah') {
        lineTokens = (tokensByLine.get(Number(line.line_number)) ?? []).map((token, index) => ({
          ...token,
          token_id: tokenIndex + index,
        }));

        if (!lineTokens.length) {
          throw new Error(`No QUL tokens for page ${page}, line ${line.line_number}`);
        }

        tokenIndex += lineTokens.length;
      }

      const surahNumber = nullableInt(line.surah_number);
      const surahName = surahNumber ? surahNames.get(surahNumber) : null;
      const text =
        line.line_type === 'surah_name'
          ? `سورة ${surahName ?? surahNumber}`
          : line.line_type === 'basmallah'
            ? BISMILLAH
            : lineTokens.map((token) => token.text_qpc_hafs).join(' ');

      rows.push({
        id: `QML:${LAYOUT_KEY}:${page}:${line.line_number}`,
        layout_key: LAYOUT_KEY,
        page_number: Number(line.page_number),
        line_number: Number(line.line_number),
        line_type: line.line_type,
        is_centered: Number(line.is_centered) ? 1 : 0,
        first_token_id: lineTokens[0]?.token_id ?? null,
        last_token_id: lineTokens[lineTokens.length - 1]?.token_id ?? null,
        surah_number: surahNumber,
        text_qpc_hafs: text,
        tokens_json: compactJson(lineTokens),
        refs_json: compactJson(uniqueRefs(lineTokens)),
      });
    }

    if (page % 50 === 0 || page === MAX_PAGE) {
      process.stderr.write(`Generated page ${page}/${MAX_PAGE}\n`);
    }
  }

  const chunks = [];
  for (let index = 0; index < rows.length; index += 20) {
    chunks.push(rows.slice(index, index + 20));
  }

  const sql = [
    '-- Generated by scripts/gen-quran-mushaf-layout-seed.mjs',
    `-- Layout source: ${path.relative(ROOT, LAYOUT_DB)}`,
    '-- Script source: QUL resource 10 page preview HTML, with generated visual token IDs per line.',
    `DELETE FROM qr_mushaf_layout_lines WHERE layout_key = ${sqlValue(LAYOUT_KEY)};`,
    ...chunks.map((chunk) => [
      'INSERT INTO qr_mushaf_layout_lines (',
      '  id, layout_key, page_number, line_number, line_type, is_centered,',
      '  first_token_id, last_token_id, surah_number, text_qpc_hafs, tokens_json, refs_json',
      ') VALUES',
      `${toInsertRows(chunk).join(',\n')};`,
    ].join('\n')),
    '',
  ].join('\n');

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, sql, 'utf8');
  process.stderr.write(`Wrote ${rows.length} lines to ${path.relative(ROOT, OUT)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
