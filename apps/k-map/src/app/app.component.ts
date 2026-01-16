import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { delay, filter, map, tap } from 'rxjs/operators';

import { ColorModeService } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { iconSubset } from './icons/icon-subset';

type Theme = 'dark' | 'light' | 'auto';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  title = 'K-Map';

  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #titleService = inject(Title);

  readonly #colorModeService = inject(ColorModeService);
  readonly #iconSetService = inject(IconSetService);

  constructor() {
    this.#titleService.setTitle(this.title);

    // iconSet singleton
    this.#iconSetService.icons = { ...iconSubset };

    // Persist CoreUI theme selection
    this.#colorModeService.localStorageItemName.set(
      'k-map-theme-default'
    );
    this.#colorModeService.eventName.set('ColorSchemeChange');
  }

  ngOnInit(): void {
    // Default to dark only if user has not chosen before
    const storageKey = this.#colorModeService.localStorageItemName();
    const saved = storageKey ? localStorage.getItem(storageKey) : null;

    if (!saved) {
      this.#colorModeService.colorMode.set('dark');
    }

    // Keep existing router subscription (optional, but harmless)
    this.#router.events
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((evt) => {
        if (!(evt instanceof NavigationEnd)) return;
      });

    // Allow overriding via URL: ?theme=dark|light|auto
    this.#activatedRoute.queryParams
      .pipe(
        delay(1),
        map((params) => params['theme']?.match(/^[A-Za-z0-9\s]+/)?.[0]),
        filter((theme): theme is Theme => theme === 'dark' || theme === 'light' || theme === 'auto'),
        tap((theme) => this.#colorModeService.colorMode.set(theme)),
        takeUntilDestroyed(this.#destroyRef)
      )
      .subscribe();
  }
}
