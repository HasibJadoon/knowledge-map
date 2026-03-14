import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsNote } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-wv-highlights-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent],
  templateUrl: './wv-highlights-tab.html',
  styleUrl: './wv-highlights-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvHighlightsTabComponent {
  @Input() highlights: ReadonlyArray<KmapsNote> = [];
  @Input() emptyMessage = 'Read the source unit and save a passage to build your highlight list.';

  @Output() addNote = new EventEmitter<KmapsNote>();
  @Output() editHighlight = new EventEmitter<KmapsNote>();
  @Output() deleteHighlight = new EventEmitter<KmapsNote>();
  @Output() sendToDistill = new EventEmitter<KmapsNote>();
  @Output() goToRead = new EventEmitter<void>();

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  preview(note: KmapsNote): string {
    const value = (note.excerptText || note.bodyMd).trim();
    return value.length > 180 ? `${value.slice(0, 177).trim()}...` : value;
  }

  meta(note: KmapsNote): string {
    return [note.locator, formatRelativeTime(note.createdAt)].filter(Boolean).join(' • ');
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
