// ─── Tiptap ⇆ cm_blocks mapper ────────────────────────────────────────────────
// The CM backend stores a document as flat `cm_blocks` rows (block_id,
// parent_block_id, seq_order, depth, ...). The editor works in Tiptap JSON.
// This module is the single, pure, lossless bridge between the two.
//
//   tiptapToBlocks() — decompose a Tiptap doc into block rows for save.
//   blocksToTiptap() — recompose block rows back into a Tiptap doc for load.
//
// Round-trip fidelity: blocksToTiptap(tiptapToBlocks(doc)) is equivalent to doc.
//
// Each block-level Tiptap node becomes one row. A node is one of three kinds:
//   text      — has inline content (paragraph, heading, codeBlock). The inline
//               content array is stored verbatim in annotations_json; a plain
//               text projection goes to content_text so FTS / LIKE search works.
//   container — has block children (lists, list items, blockquote, callout).
//               Children become child rows linked by parent_block_id.
//   atom      — leaf node carrying only attrs (horizontalRule, image, page_link,
//               ayah_embed and the Arabic / worldview custom blocks).

import type { KmBlock, TiptapDoc, TiptapNode } from '../../../shared/models/document-editor.models';

/** A block row ready to send to the CM API as part of a `blocks[]` payload. */
export interface BlockPayload {
  block_id: string;
  parent_block_id: string | null;
  block_type: string;
  seq_order: number;
  depth: number;
  content_text: string | null;
  attrs_json: Record<string, unknown>;
  annotations_json: TiptapNode[];
}

type BlockKind = 'text' | 'container' | 'atom';

const TEXT_NODES = new Set(['paragraph', 'heading', 'codeBlock']);
const CONTAINER_NODES = new Set([
  'blockquote', 'callout', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem',
]);

/**
 * Classify a Tiptap node. Known block/container nodes are matched directly;
 * any unknown node is inferred from the shape of its content so the mapper
 * stays lossless even if the editor gains new node types.
 */
function classify(node: TiptapNode): BlockKind {
  if (TEXT_NODES.has(node.type)) return 'text';
  if (CONTAINER_NODES.has(node.type)) return 'container';
  const content = node.content;
  if (content && content.length > 0) {
    const first = content[0];
    const inlineLike = first.type === 'text' || first.type === 'hardBreak' || first.marks !== undefined;
    return inlineLike ? 'text' : 'container';
  }
  return 'atom';
}

/** Flatten an inline content array into plain text (for content_text / FTS). */
function inlineText(nodes: readonly TiptapNode[]): string {
  let text = '';
  for (const node of nodes) {
    if (node.type === 'text') text += node.text ?? '';
    else if (node.type === 'hardBreak') text += '\n';
    else if (node.content) text += inlineText(node.content);
  }
  return text;
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * Searchable text for an atom block, so embeds and custom blocks remain
 * findable by the CM document `q` search (which LIKE-matches content_text).
 */
function atomSearchText(node: TiptapNode): string {
  const a = node.attrs ?? {};
  switch (node.type) {
    case 'ayah_embed':          return [str(a['text_uthmani']), str(a['translation'])].join(' ').trim();
    case 'passage_embed':       return a['surah'] != null
      ? `Surah ${str(a['surah'])}:${str(a['ayah_from'])}-${str(a['ayah_to'])}` : '';
    case 'page_link':           return str(a['title']);
    case 'vocab_block':         return [str(a['word']), str(a['root'])].join(' ').trim();
    case 'morphology_block':    return str(a['word']);
    case 'nahw_block':          return str(a['sentence']);
    case 'root_analysis_block': return str(a['root']);
    case 'claim_block':         return str(a['claim']);
    case 'evidence_block':      return str(a['quote']);
    case 'reflection_block':    return str(a['content']);
    case 'task_block':          return str(a['title']);
    case 'scene_block':         return [str(a['title']), str(a['notes'])].join(' ').trim();
    case 'timeline_block':      return [str(a['label']), str(a['note'])].join(' ').trim();
    case 'comprehension_block': return [str(a['question']), str(a['answer'])].join(' ').trim();
    case 'children_block':      return str(a['content']);
    case 'image':               return str(a['alt']);
    default:                    return '';
  }
}

function newBlockId(): string {
  return `CM:${crypto.randomUUID()}`;
}

/**
 * Decompose a Tiptap document into a flat list of block rows in document order
 * (pre-order: every parent precedes its children).
 */
export function tiptapToBlocks(doc: TiptapDoc | null | undefined): BlockPayload[] {
  const out: BlockPayload[] = [];

  const walk = (node: TiptapNode, parentId: string | null, depth: number, seq: number): void => {
    const blockId = newBlockId();
    const kind = classify(node);
    const block: BlockPayload = {
      block_id: blockId,
      parent_block_id: parentId,
      block_type: node.type,
      seq_order: seq,
      depth,
      content_text: null,
      attrs_json: node.attrs ?? {},
      annotations_json: [],
    };

    if (kind === 'text') {
      const inline = node.content ?? [];
      block.annotations_json = inline;
      block.content_text = inlineText(inline);
    } else if (kind === 'atom') {
      block.content_text = atomSearchText(node) || null;
    }

    out.push(block);

    if (kind === 'container') {
      const children = node.content ?? [];
      children.forEach((child, index) => walk(child, blockId, depth + 1, index));
    }
  };

  const roots = doc?.content ?? [];
  roots.forEach((node, index) => walk(node, null, 0, index));
  return out;
}

function parseObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseArray(raw: string | null | undefined): TiptapNode[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as TiptapNode[]) : [];
  } catch {
    return [];
  }
}

/**
 * Recompose flat block rows into a Tiptap document. A block with child rows is
 * rebuilt as a container; otherwise its stored inline content is restored.
 */
export function blocksToTiptap(blocks: readonly KmBlock[]): TiptapDoc {
  const childrenOf = new Map<string | null, KmBlock[]>();
  for (const block of blocks) {
    const key = block.parent_block_id ?? null;
    const bucket = childrenOf.get(key);
    if (bucket) bucket.push(block);
    else childrenOf.set(key, [block]);
  }
  for (const bucket of childrenOf.values()) {
    bucket.sort((a, b) => a.seq_order - b.seq_order);
  }

  const build = (block: KmBlock): TiptapNode => {
    const node: TiptapNode = { type: block.block_type };

    const attrs = parseObject(block.attrs_json);
    if (Object.keys(attrs).length > 0) node.attrs = attrs;

    const children = childrenOf.get(block.block_id);
    if (children && children.length > 0) {
      node.content = children.map(build);
    } else {
      const inline = parseArray(block.annotations_json);
      if (inline.length > 0) node.content = inline;
    }
    return node;
  };

  const roots = childrenOf.get(null) ?? [];
  return { type: 'doc', content: roots.map(build) };
}
