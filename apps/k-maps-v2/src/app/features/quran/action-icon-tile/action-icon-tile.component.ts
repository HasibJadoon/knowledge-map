import {
  Component, Input, Output, EventEmitter,
  inject, ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ActionIconVm {
  id: string;
  label: string;
  svgPath: string;
  ariaLabel: string;
  color?: string;
}

@Component({
  selector: 'km-action-icon-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-icon-tile.component.html',
  styleUrl: './action-icon-tile.component.scss',
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
