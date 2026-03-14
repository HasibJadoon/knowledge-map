import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsNote, KmapsNoteKind, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';

export type WvNotesFilterKey = 'all' | 'summary' | 'claim_seed' | 'insight' | 'reflection';

@Component({
  selector: 'app-wv-notes-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent],
  templateUrl: './wv-notes-tab.html',
  styleUrl: './wv-notes-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvNotesTabComponent {
  @Input() notes: ReadonlyArray<KmapsNote> = [];
  @Input() activeFilter: WvNotesFilterKey = 'all';
  @Input() filters: ReadonlyArray<WvNotesFilterKey> = ['all', 'summary', 'claim_seed', 'insight', 'reflection'];
  @Input() emptyMessage = 'Create reflections, questions, ideas, or claim seeds and they will collect here.';

  @Output() activeFilterChange = new EventEmitter<WvNotesFilterKey>();
  @Output() createNote = new EventEmitter<void>();
  @Output() editNote = new EventEmitter<KmapsNote>();
  @Output() deleteNote = new EventEmitter<KmapsNote>();
  @Output() sendToDistill = new EventEmitter<KmapsNote>();

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  filterLabel(filter: WvNotesFilterKey): string {
    return filter === 'all' ? 'All' : formatNoteKindLabel(filter as KmapsNoteKind);
  }

  onFilterChange(value: string | number | null | undefined): void {
    switch (value) {
      case 'summary':
      case 'claim_seed':
      case 'insight':
      case 'reflection':
      case 'all':
        this.activeFilterChange.emit(value);
        return;
      default:
        this.activeFilterChange.emit('all');
    }
  }

  kindLabel(kind: KmapsNoteKind): string {
    return formatNoteKindLabel(kind);
  }

  preview(note: KmapsNote): string {
    const value = (note.bodyMd || note.excerptText || note.title || '').trim();
    return value.length > 160 ? `${value.slice(0, 157).trim()}...` : value;
  }
}
