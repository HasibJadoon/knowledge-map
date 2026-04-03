import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { CaptureDomain, CaptureItem, PlannerSection } from './planner-workspace.models';

interface CaptureDocumentSection {
  id: string;
  label: string;
  title: string;
  body: string;
}

interface CaptureFootnote {
  id: string;
  label: string;
  value: string;
  href: string | null;
}

@Component({
  selector: 'km-planner-capture-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-capture-workspace.component.html',
  styleUrl: './planner-capture-workspace.component.scss',
})
export class PlannerCaptureWorkspaceComponent {
  @Input({ required: true }) items: CaptureItem[] = [];
  @Input() selectedItem: CaptureItem | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  @Output() selectedItemChange = new EventEmitter<string>();
  @Output() createRequested = new EventEmitter<void>();

  readonly domainLabels: Record<CaptureDomain, string> = {
    arabic_media: 'Arabic Media',
    arabic_linguistics: 'Arabic Linguistics',
    quranic_concepts: 'Quranic Concepts',
    worldview: 'Worldview',
    english_expression: 'English Expression',
  };

  summary(item: CaptureItem | null): string {
    if (!item) {
      return 'Select a stored capture to inspect the raw intake before it moves into planning.';
    }

    return item.payload.plan_state?.summary
      || item.compact_context
      || item.note
      || item.quote
      || 'No summary yet.';
  }

  documentSections(item: CaptureItem | null): CaptureDocumentSection[] {
    if (!item) {
      return [];
    }

    if (item.payload.plan_state?.sections?.length) {
      return item.payload.plan_state.sections.map((section) => ({
        id: section.id,
        label: section.title,
        title: section.title,
        body: section.body,
      }));
    }

    const payload = this.documentJsonPayload(item);
    if (!payload) {
      return [];
    }

    const sectionArray = this.pickSectionArray(payload);
    if (sectionArray.length > 0) {
      return sectionArray
        .map((entry, index) => this.normalizeJsonSection(entry, index))
        .filter((section): section is CaptureDocumentSection => section !== null);
    }

    return Object.entries(payload)
      .filter(([key]) => !this.isFootnoteKey(key) && !this.isMetaKey(key))
      .map(([key, value], index) => {
        const body = this.stringifyJsonValue(value);
        if (!body) {
          return null;
        }

        const label = this.humanizeKey(key);
        return {
          id: `json-section-${index}`,
          label,
          title: label,
          body,
        } satisfies CaptureDocumentSection;
      })
      .filter((section): section is CaptureDocumentSection => section !== null);
  }

  sectionParagraphs(section: CaptureDocumentSection): string[] {
    return section.body
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }

  documentFootnotes(item: CaptureItem | null): CaptureFootnote[] {
    if (!item) {
      return [];
    }

    const notes: CaptureFootnote[] = [];
    const seen = new Set<string>();

    const pushNote = (label: string, value: string, href: string | null = null): void => {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return;
      }

      const key = `${label}:${href ?? normalizedValue}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      notes.push({
        id: `footnote-${notes.length + 1}`,
        label,
        value: normalizedValue,
        href,
      });
    };

    if (item.source.trim()) {
      const href = this.extractUrl(item.source);
      pushNote('Source', item.source, href);
    }

    item.resources.forEach((resource) => {
      const href = this.extractUrl(resource);
      pushNote(href ? 'Link' : 'Reference', resource, href);
    });

    const payload = this.documentJsonPayload(item);
    if (payload) {
      Object.entries(payload).forEach(([key, value]) => {
        if (!this.isFootnoteKey(key)) {
          return;
        }

        this.normalizeFootnoteValue(this.humanizeKey(key), value).forEach((note) => {
          pushNote(note.label, note.value, note.href);
        });
      });
    }

    return notes;
  }

  documentBody(item: CaptureItem | null): string {
    if (!item) {
      return '';
    }

    return item.note.trim() || item.compact_context.trim() || '';
  }

  documentParagraphs(item: CaptureItem | null): string[] {
    const body = this.documentBody(item);
    if (!body || this.documentSections(item).length > 0 || this.documentBodyLooksLikeJson(item)) {
      return [];
    }

    return body
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }

  documentBodyLooksLikeJson(item: CaptureItem | null): boolean {
    const body = this.documentBody(item).trim();
    if (!body || !/^[\[{]/.test(body)) {
      return false;
    }

    try {
      JSON.parse(body);
      return true;
    } catch {
      return false;
    }
  }

  shouldShowQuote(item: CaptureItem | null): boolean {
    if (!item) {
      return false;
    }

    const quote = item.quote.trim();
    return quote.length > 0 && quote !== this.documentBody(item);
  }

  detailTitle(item: CaptureItem | null): string {
    return item?.title?.trim() || 'Untitled capture';
  }

  domainLabel(domain: CaptureDomain): string {
    return this.domainLabels[domain] ?? 'Capture';
  }

  formatTime(value: string): string {
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }

  formatLongDate(value: string): string {
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }

  stageLabel(stage: CaptureItem['stage']): string {
    switch (stage) {
      case 'review':
        return 'Review';
      case 'done':
        return 'Done';
      case 'inbox':
      default:
        return 'Inbox';
    }
  }

  private documentJsonPayload(item: CaptureItem): Record<string, unknown> | null {
    const body = this.documentBody(item).trim();
    if (!body || !this.documentBodyLooksLikeJson(item)) {
      return null;
    }

    try {
      const parsed = JSON.parse(body) as unknown;
      if (Array.isArray(parsed)) {
        return { sections: parsed };
      }

      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  private pickSectionArray(payload: Record<string, unknown>): unknown[] {
    const candidates = [
      payload['sections'],
      payload['document_sections'],
      payload['content_sections'],
      payload['blocks'],
      payload['items'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate;
      }
    }

    return [];
  }

  private normalizeJsonSection(entry: unknown, index: number): CaptureDocumentSection | null {
    if (typeof entry === 'string' && entry.trim()) {
      return {
        id: `section-${index + 1}`,
        label: `Section ${index + 1}`,
        title: `Section ${index + 1}`,
        body: entry,
      };
    }

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const label = this.pickString(record['label'], record['title'], record['heading'], record['name'])
      || `Section ${index + 1}`;
    const body =
      this.pickString(
        record['body'],
        record['content'],
        record['text'],
        record['summary'],
        record['body_md'],
        record['markdown'],
      )
      || this.stringifyJsonValue(record['paragraphs'] ?? record['bullets'] ?? record['items'])
      || this.stringifyRemainingJson(record, ['label', 'title', 'heading', 'name']);

    if (!body) {
      return null;
    }

    return {
      id: this.pickString(record['id']) || `section-${index + 1}`,
      label,
      title: label,
      body,
    };
  }

  private normalizeFootnoteValue(label: string, value: unknown): CaptureFootnote[] {
    if (typeof value === 'string') {
      return [{
        id: '',
        label,
        value,
        href: this.extractUrl(value),
      }];
    }

    if (Array.isArray(value)) {
      return value.flatMap((entry) => this.normalizeFootnoteValue(label, entry));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const href = this.pickString(record['href'], record['url'], record['link']);
      const text = this.pickString(record['label'], record['title'], record['name'], record['value'], href);
      if (text) {
        return [{
          id: '',
          label,
          value: text,
          href: href || this.extractUrl(text),
        }];
      }
    }

    return [];
  }

  private stringifyJsonValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const lines = value
        .map((entry) => this.stringifyJsonValue(entry))
        .filter((entry) => entry.length > 0);
      return lines.join('\n\n');
    }

    if (value && typeof value === 'object') {
      const objectLines = Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => {
          const rendered = this.stringifyJsonValue(entry);
          return rendered ? `${this.humanizeKey(key)}\n${rendered}` : '';
        })
        .filter((entry) => entry.length > 0);
      return objectLines.join('\n\n');
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private stringifyRemainingJson(record: Record<string, unknown>, consumedKeys: string[]): string {
    return Object.entries(record)
      .filter(([key]) => !consumedKeys.includes(key))
      .map(([key, value]) => {
        const body = this.stringifyJsonValue(value);
        return body ? `${this.humanizeKey(key)}\n${body}` : '';
      })
      .filter((entry) => entry.length > 0)
      .join('\n\n');
  }

  private isFootnoteKey(key: string): boolean {
    return ['footnotes', 'references', 'resources', 'links', 'citations'].includes(key);
  }

  private isMetaKey(key: string): boolean {
    return ['title', 'heading', 'summary', 'quote', 'source', 'domain', 'stage', 'status'].includes(key);
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private pickString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return '';
  }

  private extractUrl(value: string): string | null {
    const match = value.match(/https?:\/\/[^\s)]+/i);
    return match ? match[0] : null;
  }
}
