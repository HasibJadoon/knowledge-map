import { Component, Input } from '@angular/core';
import { CreatorEpisodeSegment, CreatorEpisodeType } from './podcast-builder.models';

@Component({
  selector: 'app-segment-card',
  standalone: false,
  template: `
    <div class="segment-card">
      <span class="segment-card__order" *ngIf="order">{{ order }}</span>
      <span class="segment-card__title">{{ segment?.title }}</span>
      <span class="segment-card__type" *ngIf="episodeType">{{ episodeType }}</span>
    </div>
  `,
})
export class SegmentCardComponent {
  @Input() segment: CreatorEpisodeSegment | null = null;
  @Input() episodeType: CreatorEpisodeType | null = null;
  @Input() order: number | null = null;
}
