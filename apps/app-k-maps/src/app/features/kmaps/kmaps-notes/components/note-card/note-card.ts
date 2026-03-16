import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KmapsNote, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { NoteKindChipComponent } from '../note-kind-chip/note-kind-chip';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [CommonModule, NoteKindChipComponent],
  templateUrl: './note-card.html',
  styleUrl: './note-card.scss',
})
export class NoteCardComponent {
  @Input({ required: true }) note!: KmapsNote;
  @Input() selectionMode = false;
  @Input() selected = false;
  @Input() disabled = false;
  @Input() variant: 'default' | 'distill' = 'default';

  @Output() selectedChange = new EventEmitter<string>();

  get heading(): string {
    return this.note.title || formatNoteKindLabel(this.note.noteKind);
  }

  get showHeading(): boolean {
    return normalizeText(this.heading) !== normalizeText(formatNoteKindLabel(this.note.noteKind));
  }

  get previewBody(): string {
    return this.note.bodyMd.length > 180 ? `${this.note.bodyMd.slice(0, 177)}...` : this.note.bodyMd;
  }

  get showBody(): boolean {
    return normalizeText(this.previewBody) !== normalizeText(this.note.excerptText || '');
  }

  get headingIsArabic(): boolean {
    return this.isArabicText(this.heading);
  }

  get excerptIsArabic(): boolean {
    return this.isArabicText(this.note.excerptText);
  }

  get bodyIsArabic(): boolean {
    return this.isArabicText(this.previewBody);
  }

  get createdLabel(): string {
    const date = new Date(this.note.createdAt);
    return Number.isNaN(date.getTime())
      ? this.note.createdAt
      : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  isArabicText(value: string | null | undefined): boolean {
    return ARABIC_TEXT_PATTERN.test(value || '');
  }
}

const ARABIC_TEXT_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
