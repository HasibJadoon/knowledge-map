import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubCard } from './models/hub.models';

@Component({
  selector: 'km-hub-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="hc"
      [class.hc--new]="card.badge === 'NEW'"
      [class.hc--updated]="card.badge === 'UPDATED'"
      [style.--accent]="card.accentColor ?? 'rgba(201,168,76,0.15)'"
      (click)="cardClick.emit(card)"
      [attr.aria-label]="'Open ' + card.title"
    >
      @if (card.badge) {
        <span class="hc__badge">{{ card.badge }}</span>
      }
      <div class="hc__artwork">
        <span class="hc__glyph">{{ card.glyph ?? card.icon }}</span>
        <div class="hc__shimmer"></div>
      </div>
      <div class="hc__bottom-glow"></div>
      <div class="hc__body">
        <span class="hc__tag">{{ card.tag }}</span>
        <span class="hc__title">{{ card.title }}</span>
        @if (showDesc) {
          <p class="hc__desc">{{ card.description }}</p>
        }
      </div>
      @if (count !== null) {
        <span class="hc__count">{{ count }}</span>
      }
    </button>
  `,
  styles: [`
    .hc {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      min-height: 200px;
      padding: 0 1rem 1.1rem;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--km-radius-lg, 14px);
      cursor: pointer;
      overflow: hidden;
      transition: border-color .3s ease, box-shadow .3s ease, transform .3s ease;
      text-align: center;

      &:hover {
        border-color: var(--km-border-gold);
        box-shadow: 0 0 40px rgba(201,168,76,.16), 0 0 1px rgba(201,168,76,.4) inset;
        transform: translateY(-4px);

        .hc__artwork { opacity: .9; }
        .hc__shimmer { opacity: 1; }
        .hc__bottom-glow { opacity: 1; }
        .hc__title { color: var(--km-gold-bright); letter-spacing: .18em; }
      }

      &:active { transform: translateY(-2px); }
    }

    .hc__badge {
      position: absolute;
      top: .6rem;
      right: .6rem;
      font-size: .55rem;
      font-weight: 700;
      letter-spacing: .12em;
      padding: .2rem .45rem;
      border-radius: 4px;
      background: rgba(201,168,76,.2);
      color: var(--km-gold);
      border: 1px solid rgba(201,168,76,.3);
      z-index: 3;
    }

    .hc__artwork {
      position: absolute;
      top: 0; left: 0; right: 0;
      bottom: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: .5;
      transition: opacity .3s;
    }

    .hc__glyph {
      font-size: 3.2rem;
      line-height: 1;
      background: linear-gradient(180deg, #c9a84c 0%, #6b5520 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 12px rgba(201,168,76,.3));
      font-family: var(--km-font-arabic, inherit);
    }

    .hc__shimmer {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 30%, rgba(201,168,76,.08) 0%, transparent 70%);
      opacity: 0;
      transition: opacity .4s;
      pointer-events: none;
    }

    .hc__bottom-glow {
      position: absolute;
      bottom: 0; left: 10%; right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
      opacity: .35;
      transition: opacity .3s;
      border-radius: 1px;
    }

    .hc__body {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .2rem;
      width: 100%;
    }

    .hc__tag {
      font-size: .58rem;
      font-weight: 700;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: var(--km-gold);
      opacity: .6;
    }

    .hc__title {
      font-family: var(--km-font-heading);
      font-size: .8rem;
      font-weight: 600;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--km-text-2);
      transition: color .3s, letter-spacing .3s;
    }

    .hc__desc {
      font-size: .72rem;
      color: var(--km-text-3);
      line-height: 1.5;
      margin: .3rem 0 0;
      max-width: 240px;
    }

    .hc__count {
      position: absolute;
      top: .6rem;
      left: .6rem;
      font-size: .7rem;
      font-weight: 600;
      color: var(--km-text-3);
      font-family: var(--km-font-mono, monospace);
    }
  `]
})
export class HubCardComponent {
  @Input({ required: true }) card!: HubCard;
  @Input() count: number | null = null;
  @Input() showDesc = false;
  @Output() cardClick = new EventEmitter<HubCard>();
}
