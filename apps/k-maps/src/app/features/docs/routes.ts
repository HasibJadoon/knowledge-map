import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./docs-list/docs-list.component').then((m) => m.DocsListComponent),
    data: { title: 'Docs' },
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./docs-detail/docs-detail.component').then((m) => m.DocsDetailComponent),
    data: { title: 'Doc' },
  },
];
