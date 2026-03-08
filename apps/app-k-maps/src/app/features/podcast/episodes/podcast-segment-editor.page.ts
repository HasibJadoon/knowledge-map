import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RefresherCustomEvent, ToastController } from '@ionic/angular';
import {
  CreatorChecklistItem,
  CreatorDialogueItem,
  CreatorEpisode,
  CreatorEpisodeSegment,
  CreatorEpisodeType,
  CreatorTalkingPoint,
  CreatorTalkingPointTone,
  createChecklistItem,
  createDialogueItem,
  createTalkingPoint,
  duplicateChecklistItem,
  duplicateDialogueItem,
  duplicateTalkingPoint,
} from './podcast-builder.models';
import { PodcastBuilderService } from './podcast-builder.service';

type SegmentTab = 'overview' | 'dialogue' | 'talking_points' | 'done' | 'review' | 'notes' | 'source';

const DISCUSSION_TABS: ReadonlyArray<{ key: SegmentTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'dialogue', label: 'Dialogue' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
];

const SOLO_TABS: ReadonlyArray<{ key: SegmentTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'talking_points', label: 'Talking Points' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
];

const LESSON_TABS: ReadonlyArray<{ key: SegmentTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'done', label: 'Done' },
  { key: 'review', label: 'Review' },
  { key: 'notes', label: 'Notes' },
];

@Component({
  selector: 'app-podcast-segment-editor-page',
  standalone: false,
  templateUrl: './podcast-segment-editor.page.html',
  styleUrl: './podcast-segment-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastSegmentEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastController = inject(ToastController);
  private readonly builder = inject(PodcastBuilderService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly episode = signal<CreatorEpisode | null>(null);
  readonly segmentIndex = signal(-1);
  readonly activeTab = signal<SegmentTab>('overview');

  readonly tabs = computed(() => {
    const type = this.episode()?.type;
    if (type === 'discussion') {
      return DISCUSSION_TABS;
    }

    if (type === 'lesson_log') {
      return LESSON_TABS;
    }

    return SOLO_TABS;
  });

  readonly form = this.formBuilder.group({
    title: [''],
    type: [''],
    duration: [''],
    summary: [''],
    transitionNote: [''],
    reference: [''],
    primaryReference: [''],
    secondaryReference: [''],
    brainstormIdeas: [''],
    sourceNote: [''],
    notes: [''],
    dialogueItems: this.formBuilder.array([]),
    talkingPoints: this.formBuilder.array([]),
    doneItems: this.formBuilder.array([]),
    reviewItems: this.formBuilder.array([]),
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const episodeId = params.get('episodeId');
      const segmentId = params.get('segmentId');
      if (!episodeId || !segmentId) {
        this.error.set('Segment not found.');
        this.loading.set(false);
        return;
      }

      void this.loadSegment(episodeId, segmentId);
    });
  }

  get title(): string {
    return this.form.controls.title.value?.trim() || 'Segment';
  }

  get backHref(): string {
    return this.episode() ? `/podcast/${this.episode()!.id}` : '/podcast';
  }

  get dialogueItems(): FormArray {
    return this.form.get('dialogueItems') as FormArray;
  }

  get talkingPoints(): FormArray {
    return this.form.get('talkingPoints') as FormArray;
  }

  get doneItems(): FormArray {
    return this.form.get('doneItems') as FormArray;
  }

  get reviewItems(): FormArray {
    return this.form.get('reviewItems') as FormArray;
  }

  isDiscussion(): boolean {
    return this.episode()?.type === 'discussion';
  }

  isLessonLog(): boolean {
    return this.episode()?.type === 'lesson_log';
  }

  trackIndex(index: number): number {
    return index;
  }

  changeTab(value: string | number | null | undefined): void {
    if (
      value === 'overview'
      || value === 'dialogue'
      || value === 'talking_points'
      || value === 'done'
      || value === 'review'
      || value === 'notes'
      || value === 'source'
    ) {
      this.activeTab.set(value);
    }
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    const episodeId = this.episode()?.id;
    const segmentId = this.currentSegment()?.id;
    if (episodeId && segmentId) {
      await this.loadSegment(episodeId, segmentId);
    }
    event.target.complete();
  }

  async retry(): Promise<void> {
    const episodeId = this.route.snapshot.paramMap.get('episodeId');
    const segmentId = this.route.snapshot.paramMap.get('segmentId');
    if (episodeId && segmentId) {
      await this.loadSegment(episodeId, segmentId);
    }
  }

  addDialogueItem(): void {
    this.dialogueItems.push(this.createDialogueGroup(createDialogueItem(this.dialogueItems.length)));
  }

  duplicateDialogue(index: number): void {
    const source = this.dialogueItems.at(index)?.value as CreatorDialogueItem | undefined;
    if (!source) {
      return;
    }

    this.dialogueItems.insert(index + 1, this.createDialogueGroup(duplicateDialogueItem(source, index + 1)));
    normalizeFormArrayOrder(this.dialogueItems);
  }

  deleteDialogue(index: number): void {
    this.dialogueItems.removeAt(index);
    normalizeFormArrayOrder(this.dialogueItems);
  }

  reorderDialogueItems(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    reorderFormArray(this.dialogueItems, event.detail.from, event.detail.to);
    event.detail.complete();
  }

  addTalkingPoint(): void {
    this.talkingPoints.push(this.createTalkingPointGroup(createTalkingPoint(this.talkingPoints.length)));
  }

  duplicateTalkingPoint(index: number): void {
    const source = this.talkingPoints.at(index)?.value as CreatorTalkingPoint | undefined;
    if (!source) {
      return;
    }

    this.talkingPoints.insert(index + 1, this.createTalkingPointGroup(duplicateTalkingPoint(source, index + 1)));
    normalizeFormArrayOrder(this.talkingPoints);
  }

  deleteTalkingPoint(index: number): void {
    this.talkingPoints.removeAt(index);
    normalizeFormArrayOrder(this.talkingPoints);
  }

  reorderTalkingPoints(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    reorderFormArray(this.talkingPoints, event.detail.from, event.detail.to);
    event.detail.complete();
  }

  addDoneItem(): void {
    this.doneItems.push(this.createChecklistGroup(createChecklistItem('What was covered', this.doneItems.length)));
  }

  duplicateDoneItem(index: number): void {
    const source = this.doneItems.at(index)?.value as CreatorChecklistItem | undefined;
    if (!source) {
      return;
    }

    this.doneItems.insert(index + 1, this.createChecklistGroup(duplicateChecklistItem(source, index + 1)));
    normalizeFormArrayOrder(this.doneItems);
  }

  deleteDoneItem(index: number): void {
    this.doneItems.removeAt(index);
    normalizeFormArrayOrder(this.doneItems);
  }

  reorderDoneItems(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    reorderFormArray(this.doneItems, event.detail.from, event.detail.to);
    event.detail.complete();
  }

  addReviewItem(): void {
    this.reviewItems.push(this.createChecklistGroup(createChecklistItem('What needs review', this.reviewItems.length)));
  }

  duplicateReviewItem(index: number): void {
    const source = this.reviewItems.at(index)?.value as CreatorChecklistItem | undefined;
    if (!source) {
      return;
    }

    this.reviewItems.insert(index + 1, this.createChecklistGroup(duplicateChecklistItem(source, index + 1)));
    normalizeFormArrayOrder(this.reviewItems);
  }

  deleteReviewItem(index: number): void {
    this.reviewItems.removeAt(index);
    normalizeFormArrayOrder(this.reviewItems);
  }

  reorderReviewItems(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    reorderFormArray(this.reviewItems, event.detail.from, event.detail.to);
    event.detail.complete();
  }

  async saveSegment(): Promise<void> {
    const episode = this.episode();
    const currentSegment = this.currentSegment();
    if (!episode || !currentSegment || this.segmentIndex() < 0) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      draft.segments[this.segmentIndex()] = this.buildSegment(currentSegment, draft.type);
      normalizeSegments(draft.segments, draft.id);
    });

    this.saving.set(true);

    try {
      const saved = await this.builder.saveEpisode(next);
      const segmentId = currentSegment.id;
      this.episode.set(saved);
      const nextIndex = saved.segments.findIndex((segment) => segment.id === segmentId);
      this.segmentIndex.set(nextIndex);
      if (nextIndex >= 0) {
        this.patchForm(saved.segments[nextIndex]);
      }
      await this.presentToast('Segment saved.');
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Unable to save segment.');
    } finally {
      this.saving.set(false);
    }
  }

  private currentSegment(): CreatorEpisodeSegment | null {
    const episode = this.episode();
    const index = this.segmentIndex();
    if (!episode || index < 0 || !episode.segments[index]) {
      return null;
    }

    return episode.segments[index];
  }

  private async loadSegment(episodeId: string, segmentId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.activeTab.set('overview');

    try {
      const episode = await this.builder.getEpisode(episodeId);
      const index = episode.segments.findIndex((segment) => segment.id === segmentId);
      if (index < 0) {
        throw new Error('Segment not found.');
      }

      this.episode.set(episode);
      this.segmentIndex.set(index);
      this.patchForm(episode.segments[index]);
    } catch (error: unknown) {
      this.episode.set(null);
      this.segmentIndex.set(-1);
      this.error.set(error instanceof Error ? error.message : 'Unable to load segment.');
    } finally {
      this.loading.set(false);
    }
  }

  private patchForm(segment: CreatorEpisodeSegment): void {
    this.form.patchValue({
      title: segment.title,
      type: segment.type,
      duration: segment.duration === null ? '' : String(segment.duration),
      summary: segment.summary,
      transitionNote: segment.transitionNote,
      reference: segment.reference,
      primaryReference: segment.primaryReference,
      secondaryReference: segment.secondaryReference,
      brainstormIdeas: segment.brainstormIdeas,
      sourceNote: segment.sourceNote,
      notes: segment.notes,
    });

    replaceFormArray(this.dialogueItems, segment.dialogueItems.map((item) => this.createDialogueGroup(item)));
    replaceFormArray(this.talkingPoints, segment.talkingPoints.map((item) => this.createTalkingPointGroup(item)));
    replaceFormArray(this.doneItems, segment.doneItems.map((item) => this.createChecklistGroup(item)));
    replaceFormArray(this.reviewItems, segment.reviewItems.map((item) => this.createChecklistGroup(item)));
  }

  private buildSegment(currentSegment: CreatorEpisodeSegment, episodeType: CreatorEpisodeType): CreatorEpisodeSegment {
    return {
      ...currentSegment,
      title: this.form.controls.title.value?.trim() || currentSegment.title,
      type: this.form.controls.type.value?.trim() || this.form.controls.title.value?.trim() || currentSegment.type,
      duration: toNullableNumber(this.form.controls.duration.value),
      summary: this.form.controls.summary.value?.trim() || '',
      transitionNote: this.form.controls.transitionNote.value?.trim() || '',
      reference: this.form.controls.reference.value?.trim() || '',
      primaryReference: this.form.controls.primaryReference.value?.trim() || '',
      secondaryReference: this.form.controls.secondaryReference.value?.trim() || '',
      brainstormIdeas: this.form.controls.brainstormIdeas.value?.trim() || '',
      sourceNote: this.form.controls.sourceNote.value?.trim() || '',
      notes: this.form.controls.notes.value || '',
      dialogueItems: episodeType === 'discussion'
        ? this.dialogueItems.controls.map((control, index) => ({
            id: String(control.get('id')?.value ?? ''),
            text: String(control.get('text')?.value ?? '').trim(),
            speaker: String(control.get('speaker')?.value ?? 'host') as CreatorDialogueItem['speaker'],
            cue: String(control.get('cue')?.value ?? '').trim(),
            order: index,
          })).filter((item) => item.text.length > 0)
        : [],
      talkingPoints: episodeType === 'solo'
        ? this.talkingPoints.controls.map((control, index) => ({
            id: String(control.get('id')?.value ?? ''),
            text: String(control.get('text')?.value ?? '').trim(),
            tone: String(control.get('tone')?.value ?? '') as CreatorTalkingPointTone,
            order: index,
          })).filter((item) => item.text.length > 0)
        : [],
      doneItems: episodeType === 'lesson_log'
        ? this.doneItems.controls.map((control, index) => ({
            id: String(control.get('id')?.value ?? ''),
            text: String(control.get('text')?.value ?? '').trim(),
            order: index,
          })).filter((item) => item.text.length > 0)
        : [],
      reviewItems: episodeType === 'lesson_log'
        ? this.reviewItems.controls.map((control, index) => ({
            id: String(control.get('id')?.value ?? ''),
            text: String(control.get('text')?.value ?? '').trim(),
            order: index,
          })).filter((item) => item.text.length > 0)
        : [],
    };
  }

  private createDialogueGroup(item: CreatorDialogueItem): FormGroup {
    return this.formBuilder.group({
      id: [item.id],
      text: [item.text],
      speaker: [item.speaker],
      cue: [item.cue],
      order: [item.order],
    });
  }

  private createTalkingPointGroup(item: CreatorTalkingPoint): FormGroup {
    return this.formBuilder.group({
      id: [item.id],
      text: [item.text],
      tone: [item.tone],
      order: [item.order],
    });
  }

  private createChecklistGroup(item: CreatorChecklistItem): FormGroup {
    return this.formBuilder.group({
      id: [item.id],
      text: [item.text],
      order: [item.order],
    });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
    });
    await toast.present();
  }
}

function replaceFormArray(target: FormArray, groups: FormGroup[]): void {
  while (target.length) {
    target.removeAt(0);
  }

  groups.forEach((group) => target.push(group));
}

function reorderFormArray(target: FormArray, from: number, to: number): void {
  const control = target.at(from);
  if (!control) {
    return;
  }

  target.removeAt(from);
  target.insert(to, control);
  normalizeFormArrayOrder(target);
}

function normalizeFormArrayOrder(target: FormArray): void {
  target.controls.forEach((control, index) => {
    control.get('order')?.setValue(index, { emitEvent: false });
  });
}

function normalizeSegments(segments: CreatorEpisodeSegment[], episodeId: string): void {
  segments.forEach((segment, index) => {
    segment.order = index;
    segment.episodeId = episodeId;
  });
}

function toNullableNumber(value: string | null | undefined): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
