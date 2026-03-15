import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AppHeaderbarComponent,
  AppMenuCardItem,
  AppMenuCardSection,
  AppMenuCardsComponent,
} from '../../../../shared/components';
import { PodcastContentItem, PodcastService } from '../../../../shared/services/podcast.service';

type EpisodeCardView = {
  id: string;
  title: string;
  description: string;
  route: string[];
  image: string;
  imageAlt: string;
  themeClass: string;
  generated: boolean;
};

@Component({
  selector: 'app-podcast-episodes-page',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './podcast-episodes-page.component.html',
  styleUrls: ['./podcast-episodes-page.component.scss'],
})
export class PodcastEpisodesPageComponent implements OnInit {
  q = '';
  sourceFilter: 'all' | 'worldview' = 'all';
  loading = false;
  error = '';
  items: PodcastContentItem[] = [];
  sections: AppMenuCardSection[] = [];

  constructor(
    private readonly podcastService: PodcastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
      this.sourceFilter = params.get('source') === 'worldview' ? 'worldview' : 'all';
      void this.loadEpisodes();
    });
  }

  async loadEpisodes() {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.podcastService.list({
        limit: '80',
        ...(this.q.trim() ? { q: this.q.trim() } : {}),
      });
      this.items = Array.isArray(response?.items) ? response.items : [];
      this.sections = this.buildSections(this.items);
    } catch (error) {
      this.items = [];
      this.sections = [];
      this.error = error instanceof Error ? error.message : 'Could not load podcast episodes.';
    } finally {
      this.loading = false;
    }
  }

  onHeaderSearchInput(value: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value || null },
      queryParamsHandling: 'merge',
    });
  }

  setSourceFilter(value: 'all' | 'worldview') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { source: value === 'worldview' ? 'worldview' : null },
      queryParamsHandling: 'merge',
    });
  }

  openNewEpisode() {
    this.router.navigate(['/podcast/new']);
  }

  onCardSelect(card: AppMenuCardItem) {
    if (!card.route) {
      return;
    }
    this.router.navigate(card.route);
  }

  trackBySection = (_index: number, section: AppMenuCardSection) => section.id;

  private buildSections(items: PodcastContentItem[]): AppMenuCardSection[] {
    const cards = items.map((item) => this.toCard(item));
    const worldviewCards = cards.filter((card) => card.generated);
    const otherCards = cards.filter((card) => !card.generated);

    if (this.sourceFilter === 'worldview') {
      return worldviewCards.length
        ? [{ id: 'generated-podcast-episodes', title: 'Generated from Worldview', cards: worldviewCards }]
        : [];
    }

    const sections: AppMenuCardSection[] = [];
    if (worldviewCards.length) {
      sections.push({
        id: 'generated-podcast-episodes',
        title: 'Generated from Worldview',
        cards: worldviewCards,
      });
    }
    if (otherCards.length) {
      sections.push({
        id: 'other-podcast-episodes',
        title: worldviewCards.length ? 'Manual and Other Drafts' : 'Podcast Episodes',
        cards: otherCards,
      });
    }
    return sections;
  }

  private toCard(item: PodcastContentItem): EpisodeCardView {
    const content = this.asRecord(item.content_json);
    const worldview = this.asRecord(content['worldview']);
    const isGenerated = this.isWorldviewGenerated(item);
    const locator = this.readText(content['locator_label']) || this.readText(worldview['locator_label']);
    const sourceTitle = this.readText(content['source_title']) || this.readText(worldview['source_title']);
    const unitTitle = this.readText(content['unit_title']) || this.readText(worldview['unit_title']);
    const summary =
      this.readText(content['summary']) ||
      this.readText(this.asRecord(content['episode_outline'])['intro']) ||
      'Podcast draft ready for review.';

    const descriptionParts = [
      summary,
      [sourceTitle, unitTitle, locator].filter(Boolean).join(' • '),
    ].filter(Boolean);

    return {
      id: item.id,
      title: item.title || this.readText(content['topic']) || 'Podcast Episode',
      description: descriptionParts.join(' '),
      route: ['/podcast', item.id],
      image: isGenerated
        ? 'assets/images/app-icons/dashboard/card-podcast.svg'
        : 'assets/images/app-icons/dashboard/card-memory.svg',
      imageAlt: isGenerated
        ? 'assets/images/app-icons/dashboard/card-worldview.svg'
        : 'assets/images/app-icons/dashboard/card-podcast.svg',
      themeClass: isGenerated ? 'theme-podcast' : 'theme-memory',
      generated: isGenerated,
    };
  }

  private isWorldviewGenerated(item: PodcastContentItem): boolean {
    const content = this.asRecord(item.content_json);
    return this.readText(content['source']) === 'wv_distill_batch';
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
