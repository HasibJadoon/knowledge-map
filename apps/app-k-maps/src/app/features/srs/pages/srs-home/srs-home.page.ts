import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SrsService } from '../../../../shared/services/srs/srs.service';
import {
  SRS_DECK_TYPE_COLORS,
  SRS_DECK_TYPE_LABELS,
  SrsDeckSummary,
  SrsDeckType,
  SrsStats,
} from '../../../../shared/models/srs/srs.models';

@Component({
  selector: 'app-srs-home',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './srs-home.page.html',
  styleUrl: './srs-home.page.scss',
})
export class SrsHomePage {
  private readonly srs = inject(SrsService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly decks = signal<SrsDeckSummary[]>([]);
  readonly stats = signal<SrsStats | null>(null);

  readonly totalDue = computed(() => this.stats()?.due ?? 0);

  readonly typeLabels = SRS_DECK_TYPE_LABELS;
  readonly typeColors = SRS_DECK_TYPE_COLORS;

  ionViewWillEnter(): void {
    void this.load();
  }

  async onRefresh(ev: CustomEvent): Promise<void> {
    await this.load(false);
    (ev.target as HTMLIonRefresherElement | null)?.complete();
  }

  deckColor(type: string): string {
    return this.typeColors[type as SrsDeckType] ?? this.typeColors.mixed;
  }

  deckTypeLabel(type: string): string {
    return this.typeLabels[type as SrsDeckType] ?? type;
  }

  openDeck(deck: SrsDeckSummary): void {
    void this.router.navigate(['/srs/deck', deck.id]);
  }

  reviewAll(): void {
    void this.router.navigate(['/srs/review']);
  }

  async newDeck(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'New deck',
      inputs: [{ name: 'title', type: 'text', placeholder: 'Deck name' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (value: { title?: string }) => {
            const title = (value?.title ?? '').trim();
            if (title) void this.createDeck(title);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async createDeck(title: string): Promise<void> {
    try {
      const deck = await firstValueFrom(this.srs.createDeck({ title, deck_type: 'mixed' }));
      void this.router.navigate(['/srs/deck', deck.id]);
    } catch {
      await this.presentToast('Could not create the deck.');
    }
  }

  private async load(showSkeleton = true): Promise<void> {
    if (showSkeleton) this.loading.set(true);
    try {
      const [decks, stats] = await Promise.all([
        firstValueFrom(this.srs.listDecks()),
        firstValueFrom(this.srs.stats()),
      ]);
      this.decks.set(decks);
      this.stats.set(stats);
    } catch {
      await this.presentToast('Could not load your SRS decks.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1800, position: 'bottom' });
    await toast.present();
  }
}
