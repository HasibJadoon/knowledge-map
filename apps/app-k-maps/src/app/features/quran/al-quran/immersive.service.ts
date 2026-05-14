import { Injectable, signal } from '@angular/core';

/**
 * Immersive reading mode — when active, the shell hides the bottom tab
 * bar so long-form content (Mushaf page, lexicon entry) gets the full
 * viewport. Triggered by scroll handlers in the reader pages.
 *
 * Standard iBooks/Kindle pattern:
 *   • scroll down  → hide chrome
 *   • scroll up   → show chrome
 *   • idle (no scroll for > 1.5s after movement) → no change
 *
 * Each reader page should call:
 *   `imm.onScroll(currentY)` on every scroll tick, and
 *   `imm.exit()` in ngOnDestroy / when navigating away.
 */
@Injectable({ providedIn: 'root' })
export class ImmersiveService {
  /** When true, the shell hides the tab bar. */
  readonly hidden = signal(false);

  private lastY = 0;
  private accumDown = 0;
  private accumUp = 0;
  /** Pixels of consecutive scroll required to flip state — prevents jitter. */
  private static readonly THRESHOLD_PX = 48;

  onScroll(currentY: number): void {
    const delta = currentY - this.lastY;
    this.lastY = currentY;

    // Always show chrome near the very top of content — never hide on first screen.
    if (currentY < 24) {
      this.accumDown = 0;
      this.accumUp = 0;
      if (this.hidden()) this.hidden.set(false);
      return;
    }

    if (delta > 0) {
      this.accumDown += delta;
      this.accumUp = 0;
      if (this.accumDown > ImmersiveService.THRESHOLD_PX && !this.hidden()) {
        this.hidden.set(true);
        this.accumDown = 0;
      }
    } else if (delta < 0) {
      this.accumUp += -delta;
      this.accumDown = 0;
      if (this.accumUp > ImmersiveService.THRESHOLD_PX && this.hidden()) {
        this.hidden.set(false);
        this.accumUp = 0;
      }
    }
  }

  /** Reset state — call when leaving a page that uses immersive mode. */
  exit(): void {
    this.hidden.set(false);
    this.lastY = 0;
    this.accumDown = 0;
    this.accumUp = 0;
  }
}
