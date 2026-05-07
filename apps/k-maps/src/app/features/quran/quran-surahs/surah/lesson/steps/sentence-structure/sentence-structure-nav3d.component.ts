import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'km-sentence-structure-nav3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ss-nav3d"
      role="tablist"
      aria-label="Sentence navigation"
      aria-orientation="vertical"
    >
      <div class="ss-nav3d__stack">
        @for (index of navIndices; track index) {
          <button
            class="ss-nav3d__item"
            #itemBtn
            type="button"
            role="tab"
            [class.ss-nav3d__item--active]="index === activeIndex"
            [attr.aria-selected]="index === activeIndex"
            [attr.aria-label]="'Sentence ' + (index + 1)"
            [attr.aria-controls]="'sentence-structure-panel-' + index"
            [attr.aria-posinset]="index + 1"
            [attr.aria-setsize]="count"
            (click)="select(index)"
          >
            <span class="ss-nav3d__button-shell">
              <span class="ss-nav3d__button-face">
                <span class="ss-nav3d__face-glow" aria-hidden="true"></span>
                <span class="ss-nav3d__label">{{ index + 1 }}</span>
              </span>
            </span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .ss-nav3d {
      height: 100%;
      min-height: 0;
    }

    .ss-nav3d__stack {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      height: 100%;
      min-height: 0;
      overflow: auto;
      padding-right: 0.08rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 177, 57, 0.52) rgba(255, 255, 255, 0.04);
    }

    .ss-nav3d__stack::-webkit-scrollbar {
      width: 0.42rem;
      height: 0.42rem;
    }

    .ss-nav3d__stack::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 201, 95, 0.85), rgba(255, 134, 24, 0.82));
    }

    .ss-nav3d__stack::-webkit-scrollbar-track {
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
    }

    .ss-nav3d__item {
      position: relative;
      display: block;
      width: 100%;
      padding: 0.08rem;
      border: 0;
      background: transparent;
      cursor: pointer;
      outline: none;
      text-align: left;
    }

    .ss-nav3d__button-shell {
      position: relative;
      display: block;
      padding: 0.2rem;
      border-radius: 1rem;
      background:
        linear-gradient(180deg, #f4c766 0%, #d98b28 28%, #995112 64%, #4d2203 100%);
      box-shadow:
        0 0.72rem 1.2rem rgba(0, 0, 0, 0.38),
        0 0.12rem 0.18rem rgba(255, 208, 108, 0.42),
        inset 0 0.14rem 0.18rem rgba(255, 246, 210, 0.58),
        inset 0 -0.24rem 0.38rem rgba(72, 19, 0, 0.58);
      transition:
        transform 0.22s ease,
        box-shadow 0.22s ease,
        filter 0.22s ease;
    }

    .ss-nav3d__button-shell::before,
    .ss-nav3d__button-shell::after {
      content: '';
      position: absolute;
      pointer-events: none;
    }

    .ss-nav3d__button-shell::before {
      inset: 0.1rem;
      border-radius: 0.84rem;
      border: 1px solid rgba(255, 236, 182, 0.48);
      opacity: 0.95;
    }

    .ss-nav3d__button-shell::after {
      inset: -0.12rem 0.3rem auto;
      height: 0.32rem;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0));
      opacity: 0.46;
    }

    .ss-nav3d__button-face {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 4.35rem;
      padding: 0.4rem 0.28rem;
      border-radius: 0.78rem;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% -20%, rgba(255, 199, 88, 0.16), transparent 50%),
        linear-gradient(180deg, rgba(62, 29, 8, 0.88) 0%, rgba(14, 10, 8, 0.97) 34%, rgba(8, 6, 5, 0.99) 100%);
      box-shadow:
        inset 0 0.08rem 0.16rem rgba(255, 210, 124, 0.24),
        inset 0 -0.18rem 0.32rem rgba(0, 0, 0, 0.58),
        inset 0 0 0 1px rgba(255, 183, 65, 0.24);
    }

    .ss-nav3d__button-face::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 24%, transparent 68%, rgba(255, 181, 69, 0.08) 100%),
        radial-gradient(circle at 22% 20%, rgba(255, 195, 78, 0.08), transparent 18%),
        radial-gradient(circle at 78% 72%, rgba(255, 170, 40, 0.08), transparent 22%);
      mix-blend-mode: screen;
      pointer-events: none;
    }

    .ss-nav3d__face-glow {
      position: absolute;
      inset: auto 16% -8% 16%;
      height: 1.05rem;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255, 163, 28, 0.82), rgba(255, 163, 28, 0));
      opacity: 0.36;
      filter: blur(0.24rem);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }

    .ss-nav3d__label {
      position: relative;
      z-index: 1;
      font-family: var(--km-font-heading, 'Cinzel', serif);
      font-size: clamp(1.55rem, 2vw, 2.3rem);
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.03em;
      color: #eca34a;
      font-variant-numeric: lining-nums tabular-nums;
      text-shadow:
        0 0.08rem 0 rgba(44, 12, 0, 0.98),
        0 0.18rem 0.38rem rgba(0, 0, 0, 0.88),
        0 0 0.95rem rgba(255, 156, 30, 0.26);
      transition:
        color 0.22s ease,
        text-shadow 0.22s ease,
        transform 0.22s ease;
    }

    .ss-nav3d__item:hover .ss-nav3d__button-shell,
    .ss-nav3d__item:focus-visible .ss-nav3d__button-shell {
      transform: translateY(-0.12rem);
      filter: saturate(1.06);
      box-shadow:
        0 0.9rem 1.4rem rgba(0, 0, 0, 0.42),
        0 0.16rem 0.24rem rgba(255, 214, 121, 0.5),
        inset 0 0.16rem 0.2rem rgba(255, 244, 207, 0.68),
        inset 0 -0.28rem 0.42rem rgba(72, 19, 0, 0.66);
    }

    .ss-nav3d__item:hover .ss-nav3d__label,
    .ss-nav3d__item:focus-visible .ss-nav3d__label {
      color: #ffc46b;
      transform: scale(1.03);
    }

    .ss-nav3d__item:hover .ss-nav3d__face-glow,
    .ss-nav3d__item:focus-visible .ss-nav3d__face-glow {
      opacity: 0.6;
      transform: scaleX(1.04);
    }

    .ss-nav3d__item--active .ss-nav3d__button-shell {
      background:
        linear-gradient(180deg, #8ff5de 0%, #39c6b6 30%, #147b76 65%, #062f30 100%);
      box-shadow:
        0 0 0 0.06rem rgba(155, 255, 237, 0.32),
        0 1rem 1.5rem rgba(0, 0, 0, 0.46),
        0 0 1.35rem rgba(73, 239, 206, 0.32),
        inset 0 0.18rem 0.24rem rgba(225, 255, 250, 0.72),
        inset 0 -0.32rem 0.46rem rgba(4, 52, 49, 0.72);
    }

    .ss-nav3d__item--active .ss-nav3d__button-shell::before {
      border-color: rgba(211, 255, 245, 0.62);
    }

    .ss-nav3d__item--active .ss-nav3d__button-face {
      background:
        radial-gradient(circle at 50% -18%, rgba(167, 255, 235, 0.26), transparent 56%),
        linear-gradient(180deg, rgba(18, 87, 84, 0.96) 0%, rgba(7, 37, 36, 0.98) 38%, rgba(4, 18, 18, 1) 100%);
      box-shadow:
        inset 0 0.12rem 0.2rem rgba(203, 255, 243, 0.24),
        inset 0 -0.18rem 0.32rem rgba(0, 0, 0, 0.56),
        inset 0 0 0 1px rgba(133, 246, 225, 0.34);
    }

    .ss-nav3d__item--active .ss-nav3d__face-glow {
      opacity: 0.9;
      transform: scaleX(1.08);
      background: radial-gradient(circle, rgba(92, 255, 219, 0.86), rgba(92, 255, 219, 0));
    }

    .ss-nav3d__item--active .ss-nav3d__label {
      color: #ecfffb;
      text-shadow:
        0 0.08rem 0 rgba(6, 34, 31, 0.98),
        0 0.22rem 0.44rem rgba(0, 0, 0, 0.9),
        0 0 1.15rem rgba(91, 255, 221, 0.42),
        0 0 2rem rgba(41, 207, 177, 0.3);
    }

    @media (max-width: 980px) {
      .ss-nav3d__stack {
        flex-direction: row;
        gap: 0.65rem;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 0.32rem;
      }

      .ss-nav3d__item {
        flex: 0 0 clamp(5.1rem, 16vw, 6.1rem);
      }

      .ss-nav3d__button-face {
        min-height: 3.7rem;
      }

      .ss-nav3d__label {
        font-size: clamp(1.45rem, 4.4vw, 2rem);
      }
    }
  `],
})
export class SentenceStructureNav3dComponent {
  @Input() count = 0;
  @Input() activeIndex = 0;
  @Output() selectIndex = new EventEmitter<number>();

  get navIndices(): number[] {
    return Array.from({ length: this.count }, (_, index) => index);
  }

  select(index: number): void {
    if (index >= 0 && index < this.count && index !== this.activeIndex) {
      this.selectIndex.emit(index);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.count) return;

    let nextIndex = this.activeIndex;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = Math.max(this.activeIndex - 1, 0);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = Math.min(this.activeIndex + 1, this.count - 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = this.count - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(nextIndex);
  }
}
