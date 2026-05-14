import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LastRead } from '../../reading-state.service';

/**
 * "Continue reading" card — shown at the top of a tab's catalog when the
 * user has a stored last-read position for that tab. Tapping resumes
 * exactly where they left off; the host catalog handles the resume.
 */
@Component({
  selector: 'km-continue-reading-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="km-cr-card" type="button" dir="rtl" (click)="onTap()">
      <div class="km-cr-card__icon" aria-hidden="true">
        <ion-icon [name]="icon" />
      </div>
      <div class="km-cr-card__body">
        <span class="km-cr-card__eyebrow">متابعة القراءة</span>
        <h3 class="km-cr-card__title">{{ headline }}</h3>
        <p class="km-cr-card__where">{{ subtitle }}</p>
      </div>
      <ion-icon class="km-cr-card__chev" name="chevron-back-outline" aria-hidden="true" />
      <ion-ripple-effect />
    </button>
  `,
  styles: [`
    :host { display: block; }
    .km-cr-card {
      appearance: none;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      width: 100%;
      padding: 0.9rem 0.95rem;
      margin: 0 0 0.7rem;
      border: 1px solid rgba(232, 201, 106, 0.32);
      border-radius: 12px;
      background:
        linear-gradient(160deg, rgba(232, 201, 106, 0.10), rgba(232, 201, 106, 0.02));
      color: #f5f1e7;
      cursor: pointer;
      text-align: start;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s, background 0.15s;
      &:active {
        border-color: rgba(232, 201, 106, 0.55);
        background: linear-gradient(160deg, rgba(232, 201, 106, 0.18), rgba(232, 201, 106, 0.04));
      }
    }
    .km-cr-card__icon {
      flex: 0 0 2.4rem;
      width: 2.4rem;
      height: 2.4rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 1px solid rgba(232, 201, 106, 0.42);
      background: radial-gradient(circle, rgba(232, 201, 106, 0.14), transparent 70%);
      color: #e8c96a;
      ion-icon { font-size: 1.2rem; }
    }
    .km-cr-card__body {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .km-cr-card__eyebrow {
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(232, 201, 106, 0.7);
    }
    .km-cr-card__title {
      margin: 0;
      color: #f3d77a;
      font-family: var(--km-font-arabic-ui);
      font-size: 1.02rem;
      font-weight: 600;
      line-height: 1.35;
      word-break: break-word;
    }
    .km-cr-card__where {
      margin: 0;
      color: rgba(245, 241, 231, 0.6);
      font-size: 0.78rem;
      line-height: 1.45;
    }
    .km-cr-card__chev {
      color: rgba(232, 201, 106, 0.55);
      font-size: 1.1rem;
      transform: scaleX(-1);  /* point inward in RTL */
    }
  `],
})
export class ContinueReadingCardComponent {
  /** Heading (work title / book title / "القرآن"). */
  @Input({ required: true }) headline = '';
  /** Sub-line ("سورة الفاتحة، آية 5", "صفحة 42", "جذر كتب"). */
  @Input({ required: true }) subtitle = '';
  /** Optional ion-icon name. */
  @Input() icon: string = 'bookmark-outline';
  /** Original target — passed back on tap if host wants it. */
  @Input() target: LastRead | null = null;

  @Output() resume = new EventEmitter<LastRead | null>();

  onTap(): void {
    this.resume.emit(this.target);
  }
}
