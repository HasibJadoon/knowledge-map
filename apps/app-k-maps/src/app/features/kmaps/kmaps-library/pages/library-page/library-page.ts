import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MenuController, IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

import { SourceMetadataSheetComponent } from '../../components/source-metadata-sheet/source-metadata-sheet';
import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsSource, formatSourceTypeLabel, type KmapsSourceContributor, type KmapsSourceType } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { NativeSearchbarComponent } from '../../../../../shared/components/native-searchbar/native-searchbar.component';

type LibraryPeopleSummary = {
  initials: string;
  moreLabel: string | null;
  ariaLabel: string;
};

type LibraryListEntry = {
  source: KmapsSource;
  iconName: string;
  primaryMeta: string;
  secondaryMeta: string;
  peopleSummary: LibraryPeopleSummary | null;
};

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent, NativeSearchbarComponent],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPage {
  private readonly menuController = inject(MenuController);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly searchQuery = signal('');

  readonly filteredSources = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return [...this.workflow.sources()]
      .filter((source) => {
        const matchesQuery =
          !query ||
          source.title.toLowerCase().includes(query) ||
          source.description.toLowerCase().includes(query) ||
          (source.creator || '').toLowerCase().includes(query) ||
          (source.subtitle || '').toLowerCase().includes(query) ||
          this.sourceTypeLabel(source.sourceType).toLowerCase().includes(query);

        return matchesQuery;
      })
      .sort((left, right) => compareByRecency(right.lastOpenedAt, left.lastOpenedAt));
  });
  readonly searchResults = computed(() => {
    if (!this.searchQuery().trim()) {
      return [];
    }

    return this.filteredSources().slice(0, 8);
  });
  readonly visibleSources = computed(() => {
    if (this.searchQuery().trim()) {
      return this.searchResults();
    }

    return this.filteredSources();
  });
  readonly visibleEntries = computed<LibraryListEntry[]>(() =>
    this.visibleSources().map((source) => ({
      source,
      iconName: this.sourceTypeIcon(source.sourceType),
      primaryMeta: this.buildPrimaryMeta(source),
      secondaryMeta: this.buildSecondaryMeta(source),
      peopleSummary: this.buildPeopleSummary(source.id, source.title),
    })),
  );
  readonly emptyTitle = computed(() => {
    if (this.searchQuery().trim()) {
      return 'No matching sources';
    }

    return 'Your library is empty';
  });
  readonly emptyMessage = computed(() => {
    if (this.searchQuery().trim()) {
      return 'Try a broader search term, or add a new source to start the workflow.';
    }

    return 'Add a source to start reading and your active items will appear here.';
  });

  async ionViewWillEnter(): Promise<void> {
    await this.menuController.enable(true, 'main-menu');
    await this.workflow.reload();
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  openNewSource(): void {
    void this.router.navigate(['/worldview', 'sources', 'new']);
  }

  openSource(sourceId: string): void {
    void this.router.navigate(['/worldview', 'sources', sourceId]);
  }

  async openSourceMetadata(event: Event, sourceId: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = await this.modalController.create({
      component: SourceMetadataSheetComponent,
      componentProps: { sourceId },
      breakpoints: [0, 0.6, 0.82, 0.96],
      initialBreakpoint: 0.82,
      backdropDismiss: true,
      expandToScroll: false,
      handle: true,
      handleBehavior: 'cycle',
      cssClass: 'km-source-metadata-modal',
    });

    await modal.present();
  }

  trackEntry(index: number, entry: LibraryListEntry): string {
    return entry.source.id;
  }

  private sourceUnitCount(sourceId: string): number {
    return this.workflow.getUnitsForSource(sourceId).length;
  }

  private sourceNoteCount(sourceId: string): number {
    return this.workflow.getSourceNotesCount(sourceId);
  }

  private buildPrimaryMeta(source: KmapsSource): string {
    return source.creator || source.subtitle || source.publisher || this.sourceTypeLabel(source.sourceType);
  }

  private buildSecondaryMeta(source: KmapsSource): string {
    const meta: string[] = [this.sourceTypeLabel(source.sourceType)];
    const noteCount = this.sourceNoteCount(source.id);
    const unitCount = this.sourceUnitCount(source.id);

    if (noteCount > 0) {
      meta.push(`${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`);
    } else if (unitCount > 0) {
      meta.push(`${unitCount} ${unitCount === 1 ? 'unit' : 'units'}`);
    }

    if (source.progressPercent > 0) {
      meta.push(`${source.progressPercent}%`);
    }

    return meta.join(' · ');
  }

  private buildPeopleSummary(sourceId: string, sourceTitle: string): LibraryPeopleSummary | null {
    const contributors = this.workflow.getContributorsForSource(sourceId);
    if (!contributors.length) {
      return null;
    }

    return {
      initials: this.personInitials(contributors[0]),
      moreLabel: contributors.length > 1 ? `+${contributors.length - 1}` : null,
      ariaLabel: `Open people, publication, and details for ${sourceTitle}`,
    };
  }

  private sourceTypeIcon(sourceType: KmapsSourceType): string {
    const iconMap: Record<KmapsSourceType, string> = {
      book: 'book-outline',
      article: 'document-text-outline',
      lecture: 'school-outline',
      podcast: 'mic-outline',
      video: 'videocam-outline',
      story: 'albums-outline',
      paper: 'newspaper-outline',
      conversation: 'chatbubble-ellipses-outline',
      document: 'reader-outline',
      other: 'library-outline',
    };

    return iconMap[sourceType] || 'library-outline';
  }

  private sourceTypeLabel(sourceType: KmapsSourceType): string {
    return formatSourceTypeLabel(sourceType);
  }

  private personInitials(contributor: KmapsSourceContributor): string {
    return contributor.person.displayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}

function compareByRecency(leftValue: string | null | undefined, rightValue: string | null | undefined): number {
  return toTimestamp(leftValue) - toTimestamp(rightValue);
}

function toTimestamp(value: string | null | undefined): number {
  const timestamp = Date.parse(value ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}
