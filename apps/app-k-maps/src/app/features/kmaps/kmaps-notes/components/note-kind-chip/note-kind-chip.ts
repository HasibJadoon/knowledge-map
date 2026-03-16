import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { KmapsNoteKind, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-note-kind-chip',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './note-kind-chip.html',
  styleUrl: './note-kind-chip.scss',
})
export class NoteKindChipComponent {
  @Input({ required: true }) kind!: KmapsNoteKind;

  get label(): string {
    return formatNoteKindLabel(this.kind);
  }

  get iconName(): string {
    switch (this.kind) {
      case 'highlight':
        return 'bookmarks-outline';
      case 'quote':
        return 'document-text-outline';
      case 'summary':
        return 'list-outline';
      case 'reflection':
      case 'idea':
      case 'insight':
        return 'sparkles-outline';
      case 'question':
        return 'search-outline';
      case 'claim_seed':
        return 'pricetags-outline';
      case 'observation':
        return 'create-outline';
      case 'reference':
        return 'attach-outline';
      case 'todo':
        return 'checkmark-done-outline';
      default:
        return 'document-text-outline';
    }
  }
}
