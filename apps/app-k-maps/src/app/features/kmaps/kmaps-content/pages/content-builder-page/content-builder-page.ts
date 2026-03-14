import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { ContentBlockCardComponent } from '../../components/content-block-card/content-block-card';
import { EvidenceListComponent } from '../../../kmaps-distill/components/evidence-list/evidence-list';
import { KmapsGroupedSectionComponent } from '../../../kmaps-shared/components/grouped-section/grouped-section';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsContentBlockKind, KmapsContentItem, KmapsContentStatus, KmapsContentType } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-content-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    KmapsPageHeaderComponent,
    KmapsGroupedSectionComponent,
    EvidenceListComponent,
    ContentBlockCardComponent,
  ],
  templateUrl: './content-builder-page.html',
  styleUrl: './content-builder-page.scss',
})
export class ContentBuilderPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly contentId = signal('');
  readonly draftItem = signal<KmapsContentItem | null>(null);
  readonly activeBlockId = signal<string | null>(null);
  readonly blockKinds: KmapsContentBlockKind[] = ['intro', 'main_point', 'evidence', 'reflection', 'conclusion'];

  readonly evidenceItems = computed(() => this.workflow.getEvidenceItemsFromNotes(this.draftItem()?.noteIds || []));
  readonly claimSummaries = computed(() =>
    (this.draftItem()?.claimIds || [])
      .map((claimId) => this.workflow.getClaim(claimId))
      .filter((claim): claim is NonNullable<typeof claim> => claim != null),
  );

  readonly form = this.fb.nonNullable.group({
    title: '',
    contentType: this.fb.nonNullable.control<KmapsContentType>('article'),
    status: this.fb.nonNullable.control<KmapsContentStatus>('draft'),
    blockKind: this.fb.nonNullable.control<KmapsContentBlockKind>('main_point'),
    blockTitle: '',
    blockBody: '',
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      const contentId = paramMap.get('contentId');
      if (!contentId) {
        const noteIds = parseDelimitedIds(this.route.snapshot.queryParamMap.get('noteIds'));
        const claimIds = parseDelimitedIds(this.route.snapshot.queryParamMap.get('claimIds'));
        const conceptIds = parseDelimitedIds(this.route.snapshot.queryParamMap.get('conceptIds'));
        const created = this.workflow.createContentFromSelection(noteIds, claimIds, conceptIds);
        void this.router.navigate(['/worldview', 'content', created.id], { replaceUrl: true });
        return;
      }

      this.contentId.set(contentId);
      const item = this.workflow.getContentItem(contentId);
      if (!item) {
        return;
      }

      this.draftItem.set(clone(item));
      this.form.patchValue({
        title: item.title,
        contentType: item.contentType,
        status: item.status,
      });
    });
  }

  blocks(): KmapsContentItem['blocks'] {
    return (this.draftItem()?.blocks || []).slice().sort((left, right) => left.orderIndex - right.orderIndex);
  }

  selectBlock(blockId: string): void {
    const block = this.blocks().find((item) => item.id === blockId);
    if (!block) {
      return;
    }

    this.activeBlockId.set(blockId);
    this.form.patchValue({
      blockKind: block.kind,
      blockTitle: block.title,
      blockBody: block.body,
    });
  }

  upsertBlock(): void {
    const item = this.draftItem();
    if (!item) {
      return;
    }

    const blockId = this.activeBlockId();
    const nextBlocks = item.blocks.slice();

    if (blockId) {
      const index = nextBlocks.findIndex((block) => block.id === blockId);
      if (index >= 0) {
        nextBlocks[index] = {
          ...nextBlocks[index],
          kind: this.form.controls.blockKind.value,
          title: this.form.controls.blockTitle.value.trim() || 'Untitled block',
          body: this.form.controls.blockBody.value.trim(),
        };
      }
    } else {
      nextBlocks.push({
        id: createId('block'),
        kind: this.form.controls.blockKind.value,
        title: this.form.controls.blockTitle.value.trim() || 'Untitled block',
        body: this.form.controls.blockBody.value.trim(),
        orderIndex: nextBlocks.length + 1,
      });
    }

    this.draftItem.set({
      ...item,
      blocks: nextBlocks.map((block, index) => ({ ...block, orderIndex: index + 1 })),
    });
    this.activeBlockId.set(null);
    this.form.patchValue({ blockTitle: '', blockBody: '', blockKind: 'main_point' });
  }

  moveBlock(blockId: string, direction: -1 | 1): void {
    const item = this.draftItem();
    if (!item) {
      return;
    }

    const nextBlocks = this.blocks();
    const currentIndex = nextBlocks.findIndex((block) => block.id === blockId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= nextBlocks.length) {
      return;
    }

    const [current] = nextBlocks.splice(currentIndex, 1);
    nextBlocks.splice(nextIndex, 0, current);
    this.draftItem.set({
      ...item,
      blocks: nextBlocks.map((block, index) => ({ ...block, orderIndex: index + 1 })),
    });
  }

  removeBlock(blockId: string): void {
    const item = this.draftItem();
    if (!item) {
      return;
    }

    this.draftItem.set({
      ...item,
      blocks: this.blocks()
        .filter((block) => block.id !== blockId)
        .map((block, index) => ({ ...block, orderIndex: index + 1 })),
    });
    if (this.activeBlockId() === blockId) {
      this.activeBlockId.set(null);
      this.form.patchValue({ blockTitle: '', blockBody: '', blockKind: 'main_point' });
    }
  }

  async save(): Promise<void> {
    const item = this.draftItem();
    if (!item) {
      return;
    }

    const saved = this.workflow.saveContentItem({
      ...item,
      title: this.form.controls.title.value.trim(),
      contentType: this.form.controls.contentType.value,
      status: this.form.controls.status.value,
    });
    this.draftItem.set(clone(saved));

    const toast = await this.toastController.create({
      message: 'Content builder saved.',
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
  }
}

function parseDelimitedIds(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
