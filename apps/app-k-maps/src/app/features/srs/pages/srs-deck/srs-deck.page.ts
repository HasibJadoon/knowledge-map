import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SrsService } from '../../../../shared/services/srs/srs.service';
import {
  SRS_DECK_TYPE_LABELS,
  SrsCard,
  SrsDeck,
  SrsDeckType,
} from '../../../../shared/models/srs/srs.models';

@Component({
  selector: 'app-srs-deck',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './srs-deck.page.html',
  styleUrl: './srs-deck.page.scss',
})
export class SrsDeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srs = inject(SrsService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  private deckId = '';

  readonly loading = signal(true);
  readonly deck = signal<SrsDeck | null>(null);
  readonly cards = signal<SrsCard[]>([]);

  readonly dueCount = computed(() =>
    this.cards().filter((c) => !c.suspended && (!c.due_at || c.due_at <= new Date().toISOString())).length,
  );

  ionViewWillEnter(): void {
    this.deckId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  deckTypeLabel(type: string): string {
    return SRS_DECK_TYPE_LABELS[type as SrsDeckType] ?? type;
  }

  cardPreview(card: SrsCard): string {
    return card.front_text.replace(/\s+/g, ' ').trim() || '(empty front)';
  }

  startReview(): void {
    if (this.dueCount() === 0) {
      void this.presentToast('Nothing due in this deck right now.');
      return;
    }
    void this.router.navigate(['/srs/review'], { queryParams: { deck: this.deckId } });
  }

  addCard(): void {
    void this.router.navigate(['/srs/deck', this.deckId, 'card', 'new']);
  }

  openCard(card: SrsCard): void {
    void this.router.navigate(['/srs/card', card.id, 'edit']);
  }

  async openDeckMenu(): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: this.deck()?.title ?? 'Deck',
      buttons: [
        { text: 'Rename', handler: () => { void this.renameDeck(); return true; } },
        { text: 'Delete deck', role: 'destructive', handler: () => { void this.confirmDelete(); return true; } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async renameDeck(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Rename deck',
      inputs: [{ name: 'title', type: 'text', value: this.deck()?.title ?? '' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (value: { title?: string }) => {
            const title = (value?.title ?? '').trim();
            if (title) void this.applyRename(title);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async applyRename(title: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.srs.patchDeck(this.deckId, { title }));
      this.deck.set(updated);
    } catch {
      await this.presentToast('Could not rename the deck.');
    }
  }

  private async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete deck?',
      message: 'This permanently removes the deck and all its cards.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => { void this.applyDelete(); return true; },
        },
      ],
    });
    await alert.present();
  }

  private async applyDelete(): Promise<void> {
    try {
      await firstValueFrom(this.srs.deleteDeck(this.deckId));
      void this.router.navigate(['/srs'], { replaceUrl: true });
    } catch {
      await this.presentToast('Could not delete the deck.');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [deck, cards] = await Promise.all([
        firstValueFrom(this.srs.getDeck(this.deckId)),
        firstValueFrom(this.srs.listCards(this.deckId)),
      ]);
      this.deck.set(deck);
      this.cards.set(cards);
    } catch {
      await this.presentToast('Could not load the deck.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1700, position: 'bottom' });
    await toast.present();
  }
}
