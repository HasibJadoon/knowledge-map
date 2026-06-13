#!/usr/bin/env node
// Convert a Markdown reading file into structured worldview `readingBlocks`
// JSON for storage in wv_source_units.meta_json. This is the canonical,
// queryable reading format the apps render from (rather than a raw markdown
// blob). Inline emphasis markers (**bold**, *italic*, `code`) are preserved in
// the block text and rendered by the apps.
//
// Usage:
//   node scripts/md-to-reading-blocks.mjs <input.md> [--locator "Chapter 1"]
// Prints the readingBlocks JSON array to stdout.

import { readFileSync } from 'node:fs';

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

export function mdToReadingBlocks(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let para = [];

  const flush = () => {
    if (para.length) {
      const text = para.join(' ').replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ type: 'paragraph', text });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flush(); continue; }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { flush(); blocks.push({ type: 'separator' }); continue; }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      blocks.push({ type: level >= 3 ? 'subheading' : 'heading', level, text: heading[2].replace(/\s*#+\s*$/, '').trim() });
      continue;
    }

    if (/^\s*>/.test(line)) {
      flush();
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      i--;
      blocks.push({ type: 'quote', text: quote.join(' ').replace(/\s+/g, ' ').trim(), cite: null });
      continue;
    }

    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
      flush();
      const headerRow = splitTableRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(splitTableRow(lines[i])); i++; }
      i--;
      blocks.push({ type: 'table', headerRow, rows });
      continue;
    }

    const isUl = /^\s*[-*+]\s+/.test(line);
    const isOl = /^\s*\d+[.)]\s+/.test(line);
    if (isUl || isOl) {
      flush();
      const items = [];
      const ordered = isOl;
      while (i < lines.length) {
        const li = lines[i];
        const m = ordered ? li.match(/^\s*\d+[.)]\s+(.*)$/) : li.match(/^\s*[-*+]\s+(.*)$/);
        if (m) { items.push(m[1].trim()); i++; }
        else if (/^\s+\S/.test(li) && items.length) { i++; }
        else break;
      }
      i--;
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    para.push(trimmed);
  }

  flush();
  return blocks;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/md-to-reading-blocks.mjs <input.md> [--locator "Chapter 1"]');
    process.exit(1);
  }
  const locatorIdx = process.argv.indexOf('--locator');
  const locator = locatorIdx > -1 ? process.argv[locatorIdx + 1] : null;
  const blocks = mdToReadingBlocks(readFileSync(file, 'utf8'));
  const meta = { readingBlocks: blocks };
  if (locator) meta.locatorLabel = locator;
  process.stdout.write(JSON.stringify(meta));
}
