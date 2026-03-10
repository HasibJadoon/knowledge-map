import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KmapsNoteKind, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-note-kind-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-kind-chip.html',
  styleUrl: './note-kind-chip.scss',
})
export class NoteKindChipComponent {
  @Input({ required: true }) kind!: KmapsNoteKind;

  get label(): string {
    return formatNoteKindLabel(this.kind);
  }
}
