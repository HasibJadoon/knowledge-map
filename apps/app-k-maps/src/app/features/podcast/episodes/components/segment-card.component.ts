import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  CreatorEpisodeSegment,
  CreatorEpisodeType,
  lessonStateLabel,
  speakerLabel,
} from '../podcast-builder.models';
import { CreatorBadgeTone, StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-segment-card',
  standalone: false,
  templateUrl: './segment-card.component.html',
  styleUrl: './segment-card.component.scss',
})
export class SegmentCardComponent {
  @Input({ required: true }) segment!: CreatorEpisodeSegment;
  @Input({ required: true }) episodeType!: CreatorEpisodeType;

  get itemLine(): string {
    if (this.episodeType === 'discussion') {
      const count = this.segment.dialogueItems.length;
      return `${count} ${count === 1 ? 'prompt' : 'prompts'}`;
    }

    if (this.episodeType === 'solo') {
      const count = this.segment.talkingPoints.length;
      return `${count} ${count === 1 ? 'talking point' : 'talking points'}`;
    }

    const count = this.segment.doneItems.length + this.segment.reviewItems.length;
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  get supportLine(): string {
    if (this.episodeType === 'discussion') {
      const speakers = Array.from(new Set(this.segment.dialogueItems.map((item) => speakerLabel(item.speaker))));
      return speakers.length ? speakers.join(' + ') : 'Host';
    }

    if (this.episodeType === 'lesson_log') {
      return lessonStateLabel(this.segment.lessonState);
    }

    return this.segment.reference || '';
  }

  get durationLine(): string {
    return this.segment.duration ? `${this.segment.duration} min` : 'Open timing';
  }

  get lessonTone(): CreatorBadgeTone {
    if (this.segment.lessonState === 'needs_review') {
      return 'warning';
    }

    return this.segment.lessonState === 'assigned' ? 'accent' : 'success';
  }
}
