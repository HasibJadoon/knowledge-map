import { Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RefresherCustomEvent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PodcastEpisode } from '../../../shared/models/planner/sprint.models';
import { PodcastService } from '../../../shared/services/planner/podcast.service';

@Component({
  selector: 'app-planner-podcast-page',
  standalone: false,
  templateUrl: './planner-podcast.page.html',
  styleUrl: './planner-podcast.page.scss',
})
export class PlannerPodcastPage {
  private readonly podcastService = inject(PodcastService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly items = signal<PodcastEpisode[]>([]);
  readonly queryControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.queryControl.setValue(params.get('q') ?? '', { emitEvent: false });
      void this.load();
    });
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.load();
    event.target.complete();
  }

  episodeTopic(item: PodcastEpisode): string {
    const topic = this.readText(item.content_json, ['topic', 'focus', 'theme'])
      ?? this.readText(item.refs_json, ['topic', 'unit_id', 'ref']);
    return topic ?? 'No topic';
  }

  episodeSummary(item: PodcastEpisode): string {
    const value = item.content_json['summary']
      ?? item.content_json['description']
      ?? item.content_json['note']
      ?? item.content_json['outline'];

    return this.valueToText(value) ?? 'No details yet.';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  }

  openEpisode(item: PodcastEpisode): void {
    void this.router.navigate(['/podcast', item.id]);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const query = this.queryControl.value.trim();
      const rows = await firstValueFrom(this.podcastService.list(query, 80));
      this.items.set(rows);
    } catch {
      await this.presentToast('Could not load podcast episodes.');
    } finally {
      this.loading.set(false);
    }
  }

  private readText(source: Record<string, unknown> | null | undefined, keys: string[]): string | null {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      const value = this.valueToText(source[key]);
      if (value) {
        return value;
      }
    }

    return null;
  }

  private valueToText(value: unknown): string | null {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized ? normalized : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((entry) => this.valueToText(entry))
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
      return parts.length ? parts.join(', ') : null;
    }

    if (value && typeof value === 'object') {
      const preview = Object.entries(value as Record<string, unknown>)
        .slice(0, 3)
        .map(([key, entry]) => `${key}: ${this.valueToText(entry) ?? '-'}`);
      return preview.length ? preview.join(' | ') : null;
    }

    return null;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
  }
}
