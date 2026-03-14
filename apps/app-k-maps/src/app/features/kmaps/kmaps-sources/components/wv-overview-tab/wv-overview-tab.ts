import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsStatChipRowComponent } from '../../../kmaps-shared/components/stat-chip-row/stat-chip-row';
import { KmapsNote, KmapsSource, KmapsSourceUnit, KmapsStatItem, formatNoteKindLabel, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-wv-overview-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, KmapsStatChipRowComponent],
  templateUrl: './wv-overview-tab.html',
  styleUrl: './wv-overview-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvOverviewTabComponent {
  @Input() source: KmapsSource | null = null;
  @Input() unit: KmapsSourceUnit | null = null;
  @Input() summary = '';
  @Input() progressPercent = 0;
  @Input() stats: KmapsStatItem[] = [];
  @Input() structureUnits: KmapsSourceUnit[] = [];
  @Input() recentHighlights: KmapsNote[] = [];
  @Input() recentNotes: KmapsNote[] = [];
  @Input() isEmpty = false;

  @Output() continueReading = new EventEmitter<void>();
  @Output() viewHighlights = new EventEmitter<void>();
  @Output() viewNotes = new EventEmitter<void>();
  @Output() openUnit = new EventEmitter<string>();
  @Output() openNote = new EventEmitter<KmapsNote>();

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  unitMeta(unit: KmapsSourceUnit): string {
    return [formatUnitTypeLabel(unit.unitType), unit.locatorLabel, this.readingMinutesLabel(unit.readingMinutes)]
      .filter(Boolean)
      .join(' • ');
  }

  noteTitle(note: KmapsNote): string {
    return note.title?.trim() || formatNoteKindLabel(note.noteKind);
  }

  notePreview(note: KmapsNote, maxLength = 120): string {
    const value = (note.excerptText || note.bodyMd || note.title || '').trim();
    return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
  }

  noteMeta(note: KmapsNote): string {
    return [note.locator, formatRelativeTime(note.createdAt)].filter(Boolean).join(' • ');
  }

  private readingMinutesLabel(value: number): string {
    const minutes = Math.max(0, Math.round(value));
    return minutes > 0 ? `${minutes} min` : 'Ready';
  }
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const deltaMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const hours = Math.round(deltaMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
