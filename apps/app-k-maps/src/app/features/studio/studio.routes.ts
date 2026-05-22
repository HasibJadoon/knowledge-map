import { Routes } from '@angular/router';

export const STUDIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/episode-list/episode-list.page').then((m) => m.EpisodeListPage),
  },
  {
    path: 'session/:code',
    loadComponent: () =>
      import('./pages/live-deck/live-deck.page').then((m) => m.LiveDeckPage),
  },
  {
    path: ':episodeId',
    loadComponent: () =>
      import('./pages/episode-builder/episode-builder.page').then((m) => m.EpisodeBuilderPage),
  },
];
