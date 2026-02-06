import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./menu/arabic-menu.component').then(m => m.ArabicMenuComponent),
    data: { title: 'Arabic' }
  },
  {
    path: 'quran',
    loadChildren: () => import('./quran/routes').then(m => m.routes),
    data: { title: 'Quran' }
  },
  {
    path: 'literature',
    loadChildren: () => import('./literature/routes').then(m => m.routes),
    data: { title: 'Literature' }
  },
  {
    path: 'grammar',
    loadChildren: () => import('./grammar/routes').then(m => m.routes),
    data: { title: 'Grammar' }
  },
  {
    path: 'tokens',
    loadComponent: () =>
      import('./tokens/tokens.component').then(m => m.TokensComponent),
    data: { title: 'Arabic Tokens' }
  },
  {
    path: 'sentences',
    loadChildren: () => import('./sentences/routes').then(m => m.routes),
    data: { title: 'Sentences' }
  },
  {
    path: 'roots',
    loadChildren: () => import('./roots/routes').then(m => m.routes),
    data: { title: 'Roots' }
  }
];
