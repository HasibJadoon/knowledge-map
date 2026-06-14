#!/usr/bin/env node
// ─── Backfill the five Said/Orientalism worldview sample documents ────────────
// The original seed-wv-documents.sql gave each Said doc a single placeholder
// paragraph. This generator replaces those with fuller, editor-renderable
// content (headings, paragraphs, bullet lists, and a key-passage quote) and
// updates word_count, keeping the same doc_ids, topics, and meta_json.domain.
//
// Block mapping (apps/.../shared/services/content/block-mapper.ts):
//   heading     → 'heading' + attrs_json {"level":N}
//   paragraph   → 'paragraph'
//   bullet_list → 'bulletList' container, each item → listItem → paragraph
//   quote       → 'blockquote' container → paragraph
// The editor recomposes from annotations_json; content_text is the FTS/LIKE
// projection. Re-runnable: blocks are deleted by doc_id and re-inserted.
//
//   node scripts/gen-said-sample-docs-seed.mjs
//   wrangler d1 execute km_content --remote --config workers/content/wrangler.toml \
//     --file database/seeds/orientalism/seed-wv-said-sample-docs-backfill.sql

import fs from 'node:fs';
import path from 'node:path';

const outputPath = path.join(
  process.cwd(), 'database', 'seeds', 'orientalism', 'seed-wv-said-sample-docs-backfill.sql',
);

// Each doc keeps its existing doc_id; `slug` drives deterministic block ids.
const docs = [
  {
    doc_id: 'CM:01KSEEDWVSAIDDISCOURSE00001',
    slug: 'discourse',
    blocks: [
      { type: 'heading', level: 2, text: 'The core thesis' },
      { type: 'paragraph', text: 'Orientalism is, in Said’s definition, a Western style of thought and a "corporate institution for dealing with the Orient — dealing with it by making statements about it, authorizing views of it, describing it, by teaching it, settling it, ruling over it." It is less a body of truths about the East than a structure of power-knowledge through which Europe produced and managed "the Orient" politically, sociologically, militarily, ideologically, scientifically, and imaginatively.' },
      { type: 'heading', level: 2, text: 'Three senses of Orientalism' },
      { type: 'bullet_list', items: [
        'Academic: anyone who teaches, writes about, or researches the Orient — the scholarly disciplines, chairs, learned societies, and journals.',
        'Imaginative: a style of thought based on an ontological and epistemological distinction between "the Orient" and "the Occident."',
        'Institutional/corporate: from the late eighteenth century, a corporate institution for dominating, restructuring, and having authority over the Orient.',
      ] },
      { type: 'heading', level: 2, text: 'Foucault and Gramsci' },
      { type: 'paragraph', text: 'Said adapts Foucault’s notion of discourse to argue that without examining Orientalism as a discourse "one cannot possibly understand the enormously systematic discipline by which European culture was able to manage — and even produce — the Orient." From Gramsci he takes cultural hegemony: Orientalism’s durability comes from a hegemonic consent that makes Western superiority feel self-evident.' },
      { type: 'quote', text: 'Orientalism is never far from … the idea of Europe, a collective notion identifying "us" Europeans against all "those" non-Europeans.' },
      { type: 'paragraph', text: 'Crucially, Orientalism is productive, not merely descriptive: it is a distribution of geopolitical awareness into texts that brought the very object it claimed to study into being.' },
    ],
  },
  {
    doc_id: 'CM:01KSEEDWVSAIDGEOGRAPHY0002',
    slug: 'geography',
    blocks: [
      { type: 'heading', level: 2, text: 'Inventing the Orient' },
      { type: 'paragraph', text: 'The Orient is "not an inert fact of nature" but "an idea that has a history and a tradition of thought, imagery, and vocabulary that have given it reality and presence in and for the West." Geography here is imaginative: cultures draw a line between a familiar space ("ours") and an unfamiliar space beyond ("theirs"), and the distinction is arbitrary — it does not require the "barbarians" on the far side to acknowledge it.' },
      { type: 'heading', level: 2, text: 'Orient vs Occident' },
      { type: 'bullet_list', items: [
        'The division is ontological and epistemological: East and West are treated as stable, opposed essences.',
        'The Orient is defined by lack and difference — the contrasting Other against which the Occident defines itself.',
        'Distance becomes hierarchy: the East is rendered past, static, feminine, and irrational; the West present, dynamic, masculine, and rational.',
      ] },
      { type: 'heading', level: 2, text: 'The theatrical stage' },
      { type: 'paragraph', text: 'Said likens Orientalist representation to "a theatrical stage affixed to Europe" on which the whole East is made to appear. Figures and places become types and tableaux; empirical experience matters little because the Oriental is always assigned a fixed schematic place.' },
      { type: 'quote', text: 'The Orient was almost a European invention, and had been since antiquity a place of romance, exotic beings, haunting memories and landscapes, remarkable experiences.' },
    ],
  },
  {
    doc_id: 'CM:01KSEEDWVSAIDLATENT0000003',
    slug: 'latent',
    blocks: [
      { type: 'heading', level: 2, text: 'Two levels of one discourse' },
      { type: 'paragraph', text: 'Said distinguishes latent Orientalism — an almost unconscious, deep, and remarkably stable set of certainties about the Orient — from manifest Orientalism, the stated views and the changing content of what is actually said and written about Oriental societies, languages, and peoples.' },
      { type: 'bullet_list', items: [
        'Latent: the unanimous, durable, unconscious substrate — the Orient as fixed, backward, silent, sensual, despotic, and incapable of self-government.',
        'Manifest: the explicit knowledge that changes with each writer and era, yet always rests on the same latent base.',
      ] },
      { type: 'paragraph', text: 'Differences among Orientalist authors are differences in manifest form only; the latent content remains constant. This is why even sympathetic or learned writers reproduce the same essential structure.' },
      { type: 'heading', level: 2, text: 'Stability and transmission' },
      { type: 'paragraph', text: 'Latent Orientalism is transmitted across generations like a family of ideas; it has the coherence and the slow rate of change of an unconscious. Its near-uniformity is what gives Orientalism its authority and its capacity to survive empirical contradiction.' },
      { type: 'quote', text: 'Latent Orientalism also encouraged a peculiarly … male conception of the world.' },
    ],
  },
  {
    doc_id: 'CM:01KSEEDWVSAIDKNOWPOWER004',
    slug: 'knowpower',
    blocks: [
      { type: 'heading', level: 2, text: 'To know is to dominate' },
      { type: 'paragraph', text: 'For Said, knowledge of the Orient and power over it are inseparable. He reads Arthur Balfour’s 1910 Commons speech and Lord Cromer’s writings on Egypt as exhibits: England knows Egypt, and "Egypt is what England knows." To know the Oriental is to have authority over him; the claim of expertise legitimizes the claim of rule.' },
      { type: 'quote', text: 'Knowledge of subject races or Orientals is what makes their management easy and profitable; knowledge gives power, more power requires more knowledge.' },
      { type: 'heading', level: 2, text: 'From scholarship to administration' },
      { type: 'bullet_list', items: [
        'Philology, history, and travel writing supplied the categories that colonial administration then put to work.',
        'The Orientalist becomes the indispensable mediator who renders a "raw" Orient intelligible to Europe.',
        'The Oriental is represented as a subject to be studied, classified, and governed — never an interlocutor.',
      ] },
      { type: 'paragraph', text: 'Napoleon’s 1798 expedition and the resulting Description de l’Égypte are Said’s model of "a truly scientific appropriation of one culture by another": the project to know Egypt was simultaneously the project to possess it.' },
    ],
  },
  {
    doc_id: 'CM:01KSEEDWVSAIDREPOTHER0005',
    slug: 'repother',
    blocks: [
      { type: 'heading', level: 2, text: 'Spoken for, never speaking' },
      { type: 'paragraph', text: 'A defining feature of Orientalism is that the Orient is represented rather than representing itself. The Oriental is made an object of European discourse — described, classified, and contained — while being denied the position of a speaking subject. Said takes as an epigraph Marx’s line: "They cannot represent themselves; they must be represented."' },
      { type: 'heading', level: 2, text: 'Representation, not reality' },
      { type: 'bullet_list', items: [
        'Orientalist texts refer chiefly to other Orientalist texts, forming a self-confirming "citationary" tradition.',
        'Representations are valued for internal consistency and authority, not for fidelity to living societies.',
        'The textual attitude — the assumption that books can replace direct, reciprocal encounter — screens off the "real" Orient.',
      ] },
      { type: 'paragraph', text: 'Because the Orient cannot answer back within the discourse, Orientalism functions as a closed system in which the European writer is present as a judging, surveying consciousness and the Oriental is a passive, silent presence.' },
      { type: 'quote', text: 'The Orient is watched … The European, whose sensibility tours the Orient, is a watcher, never involved, always detached.' },
    ],
  },
];

const esc = (v) => String(v).replace(/'/g, "''");
const textNode = (text) => ({ type: 'text', text });

function buildRows(doc) {
  const rows = [];
  let counter = 0;
  let words = 0;
  const nextId = () => `BLK:said-${doc.slug}-${String(++counter).padStart(2, '0')}`;
  const count = (t) => { if (typeof t === 'string') words += t.trim().split(/\s+/).filter(Boolean).length; };

  const push = ({ block_type, parent_id, seq, depth, text, attrs }) => {
    const id = nextId();
    rows.push({
      block_id: id,
      doc_id: doc.doc_id,
      parent_block_id: parent_id,
      block_type,
      seq_order: seq,
      depth,
      content_text: text ?? null,
      attrs_json: attrs ? JSON.stringify(attrs) : '{}',
      annotations_json: JSON.stringify(text != null ? [textNode(text)] : []),
    });
    return id;
  };

  let top = 0;
  for (const b of doc.blocks) {
    if (b.type === 'heading') {
      count(b.text);
      push({ block_type: 'heading', parent_id: null, seq: top++, depth: 0, text: b.text, attrs: { level: b.level ?? 2 } });
    } else if (b.type === 'paragraph') {
      count(b.text);
      push({ block_type: 'paragraph', parent_id: null, seq: top++, depth: 0, text: b.text });
    } else if (b.type === 'quote') {
      count(b.text);
      const q = push({ block_type: 'blockquote', parent_id: null, seq: top++, depth: 0, text: null });
      push({ block_type: 'paragraph', parent_id: q, seq: 0, depth: 1, text: b.text });
    } else if (b.type === 'bullet_list') {
      const list = push({ block_type: 'bulletList', parent_id: null, seq: top++, depth: 0, text: null });
      b.items.forEach((item, i) => {
        count(item);
        const li = push({ block_type: 'listItem', parent_id: list, seq: i, depth: 1, text: null });
        push({ block_type: 'paragraph', parent_id: li, seq: 0, depth: 2, text: item });
      });
    } else {
      throw new Error(`Unhandled block type: ${b.type}`);
    }
  }
  return { rows, words };
}

const sqlStr = (v) => (v == null ? 'NULL' : `'${esc(v)}'`);
const blockRow = (r) => `(${[
  sqlStr(r.block_id), sqlStr(r.doc_id), r.parent_block_id ? sqlStr(r.parent_block_id) : 'NULL',
  sqlStr(r.block_type), String(r.seq_order), String(r.depth),
  r.content_text == null ? 'NULL' : sqlStr(r.content_text),
  sqlStr(r.attrs_json), sqlStr(r.annotations_json), `'{}'`,
].join(',')})`;

const sections = [];
let totalBlocks = 0;
for (const doc of docs) {
  const { rows, words } = buildRows(doc);
  totalBlocks += rows.length;
  const reading = Math.max(1, Math.round(words / 200));
  sections.push(
    `-- ${doc.doc_id}  (${rows.length} blocks, ${words} words)\n` +
    `UPDATE cm_documents SET word_count = ${words}, reading_time_min = ${reading}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE doc_id = '${esc(doc.doc_id)}';\n` +
    `DELETE FROM cm_blocks WHERE doc_id = '${esc(doc.doc_id)}';\n` +
    `INSERT INTO cm_blocks\n  (block_id, doc_id, parent_block_id, block_type, seq_order, depth, content_text, attrs_json, annotations_json, meta_json)\nVALUES\n ${rows.map(blockRow).join(',\n ')};`,
  );
}

const out = `-- ─── Backfill: Said/Orientalism worldview sample documents (km_content) ───────
-- Replaces the single-paragraph placeholders for the five Said docs with fuller,
-- editor-renderable content. Generated by scripts/gen-said-sample-docs-seed.mjs.
-- DO NOT EDIT BY HAND. Re-runnable (deletes + re-inserts blocks by doc_id).
--
-- Apply:
--   wrangler d1 execute km_content --remote --config workers/content/wrangler.toml \\
--     --file database/seeds/orientalism/seed-wv-said-sample-docs-backfill.sql

${sections.join('\n\n')}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, out, 'utf8');
console.log(`Wrote ${totalBlocks} blocks across ${docs.length} docs to ${outputPath}`);
