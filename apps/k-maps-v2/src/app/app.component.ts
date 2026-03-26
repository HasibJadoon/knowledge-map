import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiOverlayPosition, UiSettingsService } from './shared/services/ui-settings.service';

@Component({
  selector: 'km-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly uiSettings = inject(UiSettingsService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly settingsOpen = signal(false);
  readonly obsOverlayEnabled = this.uiSettings.obsOverlayEnabled;
  readonly obsOverlayPosition = this.uiSettings.obsOverlayPosition;

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const enabled = this.uiSettings.obsOverlayEnabled();
      const position = this.uiSettings.obsOverlayPosition();
      const html = this.document.documentElement;
      const body = this.document.body;

      [html, body].forEach((node) => {
        node.classList.toggle('km-ui-obs-overlay', enabled);
        node.classList.toggle('km-ui-obs-overlay--top-right', enabled && position === 'top-right');
      });
    });
  }

  toggleSettingsPanel(): void {
    this.settingsOpen.update((open) => !open);
  }

  closeSettingsPanel(): void {
    this.settingsOpen.set(false);
  }

  setObsOverlayEnabled(enabled: boolean): void {
    this.uiSettings.setObsOverlayEnabled(enabled);
  }

  setObsOverlayPosition(position: UiOverlayPosition): void {
    this.uiSettings.setObsOverlayPosition(position);
  }
}
