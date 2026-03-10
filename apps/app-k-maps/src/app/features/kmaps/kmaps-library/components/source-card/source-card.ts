import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  KmapsSource,
  KmapsSourceType,
  formatSourceTypeLabel,
} from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-source-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './source-card.html',
  styleUrl: './source-card.scss',
})
export class SourceCardComponent {
  @Input({ required: true }) source!: KmapsSource;
  @Input() unitCount = 0;
  @Input() noteCount = 0;
  @Input() claimCount = 0;
  @Input() variant: 'row' | 'featured' = 'row';

  @Output() selected = new EventEmitter<string>();

  get sourceTypeLabel(): string {
    return formatSourceTypeLabel(this.source.sourceType);
  }

  get sourceTypeIcon(): string {
    const iconMap: Record<KmapsSourceType, string> = {
      book: 'book-outline',
      article: 'document-text-outline',
      lecture: 'school-outline',
      podcast: 'mic-outline',
      video: 'videocam-outline',
      story: 'albums-outline',
      paper: 'newspaper-outline',
      conversation: 'chatbubble-ellipses-outline',
      document: 'reader-outline',
      other: 'library-outline',
    };

    return iconMap[this.source.sourceType] || 'library-outline';
  }

  get primaryMeta(): string {
    return this.source.creator || this.source.subtitle || this.source.publisher || this.sourceTypeLabel;
  }

  get secondaryMeta(): string {
    const meta: string[] = [this.sourceTypeLabel];

    if (this.noteCount > 0) {
      meta.push(`${this.noteCount} ${this.noteCount === 1 ? 'note' : 'notes'}`);
    } else if (this.unitCount > 0) {
      meta.push(`${this.unitCount} ${this.unitCount === 1 ? 'unit' : 'units'}`);
    }

    if (this.source.progressPercent > 0) {
      meta.push(`${this.source.progressPercent}%`);
    }

    return meta.join(' · ');
  }

  get progressSummary(): string {
    if (this.unitCount > 0) {
      const viewedUnits = Math.max(1, Math.round((this.source.progressPercent / 100) * this.unitCount));
      return `${Math.min(viewedUnits, this.unitCount)} of ${this.unitCount} units viewed`;
    }

    return `${this.source.progressPercent}% complete`;
  }

  get coverLabel(): string {
    const parts = this.source.title
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || this.sourceTypeLabel.slice(0, 2).toUpperCase();
  }
}
