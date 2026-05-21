import { Routes } from '@angular/router';

const loadPlaceholder = () =>
  import('./pages/content-placeholder/content-placeholder.page').then(
    (m) => m.ContentPlaceholderPage,
  );

export const CONTENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/content/content.page').then((m) => m.ContentPage),
    title: 'Content — K-MAPS',
  },
  {
    path: 'episode/current',
    loadComponent: loadPlaceholder,
    title: 'Current Episode — K-MAPS',
    data: {
      label: 'Current Episode',
      tag: 'ACTIVE',
      icon: 'mic-outline',
      desc: 'Active episode in production — status, outline, and recording notes.',
    },
  },
  {
    path: 'episodes',
    loadComponent: loadPlaceholder,
    title: 'Episodes — K-MAPS',
    data: {
      label: 'Episodes',
      tag: 'ARCHIVE',
      icon: 'albums-outline',
      desc: 'Full episode archive with show notes, timestamps and guest records.',
    },
  },
  {
    path: 'categories',
    loadComponent: loadPlaceholder,
    title: 'Categories — K-MAPS',
    data: {
      label: 'Categories',
      tag: 'TAXONOMY',
      icon: 'grid-outline',
      desc: 'Topic taxonomy, series groupings and content classification.',
    },
  },
  {
    path: 'sacred-texts',
    loadComponent: loadPlaceholder,
    title: 'Sacred Texts — K-MAPS',
    data: {
      label: 'Sacred Texts',
      tag: 'REFERENCES',
      icon: 'book-outline',
      desc: 'Referenced sacred texts and scripture used across episodes.',
    },
  },
];
