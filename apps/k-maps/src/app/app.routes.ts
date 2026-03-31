import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/atlas/atlas-landing.component').then((m) => m.AtlasLandingComponent),
    title: 'K-MAPS — Worldview Atlas',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./core/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'landing',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./core/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'hub',
    loadChildren: () =>
      import('./features/hub/hub.routes').then((m) => m.HUB_ROUTES),
  },
  {
    path: 'quran',
    loadChildren: () =>
      import('./features/quran/quran.routes').then((m) => m.QURAN_ROUTES),
  },
  {
    path: 'arabic',
    loadChildren: () =>
      import('./features/arabic/arabic.routes').then((m) => m.ARABIC_ROUTES),
  },
  {
    path: 'worldview',
    loadChildren: () =>
      import('./features/worldview/worldview.routes').then((m) => m.WORLDVIEW_ROUTES),
  },
  {
    path: 'planner',
    loadChildren: () =>
      import('./features/planner/planner.routes').then((m) => m.PLANNER_ROUTES),
  },
  {
    path: 'srs',
    loadChildren: () =>
      import('./features/srs/srs.routes').then((m) => m.SRS_ROUTES),
  },
  {
    path: 'content',
    loadChildren: () =>
      import('./features/content/content.routes').then((m) => m.CONTENT_ROUTES),
  },
  {
    path: 'workspace',
    loadChildren: () =>
      import('./features/workspace/workspace.routes').then((m) => m.WORKSPACE_ROUTES),
  },
  // Backwards-compatible redirects from old /arabic/quran routes
  { path: 'arabic/quran', redirectTo: 'quran', pathMatch: 'full' },
  { path: 'arabic/quran/:surahId', redirectTo: 'quran/:surahId', pathMatch: 'full' },
  {
    path: 'arabic/quran/:surahId/passage/:passageIndex',
    redirectTo: 'quran/:surahId/passage/:passageIndex',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
