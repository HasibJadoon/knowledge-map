#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractIrabEntriesFromSection, parseHtmlSections } from './parser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, 'fixtures/al-jadwal-2-3.html'), 'utf8');

const sections = parseHtmlSections(html);
assert.deepEqual(sections.map((section) => section.section_kind), ['irab', 'sarf', 'balagha', 'fawaid']);

const byKind = Object.fromEntries(sections.map((section) => [
  section.section_kind,
  extractIrabEntriesFromSection(section),
]));

assert.ok(byKind.irab.length > 0);
assert.equal(byKind.sarf.length, 0);
assert.equal(byKind.balagha.length, 0);
assert.equal(byKind.fawaid.length, 0);

const targets = byKind.irab.map((entry) => entry.target_text_ar);
for (const target of ['يؤمنون بالغيب', 'يقيمون الصلاة', 'رزقناهم', 'ينفقون']) {
  assert.ok(targets.includes(target), `missing sentence target: ${target}`);
}

const allQuotes = byKind.irab.map((entry) => entry.source_quote_ar).join('\n');
assert.ok(allQuotes.includes('[[ويجوز أن يكون في محلّ رفع خبر لمبتدأ محذوف تقديره هم. أو مبتدأ خبره جملة أولئك على هدى.]]'));

const allAlternatives = byKind.irab
  .map((entry) => entry.alternative_json)
  .filter(Boolean)
  .join('\n');
assert.ok(allAlternatives.includes('الذين') || byKind.irab.find((entry) => entry.target_text_ar === 'الذين')?.alternative_json);
assert.ok(allAlternatives.includes('بالغيبة') || byKind.irab.find((entry) => entry.target_text_ar === 'بالغيب')?.alternative_json);

console.log(JSON.stringify({
  sections: sections.map((section) => section.section_kind),
  irab_entries: byKind.irab.length,
  sentence_targets: targets.filter((target) => ['يؤمنون بالغيب', 'يقيمون الصلاة', 'رزقناهم', 'ينفقون'].includes(target)),
}, null, 2));
