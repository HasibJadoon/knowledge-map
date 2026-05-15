#!/usr/bin/env node
// iraab-display-sample.mjs
//
// Generates database/mockups/iraab-display-sample.json from REAL D1 data,
// exercising every code path in the three-phase parser:
//   - Phase A (entries) for Al-Jadwal group 3:131-3:133 + multi-source 2:3
//   - Phase B (section chunks) for Al-Jadwal 3:131's sarf/balagha/fawaid
//   - Phase C (dep_graph chunk) for 3:131
//
// Run: `node scripts/iraab-display-sample.mjs`.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBlocksFromEntry,
  buildBlocksFromSectionChunk,
  buildBlocksFromDepGraphChunk,
} from './iraab-display-parser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

function d1(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'km_quran', '--remote', '--json', '--command', sql],
    { cwd: resolve(repo, 'workers/quran'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(out)[0]?.results ?? [];
}

console.error('pulling sources …');
const sourcesArr = d1('SELECT * FROM qr_irab_sources;');
const sourcesById = Object.fromEntries(sourcesArr.map((s) => [s.id, s]));
const sourcesBySlug = Object.fromEntries(sourcesArr.map((s) => [s.source_slug, s]));

// 1) Al-Jadwal grouped iʿrāb for 3:131-3:133 (chunk-level entries).
console.error('pulling al-jadwal entries for 3:131 …');
const jadwalEntries = d1(`
  SELECT * FROM qr_irab_book_entries
   WHERE source_slug='qul_jadwal_irab_quran' AND ayah_key='3:131'
   ORDER BY entry_order
   LIMIT 50;`);

// 2) Multi-source for 2:3 (compare 3 sources, no grouping).
console.error('pulling multi-source entries for 2:3 …');
const multiSourceEntries = d1(`
  SELECT * FROM qr_irab_book_entries
   WHERE ayah_key='2:3' AND source_slug IN ('qul_jadwal_irab_quran','qul_irab_muyassar','qul_irab_quran_daas')
   ORDER BY source_slug, entry_order
   LIMIT 50;`);

// 3) Al-Jadwal section chunks for 3:131 (sarf/balagha/fawaid).
console.error('pulling al-jadwal section chunks for 3:131 …');
const sectionChunks = d1(`
  SELECT * FROM qr_irab_source_chunks
   WHERE source_slug='qul_jadwal_irab_quran' AND ayah_key='3:131'
     AND section_kind IN ('sarf','balagha','fawaid')
   ORDER BY section_order
   LIMIT 10;`);

// 4) dep_graph chunk for 3:131.
console.error('pulling dep_graph for 3:131 …');
const depGraphChunks = d1(`
  SELECT * FROM qr_irab_source_chunks
   WHERE source_slug='qul_dep_graphs' AND ayah_key='3:131'
   LIMIT 1;`);

// Build blocks for each input row.
const all = { blocks: [], tags: [], refs: [], notes: [] };
const merge = (built) => { for (const k of Object.keys(all)) all[k].push(...built[k]); };

for (const e of jadwalEntries) merge(buildBlocksFromEntry(e, sourcesById[e.source_id]));
for (const e of multiSourceEntries) merge(buildBlocksFromEntry(e, sourcesById[e.source_id]));
for (const c of sectionChunks) merge(buildBlocksFromSectionChunk(c, sourcesById[c.source_id]));
for (const c of depGraphChunks) merge(buildBlocksFromDepGraphChunk(c, sourcesById[c.source_id]));

// Display-tier source rows (synthetic — would be seeded from qr_irab_sources).
const slugs = [...new Set(all.blocks.map((b) => b.source_slug))];
const displaySources = slugs.map((slug, i) => {
  const upstream = sourcesBySlug[slug] || {};
  return {
    id: upstream.id ?? `DISPLAY_SRC_${slug}`,
    source_slug: slug,
    book_title_ar: upstream.source_title_ar ?? null,
    book_title_en: upstream.source_title_en ?? null,
    author_name_ar: null,
    author_name_en: null,
    author_period: null,
    badge_color: { qul_jadwal_irab_quran: '#8B6E2F', qul_irab_muyassar: '#4A6E8A', qul_irab_quran_daas: '#6E588E', qul_dep_graphs: '#2F6E4F' }[slug] ?? '#6E665A',
    badge_glyph: { qul_jadwal_irab_quran: 'ج', qul_irab_muyassar: 'م', qul_irab_quran_daas: 'د', qul_dep_graphs: '⤴' }[slug] ?? '·',
    short_description: null, long_description: null, cover_image_url: null,
    display_order: i,
    is_visible: 1,
    meta_json: null,
    created_at: '2026-05-15T00:00:00Z',
    updated_at: '2026-05-15T00:00:00Z',
  };
});

// One payload per group key. The al-jadwal 3:131 group covers 3:131-3:133;
// 2:3 is a singleton group "2:3" across all three sources.
function groupPayload(groupKey, blocks) {
  if (!blocks.length) return null;
  const ayahKeys = JSON.parse(blocks[0].ayah_keys_json || '[]');
  const blockIds = new Set(blocks.map((b) => b.id));
  return {
    ayah_group_key: groupKey,
    surah_no: blocks[0].surah_no,
    ayah_no: blocks[0].ayah_no,
    ayah_to: blocks[0].ayah_to ?? blocks[0].ayah_no,
    ayah_keys: ayahKeys,
    sources: displaySources.filter((s) => blocks.some((b) => b.source_slug === s.source_slug)),
    blocks,
    tags: all.tags.filter((t) => blockIds.has(t.block_id)),
    refs: all.refs.filter((r) => blockIds.has(r.block_id)),
    links: [],
    notes: all.notes.filter((n) => blockIds.has(n.block_id)),
  };
}

const byGroup = new Map();
for (const b of all.blocks) {
  const k = b.ayah_group_key || b.ayah_key || 'unknown';
  if (!byGroup.has(k)) byGroup.set(k, []);
  byGroup.get(k).push(b);
}

const payloads = [...byGroup.entries()]
  .map(([k, blocks]) => groupPayload(k, blocks))
  .filter(Boolean);

const out = {
  generated_at: new Date().toISOString(),
  description: 'Real-data sample from D1: Al-Jadwal grouped 3:131-3:133 (Phase A+B+C), multi-source 2:3 (Phase A only).',
  group_count: payloads.length,
  payloads,
};

mkdirSync(resolve(repo, 'database/mockups'), { recursive: true });
const outPath = resolve(repo, 'database/mockups/iraab-display-sample.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.error(`wrote ${outPath}`);
console.error(`  groups: ${payloads.length}`);
console.error(`  total blocks: ${all.blocks.length} / tags: ${all.tags.length} / refs: ${all.refs.length} / notes: ${all.notes.length}`);
