import { asRecord, readInteger, readOptionalString, readTrimmed } from '../_utils/sprint';
import { parseTiptapDocument, TiptapDoc, TiptapMark, TiptapNode } from './_document-tiptap';

export type DerivedDocumentBlockType =
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'bullet_item'
  | 'numbered_item'
  | 'callout'
  | 'image'
  | 'divider';

export type DerivedDocumentBlockKind =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'quote'
  | 'link'
  | 'separator'
  | 'callout'
  | 'image'
  | 'audio'
  | 'list_item';

export type DerivedDocumentBlock = {
  parentBlockId: string | null;
  orderIndex: number;
  blockType: DerivedDocumentBlockType;
  blockLevel: number | null;
  textPlain: string | null;
  contentJson: Record<string, unknown> | null;
  attrsJson: Record<string, unknown>;
  blockKind: DerivedDocumentBlockKind | null;
  renderer: string | null;
};

export type ReaderBlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'quote'
  | 'link'
  | 'separator'
  | 'callout'
  | 'image'
  | 'audio';

export type ReaderBlock = {
  type: ReaderBlockType;
  text?: string;
  cite?: string;
  label?: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
};

type StoredBlockInput = {
  block_type?: unknown;
  block_level?: unknown;
  text_plain?: unknown;
  content_json?: unknown;
  attrs_json?: unknown;
  block_kind?: unknown;
  renderer?: unknown;
};

export function deriveWorldviewDocumentBlocksFromTiptap(value: unknown): DerivedDocumentBlock[] {
  const document = parseTiptapDocument(value);
  if (!document) {
    return [];
  }

  return flattenDocument(document);
}

export function mapStoredDocumentBlockToReaderBlock(value: StoredBlockInput): ReaderBlock | null {
  const blockType = normalizeBlockType(value.block_type);
  if (!blockType) {
    return null;
  }

  const blockLevel = readInteger(value.block_level);
  const textPlain = readTrimmed(value.text_plain) ?? '';
  const contentJson = asRecord(value.content_json);
  const attrsJson = asRecord(value.attrs_json) ?? {};
  const blockKind = normalizeBlockKind(value.block_kind);
  const link = resolveLink(contentJson, attrsJson);
  const media = resolveMediaAttrs(contentJson, attrsJson);
  const cite = readOptionalString(attrsJson['cite']) ?? readOptionalString(contentJson?.['cite']);

  if (blockKind === 'audio' || normalizeRenderer(value.renderer) === 'audio') {
    const src = media.src ?? link.href;
    if (!src) {
      return null;
    }

    return compactReaderBlock({
      type: 'audio',
      text: textPlain || media.title || src,
      label: media.title ?? textPlain,
      href: src,
      title: media.title,
    });
  }

  if (blockType === 'heading') {
    return compactReaderBlock({
      type: (blockLevel ?? 1) > 1 ? 'subheading' : 'heading',
      text: textPlain,
    });
  }

  if (blockType === 'quote') {
    return compactReaderBlock({
      type: 'quote',
      text: textPlain,
      cite: cite ?? undefined,
      href: link.href,
      label: link.label,
    });
  }

  if (blockType === 'callout' || blockKind === 'callout') {
    return compactReaderBlock({
      type: 'callout',
      text: textPlain,
      cite: cite ?? undefined,
      href: link.href,
      label: link.label,
    });
  }

  if (blockType === 'image' || blockKind === 'image') {
    if (!media.src) {
      return null;
    }

    return compactReaderBlock({
      type: 'image',
      text: textPlain || media.title || media.src,
      src: media.src,
      alt: media.alt,
      title: media.title,
      href: media.src,
    });
  }

  if (blockType === 'divider' || blockKind === 'separator') {
    return { type: 'separator' };
  }

  if (blockKind === 'link' && link.href) {
    return compactReaderBlock({
      type: 'link',
      text: textPlain || link.label || link.href,
      href: link.href,
      label: link.label ?? textPlain,
    });
  }

  return compactReaderBlock({
    type: 'paragraph',
    text: textPlain,
  });
}

export function mapStoredDocumentBlocksToReaderBlocks(values: unknown[]): ReaderBlock[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => mapStoredDocumentBlockToReaderBlock(entry))
    .filter((entry): entry is ReaderBlock => entry !== null);
}

function flattenDocument(document: TiptapDoc): DerivedDocumentBlock[] {
  const blocks: DerivedDocumentBlock[] = [];
  let orderIndex = 1;

  for (const node of document.content) {
    const nextBlocks = flattenNode(node, orderIndex);
    blocks.push(...nextBlocks);
    orderIndex += nextBlocks.length;
  }

  return blocks.map((block, index) => ({
    ...block,
    orderIndex: index + 1,
  }));
}

function flattenNode(node: TiptapNode, orderIndex: number): DerivedDocumentBlock[] {
  switch (node.type) {
    case 'heading':
      return [createBlock(node, {
        orderIndex,
        blockType: 'heading',
        blockLevel: normalizeHeadingLevel(node.attrs?.['level']),
        textPlain: extractPlainText(node),
        blockKind: normalizeHeadingLevel(node.attrs?.['level']) > 1 ? 'subheading' : 'heading',
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
        textPlain: readTrimmed(node.attrs?.['title']) ?? readTrimmed(node.attrs?.['alt']) ?? readTrimmed(node.attrs?.['src']),
        blockKind: 'image',
        renderer: 'image',
      })];
    case 'audio':
      return [createBlock(node, {
        orderIndex,
        blockType: 'paragraph',
        blockLevel: null,
        textPlain: readTrimmed(node.attrs?.['title']) ?? readTrimmed(node.attrs?.['src']),
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

function flattenList(
  node: TiptapNode,
  blockType: 'bullet_item' | 'numbered_item',
  orderIndex: number,
): DerivedDocumentBlock[] {
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
    .filter((entry): entry is DerivedDocumentBlock => entry !== null);
}

function createBlock(
  node: TiptapNode,
  input: {
    orderIndex: number;
    blockType: DerivedDocumentBlockType;
    blockLevel: number | null;
    textPlain: string | null;
    blockKind: DerivedDocumentBlockKind | null;
    renderer: string | null;
  },
): DerivedDocumentBlock {
  return {
    parentBlockId: null,
    orderIndex: input.orderIndex,
    blockType: input.blockType,
    blockLevel: input.blockLevel,
    textPlain: input.textPlain,
    contentJson: asRecord(node),
    attrsJson: asRecord(node.attrs) ?? {},
    blockKind: input.blockKind,
    renderer: input.renderer,
  };
}

function extractPlainText(node: TiptapNode): string {
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  const content = Array.isArray(node.content)
    ? node.content.map((child) => extractPlainText(child)).join(' ')
    : '';

  return content.replace(/\s+/g, ' ').trim();
}

function extractStandaloneLink(node: TiptapNode): { href: string; label: string } | null {
  if (node.type !== 'paragraph' || !Array.isArray(node.content) || !node.content.length) {
    return null;
  }

  let href: string | null = null;
  let label = '';

  for (const child of node.content) {
    if (child.type !== 'text') {
      return null;
    }

    const text = child.text ?? '';
    label += text;

    const mark = findLinkMark(child.marks);
    if (!mark) {
      if (text.trim()) {
        return null;
      }
      continue;
    }

    const markHref = readTrimmed(mark.attrs?.['href']);
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

function findLinkMark(marks: TiptapMark[] | undefined): TiptapMark | null {
  if (!Array.isArray(marks)) {
    return null;
  }

  return marks.find((mark) => mark.type === 'link') ?? null;
}

function resolveLink(
  contentJson: Record<string, unknown> | null | undefined,
  attrsJson: Record<string, unknown> | null | undefined,
): { href: string | null; label: string | null } {
  const hrefFromAttrs = readTrimmed(attrsJson?.['href']);
  const labelFromAttrs = readTrimmed(attrsJson?.['label']) ?? readTrimmed(attrsJson?.['title']);
  if (hrefFromAttrs) {
    return {
      href: hrefFromAttrs,
      label: labelFromAttrs,
    };
  }

  const link = contentJson ? extractStandaloneLink(contentJson as TiptapNode) : null;
  if (!link) {
    return { href: null, label: null };
  }

  return link;
}

function resolveMediaAttrs(
  contentJson: Record<string, unknown> | null | undefined,
  attrsJson: Record<string, unknown> | null | undefined,
): { src: string | null; alt: string | null; title: string | null } {
  const source = readTrimmed(attrsJson?.['src'])
    ?? readTrimmed(contentJson?.['src'])
    ?? readTrimmed(attrsJson?.['href'])
    ?? readTrimmed(contentJson?.['href']);
  const alt = readTrimmed(attrsJson?.['alt']) ?? readTrimmed(contentJson?.['alt']);
  const title = readTrimmed(attrsJson?.['title'])
    ?? readTrimmed(contentJson?.['title'])
    ?? readTrimmed(attrsJson?.['label'])
    ?? readTrimmed(contentJson?.['label']);

  return {
    src: source,
    alt,
    title,
  };
}

function compactReaderBlock(block: ReaderBlock): ReaderBlock | null {
  if (block.type === 'separator') {
    return block;
  }

  const hasPayload = [block.text, block.href, block.src].some((entry) => !!readTrimmed(entry));
  if (!hasPayload) {
    return null;
  }

  return {
    ...block,
    text: readTrimmed(block.text) ?? undefined,
    cite: readTrimmed(block.cite) ?? undefined,
    label: readTrimmed(block.label) ?? undefined,
    href: readTrimmed(block.href) ?? undefined,
    src: readTrimmed(block.src) ?? undefined,
    alt: readTrimmed(block.alt) ?? undefined,
    title: readTrimmed(block.title) ?? undefined,
  };
}

function normalizeHeadingLevel(value: unknown): number {
  return Math.max(1, Math.min(6, readInteger(value) ?? 1));
}

function normalizeBlockType(value: unknown): DerivedDocumentBlockType | null {
  const normalized = typeof value === 'string' ? value : '';
  switch (normalized) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'bullet_item':
    case 'numbered_item':
    case 'callout':
    case 'image':
    case 'divider':
      return normalized;
    default:
      return null;
  }
}

function normalizeBlockKind(value: unknown): DerivedDocumentBlockKind | null {
  const normalized = typeof value === 'string' ? value : '';
  switch (normalized) {
    case 'heading':
    case 'subheading':
    case 'paragraph':
    case 'quote':
    case 'link':
    case 'separator':
    case 'callout':
    case 'image':
    case 'audio':
    case 'list_item':
      return normalized;
    default:
      return null;
  }
}

function normalizeRenderer(value: unknown): string | null {
  return readTrimmed(value);
}
