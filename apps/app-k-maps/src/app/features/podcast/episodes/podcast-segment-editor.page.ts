import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RefresherCustomEvent, ToastController } from '@ionic/angular';
import {
  addOutline,
  checkmarkCircleOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  CreatorChecklistItem,
  CreatorDialogueItem,
  CreatorEpisode,
  CreatorEpisodeSegment,
  CreatorEpisodeType,
  CreatorTalkingPoint,
  createChecklistItem,
  createDialogueItem,
  createTalkingPoint,
} from './podcast-builder.models';
import { PodcastBuilderService } from './podcast-builder.service';
import { PodcastUsersService } from './podcast-users.service';

@Component({
  selector: 'app-podcast-segment-editor-page',
  standalone: false,
  templateUrl: './podcast-segment-editor.page.html',
  styleUrl: './podcast-segment-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastSegmentEditorPage {
  readonly icons = {
    addOutline,
    checkmarkCircleOutline,
    timeOutline,
    trashOutline,
  };

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastController = inject(ToastController);
  private readonly builder = inject(PodcastBuilderService);
  private readonly users = inject(PodcastUsersService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly episode = signal<CreatorEpisode | null>(null);
  readonly segmentIndex = signal(-1);
  readonly talkingPointDurationOptions = [1, 2, 3, 5, 10] as const;
  readonly talkingPointInitials = signal<Record<number, string>>({});

  readonly form = this.formBuilder.group({
    dialogueItems: this.formBuilder.array([]),
    talkingPoints: this.formBuilder.array([]),
    doneItems: this.formBuilder.array([]),
  });

  constructor() {
    void this.loadTalkingPointUsers();

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
    return this.currentSegment()?.title ?? 'Segment';
  }

  get backHref(): string {
    return this.episode() ? `/podcast/${this.episode()!.id}` : '/podcast';
  }

  get detailSectionTitle(): string {
    if (this.isDiscussion()) {
      return 'Dialogue Prompts';
    }

    if (this.isLessonLog()) {
      return 'Covered Points';
    }

    return 'Talking Points';
  }

  get detailFormArrayName(): 'dialogueItems' | 'talkingPoints' | 'doneItems' {
    if (this.isDiscussion()) {
      return 'dialogueItems';
    }

    if (this.isLessonLog()) {
      return 'doneItems';
    }

    return 'talkingPoints';
  }

  get detailControls(): AbstractControl[] {
    return this.detailItems.controls;
  }

  get addDetailLabel(): string {
    if (this.isDiscussion()) {
      return 'Add prompt';
    }

    if (this.isLessonLog()) {
      return 'Add covered point';
    }

    return 'Add talking point';
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

  isDiscussion(): boolean {
    return this.episode()?.type === 'discussion';
  }

  isLessonLog(): boolean {
    return this.episode()?.type === 'lesson_log';
  }

  get detailItems(): FormArray {
    if (this.isDiscussion()) {
      return this.dialogueItems;
    }

    if (this.isLessonLog()) {
      return this.doneItems;
    }

    return this.talkingPoints;
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

  trackDetail(index: number, control: AbstractControl): string {
    return String(control.get('id')?.value ?? index);
  }

  detailItemPlaceholder(index: number): string {
    if (this.isDiscussion()) {
      return `Prompt ${index + 1}`;
    }

    if (this.isLessonLog()) {
      return `Covered point ${index + 1}`;
    }

    return `Talking point ${index + 1}`;
  }

  detailItemLabel(index: number): string {
    if (this.isDiscussion()) {
      return `prompt ${index + 1}`;
    }

    if (this.isLessonLog()) {
      return `covered point ${index + 1}`;
    }

    return `talking point ${index + 1}`;
  }

  detailOwnerInitial(control: AbstractControl): string | null {
    if (this.detailFormArrayName !== 'talkingPoints') {
      return null;
    }

    if (!this.showResponsibleInitials()) {
      return null;
    }

    const userId = toNullableInteger(control.get('userId')?.value);
    if (userId === null) {
      return null;
    }

    return this.talkingPointInitials()[userId] ?? 'U';
  }

  detailDurationLabel(control: AbstractControl): string | null {
    if (this.detailFormArrayName !== 'talkingPoints') {
      return null;
    }

    const durationMin = toNullableInteger(control.get('durationMin')?.value) ?? 1;
    return `${durationMin}m`;
  }

  detailDurationValue(control: AbstractControl): number | null {
    if (this.detailFormArrayName !== 'talkingPoints') {
      return null;
    }

    return toNullableInteger(control.get('durationMin')?.value) ?? 1;
  }

  cycleDetailDuration(control: AbstractControl): void {
    if (this.detailFormArrayName !== 'talkingPoints') {
      return;
    }

    const current = toNullableInteger(control.get('durationMin')?.value) ?? this.talkingPointDurationOptions[0];
    const currentIndex = this.talkingPointDurationOptions.indexOf(current as typeof this.talkingPointDurationOptions[number]);
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % this.talkingPointDurationOptions.length
      : 0;
    control.get('durationMin')?.setValue(this.talkingPointDurationOptions[nextIndex]);
  }

  addDetailItem(): void {
    if (this.isDiscussion()) {
      this.addDialogueItem();
      return;
    }

    if (this.isLessonLog()) {
      this.addDoneItem();
      return;
    }

    this.addTalkingPoint();
  }

  deleteDetailItem(index: number): void {
    if (this.isDiscussion()) {
      this.deleteDialogue(index);
      return;
    }

    if (this.isLessonLog()) {
      this.deleteDoneItem(index);
      return;
    }

    this.deleteTalkingPoint(index);
  }

  reorderDetailItems(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    if (this.isDiscussion()) {
      this.reorderDialogueItems(event);
      return;
    }

    if (this.isLessonLog()) {
      this.reorderDoneItems(event);
      return;
    }

    this.reorderTalkingPoints(event);
  }

  addDialogueItem(): void {
    this.dialogueItems.push(this.createDialogueGroup(createDialogueItem(this.dialogueItems.length)));
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

  deleteDoneItem(index: number): void {
    this.doneItems.removeAt(index);
    normalizeFormArrayOrder(this.doneItems);
  }

  reorderDoneItems(event: CustomEvent<{ from: number; to: number; complete: () => void }>): void {
    reorderFormArray(this.doneItems, event.detail.from, event.detail.to);
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
      const nextIndex = saved.segments.findIndex((segment: CreatorEpisodeSegment) => segment.id === segmentId);
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

  async deleteCurrentSegment(): Promise<void> {
    const episode = this.episode();
    const currentSegment = this.currentSegment();
    if (!episode || !currentSegment || this.saving()) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      draft.segments = draft.segments.filter((segment: CreatorEpisodeSegment) => segment.id !== currentSegment.id);
      normalizeSegments(draft.segments, draft.id);
    });

    this.saving.set(true);

    try {
      await this.builder.saveEpisode(next);
      await this.presentToast('Section deleted.');
      await this.router.navigate(['/podcast', episode.id], { replaceUrl: true });
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Unable to delete section.');
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

    try {
      const episode = await this.builder.getEpisode(episodeId);
      const index = episode.segments.findIndex((segment: CreatorEpisodeSegment) => segment.id === segmentId);
      if (index < 0) {
        const fallbackSegment = episode.segments[0];
        if (!fallbackSegment) {
          throw new Error('Segment not found.');
        }

        this.episode.set(episode);
        this.segmentIndex.set(0);
        this.patchForm(fallbackSegment);
        await this.router.navigate(['/podcast', episode.id, 'segments', fallbackSegment.id], { replaceUrl: true });
        return;
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

  private async loadTalkingPointUsers(): Promise<void> {
    try {
      const users = await firstValueFrom(this.users.list());
      this.talkingPointInitials.set(
        users.reduce<Record<number, string>>((accumulator, user) => {
          const initial = readInitial(user.login, user.username, user.email);
          if (initial) {
            accumulator[user.id] = initial;
          }
          return accumulator;
        }, {})
      );
    } catch {
      this.talkingPointInitials.set({});
    }
  }

  private patchForm(segment: CreatorEpisodeSegment): void {
    replaceFormArray(this.dialogueItems, segment.dialogueItems.map((item: CreatorDialogueItem) => this.createDialogueGroup(item)));
    replaceFormArray(this.talkingPoints, segment.talkingPoints.map((item: CreatorTalkingPoint) => this.createTalkingPointGroup(item)));
    replaceFormArray(this.doneItems, segment.doneItems.map((item: CreatorChecklistItem) => this.createChecklistGroup(item)));
  }

  private buildSegment(currentSegment: CreatorEpisodeSegment, episodeType: CreatorEpisodeType): CreatorEpisodeSegment {
    const dialogueItems = buildDialogueItems(this.dialogueItems, currentSegment);
    const talkingPoints = buildTalkingPoints(this.talkingPoints, currentSegment);
    const doneItems = buildChecklistItems(this.doneItems, currentSegment.doneItems, currentSegment.id, 'done');

    return {
      ...currentSegment,
      dialogueItems: episodeType === 'discussion' ? dialogueItems : currentSegment.dialogueItems,
      talkingPoints: episodeType === 'solo' ? talkingPoints : currentSegment.talkingPoints,
      doneItems: episodeType === 'lesson_log' ? doneItems : currentSegment.doneItems,
      reviewItems: currentSegment.reviewItems,
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
      durationMin: [item.durationMin ?? 1],
      userId: [item.userId ?? null],
      order: [item.order],
    });
  }

  private showResponsibleInitials(): boolean {
    const userIds = this.talkingPoints.controls
      .map((control) => toNullableInteger(control.get('userId')?.value))
      .filter((value): value is number => value !== null);

    return new Set(userIds).size > 1;
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

function toNullableInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function readInitial(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const match = String(value ?? '').trim().match(/[A-Za-z0-9]/);
    if (match) {
      return match[0].toUpperCase();
    }
  }

  return 'U';
}

function buildDialogueItems(target: FormArray, currentSegment: CreatorEpisodeSegment): CreatorDialogueItem[] {
  return target.controls
    .map((control, index): CreatorDialogueItem | null => {
      const text = String(control.get('text')?.value ?? '').trim();
      if (!text) {
        return null;
      }

      return {
        id: String(control.get('id')?.value ?? currentSegment.dialogueItems[index]?.id ?? `${currentSegment.id}-dialogue-${index + 1}`),
        text,
        speaker: (control.get('speaker')?.value as CreatorDialogueItem['speaker'] | null) ?? currentSegment.dialogueItems[index]?.speaker ?? 'host',
        cue: String(control.get('cue')?.value ?? currentSegment.dialogueItems[index]?.cue ?? '').trim(),
        order: index,
      };
    })
    .filter((item): item is CreatorDialogueItem => item !== null);
}

function buildTalkingPoints(target: FormArray, currentSegment: CreatorEpisodeSegment): CreatorTalkingPoint[] {
  return target.controls
    .map((control, index): CreatorTalkingPoint | null => {
      const text = String(control.get('text')?.value ?? '').trim();
      if (!text) {
        return null;
      }

      return {
        id: String(control.get('id')?.value ?? currentSegment.talkingPoints[index]?.id ?? `${currentSegment.id}-point-${index + 1}`),
        text,
        tone: (control.get('tone')?.value as CreatorTalkingPoint['tone'] | null) ?? currentSegment.talkingPoints[index]?.tone ?? '',
        durationMin: toNullableInteger(control.get('durationMin')?.value) ?? currentSegment.talkingPoints[index]?.durationMin ?? 1,
        userId: toNullableInteger(control.get('userId')?.value) ?? currentSegment.talkingPoints[index]?.userId ?? null,
        order: index,
      };
    })
    .filter((item): item is CreatorTalkingPoint => item !== null);
}

function buildChecklistItems(
  target: FormArray,
  currentItems: CreatorChecklistItem[],
  segmentId: string,
  prefix: 'done' | 'review',
): CreatorChecklistItem[] {
  return target.controls
    .map((control, index) => {
      const text = String(control.get('text')?.value ?? '').trim();
      if (!text) {
        return null;
      }

      const source = currentItems[index];
      return {
        id: String(control.get('id')?.value ?? source?.id ?? `${segmentId}-${prefix}-${index + 1}`),
        text,
        order: index,
      };
    })
    .filter((item): item is CreatorChecklistItem => item !== null);
}
