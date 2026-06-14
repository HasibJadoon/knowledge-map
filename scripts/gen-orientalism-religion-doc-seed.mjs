#!/usr/bin/env node
// ─── Generate the Said/Orientalism "Religion" worldview document seed ─────────
// Converts the authored payload
//   database/seeds/orientalism/said-orientalism-religion.document.json
// into km_content seed SQL (cm_documents + cm_blocks) that renders cleanly in
// the editor and lists in the worldview Documents tree.
//
// The worldview Documents tree keys off cm_documents.meta_json.domain
// ('worldview') and meta_json.topic_key (a wv_topics.topic_key). The editor
// recomposes paragraphs from cm_blocks.annotations_json (verbatim Tiptap inline
// nodes), so every text block stores both annotations_json (render) and
// content_text (FTS/LIKE projection).
//
// Block mapping (see apps/.../shared/services/content/block-mapper.ts):
//   heading        → block_type 'heading'   + attrs_json {"level":N}
//   paragraph      → block_type 'paragraph'
//   bullet_list    → block_type 'bulletList' container, each item becomes
//                    listItem → paragraph (the shape Tiptap expects)
//
// Page citations from block_source_links ride in the owning block's meta_json
// under "source" so the provenance survives without inventing cross-domain rows.
//
//   node scripts/gen-orientalism-religion-doc-seed.mjs
//   wrangler d1 execute km_content --remote --config workers/content/wrangler.toml \
//     --file database/seeds/orientalism/seed-wv-said-orientalism-religion-document.sql

import fs from 'node:fs';
import path from 'node:path';

const baseDir = process.cwd();
const inputPath = path.join(baseDir, 'database', 'seeds', 'orientalism', 'said-orientalism-religion.document.json');
const outputPath = path.join(baseDir, 'database', 'seeds', 'orientalism', 'seed-wv-said-orientalism-religion-document.sql');

const DOC_ID = 'CM:01KSEEDWVSAIDRELIGION00001';
const CORE_USER = 'CORE:01KRVE8E5SPYGQZZJE8E4EZN9P';
const TOPIC_KEY = 'said-religion-semitic';
const TAGS = ['said', 'orientalism', 'religion', 'anti-semitism', 'philology'];

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const doc = payload.document;
const blocks = doc.document_json.blocks ?? [];

// block_id (e.g. "b-sharer") → { ref, loc_kind, from, to }
const sourceByBlock = new Map();
for (const link of payload.block_source_links ?? []) {
  sourceByBlock.set(link.block_id, {
    ref: link.source_unit_ref,
    loc_kind: link.loc_kind,
    from: link.loc_from,
    to: link.loc_to,
  });
}

const esc = (value) => String(value).replace(/'/g, "''");
const textNode = (text) => ({ type: 'text', text });

// Emit one cm_blocks row. text blocks carry annotations_json + content_text;
// container blocks (bulletList / listItem) carry neither and gain children.
const rows = [];
let counter = 0;
const nextId = () => `BLK:said-rel-${String(++counter).padStart(3, '0')}`;

function pushBlock({ block_type, parent_id, seq, depth, text, attrs, source }) {
  const id = nextId();
  const annotations = text != null ? [textNode(text)] : [];
  rows.push({
    block_id: id,
    doc_id: DOC_ID,
    parent_block_id: parent_id,
    block_type,
    seq_order: seq,
    depth,
    content_text: text ?? null,
    attrs_json: attrs ? JSON.stringify(attrs) : '{}',
    annotations_json: JSON.stringify(annotations),
    meta_json: source ? JSON.stringify({ source }) : '{}',
  });
  return id;
}

let topSeq = 0;
let wordCount = 0;
const countWords = (text) => {
  if (typeof text === 'string') wordCount += text.trim().split(/\s+/).filter(Boolean).length;
};

for (const block of blocks) {
  const source = block.id ? sourceByBlock.get(block.id) ?? null : null;

  if (block.type === 'heading') {
    countWords(block.text);
    pushBlock({
      block_type: 'heading',
      parent_id: null,
      seq: topSeq++,
      depth: 0,
      text: block.text,
      attrs: { level: block.level ?? 1 },
      source,
    });
  } else if (block.type === 'paragraph') {
    countWords(block.text);
    pushBlock({
      block_type: 'paragraph',
      parent_id: null,
      seq: topSeq++,
      depth: 0,
      text: block.text,
      source,
    });
  } else if (block.type === 'bullet_list') {
    const listId = pushBlock({
      block_type: 'bulletList',
      parent_id: null,
      seq: topSeq++,
      depth: 0,
      text: null,
      source,
    });
    (block.items ?? []).forEach((item, itemSeq) => {
      countWords(item);
      const itemId = pushBlock({
        block_type: 'listItem',
        parent_id: listId,
        seq: itemSeq,
        depth: 1,
        text: null,
      });
      pushBlock({
        block_type: 'paragraph',
        parent_id: itemId,
        seq: 0,
        depth: 2,
        text: item,
      });
    });
  } else {
    throw new Error(`Unhandled block type: ${block.type}`);
  }
}

const readingTime = Math.max(1, Math.round(wordCount / 200));
const tagsJson = JSON.stringify(TAGS);
const metaJson = JSON.stringify({
  domain: doc.domain ?? 'worldview',
  topic_key: TOPIC_KEY,
  parent_doc_id: null,
  sort_order: 0,
  source_unit_ref: doc.anchors?.source_unit_ref ?? null,
  topic_slug: doc.anchors?.topic_slug ?? null,
});

const valueRow = (cols) => `(${cols.join(',')})`;
const sqlStr = (value) => (value == null ? 'NULL' : `'${esc(value)}'`);

const docValues = valueRow([
  sqlStr(DOC_ID),
  sqlStr(CORE_USER),
  sqlStr(doc.doc_type ?? 'reference'),
  sqlStr(doc.title),
  sqlStr('en'),
  String(wordCount),
  String(readingTime),
  sqlStr('draft'),
  sqlStr(tagsJson),
  sqlStr(metaJson),
]);

const blockValues = rows
  .map((r) =>
    valueRow([
      sqlStr(r.block_id),
      sqlStr(r.doc_id),
      r.parent_block_id ? sqlStr(r.parent_block_id) : 'NULL',
      sqlStr(r.block_type),
      String(r.seq_order),
      String(r.depth),
      r.content_text == null ? 'NULL' : sqlStr(r.content_text),
      sqlStr(r.attrs_json),
      sqlStr(r.annotations_json),
      sqlStr(r.meta_json),
    ]),
  )
  .join(',\n ');

const out = `-- ─── Worldview document seed: Said/Orientalism — Religion & the Semitic triangle
-- Target database: km_content  (cm_documents + cm_blocks)
-- Generated by scripts/gen-orientalism-religion-doc-seed.mjs — DO NOT EDIT BY HAND.
-- Source payload: database/seeds/orientalism/said-orientalism-religion.document.json
--
-- Lists in the worldview Documents tree via meta_json.domain='worldview' and
-- topic_key='${TOPIC_KEY}' (see database/seeds/seed-wv-topics.sql).
-- The editor recomposes content from cm_blocks.annotations_json; content_text is
-- the plain-text FTS/LIKE projection. Page citations ride in cm_blocks.meta_json.
-- Re-runnable (INSERT OR IGNORE / OR REPLACE).
--
-- Apply:
--   wrangler d1 execute km_content --remote --config workers/content/wrangler.toml \\
--     --file database/seeds/orientalism/seed-wv-said-orientalism-religion-document.sql

INSERT OR IGNORE INTO cm_documents
  (doc_id, core_user_ref, doc_type, title, language, word_count, reading_time_min, publication_state, tags_json, meta_json)
VALUES
 ${docValues};

DELETE FROM cm_blocks WHERE doc_id = '${esc(DOC_ID)}';

INSERT INTO cm_blocks
  (block_id, doc_id, parent_block_id, block_type, seq_order, depth, content_text, attrs_json, annotations_json, meta_json)
VALUES
 ${blockValues};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, out, 'utf8');
console.log(`Wrote ${rows.length} blocks (${wordCount} words) to ${outputPath}`);
