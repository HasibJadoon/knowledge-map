#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const useRemote = argv.includes('--remote');
const useLocal = argv.includes('--local');
const dryRun = argv.includes('--dry-run');
const forceContentSync = argv.includes('--force-content-sync');
const databaseName = readFlagValue(argv, '--db') ?? 'knowledgemap';

if (useRemote === useLocal) {
  console.error('Pass exactly one of --remote or --local.');
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  await ensureDocumentColumns();

  const units = queryRows(`
    SELECT
      id,
      canonical_input,
      workspace_id,
      group_id,
      user_id,
      source_id,
      unit_type,
      title,
      order_index,
      anchor_text,
      summary,
      unit_json,
      meta_json
    FROM wv_source_units
    WHERE unit_type = 'chapter'
    ORDER BY source_id ASC, order_index ASC, id ASC
  `);

  if (!units.length) {
    console.log('No chapter units found.');
    return;
  }

  let createdDocuments = 0;
  let updatedDocuments = 0;
  let updatedUnits = 0;
  let totalBlocks = 0;
  let skippedDocuments = 0;

  for (const unit of units) {
    const unitJson = parseJson(unit.unit_json);
    const existingDocument = readExistingDocument(unit.source_id, unit.id);
    const legacyReadingBody = readStringArray(unitJson.readingBody) ?? readStringArray(unitJson.reading_body) ?? [];
    const legacyReadingBlocks = readRecordArray(unitJson.readingBlocks) ?? readRecordArray(unitJson.reading_blocks);
    const legacyReadingSchema = readTrimmed(unitJson.readingSchema) ?? readTrimmed(unitJson.reading_schema);
    const locatorLabel = readTrimmed(unitJson.locatorLabel) ?? readTrimmed(unitJson.locator_label);
    const leanUnitJson = locatorLabel ? JSON.stringify({ locatorLabel }) : null;
    const defaultDocumentTitle = buildChapterDocumentTitle(unit.title);

    const shouldCreateContent =
      !hasMeaningfulTiptapDocument(existingDocument?.document_json)
      || forceContentSync;
    const documentJson = shouldCreateContent
      ? buildWorldviewStudyNoteDocument({
          title: unit.title,
          readingBody: legacyReadingBody,
          readingBlocks: legacyReadingBlocks,
        })
      : parseJson(existingDocument.document_json);

    if (!documentJson || !hasMeaningfulTiptapDocument(documentJson)) {
      skippedDocuments += 1;
    }

    const existingMeta = parseJson(existingDocument?.meta_json);
    const autoCreated =
      existingMeta.auto_created_from_unit === true
      || existingMeta.auto_created_from_unit === 1
      || existingMeta.auto_created_from_unit === '1'
      || readTrimmed(existingDocument?.title) === defaultDocumentTitle;
    const documentId = readTrimmed(existingDocument?.id)
      ?? `wv_doc_${slugify(unit.source_id, 'source')}_${slugify(unit.id, 'unit')}_study`;
    const canonicalInput = readTrimmed(existingDocument?.canonical_input)
      ?? `wv_document:worldview:${slugify(unit.source_id, 'source')}:${slugify(unit.id, 'unit')}:study_note`;
    const documentTitle = autoCreated || !readTrimmed(existingDocument?.title)
      ? defaultDocumentTitle
      : existingDocument.title;
    const summary = readTrimmed(existingDocument?.summary) ?? readTrimmed(unit.summary) ?? null;
    const status = readTrimmed(existingDocument?.status) ?? 'active';
    const mergedMeta = {
      ...existingMeta,
      auto_created_from_unit: existingMeta.auto_created_from_unit ?? true,
      source_id: unit.source_id,
      source_unit_id: unit.id,
      migrated_from_unit_json: true,
      migrated_at: new Date().toISOString(),
      ...(legacyReadingSchema ? { legacy_reading_schema: legacyReadingSchema } : {}),
    };

    const blockDrafts = deriveWorldviewDocumentBlocksFromTiptap(documentJson);
    const blockStatements = blockDrafts.map((block, index) => {
      const blockId = `${documentId}:block:${String(index + 1).padStart(4, '0')}`;
      totalBlocks += 1;
      return `
        INSERT OR REPLACE INTO wv_document_blocks (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          document_id,
          parent_block_id,
          order_index,
          block_type,
          block_level,
          text_plain,
          content_json,
          attrs_json,
          block_kind,
          renderer
        )
        VALUES (
          ${sqlLiteral(blockId)},
          ${sqlLiteral(`wv_document_block:${slugify(documentId, 'document')}:${String(index + 1).padStart(4, '0')}`)},
          ${sqlLiteral(unit.workspace_id)},
          ${sqlLiteral(unit.group_id)},
          ${sqlLiteral(unit.user_id)},
          ${sqlLiteral(documentId)},
          NULL,
          ${index + 1},
          ${sqlLiteral(block.blockType)},
          ${sqlNullableInteger(block.blockLevel)},
          ${sqlLiteral(block.textPlain)},
          ${sqlJson(block.contentJson)},
          ${sqlJson(block.attrsJson)},
          ${sqlLiteral(block.blockKind)},
          ${sqlLiteral(block.renderer)}
        );
      `;
    });
    const retainedBlockIds = blockDrafts.map((_, index) => `${documentId}:block:${String(index + 1).padStart(4, '0')}`);
    const deleteExtraBlocksSql = retainedBlockIds.length
      ? `
        DELETE FROM wv_document_blocks
        WHERE document_id = ${sqlLiteral(documentId)}
          AND id NOT IN (${retainedBlockIds.map(sqlLiteral).join(', ')});
      `
      : `
        DELETE FROM wv_document_blocks
        WHERE document_id = ${sqlLiteral(documentId)};
      `;

    const sql = `
      INSERT INTO wv_documents (
        id,
        canonical_input,
        workspace_id,
        group_id,
        user_id,
        doc_type,
        title,
        summary,
        status,
        unit_id,
        domain,
        source_id,
        source_unit_id,
        document_json,
        meta_json
      )
      VALUES (
        ${sqlLiteral(documentId)},
        ${sqlLiteral(canonicalInput)},
        ${sqlLiteral(unit.workspace_id)},
        ${sqlLiteral(unit.group_id)},
        ${sqlLiteral(unit.user_id)},
        'study_note',
        ${sqlLiteral(documentTitle)},
        ${sqlLiteral(summary)},
        ${sqlLiteral(status)},
        ${sqlLiteral(unit.id)},
        'worldview',
        ${sqlLiteral(unit.source_id)},
        ${sqlLiteral(unit.id)},
        ${sqlJson(documentJson)},
        ${sqlJson(mergedMeta)}
      )
      ON CONFLICT(id) DO UPDATE SET
        canonical_input = excluded.canonical_input,
        workspace_id = excluded.workspace_id,
        group_id = excluded.group_id,
        user_id = excluded.user_id,
        title = excluded.title,
        summary = excluded.summary,
        status = excluded.status,
        unit_id = excluded.unit_id,
        domain = excluded.domain,
        source_id = excluded.source_id,
        source_unit_id = excluded.source_unit_id,
        document_json = excluded.document_json,
        meta_json = excluded.meta_json,
        updated_at = datetime('now');

      ${blockStatements.join('\n')}

      ${deleteExtraBlocksSql}

      UPDATE wv_source_units
      SET unit_json = ${leanUnitJson ? sqlLiteral(leanUnitJson) : 'NULL'},
          updated_at = datetime('now')
      WHERE id = ${sqlLiteral(unit.id)};
    `;

    if (dryRun) {
      console.log(`DRY RUN chapter ${unit.id}`);
      continue;
    }

    executeSql(sql);

    if (existingDocument?.id) {
      updatedDocuments += 1;
    } else {
      createdDocuments += 1;
    }

    if ((unit.unit_json ?? null) !== leanUnitJson) {
      updatedUnits += 1;
    }
  }

  console.log([
    `Chapter units scanned: ${units.length}`,
    `Documents created: ${createdDocuments}`,
    `Documents updated: ${updatedDocuments}`,
    `Units cleaned: ${updatedUnits}`,
    `Blocks upserted: ${totalBlocks}`,
    `Documents left empty: ${skippedDocuments}`,
    dryRun ? 'Mode: dry-run' : 'Mode: applied',
  ].join('\n'));
}

function ensureDocumentColumns() {
  const columns = queryRows('PRAGMA table_info(wv_documents);');
  const columnNames = new Set(columns.map((row) => String(row.name)));
  const statements = [];

  if (!columnNames.has('source_id')) {
    statements.push('ALTER TABLE wv_documents ADD COLUMN source_id TEXT;');
  }
  if (!columnNames.has('source_unit_id')) {
    statements.push('ALTER TABLE wv_documents ADD COLUMN source_unit_id TEXT;');
  }

  statements.push(`
    UPDATE wv_documents
    SET
      source_id = COALESCE(source_id, json_extract(document_json, '$.source_id')),
      source_unit_id = COALESCE(source_unit_id, json_extract(document_json, '$.source_unit_id'))
    WHERE source_id IS NULL
       OR source_unit_id IS NULL;
  `);
  statements.push(`
    CREATE INDEX IF NOT EXISTS idx_wv_documents_source_scope
      ON wv_documents(domain, doc_type, source_id, source_unit_id);
  `);

  if (!dryRun) {
    executeSql(statements.join('\n'));
  }
}

function readExistingDocument(sourceId, unitId) {
  const rows = queryRows(`
    SELECT
      id,
      canonical_input,
      title,
      summary,
      status,
      document_json,
      meta_json
    FROM wv_documents
    WHERE doc_type = 'study_note'
      AND domain = 'worldview'
      AND source_id = ${sqlLiteral(sourceId)}
      AND (source_unit_id = ${sqlLiteral(unitId)} OR unit_id = ${sqlLiteral(unitId)})
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 1
  `);

  return rows[0] ?? null;
}

function queryRows(sql) {
  const output = execWrangler([
    'd1',
    'execute',
    databaseName,
    scopeFlag(),
    '--json',
    '--command',
    sql,
  ]);
  const payload = JSON.parse(output);
  return Array.isArray(payload) ? (payload[0]?.results ?? []) : [];
}

function executeSql(sql) {
  const filePath = path.join(
    os.tmpdir(),
    `wv-chapter-doc-migration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sql`,
  );

  try {
    fs.writeFileSync(filePath, sql, 'utf8');
    execWrangler([
      'd1',
      'execute',
      databaseName,
      scopeFlag(),
      '--file',
      filePath,
    ]);
  } finally {
    fs.rmSync(filePath, { force: true });
  }
}

function execWrangler(args) {
  return execFileSync('npx', ['wrangler', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function scopeFlag() {
  return useRemote ? '--remote' : '--local';
}

function readFlagValue(values, flag) {
  const index = values.indexOf(flag);
  if (index === -1 || index === values.length - 1) {
    return null;
  }

  return values[index + 1];
}

function sqlLiteral(value) {
  if (value == null) {
    return 'NULL';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value == null) {
    return 'NULL';
  }

  return sqlLiteral(JSON.stringify(value));
}

function sqlNullableInteger(value) {
  return Number.isFinite(value) ? String(Math.trunc(value)) : 'NULL';
}

function parseJson(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function readTrimmed(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function readStringArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => readTrimmed(entry))
    .filter((entry) => entry != null);
}

function readRecordArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const rows = value.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
  return rows.length ? rows : null;
}

function slugify(value, fallback) {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return normalized || fallback;
}

function buildChapterDocumentTitle(unitTitle) {
  const title = readTrimmed(unitTitle) ?? 'Untitled Chapter';
  const stripped = title
    .replace(/^\s*chapter\s+[0-9ivxlcdm]+\s*[:\-–—]\s*/i, '')
    .replace(/^\s*chapter\s+[0-9ivxlcdm]+\s+/i, '')
    .trim();
  const base = stripped || title;
  return /\bnotes?\b$/i.test(base) ? base : `${base} - Notes`;
}

function buildWorldviewStudyNoteDocument({ readingBody = [], readingBlocks = null }) {
  const content = normalizeLegacyReadingBlocks(readingBlocks).length
    ? normalizeLegacyReadingBlocks(readingBlocks).flatMap((block) => legacyBlockToNodes(block))
    : buildNodesFromReadingBody(readingBody);

  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  };
}

function hasMeaningfulTiptapDocument(value) {
  const doc = parseTiptapDocument(value);
  if (!doc) {
    return false;
  }

  return doc.content.some((node) => {
    if (node.type === 'horizontalRule' || node.type === 'image' || node.type === 'audio') {
      return true;
    }

    return extractPlainText(node).length > 0;
  });
}

function parseTiptapDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.type !== 'doc') {
    return null;
  }

  return {
    type: 'doc',
    content: Array.isArray(value.content) ? value.content.filter((entry) => entry && typeof entry === 'object') : [],
  };
}

function normalizeLegacyReadingBlocks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      type: normalizeLegacyBlockType(entry.type),
      text: readTrimmed(entry.text) ?? undefined,
      cite: readTrimmed(entry.cite) ?? undefined,
      label: readTrimmed(entry.label) ?? undefined,
      href: normalizeUrl(entry.href),
      src: normalizeUrl(entry.src ?? entry.url ?? entry.audioUrl ?? entry.audio_url),
      alt: readTrimmed(entry.alt) ?? undefined,
      title: readTrimmed(entry.title) ?? undefined,
      caption: readTrimmed(entry.caption) ?? undefined,
      tone: readTrimmed(entry.tone) ?? undefined,
    }))
    .filter((entry) => entry.type);
}

function normalizeLegacyBlockType(value) {
  switch ((typeof value === 'string' ? value : '').trim().toLowerCase()) {
    case 'heading':
    case 'subheading':
    case 'paragraph':
    case 'quote':
    case 'link':
    case 'callout':
    case 'image':
    case 'audio':
      return value.trim().toLowerCase();
    case 'separator':
    case 'divider':
      return 'separator';
    default:
      return null;
  }
}

function buildNodesFromReadingBody(readingBody) {
  return (Array.isArray(readingBody) ? readingBody : [])
    .map((entry) => readTrimmed(entry))
    .filter((entry) => entry != null)
    .flatMap((entry) => {
      if (/^[-*_]{3,}$/.test(entry)) {
        return [{ type: 'horizontalRule' }];
      }
      if (/^>\s+/.test(entry)) {
        return [{ type: 'blockquote', content: [paragraphNode(entry.replace(/^>\s+/, ''))] }];
      }
      if (/^#{1,6}\s+/.test(entry)) {
        const level = Math.min(6, Math.max(1, entry.match(/^#+/)?.[0]?.length ?? 1));
        return [{ type: 'heading', attrs: { level }, content: textContent(entry.replace(/^#{1,6}\s+/, '')) }];
      }
      if (normalizeUrl(entry)) {
        return [linkParagraphNode(entry, entry)];
      }
      return [paragraphNode(entry)];
    });
}

function legacyBlockToNodes(block) {
  switch (block.type) {
    case 'heading':
      return [headingNode(block.text ?? block.label ?? block.title ?? '', 1)];
    case 'subheading':
      return [headingNode(block.text ?? block.label ?? block.title ?? '', 2)];
    case 'quote':
      return [{
        type: 'blockquote',
        attrs: block.cite ? { cite: block.cite } : undefined,
        content: [paragraphNode(block.text ?? '')],
      }];
    case 'link':
      return [linkParagraphNode(block.label ?? block.text ?? block.href ?? '', block.href)];
    case 'separator':
      return [{ type: 'horizontalRule' }];
    case 'callout':
      return [{
        type: 'callout',
        attrs: compactRecord({
          tone: block.tone ?? 'note',
          title: block.title ?? block.label ?? null,
        }) ?? undefined,
        content: [paragraphNode(block.text ?? block.label ?? block.title ?? '')],
      }];
    case 'image':
      return [{
        type: 'image',
        attrs: compactRecord({
          src: block.src,
          alt: block.alt,
          title: block.title ?? block.caption ?? block.label,
        }) ?? {},
      }];
    case 'audio':
      return [{
        type: 'audio',
        attrs: compactRecord({
          src: block.src,
          title: block.title ?? block.label ?? block.text,
        }) ?? {},
      }];
    case 'paragraph':
    default:
      return [paragraphNode(block.text ?? block.label ?? '')];
  }
}

function headingNode(text, level) {
  const normalized = readTrimmed(text);
  return {
    type: 'heading',
    attrs: { level: Math.min(6, Math.max(1, level)) },
    content: normalized ? textContent(normalized) : undefined,
  };
}

function paragraphNode(text) {
  const normalized = readTrimmed(text);
  return {
    type: 'paragraph',
    content: normalized ? textContent(normalized) : undefined,
  };
}

function linkParagraphNode(label, href) {
  const text = readTrimmed(label) ?? readTrimmed(href) ?? '';
  const url = normalizeUrl(href);
  return {
    type: 'paragraph',
    content: text
      ? [{
          type: 'text',
          text,
          marks: url ? [{ type: 'link', attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' } }] : undefined,
        }]
      : undefined,
    attrs: url ? { href: url } : undefined,
  };
}

function textContent(text) {
  const normalized = readTrimmed(text);
  return normalized ? [{ type: 'text', text: normalized }] : [];
}

function normalizeUrl(value) {
  const trimmed = readTrimmed(value);
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function compactRecord(value) {
  const entries = Object.entries(value).filter(([, entry]) => entry != null && entry !== '');
  return entries.length ? Object.fromEntries(entries) : null;
}

function deriveWorldviewDocumentBlocksFromTiptap(value) {
  const document = parseTiptapDocument(value);
  if (!document) {
    return [];
  }

  let orderIndex = 1;
  const blocks = [];

  for (const node of document.content) {
    const flattened = flattenNode(node, orderIndex);
    blocks.push(...flattened);
    orderIndex += flattened.length;
  }

  return blocks.map((block, index) => ({
    ...block,
    orderIndex: index + 1,
  }));
}

function flattenNode(node, orderIndex) {
  switch (node.type) {
    case 'heading':
      return [createBlock(node, {
        orderIndex,
        blockType: 'heading',
        blockLevel: normalizeHeadingLevel(node.attrs?.level),
        textPlain: extractPlainText(node),
        blockKind: normalizeHeadingLevel(node.attrs?.level) > 1 ? 'subheading' : 'heading',
        renderer: 'tiptap',
      })];
    case 'paragraph': {
      const link = extractStandaloneLink(node);
      return [createBlock(node, {
        orderIndex,
        blockType: 'paragraph',
        blockLevel: null,
        textPlain: extractPlainText(node),
        blockKind: link ? 'link' : 'paragraph',
        renderer: 'tiptap',
      })];
    }
    case 'blockquote':
      return [createBlock(node, {
        orderIndex,
        blockType: 'quote',
        blockLevel: null,
        textPlain: extractPlainText(node),
        blockKind: 'quote',
        renderer: 'tiptap',
      })];
    case 'callout':
      return [createBlock(node, {
        orderIndex,
        blockType: 'callout',
        blockLevel: null,
        textPlain: extractPlainText(node),
        blockKind: 'callout',
        renderer: 'tiptap',
      })];
    case 'horizontalRule':
      return [createBlock(node, {
        orderIndex,
        blockType: 'divider',
        blockLevel: null,
        textPlain: null,
        blockKind: 'separator',
        renderer: 'tiptap',
      })];
    case 'image':
      return [createBlock(node, {
        orderIndex,
        blockType: 'image',
        blockLevel: null,
        textPlain: readTrimmed(node.attrs?.title) ?? readTrimmed(node.attrs?.alt) ?? readTrimmed(node.attrs?.src),
        blockKind: 'image',
        renderer: 'image',
      })];
    case 'audio':
      return [createBlock(node, {
        orderIndex,
        blockType: 'paragraph',
        blockLevel: null,
        textPlain: readTrimmed(node.attrs?.title) ?? readTrimmed(node.attrs?.src),
        blockKind: 'audio',
        renderer: 'audio',
      })];
    case 'bulletList':
      return flattenList(node, 'bullet_item', orderIndex);
    case 'orderedList':
      return flattenList(node, 'numbered_item', orderIndex);
    default:
      return [];
  }
}

function flattenList(node, blockType, orderIndex) {
  const items = Array.isArray(node.content) ? node.content : [];
  return items
    .map((item, index) => {
      const textPlain = extractPlainText(item);
      if (!textPlain) {
        return null;
      }

      return createBlock(item, {
        orderIndex: orderIndex + index,
        blockType,
        blockLevel: null,
        textPlain,
        blockKind: 'list_item',
        renderer: 'tiptap',
      });
    })
    .filter(Boolean);
}

function createBlock(node, input) {
  return {
    orderIndex: input.orderIndex,
    blockType: input.blockType,
    blockLevel: input.blockLevel,
    textPlain: input.textPlain,
    contentJson: node,
    attrsJson: node.attrs ?? {},
    blockKind: input.blockKind,
    renderer: input.renderer,
  };
}

function extractPlainText(node) {
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  const content = Array.isArray(node.content)
    ? node.content.map((child) => extractPlainText(child)).join(' ')
    : '';

  return content.replace(/\s+/g, ' ').trim();
}

function extractStandaloneLink(node) {
  if (node.type !== 'paragraph' || !Array.isArray(node.content) || !node.content.length) {
    return null;
  }

  let href = null;
  let label = '';

  for (const child of node.content) {
    if (child.type !== 'text') {
      return null;
    }

    const text = child.text ?? '';
    label += text;

    const mark = Array.isArray(child.marks) ? child.marks.find((entry) => entry.type === 'link') : null;
    if (!mark) {
      if (text.trim()) {
        return null;
      }
      continue;
    }

    const markHref = readTrimmed(mark.attrs?.href);
    if (!markHref) {
      continue;
    }

    if (href && href !== markHref) {
      return null;
    }

    href = markHref;
  }

  return href ? { href, label: label.trim() || href } : null;
}

function normalizeHeadingLevel(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(6, Math.trunc(parsed)));
}
