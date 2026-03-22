import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface SrsCard { id: number; entity_type: string; entity_id: number; front: string; back: string; due_at: string; }

@Component({
  selector: 'km-arabic-review',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ar">
      <div class="ar__header">
        <button class="ar__back" (click)="goBack()">← Arabic</button>
        <h1 class="ar__title">SRS Review</h1>
        <p class="ar__sub">{{ remaining() }} cards remaining</p>
      </div>

      <div class="ar__stage">
        @if (loading()) {
          <div class="ar__loading"><div class="ar__spinner"></div></div>
        } @else if (cards().length === 0) {
          <div class="ar__done">
            <span class="ar__done-icon">✓</span>
            <h2>All done!</h2>
            <p>No cards due for review right now.</p>
            <button class="ar__back-btn" (click)="goBack()">← Back to Arabic</button>
          </div>
        } @else {
          <div class="ar__card" [class.ar__card--flipped]="flipped()" (click)="flip()">
            <div class="ar__card-inner">
              <div class="ar__card-front">
                <span class="ar__card-label">Arabic</span>
                <p class="ar__card-ar">{{ currentCard()!.front }}</p>
                <span class="ar__card-tap">Tap to reveal</span>
              </div>
              <div class="ar__card-back">
                <span class="ar__card-label">Meaning</span>
                <p class="ar__card-en">{{ currentCard()!.back }}</p>
                <span class="ar__card-type">{{ currentCard()!.entity_type }}</span>
              </div>
            </div>
          </div>

          @if (flipped()) {
            <div class="ar__rating-btns">
              <button class="ar__btn ar__btn--again" (click)="rate('again')">Again</button>
              <button class="ar__btn ar__btn--hard" (click)="rate('hard')">Hard</button>
              <button class="ar__btn ar__btn--good" (click)="rate('good')">Good</button>
              <button class="ar__btn ar__btn--easy" (click)="rate('easy')">Easy</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .ar { width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--km-bg); }
    .ar__header { padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,.06); flex-shrink: 0; }
    .ar__back {
      background: none; border: none; color: var(--km-text-3); font-size: .75rem;
      letter-spacing: .06em; cursor: pointer; padding: 0; margin-bottom: .8rem;
      &:hover { color: var(--km-gold); }
    }
    .ar__title {
      font-family: var(--km-font-heading); font-size: 1.4rem; color: var(--km-text);
      margin-bottom: .2rem;
    }
    .ar__sub { font-size: .8rem; color: var(--km-text-3); }
    .ar__stage {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 2rem; padding: 2rem;
    }
    .ar__loading { display: flex; align-items: center; justify-content: center; }
    .ar__spinner {
      width: 40px; height: 40px; border: 3px solid rgba(201,168,76,.2);
      border-top-color: var(--km-gold); border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ar__done {
      text-align: center; color: var(--km-text-3);
      .ar__done-icon { font-size: 3rem; color: #4caf7a; display: block; margin-bottom: 1rem; }
      h2 { font-family: var(--km-font-heading); font-size: 1.6rem; color: var(--km-text); margin-bottom: .5rem; }
      p { font-size: .9rem; margin-bottom: 1.5rem; }
    }
    .ar__back-btn {
      background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.3);
      border-radius: 8px; color: var(--km-gold); padding: .6rem 1.4rem;
      font-size: .85rem; font-weight: 600; cursor: pointer;
    }
    .ar__card {
      width: min(500px, 90vw); height: 280px; perspective: 1000px; cursor: pointer;
    }
    .ar__card-inner {
      width: 100%; height: 100%; position: relative; transform-style: preserve-3d;
      transition: transform .5s cubic-bezier(.4,0,.2,1);
    }
    .ar__card--flipped .ar__card-inner { transform: rotateY(180deg); }
    .ar__card-front, .ar__card-back {
      position: absolute; inset: 0; backface-visibility: hidden;
      background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.1);
      border-radius: 16px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .8rem; padding: 2rem;
      box-shadow: 0 8px 40px rgba(0,0,0,.3);
    }
    .ar__card-back { transform: rotateY(180deg); border-color: rgba(201,168,76,.2); }
    .ar__card-label {
      font-size: .62rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
      color: var(--km-gold); opacity: .6;
    }
    .ar__card-ar {
      font-family: var(--km-font-arabic, inherit); font-size: 2.4rem; direction: rtl;
      color: var(--km-text); text-align: center; margin: 0;
      background: linear-gradient(180deg, #e8c96a 0%, #c9a84c 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .ar__card-en { font-size: 1.2rem; color: var(--km-text); text-align: center; margin: 0; }
    .ar__card-tap { font-size: .72rem; color: var(--km-text-3); opacity: .5; }
    .ar__card-type {
      font-size: .62rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
      color: var(--km-gold); opacity: .5;
    }
    .ar__rating-btns { display: flex; gap: .8rem; }
    .ar__btn {
      padding: .65rem 1.4rem; border-radius: 8px; font-size: .84rem; font-weight: 600;
      cursor: pointer; border: 1px solid;
      transition: background .15s;
    }
    .ar__btn--again { background: rgba(224,92,92,.15); border-color: rgba(224,92,92,.4); color: #e05c5c; }
    .ar__btn--hard  { background: rgba(229,152,52,.15); border-color: rgba(229,152,52,.4); color: #e59834; }
    .ar__btn--good  { background: rgba(76,175,122,.15); border-color: rgba(76,175,122,.4); color: #4caf7a; }
    .ar__btn--easy  { background: rgba(76,140,224,.15); border-color: rgba(76,140,224,.4); color: #4c8ce0; }
  `]
})
export class ArabicReviewComponent implements OnInit {
  private router = inject(Router);
  readonly loading = signal(true);
  readonly cards = signal<SrsCard[]>([]);
  readonly currentIndex = signal(0);
  readonly flipped = signal(false);

  readonly currentCard = () => this.cards()[this.currentIndex()] ?? null;
  readonly remaining = () => this.cards().length - this.currentIndex();

  ngOnInit(): void { this.fetchCards(); }

  private async fetchCards(): Promise<void> {
    try {
      const res = await fetch('/ar/srs?entity_type=vocab&limit=20');
      const data = await res.json() as { ok: boolean; items?: SrsCard[] };
      if (data.ok && data.items) this.cards.set(data.items);
    } catch { /* silent */ } finally { this.loading.set(false); }
  }

  flip(): void { this.flipped.set(!this.flipped()); }

  rate(_rating: string): void {
    this.flipped.set(false);
    const next = this.currentIndex() + 1;
    if (next >= this.cards().length) {
      this.cards.set([]);
    } else {
      this.currentIndex.set(next);
    }
  }

  goBack(): void { this.router.navigate(['/arabic']); }
}
