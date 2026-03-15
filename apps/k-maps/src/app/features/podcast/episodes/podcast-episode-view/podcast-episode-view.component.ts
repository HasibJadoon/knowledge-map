import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AppHeaderbarComponent } from '../../../../shared/components';
import { PodcastContentItem, PodcastService } from '../../../../shared/services/podcast.service';

type OutlineSection = {
  id: string;
  title: string;
};

@Component({
  selector: 'app-podcast-episode-view',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent],
  templateUrl: './podcast-episode-view.component.html',
  styleUrls: ['./podcast-episode-view.component.scss'],
})
export class PodcastEpisodeViewComponent implements OnInit {
  loading = false;
  error = '';
  item: PodcastContentItem | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly podcastService: PodcastService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error = 'Podcast id is required.';
        this.item = null;
        return;
      }
      void this.loadEpisode(id);
    });
  }

  get title(): string {
    return this.item?.title || this.readText(this.content['topic']) || 'Podcast Episode';
  }

  get summary(): string {
    return (
      this.readText(this.content['summary']) ||
      this.readText(this.episodeOutline['intro']) ||
      this.readText(this.episodeOutline['hook']) ||
      ''
    );
  }

  get sourceLabel(): string {
    const sourceTitle = this.readText(this.content['source_title']) || this.readText(this.worldview['source_title']);
    const unitTitle = this.readText(this.content['unit_title']) || this.readText(this.worldview['unit_title']);
    const subunitTitle = this.readText(this.content['subunit_title']) || this.readText(this.worldview['subunit_title']);
    return [sourceTitle, unitTitle, subunitTitle].filter(Boolean).join(' / ');
  }

  get locatorLabel(): string {
    return this.readText(this.content['locator_label']) || this.readText(this.worldview['locator_label']);
  }

  get hook(): string {
    return this.readText(this.episodeOutline['hook']);
  }

  get intro(): string {
    return this.readText(this.episodeOutline['intro']);
  }

  get closing(): string {
    return this.readText(this.episodeOutline['closing']);
  }

  get mainPoints(): string[] {
    const value = this.episodeOutline['main_points'];
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((entry) => this.readText(entry)).filter(Boolean);
  }

  get outlineSections(): OutlineSection[] {
    const value = this.content['outline_sections'];
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry, index) => {
        const row = this.asRecord(entry);
        const title = this.readText(row['title']);
        if (!title) {
          return null;
        }
        return {
          id: this.readText(row['id']) || `outline-${index + 1}`,
          title,
        };
      })
      .filter((entry): entry is OutlineSection => entry !== null);
  }

  get isGenerated(): boolean {
    return this.readText(this.content['source']) === 'wv_distill_batch';
  }

  get updatedLabel(): string {
    return this.item?.updated_at || this.item?.created_at || '';
  }

  get worldview(): Record<string, unknown> {
    return this.asRecord(this.content['worldview']);
  }

  get episodeOutline(): Record<string, unknown> {
    return this.asRecord(this.content['episode_outline']);
  }

  get content(): Record<string, unknown> {
    return this.asRecord(this.item?.content_json);
  }

  async loadEpisode(id: string) {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.podcastService.get(id);
      this.item = response?.item ?? null;
      if (!this.item) {
        this.error = 'Podcast episode not found.';
      }
    } catch (error) {
      this.item = null;
      this.error = error instanceof Error ? error.message : 'Could not load podcast episode.';
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/podcast/episodes']);
  }

  openEdit() {
    if (!this.item) {
      return;
    }
    this.router.navigate(['/podcast', this.item.id, 'edit']);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
