import { Directive, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appLongPress]',
  standalone: true,
})
export class LongPressDirective implements OnDestroy {
  @Input() appLongPressDelay = 460;
  @Output() appLongPress = new EventEmitter<Event>();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private startX = 0;
  private startY = 0;
  private triggered = false;

  ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }

    this.triggered = false;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.triggered = true;
      event.preventDefault();
      event.stopPropagation();
      this.appLongPress.emit(event);
      this.clearTimer();
    }, Math.max(250, this.appLongPressDelay));
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.timer) {
      return;
    }

    if (Math.abs(event.clientX - this.startX) > 10 || Math.abs(event.clientY - this.startY) > 10) {
      this.clearTimer();
    }
  }

  @HostListener('pointerup')
  @HostListener('pointercancel')
  @HostListener('pointerleave')
  onPointerEnd(): void {
    this.clearTimer();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): boolean {
    event.preventDefault();
    event.stopPropagation();
    this.triggered = true;
    this.appLongPress.emit(event);
    return false;
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.triggered) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.triggered = false;
  }

  private clearTimer(): void {
    if (this.timer == null) {
      return;
    }

    clearTimeout(this.timer);
    this.timer = null;
  }
}
