import { Routes } from '@angular/router';

export const STUDIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/episode-list/episode-list.page').then((m) => m.EpisodeListPage),
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./pages/template-gallery/template-gallery.page').then((m) => m.TemplateGalleryPage),
  },
  {
    path: 'session/:code',
    loadComponent: () =>
      import('./pages/live-deck/live-deck.page').then((m) => m.LiveDeckPage),
  },
  {
    path: 'recap/:id',
    loadComponent: () =>
      import('./pages/recap/recap.page').then((m) => m.RecapPage),
  },
  {
    path: ':episodeId',
    loadComponent: () =>
      import('./pages/episode-builder/episode-builder.page').then((m) => m.EpisodeBuilderPage),
  },
];
