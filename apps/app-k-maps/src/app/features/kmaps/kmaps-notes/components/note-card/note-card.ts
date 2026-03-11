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

  @Output() selectedChange = new EventEmitter<string>();

  get heading(): string {
    return this.note.title || formatNoteKindLabel(this.note.noteKind);
  }

  get previewBody(): string {
    return this.note.bodyMd.length > 180 ? `${this.note.bodyMd.slice(0, 177)}...` : this.note.bodyMd;
  }

  get createdLabel(): string {
    const date = new Date(this.note.createdAt);
    return Number.isNaN(date.getTime())
      ? this.note.createdAt
      : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}
