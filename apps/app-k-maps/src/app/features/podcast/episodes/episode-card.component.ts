import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreatorEpisode, episodeStatusLabel, episodeTypeLabel } from './podcast-builder.models';

@Component({
  selector: 'app-episode-card',
  standalone: false,
  template: `
    <div class="episode-card" (click)="select()">
      <div class="episode-card__header">
        <span class="episode-card__type">{{ typeLabel }}</span>
        <span class="episode-card__status">{{ statusLabel }}</span>
      </div>
      <h3 class="episode-card__title">{{ episode?.title }}</h3>
      <p class="episode-card__meta">{{ summaryLine }}</p>
    </div>
  `,
})
export class EpisodeCardComponent {
  @Input({ required: true }) episode!: CreatorEpisode;
  @Output() selected = new EventEmitter<string>();

  get typeLabel(): string {
    return episodeTypeLabel(this.episode.type);
  }

  get statusLabel(): string {
    return episodeStatusLabel(this.episode.status);
  }

  get summaryLine(): string {
    const parts = [`${this.episode.segments.length} ${this.episode.segments.length === 1 ? 'segment' : 'segments'}`];
    if (this.episode.estimatedDuration) {
      parts.push(`${this.episode.estimatedDuration} min`);
    }
    return parts.join(' • ');
  }

  select(): void {
    this.selected.emit(this.episode.id);
  }
}
