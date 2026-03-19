import {
  Component, Input, Output, EventEmitter, ElementRef,
  OnInit, OnDestroy, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { QuranGsapService } from '../shared/quran-gsap.service';

export interface ActionIconVm {
  id: string;
  label: string;
  svgPath: string;
  ariaLabel: string;
}

@Component({
  selector: 'km-action-icon-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="icon-tile"
      [attr.aria-label]="config.ariaLabel"
      (click)="onClick($event)"
    >
      <span class="icon-tile__icon" [innerHTML]="config.svgPath"></span>
      <span class="icon-tile__sheen" aria-hidden="true"></span>
    </button>
  `,
  styleUrl: './action-icon-tile.component.scss',
})
export class ActionIconTileComponent implements OnInit, OnDestroy {
  @Input() config!: ActionIconVm;
  @Output() tileClick = new EventEmitter<void>();

  private readonly elRef = inject(ElementRef<HTMLElement>);
  private readonly gsap = inject(QuranGsapService);
  private cleanupHover!: () => void;
  private cleanupPress!: () => void;

  ngOnInit(): void {
    const btn = this.elRef.nativeElement.querySelector('.icon-tile') as HTMLElement;
    if (btn) {
      this.cleanupHover = this.gsap.setupIconHover(btn);
      this.cleanupPress = this.gsap.setupIconPress(btn);
    }
  }

  ngOnDestroy(): void {
    this.cleanupHover?.();
    this.cleanupPress?.();
  }

  onClick(e: Event): void {
    e.stopPropagation();
    this.tileClick.emit();
  }
}
