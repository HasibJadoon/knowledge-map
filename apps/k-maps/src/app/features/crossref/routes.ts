import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./menu/crossref-menu.component').then(m => m.CrossrefMenuComponent),
    data: { title: 'Cross-Reference' }
  },
  {
    path: 'refs',
    loadComponent: () =>
      import('./crossref-page/crossref-page.component').then(m => m.CrossrefPageComponent),
    data: { title: 'Cross References' }
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./crossref-editor/crossref-editor.component').then(m => m.CrossrefEditorComponent),
    data: { title: 'New Cross Reference' }
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./crossref-editor/crossref-editor.component').then(m => m.CrossrefEditorComponent),
    data: { title: 'Edit Cross Reference' }
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./crossref-view/crossref-view.component').then(m => m.CrossrefViewComponent),
    data: { title: 'Cross Reference' }
  }
];
