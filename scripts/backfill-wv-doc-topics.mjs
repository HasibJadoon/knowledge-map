#!/usr/bin/env node
// ─── Backfill worldview document topics ───────────────────────────────────────
// Populates `cm_documents.meta_json.topic_key` for worldview documents so the
// Ionic "Worldview → Documents" tree can group them by topic instead of parking
// everything under "Uncategorized".
//
// Source of truth (km_worldview):
//   wv_doc_links (entity_type='topic')  →  the linked CM document (cm_doc_ref)
//   joined to wv_topics                 →  the topic_key to stamp on the doc
// Target (km_content):
//   cm_documents.meta_json.topic_key
//
// The two facts live in different D1 databases, so this script reads the
// mapping from km_worldview, then writes each doc's topic_key into km_content.
// It is idempotent (skips docs already carrying the right key) and dry-run by
// default — pass --apply to write.
//
// Usage:
//   node scripts/backfill-wv-doc-topics.mjs            # dry run, prints plan
//   node scripts/backfill-wv-doc-topics.mjs --apply    # writes changes
//
// Requires wrangler auth (same as `wrangler d1 execute`).

import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');

const WV = { db: 'km_worldview', cfg: 'workers/worldview/wrangler.toml' };
const CM = { db: 'km_content', cfg: 'workers/content/wrangler.toml' };

/** Run a SQL command against a D1 database via wrangler and return its rows. */
function d1(target, sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--remote', '--config', target.cfg, '--json', '--command', sql],
    { encoding: 'utf8' },
  );
  const parsed = JSON.parse(out);
  const block = Array.isArray(parsed) ? parsed[0] : parsed;
  return block?.results ?? [];
}

/** SQLite single-quoted string literal. */
function lit(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// 1. Read the topic → document mapping from km_worldview. When a doc is linked
//    to several topics, the most recent link wins.
const links = d1(
  WV,
  `SELECT l.cm_doc_ref AS doc_ref, t.topic_key AS topic_key
     FROM wv_doc_links l
     JOIN wv_topics t ON t.id = l.entity_id
    WHERE l.entity_type = 'topic'
      AND l.cm_doc_ref LIKE 'CM:%'
    ORDER BY l.created_at`,
);

const topicByDoc = new Map();
for (const row of links) topicByDoc.set(row.doc_ref, row.topic_key);

if (topicByDoc.size === 0) {
  console.log('No worldview topic links (wv_doc_links.entity_type=\'topic\') found — nothing to backfill.');
  process.exit(0);
}

// 2. For each linked doc, compare against the current value and update km_content.
let changed = 0;
let missing = 0;
for (const [docRef, topicKey] of topicByDoc) {
  const cur = d1(CM, `SELECT json_extract(meta_json,'$.topic_key') AS tk FROM cm_documents WHERE doc_id = ${lit(docRef)}`);
  if (cur.length === 0) {
    missing++;
    console.log(`  · skip ${docRef} — not present in cm_documents`);
    continue;
  }
  const existing = cur[0].tk ?? null;
  if (existing === topicKey) continue;

  changed++;
  console.log(`  ${existing ?? '(none)'} → ${topicKey}   ${docRef}`);
  if (APPLY) {
    d1(
      CM,
      `UPDATE cm_documents
          SET meta_json = json_set(meta_json, '$.topic_key', ${lit(topicKey)}),
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE doc_id = ${lit(docRef)}`,
    );
  }
}

console.log(
  `\n${topicByDoc.size} linked doc(s); ${changed} ${APPLY ? 'updated' : 'would be updated (dry run — pass --apply)'}` +
    (missing ? `; ${missing} not found in cm_documents` : ''),
);
