import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

import {
  KmapsMetaItem,
  KmapsSourceContributor,
  formatSourcePersonRoleLabel,
  formatSourceTypeLabel,
} from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

type SourceMetadataTabKey = 'people' | 'publication' | 'details';

@Component({
  selector: 'app-source-metadata-sheet',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './source-metadata-sheet.html',
  styleUrl: './source-metadata-sheet.scss',
})
export class SourceMetadataSheetComponent {
  private readonly modalController = inject(ModalController);
  private readonly workflow = inject(KmapsWorkflowService);

  @Input({ required: true }) sourceId = '';

  readonly activeTab = signal<SourceMetadataTabKey>('people');
  readonly source = computed(() => this.workflow.getSource(this.sourceId));
  readonly contributors = computed(() => this.workflow.getContributorsForSource(this.sourceId));
  readonly publicationItems = computed(() => this.workflow.getPublicationMetaForSource(this.sourceId));
  readonly detailItems = computed(() => this.workflow.getDescriptiveMetaForSource(this.sourceId));
  readonly subtitle = computed(() => {
    const source = this.source();
    if (!source) {
      return '';
    }

    return [formatSourceTypeLabel(source.sourceType), source.publicationYear ? String(source.publicationYear) : null]
      .filter(Boolean)
      .join(' • ');
  });

  setTab(value: string | number | null | undefined): void {
    if (value === 'people' || value === 'publication' || value === 'details') {
      this.activeTab.set(value);
    }
  }

  close(): Promise<boolean> {
    return this.modalController.dismiss(null, 'close');
  }

  contributorTrack(_: number, contributor: KmapsSourceContributor): string {
    return `${contributor.person.id}:${contributor.role}:${contributor.orderIndex}`;
  }

  metaTrack(_: number, item: KmapsMetaItem): string {
    return `${item.label}:${item.value}`;
  }

  contributorInitials(contributor: KmapsSourceContributor): string {
    return initials(contributor.person.displayName);
  }

  roleLabel(role: KmapsSourceContributor['role']): string {
    return formatSourcePersonRoleLabel(role);
  }
}

function initials(value: string): string {
  return value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
