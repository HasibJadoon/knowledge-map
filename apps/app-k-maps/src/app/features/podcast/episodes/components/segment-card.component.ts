import { Component, Input } from '@angular/core';
import {
  bookOutline,
  chatbubbleOutline,
  flagOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';
import { CreatorEpisodeSegment, CreatorEpisodeType } from '../../../../shared/models/planner/podcast-builder.models';

interface SegmentMetaItem {
  icon: string;
  value?: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-segment-card',
  standalone: false,
  templateUrl: './segment-card.component.html',
  styleUrl: './segment-card.component.scss',
})
export class SegmentCardComponent {
  @Input({ required: true }) segment!: CreatorEpisodeSegment;
  @Input({ required: true }) episodeType!: CreatorEpisodeType;
  @Input() order = 0;

  readonly icons = {
    bookOutline,
    chatbubbleOutline,
    flagOutline,
    peopleOutline,
    timeOutline,
  };

  get title(): string {
    return this.segment.title.trim() || 'Untitled';
  }

  get orderLabel(): string {
    const segmentOrder = this.segment.order > 0 ? this.segment.order : 0;
    const value = this.order > 0 ? this.order : segmentOrder || 1;
    return String(value).padStart(2, '0');
  }

  get pointCount(): number {
    if (this.episodeType === 'discussion') {
      return this.segment.dialogueItems.length;
    }

    if (this.episodeType === 'lesson_log') {
      return this.segment.doneItems.length + this.segment.reviewItems.length;
    }

    return this.segment.talkingPoints.length;
  }

  get speakerCount(): number {
    if (this.episodeType !== 'discussion') {
      return 0;
    }

    return new Set(this.segment.dialogueItems.map((item) => item.speaker)).size;
  }

  get durationLabel(): string {
    return this.segment.duration ? `${this.segment.duration}m` : 'OPEN';
  }

  get metadataItems(): ReadonlyArray<SegmentMetaItem> {
    const items: SegmentMetaItem[] = [];

    if (this.hasReferenceMarker) {
      items.push({
        icon: this.icons.bookOutline,
        ariaLabel: 'Reference segment',
      });
    }

    if (this.speakerCount > 0) {
      items.push({
        icon: this.icons.peopleOutline,
        value: String(this.speakerCount),
        ariaLabel: `${this.speakerCount} speakers`,
      });
    }

    if (this.hasHookMarker) {
      items.push({
        icon: this.icons.flagOutline,
        ariaLabel: 'Hook marker',
      });
    }

    items.push({
      icon: this.icons.chatbubbleOutline,
      value: String(this.pointCount),
      ariaLabel: `${this.pointCount} points`,
    });

    items.push({
      icon: this.icons.timeOutline,
      value: this.durationLabel,
      ariaLabel: this.segment.duration ? `${this.segment.duration} minutes` : 'Open duration',
    });

    return items;
  }

  private get hasReferenceMarker(): boolean {
    const referenceText = [
      this.segment.reference,
      this.segment.primaryReference,
      this.segment.secondaryReference,
      this.segment.title,
      this.segment.type,
    ]
      .join(' ')
      .toLowerCase();

    return Boolean(this.segment.reference || this.segment.primaryReference || this.segment.secondaryReference)
      || referenceText.includes('passage')
      || referenceText.includes('reading')
      || referenceText.includes('verse');
  }

  private get hasHookMarker(): boolean {
    return this.segment.talkingPoints.some((item) => item.tone === 'hook');
  }
}
