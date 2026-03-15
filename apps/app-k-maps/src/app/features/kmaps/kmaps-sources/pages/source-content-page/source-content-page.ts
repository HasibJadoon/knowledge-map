import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import {
  WorldviewApiService,
  WorldviewSourceContentBlock,
  WorldviewSourceContentSnapshot,
} from '../../../../../shared/services/worldview-api.service';

type PodcastOutlineSection = {
  id: string;
  title: string;
};

type PodcastDetailView = {
  source: string | null;
  topic: string | null;
  summary: string | null;
  kind: string | null;
  hook: string | null;
  intro: string | null;
  mainPoints: string[];
  closing: string | null;
  outlineSections: PodcastOutlineSection[];
  checklist: string[];
};

@Component({
  selector: 'app-source-content-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent],
  templateUrl: './source-content-page.html',
  styleUrl: './source-content-page.scss',
})
export class SourceContentPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);
  private readonly worldviewApi = inject(WorldviewApiService);

  private requestVersion = 0;

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<WorldviewSourceContentSnapshot | null>(null);
  readonly selectedDocumentId = signal('');

  readonly currentSource = computed(() => this.snapshot()?.source ?? this.workflow.getSource(this.sourceId()));
  readonly currentUnit = computed(() => {
    const unitId = this.unitId();
    if (!unitId) {
      return null;
    }

    return this.snapshot()?.units.find((unit) => unit.id === unitId) ?? this.workflow.getUnit(unitId);
  });
  readonly documents = computed(() => this.snapshot()?.documents ?? []);
  readonly podcasts = computed(() => this.snapshot()?.podcasts ?? []);
  readonly nodes = computed(() => this.snapshot()?.nodes ?? []);
  readonly featuredPodcast = computed(() => this.podcasts()[0] ?? null);
  readonly featuredPodcastView = computed<PodcastDetailView | null>(() => {
    const podcast = this.featuredPodcast();
    if (!podcast) {
      return null;
    }

    const content = podcast.contentJson;
    const episodeOutline = asRecord(content['episode_outline']);

    return {
      source: readText(content['source']),
      topic: readText(content['topic']),
      summary: readText(content['summary']),
      kind: readText(content['kind']),
      hook: readText(episodeOutline?.['hook']) || readText(content['hook']),
      intro: readText(episodeOutline?.['intro']) || readText(content['intro']),
      mainPoints: readStringArray(episodeOutline?.['main_points'] ?? content['main_points']),
      closing: readText(episodeOutline?.['closing']) || readText(content['closing']),
      outlineSections: readOutlineSections(content['outline_sections'], content['outline']),
      checklist: readStringArray(content['checklist']),
    };
  });
  readonly selectedDocument = computed(() => {
    const selectedId = this.selectedDocumentId();
    const documents = this.documents();
    return documents.find((document) => document.id === selectedId) ?? documents[0] ?? null;
  });
  readonly featuredConcept = computed(() => this.nodes().find((node) => node.nodeType === 'concept') ?? null);
  readonly featuredClaim = computed(() => this.nodes().find((node) => node.nodeType === 'claim') ?? null);
  readonly heroTitle = computed(() => this.currentUnit()?.title || this.currentSource()?.title || 'Generated Output');
  readonly heroSubtitle = computed(() => this.currentUnit()?.locatorLabel || this.currentSource()?.subtitle || 'Worldview source output');
  readonly heroSummary = computed(() => {
    const podcast = this.featuredPodcastView();
    if (podcast?.summary) {
      return podcast.summary;
    }

    const document = this.selectedDocument();
    if (document?.summary) {
      return document.summary;
    }

    return 'Generated podcast drafts, study notes, and extracted nodes from the current worldview source.';
  });
  readonly stats = computed(() => [
    { key: 'podcasts', label: 'Podcasts', value: this.podcasts().length },
    { key: 'documents', label: 'Documents', value: this.documents().length },
    { key: 'nodes', label: 'Extracts', value: this.nodes().length },
  ]);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.sourceId.set(params.get('sourceId') || '');
      this.unitId.set(params.get('unitId') || '');
      void this.loadSnapshot();
    });
  }

  backHref(): string {
    if (!this.sourceId()) {
      return this.routeRoot() === 'wv' ? '/wv/library' : '/worldview/library';
    }

    if (this.routeRoot() === 'wv') {
      return this.unitId()
        ? `/wv/source/${this.sourceId()}/unit/${this.unitId()}`
        : `/wv/source/${this.sourceId()}`;
    }

    return this.unitId()
      ? `/worldview/sources/${this.sourceId()}/units/${this.unitId()}`
      : `/worldview/sources/${this.sourceId()}`;
  }

  openPodcast(): void {
    const podcast = this.featuredPodcast();
    if (!podcast) {
      return;
    }

    void this.router.navigate(['/podcast', podcast.id]);
  }

  selectDocument(documentId: string): void {
    this.selectedDocumentId.set(documentId);
  }

  trackStat(_: number, stat: { key: string }): string {
    return stat.key;
  }

  trackDocument(_: number, document: { id: string }): string {
    return document.id;
  }

  trackSection(_: number, section: { id: string }): string {
    return section.id;
  }

  trackBlock(_: number, block: WorldviewSourceContentBlock): string {
    return block.id;
  }

  trackText(_: number, value: string): string {
    return value;
  }

  blockText(block: WorldviewSourceContentBlock): string {
    return block.textPlain || readText(block.contentJson['text']);
  }

  isParagraphBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'paragraph';
  }

  isHeadingBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'heading';
  }

  isQuoteBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'quote';
  }

  isCalloutBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'callout';
  }

  isDividerBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'divider';
  }

  isBulletBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'bullet_item';
  }

  isNumberedBlock(block: WorldviewSourceContentBlock): boolean {
    return block.blockType === 'numbered_item';
  }

  private async loadSnapshot(): Promise<void> {
    const sourceId = this.sourceId();
    const sourceUnitId = this.unitId() || null;

    if (!sourceId) {
      this.snapshot.set(null);
      this.loading.set(false);
      this.error.set('Source not found.');
      return;
    }

    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    this.worldviewApi
      .fetchSourceContent({ sourceId, sourceUnitId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.snapshot.set(snapshot);
          const nextDocumentId = this.selectedDocumentId();
          if (!nextDocumentId || !snapshot.documents.some((document) => document.id === nextDocumentId)) {
            this.selectedDocumentId.set(snapshot.documents[0]?.id ?? '');
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.snapshot.set(null);
          this.selectedDocumentId.set('');
          this.error.set(error instanceof Error ? error.message : 'Could not load source output.');
          this.loading.set(false);
        },
      });
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function readOutlineSections(rawSections: unknown, rawOutline: unknown): PodcastOutlineSection[] {
  if (Array.isArray(rawSections)) {
    const sections = rawSections
      .map((entry, index) => {
        const record = asRecord(entry);
        const title = readText(record?.['title']);
        if (!title) {
          return null;
        }

        return {
          id: readText(record?.['id']) || `outline-${index + 1}`,
          title,
        };
      })
      .filter((entry): entry is PodcastOutlineSection => entry !== null);

    if (sections.length) {
      return sections;
    }
  }

  return readStringArray(rawOutline).map((title, index) => ({
    id: `outline-${index + 1}`,
    title,
  }));
}
