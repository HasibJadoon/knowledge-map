import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'lessons',
    loadChildren: () => import('./lessons/routes').then(m => m.routes),
    data: { title: 'Arabic Lessons' }
  },
  {
    path: 'memory',
    loadChildren: () => import('./memory/routes').then(m => m.routes),
    data: { title: 'Arabic Memory' }
  },
  {
    path: 'lexicon',
    loadChildren: () => import('./lexicon/routes').then(m => m.routes),
    data: { title: 'Arabic Lexicon' }
  },
  {
    path: 'roots',
    loadChildren: () => import('./roots/routes').then(m => m.routes),
    data: { title: 'Roots' }
  }
];
