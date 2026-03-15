import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import {
  WorldviewApiService,
  WorldviewSourceContentSnapshot,
} from '../../../../../shared/services/worldview-api.service';

@Component({
  selector: 'app-source-content-menu',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './source-content-menu.component.html',
  styleUrl: './source-content-menu.component.scss',
})
export class SourceContentMenuComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly worldviewApi = inject(WorldviewApiService);

  private requestVersion = 0;
  private sourceIdValue = '';
  private unitIdValue = '';

  @Input()
  set sourceId(value: string) {
    this.sourceIdValue = (value ?? '').trim();
    void this.loadSnapshot();
  }

  get sourceId(): string {
    return this.sourceIdValue;
  }

  @Input()
  set unitId(value: string | null | undefined) {
    this.unitIdValue = (value ?? '').trim();
    void this.loadSnapshot();
  }

  get unitId(): string {
    return this.unitIdValue;
  }

  @Input() sourceTitle = '';
  @Input() unitTitle = '';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<WorldviewSourceContentSnapshot | null>(null);

  readonly latestPodcast = computed(() => this.snapshot()?.podcasts[0] ?? null);
  readonly latestDocument = computed(() => this.snapshot()?.documents[0] ?? null);
  readonly extractLine = computed(() => {
    const nodes = this.snapshot()?.nodes ?? [];
    const conceptCount = nodes.filter((node) => node.nodeType === 'concept').length;
    const claimCount = nodes.filter((node) => node.nodeType === 'claim').length;

    if (!conceptCount && !claimCount) {
      return 'No extracted concept or claim yet.';
    }

    const parts: string[] = [];
    if (conceptCount) {
      parts.push(`${conceptCount} ${conceptCount === 1 ? 'concept' : 'concepts'}`);
    }
    if (claimCount) {
      parts.push(`${claimCount} ${claimCount === 1 ? 'claim' : 'claims'}`);
    }
    return `${parts.join(' · ')} extracted from this ${this.unitId ? 'unit' : 'source'}.`;
  });

  readonly podcastMeta = computed(() => {
    const snapshot = this.snapshot();
    const podcast = this.latestPodcast();

    if (!snapshot || !podcast) {
      return 'Open the source output screen when the first generated episode lands.';
    }

    const parts = [`${snapshot.podcasts.length} ${snapshot.podcasts.length === 1 ? 'episode' : 'episodes'}`];
    const summary = readText(podcast.contentJson['summary']);
    if (summary) {
      parts.push(summary);
    }
    return parts.join(' · ');
  });

  readonly documentMeta = computed(() => {
    const snapshot = this.snapshot();
    const document = this.latestDocument();

    if (!snapshot || !document) {
      return 'Study notes will collect here once a distill batch writes documents.';
    }

    const parts = [`${snapshot.documents.length} ${snapshot.documents.length === 1 ? 'document' : 'documents'}`];
    if (document.summary) {
      parts.push(document.summary);
    }
    return parts.join(' · ');
  });

  openLatestPodcast(): void {
    const podcast = this.latestPodcast();
    if (podcast) {
      void this.router.navigate(['/podcast', podcast.id]);
      return;
    }

    this.openOutput();
  }

  openDocuments(): void {
    this.openOutput();
  }

  openOutput(): void {
    void this.router.navigate(this.outputRoute());
  }

  private async loadSnapshot(): Promise<void> {
    const sourceId = this.sourceId;
    const sourceUnitId = this.unitId || null;
    if (!sourceId || sourceId === 'new' || sourceId === 'draft-source') {
      this.snapshot.set(null);
      this.error.set(null);
      this.loading.set(false);
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
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.snapshot.set(null);
          this.error.set(error instanceof Error ? error.message : 'Could not load generated source output.');
          this.loading.set(false);
        },
      });
  }

  private outputRoute(): string[] {
    if (this.routeRoot() === 'wv') {
      return this.unitId
        ? ['/wv', 'source', this.sourceId, 'unit', this.unitId, 'content']
        : ['/wv', 'source', this.sourceId, 'content'];
    }

    return this.unitId
      ? ['/worldview', 'sources', this.sourceId, 'units', this.unitId, 'content']
      : ['/worldview', 'sources', this.sourceId, 'content'];
  }

  private routeRoot(): 'wv' | 'worldview' {
    return this.router.url.startsWith('/wv') ? 'wv' : 'worldview';
  }
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
