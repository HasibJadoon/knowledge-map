import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SrsService } from '../../../../shared/services/srs/srs.service';
import { SrsCard } from '../../../../shared/models/srs/srs.models';

@Component({
  selector: 'app-srs-card-edit',
  standalone: true,
  imports: [IonicModule, FormsModule],
  templateUrl: './srs-card-edit.page.html',
  styleUrl: './srs-card-edit.page.scss',
})
export class SrsCardEditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srs = inject(SrsService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  private deckId = '';
  private cardId = '';

  readonly editing = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly suspended = signal(false);

  front = '';
  back = '';
  tags = '';

  ionViewWillEnter(): void {
    this.cardId = this.route.snapshot.paramMap.get('cardId') ?? '';
    this.deckId = this.route.snapshot.paramMap.get('deckId') ?? '';
    this.editing.set(!!this.cardId);
    if (this.cardId) {
      void this.loadCard();
    } else {
      this.loading.set(false);
    }
  }

  get canSave(): boolean {
    return this.front.trim().length > 0 && this.back.trim().length > 0 && !this.saving();
  }

  async save(): Promise<void> {
    if (!this.canSave) return;
    this.saving.set(true);
    const tags = this.tags.split(/[\s,]+/).filter(Boolean);
    try {
      if (this.editing()) {
        await firstValueFrom(this.srs.patchCard(this.cardId, {
          front_text: this.front.trim(),
          back_text: this.back.trim(),
          tags,
        }));
      } else {
        await firstValueFrom(this.srs.createCard({
          deck_id: this.deckId,
          front_text: this.front.trim(),
          back_text: this.back.trim(),
          card_template: 'freeform',
          tags,
        }));
      }
      this.back2Deck();
    } catch {
      await this.presentToast('Could not save the card.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleSuspend(): Promise<void> {
    if (!this.editing()) return;
    const next = !this.suspended();
    try {
      await firstValueFrom(this.srs.patchCard(this.cardId, { suspended: next }));
      this.suspended.set(next);
      await this.presentToast(next ? 'Card suspended.' : 'Card resumed.');
    } catch {
      await this.presentToast('Could not update the card.');
    }
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete card?',
      message: 'This permanently removes the card and its review history.',
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
      await firstValueFrom(this.srs.deleteCard(this.cardId));
      void this.back2Deck();
    } catch {
      await this.presentToast('Could not delete the card.');
    }
  }

  private back2Deck(): void {
    const deck = this.deckId || null;
    if (deck) {
      void this.router.navigate(['/srs/deck', deck], { replaceUrl: true });
    } else {
      void this.router.navigate(['/srs'], { replaceUrl: true });
    }
  }

  private async loadCard(): Promise<void> {
    this.loading.set(true);
    try {
      const card: SrsCard = await firstValueFrom(this.srs.getCard(this.cardId));
      this.deckId = card.deck_id;
      this.front = card.front_text;
      this.back = card.back_text;
      this.tags = card.tags.join(' ');
      this.suspended.set(card.suspended);
    } catch {
      await this.presentToast('Could not load the card.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1700, position: 'bottom' });
    await toast.present();
  }
}
