import { Injectable, inject } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SrsCardTemplate } from '../../models/srs/srs.models';
import { SrsService } from './srs.service';
import {
  SrsRegistryModule,
  SrsRegistryResourceType,
  SrsRegistryService,
} from './srs-registry.service';

export interface AddToSrsRequest {
  /** The card's prompt face. */
  front: string;
  /** The card's answer face. */
  back: string;
  card_template?: SrsCardTemplate;
  tags?: string[];
  /** Typed ref to the canonical resource, e.g. 'QR:2:255' or 'CM:PL:01H…'. */
  resource_ref?: string;
  resource_type?: SrsRegistryResourceType;
  module?: SrsRegistryModule;
}

/**
 * Reusable "Add to SRS" flow. Any domain page can call addToSrs() with card
 * content; this presents a deck picker, creates the card in the AR engine and
 * (when a resource_ref is given) records the cross-domain enrollment in CORE.
 */
@Injectable({ providedIn: 'root' })
export class AddToSrsService {
  private readonly srs = inject(SrsService);
  private readonly registry = inject(SrsRegistryService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  /** Present a deck picker and add the card. Resolves true once it lands. */
  async addToSrs(request: AddToSrsRequest): Promise<boolean> {
    if (!request.front.trim() || !request.back.trim()) {
      await this.toast('Card needs both a front and a back.');
      return false;
    }

    let decks: { id: string; title: string }[] = [];
    try {
      decks = await firstValueFrom(this.srs.listDecks());
    } catch {
      await this.toast('Could not load your SRS decks.');
      return false;
    }

    const deckId = await this.pickDeck(decks);
    if (!deckId) return false;

    return this.createInDeck(deckId, request);
  }

  // ── Deck picking ───────────────────────────────────────────────────────────

  private pickDeck(decks: { id: string; title: string }[]): Promise<string | null> {
    return new Promise((resolve) => {
      void this.actionSheetController
        .create({
          header: 'Add to deck',
          buttons: [
            ...decks.map((d) => ({
              text: d.title,
              handler: () => { resolve(d.id); return true; },
            })),
            {
              text: 'New deck…',
              handler: () => { void this.promptNewDeck().then(resolve); return true; },
            },
            { text: 'Cancel', role: 'cancel', handler: () => { resolve(null); return true; } },
          ],
        })
        .then((sheet) => sheet.present());
    });
  }

  private promptNewDeck(): Promise<string | null> {
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header: 'New deck',
          inputs: [{ name: 'title', type: 'text', placeholder: 'Deck name' }],
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => { resolve(null); return true; } },
            {
              text: 'Create',
              handler: (value: { title?: string }) => {
                const title = (value?.title ?? '').trim();
                if (!title) { resolve(null); return true; }
                void firstValueFrom(this.srs.createDeck({ title, deck_type: 'mixed' }))
                  .then((deck) => resolve(deck.id))
                  .catch(() => resolve(null));
                return true;
              },
            },
          ],
        })
        .then((alert) => alert.present());
    });
  }

  // ── Card creation ──────────────────────────────────────────────────────────

  private async createInDeck(deckId: string, request: AddToSrsRequest): Promise<boolean> {
    try {
      const card = await firstValueFrom(this.srs.createCard({
        deck_id: deckId,
        front_text: request.front.trim(),
        back_text: request.back.trim(),
        card_template: request.card_template ?? 'freeform',
        resource_ref: request.resource_ref ?? null,
        resource_type: request.resource_type ?? 'other',
        tags: request.tags,
      }));

      // Record the cross-domain enrollment so the source domain can show
      // "already in SRS". Best-effort — a card without a resource ref (a
      // free-form card) simply isn't tracked in the registry.
      if (request.resource_ref) {
        try {
          await firstValueFrom(this.registry.enroll({
            resourceRef: request.resource_ref,
            resourceType: request.resource_type ?? 'other',
            module: request.module ?? 'other',
            cardRef: card.id,
          }));
        } catch {
          /* the card still exists in the deck — registry is an index only */
        }
      }
      await this.toast('Added to SRS.');
      return true;
    } catch {
      await this.toast('Could not add the card.');
      return false;
    }
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1700, position: 'bottom' });
    await toast.present();
  }
}
