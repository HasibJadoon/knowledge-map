import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';

export interface ActionIconVm {
  id: string;
  label: string;
  svgPath: string;
  ariaLabel: string;
  color?: string;
}

@Component({
  selector: 'app-action-icon-tile',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="icon-tile"
      [attr.aria-label]="config.ariaLabel"
      [style.color]="config.color || null"
      (click)="onClick($event)"
    >
      <span class="icon-tile__icon" [innerHTML]="safeIcon"></span>
      <span class="icon-tile__label">{{ config.label }}</span>
    </button>
  `,
  styles: [`
    .icon-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px;
      padding: 10px 4px 8px;
      cursor: pointer;
      color: rgba(255,255,255,0.65);
      transition: background 0.18s, border-color 0.18s, transform 0.15s;
      -webkit-tap-highlight-color: transparent;
      width: 100%;
      min-width: 0;
    }
    .icon-tile:active {
      transform: scale(0.94);
      background: var(--km-surface-2, rgba(255,255,255,0.1));
    }
    .icon-tile__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
    }
    .icon-tile__icon svg {
      width: 22px;
      height: 22px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .icon-tile__label {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
  `],
})
export class ActionIconTileComponent {
  @Input() config!: ActionIconVm;
  @Output() tileClick = new EventEmitter<void>();

  private readonly sanitizer = inject(DomSanitizer);

  get safeIcon(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.config.svgPath);
  }

  onClick(e: Event): void {
    e.stopPropagation();
    this.tileClick.emit();
  }
}
