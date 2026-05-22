import { Routes } from '@angular/router';

export const STUDIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/episode-list/episode-list.component').then((m) => m.EpisodeListComponent),
    title: 'Studio — K-MAPS',
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./pages/template-gallery/template-gallery.component').then(
        (m) => m.TemplateGalleryComponent,
      ),
    title: 'New Episode — Studio',
  },
  {
    path: 'session/:code',
    loadComponent: () =>
      import('./pages/live-deck/live-deck.component').then((m) => m.LiveDeckComponent),
    title: 'Live — Studio',
  },
  {
    path: 'recap/:id',
    loadComponent: () =>
      import('./pages/recap/recap.component').then((m) => m.RecapComponent),
    title: 'Recap — Studio',
  },
  {
    path: ':episodeId',
    loadComponent: () =>
      import('./pages/episode-builder/episode-builder.component').then(
        (m) => m.EpisodeBuilderComponent,
      ),
    title: 'Episode — Studio',
  },
];
