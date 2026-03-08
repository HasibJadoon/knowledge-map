import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  RefresherCustomEvent,
  ToastController,
} from '@ionic/angular';
import {
  CREATOR_EPISODE_STATUSES,
  CreatorEpisode,
  CreatorEpisodeStatus,
  CreatorEpisodeType,
  episodeStatusLabel,
  episodeTypeLabel,
} from './podcast-builder.models';
import { PodcastBuilderService } from './podcast-builder.service';

const PODCAST_ALERT_CLASS = 'km-overlay-alert';
const PODCAST_SHEET_CLASS = 'km-overlay-action-sheet';
const PODCAST_STATUS_FILTER_SHEET_CLASS = 'podcast-status-filter-sheet';

@Component({
  selector: 'app-podcast-episodes',
  standalone: false,
  templateUrl: './podcast-episodes.page.html',
  styleUrl: './podcast-episodes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastEpisodesPage {
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly builder = inject(PodcastBuilderService);

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly episodes = signal<CreatorEpisode[]>([]);
  readonly query = signal('');
  readonly statusFilter = signal<CreatorEpisodeStatus | 'all'>('all');

  readonly statusOptions = CREATOR_EPISODE_STATUSES;

  constructor() {
    void this.loadEpisodes();
  }

  get statusLabel(): string {
    const filter = this.statusFilter();
    return filter === 'all' ? 'All Statuses' : episodeStatusLabel(filter);
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.loadEpisodes();
    event.target.complete();
  }

  onQueryInput(value: string | null | undefined): void {
    this.query.set((value ?? '').replace(/^\s+/, ''));
    void this.loadEpisodes();
  }

  trackEpisode(_: number, episode: CreatorEpisode): string {
    return episode.id;
  }

  openEpisode(id: string): void {
    void this.router.navigate(['/podcast', id]);
  }

  async retry(): Promise<void> {
    await this.loadEpisodes();
  }

  async openStatusFilter(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      cssClass: [PODCAST_SHEET_CLASS, PODCAST_STATUS_FILTER_SHEET_CLASS],
      header: 'Filter Episodes',
      buttons: [
        {
          text: 'All Statuses',
          icon: 'albums-outline',
          handler: () => {
            this.statusFilter.set('all');
            void this.loadEpisodes();
          },
        },
        ...this.statusOptions.map((status) => ({
          text: episodeStatusLabel(status),
          icon: this.statusFilter() === status ? 'checkmark-outline' : 'ellipse-outline',
          handler: () => {
            this.statusFilter.set(status);
            void this.loadEpisodes();
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

  async startCreateEpisode(): Promise<void> {
    if (this.creating()) {
      return;
    }

    const alert = await this.alertController.create({
      cssClass: PODCAST_ALERT_CLASS,
      header: 'New Episode',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Episode title',
          attributes: {
            maxlength: 180,
          },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Next',
          handler: (value) => {
            const title = String(value?.title ?? '').trim();
            if (!title) {
              void this.presentToast('Episode title is required.');
              return false;
            }

            void this.chooseEpisodeType(title);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async loadEpisodes(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const items = await this.builder.listEpisodes(this.query(), this.statusFilter());
      this.episodes.set(items);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load episodes.');
      this.episodes.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async chooseEpisodeType(title: string): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      cssClass: PODCAST_SHEET_CLASS,
      header: 'Episode Type',
      buttons: [
        {
          text: 'Multi',
          icon: 'people-outline',
          handler: () => {
            void this.createEpisode(title, 'discussion');
          },
        },
        {
          text: 'Solo',
          icon: 'mic-outline',
          handler: () => {
            void this.createEpisode(title, 'solo');
          },
        },
        {
          text: 'Lesson',
          icon: 'library-outline',
          handler: () => {
            void this.createEpisode(title, 'lesson_log');
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

  private async createEpisode(title: string, type: CreatorEpisodeType): Promise<void> {
    if (this.creating()) {
      return;
    }

    this.creating.set(true);

    try {
      const episode = await this.builder.createEpisode(title, type);
      await this.router.navigate(['/podcast', episode.id]);
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Unable to create episode.');
    } finally {
      this.creating.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }
}
