import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CreatorEpisode, episodeStatusLabel, episodeTypeLabel } from '../podcast-builder.models';
import { CreatorBadgeTone, StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-episode-card',
  standalone: false,
  templateUrl: './episode-card.component.html',
  styleUrl: './episode-card.component.scss',
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

  get typeTone(): CreatorBadgeTone {
    if (this.episode.type === 'lesson_log') {
      return 'accent';
    }

    return this.episode.type === 'discussion' ? 'warning' : 'info';
  }

  get statusTone(): CreatorBadgeTone {
    if (this.episode.status === 'published' || this.episode.status === 'completed') {
      return 'success';
    }

    if (this.episode.status === 'ready') {
      return 'accent';
    }

    return this.episode.status === 'draft' ? 'warning' : 'neutral';
  }

  get summaryLine(): string {
    const parts = [`${this.episode.segments.length} ${this.episode.segments.length === 1 ? 'segment' : 'segments'}`];
    if (this.episode.estimatedDuration) {
      parts.push(`${this.episode.estimatedDuration} min`);
    }
    return parts.join(' • ');
  }

  get timeLine(): string {
    const value = this.episode.updatedAt || this.episode.createdAt;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
