import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./menu/podcast-menu.component').then(m => m.PodcastMenuComponent),
    data: { title: 'Podcast' }
  },
  {
    path: 'episodes',
    loadComponent: () =>
      import('./episodes/podcast-episodes-page/podcast-episodes-page.component').then(m => m.PodcastEpisodesPageComponent),
    data: { title: 'Podcast Episodes' }
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./episodes/podcast-episode-editor/podcast-episode-editor.component').then(m => m.PodcastEpisodeEditorComponent),
    data: { title: 'New Podcast Episode' }
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./episodes/podcast-episode-editor/podcast-episode-editor.component').then(m => m.PodcastEpisodeEditorComponent),
    data: { title: 'Edit Podcast Episode' }
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./episodes/podcast-episode-view/podcast-episode-view.component').then(m => m.PodcastEpisodeViewComponent),
    data: { title: 'Podcast Episode' }
  }
];
