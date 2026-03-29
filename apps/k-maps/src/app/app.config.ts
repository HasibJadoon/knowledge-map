import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions({
      skipInitialTransition: true,
      onViewTransitionCreated: ({ transition }) => { transition.ready.catch(() => {}); },
    })),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
  ],
};
