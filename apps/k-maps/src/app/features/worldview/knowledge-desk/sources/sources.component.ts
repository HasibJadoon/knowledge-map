import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AppHeaderbarComponent,
  AppMenuCardItem,
  AppMenuCardSection,
  AppMenuCardsComponent,
} from '../../../../shared/components';
import {
  WorldviewSourceContentDocument,
  WorldviewSourceContentNode,
  WorldviewSourceContentPodcast,
  WorldviewSourceContentResponse,
  WorldviewSourceRecord,
  WorldviewSourcesService,
} from '../../../../shared/services/worldview-sources.service';

type SourcePanel = {
  source: WorldviewSourceRecord;
  content: WorldviewSourceContentResponse | null;
  concept: WorldviewSourceContentNode | null;
  claim: WorldviewSourceContentNode | null;
  sections: AppMenuCardSection[];
  unitsPreview: string[];
  error: string | null;
};

@Component({
  selector: 'app-sources',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.scss'],
})
export class SourcesComponent implements OnInit {
  loading = false;
  error = '';
  q = '';
  panels: SourcePanel[] = [];

  constructor(
    private readonly worldviewSourcesService: WorldviewSourcesService,
    private readonly router: Router,
  ) {}

  get visiblePanels(): SourcePanel[] {
    const needle = this.q.trim().toLowerCase();
    if (!needle) {
      return this.panels;
    }

    return this.panels.filter((panel) => {
      const source = panel.source;
      const searchable = [
        source.title,
        source.creator,
        source.source_type,
        source.description,
        panel.concept?.title,
        panel.claim?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(needle);
    });
  }

  async ngOnInit() {
    await this.loadSources();
  }

  onHeaderSearchInput(value: string) {
    this.q = value;
  }

  onCardSelect(card: AppMenuCardItem) {
    if (!card.route) {
      return;
    }
    this.router.navigate(card.route);
  }

  private async loadSources() {
    this.loading = true;
    this.error = '';

    try {
      const workflow = await this.worldviewSourcesService.workflow();
      const sources = Array.isArray(workflow?.sources) ? workflow.sources : [];
      const panels = await Promise.all(
        sources.map(async (source) => {
          try {
            const content = await this.worldviewSourcesService.sourceContent(source.id);
            const concept = content.nodes.find((node) => node.node_type === 'concept') ?? null;
            const claim = content.nodes.find((node) => node.node_type === 'claim') ?? null;

            return {
              source,
              content,
              concept,
              claim,
              sections: this.buildSections(content, concept, claim),
              unitsPreview: content.units
                .slice(0, 4)
                .map((unit) => [unit.title, unit.locator_label].filter(Boolean).join(' • ')),
              error: null,
            } satisfies SourcePanel;
          } catch (error) {
            return {
              source,
              content: null,
              concept: null,
              claim: null,
              sections: [],
              unitsPreview: [],
              error: error instanceof Error ? error.message : 'Could not load source content.',
            } satisfies SourcePanel;
          }
        }),
      );

      this.panels = panels;
    } catch (error) {
      this.panels = [];
      this.error = error instanceof Error ? error.message : 'Could not load worldview sources.';
    } finally {
      this.loading = false;
    }
  }

  private buildSections(
    content: WorldviewSourceContentResponse,
    concept: WorldviewSourceContentNode | null,
    claim: WorldviewSourceContentNode | null,
  ): AppMenuCardSection[] {
    const documentCards = [
      ...content.documents.map((document) => this.toDocumentCard(document)),
      ...content.podcasts.map((podcast) => this.toPodcastCard(podcast)),
    ];

    const extractedCards = [concept, claim]
      .filter((node): node is WorldviewSourceContentNode => node !== null)
      .map((node) => this.toNodeCard(node));

    const sections: AppMenuCardSection[] = [];
    if (documentCards.length) {
      sections.push({
        id: `${content.source.id}-documents`,
        title: 'Documents Under This Source',
        cards: documentCards,
      });
    }
    if (extractedCards.length) {
      sections.push({
        id: `${content.source.id}-extracted`,
        title: 'Featured Extracted Concept and Claim',
        cards: extractedCards,
      });
    }
    return sections;
  }

  private toPodcastCard(podcast: WorldviewSourceContentPodcast): AppMenuCardItem {
    const summary = this.readText(this.asRecord(podcast.content_json)['summary']) || 'Podcast outline generated from source evidence.';
    const locator = this.readText(this.asRecord(podcast.content_json)['locator_label']);
    return {
      id: `podcast-${podcast.id}`,
      title: podcast.title,
      description: [summary, locator].filter(Boolean).join(' • '),
      route: ['/podcast', podcast.id],
      image: 'assets/images/app-icons/dashboard/card-podcast.svg',
      imageAlt: 'assets/images/app-icons/dashboard/card-worldview.svg',
      themeClass: 'theme-podcast',
    };
  }

  private toDocumentCard(document: WorldviewSourceContentDocument): AppMenuCardItem {
    const summary = document.summary || this.readText(this.asRecord(document.document_json)['summary']) || 'Study note generated from source evidence.';
    const locator = this.readText(this.asRecord(document.document_json)['locator_label']);
    return {
      id: `document-${document.id}`,
      title: document.title,
      description: [summary, locator].filter(Boolean).join(' • '),
      image: 'assets/images/app-icons/dashboard/card-worldview.svg',
      imageAlt: 'assets/images/app-icons/dashboard/card-crossref.svg',
      themeClass: 'theme-worldview',
    };
  }

  private toNodeCard(node: WorldviewSourceContentNode): AppMenuCardItem {
    return {
      id: `node-${node.id}`,
      title: node.title,
      description: node.summary || node.text_plain || `${node.node_type} extracted from source evidence.`,
      image: 'assets/images/app-icons/dashboard/card-crossref.svg',
      imageAlt: 'assets/images/app-icons/dashboard/card-worldview.svg',
      themeClass: node.node_type === 'claim' ? 'theme-crossref' : 'theme-worldview',
    };
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
