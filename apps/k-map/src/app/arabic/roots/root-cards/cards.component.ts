import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type Card = {
  front?: string;
  back?: string;
  tag?: string;
};

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss'],
})
export class CardsComponent implements OnChanges {
  @Input() id?: number; // REQUIRED for save
  @Input() root = '';
  @Input() family = '';

  @Input() cards: Card[] = [];
  @Input() cardsJson = '[]';

  @Input() error = '';
  @Input() saving = false;

  @Output() close = new EventEmitter<void>();
  @Output() saveJson = new EventEmitter<{ id: number; cardsJson: string }>();

  tab: 'preview' | 'json' = 'preview';
  jsonMode: 'view' | 'edit' = 'view';

  jsonParseError = '';
  private lastPretty = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    // When parent opens modal / switches to another root, we get new cardsJson.
    if (changes['cardsJson'] && typeof this.cardsJson === 'string') {
      this.prettyPrintIfValid(this.cardsJson, true);
    }
  }

  /** Preview uses JSON if valid, otherwise falls back to @Input cards */
  get previewCards(): Card[] {
    const parsed = this.parseCardsNoSideEffects(this.cardsJson);
    return parsed ?? (this.cards ?? []);
  }

  /** Called on textarea blur to format + validate */
  onJsonBlur() {
    this.prettyPrintIfValid(this.cardsJson, true);
  }

  resetJson() {
    const json = JSON.stringify(this.cards ?? [], null, 2);
    this.cardsJson = json;
    this.lastPretty = json;
    this.jsonParseError = '';
  }

  setJsonMode(mode: 'view' | 'edit') {
    this.jsonMode = mode;
  }

  get coloredJson(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.toColoredJson(this.cardsJson));
  }

  onSaveClicked() {
    const id = Number(this.id);

    if (!Number.isFinite(id) || id <= 0) {
      this.jsonParseError =
        'Missing/invalid id. Fix: ensure /lexicon_roots returns "id" and pass [id]="selectedRoot?.id".';
      this.tab = 'json';
      return;
    }

    // Validate + normalize JSON before emitting
    const normalized = this.tryParseCards(this.cardsJson);
    if (!normalized) {
      this.tab = 'json';
      return;
    }

    const pretty = JSON.stringify(normalized, null, 2);
    this.cardsJson = pretty;
    this.lastPretty = pretty;

    this.saveJson.emit({ id, cardsJson: pretty });
  }

  // ---------------- helpers ----------------

  private prettyPrintIfValid(jsonStr: string, force = false) {
    const trimmed = (jsonStr ?? '').trim();

    if (!trimmed) {
      this.jsonParseError = '';
      return;
    }

    if (!force && trimmed === this.lastPretty) return;

    const normalized = this.tryParseCards(trimmed);
    if (!normalized) return;

    const pretty = JSON.stringify(normalized, null, 2);
    this.cardsJson = pretty;
    this.lastPretty = pretty;
    this.jsonParseError = '';
  }

  private toColoredJson(jsonStr: string): string {
    const pretty = (jsonStr ?? '').trim();
    if (!pretty) return '';

    // Escape HTML first to keep content safe.
    const escaped = pretty
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const tokenized = escaped.replace(
      /(\"(\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^\\\\\"])*\"\\s*:)|(\"(\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^\\\\\"])*\")|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?/g,
      (match) => {
        if (match.startsWith('\"') && match.endsWith(':')) {
          return `<span class=\"json-key\">${match}</span>`;
        }
        if (match.startsWith('\"')) {
          const withNewlines = match.replace(/\\\\n/g, '\n');
          return `<span class=\"json-string\">${withNewlines}</span>`;
        }
        if (match === 'true' || match === 'false') {
          return `<span class=\"json-boolean\">${match}</span>`;
        }
        if (match === 'null') {
          return `<span class=\"json-null\">${match}</span>`;
        }
        return `<span class=\"json-number\">${match}</span>`;
      }
    );

    return tokenized;
  }

  /**
   * Like tryParseCards but DOES NOT set jsonParseError.
   * Used from getters so we don't mutate state during change detection.
   */
  private parseCardsNoSideEffects(jsonStr: string): Card[] | null {
    try {
      const parsed = JSON.parse(jsonStr);

      let arr: any[] | null = null;
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed && Array.isArray((parsed as any).cards)) arr = (parsed as any).cards;

      if (!arr) return null;

      return arr.map((x: any) => ({
        front: typeof x?.front === 'string' ? x.front : '',
        back: typeof x?.back === 'string' ? x.back : '',
        tag: typeof x?.tag === 'string' ? x.tag : '',
      }));
    } catch {
      return null;
    }
  }

  /**
   * Parses supported JSON formats and sets jsonParseError on failure:
   * - [ {front, back, tag}, ... ]
   * - { cards: [ ... ] }
   */
  private tryParseCards(jsonStr: string): Card[] | null {
    try {
      const parsed = JSON.parse(jsonStr);

      let arr: any[] | null = null;
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed && Array.isArray((parsed as any).cards)) arr = (parsed as any).cards;

      if (!arr) {
        this.jsonParseError = 'Cards JSON must be an array (or { "cards": [...] }).';
        return null;
      }

      this.jsonParseError = '';
      return arr.map((x: any) => ({
        front: typeof x?.front === 'string' ? x.front : '',
        back: typeof x?.back === 'string' ? x.back : '',
        tag: typeof x?.tag === 'string' ? x.tag : '',
      }));
    } catch {
      this.jsonParseError = 'Invalid JSON.';
      return null;
    }
  }
}
