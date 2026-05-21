import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SrsService } from '../../../../shared/services/srs/srs.service';
import { SrsCard, SrsRating } from '../../../../shared/models/srs/srs.models';

interface RatingButton {
  rating: SrsRating;
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-srs-review',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './srs-review.page.html',
  styleUrl: './srs-review.page.scss',
})
export class SrsReviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srs = inject(SrsService);
  private readonly toastController = inject(ToastController);

  private deckId: string | null = null;
  private cardShownAt = 0;

  readonly loading = signal(true);
  readonly queue = signal<SrsCard[]>([]);
  readonly index = signal(0);
  readonly flipped = signal(false);
  readonly grading = signal(false);
  readonly reviewed = signal(0);

  readonly current = computed<SrsCard | null>(() => this.queue()[this.index()] ?? null);
  readonly total = computed(() => this.queue().length);
  readonly done = computed(() => !this.loading() && this.index() >= this.queue().length);
  readonly progress = computed(() => {
    const t = this.total();
    return t === 0 ? 0 : this.reviewed() / t;
  });

  readonly ratingButtons: RatingButton[] = [
    { rating: 1, label: 'Again', cssClass: 'again' },
    { rating: 2, label: 'Hard',  cssClass: 'hard'  },
    { rating: 3, label: 'Good',  cssClass: 'good'  },
    { rating: 4, label: 'Easy',  cssClass: 'easy'  },
  ];

  ionViewWillEnter(): void {
    this.deckId = this.route.snapshot.queryParamMap.get('deck');
    void this.load();
  }

  flip(): void {
    if (!this.flipped()) this.flipped.set(true);
  }

  async grade(rating: SrsRating): Promise<void> {
    const card = this.current();
    if (!card || this.grading()) return;
    this.grading.set(true);
    const durationSecs = Math.max(0, Math.round((Date.now() - this.cardShownAt) / 1000));
    try {
      await firstValueFrom(this.srs.gradeCard(card.id, rating, durationSecs));
      this.reviewed.update((n) => n + 1);
      this.advance();
    } catch {
      await this.presentToast('Could not save that review — try again.');
    } finally {
      this.grading.set(false);
    }
  }

  finish(): void {
    void this.router.navigate(['/srs'], { replaceUrl: true });
  }

  private advance(): void {
    this.flipped.set(false);
    this.index.update((i) => i + 1);
    this.cardShownAt = Date.now();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const cards = this.deckId
        ? await firstValueFrom(this.srs.deckDue(this.deckId))
        : await firstValueFrom(this.srs.reviewQueue());
      this.queue.set(cards);
      this.index.set(0);
      this.reviewed.set(0);
      this.flipped.set(false);
      this.cardShownAt = Date.now();
    } catch {
      await this.presentToast('Could not load the review queue.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1700, position: 'bottom' });
    await toast.present();
  }
}
