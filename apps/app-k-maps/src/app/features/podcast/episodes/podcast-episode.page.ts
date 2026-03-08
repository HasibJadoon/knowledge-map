import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  RefresherCustomEvent,
  ToastController,
} from '@ionic/angular';
import { documentTextOutline, listOutline, paperPlaneOutline } from 'ionicons/icons';
import { IconTabItem } from '../../../shared/components/icon-tabs/icon-tabs.component';
import {
  CREATOR_EPISODE_STATUSES,
  CreatorEpisode,
  CreatorEpisodeSegment,
  CreatorEpisodeStatus,
  CreatorSpeaker,
  CreatorEpisodeType,
  createSegment,
  duplicateSegment,
  episodeStatusLabel,
  episodeTypeLabel,
  lessonStateLabel,
  speakerLabel,
} from './podcast-builder.models';
import { PodcastBuilderService } from './podcast-builder.service';

type EpisodeTab = 'segments' | 'review' | 'publish' | 'output';

const STANDARD_TABS: EpisodeTab[] = ['segments', 'review', 'publish'];
const LESSON_TABS: EpisodeTab[] = ['segments', 'review', 'output'];
const PODCAST_ALERT_CLASS = 'km-overlay-alert';
const PODCAST_SHEET_CLASS = 'km-overlay-action-sheet';

@Component({
  selector: 'app-podcast-episode-page',
  standalone: false,
  templateUrl: './podcast-episode.page.html',
  styleUrl: './podcast-episode.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastEpisodePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly formBuilder = inject(FormBuilder);
  private readonly builder = inject(PodcastBuilderService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly episode = signal<CreatorEpisode | null>(null);
  readonly activeTab = signal<EpisodeTab>('segments');

  readonly form = this.formBuilder.nonNullable.group({
    videoTitle: '',
    description: '',
    tags: '',
    thumbnailNote: '',
    estimatedDuration: '',
    categoryOrPlaylist: '',
    publishStatus: '',
    hookLine: '',
    cta: '',
    endScreenNote: '',
    lessonSummary: '',
    exportNotes: '',
    reviewChecklist: '',
    nextSessionPrep: '',
  });

  readonly tabs = computed(() => this.isLessonLog() ? LESSON_TABS : STANDARD_TABS);
  readonly workspaceTabs = computed<ReadonlyArray<IconTabItem>>(() => this.isLessonLog()
    ? [
        { key: 'segments', label: 'Segments', icon: listOutline },
        { key: 'review', label: 'Review', icon: documentTextOutline },
        { key: 'output', label: 'Output', icon: paperPlaneOutline },
      ]
    : [
        { key: 'segments', label: 'Segments', icon: listOutline },
        { key: 'review', label: 'Review', icon: documentTextOutline },
        { key: 'publish', label: 'Publish', icon: paperPlaneOutline },
      ]);
  readonly reviewChecklistItems = computed(() => splitLines(this.form.controls.reviewChecklist.value));
  readonly nextSessionItems = computed(() => splitLines(this.form.controls.nextSessionPrep.value));

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const episodeId = params.get('id');
      if (!episodeId) {
        this.error.set('Episode not found.');
        this.loading.set(false);
        return;
      }

      void this.loadEpisode(episodeId);
    });
  }

  get title(): string {
    return this.episode()?.title ?? 'Episode';
  }

  get typeLabel(): string {
    const episode = this.episode();
    return episode ? episodeTypeLabel(episode.type) : 'Episode';
  }

  get statusLabel(): string {
    const episode = this.episode();
    return episode ? episodeStatusLabel(episode.status) : 'Draft';
  }

  get segmentCountLabel(): string {
    const count = this.episode()?.segments.length ?? 0;
    return `${count} ${count === 1 ? 'segment' : 'segments'}`;
  }

  get durationLabel(): string {
    const duration = this.episode()?.estimatedDuration;
    return duration ? `${duration} min` : 'Duration open';
  }

  get updatedLabel(): string {
    const value = this.episode()?.updatedAt ?? this.episode()?.createdAt ?? '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  }

  isLessonLog(): boolean {
    return this.episode()?.type === 'lesson_log';
  }

  trackSegment(_: number, segment: CreatorEpisodeSegment): string {
    return segment.id;
  }

  changeTab(value: string | number | null | undefined): void {
    if (value === 'segments' || value === 'review' || value === 'publish' || value === 'output') {
      this.activeTab.set(value);
    }
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    const episodeId = this.episode()?.id;
    if (episodeId) {
      await this.loadEpisode(episodeId);
    }
    event.target.complete();
  }

  openSegment(segmentId: string): void {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    void this.router.navigate(['/podcast', episode.id, 'segments', segmentId]);
  }

  async retry(): Promise<void> {
    const episodeId = this.route.snapshot.paramMap.get('id');
    if (episodeId) {
      await this.loadEpisode(episodeId);
    }
  }

  async openActions(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      cssClass: PODCAST_SHEET_CLASS,
      header: episode.title,
      buttons: [
        {
          text: 'Rename Episode',
          icon: 'create-outline',
          handler: () => {
            void this.renameEpisode();
          },
        },
        {
          text: 'Change Status',
          icon: 'flag-outline',
          handler: () => {
            void this.pickStatus();
          },
        },
        {
          text: this.isLessonLog() ? 'Save Output' : 'Save Publish',
          icon: 'save-outline',
          handler: () => {
            void this.saveCurrentTab();
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async addSegment(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      draft.segments = [...draft.segments, createSegment(draft.type, draft.id, draft.segments.length)];
      normalizeSegments(draft.segments, draft.id);
    });

    await this.persistEpisode(next);
  }

  async duplicateSegment(segmentId: string): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      const index = draft.segments.findIndex((segment) => segment.id === segmentId);
      if (index < 0) {
        return;
      }

      const clone = duplicateSegment(draft.segments[index], index + 1);
      draft.segments.splice(index + 1, 0, clone);
      normalizeSegments(draft.segments, draft.id);
    });

    await this.persistEpisode(next);
  }

  async confirmDeleteSegment(segmentId: string): Promise<void> {
    const alert = await this.alertController.create({
      cssClass: PODCAST_ALERT_CLASS,
      header: 'Delete Segment',
      message: 'Remove this segment from the episode?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.deleteSegment(segmentId);
          },
        },
      ],
    });

    await alert.present();
  }

  async reorderSegments(event: CustomEvent<{ from: number; to: number; complete: () => void }>): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      event.detail.complete();
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      draft.segments = reorderCollection(draft.segments, event.detail.from, event.detail.to);
      normalizeSegments(draft.segments, draft.id);
    });

    event.detail.complete();
    await this.persistEpisode(next);
  }

  async saveCurrentTab(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      if (draft.type === 'lesson_log') {
        draft.output = {
          lessonSummary: this.form.controls.lessonSummary.value.trim(),
          exportNotes: this.form.controls.exportNotes.value.trim(),
          reviewChecklist: this.form.controls.reviewChecklist.value.trim(),
          nextSessionPrep: this.form.controls.nextSessionPrep.value.trim(),
        };
        return;
      }

      draft.publish = {
        videoTitle: this.form.controls.videoTitle.value.trim(),
        description: this.form.controls.description.value,
        tags: this.form.controls.tags.value.trim(),
        thumbnailNote: this.form.controls.thumbnailNote.value.trim(),
        estimatedDuration: this.form.controls.estimatedDuration.value.trim(),
        categoryOrPlaylist: this.form.controls.categoryOrPlaylist.value.trim(),
        publishStatus: this.form.controls.publishStatus.value.trim(),
        hookLine: this.form.controls.hookLine.value.trim(),
        cta: this.form.controls.cta.value.trim(),
        endScreenNote: this.form.controls.endScreenNote.value.trim(),
      };
    });

    await this.persistEpisode(next, this.isLessonLog() ? 'Output saved.' : 'Publish details saved.');
  }

  async copyOutline(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    await this.copyText(buildEpisodeOutline(episode), 'Outline copied.');
  }

  async copyDescription(): Promise<void> {
    await this.copyText(this.form.controls.description.value.trim(), 'Description copied.');
  }

  async copyTags(): Promise<void> {
    await this.copyText(this.form.controls.tags.value.trim(), 'Tags copied.');
  }

  lessonStateText(segment: CreatorEpisodeSegment): string {
    return lessonStateLabel(segment.lessonState);
  }

  dialogueSpeaker(speaker: CreatorSpeaker): string {
    return speakerLabel(speaker);
  }

  hasReviewContent(segment: CreatorEpisodeSegment): boolean {
    return segment.reviewItems.length > 0;
  }

  private async loadEpisode(episodeId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const episode = await this.builder.getEpisode(episodeId);
      this.episode.set(episode);
      this.patchForm(episode);
      if (this.activeTab() === 'publish' && episode.type === 'lesson_log') {
        this.activeTab.set('output');
      }
      if (this.activeTab() === 'output' && episode.type !== 'lesson_log') {
        this.activeTab.set('publish');
      }
    } catch (error: unknown) {
      this.episode.set(null);
      this.error.set(error instanceof Error ? error.message : 'Unable to load episode.');
    } finally {
      this.loading.set(false);
    }
  }

  private patchForm(episode: CreatorEpisode): void {
    this.form.reset({
      videoTitle: episode.publish.videoTitle,
      description: episode.publish.description,
      tags: episode.publish.tags,
      thumbnailNote: episode.publish.thumbnailNote,
      estimatedDuration: episode.publish.estimatedDuration || (episode.estimatedDuration ? `${episode.estimatedDuration} min` : ''),
      categoryOrPlaylist: episode.publish.categoryOrPlaylist,
      publishStatus: episode.publish.publishStatus,
      hookLine: episode.publish.hookLine,
      cta: episode.publish.cta,
      endScreenNote: episode.publish.endScreenNote,
      lessonSummary: episode.output.lessonSummary,
      exportNotes: episode.output.exportNotes,
      reviewChecklist: episode.output.reviewChecklist,
      nextSessionPrep: episode.output.nextSessionPrep,
    });
  }

  private async renameEpisode(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const alert = await this.alertController.create({
      cssClass: PODCAST_ALERT_CLASS,
      header: 'Rename Episode',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: episode.title,
          placeholder: 'Episode title',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (value) => {
            const title = String(value?.title ?? '').trim();
            if (!title) {
              void this.presentToast('Episode title is required.');
              return false;
            }

            const next = this.builder.updateEpisode(episode, (draft) => {
              draft.title = title;
              if (!draft.publish.videoTitle || draft.publish.videoTitle === episode.title) {
                draft.publish.videoTitle = title;
              }
            });
            void this.persistEpisode(next, 'Episode renamed.');
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async pickStatus(): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      cssClass: PODCAST_SHEET_CLASS,
      header: 'Set Status',
      buttons: [
        ...CREATOR_EPISODE_STATUSES.map((status) => ({
          text: episodeStatusLabel(status),
          icon: episode.status === status ? 'checkmark-outline' : 'ellipse-outline',
          handler: () => {
            const next = this.builder.updateEpisode(episode, (draft) => {
              draft.status = status;
            });
            void this.persistEpisode(next, 'Status updated.');
          },
        })),
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  private async deleteSegment(segmentId: string): Promise<void> {
    const episode = this.episode();
    if (!episode) {
      return;
    }

    const next = this.builder.updateEpisode(episode, (draft) => {
      draft.segments = draft.segments.filter((segment) => segment.id !== segmentId);
      normalizeSegments(draft.segments, draft.id);
    });

    await this.persistEpisode(next);
  }

  private async persistEpisode(next: CreatorEpisode, successMessage?: string): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);

    try {
      const saved = await this.builder.saveEpisode(next);
      this.episode.set(saved);
      this.patchForm(saved);
      if (successMessage) {
        await this.presentToast(successMessage);
      }
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Unable to save episode.');
    } finally {
      this.saving.set(false);
    }
  }

  private async copyText(text: string, successMessage: string): Promise<void> {
    if (!text.trim()) {
      await this.presentToast('Nothing to copy yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      await this.presentToast(successMessage);
    } catch {
      await this.presentToast('Unable to access the clipboard.');
    }
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

function normalizeSegments(segments: CreatorEpisodeSegment[], episodeId: string): void {
  segments.forEach((segment, index) => {
    segment.order = index;
    segment.episodeId = episodeId;
  });
}

function reorderCollection<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildEpisodeOutline(episode: CreatorEpisode): string {
  if (episode.type === 'discussion') {
    return episode.segments
      .map((segment) => [
        segment.title,
        ...segment.dialogueItems.map((item) => `${speakerLabel(item.speaker)} — ${item.text}${item.cue ? ` (${item.cue})` : ''}`),
      ].join('\n'))
      .join('\n\n');
  }

  if (episode.type === 'lesson_log') {
    return episode.segments
      .map((segment) => [
        segment.title,
        ...segment.doneItems.map((item) => `Covered • ${item.text}`),
        ...segment.reviewItems.map((item) => `Review • ${item.text}`),
      ].join('\n'))
      .join('\n\n');
  }

  return episode.segments
    .map((segment) => [
      segment.title,
      ...segment.talkingPoints.map((item) => `• ${item.text}`),
    ].join('\n'))
    .join('\n\n');
}
