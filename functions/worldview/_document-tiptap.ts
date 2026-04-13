import { asRecord, readTrimmed } from '../_utils/sprint';

export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

export type TiptapDoc = {
  type: 'doc';
  content: TiptapNode[];
};

export type LegacyReadingBlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'quote'
  | 'link'
  | 'separator'
  | 'callout'
  | 'image'
  | 'audio';

export type LegacyReadingBlock = {
  type?: string;
  text?: string;
  cite?: string;
  label?: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  caption?: string;
  tone?: string;
  [key: string]: unknown;
};

type BuildDocumentInput = {
  title: string;
  readingBody?: string[] | null;
  readingBlocks?: Record<string, unknown>[] | null;
};

const LINK_MARK_REL = 'noopener noreferrer';

export function buildWorldviewStudyNoteDocument(input: BuildDocumentInput): TiptapDoc {
  const legacyBlocks = normalizeLegacyReadingBlocks(input.readingBlocks);
  const content = legacyBlocks.length
    ? legacyBlocks.flatMap((block) => legacyBlockToNodes(block))
    : buildNodesFromReadingBody(input.readingBody ?? []);

  return {
    type: 'doc',
    content: content.length ? content : [emptyParagraph()],
  };
}

export function createEmptyWorldviewStudyNoteDocument(): TiptapDoc {
  return {
    type: 'doc',
    content: [emptyParagraph()],
  };
}

export function parseTiptapDocument(value: unknown): TiptapDoc | null {
  const row = asRecord(value);
  if (row?.['type'] !== 'doc') {
    return null;
  }

  const content = Array.isArray(row['content'])
    ? row['content'].filter((entry): entry is TiptapNode => !!entry && typeof entry === 'object' && !Array.isArray(entry))
    : [];

  return {
    type: 'doc',
    content,
  };
}

export function hasMeaningfulTiptapDocument(value: unknown): boolean {
  const document = parseTiptapDocument(value);
  if (!document) {
    return false;
  }

  return document.content.some((node) => {
    if (node.type === 'horizontalRule') {
      return true;
    }

    if (node.type === 'image' || node.type === 'audio') {
      return true;
    }

    return extractPlainTextFromNode(node).trim().length > 0;
  });
}

export function extractPlainTextFromTiptap(value: unknown): string {
  const document = parseTiptapDocument(value);
  if (!document) {
    return '';
  }

  return document.content
    .map((node) => extractPlainTextFromNode(node))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function estimateReadingMinutesFromTiptap(value: unknown, wordsPerMinute = 180): number {
  const text = extractPlainTextFromTiptap(value);
  if (!text) {
    return 0;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (!wordCount) {
    return 0;
  }

  return Math.max(1, Math.round(wordCount / Math.max(1, wordsPerMinute)));
}

export function buildChapterDocumentTitle(unitTitle: string): string {
  const title = readTrimmed(unitTitle) ?? 'Untitled Chapter';
  const stripped = title
    .replace(/^\s*chapter\s+[0-9ivxlcdm]+\s*[:\-–—]\s*/i, '')
    .replace(/^\s*chapter\s+[0-9ivxlcdm]+\s+/i, '')
    .trim();
  const base = stripped || title;
  return /\bnotes?\b$/i.test(base) ? base : `${base} - Notes`;
}

function normalizeLegacyReadingBlocks(value: Record<string, unknown>[] | null | undefined): LegacyReadingBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      type: normalizeLegacyBlockType(entry['type']),
      text: readTrimmed(entry['text']) ?? undefined,
      cite: readTrimmed(entry['cite']) ?? undefined,
      label: readTrimmed(entry['label']) ?? undefined,
      href: normalizeUrl(entry['href']),
      src: normalizeUrl(entry['src'] ?? entry['url'] ?? entry['audioUrl'] ?? entry['audio_url']),
      alt: readTrimmed(entry['alt']) ?? undefined,
      title: readTrimmed(entry['title']) ?? undefined,
      caption: readTrimmed(entry['caption']) ?? undefined,
      tone: readTrimmed(entry['tone']) ?? undefined,
    }))
    .filter((entry) => !!entry.type);
}

function buildNodesFromReadingBody(readingBody: string[]): TiptapNode[] {
  if (!Array.isArray(readingBody)) {
    return [];
  }

  return readingBody
    .map((entry) => readTrimmed(entry))
    .filter((entry): entry is string => entry != null)
    .flatMap((entry) => {
      if (/^[-*_]{3,}$/.test(entry)) {
        return [{ type: 'horizontalRule' } satisfies TiptapNode];
      }

      if (/^>\s+/.test(entry)) {
        return [{
          type: 'blockquote',
          content: [paragraphNode(entry.replace(/^>\s+/, ''))],
        } satisfies TiptapNode];
      }

      if (/^#{1,6}\s+/.test(entry)) {
        const level = Math.min(6, Math.max(1, entry.match(/^#+/)?.[0]?.length ?? 1));
        return [{
          type: 'heading',
          attrs: { level },
          content: textContent(entry.replace(/^#{1,6}\s+/, '')),
        } satisfies TiptapNode];
      }

      const url = normalizeUrl(entry);
      if (url) {
        return [linkParagraphNode(url, url)];
      }

      return [paragraphNode(entry)];
    });
}

function legacyBlockToNodes(block: LegacyReadingBlock): TiptapNode[] {
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

function emptyParagraph(): TiptapNode {
  return { type: 'paragraph' };
}

function headingNode(text: string, level: number): TiptapNode {
  const normalized = readTrimmed(text);
  return {
    type: 'heading',
    attrs: { level: Math.min(6, Math.max(1, level)) },
    content: normalized ? textContent(normalized) : undefined,
  };
}

function paragraphNode(text: string): TiptapNode {
  const normalized = readTrimmed(text);
  return {
    type: 'paragraph',
    content: normalized ? textContent(normalized) : undefined,
  };
}

function linkParagraphNode(label: string, href: string | null | undefined): TiptapNode {
  const text = readTrimmed(label) ?? readTrimmed(href) ?? '';
  const url = normalizeUrl(href);
  return {
    type: 'paragraph',
    content: text
      ? [{
          type: 'text',
          text,
          marks: url ? [{
            type: 'link',
            attrs: {
              href: url,
              target: '_blank',
              rel: LINK_MARK_REL,
            },
          }] : undefined,
        }]
      : undefined,
    attrs: url ? { href: url } : undefined,
  };
}

function textContent(text: string): TiptapNode[] {
  const normalized = readTrimmed(text);
  return normalized ? [{ type: 'text', text: normalized }] : [];
}

function extractPlainTextFromNode(node: TiptapNode): string {
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  const content = Array.isArray(node.content)
    ? node.content.map((child) => extractPlainTextFromNode(child)).join(' ')
    : '';

  return content.replace(/\s+/g, ' ').trim();
}

function normalizeLegacyBlockType(value: unknown): LegacyReadingBlockType | null {
  switch ((typeof value === 'string' ? value : '').trim().toLowerCase()) {
    case 'heading':
      return 'heading';
    case 'subheading':
      return 'subheading';
    case 'paragraph':
      return 'paragraph';
    case 'quote':
      return 'quote';
    case 'link':
      return 'link';
    case 'separator':
    case 'divider':
      return 'separator';
    case 'callout':
      return 'callout';
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    default:
      return null;
  }
}

function normalizeUrl(value: unknown): string | null {
  const trimmed = readTrimmed(value);
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function compactRecord(value: Record<string, unknown>): Record<string, unknown> | null {
  const entries = Object.entries(value).filter(([, entry]) => entry != null && entry !== '');
  if (!entries.length) {
    return null;
  }

  return Object.fromEntries(entries);
}
