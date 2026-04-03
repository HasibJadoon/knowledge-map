import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CaptureDraft, CaptureDomain, CaptureStage } from '../models/planner.models';

interface CaptureDomainOption {
  id: CaptureDomain;
  label: string;
  icon: string;
  description: string;
  accent: string;
}

type CaptureComposeMode = 'write' | 'json';

@Component({
  selector: 'km-capture-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-modal.component.html',
  styleUrl: './capture-modal.component.scss',
})
export class PlannerCaptureModalComponent {
  @Input({ required: true }) draft!: CaptureDraft;
  @Input({ required: true }) domains: CaptureDomainOption[] = [];
  @Input() saving = false;
  @Output() draftChange = new EventEmitter<CaptureDraft>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  composeMode: CaptureComposeMode = 'write';
  jsonInput = '';
  jsonError: string | null = null;
  readonly toolbarItems = ['↶', '↷', 'Normal', '⌃', 'B', 'I', '↗', '1.', '•', '⌫'];

  readonly stageOptions: Array<{ id: CaptureStage; label: string }> = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ];

  update<K extends keyof CaptureDraft>(key: K, value: CaptureDraft[K]): void {
    this.draftChange.emit({
      ...this.draft,
      [key]: value,
    });
  }

  setComposeMode(mode: CaptureComposeMode): void {
    this.composeMode = mode;
    this.jsonError = null;
  }

  onJsonInputChange(value: string): void {
    this.jsonInput = value;
    this.jsonError = null;
  }

  applyJsonToDraft(): void {
    const nextDraft = this.ensureJsonDraft(false);
    if (!nextDraft) {
      return;
    }

    this.draftChange.emit(nextDraft);
    this.composeMode = 'write';
    this.jsonError = null;
  }

  handleSave(): void {
    const nextDraft = this.composeMode === 'json'
      ? this.ensureJsonDraft(true)
      : this.serializeDocumentDraft();
    if (!nextDraft) {
      return;
    }

    this.draftChange.emit(nextDraft);

    this.saveRequested.emit();
  }

  jsonPreview(): CaptureDraft | null {
    try {
      return this.parseJsonDraft(this.jsonInput);
    } catch {
      return null;
    }
  }

  private ensureJsonDraft(preserveRawJson: boolean): CaptureDraft | null {
    try {
      const parsed = this.parseJsonDraft(this.jsonInput, preserveRawJson);
      this.jsonError = null;
      return parsed;
    } catch (error) {
      this.jsonError = error instanceof Error ? error.message : 'JSON could not be parsed.';
      return null;
    }
  }

  private parseJsonDraft(raw: string, preserveRawJson = false): CaptureDraft {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error('Paste a JSON object first.');
    }

    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON must be an object.');
    }

    const payload =
      parsed['payload'] && typeof parsed['payload'] === 'object' && !Array.isArray(parsed['payload'])
        ? parsed['payload'] as Record<string, unknown>
        : parsed;

    const resourcesCandidate = payload['resources'] ?? payload['references'] ?? payload['links'];
    const resourcesText = Array.isArray(resourcesCandidate)
      ? resourcesCandidate
          .map((entry) => this.stringifyResourceEntry(entry))
          .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
          .join('\n')
      : typeof resourcesCandidate === 'string'
        ? resourcesCandidate
        : this.draft.resourcesText;

    const extractedDocumentBody = this.extractDocumentBody(payload);

    const extractedNote = this.pickString(
      payload['note'],
      payload['body_md'],
      payload['body'],
      payload['content'],
      payload['text'],
      payload['compact_context'],
      payload['summary'],
      extractedDocumentBody,
      this.draft.note,
    );

    const nextDraft: CaptureDraft = {
      domain: this.normalizeDomain(payload['domain']),
      stage: this.normalizeStage(payload['stage']),
      title: this.pickString(
        payload['title'],
        payload['name'],
        payload['label'],
        this.draft.title,
      ),
      note: preserveRawJson ? trimmed : extractedNote,
      quote: this.pickString(
        payload['quote'],
        payload['excerpt'],
        payload['excerpt_text'],
        payload['selected_text'],
        this.draft.quote,
      ),
      source: this.pickString(
        payload['source'],
        payload['url'],
        payload['href'],
        payload['source_title'],
        payload['creator'],
        this.draft.source,
      ),
      resourcesText,
    };

    if (
      !nextDraft.title.trim() &&
      !nextDraft.note.trim() &&
      !nextDraft.quote.trim() &&
      !nextDraft.resourcesText.trim()
    ) {
      throw new Error('JSON does not contain recognizable capture fields.');
    }

    return nextDraft;
  }

  private serializeDocumentDraft(): CaptureDraft {
    const note = this.draft.note.trim();
    const resources = this.draft.resourcesText
      .split('\n')
      .map((entry: string) => entry.replace(/^[-*•]\s*/, '').trim())
      .filter((entry: string) => entry.length > 0);
    const footnotes = this.draft.source.trim()
      ? [{ label: 'Source', value: this.draft.source.trim(), href: this.extractUrl(this.draft.source.trim()) }]
      : [];

    const payload = {
      title: this.draft.title.trim() || 'Untitled capture',
      domain: this.draft.domain,
      stage: this.draft.stage,
      sections: note
        ? [{
            id: 'document',
            label: 'Document',
            title: 'Document',
            body: note,
          }]
        : [],
      quote: this.draft.quote.trim() || undefined,
      footnotes: footnotes.length > 0 ? footnotes : undefined,
      resources: resources.length > 0 ? resources : undefined,
    };

    return {
      ...this.draft,
      note: JSON.stringify(payload, null, 2),
    };
  }

  private extractDocumentBody(payload: Record<string, unknown>): string {
    const sections = payload['sections'];
    if (Array.isArray(sections) && sections.length > 0) {
      const text = sections
        .map((section) => {
          if (typeof section === 'string') {
            return section.trim();
          }

          if (!section || typeof section !== 'object' || Array.isArray(section)) {
            return '';
          }

          const record = section as Record<string, unknown>;
          return this.pickString(
            record['body'],
            record['content'],
            record['text'],
            record['summary'],
            record['body_md'],
          );
        })
        .filter((entry) => entry.length > 0)
        .join('\n\n');

      if (text) {
        return text;
      }
    }

    return '';
  }

  private stringifyResourceEntry(entry: unknown): string {
    if (typeof entry === 'string') {
      return entry;
    }

    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      return this.pickString(record['label'], record['title'], record['name'], record['url'], record['href']);
    }

    return '';
  }

  private pickString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return '';
  }

  private normalizeDomain(value: unknown): CaptureDomain {
    const candidate = typeof value === 'string' ? value.trim() : '';
    const ids = new Set(this.domains.map((domain) => domain.id));
    return ids.has(candidate as CaptureDomain) ? (candidate as CaptureDomain) : this.draft.domain;
  }

  private normalizeStage(value: unknown): CaptureStage {
    const candidate = typeof value === 'string' ? value.trim() : '';
    return candidate === 'review' || candidate === 'done' || candidate === 'inbox'
      ? candidate
      : this.draft.stage;
  }

  private extractUrl(value: string): string | null {
    const match = value.match(/https?:\/\/[^\s)]+/i);
    return match ? match[0] : null;
  }
}
