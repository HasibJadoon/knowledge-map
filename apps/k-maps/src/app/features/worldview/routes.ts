import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./menu/worldview-menu.component').then(m => m.WorldviewMenuComponent),
    data: { title: 'Worldview' }
  },
  {
    path: 'lessons',
    loadChildren: () => import('./lessons/routes').then(m => m.routes),
    data: { title: 'Worldview Lessons' }
  },
  {
    path: 'knowledge',
    loadChildren: () => import('./knowledge-desk/routes').then(m => m.routes),
    data: { title: 'Knowledge Desk' }
  },
  {
    path: 'library',
    loadComponent: () => import('./worldview-library.component').then(m => m.WorldviewLibraryComponent),
    data: { title: 'Library — Worldview' }
  }
];
